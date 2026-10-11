export type {
  LingualRequest,
  LingualResponse,
  LingualMode,
  LinguaMode,
  RefinePreset,
  LingualConfig,
  LinguaConfig,
  LingualResult,
  LinguaResult,
  TranslationPayload,
  SlotDefinition,
  CustomSlotsConfig,
  SlotRole,
  SlotConfig,
  SlotResult,
} from "./core/types.js";

export interface LingualI18nLabels {
  slot1Label: string;      // e.g. "Spoken" | "口語" | "Slack"
  slot2Label: string;      // e.g. "Written" | "文面" | "RFC"
  vocabLabel: string;      // e.g. "Vocab" | "単語"
  sourceLabel: string;     // e.g. "Original" | "原文"
  hudTitle: string;        // e.g. "zh ⇄ en" | "en ⇄ ja"
  statusOriginal: string;  // e.g. "zh ⇄ en"
  statusEnglish: string;   // e.g. "zh ⇄ en"
  statusOff: string;       // e.g. "zh ⇄ en: off"
  subNuanceLabel?: string; // e.g. "↳"

  // Localized notifications (Primary Language Sovereignty)
  notifyOriginal?: string;
  notifyEnglish?: string;
  notifyOff?: string;
  notifyPaging?: string;
  notifyNoHistory?: string;
  notifyHistoryRestored?: string;
  notifyAgentHelp?: string;
  notifyModelSwitched?: string; // template containing {model} or format string
  notifyLangSwitched?: string;  // template containing {lang}
  notifyLangInvalid?: string;
  notifySlotSwitched?: string;  // template containing {preset}
  notifyCompactOn?: string;
  notifyCompactOff?: string;
  notifyTimeout?: string;
  notifyError?: string;

  // Localized command descriptions
  cmdDescMode?: string;
  cmdDescStatus?: string;
  cmdDescModel?: string;
  cmdDescLang?: string;
  cmdDescSlots?: string;
  cmdDescCompact?: string;
  cmdDescLast?: string;
  cmdDescAgent?: string;
  shortcutNextPage?: string;
  shortcutPrevPage?: string;

  // Localized capsule prefixes
  capsuleSlot1Prefix?: string; // e.g. "Spk" | "口"
  capsuleSlot2Prefix?: string; // e.g. "Wrt" | "写"
  layoutCapsule?: string;      // e.g. "单行胶囊模式" | "Single-Line Capsule"
  layoutTree?: string;         // e.g. "左导轨树状架构" | "Left-Rail Tree"

  // Localized status report & model diagnostics
  statusReportTitle?: string;
  statusReportMode?: string;
  statusReportFlow?: string;
  statusReportModel?: string;
  statusReportCache?: string;
  statusReportLayout?: string;
  statusReportAuth?: string;
  statusReportShortcuts?: string;
  statusReportTuner?: string;
  modeDescOriginal?: string;
  modeDescEnglish?: string;
  modeDescOff?: string;

  // Localized model selector chrome
  modelCurrentLabel?: string;
  modelFollowSession?: string;
  modelAvailableListHeader?: string;
  modelAutoFollowDesc?: string;
  modelSelectHint?: string;

  // Localized language switcher & usage hints (Zero Chinese Residue)
  langUsageHint?: string;
  langList?: string[];

  // Localized dynamic slots chrome (Primary Language Sovereignty)
  slotsHeader?: string;             // e.g. "动态槽位架构" | "Dynamic Slots" | "動的スロット構成"
  slotsActiveTag?: string;          // e.g. "激活" | "active" | "有効"
  slotsNone?: string;               // e.g. "未配置任何槽位" | "No slots configured"
  slotsStatusEnabled?: string;      // e.g. "已启用" | "enabled" | "有効"
  slotsStatusDisabled?: string;     // e.g. "已禁用" | "disabled" | "無効"
  slotsWithNuance?: string;         // e.g. " +母语微释义" | " +nuance" | " +ニュアンス"
  slotsNlTitle?: string;            // e.g. "💬 自然语言定制（直接跟当前 Agent 聊，无需手敲命令）："
  slotsNlExamples?: string[];       // Array of 3-4 natural language examples
  slotsCliTitle?: string;           // e.g. "⚡️ 常用快捷命令："
  slotsCliHelp?: string[];          // Array of quick CLI commands
  slotsResetSuccess?: string;       // e.g. "已重置槽位为初始默认状态"
  slotsRemovedSuccess?: string;     // e.g. "已移除槽位 [{id}] (\"{label}\")"
  slotsRemovedSourceNote?: string;  // e.g. "（已物理隐藏原文行）"
  slotsToggled?: string;            // e.g. "槽位 [{id}] 当前状态: {status}"
  slotsAdded?: string;              // e.g. "已添加/更新槽位 [{id}] \"{label}\""
  slotsNotFound?: string;           // e.g. "未找到槽位 [{id}]，请运行 /slots 查看"
  slotsUsageAdd?: string;           // e.g. "用法: /slots add <id> <标签> [提示词...]"
  slotsUsageRm?: string;            // e.g. "用法: /slots rm <槽位ID>"
  slotsUsageToggle?: string;        // e.g. "用法: /slots toggle <槽位ID>"
  slotsUnknown?: string;            // e.g. "未知命令或预设 \"{cmd}\"，输入 /slots 查看帮助"

  // Aliases for backwards compatibility
  spokenLabel?: string;
  writtenLabel?: string;
}
export type LinguaI18nLabels = LingualI18nLabels;
