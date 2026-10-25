import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  LingualI18nLabels,
  LingualMode,
  PromptCandidate,
} from "./types.js";
import {
  formatModePickerLines,
  type ModePickerOption,
  getVisualWidth,
  truncateVisual,
} from "./layout.js";
import {
  resolveModeDisplayName,
  localizeModeName,
  resolveSelectPrompts,
  loadUserLingualConfig,
  resolveModesFromConfig,
  normalizeActiveModeId,
} from "./engine.js";
import { hasActiveUI } from "./context.js";

export interface OpenModePickerOptions {
  mode: LingualMode;
  activeModeId?: string;
  modes?: CustomModeConfig[];
  sourceLang: string;
  targetLang: string;
  labels: LingualI18nLabels;
  modeLocked?: boolean;
  onSelect?: (chosen: string, ctx: ExtensionContext) => Promise<void>;
}

/**
 * Interactive capsule mode picker (Invoked on parameterless /lingual or /l)
 */
export async function openModePicker(
  ctx: ExtensionContext,
  opts: OpenModePickerOptions
): Promise<string | null> {
  const diskForMode = loadUserLingualConfig();
  const diskMode = diskForMode.activeModeId || diskForMode.mode;
  const modes = Array.isArray(opts.modes) && opts.modes.length > 0
    ? opts.modes
    : resolveModesFromConfig(diskForMode, opts.sourceLang);
  let currentMode = opts.mode;
  if (diskMode && diskMode !== opts.mode) {
    currentMode = normalizeActiveModeId({ mode: diskMode, activeModeId: diskMode }, modes);
  }
  const activeModes = modes.filter((m) => m.enabled !== false);
  const offName = resolveModeDisplayName("off", opts.sourceLang);
  const lockIndicator = opts.modeLocked
    ? opts.sourceLang === "zh"
      ? " · 锁定"
      : opts.sourceLang === "tw"
      ? " · 鎖定"
      : opts.sourceLang === "ja"
      ? " · ロック"
      : opts.sourceLang === "ko"
      ? " · 잠김"
      : opts.sourceLang === "es"
      ? " · Bloqueado"
      : opts.sourceLang === "fr"
      ? " · Verrouillé"
      : opts.sourceLang === "de"
      ? " · Gesperrt"
      : opts.sourceLang === "ru"
      ? " · Блокировано"
      : " · Locked"
    : "";
  const pair = `${opts.labels.hudTitle || `${opts.sourceLang} ⇄ ${opts.targetLang}`}${lockIndicator}`;
  const title = opts.labels.modePickerTitle || "Mode Switch";
  const hint = opts.labels.modePickerHint || "Press 1/2/3/0 to switch, Esc to cancel";

  const options: ModePickerOption[] = activeModes.map((m, idx) => ({
    num: idx + 1,
    id: m.id,
    name: localizeModeName(m.id, m.name, opts.sourceLang),
    englishTag:
      opts.sourceLang === "en"
        ? undefined
        : m.id === "companion"
        ? "Companion"
        : m.id === "direct"
        ? "Logical Spec"
        : m.id === "live-flow"
        ? "Live Flow"
        : undefined,
  }));

  options.push({
    num: 0,
    id: "off",
    name: offName,
    englishTag: "Off",
  });

  const currentModeId =
    currentMode === "off"
      ? "off"
      : opts.activeModeId || currentMode || options[0].id;
  let initialIndex = options.findIndex((o) => o.id === currentModeId);
  if (initialIndex === -1) initialIndex = 0;

  // 1. Interactive custom component via ctx.ui.custom
  if (hasActiveUI(ctx) && typeof (ctx.ui as any).custom === "function") {
    try {
      const chosen = await (ctx.ui as any).custom(
        (tui: any, theme: any, _kb: any, done: (val: string | null) => void) => {
          let selectedIndex = initialIndex;
          let finished = false;
          const finish = (val: string | null) => {
            if (finished) return;
            finished = true;
            done(val);
          };

          return {
            render(width: number): string[] {
              try {
                return formatModePickerLines(
                  title,
                  hint,
                  pair,
                  options,
                  selectedIndex,
                  width,
                  theme
                );
              } catch {
                return formatModePickerLines(
                  title,
                  hint,
                  pair,
                  options,
                  selectedIndex,
                  width
                );
              }
            },
            invalidate() {},
            handleInput(data: string) {
              // Ignore mouse tracking escapes and bracketed paste sequences
              if (data.startsWith("\x1b[<") || data.startsWith("\x1b[M") || data.startsWith("\x1b[200~")) {
                return;
              }

              // Direct numeric hotkeys 1..N and 0 (instant execution without Enter)
              if (data === "0") {
                finish("off");
                return;
              }
              const num = parseInt(data, 10);
              if (!isNaN(num) && num >= 1 && num <= activeModes.length) {
                finish(activeModes[num - 1].id);
                return;
              }

              // Esc, q, Ctrl+C (cancel without changing mode)
              if (data === "\x1b" || data === "q" || data === "\x03") {
                finish(null);
                return;
              }

              // Arrow navigation and vim keys (Down/Right/j/l/Tab advances; Up/Left/k/h retreats)
              if (data === "\x1b[C" || data === "\x1b[B" || data === "l" || data === "j" || data === "\t") {
                selectedIndex = (selectedIndex + 1) % options.length;
                tui?.requestRender?.();
                return;
              }
              if (data === "\x1b[D" || data === "\x1b[A" || data === "h" || data === "k") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                tui?.requestRender?.();
                return;
              }

              // Enter, CRLF or Space confirms selection
              if (data === "\r" || data === "\n" || data === "\r\n" || data === " ") {
                finish(options[selectedIndex]?.id || null);
                return;
              }
            },
          };
        }
      );

      if (chosen !== null && chosen !== undefined) {
        if (opts.onSelect) await opts.onSelect(chosen, ctx);
        return chosen;
      }
      return null;
    } catch {
      // Fall back gracefully to select or headless
    }
  }

  // 2. Select dialog fallback when ctx.ui.custom is not supported
  if (hasActiveUI(ctx) && typeof (ctx.ui as any).select === "function") {
    try {
      const selectItems = options.map((opt) => ({
        label: `[${opt.num}] ${opt.name}${opt.englishTag ? ` (${opt.englishTag})` : ""}`,
        value: opt.id,
      }));
      const chosen = await (ctx.ui as any).select(
        `[lingual · ${pair}] ${title} (${hint})`,
        selectItems
      );
      if (chosen) {
        if (opts.onSelect) await opts.onSelect(chosen, ctx);
        return chosen;
      }
      return null;
    } catch {
      // Fall back to headless
    }
  }

  // 3. Headless / CLI non-interactive fallback
  if (opts.onSelect) await opts.onSelect("", ctx);
  return null;
}

