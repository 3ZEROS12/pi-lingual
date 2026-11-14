import type { SlotDefinition, SlotConfig, PromptSlotConfig } from "../types.js";
import { resolveLanguageName } from "./rules.js";

export interface SlotLabelsDef {
  source: string;
  spoken: string;
  written: string;
  vocab: string;
  en_direct: string;
  direct_vocab: string;
  concise: string;
  spec: string;
  deep: string;
  prompt_vocab: string;
  fixed: string;
  native: string;
  fixes: string;
}

const SLOT_LABELS_BY_LANG: Record<string, SlotLabelsDef> = {
  zh: {
    source: "原文",
    spoken: "口语",
    written: "写作",
    vocab: "重点",
    en_direct: "规范英文",
    direct_vocab: "核心表达",
    concise: "极简行动",
    spec: "结构规范",
    deep: "根因溯源",
    prompt_vocab: "核心表达",
    fixed: "原句修补",
    native: "地道表达",
    fixes: "收获复盘",
  },
  tw: {
    source: "原文",
    spoken: "口語",
    written: "寫作",
    vocab: "重點",
    en_direct: "規範英文",
    direct_vocab: "核心表達",
    concise: "極簡行動",
    spec: "結構規範",
    deep: "根因溯源",
    prompt_vocab: "核心表達",
    fixed: "原句修補",
    native: "道地表達",
    fixes: "收穫複盤",
  },
  ja: {
    source: "原文",
    spoken: "口語",
    written: "文面",
    vocab: "単語",
    en_direct: "標準英語",
    direct_vocab: "重要語彙",
    concise: "簡潔・高効率",
    spec: "構造化仕様",
    deep: "根本原因・厳密",
    prompt_vocab: "重要語彙",
    fixed: "原文修正",
    native: "自然表現",
    fixes: "重要ポイント",
  },
  ko: {
    source: "원문",
    spoken: "구어",
    written: "문어",
    vocab: "핵심어휘",
    en_direct: "규격영어",
    direct_vocab: "핵심표현",
    concise: "간결한 행동",
    spec: "구조화 사양",
    deep: "근본원인 엄밀",
    prompt_vocab: "핵심표현",
    fixed: "원문수정",
    native: "자연스러운표현",
    fixes: "핵심포인트",
  },
  es: {
    source: "Original",
    spoken: "Coloquial",
    written: "Escrito",
    vocab: "Vocabulario",
    en_direct: "Inglés Lógico",
    direct_vocab: "Términos clave",
    concise: "Conciso",
    spec: "Estructurado",
    deep: "Rigor profundo",
    prompt_vocab: "Vocabulario",
    fixed: "Corregido",
    native: "Nativo",
    fixes: "Puntos clave",
  },
  fr: {
    source: "Original",
    spoken: "Oral",
    written: "Écrit",
    vocab: "Vocabulaire",
    en_direct: "Anglais Logique",
    direct_vocab: "Termes clés",
    concise: "Concis",
    spec: "Structuré",
    deep: "Rigueur approfondie",
    prompt_vocab: "Vocabulaire",
    fixed: "Corrigé",
    native: "Naturel",
    fixes: "Points clés",
  },
  de: {
    source: "Original",
    spoken: "Gesprochen",
    written: "Schriftlich",
    vocab: "Vokabeln",
    en_direct: "Logisches Englisch",
    direct_vocab: "Schlüsselbegriffe",
    concise: "Prägnant",
    spec: "Strukturiert",
    deep: "Ursachenanalyse",
    prompt_vocab: "Schlüsselbegriffe",
    fixed: "Korrigiert",
    native: "Nativ",
    fixes: "Wichtige Punkte",
  },
  ru: {
    source: "Оригинал",
    spoken: "Разговорный",
    written: "Деловой",
    vocab: "Лексика",
    en_direct: "Тех-английский",
    direct_vocab: "Ключевые слова",
    concise: "Кратко",
    spec: "Структурированно",
    deep: "Первопричина",
    prompt_vocab: "Ключевые слова",
    fixed: "Исправлено",
    native: "Нативный",
    fixes: "Главное",
  },
  en: {
    source: "Original",
    spoken: "Spoken",
    written: "Written",
    vocab: "Vocab",
    en_direct: "Logical Spec",
    direct_vocab: "Key Terms",
    concise: "Concise",
    spec: "Structured",
    deep: "Deep Rigor",
    prompt_vocab: "Vocab",
    fixed: "Fixed",
    native: "Native",
    fixes: "Takeaway",
  },
};

export function resolveSlotLabels(lang = "en"): SlotLabelsDef {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SLOT_LABELS_BY_LANG[norm] || SLOT_LABELS_BY_LANG.en;
}

