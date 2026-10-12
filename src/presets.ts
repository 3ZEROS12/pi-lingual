import type { LingualI18nLabels, SlotConfig } from "./types.js";

export interface SlotPresetDefinition {
  name: string;
  description: string;
  slots: (sourceLang?: string) => SlotConfig[];
}

export { getDefaultSlots } from "./prompts.js";

/**
 * 创建自定义槽位配置
 */
export function createCustomSlot(params: Partial<SlotConfig> & { id: string; label: string }): SlotConfig {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction: params.instruction?.trim() || (role === "source" ? undefined : "Natural, authentic expressions matching requested context."),
    showMeaning: params.showMeaning !== undefined ? params.showMeaning : (role !== "source" && role !== "vocab"),
    enabled: params.enabled !== undefined ? params.enabled : true,
  };
}

/**
 * 纯函数：向槽位列表中添加槽位（若已存在同名 id 则覆盖更新，否则追加在末尾）
 */
export function addSlotToList(slots: SlotConfig[], newSlot: SlotConfig): SlotConfig[] {
  const normId = newSlot.id.trim().toLowerCase();
  const existingIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (existingIndex >= 0) {
    const copy = [...slots];
    copy[existingIndex] = { ...newSlot, id: normId };
    return copy;
  }
  return [...slots, { ...newSlot, id: normId }];
}

/**
 * 纯函数：从槽位列表中彻底移除指定 id 的槽位（支持删除 source 原文槽位）
 */
export function removeSlotFromList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.filter((s) => s.id.toLowerCase() !== normId);
}

/**
 * 纯函数：更新指定槽位的属性
 */
export function updateSlotInList(slots: SlotConfig[], slotId: string, patch: Partial<SlotConfig>): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, ...patch } : s));
}

/**
 * 纯函数：切换指定槽位的启用/禁用状态
 */
export function toggleSlotInList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, enabled: !s.enabled } : s));
}

/**
 * 纯函数：调整槽位在列表中的排列顺序
 */
export function moveSlotInList(slots: SlotConfig[], slotId: string, targetIndex: number): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  const currentIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= slots.length || currentIndex === targetIndex) {
    return slots;
  }
  const copy = [...slots];
  const [removed] = copy.splice(currentIndex, 1);
  copy.splice(targetIndex, 0, removed);
  return copy;
}

export const SLOT_PRESETS: Record<string, SlotPresetDefinition> = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "原文" : isJa ? "原文" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "口语" : isJa ? "口語" : "Spoken", role: "translation", instruction: "Natural, fluent spoken flow (daily standup, Slack, agile collaboration, conversational banter).", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "写作" : isJa ? "文面" : "Written", role: "translation", instruction: "Clear, precise, modern technical written prose (RFCs, PR descriptions, documentation, deep insight).", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "重点" : isJa ? "単語" : "Vocab", role: "vocab", instruction: "Extract key idiomatic collocations, phrasal verbs, or technical idioms.", enabled: true },
      ];
    },
  },
  social: {
    name: "Social",
    description: "Overseas Twitter / Community building: Hook + Deep + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "原文" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement, punchy opening hook optimized for Twitter/X threads and viral developer discussions.", showMeaning: true, enabled: true },
        { id: "written", label: "Deep", role: "translation", instruction: "Insightful, narrative technical value and nuanced architecture reasoning.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "重点" : "Vocab", role: "vocab", instruction: "Key engagement idioms and technical phrases.", enabled: true },
      ];
    },
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: 口語 + 敬語 + 単语",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "原文" : isJa ? "原文" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "口語", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk, direct).", showMeaning: true, enabled: true },
        { id: "written", label: "敬語", role: "translation", instruction: "Formal, polite business Japanese (Keigo, Sonkeigo/Kenjougo, professional email/PR).", showMeaning: true, enabled: true },
        { id: "vocab", label: "単語", role: "vocab", instruction: "Key Japanese vocabulary, kanji readings, and idiomatic expressions.", enabled: true },
      ];
    },
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "原文" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
        { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for peer-reviewed IEEE/ACM papers and arXiv preprints.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "重点" : "Vocab", role: "vocab", enabled: false },
      ];
    },
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "原文" : isJa ? "原文" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "译文" : isJa ? "訳文" : "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "写作" : "Written", role: "translation", enabled: false },
        { id: "vocab", label: isZh ? "重点" : "Vocab", role: "vocab", enabled: false },
      ];
    },
  },
};

export function resolveSlotsForPreset(presetName = "developer", sourceLang = "en"): SlotConfig[] {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}

/**
 * 官方预设多语言映射矩阵 (Language Preset Matrix)
 * 当用户或 Agent 设定母语 A 时，所有 UI 标签、图腾与状态文本自动本地化，彻底根除跨语言残留。
 */
