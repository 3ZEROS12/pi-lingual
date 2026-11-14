/**
 * Wires a copied selection to the lookup popup.
 *
 * The controller owns the short-lived state a popup needs: the overlay handle,
 * the auto-dismiss timer, the in-flight request, and a small cache so that
 * double-clicking the same word twice does not buy the same lookup twice.
 * Settings are read through a callback on every use, so `/lang` and
 * `/lingual lookup` take effect without re-attaching anything.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { LookupConfig, LookupRequest } from "./lookup.js";
import { globalLookupCache, isLookupSelection, lookupTranslate, normalizeSelection } from "./lookup.js";
import type { CopyHookTarget } from "./lookup-hook.js";
import { attachCopyHook } from "./lookup-hook.js";
import type { PopupTheme } from "./lookup-popup.js";
import { LookupPopup, lookupPopupWidth } from "./lookup-popup.js";
import type { LookupStrings } from "./lookup-strings.js";

const TRANSLATION_TIMEOUT_MS = 20_000;

export type LookupComplete = (
  text: string,
  systemPrompt: string,
  signal: AbortSignal
) => Promise<string | null>;

export interface LookupSettings {
  config: LookupConfig;
  /** Reader's language: where the copied text is translated to. */
  nativeLang: string;
  /** Language of the transcript: what a copied selection is expected to be. */
  foreignLang: string;
  strings: LookupStrings;
  complete?: LookupComplete;
}

/** The slice of the pi TUI the popup needs; the renderer is passed to widget factories. */
interface OverlayHost {
  terminal?: { columns?: number };
  showOverlay?: (component: unknown, options?: Record<string, unknown>) => { hide(): void } | undefined;
  requestRender?: () => void;
}

export interface LookupControllerDeps {
  translate?: (request: LookupRequest, deps: { complete?: LookupComplete }) => Promise<string>;
}

export class LookupController {
  private readonly settings: () => LookupSettings;
  private readonly runLookup: (request: LookupRequest, deps: { complete?: LookupComplete }) => Promise<string>;
  private ctx?: ExtensionContext;
  private tui?: OverlayHost;
  private overlay?: { hide(): void };
  private popup?: LookupPopup;
  private dismissTimer?: ReturnType<typeof setTimeout>;
  private abort?: AbortController;
  private inFlight?: string;
  private last?: string;
  private unsupportedWarned = false;

  constructor(settings: () => LookupSettings, deps: LookupControllerDeps = {}) {
    this.settings = settings;
    this.runLookup = deps.translate ?? lookupTranslate;
  }

  /** The freshest context, so the popup follows `/model` and other session changes. */
  setContext(ctx: ExtensionContext | null | undefined): void {
    this.ctx = ctx ?? undefined;
  }

  get lastSelection(): string | undefined {
    return this.last;
  }

  /** Wraps the renderer's clipboard callback. Returns which callback was found. */
  attach(tui: unknown, notifyUnsupported: (message: string) => void): CopyHookTarget {
    this.tui = (tui || undefined) as OverlayHost | undefined;
    const target = attachCopyHook(tui, (text) => this.onCopy(text));
    if (target === "none" && !this.unsupportedWarned) {
      this.unsupportedWarned = true;
      notifyUnsupported(this.settings().strings.unavailable);
    }
    return target;
  }

  private onCopy(raw: string): void {
    const settings = this.settings();
    this.last = normalizeSelection(raw);
    if (!settings.config.enabled) return;
    if (!isLookupSelection(raw, settings.config, settings.nativeLang, settings.foreignLang)) return;
    // A lookup is best-effort: an unhandled rejection here reaches pi's
    // uncaughtException handler and takes the whole process down.
    void this.show(raw).catch(() => {});
  }

  /** Open the popup for `raw`. Resolves once the translation is on screen or has failed. */
  async show(raw: string): Promise<void> {
    try {
      await this.showUnsafe(raw);
    } catch {
      // Reading a stale ctx or a theme the renderer no longer exposes must not
      // surface as a crash; the popup simply does not appear.
    }
  }

  private async showUnsafe(raw: string): Promise<void> {
    const text = normalizeSelection(raw);
    if (!text) return;
    const settings = this.settings();
    const popup = this.openPopup(text, settings);
    if (!popup) return;

    const key = `${settings.config.provider}|${settings.nativeLang}|${text}`;
    const cached = globalLookupCache.get(key);
    if (cached !== undefined) {
      popup.setResult(cached);
      this.scheduleDismiss(settings.config.seconds);
      this.requestRender();
      return;
    }

    const abort = new AbortController();
    this.abort = abort;
    this.inFlight = text;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, TRANSLATION_TIMEOUT_MS);

    try {
      const result = await this.runLookup(
        {
          text,
          config: settings.config,
          nativeLang: settings.nativeLang,
          strings: settings.strings,
          signal: abort.signal,
        },
        { complete: settings.complete }
      );
      globalLookupCache.set(key, result);
      if (this.inFlight !== text) return;
      popup.setResult(result);
      this.scheduleDismiss(settings.config.seconds);
      this.requestRender();
    } catch (error) {
      // A closed popup has nothing to report; a real failure explains itself.
      if (this.inFlight !== text) return;
      const message = timedOut
        ? settings.strings.timeout
        : error instanceof Error
          ? error.message
          : String(error);
      popup.setError(message);
      this.scheduleDismiss(settings.config.seconds);
      this.requestRender();
    } finally {
      clearTimeout(timeout);
      if (this.abort === abort) this.abort = undefined;
    }
  }

  close(): void {
    this.clearDismissTimer();
    this.abort?.abort();
    this.abort = undefined;
    this.inFlight = undefined;
    try {
      this.overlay?.hide();
    } catch {
      // The renderer may already be gone during teardown.
    }
    this.overlay = undefined;
    this.popup = undefined;
  }

  private openPopup(text: string, settings: LookupSettings): LookupPopup | undefined {
    const ctx = this.ctx;
    const tui = this.tui;
    if (!ctx || !tui || typeof tui.showOverlay !== "function") return undefined;
    let theme: PopupTheme | undefined;
    try {
      theme = (ctx.ui as unknown as { theme?: PopupTheme })?.theme;
    } catch {
      // pi asserts a live ctx on every property access, and a captured ctx goes
      // stale after reload or session replacement.
      return undefined;
    }
    if (!theme || typeof theme.fg !== "function") return undefined;

    this.close();
    const popup = new LookupPopup(
      theme,
      settings.strings,
      text,
      settings.strings.dismiss(settings.config.seconds),
      () => this.close()
    );
    this.popup = popup;
    const columns = tui.terminal?.columns ?? 80;
    this.overlay = tui.showOverlay(popup, {
      anchor: "center",
      width: lookupPopupWidth(columns),
      maxHeight: "60%",
      margin: 1,
      nonCapturing: true,
    });
    this.scheduleDismiss(settings.config.seconds);
    this.requestRender();
    return popup;
  }

  private requestRender(): void {
    try {
      this.tui?.requestRender?.();
    } catch {
      // Rendering is best-effort; the next paint picks the popup up anyway.
    }
  }

  private scheduleDismiss(seconds: number): void {
    this.clearDismissTimer();
    if (seconds <= 0) return;
    const timer = setTimeout(() => this.close(), seconds * 1000);
    timer.unref?.();
    this.dismissTimer = timer;
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer === undefined) return;
    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }
}