export function localizeSlotLabel(slotId: string, currentLabel: string, sourceLang = "en"): string {
  const isChineseSource = sourceLang === "zh" || sourceLang === "tw";
  const hasChinese = /[\u4e00-\u9fa5]/.test(currentLabel || "");
  const sl = resolveSlotLabels(sourceLang);
  const normId = (slotId || "").toLowerCase();

  if (!isChineseSource && (hasChinese || !currentLabel)) {
    switch (normId) {
      case "source":
        return sl.source;
      case "spoken":
        return sl.spoken;
      case "written":
        return sl.written;
      case "direct_vocab":
        return sl.direct_vocab;
      case "prompt_vocab":
        return sl.prompt_vocab;
      case "vocab":
        if (
          currentLabel === "核心表达" ||
          currentLabel === "核心表達" ||
          currentLabel === "重要語彙" ||
          currentLabel === "重要表現"
        ) {
          return sl.direct_vocab;
        }
        return sl.vocab;
      case "direct_spec":
      case "en_direct":
      case "spec":
        return sl.en_direct;
      case "fixed":
        return sl.fixed;
      case "native":
        return sl.native;
      case "fixes":
      case "takeaways":
      case "takeaway":
        return sl.fixes;
      default:
        if (normId.includes("source")) return sl.source;
        if (normId.includes("spoken")) return sl.spoken;
        if (normId.includes("written")) return sl.written;
        if (normId.includes("vocab")) return sl.vocab;
        if (normId.includes("spec") || normId.includes("direct")) return sl.en_direct;
        if (normId.includes("fix")) return sl.fixed;
        if (normId.includes("native")) return sl.native;
        return normId;
    }
  }

  if (!currentLabel) {
    switch (normId) {
      case "source":
        return sl.source;
      case "spoken":
        return sl.spoken;
      case "written":
        return sl.written;
      case "vocab":
        return sl.vocab;
      case "direct_spec":
      case "en_direct":
        return sl.en_direct;
      case "fixed":
        return sl.fixed;
      case "native":
        return sl.native;
      case "fixes":
        return sl.fixes;
    }
  }

  return currentLabel || slotId;
}

export function getDefaultDirectSlots(sourceLang = "en"): PromptSlotConfig[] {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "en_direct",
      label: sl.en_direct,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
      enabled: true,
    },
    {
      id: "vocab",
      label: sl.direct_vocab,
      role: "vocab",
      instruction:
        "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) · term2 (...)'.",
      enabled: true,
    },
  ];
}

export function getDefaultPromptSlots(sourceLang = "en"): PromptSlotConfig[] {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "concise",
      label: sl.concise,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      enabled: true,
    },
    {
      id: "spec",
      label: sl.spec,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable without inventing unrequested features.",
      enabled: true,
    },
    {
      id: "deep",
      label: sl.deep,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Root-cause & architectural rigor: trace end-to-end execution flow, fix shared root causes rather than symptom patches, and verify edge cases.",
      enabled: true,
    },
    {
      id: "vocab",
      label: sl.prompt_vocab,
      role: "vocab",
      instruction:
        "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this prompt in ${explainLang}.",
      enabled: true,
    },
  ];
}

export function getDefaultModifySlots(sourceLang = "en", explainLang?: string): PromptSlotConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (explainLang || norm).toLowerCase().split("-")[0];
  const expName = resolveLanguageName(expNorm);
  const sl = resolveSlotLabels(sourceLang);

  return [
    {
      id: "fixed",
      label: sl.fixed,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' ➔ 'want you to'), wrong prepositions/articles (e.g. 'in X' ➔ 'on X'), and grammatical slips in the user's sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')—passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
      hideWhenLong: true,
      enabled: true,
    },
    {
      id: "native",
      label: sl.native,
      role: "rewrite",
      instruction:
        "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
      hideWhenLong: true,
      enabled: true,
    },
    {
      id: "fixes",
      label: sl.fixes,
      role: "vocab",
      instruction: `Extract 1-3 essential takeaways in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${expName})'.`,
      enabled: true,
    },
  ];
}

export function getDefaultSlots(sourceLang = "en"): SlotConfig[] {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "source",
      label: sl.source,
      role: "source",
      enabled: true,
    },
    {
      id: "spoken",
      label: sl.spoken,
      role: "translation",
      instruction:
        "Natural, idiomatic spoken ${targetLang} suitable for real-time team collaboration, peer discussions, and daily communication.",
      showMeaning: true,
      enabled: true,
    },
    {
      id: "written",
      label: sl.written,
      role: "translation",
      instruction:
        "Clear, precise, well-structured written ${targetLang} suitable for technical documentation, proposals, architecture reviews, and client communications. Active, concise, professional. STRICTLY AVOID archaic filler and AI-slop buzzwords.",
      showMeaning: true,
      enabled: true,
    },
    {
      id: "vocab",
      label: sl.vocab,
      role: "vocab",
      instruction:
        "Extract key idiomatic collocations, phrasal expressions, technical idioms, or nuanced terms in ${explainLang}.",
      enabled: true,
    },
  ];
}

export const LEGACY_SLOT_PRESETS: Record<string, { slot1: SlotDefinition; slot2: SlotDefinition }> = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction:
        "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Contractions, native phrasal verbs, idioms.",
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction:
        "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional.",
    },
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction:
        "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit.",
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction:
        "High-signal, structured technical insight for technical threads and long-form posts. Direct without corporate marketing fluff.",
    },
  },
  japanese: {
    slot1: {
      label: "口語",
      name: "日常タメ口 (Casual Spoken)",
      instruction: "親しい同僚やチームとの日常会話・Slackハドル・カジュアルなやり取りに最適な自然な口語表現。",
    },
    slot2: {
      label: "敬語",
      name: "ビジネス丁寧語・謙譲語 (Business Polite)",
      instruction: "上司・クライアント・公式連絡・業務報告にふさわしい洗練された丁寧語・謙譲語のビジネス文面。",
    },
  },
  academic: {
    slot1: {
      label: "Discussion",
      name: "Lab Seminar Colloquy",
      instruction:
        "Natural conversational academic discourse (research lab discussions, seminar Q&A, conference banter). Fluent, collegial, and clear.",
    },
    slot2: {
      label: "Paper",
      name: "Peer-Reviewed Paper Prose",
      instruction:
        "Rigorous, objective, passive/active balanced academic prose meeting IEEE and ACM journal standards. Precise vocabulary.",
    },
  },
};