/**
 * Interactive candidate selection UI for select dispatcher modes.
 */
export async function pickCandidateInteractive(
  ctx: ExtensionContext,
  candidates: PromptCandidate[],
  sourceLang: string
): Promise<string | null> {
  if (!hasActiveUI(ctx) || candidates.length === 0) return null;

  const langCode = (sourceLang || "en").toLowerCase().split("-")[0];
  const sp = resolveSelectPrompts(langCode, candidates.length);

  if (typeof (ctx.ui as any).custom === "function") {
    // Compact capsule hotkey bar: press number keys 1..N to send candidate in 0ms without Enter
    const items = [
      ...candidates.map((c, idx) => ({
        key: String(idx + 1),
        label: `[${idx + 1}] ${c.label}`,
        value: c.content,
      })),
      { key: "0", label: `[0] ${sp.keepOrig}`, value: "__ORIGINAL__" },
    ];

    const pickedVal = await (ctx.ui as any).custom(
      (tui: any, theme: any, keybindings: any, done: (res: string | undefined) => void) => {
        let selectedIdx = 0;
        return {
          render(width: number): string[] {
            const border = theme.fg("dim", "─".repeat(Math.max(10, width)));
            const headerLine =
              " " +
              theme.fg("accent", theme.bold(sp.title)) +
              "  " +
              theme.fg("dim", `(${sp.hint})`);
            // Wrap pills to ensure [1]..[N] and [0] remain fully visible on narrow viewports
            const maxLineCols = Math.max(20, width - 2);
            const pillLines: string[] = [];
            let currentLine = " ";
            let currentWidth = 1;
            for (let idx = 0; idx < items.length; idx++) {
              const it = items[idx];
              const renderedPill =
                idx === selectedIdx
                  ? theme.fg("accent", theme.bold(`▸ ${it.label}`))
                  : `  ${theme.fg("text", it.label)}`;
              const pillWidth = getVisualWidth(renderedPill);
              const sep = currentWidth > 1 ? "   " : "";
              const sepWidth = sep.length;
              if (currentWidth > 1 && currentWidth + sepWidth + pillWidth > maxLineCols) {
                pillLines.push(currentLine);
                currentLine = " " + renderedPill;
                currentWidth = 1 + pillWidth;
              } else {
                currentLine += sep + renderedPill;
                currentWidth += sepWidth + pillWidth;
              }
            }
            if (currentLine.trim()) {
              pillLines.push(currentLine);
            }
            return [
              border,
              truncateVisual(headerLine, width),
              ...pillLines,
              border,
            ];
          },
          handleInput(keyData: string) {
            // 1. Number keys 1..9 send immediately without pressing Enter
            if (/^[1-9]$/.test(keyData)) {
              const num = parseInt(keyData, 10);
              if (num >= 1 && num <= candidates.length) {
                done(candidates[num - 1].content);
                return;
              }
            }
            // 2. Key '0' or Esc / Ctrl+C passes through original raw text
            if (
              keyData === "0" ||
              keyData === "\x1b" ||
              keyData === "\x03" ||
              keybindings?.matches?.(keyData, "tui.select.cancel")
            ) {
              done("__ORIGINAL__");
              return;
            }
            // 3. Arrow keys / hjkl cycle capsule selection
            if (
              keyData === "h" ||
              keyData === "k" ||
              keyData === "\x1b[A" ||
              keyData === "\x1b[D" ||
              keybindings?.matches?.(keyData, "tui.select.up")
            ) {
              selectedIdx = (selectedIdx - 1 + items.length) % items.length;
              tui?.requestRender?.();
              return;
            }
            if (
              keyData === "l" ||
              keyData === "j" ||
              keyData === "\x1b[B" ||
              keyData === "\x1b[C" ||
              keyData === "\t" ||
              keybindings?.matches?.(keyData, "tui.select.down")
            ) {
              selectedIdx = (selectedIdx + 1) % items.length;
              tui?.requestRender?.();
              return;
            }
            // 4. Enter / Space confirms currently highlighted candidate
            if (
              keyData === "\r" ||
              keyData === "\n" ||
              keyData === "\x1bOM" ||
              keybindings?.matches?.(keyData, "tui.select.confirm")
            ) {
              done(items[selectedIdx]?.value);
              return;
            }
          },
          invalidate() {},
        };
      }
    );

    if (!pickedVal || pickedVal === "__ORIGINAL__") {
      return null;
    }
    return pickedVal;
  }

  if (typeof (ctx.ui as any).select === "function") {
    // Fallback select picker when ctx.ui.custom is unavailable
    const optionLabels = [
      ...candidates.map((c, idx) => `[${idx + 1}] ${c.label}`),
      `[0] ${sp.keepOrig}`,
    ];
    const picked = await (ctx.ui as any).select(`${sp.title} (${sp.hint})`, optionLabels);
    if (!picked || picked.startsWith("[0]")) {
      return null;
    }
    const idxMatch = picked.match(/^\[(\d+)\]/);
    if (idxMatch) {
      const idx = parseInt(idxMatch[1], 10) - 1;
      if (candidates[idx]) {
        return candidates[idx].content;
      }
    }
    return null;
  }

  return null;
}