export const LANGUAGE_PRESETS: Record<string, LingualI18nLabels> = {
  zh: {
    slot1Label: "口语",
    slot2Label: "写作",
    vocabLabel: "重点",
    sourceLabel: "原文",
    hudTitle: "zh ⇄ en",
    statusOriginal: "zh ⇄ en",
    statusEnglish: "zh ⇄ en",
    statusOff: "zh ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[zh ⇄ en] 已切换至【原文模式】：输入保持纯净母语，上方 HUD 浮现伴学视窗",
    notifyEnglish: "[zh ⇄ en] 已切换至【英文模式】：发给 AI 的输入将自动转换为纯正技术英文",
    notifyOff: "[zh ⇄ en] 已关闭伴学",
    notifyPaging: "[zh ⇄ en] 长句已切分多段，按 Alt+. 或 Alt+, 翻页浏览",
    notifyNoHistory: "[zh ⇄ en] 暂无上一条伴学记录",
    notifyHistoryRestored: "[zh ⇄ en] 已重新显示上一条伴学卡片",
    notifyAgentHelp: "💡 内置 lingual-tuner 槽位调优技能：直接对当前 Agent 说 \"帮我定制伴学：只要推文和深度分析，不要原文\" 即可免命令自动装配！切换母语请运行 /lang <code>。",
    notifyModelSwitched: "伴学模型已切换为: {model}",
    notifyLangSwitched: "伴学语言已切换为: {lang}（提示：命令补全菜单文面将在重启终端后完全同步）",
    notifyLangInvalid: "无效的语言代码。支持的语言代码: zh, ja, en, es, fr, de",
    notifyCompactOn: "[zh ⇄ en] 已开启单行胶囊模式：极简占位，保护分屏视野",
    notifyCompactOff: "[zh ⇄ en] 已切换为左导轨树状架构：展示完整双模与语感",
    notifyTimeout: "[zh ⇄ en] 英文翻译请求未就绪或超时，本次已放行原文",
    notifyError: "[zh ⇄ en] 英文翻译请求异常，本次已放行原文",

    cmdDescMode: "切换伴学模式 [zh ⇄ en]: [原文] ➔ [英文] ➔ [关]",
    cmdDescStatus: "查看伴学插件当前状态报告与模型诊断: /lingual-status",
    cmdDescModel: "查看或切换伴学模型 [zh ⇄ en]: /lingual-model [model-id|auto]",
    cmdDescLang: "查看或切换伴学母语 [zh ⇄ en]: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "切换单行胶囊模式与完整树状图: /lingual-compact",
    cmdDescLast: "重新回看或重现上一条伴学卡片: /lingual-last",
    cmdDescAgent: "查看伴学定制与母语切换指南: /lingual-agent",
    shortcutNextPage: "切换至下一段伴学切片",
    shortcutPrevPage: "切换至上一段伴学切片",

    capsuleSlot1Prefix: "口",
    capsuleSlot2Prefix: "写",
    layoutCapsule: "单行胶囊极简流 (1-Line Capsule)",
    layoutTree: "Trifecta 开放式左导轨树状架构 (· ┌ ├ └)",

    statusReportTitle: "运行状态报告",
    statusReportMode: "当前模式",
    statusReportFlow: "语言流向",
    statusReportModel: "伴学模型",
    statusReportCache: "会话缓存",
    statusReportLayout: "HUD布局: Trifecta 开放式左导轨树状架构 (· ┌ ├ └)",
    statusReportAuth: "凭据模式: Pi 原生进程内认证 (Zero Config · 零Token泄露)",
    statusReportShortcuts: "快捷操作: /lingual (切换模式) · /slots (管理槽位) · /lang (切语言) · /lingual-compact (切换布局)",
    statusReportTuner: "槽位调优: 内置 lingual-tuner 技能（直接向 Agent 描述即可免命令定制）",
    modeDescOriginal: "原文直通 · 0ms非阻塞",
    modeDescEnglish: "英文模式 · 深度代码推理",
    modeDescOff: "已关闭",

    modelCurrentLabel: "当前伴学模型",
    modelFollowSession: "跟随会话",
    modelAvailableListHeader: "可用模型 (输入 /lingual-model <id> 切换):",
    modelAutoFollowDesc: "auto (自动跟随当前会话主模型)",
    modelSelectHint: "可输入 /lingual-model <model-id> 或 auto 指定伴学模型。",

    langUsageHint: "用法: /lang <zh|ja|en|es|fr|de> [target] (如 /lang ja 或 /lang zh ja)",
    langList: [
      "• zh (中文 ➔ 英文)",
      "• ja (日本語 ➔ 英語)",
      "• en (英文 ➔ 日文)",
      "• es (西班牙文 ➔ 英文)",
      "• fr (法文 ➔ 英文)",
      "• de (德文 ➔ 英文)",
    ],

    // 动态槽位架构本地化文案 (中文)
    slotsHeader: "动态槽位架构",
    slotsActiveTag: "激活",
    slotsNone: "未配置任何槽位",
    slotsStatusEnabled: "已启用",
    slotsStatusDisabled: "已禁用",
    slotsWithNuance: " +母语微释义",
    slotsNlTitle: "💬 自然语言定制（直接向当前 Agent 描述，无需手动输入命令）：",
    slotsNlExamples: [
      "• \"帮我定制伴学：只要推特推文和深度分析，不要原文\"",
      "• \"把伴学改成单槽位纯译文\"",
      "• \"恢复默认伴学槽位\"",
    ],
    slotsCliTitle: "⚡️ 常用快捷命令：",
    slotsCliHelp: [
      "• /slots rm source       - 物理隐藏原文行",
      "• /slots compact2        - 极简双槽位",
      "• /slots reset           - 恢复初始默认",
      "• /slots toggle <id>     - 临时开关槽位",
    ],
    slotsResetSuccess: "[{pair}] 已重置槽位为初始默认状态（原文 + 口语 + 写作 + 重点）",
    slotsRemovedSuccess: "[{pair}] 已移除槽位 [{id}] (\"{label}\")",
    slotsRemovedSourceNote: "（已物理隐藏原文行）",
    slotsToggled: "[{pair}] 槽位 [{id}] 当前状态: {status}",
    slotsAdded: "[{pair}] 已添加/更新槽位 [{id}] \"{label}\"",
    slotsNotFound: "[{pair}] 未找到槽位 [{id}]。运行 /slots 查看当前槽位",
    slotsUsageAdd: "用法: /slots add <id> <标签> [提示词...]\n示例: /slots add twitter 推文 280字符以内爆款技术推文",
    slotsUsageRm: "用法: /slots rm <槽位ID> (例如 /slots rm source 隐藏原文)",
    slotsUsageToggle: "用法: /slots toggle <槽位ID>",
    slotsUnknown: "[{pair}] 未知槽位命令或预设 \"{cmd}\"。输入 /slots 查看当前槽位与帮助",
  },
  ja: {
    slot1Label: "口語",
    slot2Label: "文面",
    vocabLabel: "単語",
    sourceLabel: "原文",
    hudTitle: "ja ⇄ en",
    statusOriginal: "ja ⇄ en",
    statusEnglish: "ja ⇄ en",
    statusOff: "ja ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ja ⇄ en] 【原文モード】に切り替えました：入力は原文のまま、上部カードで英語を表示",
    notifyEnglish: "[ja ⇄ en] 【英語モード】に切り替えました：AIへの入力は純粋な技術英語に自動変換されます",
    notifyOff: "[ja ⇄ en] 伴走機能をオフにしました",
    notifyPaging: "[ja ⇄ en] 長文を分割しました。Alt+. または Alt+, でページ送り",
    notifyNoHistory: "[ja ⇄ en] 前回の記録はありません",
    notifyHistoryRestored: "[ja ⇄ en] 前回のカードを復元しました",
    notifyAgentHelp: "💡 lingual-tuner スロット調整スキル搭載：Agentに「ツイートと技術的洞察のみ、原文は不要」と伝えるだけで自動設定完了！母語切替は /lang <code> です。",
    notifyModelSwitched: "モデルを切り替えました: {model}",
    notifyLangSwitched: "母語を切り替えました: {lang}（※コマンド補完メニューの文面は端末再起動後に完全に反映されます）",
    notifyLangInvalid: "無効な言語コードです。対応言語: zh, ja, en, es, fr, de",
    notifyCompactOn: "[ja ⇄ en] 1行カプセルモードを有効にしました：画面領域を最大限確保",
    notifyCompactOff: "[ja ⇄ en] フルツリー表示に切り替えました：詳細なニュアンスを表示",
    notifySlotSwitched: "[ja ⇄ en] スロット構成を [{preset}] に切り替えました: {desc}",
    notifyTimeout: "[ja ⇄ en] 英語翻訳リクエストがタイムアウトしました。原文を送信しました",
    notifyError: "[ja ⇄ en] 英語翻訳リクエストでエラーが発生しました。原文を送信しました",

    cmdDescMode: "モード切替 [ja ⇄ en]: [原文] ➔ [英語] ➔ [オフ]",
    cmdDescStatus: "状態レポートとモデル診断を表示: /lingual-status",
    cmdDescModel: "学習モデルの確認・切替: /lingual-model [model-id|auto]",
    cmdDescLang: "伴走の母語を確認・変更: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "スロット構成の確認・切替 [ja ⇄ en]: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "1行カプセル表示とフルツリーの切替: /lingual-compact",
    cmdDescLast: "前回の伴走カードを再表示: /lingual-last",
    cmdDescAgent: "伴走カスタマイズと母語変更の案内を表示: /lingual-agent",
    shortcutNextPage: "次のセグメントに切り替え",
    shortcutPrevPage: "前のセグメントに切り替え",

    capsuleSlot1Prefix: "口",
    capsuleSlot2Prefix: "文",
    layoutCapsule: "1行カプセル表示 (1-Line Capsule)",
    layoutTree: "Trifecta オープン左レールツリー構造 (· ┌ ├ └)",

    statusReportTitle: "ステータスレポート",
    statusReportMode: "現在のモード",
    statusReportFlow: "言語フロー",
    statusReportModel: "伴走モデル",
    statusReportCache: "セッションキャッシュ",
    statusReportLayout: "HUDレイアウト: Trifecta オープン左レールツリー構造 (· ┌ ├ └)",
    statusReportAuth: "認証方式: Pi ネイティブインプロセス認証 (ゼロ設定・Token安全)",
    statusReportShortcuts: "クイック操作: /lingual (モード切替) · /slots (スロット管理) · /lang (言語切替) · /lingual-compact (レイアウト切替)",
    statusReportTuner: "スロット調整: lingual-tuner スキル搭載（Agentに要望を伝えるだけで設定）",
    modeDescOriginal: "原文パススルー · 0ms非同期",
    modeDescEnglish: "英語モード · 高度コード推論",
    modeDescOff: "オフ",

    modelCurrentLabel: "現在の学習モデル",
    modelFollowSession: "セッション連動",
    modelAvailableListHeader: "利用可能なモデル (/lingual-model <id> で切替):",
    modelAutoFollowDesc: "auto (セッションの主モデルに自動追従)",
    modelSelectHint: "/lingual-model <model-id> または auto を入力してモデルを指定できます。",

    langUsageHint: "使い方: /lang <zh|ja|en|es|fr|de> [target] (例: /lang ja または /lang zh ja)",
    langList: [
      "• zh (中国語 ➔ 英語)",
      "• ja (日本語 ➔ 英語)",
      "• en (英語 ➔ 日本語)",
      "• es (スペイン語 ➔ 英語)",
      "• fr (フランス語 ➔ 英語)",
      "• de (ドイツ語 ➔ 英語)",
    ],

    // 動的スロット構成ローカライズ文言 (日本語)
    slotsHeader: "動的スロット構成",
    slotsActiveTag: "有効",
    slotsNone: "スロットが設定されていません",
    slotsStatusEnabled: "有効",
    slotsStatusDisabled: "無効",
    slotsWithNuance: " +ニュアンス",
    slotsNlTitle: "💬 自然言語カスタマイズ（現在の Agent に直接伝えるだけ）：",
    slotsNlExamples: [
      "• 「伴走スロットをカスタマイズして：ツイートと技術的洞察のみ、原文は不要」",
      "• 「1行の純粋な訳文のみに変更して」",
      "• 「デフォルトのスロット構成に戻して」",
    ],
    slotsCliTitle: "⚡️ クイックCLIコマンド：",
    slotsCliHelp: [
      "• /slots rm source       - 原文行を完全に非表示",
      "• /slots compact2        - ミニマル2スロット",
      "• /slots reset           - デフォルト状態にリセット",
      "• /slots toggle <id>     - スロットの一時的なオン/オフ",
    ],
    slotsResetSuccess: "[{pair}] スロット構成をデフォルトにリセットしました",
    slotsRemovedSuccess: "[{pair}] スロット [{id}] (\"{label}\") を削除しました",
    slotsRemovedSourceNote: "（原文行は非表示になります）",
    slotsToggled: "[{pair}] スロット [{id}] は現在: {status}",
    slotsAdded: "[{pair}] スロット [{id}] \"{label}\" を追加/更新しました",
    slotsNotFound: "[{pair}] スロット [{id}] が見つかりません。/slots で確認してください",
    slotsUsageAdd: "使い方: /slots add <id> <ラベル> [プロンプト...]\n例: /slots add twitter ツイート 280字以内の技術ツイート",
    slotsUsageRm: "使い方: /slots rm <スロットID> (例: /slots rm source)",
    slotsUsageToggle: "使い方: /slots toggle <スロットID>",
    slotsUnknown: "[{pair}] 未知のコマンドまたはプリセット \"{cmd}\" です。/slots を入力してください",
  },
  en: {
    slot1Label: "Spoken",
    slot2Label: "Written",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "en ⇄ ja",
    statusOriginal: "en ⇄ ja",
    statusEnglish: "en ⇄ ja",
    statusOff: "en ⇄ ja: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[en ⇄ ja] Switched to [Original] mode: Prompt passed to AI unmodified, HUD displays translations",
    notifyEnglish: "[en ⇄ ja] Switched to [English] mode: Prompt transformed into idiomatic technical English",
    notifyOff: "[en ⇄ ja] Companion turned off",
    notifyPaging: "[en ⇄ ja] Long prompt segmented. Press Alt+. or Alt+, to navigate pages",
    notifyNoHistory: "[en ⇄ ja] No previous companion card recorded",
    notifyHistoryRestored: "[en ⇄ ja] Restored previous companion card",
    notifyAgentHelp: "💡 Built-in lingual-tuner skill: Just tell your Agent \"Customize companion: tweet and deep insight only, no source text\" to tune slots in 1 turn! Switch language via /lang <code>.",
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Native language switched to: {lang} (Note: Command autocomplete descriptions will fully refresh on terminal restart)",
    notifyLangInvalid: "Invalid language code. Supported: zh, ja, en, es, fr, de",
    notifyCompactOn: "[en ⇄ ja] Single-line capsule mode enabled for compact split panes",
    notifyCompactOff: "[en ⇄ ja] Full tree layout restored",
    notifySlotSwitched: "[en ⇄ ja] Switched slot architecture to [{preset}]: {desc}",
    notifyTimeout: "[en ⇄ ja] English translation timed out or not ready; original prompt passed",
    notifyError: "[en ⇄ ja] English translation request error; original prompt passed",

    cmdDescMode: "Cycle companion mode [en ⇄ ja]: [Original] ➔ [English] ➔ [Off]",
    cmdDescStatus: "Display companion status report and model diagnosis: /lingual-status",
    cmdDescModel: "Inspect or switch companion model: /lingual-model [model-id|auto]",
    cmdDescLang: "View or switch companion native language: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspect or switch slot architecture: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Toggle single-line capsule mode: /lingual-compact",
    cmdDescLast: "Replay previous companion card: /lingual-last",
    cmdDescAgent: "Display companion customization & language guide: /lingual-agent",
    shortcutNextPage: "Switch to next companion segment",
    shortcutPrevPage: "Switch to previous companion segment",

    capsuleSlot1Prefix: "Spk",
    capsuleSlot2Prefix: "Wrt",
    layoutCapsule: "Single-Line Capsule (1-Line)",
    layoutTree: "Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)",

    statusReportTitle: "Companion Status Report",
    statusReportMode: "Current mode",
    statusReportFlow: "Language flow",
    statusReportModel: "Companion model",
    statusReportCache: "Session Cache",
    statusReportLayout: "HUD Layout: Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)",
    statusReportAuth: "Auth: Pi Native In-Process Auth (Zero Config · Secure)",
    statusReportShortcuts: "Shortcuts: /lingual (mode) · /slots (slots) · /lang (lang) · /lingual-compact (layout)",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill (Just describe your preferences to Agent)",
    modeDescOriginal: "Pass-through · 0ms non-blocking",
    modeDescEnglish: "English mode · Deep reasoning",
    modeDescOff: "Disabled",

    modelCurrentLabel: "Current companion model",
    modelFollowSession: "Follow session",
    modelAvailableListHeader: "Available models (run /lingual-model <id> to switch):",
    modelAutoFollowDesc: "auto (Automatically follows active session model)",
    modelSelectHint: "Run /lingual-model <model-id> or auto to designate a model.",

    langUsageHint: "Usage: /lang <zh|ja|en|es|fr|de> [target] (e.g. /lang ja or /lang zh ja)",
    langList: [
      "• zh (Chinese ➔ English)",
      "• ja (Japanese ➔ English)",
      "• en (English ➔ Japanese)",
      "• es (Spanish ➔ English)",
      "• fr (French ➔ English)",
      "• de (German ➔ English)",
    ],

    // Dynamic slots chrome (English)
    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "💬 Natural Language Customization (Just ask your Agent directly):",
    slotsNlExamples: [
      "• \"Customize companion: only tweet and deep insight, no source text\"",
      "• \"Switch companion to single-slot clean translation\"",
      "• \"Reset companion slots to default\"",
    ],
    slotsCliTitle: "⚡️ Quick CLI Commands:",
    slotsCliHelp: [
      "• /slots rm source       - Hide original source text row",
      "• /slots compact2        - Minimal dual slot",
      "• /slots reset           - Reset to clean defaults",
      "• /slots toggle <id>     - Toggle slot enable/disable",
    ],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults (Source + Spoken + Written + Vocab)",
    slotsRemovedSuccess: "[{pair}] Removed slot [{id}] (\"{label}\")",
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: "[{pair}] Added/updated slot [{id}] \"{label}\"",
    slotsNotFound: "[{pair}] Slot [{id}] not found. Run /slots to inspect",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]\nExample: /slots add twitter Tweet Short punchy tweet under 280 chars",
    slotsUsageRm: "Usage: /slots rm <slot-id> (e.g. /slots rm source)",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: "[{pair}] Unknown slot command or preset \"{cmd}\". Type /slots to view help",
  },
  es: {
    slot1Label: "Coloquial",
    slot2Label: "Escrito",
    vocabLabel: "Vocab",
    sourceLabel: "Original",
    hudTitle: "es ⇄ en",
    statusOriginal: "es ⇄ en",
    statusEnglish: "es ⇄ en",
    statusOff: "es ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[es ⇄ en] Cambiado al modo [Original]: El texto se envía sin modificar",
    notifyEnglish: "[es ⇄ en] Cambiado al modo [Inglés]: El texto se transforma en inglés técnico",
    notifyOff: "[es ⇄ en] Asistente desactivado",
    notifyPaging: "[es ⇄ en] Texto largo segmentado. Presione Alt+. o Alt+, para navegar",
    notifyNoHistory: "[es ⇄ en] No hay registros anteriores",
    notifyHistoryRestored: "[es ⇄ en] Tarjeta anterior restaurada",
    notifyAgentHelp: "💡 Habilidad lingual-tuner integrada: Simplemente pídale a su Agente \"Personaliza el asistente: solo tuit y análisis, sin texto original\" para configurar las ranuras al instante. Cambie de idioma con /lang <code>.",
    notifyModelSwitched: "Modelo cambiado a: {model}",
    notifyLangSwitched: "Idioma nativo cambiado a: {lang} (Nota: Las descripciones del menú de comandos se actualizarán tras reiniciar la terminal)",
    notifyLangInvalid: "Código de idioma no válido. Admitidos: zh, ja, en, es, fr, de",
    notifyCompactOn: "[es ⇄ en] Modo cápsula de una línea activado",
    notifyCompactOff: "[es ⇄ en] Modo árbol completo restaurado",
    notifySlotSwitched: "[es ⇄ en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es ⇄ en] La traducción al inglés agotó el tiempo; se envió el texto original",
    notifyError: "[es ⇄ en] Error en la traducción al inglés; se envió el texto original",

    cmdDescMode: "Cambiar modo [es ⇄ en]: [Original] ➔ [Inglés] ➔ [Apagado]",
    cmdDescStatus: "Mostrar diagnóstico y estado del modelo: /lingual-status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual-model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma nativo: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Alternar modo cápsula de una línea: /lingual-compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual-last",
    cmdDescAgent: "Ver guía de personalización y cambio de idioma: /lingual-agent",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",

    capsuleSlot1Prefix: "Col",
    capsuleSlot2Prefix: "Esc",
    layoutCapsule: "Cápsula de una línea (1-Line Capsule)",
    layoutTree: "Trifecta árbol de guía izquierda (· ┌ ├ └)",

    statusReportTitle: "Informe de estado",
    statusReportMode: "Modo actual",
    statusReportFlow: "Flujo de idiomas",
    statusReportModel: "Modelo asistente",
    statusReportCache: "Caché de sesión",
    statusReportLayout: "Diseño HUD: Trifecta árbol de guía izquierda (· ┌ ├ └)",
    statusReportAuth: "Autenticación: Proceso nativo de Pi (Sin config · Seguro)",
    statusReportShortcuts: "Accesos directos: /lingual (modo) · /slots (ranuras) · /lang (idioma) · /lingual-compact (diseño)",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo · 0ms no bloqueante",
    modeDescEnglish: "Modo inglés · Razonamiento profundo",
    modeDescOff: "Apagado",

    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesión",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Sigue automáticamente el modelo de la sesión)",
    modelSelectHint: "Use /lingual-model <id> o auto para asignar un modelo.",

    langUsageHint: "Uso: /lang <zh|ja|en|es|fr|de> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "• zh (Chino ➔ Inglés)",
      "• ja (Japonés ➔ Inglés)",
      "• en (Inglés ➔ Japonés)",
      "• es (Español ➔ Inglés)",
      "• fr (Francés ➔ Inglés)",
      "• de (Alemán ➔ Inglés)",
    ],

    // Ranuras dinámicas (Español)
    slotsHeader: "Arquitectura de ranuras dinámicas",
    slotsActiveTag: "activas",
    slotsNone: "No hay ranuras configuradas",
    slotsStatusEnabled: "activada",
    slotsStatusDisabled: "desactivada",
    slotsWithNuance: " +matiz",
    slotsNlTitle: "💬 Personalización con lenguaje natural (consulte a su Agente directamente):",
    slotsNlExamples: [
      "• \"Personaliza el asistente: solo tuit y análisis profundo, sin texto original\"",
      "• \"Cambia el asistente a traducción limpia de una sola ranura\"",
      "• \"Restablece las ranuras predeterminadas\"",
    ],
    slotsCliTitle: "⚡️ Comandos CLI rápidos:",
    slotsCliHelp: [
      "• /slots rm source       - Ocultar la fila de texto original",
      "• /slots compact2        - Ranura doble mínima",
      "• /slots reset           - Restablecer valores predeterminados",
      "• /slots toggle <id>     - Activar/desactivar ranura",
    ],
    slotsResetSuccess: "[{pair}] Ranuras restablecidas a los valores predeterminados",
    slotsRemovedSuccess: "[{pair}] Ranura [{id}] (\"{label}\") eliminada",
    slotsRemovedSourceNote: " (La línea de texto original ya no aparecerá)",
    slotsToggled: "[{pair}] La ranura [{id}] ahora está: {status}",
    slotsAdded: "[{pair}] Ranura [{id}] \"{label}\" agregada/actualizada",
    slotsNotFound: "[{pair}] No se encontró la ranura [{id}]. Ejecute /slots para inspeccionar",
    slotsUsageAdd: "Uso: /slots add <id> <etiqueta> [instrucción...]",
    slotsUsageRm: "Uso: /slots rm <id_ranura>",
    slotsUsageToggle: "Uso: /slots toggle <id_ranura>",
    slotsUnknown: "[{pair}] Comando o ajuste preestablecido desconocido \"{cmd}\". Escriba /slots para ver la ayuda",
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "Écrit",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "fr ⇄ en",
    statusOriginal: "fr ⇄ en",
    statusEnglish: "fr ⇄ en",
    statusOff: "fr ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[fr ⇄ en] Mode [Original] activé : Votre texte reste inchangé",
    notifyEnglish: "[fr ⇄ en] Mode [Anglais] activé : Votre prompt est traduit en anglais technique",
    notifyOff: "[fr ⇄ en] Compagnon désactivé",
    notifyPaging: "[fr ⇄ en] Long texte segmenté. Appuyez sur Alt+. ou Alt+, pour parcourir",
    notifyNoHistory: "[fr ⇄ en] Aucun historique précédent",
    notifyHistoryRestored: "[fr ⇄ en] Carte précédente restaurée",
    notifyAgentHelp: "💡 Compétence lingual-tuner intégrée : Dites simplement à votre Agent \"Personnalise le compagnon : uniquement tweet et analyse, sans texte original\" pour ajuster les emplacements. Changez de langue avec /lang <code>.",
    notifyModelSwitched: "Modèle changé pour : {model}",
    notifyLangSwitched: "Langue maternelle changée en : {lang} (Note : L'autocomplétion des commandes sera actualisée après redémarrage du terminal)",
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, ja, en, es, fr, de",
    notifyCompactOn: "[fr ⇄ en] Mode capsule sur une seule ligne activé",
    notifyCompactOff: "[fr ⇄ en] Mode arborescence complète restauré",
    notifyTimeout: "[fr ⇄ en] La traduction en anglais a expiré ; le prompt original a été transmis",
    notifyError: "[fr ⇄ en] Erreur de traduction en anglais ; le prompt original a été transmis",

    cmdDescMode: "Changer de mode [fr ⇄ en]: [Original] ➔ [Anglais] ➔ [Désactivé]",
    cmdDescStatus: "Afficher le rapport d'état et le diagnostic: /lingual-status",
    cmdDescModel: "Consulter ou changer de modèle: /lingual-model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue maternelle: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne: /lingual-compact",
    cmdDescLast: "Réafficher la carte précédente: /lingual-last",
    cmdDescAgent: "Afficher le guide de personnalisation et de changement de langue : /lingual-agent",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment précédent",

    capsuleSlot1Prefix: "Oral",
    capsuleSlot2Prefix: "Écrit",
    layoutCapsule: "Capsule sur une ligne (1-Line Capsule)",
    layoutTree: "Disposition HUD : Arbre guide gauche Trifecta (· ┌ ├ └)",

    statusReportTitle: "Rapport d'état",
    statusReportMode: "Mode actuel",
    statusReportFlow: "Flux linguistique",
    statusReportModel: "Modèle compagnon",
    statusReportCache: "Cache de session",
    statusReportLayout: "Disposition HUD : Arbre guide gauche Trifecta (· ┌ ├ └)",
    statusReportAuth: "Authentification : Processus interne Pi natif (Zéro config · Sécurisé)",
    statusReportShortcuts: "Raccourcis : /lingual (mode) · /slots (emplacements) · /lang (langue) · /lingual-compact (mise en page)",
    statusReportTuner: "Ajustement d'emplacements : Compétence lingual-tuner intégrée (décrivez vos préférences à l'Agent)",
    modeDescOriginal: "Passerelle directe · 0ms non bloquant",
    modeDescEnglish: "Mode anglais · Raisonnement approfondi",
    modeDescOff: "Désactivé",

    modelCurrentLabel: "Modèle actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Modèles disponibles (tapez /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le modèle principal)",
    modelSelectHint: "Entrez /lingual-model <id> ou auto pour définir le modèle.",

    langUsageHint: "Utilisation : /lang <zh|ja|en|es|fr|de> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "• zh (Chinois ➔ Anglais)",
      "• ja (Japonais ➔ Anglais)",
      "• en (Anglais ➔ Japonais)",
      "• es (Espagnol ➔ Anglais)",
      "• fr (Français ➔ Anglais)",
      "• de (Allemand ➔ Anglais)",
    ],

    // Emplacements dynamiques (Français)
    slotsHeader: "Architecture d'emplacements dynamiques",
    slotsActiveTag: "actifs",
    slotsNone: "Aucun emplacement configuré",
    slotsStatusEnabled: "activé",
    slotsStatusDisabled: "désactivé",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "💬 Personnalisation en langage naturel (demandez à votre Agent) :",
    slotsNlExamples: [
      "• \"Personnalise le compagnon : uniquement tweet et analyse approfondie, sans texte original\"",
      "• \"Passe le compagnon à une traduction unique épurée\"",
      "• \"Réinitialise les emplacements par défaut\"",
    ],
    slotsCliTitle: "⚡️ Commandes CLI rapides :",
    slotsCliHelp: [
      "• /slots rm source       - Masquer la ligne de texte source",
      "• /slots compact2        - Double emplacement minimal",
      "• /slots reset           - Réinitialiser par défaut",
      "• /slots toggle <id>     - Activer/désactiver l'emplacement",
    ],
    slotsResetSuccess: "[{pair}] Emplacements réinitialisés par défaut",
    slotsRemovedSuccess: "[{pair}] Emplacement [{id}] (\"{label}\") supprimé",
    slotsRemovedSourceNote: " (La ligne source ne sera plus affichée)",
    slotsToggled: "[{pair}] L'emplacement [{id}] est maintenant : {status}",
    slotsAdded: "[{pair}] Emplacement [{id}] \"{label}\" ajouté/mis à jour",
    slotsNotFound: "[{pair}] Emplacement [{id}] introuvable. Exécutez /slots pour vérifier",
    slotsUsageAdd: "Utilisation : /slots add <id> <étiquette> [instruction...]",
    slotsUsageRm: "Utilisation : /slots rm <id_emplacement>",
    slotsUsageToggle: "Utilisation : /slots toggle <id_emplacement>",
    slotsUnknown: "[{pair}] Commande ou préréglage inconnu \"{cmd}\". Tapez /slots pour afficher l'aide",
  },
  de: {
    slot1Label: "Gesprochen",
    slot2Label: "Schriftlich",
    vocabLabel: "Wortschatz",
    sourceLabel: "Quelle",
    hudTitle: "de ⇄ en",
    statusOriginal: "de ⇄ en",
    statusEnglish: "de ⇄ en",
    statusOff: "de ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[de ⇄ en] Modus [Original] aktiviert: Eingabe wird unverändert weitergeleitet",
    notifyEnglish: "[de ⇄ en] Modus [Englisch] aktiviert: Eingabe wird in technisches Englisch übersetzt",
    notifyOff: "[de ⇄ en] Begleiter deaktiviert",
    notifyPaging: "[de ⇄ en] Langer Text segmentiert. Mit Alt+. oder Alt+, blättern",
    notifyNoHistory: "[de ⇄ en] Kein vorheriger Eintrag vorhanden",
    notifyHistoryRestored: "[de ⇄ en] Vorherige Karte wiederhergestellt",
    notifyAgentHelp: "💡 Integrierter lingual-tuner Skill: Sagen Sie Ihrem Agenten einfach \"Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext\", um Slots anzupassen. Sprache wechseln mit /lang <code>.",
    notifyModelSwitched: "Modell gewechselt zu: {model}",
    notifyLangSwitched: "Muttersprache geändert zu: {lang} (Hinweis: Befehlsbeschreibungen werden nach dem Terminal-Neustart vollständig aktualisiert)",
    notifyLangInvalid: "Ungültiger Sprachcode. Unterstützt: zh, ja, en, es, fr, de",
    notifyCompactOn: "[de ⇄ en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de ⇄ en] Vollständige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de ⇄ en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de ⇄ en] Englische Übersetzung hat das Zeitlimit überschritten; Originaltext wurde übergeben",
    notifyError: "[de ⇄ en] Fehler bei der englischen Übersetzung; Originaltext wurde übergeben",

    cmdDescMode: "Modus umschalten [de ⇄ en]: [Original] ➔ [Englisch] ➔ [Aus]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual-status",
    cmdDescModel: "Modell prüfen oder wechseln: /lingual-model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual-compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual-last",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual-agent",
    shortcutNextPage: "Zum nächsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",

    capsuleSlot1Prefix: "Ges",
    capsuleSlot2Prefix: "Sch",
    layoutCapsule: "Einzeilige Kapsel (1-Line Capsule)",
    layoutTree: "HUD-Layout: Trifecta Minimalistische Baumstruktur (· ┌ ├ └)",

    statusReportTitle: "Statusbericht",
    statusReportMode: "Aktueller Modus",
    statusReportFlow: "Sprachfluss",
    statusReportModel: "Begleitmodell",
    statusReportCache: "Sitzungscache",
    statusReportLayout: "HUD-Layout: Trifecta Minimalistische Baumstruktur (· ┌ ├ └)",
    statusReportAuth: "Authentifizierung: Pi nativer In-Process Modus (Zero Config · Sicher)",
    statusReportShortcuts: "Befehle: /lingual (Modus) · /slots (Slots) · /lang (Sprache) · /lingual-compact (Layout)",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Präferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt · 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus · Tiefgreifende Logik",
    modeDescOff: "Aus",

    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verfügbare Modelle (/lingual-model <id> ausführen):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual-model <id> oder auto ein.",

    langUsageHint: "Verwendung: /lang <zh|ja|en|es|fr|de> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "• zh (Chinesisch ➔ Englisch)",
      "• ja (Japanisch ➔ Englisch)",
      "• en (Englisch ➔ Japanisch)",
      "• es (Spanisch ➔ Englisch)",
      "• fr (Französisch ➔ Englisch)",
      "• de (Deutsch ➔ Englisch)",
    ],

    // Dynamische Slot-Architektur (Deutsch)
    slotsHeader: "Dynamische Slot-Architektur",
    slotsActiveTag: "aktiv",
    slotsNone: "Keine Slots konfiguriert",
    slotsStatusEnabled: "aktiviert",
    slotsStatusDisabled: "deaktiviert",
    slotsWithNuance: " +Nuance",
    slotsNlTitle: "💬 Anpassung in natürlicher Sprache (fragen Sie Ihren Agenten direkt):",
    slotsNlExamples: [
      "• \"Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext\"",
      "• \"Stellen Sie auf reine einzeilige Übersetzung um\"",
      "• \"Slots auf Standard zurücksetzen\"",
    ],
    slotsCliTitle: "⚡️ Schnelle CLI-Befehle:",
    slotsCliHelp: [
      "• /slots rm source       - Originaltextzeile ausblenden",
      "• /slots compact2        - Minimaler Doppel-Slot",
      "• /slots reset           - Auf Standard zurücksetzen",
      "• /slots toggle <id>     - Slot aktivieren/deaktivieren",
    ],
    slotsResetSuccess: "[{pair}] Slots auf Standard zurückgesetzt",
    slotsRemovedSuccess: "[{pair}] Slot [{id}] (\"{label}\") entfernt",
    slotsRemovedSourceNote: " (Originaltextzeile wird nicht mehr angezeigt)",
    slotsToggled: "[{pair}] Slot [{id}] ist jetzt: {status}",
    slotsAdded: "[{pair}] Slot [{id}] \"{label}\" hinzugefügt/aktualisiert",
    slotsNotFound: "[{pair}] Slot [{id}] nicht gefunden. Führen Sie /slots aus",
    slotsUsageAdd: "Verwendung: /slots add <id> <Label> [Anweisung...]",
    slotsUsageRm: "Verwendung: /slots rm <Slot-ID>",
    slotsUsageToggle: "Verwendung: /slots toggle <Slot-ID>",
    slotsUnknown: "[{pair}] Unbekannter Befehl oder Preset \"{cmd}\". /slots für Hilfe eingeben",
  },
  ko: {
    slot1Label: "구어체",
    slot2Label: "문어체",
    vocabLabel: "핵심표현",
    sourceLabel: "원문",
    hudTitle: "ko ⇄ en",
    statusOriginal: "ko ⇄ en",
    statusEnglish: "ko ⇄ en",
    statusOff: "ko ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ko ⇄ en] [원문 모드] 활성화: 원문이 그대로 전달됩니다",
    notifyEnglish: "[ko ⇄ en] [영어 모드] 활성화: 기술 영어로 자동 변환되어 전달됩니다",
    notifyOff: "[ko ⇄ en] 동반 모드 꺼짐",
    notifyPaging: "[ko ⇄ en] 장문 분할됨. Alt+. 또는 Alt+, 키로 탐색",
    notifyNoHistory: "[ko ⇄ en] 이전 기록이 없습니다",
    notifyHistoryRestored: "[ko ⇄ en] 이전 카드가 복원되었습니다",
    notifyAgentHelp: "💡 lingual-tuner 기능 내장: 에이전트에게 \"원문 없이 핵심 요약만 표시해줘\"라고 요청하면 자동 설정됩니다.",
    notifyModelSwitched: "동반 모델 변경됨: {model}",
    notifyLangSwitched: "모국어 변경됨: {lang}",
    notifyLangInvalid: "유효하지 않은 언어 코드입니다. 지원: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ko ⇄ en] 단일 행 캡슐 모드 켜짐",
    notifyCompactOff: "[ko ⇄ en] 트리 레이아웃 복원됨",
    notifyTimeout: "[ko ⇄ en] 번역 시간 초과; 원문이 그대로 전달되었습니다",
    notifyError: "[ko ⇄ en] 번역 오류; 원문이 그대로 전달되었습니다",

    cmdDescMode: "모드 전환 [ko ⇄ en]: [원문] ➔ [영어] ➔ [끔]",
    cmdDescStatus: "상태 보고서 및 진단 확인: /lingual-status",
    cmdDescModel: "모델 확인 및 변경: /lingual-model [model-id|auto]",
    cmdDescLang: "모국어 확인 및 변경: /lingual-lang",
    cmdDescSlots: "슬롯 구성 변경: /slots",
    cmdDescCompact: "단일 행 캡슐 모드 토글: /lingual-compact",
    cmdDescLast: "이전 카드 다시 보기: /lingual-last",
    cmdDescAgent: "사용자 설정 가이드: /lingual-agent",
    shortcutNextPage: "다음 세그먼트로 이동",
    shortcutPrevPage: "이전 세그먼트로 이동",

    capsuleSlot1Prefix: "구",
    capsuleSlot2Prefix: "문",
    layoutCapsule: "단일 행 캡슐 (1-Line Capsule)",
    layoutTree: "Trifecta 좌측 레일 트리 (· ┌ ├ └)",

    statusReportTitle: "상태 보고서",
    statusReportMode: "현재 모드",
    statusReportFlow: "언어 흐름",
    statusReportModel: "동반 모델",
    statusReportCache: "세션 캐시",
    statusReportLayout: "HUD 레이아웃: Trifecta 좌측 레일 트리 (· ┌ ├ └)",
    statusReportAuth: "인증 모드: Pi 프로세스 내 직접 인증 (Zero Config)",
    statusReportShortcuts: "명령어: /lingual (모드) · /slots (슬롯) · /lang (언어) · /lingual-compact (레이아웃)",
    statusReportTuner: "슬롯 튜너: lingual-tuner 내장",
    modeDescOriginal: "원문 직통 · 0ms 비차단",
    modeDescEnglish: "영어 모드 · 심층 코드 추론",
    modeDescOff: "꺼짐",

    modelCurrentLabel: "현재 모델",
    modelFollowSession: "세션 따름",
    modelAvailableListHeader: "사용 가능한 모델 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (현재 세션 주 모델 자동 추종)",
    modelSelectHint: "/lingual-model <id> 또는 auto 지정.",

    langUsageHint: "사용법: /lang <코드> [목표언어]",
    langList: [
      "• zh (중국어 ➔ 영어)",
      "• ja (일본어 ➔ 영어)",
      "• en (영어 ➔ 일본어/한국어)",
      "• ko (한국어 ➔ 영어)",
      "• es (스페인어 ➔ 영어)",
      "• fr (프랑스어 ➔ 영어)",
      "• de (독일어 ➔ 영어)",
      "• ru (러시아어 ➔ 영어)",
    ],

    slotsHeader: "동적 슬롯 아키텍처",
    slotsActiveTag: "활성",
    slotsNone: "구성된 슬롯 없음",
    slotsStatusEnabled: "활성화됨",
    slotsStatusDisabled: "비활성화됨",
    slotsWithNuance: " +뉘앙스",
    slotsNlTitle: "💬 자연어 설정:",
    slotsNlExamples: [
      "• \"원문 없이 캐주얼과 격식체만 보여줘\"",
      "• \"단일 행 순수 번역으로 변경해줘\"",
      "• \"기본 슬롯으로 복원해줘\"",
    ],
    slotsCliTitle: "⚡️ 빠른 CLI 명령어:",
    slotsCliHelp: [
      "• /slots rm source       - 원문 행 숨기기",
      "• /slots compact2        - 최소 듀얼 슬롯",
      "• /slots reset           - 기본값으로 복원",
      "• /slots toggle <id>     - 슬롯 켜기/끄기",
    ],
    slotsResetSuccess: "[{pair}] 슬롯이 기본값으로 복원되었습니다",
    slotsRemovedSuccess: "[{pair}] 슬롯 [{id}] (\"{label}\") 제거됨",
    slotsRemovedSourceNote: " (원문 행이 더 이상 표시되지 않습니다)",
    slotsToggled: "[{pair}] 슬롯 [{id}] 상태: {status}",
    slotsAdded: "[{pair}] 슬롯 [{id}] \"{label}\" 추가/업데이트됨",
    slotsNotFound: "[{pair}] 슬롯 [{id}]을(를) 찾을 수 없습니다",
    slotsUsageAdd: "사용법: /slots add <id> <라벨> [프롬프트...]",
    slotsUsageRm: "사용법: /slots rm <슬롯_id>",
    slotsUsageToggle: "사용법: /slots toggle <슬롯_id>",
    slotsUnknown: "[{pair}] 알 수 없는 명령어 \"{cmd}\". /slots 도움말 참조",
  },
  ru: {
    slot1Label: "Разговорный",
    slot2Label: "Деловой",
    vocabLabel: "Лексика",
    sourceLabel: "Оригинал",
    hudTitle: "ru ⇄ en",
    statusOriginal: "ru ⇄ en",
    statusEnglish: "ru ⇄ en",
    statusOff: "ru ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ru ⇄ en] Режим [Оригинал]: ваш текст передается без изменений",
    notifyEnglish: "[ru ⇄ en] Режим [Английский]: запрос переводится на технический английский",
    notifyOff: "[ru ⇄ en] Помощник выключен",
    notifyPaging: "[ru ⇄ en] Длинный текст разбит на сегменты. Нажмите Alt+. или Alt+,",
    notifyNoHistory: "[ru ⇄ en] Нет предыдущей записи",
    notifyHistoryRestored: "[ru ⇄ en] Предыдущая карточка восстановлена",
    notifyAgentHelp: "💡 Навык lingual-tuner: просто скажите Агенту настроить слоты без ручных команд.",
    notifyModelSwitched: "Модель переключена на: {model}",
    notifyLangSwitched: "Язык переключен на: {lang}",
    notifyLangInvalid: "Неверный код языка. Поддерживаются: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ru ⇄ en] Однострочный режим капсулы включен",
    notifyCompactOff: "[ru ⇄ en] Полное дерево восстановлено",
    notifyTimeout: "[ru ⇄ en] Время ожидания перевода истекло; передан оригинал",
    notifyError: "[ru ⇄ en] Ошибка перевода; передан оригинал",

    cmdDescMode: "Переключить режим [ru ⇄ en]: [Оригинал] ➔ [Английский] ➔ [Выкл]",
    cmdDescStatus: "Отчет о состоянии и диагностика: /lingual-status",
    cmdDescModel: "Проверить или сменить модель: /lingual-model [model-id|auto]",
    cmdDescLang: "Проверить или сменить язык: /lingual-lang",
    cmdDescSlots: "Настроить слоты: /slots",
    cmdDescCompact: "Переключить режим капсулы: /lingual-compact",
    cmdDescLast: "Показать предыдущую карточку: /lingual-last",
    cmdDescAgent: "Руководство по настройке: /lingual-agent",
    shortcutNextPage: "Перейти к следующему сегменту",
    shortcutPrevPage: "Перейти к предыдущему сегменту",

    capsuleSlot1Prefix: "Разг",
    capsuleSlot2Prefix: "Дел",
    layoutCapsule: "Однострочная капсула (1-Line Capsule)",
    layoutTree: "Trifecta левонаправленное дерево (· ┌ ├ └)",

    statusReportTitle: "Отчет о состоянии",
    statusReportMode: "Текущий режим",
    statusReportFlow: "Поток языков",
    statusReportModel: "Модель помощника",
    statusReportCache: "Кэш сессии",
    statusReportLayout: "HUD: Trifecta левонаправленное дерево (· ┌ ├ └)",
    statusReportAuth: "Аутентификация: Встроенный процесс Pi (Zero Config)",
    statusReportShortcuts: "Команды: /lingual (режим) · /slots (слоты) · /lang (язык)",
    statusReportTuner: "Настройка слотов: встроенный навык lingual-tuner",
    modeDescOriginal: "Оригинал · 0мс без блокировки",
    modeDescEnglish: "Английский режим · глубокое рассуждение",
    modeDescOff: "Выключено",

    modelCurrentLabel: "Текущая модель",
    modelFollowSession: "Следовать за сессией",
    modelAvailableListHeader: "Доступные модели (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (автоматически следовать за моделью сессии)",
    modelSelectHint: "Используйте /lingual-model <id> или auto.",

    langUsageHint: "Использование: /lang <код> [целевой_язык]",
    langList: [
      "• zh (Китайский ➔ Английский)",
      "• ja (Японский ➔ Английский)",
      "• en (Английский ➔ Русский/Японский)",
      "• ko (Корейский ➔ Английский)",
      "• es (Испанский ➔ Английский)",
      "• fr (Французский ➔ Английский)",
      "• de (Немецкий ➔ Английский)",
      "• ru (Русский ➔ Английский)",
    ],

    slotsHeader: "Архитектура динамических слотов",
    slotsActiveTag: "активны",
    slotsNone: "Слоты не настроены",
    slotsStatusEnabled: "включен",
    slotsStatusDisabled: "отключен",
    slotsWithNuance: " +нюанс",
    slotsNlTitle: "💬 Настройка естественным языком:",
    slotsNlExamples: [
      "• \"Сделай только разговорный и деловой стиль, без оригинала\"",
      "• \"Переключи на чистый однострочный перевод\"",
      "• \"Сбрось слоты на значения по умолчанию\"",
    ],
    slotsCliTitle: "⚡️ Быстрые команды CLI:",
    slotsCliHelp: [
      "• /slots rm source       - Скрыть строку оригинала",
      "• /slots compact2        - Минимальный двойной слот",
      "• /slots reset           - Сбросить на стандартные",
      "• /slots toggle <id>     - Включить/выключить слот",
    ],
    slotsResetSuccess: "[{pair}] Слоты сброшены на стандартные",
    slotsRemovedSuccess: "[{pair}] Слот [{id}] (\"{label}\") удален",
    slotsRemovedSourceNote: " (Строка оригинала больше не отображается)",
    slotsToggled: "[{pair}] Слот [{id}] теперь: {status}",
    slotsAdded: "[{pair}] Слот [{id}] \"{label}\" добавлен/обновлен",
    slotsNotFound: "[{pair}] Слот [{id}] не найден",
    slotsUsageAdd: "Использование: /slots add <id> <метка> [инструкция...]",
    slotsUsageRm: "Использование: /slots rm <id_слота>",
    slotsUsageToggle: "Использование: /slots toggle <id_слота>",
    slotsUnknown: "[{pair}] Неизвестная команда \"{cmd}\". Введите /slots для справки",
  },
};

