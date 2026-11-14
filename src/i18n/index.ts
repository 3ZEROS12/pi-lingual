import type { LingualI18nLabels } from "../types.js";
import { resolveModeDisplayName } from "../modes/names.js";
import { CJK_LANGUAGE_PRESETS } from "./cjk.js";
import { LATIN_LANGUAGE_PRESETS } from "./latin.js";

export const LANGUAGE_PRESETS: Record<string, LingualI18nLabels> = {
  ...LATIN_LANGUAGE_PRESETS,
  ...CJK_LANGUAGE_PRESETS,
};

export const SUPPORTED_LANG_CODES: string[] = ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"];

export function isSupportedLangCode(code: string): boolean {
  return SUPPORTED_LANG_CODES.includes((code || "").toLowerCase().split(/[-_]/)[0]);
}

export function normalizeLangCode(input: string): string {
  const s = (input || "").trim().toLowerCase().replace(/[-_].*$/, "");
  if (s === "zh" || s === "cn" || s === "chinese" || s === "中文") return "zh";
  if (s === "tw" || s === "zh-tw" || s === "traditional" || s === "繁中" || s === "繁體中文") return "tw";
  if (s === "ja" || s === "jp" || s === "japanese" || s === "日本語" || s === "日文" || s === "日语") return "ja";
  if (
    s === "ko" ||
    s === "kr" ||
    s === "korean" ||
    s === "한국어" ||
    s === "韩语" ||
    s === "韩文" ||
    s === "韓語" ||
    s === "韓文"
  ) {
    return "ko";
  }
  if (s === "en" || s === "eng" || s === "english" || s === "英语" || s === "英文") return "en";
  if (s === "es" || s === "spanish" || s === "español" || s === "西语" || s === "西班牙语") return "es";
  if (s === "fr" || s === "french" || s === "français" || s === "法语" || s === "法文") return "fr";
  if (s === "de" || s === "german" || s === "deutsch" || s === "德语" || s === "德文") return "de";
  if (s === "ru" || s === "russian" || s === "русский" || s === "俄语" || s === "俄文") return "ru";
  return s;
}

export function resolveLangPair(input: string, fallbackPair: string): { source: string; target: string } {
  const [fallbackSource, fallbackTarget] = (fallbackPair || "en ja").trim().split(/\s+/);
  const [rawSource, rawTarget] = (input || "").trim().split(/\s+/);
  const normalizedSource = normalizeLangCode(rawSource || "");
  const normalizedTarget = normalizeLangCode(rawTarget || "");
  const source = isSupportedLangCode(normalizedSource) ? normalizedSource : fallbackSource || "en";
  const target = isSupportedLangCode(normalizedTarget)
    ? normalizedTarget
    : source === "en"
      ? fallbackTarget && isSupportedLangCode(fallbackTarget) && fallbackTarget !== "en"
        ? fallbackTarget
        : "ja"
      : "en";
  return { source, target: target === source ? (source === "en" ? "ja" : "en") : target };
}

export function resolveLabelsForLang(
  lang = "en",
  overrides?: Partial<LingualI18nLabels>,
  targetLang?: string
): LingualI18nLabels {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.en;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} ⇄ ${actualTarget}`;

  const merged: Record<string, any> = {
    ...LANGUAGE_PRESETS.en,
    ...target,
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...(overrides || {}),
  };

  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[[a-z]{2}\s*⇄\s*[a-z]{2}\]/gi, `[${pairTitle}]`);
    }
  }

  return merged as LingualI18nLabels;
}

export function formatStatusReport(
  labels: LingualI18nLabels,
  info: {
    mode: string;
    sourceLang: string;
    targetLang?: string;
    activeModel: string;
    layout?: "tree" | "capsule";
    cacheStats?: {
      hits: number;
      misses: number;
      size: number;
      capacity: number;
    };
  }
): string {
  const modeDesc =
    info.mode === "companion" || info.mode === "original"
      ? labels.modeDescOriginal || "Companion · 0ms pass-through"
      : info.mode === "direct" || info.mode === "english"
        ? labels.modeDescEnglish || "Logical Spec · Deep reasoning"
        : info.mode === "live-flow" || info.mode === "modify" || info.mode === "raw"
          ? labels.modeDescLiveFlow || "Live Flow · i18n takeaway diffs"
          : info.mode === "off"
            ? labels.modeDescOff || "Off"
            : resolveModeDisplayName(info.mode, info.sourceLang);

  const layoutDesc =
    info.layout === "capsule"
      ? labels.layoutCapsule || "Single-Line Capsule (1-Line)"
      : labels.layoutTree || "Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)";

  const lines = [
    `⇄ [${labels.hudTitle}] ${labels.statusReportTitle || "Status Report"}`,
    `• ${labels.statusReportMode || "Mode"}: [${info.mode}] (${modeDesc})`,
    `• ${labels.statusReportFlow || "Flow"}: [${info.sourceLang} ➔ ${info.targetLang || "en"}]`,
    `• ${labels.statusReportModel || "Model"}: ${info.activeModel}`,
  ];

  if (info.cacheStats) {
    const total = info.cacheStats.hits + info.cacheStats.misses;
    const rate = total > 0 ? Math.round((info.cacheStats.hits / total) * 100) : 0;
    lines.push(
      `• ${labels.statusReportCache || "Cache"}: ${info.cacheStats.hits} hits / ${total} total (${rate}% hit rate) · ${info.cacheStats.size}/${info.cacheStats.capacity} items`
    );
  }

  lines.push(
    `• ${labels.statusReportLayout || "Layout"}: ${layoutDesc}`,
    `• ${labels.statusReportAuth || "Auth: Pi Native In-Process Auth"}`,
    `• ${labels.statusReportTuner || "Slot Tuner: Built-in lingual-tuner skill (Just describe preferences to Agent)"}`,
    `• ${labels.statusReportShortcuts || "Shortcuts: /lingual (or /l) · /lingual lang (or /lang) · /lingual last · /lingual compact"}`
  );
  return lines.join("\n");
}

export function formatModelSelectionMessage(
  labels: LingualI18nLabels,
  currentActive: string,
  availableList?: string
): string {
  let msg = `[${labels.hudTitle}] ${labels.modelCurrentLabel || "Current model"}: ${currentActive}\n`;
  if (availableList) {
    msg += `${labels.modelAvailableListHeader || "Available models:"}\n${availableList}\n• ${labels.modelAutoFollowDesc || "auto"}\n`;
  }
  msg += labels.modelSelectHint || "Specify model with /lingual model <model-id> or auto.";
  return msg;
}
