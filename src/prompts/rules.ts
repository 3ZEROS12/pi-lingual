const PROMPT_TARGET_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
  tw: "Chinese (Traditional)",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  ru: "Russian",
  pt: "Portuguese",
  it: "Italian",
  vi: "Vietnamese",
  tr: "Turkish",
  ar: "Arabic",
  ms: "Malay",
};

export function resolveLanguageName(code = "en"): string {
  const norm = (code || "en").toLowerCase().split("-")[0];
  return PROMPT_TARGET_LANGUAGE_NAMES[norm] || code.toUpperCase();
}

export function interpolatePromptVariables(
  template: string,
  vars: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
  }
): string {
  if (!template || typeof template !== "string") return template;
  const sCode = (vars.sourceLang || "en").toLowerCase().split("-")[0];
  const tCode = (vars.targetLang || "en").toLowerCase().split("-")[0];
  const eCode = (vars.explainLang || sCode).toLowerCase().split("-")[0];

  const sName = resolveLanguageName(sCode);
  const tName = resolveLanguageName(tCode);
  const eName = resolveLanguageName(eCode);

  return template
    .replace(/\$\{sourceLang\}/g, sName)
    .replace(/\$\{targetLang\}/g, tName)
    .replace(/\$\{explainLang\}/g, eName)
    .replace(/\$\{sourceLangCode\}/g, sCode)
    .replace(/\$\{targetLangCode\}/g, tCode)
    .replace(/\$\{explainLangCode\}/g, eCode);
}

export function resolvePromptTargetLangName(
  sourceLang = "en",
  targetLang = "en",
  promptLang?: string
): { code: string; name: string } {
  if (promptLang && promptLang.trim()) {
    const clean = promptLang.trim().toLowerCase().split("-")[0];
    return { code: clean, name: resolveLanguageName(clean) };
  }
  const s = (sourceLang || "en").toLowerCase().split("-")[0];
  const t = (targetLang || "").toLowerCase().split("-")[0];
  const outCode = t ? t : s === "en" ? "ja" : "en";
  return { code: outCode, name: resolveLanguageName(outCode) };
}

export const PROMPT_RULE_PRESETS: Record<string, string> = {
  concise: "Keep output strictly concise, minimal, and action-oriented. Eliminate all fluff.",
  spec: "Format output with explicit sections: Objective, Constraints, Edge Cases, and Deliverable.",
  deep: "Prioritize root-cause tracing, end-to-end flow inspection, and regression boundary checks.",
};

export const DEFAULT_KILL_LIST = [
  "delve",
  "tapestry",
  "seamless",
  "seamlessly",
  "robust",
  "enhance",
  "streamline",
  "comprehensive",
  "in summary",
  "game-changer",
  "revolutionize",
  "unleash",
  "thrilled to announce",
  "pivotal",
  "holistic",
  "multifaceted",
];

export function compileKillListInstruction(killList?: string[], globalKillList?: string[]): string {
  const baseGlobal = globalKillList !== undefined ? globalKillList : DEFAULT_KILL_LIST;
  const merged = Array.from(
    new Set([...baseGlobal, ...(killList || [])].map((w) => w.trim().toLowerCase()).filter(Boolean))
  );
  if (merged.length === 0) return "";
  return `\n\n[KILL LIST - FORBIDDEN AI BUZZWORDS - ZERO TOLERANCE]:
Strictly forbid using any of the following cliché, artificial, or corporate AI filler words/phrases:
${merged.map((w) => `• "${w}"`).join(", ")}.
Use plain, grounded, authentic developer language instead.`;
}

export function resolvePromptRulePreset(input: string): string {
  const key = input.trim().toLowerCase();
  return PROMPT_RULE_PRESETS[key] || input.trim();
}

export function normalizePromptRules(rule?: string | string[]): string[] {
  if (!rule) return [];
  if (Array.isArray(rule)) {
    return rule.map((r) => resolvePromptRulePreset(String(r || ""))).filter(Boolean);
  }
  const s = resolvePromptRulePreset(String(rule));
  return s ? [s] : [];
}
