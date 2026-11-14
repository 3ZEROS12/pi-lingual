export type { ReasoningEffort } from "./types.js";
export * from "./config.js";
export * from "./banner.js";
export * from "./engine/parser.js";
export * from "./engine/llm.js";
export * from "./engine/runner.js";
export {
  localizeModeName,
  localizeModes,
  localizeSlotLabel,
  getDefaultFactoryModes,
  resolveSeedNames,
  resolveModeDisplayName,
  SEED_NAMES,
  PRESET_LOADOUTS,
  getPresetLoadout,
  listPresetLoadouts,
} from "./presets.js";
export {
  getVisualWidth,
  truncateVisual,
  wrapVisualText,
  formatTreeBranch,
  formatSubRail,
  extractVocabPhrases,
  spotlightPhrases,
  formatTerminalAnnotation,
  formatCapsuleLine,
  renderCardLayout,
  formatVocabItemsAtomic,
  CANNOT_START_LINE_CHARS,
  getEffectiveMaxCols,
} from "./layout.js";
export { isNonEnglish } from "./shield.js";
export {
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildModifySystemPrompt,
  interpolatePromptVariables,
  resolveLanguageName,
  DEFAULT_KILL_LIST,
  compileKillListInstruction,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  resolveLanguagePairAnchors,
  LANGUAGE_PAIR_ANCHORS,
} from "./prompts.js";

/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`).
 */
export function stripLingualContextWhenOff(
  systemPrompt: string,
  lastUserText = "",
  tunerArmed = false
): string {
  if (!systemPrompt) return systemPrompt;
  if (tunerArmed || /(?:lingual-tuner|\/lingual\s+(?:tuner|tune|agent)|(?:定制|配置|调整)伴学)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt
    .replace(/\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "")
    .replace(/\s*<skill[^>]*>[\s\S]*?<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "");
}
