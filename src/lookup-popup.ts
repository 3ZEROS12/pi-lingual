/**
 * The lookup popup.
 *
 * Rendered into a non-capturing overlay so typing keeps going to the editor
 * while the translation is on screen. The layout follows the same open
 * left-rail idiom as the HUD card (no closed box, width measured with the
 * UAX #11 helper) because that is what keeps CJK from tearing the frame.
 */

import { getVisualWidth, truncateVisual, wrapVisualText } from "./layout.js";
import type { LookupStrings } from "./lookup-strings.js";

export type LookupPopupStatus = "loading" | "ready" | "error";

const MIN_WIDTH = 24;
const MAX_LINES = 9;

/** Minimal surface of the pi theme object the popup needs. */
export interface PopupTheme {
  fg(color: string, text: string): string;
  bold(text: string): string;
}

export interface MousePress {
  type: string;
}

export class LookupPopup {
  private readonly theme: PopupTheme;
  private readonly strings: LookupStrings;
  private readonly headword: string;
  private readonly hint: string;
  private readonly onDismiss: () => void;
  private status: LookupPopupStatus = "loading";
  private body = "";
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(
    theme: PopupTheme,
    strings: LookupStrings,
    headword: string,
    hint: string,
    onDismiss: () => void
  ) {
    this.theme = theme;
    this.strings = strings;
    this.headword = headword;
    this.hint = hint;
    this.onDismiss = onDismiss;
  }

  get currentStatus(): LookupPopupStatus {
    return this.status;
  }

  get currentBody(): string {
    return this.body;
  }

  setResult(text: string): void {
    this.status = "ready";
    this.body = text;
    this.invalidate();
  }

  setError(message: string): void {
    this.status = "error";
    this.body = message;
    this.invalidate();
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  handleMouse(event: MousePress): { handled: boolean; render: boolean } | undefined {
    if (event?.type !== "press") return undefined;
    this.onDismiss();
    return { handled: true, render: true };
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;
    const lines = this.layout(Math.max(MIN_WIDTH, width));
    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  private layout(width: number): string[] {
    const { fg, bold } = this.theme;
    const headLabel = `[${this.strings.title}] `;
    const headRoom = Math.max(10, width - 4 - getVisualWidth(headLabel));
    const head = `  ${fg("muted", "· ")}${fg("dim", headLabel)}${bold(fg("accent", truncateVisual(this.headword, headRoom)))}`;

    const bodyRoom = Math.max(10, width - 4);
    const bodyLines = wrapVisualText(this.bodyText(), bodyRoom).slice(0, MAX_LINES - 2);
    const body = bodyLines.length > 0 ? bodyLines : [""];
    const hint = fg("dim", truncateVisual(this.hint, bodyRoom));

    const lines: string[] = [head];
    body.forEach((line, index) => {
      const rail = index === 0 ? "┌" : "│";
      lines.push(`  ${fg("muted", `${rail} `)}${line}`);
    });
    // The hint gets its own closing rail: the card keeps the open shape of the
    // HUD and still fits inside the nine-line budget.
    lines.push(`  ${fg("muted", "└ ")}${hint}`);
    return lines.slice(0, MAX_LINES);
  }

  private bodyText(): string {
    const { fg } = this.theme;
    switch (this.status) {
      case "loading":
        return fg("muted", this.strings.loading);
      case "error":
        return fg("error", this.body);
      default:
        return fg("text", this.body);
    }
  }
}

/** Popup width: half the terminal, clamped so a single word still has room. */
export function lookupPopupWidth(columns: number): number {
  const room = Math.max(20, Math.min(64, columns - 4));
  return Math.max(20, Math.min(Math.max(30, Math.floor(columns * 0.55)), room));
}