/**
 * 根据母语语言代码解析对应的本地化标签，并允许用户自定义覆盖
 * 遵循 Lesson 7: 英文中枢保底链 (English Pivot Fallback)
 */
export function resolveLabelsForLang(
  lang: string,
  overrides?: Partial<LingualI18nLabels>,
  targetLang?: string
): LingualI18nLabels {
  const norm = (lang || "zh").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.zh;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} ⇄ ${actualTarget}`;

  const merged: Record<string, any> = {
    ...LANGUAGE_PRESETS.en, // 1. 英文全量保底 (保证任何新增 key 不为空，不泄露中文)
    ...target,              // 2. 目标母语官方预设
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...(overrides || {}),   // 3. 用户显式覆盖
  };

  // 动态将预设中的死板语言对标签替换为真实的动态当前流向 pairTitle
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[[a-z]{2}\s*⇄\s*[a-z]{2}\]/gi, `[${pairTitle}]`);
    }
  }

  return merged as LingualI18nLabels;
}

/**
 * 格式化完整的运行状态报告，严格遵循母语 A 统治权
 */
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
    info.mode === "original"
      ? (labels.modeDescOriginal || "Original pass-through")
      : info.mode === "english"
      ? (labels.modeDescEnglish || "English deep reasoning")
      : (labels.modeDescOff || "Off");

  const layoutDesc =
    info.layout === "capsule"
      ? (labels.layoutCapsule || "Single-Line Capsule (1-Line)")
      : (labels.layoutTree || "Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)");

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
    `• ${labels.statusReportShortcuts || "Shortcuts: /lingual · /slots · /lang · /lingual-compact · /status"}`
  );
  return lines.join("\n");
}

/**
 * 格式化模型选择界面的提示文本，严格遵循母语 A 统治权
 */
export function formatModelSelectionMessage(
  labels: LingualI18nLabels,
  currentActive: string,
  availableList?: string
): string {
  let msg = `[${labels.hudTitle}] ${labels.modelCurrentLabel || "Current model"}: ${currentActive}\n`;
  if (availableList) {
    msg += `${labels.modelAvailableListHeader || "Available models:"}\n${availableList}\n• ${labels.modelAutoFollowDesc || "auto"}\n`;
  }
  msg += labels.modelSelectHint || "Specify model with /lingual-model <model-id> or auto.";
  return msg;
}
