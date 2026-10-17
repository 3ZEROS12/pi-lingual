import type { SlotDefinition, CustomSlotsConfig, SlotConfig, PromptSlotConfig } from "./types.js";

interface SlotLabelsDef {
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

function resolveSlotLabels(lang = "en"): SlotLabelsDef {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SLOT_LABELS_BY_LANG[norm] || SLOT_LABELS_BY_LANG.en;
}

/**
 * Universal default slot generators (AI-native with semantic variable interpolation).
 * Dynamically expanded with ${sourceLang}, ${targetLang}, and ${explainLang}.
 */
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
      instruction:
        `Extract 1-3 essential takeaways in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${expName})'.`,
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
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Contractions, native phrasal verbs, idioms.",
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional.",
    },
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit.",
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads and long-form posts. Direct without corporate marketing fluff.",
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
      instruction: "Natural conversational academic discourse (research lab discussions, seminar Q&A, conference banter). Fluent, collegial, and clear.",
    },
    slot2: {
      label: "Paper",
      name: "Peer-Reviewed Paper Prose",
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE and ACM journal standards. Precise vocabulary.",
    },
  },
};

export interface LanguageAnchor {
  input: string;
  spoken: string;
  spoken_meaning: string;
  written: string;
  written_meaning: string;
  vocab: string;
}

export interface LanguageSpec {
  name: string;
  nativeName: string;
  meaningInstruction: string;
  vocabInstruction: string;
  anchors: LanguageAnchor[];
}

/**
 * Lightweight language specification and English-target anchors.
 */
export const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  zh: {
    name: "Chinese",
    nativeName: "中文",
    meaningInstruction: "in native Chinese",
    vocabInstruction: "in Chinese in parentheses separated by \" · \" (e.g. \"term1 (中文释义) · term2 (中文释义) · ...\")",
    anchors: [
      {
        input: "认同，开始吧",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "完全赞同，咱们直接开搞",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "确认赞同，着手推进具体实施",
        vocab: "on board with (赞成/支持) · dive in (立刻着手/开搞)",
      },
      {
        input: "继续",
        spoken: "Let's keep going.",
        spoken_meaning: "继续往下搞",
        written: "Proceed with the next steps.",
        written_meaning: "推进后续步骤",
        vocab: "keep going (继续推进) · proceed with (着手进行)",
      },
      {
        input: "这个方案有点过度设计了，不如直接用标准库实现",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "感觉有点过度设计了，用标准库划算得多",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "该方案引入了不必要的复杂度，建议优先采用原生标准库实现",
        vocab: "over-engineered (过度工程化) · be better off (做某事更合适/划算) · stick with (坚持使用/沿用) · leverage (利用/借助)",
      },
      {
        input: "我们抛弃了臃肿的框架，换成零依赖单文件，冷启动直接提速了10倍",
        spoken: "Ditched the bloated framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken_meaning: "甩掉了臃肿的框架换成了零依赖单文件，冷启动直接飙了10倍！",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "用零依赖架构取代了单体框架，使冷启动延迟降低至原来的十分之一。",
        vocab: "ditch ... for ... (抛弃某物换用) · zero-dep (零外部依赖) · cold start (冷启动) · yield (产出/实现)",
      },
    ],
  },
  tw: {
    name: "Chinese",
    nativeName: "繁體中文",
    meaningInstruction: "in native Chinese",
    vocabInstruction: "in Chinese in parentheses separated by \" · \"",
    anchors: [
      {
        input: "這個方案有點過度設計了，不如直接用標準庫實現",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "感覺有點過度設計了，用標準庫划算得多",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "該方案引入了不必要的複雜度，建議優先採用原生標準庫實現",
        vocab: "over-engineered (過度工程化) · be better off (做某事更划算) · stick with (沿用/堅持使用) · leverage (善用/借助)",
      },
      {
        input: "認同，開始吧",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "完全贊同，咱們直接開搞",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "確認贊同，著手推進具體實施",
        vocab: "on board with (贊成/支持) · dive in (立刻著手/開搞)",
      },
    ],
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    meaningInstruction: "in native Japanese",
    vocabInstruction: "in Japanese in parentheses separated by \" · \" (e.g. \"term1 (日本語解説) · term2 (日本語解説) · ...\")",
    anchors: [
      {
        input: "賛成、始めましょう",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "大賛成、すぐに始めよう",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "同意しました。実装を進めます",
        vocab: "on board with (賛成/支持) · dive in (すぐに着手する)",
      },
      {
        input: "続けてください",
        spoken: "Let's keep going.",
        spoken_meaning: "そのまま進めよう",
        written: "Proceed with the next steps.",
        written_meaning: "次の工程に進みます",
        vocab: "keep going (継続する) · proceed with (着手・進行する)",
      },
      {
        input: "この設計は少し過剰です。標準ライブラリを使ったほうがいいでしょう",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "少し過剰設計な気がします。標準ライブラリで十分です",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "提案された構成は不要な複雑さをもたらします。標準ライブラリの利用を推奨します",
        vocab: "over-engineered (過剰設計) · be better off (〜したほうがよい) · stick with (〜を使い続ける) · leverage (活用する)",
      },
    ],
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: "in English in parentheses separated by \" · \" (e.g. \"term1 (English definition) · term2 (...) · ...\")",
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "Looks great, let's deploy right away.",
        spoken_meaning: "Clear approval to proceed with deployment immediately.",
        written: "Confirmed. Proceed with deployment to production.",
        written_meaning: "Formal acknowledgment authorizing release to production.",
        vocab: "ship (deploy/release to production) · proceed with (move forward with)",
      },
      {
        input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Suggestion to keep architecture simple and avoid unnecessary dependencies.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Formal architectural recommendation favoring standard library.",
        vocab: "over-engineered (excessively complex) · be better off (preferable) · stick with (adhere to)",
      },
    ],
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    meaningInstruction: "in native Spanish",
    vocabInstruction: "in Spanish in parentheses separated by \" · \"",
    anchors: [
      {
        input: "Este enfoque está un poco sobreingeniado, es mejor que usemos la biblioteca estándar.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Se siente un poco sobreingeniado, nos conviene más usar la biblioteca estándar.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "El enfoque propuesto introduce una complejidad innecesaria. Se recomienda priorizar la biblioteca estándar.",
        vocab: "over-engineered (sobreingeniado/excesivo) · be better off (conviene más) · stick with (mantenerse en)",
      },
      {
        input: "De acuerdo, empecemos",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Totalmente de acuerdo, vamos al grano",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmado. Procedamos con la implementación",
        vocab: "on board with (estar de acuerdo) · dive in (empezar de lleno)",
      },
    ],
  },
  fr: {
    name: "French",
    nativeName: "Français",
    meaningInstruction: "in native French",
    vocabInstruction: "in French in parentheses separated by \" · \"",
    anchors: [
      {
        input: "Cette approche est surconçue, on ferait mieux d'utiliser la bibliothèque standard.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Ça semble un peu trop complexe, on a meilleur compte à garder la lib standard.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "L'approche proposée introduit une complexité superflue. Il est recommandé de privilégier la bibliothèque standard.",
        vocab: "over-engineered (surconçu/trop complexe) · stick with (s'en tenir à) · leverage (tirer parti de)",
      },
      {
        input: "D'accord, c'est parti.",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Tout à fait d'accord, allons-y directement.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmé. Procédons à l'implémentation.",
        vocab: "on board with (être d'accord) · dive in (commencer directement)",
      },
    ],
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: "in German in parentheses separated by \" · \"",
    anchors: [
      {
        input: "Der Ansatz ist überkompliziert, wir sollten lieber die Standardbibliothek nutzen.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Fühlt sich überdimensioniert an, mit der Standardbibliothek fahren wir besser.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Der Vorschlag erhöht die Komplexität unnötig. Native Implementierungen der Standardbibliothek werden bevorzugt.",
        vocab: "over-engineered (überdimensioniert/überkompliziert) · stick with (beibehalten/nutzen) · leverage (nutzen/einsetzen)",
      },
      {
        input: "Einverstanden, fangen wir an.",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Voll dabei, legen wir direkt los.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Bestätigt. Beginn der Implementierung.",
        vocab: "on board with (einverstanden sein) · dive in (direkt einsteigen/loslegen)",
      },
    ],
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    meaningInstruction: "in native Korean",
    vocabInstruction: "in Korean in parentheses separated by \" · \"",
    anchors: [
      {
        input: "이 방식은 좀 오버엔지니어링 같아요. 그냥 표준 라이브러리를 쓰는 게 낫겠습니다.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "조금 과한 설계인 것 같아요. 표준 라이브러리로 가는 게 훨씬 낫습니다.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "제안된 방식은 불필요한 복잡성을 초래하므로, 표준 라이브러리 사용을 권장합니다.",
        vocab: "over-engineered (과도한 설계) · be better off (~하는 편이 훨씬 낫다) · stick with (계속 사용하다) · leverage (활용하다)",
      },
      {
        input: "동의합니다, 시작하죠.",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "전적으로 동의합니다, 바로 시작하죠.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "확인했습니다. 구현을 진행하겠습니다.",
        vocab: "on board with (동의/찬성하다) · dive in (곧바로 착수하다)",
      },
    ],
  },
  ru: {
    name: "Russian",
    nativeName: "Русский",
    meaningInstruction: "in native Russian",
    vocabInstruction: "in Russian in parentheses separated by \" · \"",
    anchors: [
      {
        input: "Кажется, это оверинжиниринг, лучше использовать стандартную библиотеку.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Похоже на оверинжиниринг, намного проще остаться на стандартной библиотеке.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Предложенное решение неоправданно усложняет архитектуру. Рекомендуется использовать стандартную библиотеку.",
        vocab: "over-engineered (оверинжиниринг/избыточная сложность) · stick with (придерживаться) · leverage (задействовать)",
      },
      {
        input: "Согласен, погнали.",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Полностью согласен, погнали реализовывать.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Подтверждено. Приступаем к реализации.",
        vocab: "on board with (быть согласным) · dive in (погружаться/начинать сразу)",
      },
    ],
  },
};

/**
 * Dynamic Symmetric Polyglot Anchor Matrix.
 * Maps (sourceLang -> targetLang) directly to pair-specific golden few-shot examples.
 */
export const LANGUAGE_PAIR_ANCHORS: Record<string, LanguageAnchor[]> = {
  // English target pairs
  "zh->en": LANGUAGE_SPECS.zh.anchors,
  "tw->en": LANGUAGE_SPECS.tw.anchors,
  "ja->en": LANGUAGE_SPECS.ja.anchors,
  "ko->en": LANGUAGE_SPECS.ko.anchors,
  "de->en": LANGUAGE_SPECS.de.anchors,
  "fr->en": LANGUAGE_SPECS.fr.anchors,
  "es->en": LANGUAGE_SPECS.es.anchors,
  "ru->en": LANGUAGE_SPECS.ru.anchors,

  // English source pairs (English -> Chinese, Japanese, etc.)
  "en->zh": [
    {
      input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
      spoken: "这个方案感觉有点过度设计了，咱们直接用标准库搞定得了。",
      spoken_meaning: "Conversational peer suggestion to avoid over-engineering.",
      written: "该方案引入了不必要的复杂性，建议优先采用原生标准库实现。",
      written_meaning: "Formal architectural recommendation favoring standard library.",
      vocab: "过度设计 (over-engineering) · 标准库 (standard library) · 原生实现 (native implementation)",
    },
    {
      input: "Totally on board with that, let's ship it.",
      spoken: "完全赞成，咱们赶紧发版吧。",
      spoken_meaning: "Clear approval to release immediately.",
      written: "确认赞同。按既定计划推进生产环境发布。",
      written_meaning: "Formal confirmation authorizing release to production.",
      vocab: "发版 (ship/release) · 生产环境 (production environment)",
    },
  ],
  "en->ja": [
    {
      input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
      spoken: "この設計はちょっと過剰な気がするので、標準ライブラリで済ませましょう。",
      spoken_meaning: "Casual team suggestion to stick with the standard library.",
      written: "提案されたアプローチは不要な複雑性を生むため、標準ライブラリによる実装を推奨します。",
      written_meaning: "Formal architectural recommendation favoring standard library.",
      vocab: "過剰設計 (over-engineering) · 標準ライブラリ (standard library) · 実装を推奨 (recommend implementation)",
    },
    {
      input: "Sounds good, let's ship it.",
      spoken: "大賛成です、早速リリースしましょう！",
      spoken_meaning: "Clear approval to release immediately.",
      written: "承認いたしました。本番環境へのデプロイを進行します。",
      written_meaning: "Formal authorization to deploy to production.",
      vocab: "本番環境 (production environment) · デプロイ (deploy) · リリース (release)",
    },
  ],

  // Cross-lingual Asian pairs (Chinese <-> Japanese)
  "zh->ja": [
    {
      input: "这个方案有点过度设计了，不如直接用标准库实现",
      spoken: "このやり方はちょっと過剰設計な気がするし、標準ライブラリで済ませたほうが良さそう。",
      spoken_meaning: "感觉有点过度设计了，直接用标准库更划算",
      written: "提案されたアプローチは不要な複雑性を生むため、標準ライブラリによる実装を推奨します。",
      written_meaning: "该方案会产生不必要的复杂度，建议使用标准库实现",
      vocab: "過剰設計 (过度设计) · 標準ライブラリ (标准库) · アプローチ (方案/方法) · 済ませる (对付/搞定)",
    },
    {
      input: "认同，开始吧",
      spoken: "大賛成、すぐに始めよう。",
      spoken_meaning: "完全赞成，咱们立刻开搞",
      written: "同意しました。実装を進めます。",
      written_meaning: "确认赞同，推进具体代码实现",
      vocab: "大賛成 (完全赞同) · すぐに始める (立刻着手) · 実装を進める (推进实现)",
    },
  ],
  "ja->zh": [
    {
      input: "この設計は少し過剰です。標準ライブラリを使ったほうがいいでしょう",
      spoken: "这个方案感觉有点过度设计了，咱们直接用标准库搞定得了。",
      spoken_meaning: "少し過剰設計な気がします。標準ライブラリで十分です",
      written: "该方案引入了不必要的复杂性，建议优先采用原生标准库实现。",
      written_meaning: "提案された構成は不要な複雑さをもたらします。標準ライブラリの利用を推奨します",
      vocab: "过度设计 (過剰設計) · 标准库 (標準ライブラリ) · 原生实现 (ネイティブ実装)",
    },
    {
      input: "賛成、始めましょう",
      spoken: "完全赞成，咱们直接开搞。",
      spoken_meaning: "大賛成、すぐに始めよう",
      written: "确认赞同。着手推进具体实施。",
      written_meaning: "同意しました。実装を進めます",
      vocab: "开搞 (始める/着手する) · 推进实施 (実装を進める)",
    },
  ],
};

/**
 * Resolves pair-specific golden few-shot anchors dynamically based on (sourceLang -> targetLang).
 */
export function resolveLanguagePairAnchors(
  sourceLang = "en",
  targetLang = "en"
): LanguageAnchor[] {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const pairKey = `${normSource}->${normTarget}`;

  // 1. Direct cross-lingual pair match (e.g. en->ja, en->zh, zh->ja, ja->zh)
  if (LANGUAGE_PAIR_ANCHORS[pairKey] && LANGUAGE_PAIR_ANCHORS[pairKey].length > 0) {
    return LANGUAGE_PAIR_ANCHORS[pairKey];
  }

  // 2. Target English (* -> en): return source language anchors
  if (normTarget === "en" && LANGUAGE_SPECS[normSource]?.anchors?.length > 0) {
    return LANGUAGE_SPECS[normSource].anchors;
  }

  // 3. Fallback for Traditional Chinese (tw)
  if (normSource === "tw") {
    const zhKey = `zh->${normTarget}`;
    if (LANGUAGE_PAIR_ANCHORS[zhKey]) return LANGUAGE_PAIR_ANCHORS[zhKey];
  }

  // 4. English source fallback: only when translating or rewriting into English
  if (normSource === "en" && normTarget === "en") {
    return LANGUAGE_SPECS.en?.anchors || [];
  }

  return [];
}

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

/**
 * Dynamic Semantic Variable Interpolation Engine.
 * Automatically expands ${sourceLang}, ${targetLang}, and ${explainLang} into canonical target language names and codes.
 */
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
  // Target language takes precedence if provided; otherwise if source is English default to Japanese, else English
  const outCode = t ? t : (s === "en" ? "ja" : "en");
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

/**
 * Universal Companion Prompt Builder (Mode 1 / pass-through).
 * Dynamically builds system prompt adhering strictly to Primary Language Sovereignty.
 */
export function buildSystemPrompt(
  sourceLang = "en",
  targetLang = "ja",
  isLongInput = false,
  context?: string,
  tone: "general" | "social" | "tech" = "general",
  customSlots?: SlotConfig[] | CustomSlotsConfig
): string {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "ja").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const targetName = resolveLanguageName(normTarget);

  const pairAnchors = resolveLanguagePairAnchors(normSource, normTarget);
  const anchorText = pairAnchors.length > 0
    ? pairAnchors
        .map(
          (a) => `Input: ${JSON.stringify(a.input)}\nOutput: ${JSON.stringify({
            spoken: a.spoken,
            spoken_meaning: a.spoken_meaning,
            written: a.written,
            written_meaning: a.written_meaning,
            vocab: a.vocab,
          })}`
        )
        .join("\n\n")
    : "";

  const anchorBlock = anchorText ? `\n\n[GOLDEN FEW-SHOT ANCHORS (Pair: ${normSource} ➔ ${normTarget})]:\n${anchorText}` : "";

  const condensationDirective = isLongInput
    ? `\n\n[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish — NEVER omit any details!
Express all points concisely so the complete meaning fits cleanly within the HUD without truncation.`
    : "";

  const contextDirective = context && context.trim()
    ? `\n\n[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""`
    : "";

  let toneDirective = "";
  if (tone === "social") {
    toneDirective = `\n\n[TONE FOCUS - SOCIAL & COMMUNITY]:
Prioritize X (Twitter), Reddit, and developer community engagement dynamics:
- "spoken": Craft a high-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter. Avoid robotic AI cliché words (e.g., NEVER use "delve", "testament", "tapestry", "revolutionize").
- "written": High-signal, structured technical insight. Concise, clear, and actionable.`;
  } else if (tone === "tech") {
    toneDirective = `\n\n[TONE FOCUS - TECHNICAL RIGOR]:
Prioritize RFC, Pull Request, and architectural documentation precision:
- "spoken": Direct, respectful engineering alignment (Slack huddles, technical triage).
- "written": High-precision Plain ${targetName} matching modern IETF RFC and open-source release notes.`;
  }

  const isArraySlots = Array.isArray(customSlots);
  const nonSourceSlots = isArraySlots ? (customSlots as SlotConfig[]).filter((s) => s.enabled && s.role !== "source") : [];
  const hasSpoken = isArraySlots && nonSourceSlots.some((s) => s.id === "spoken");
  const hasWritten = isArraySlots && nonSourceSlots.some((s) => s.id === "written");
  const isStandardDuality = !isArraySlots || (hasSpoken && hasWritten && nonSourceSlots.length <= 4);

  if (isStandardDuality) {
    const defaultSlots = LEGACY_SLOT_PRESETS.developer;
    const legacyConfig = !isArraySlots ? (customSlots as CustomSlotsConfig | undefined) : undefined;
    const spokenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "spoken") : undefined;
    const writtenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "written") : undefined;

    const defaultLocSlots = getDefaultSlots(normSource);
    const defaultSpokenInst = defaultLocSlots.find((s) => s.id === "spoken")?.instruction;
    const defaultWrittenInst = defaultLocSlots.find((s) => s.id === "written")?.instruction;

    const isCustomSpoken = spokenSlot?.instruction && spokenSlot.instruction !== defaultSpokenInst;
    const isCustomWritten = writtenSlot?.instruction && writtenSlot.instruction !== defaultWrittenInst;

    const slot1Name = isCustomSpoken
      ? spokenSlot!.label
      : legacyConfig?.slot1?.name || defaultSlots.slot1.name;
    const rawSlot1Instruction = isCustomSpoken
      ? spokenSlot!.instruction!
      : legacyConfig?.slot1?.instruction || defaultSlots.slot1.instruction;
    const slot1Instruction = interpolatePromptVariables(rawSlot1Instruction, { sourceLang, targetLang, explainLang: sourceLang });

    const slot2Name = isCustomWritten
      ? writtenSlot!.label
      : legacyConfig?.slot2?.name || defaultSlots.slot2.name;
    const rawSlot2Instruction = isCustomWritten
      ? writtenSlot!.instruction!
      : legacyConfig?.slot2?.instruction || defaultSlots.slot2.instruction;
    const slot2Instruction = interpolatePromptVariables(rawSlot2Instruction, { sourceLang, targetLang, explainLang: sourceLang });

    const jsonFormatHint = isLongInput
      ? `Strict JSON format:
{
  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)",
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}`
      : `Strict JSON format:
{
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}`;

    return `You are an elite bilingual developer language coach and senior software architect.
Task:
Translate the user's message from native ${spec.name} (language A) into TWO distinct authentic ${targetName} registers (Slot 1 and Slot 2), and provide the exact back-translation/nuance ${spec.meaningInstruction} for each register:
1. "spoken" (Slot 1: ${slot1Name}): ${slot1Instruction}
2. "spoken_meaning": The exact nuance and meaning of Slot 1 ${spec.meaningInstruction}.
3. "written" (Slot 2: ${slot2Name}): ${slot2Instruction}
4. "written_meaning": The exact nuance and meaning of Slot 2 ${spec.meaningInstruction}.
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Keep definitions concise ${spec.vocabInstruction}.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens. CRITICAL: NEVER expand, hallucinate, or fabricate file paths, UUIDs, or timestamps not explicitly in the user's input.
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }

  // Dynamic Arbitrary Multi-Slot Assembly
  const enabledSlots = (customSlots as SlotConfig[]).filter((s) => s.enabled && s.role !== "source");
  const taskLines: string[] = [];
  const jsonProps: string[] = [];

  if (isLongInput) {
    jsonProps.push(`  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)"`);
  }

  enabledSlots.forEach((slot, idx) => {
    const num = idx + 1;
    const rawInstruction = slot.instruction || `Express the message in ${slot.label} style in authentic ${targetName}.`;
    const instruction = interpolatePromptVariables(rawInstruction, { sourceLang, targetLang, explainLang: sourceLang });
    taskLines.push(`${num}. "${slot.id}" (${slot.label}): ${instruction}`);
    jsonProps.push(`  "${slot.id}": "..."`);

    if (slot.showMeaning && slot.role !== "vocab") {
      taskLines.push(`${num}_meaning. "${slot.id}_meaning": The exact nuance and meaning of "${slot.id}" ${spec.meaningInstruction}.`);
      jsonProps.push(`  "${slot.id}_meaning": "..."`);
    }
  });

  const dynamicTasks = taskLines.join("\n");
  const dynamicJsonHint = `Strict JSON format:\n{\n${jsonProps.join(",\n")}\n}`;

  return `You are an elite multilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
}

/**
 * Universal Direct Rewrite Prompt Builder (Mode 2 / transform).
 */
export function buildDirectRewriteSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  learnInRewrite?: boolean;
  context?: string;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const defaultTarget = normSource === "en" ? "ja" : "en";
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || defaultTarget,
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0
    ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Weave and enforce the following user-specified condition(s) directly into the rewritten prompt:
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
    : "";

  const contextBlock = options.context && options.context.trim()
    ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use this context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and anchor domain terminology. NEVER invent unmentioned requirements or copy unrelated code from the context.`
    : "";

  const learnBlock = options.learnInRewrite
    ? `\n5. **Companion Takeaway ("vocab")**: Also extract 2–3 high-value authentic English technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    : "";

  const jsonSchema = options.learnInRewrite
    ? `{\n  "prompt": "...",\n  "vocab": "term1 (...) · term2 (...)"\n}`
    : `{\n  "prompt": "..."\n}`;

  let anchorBlock = "";
  if (outLangName === "English") {
    anchorBlock = `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "刚才登录接口报500了，排查一下src/auth.ts里的token过期逻辑，别动数据库配置，改动尽量小"
  Output in ${outLangName}: "Diagnose and fix the 500 error on the login endpoint by inspecting the token expiration logic in \`src/auth.ts\`. Keep the diff minimal, leave unrelated code untouched, and do not modify any database configurations."
- Input: "把这个函数改成异步的，顺便跑一下测试确保别挂了"
  Output in ${outLangName}: "Refactor the function to be asynchronous while preserving its existing contract and behavior. Run the existing test suite to verify zero regressions."
- Input: "The login session drops on page refresh, check if cookie expiration in src/auth.ts is wrong, keep diff minimal"
  Output in ${outLangName}: "Inspect \`src/auth.ts\` to diagnose and fix session loss on page refresh, specifically checking cookie expiration settings while keeping the diff minimal and leaving unrelated code untouched."`;
  } else if (outLangName === "Japanese") {
    anchorBlock = `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "刚才登录接口报500了，排查一下src/auth.ts里的token过期逻辑，别动数据库配置，改动尽量小"
  Output in ${outLangName}: "ログインエンドポイントの500エラーを解消するため、\`src/auth.ts\`のトークン失効ロジックを調査・修正してください。差分は最小限にとどめ、関連のないコードやデータベース設定には一切触れないでください。"
- Input: "把这个函数改成异步的，顺便跑一下测试确保别挂了"
  Output in ${outLangName}: "既存の仕様および動作を維持したまま、この関数を非同期（async）にリファクタリングしてください。完了後は既存のテストを実行し、リグレッションがないことを確認してください。"`;
  }

  // Note: Model-facing few-shot mapping anchor for the LLM prompt compiler (not user-facing UI chrome).
  // When target language is English, English imperative verbs are deliberate targets regardless of input language.
  const isZhSource = normSource === "zh" || normSource === "tw";
  const verbExamples = isZhSource
    ? `"look into / check / 看看 / 排查" ➔ "Inspect" / "Diagnose" / "Trace"; "clean up / tweak / 改改 / 重构" ➔ "Refactor" / "Streamline" / "Harden"; "add / create / 加上 / 做个" ➔ "Implement" / "Scaffold" / "Wire up"; "remove / drop / 删掉" ➔ "Prune" / "Deprecate" / "Strip"; "fix / 搞好" ➔ "Fix" / "Resolve"`
    : `"look into / check" ➔ "Inspect" / "Diagnose" / "Trace"; "clean up / tweak" ➔ "Refactor" / "Streamline" / "Harden"; "add / create" ➔ "Implement" / "Scaffold" / "Wire up"; "remove / drop" ➔ "Prune" / "Deprecate" / "Strip"; "fix" ➔ "Fix" / "Resolve"`;

  return `You are an elite AI Coding Intent Compiler & Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Compile, structure, and optimize their input into a high-signal, unambiguous engineering prompt in **${outLangName}** that maximizes the AI agent's probability of one-shot success:
1. **Direct Imperative Opening & Objective Isolation**: Start immediately with an active imperative engineering verb. Accurately map vague conversational intents to sharp, specific engineering actions (e.g., ${verbExamples}). Clearly isolate the core technical objective and eliminate chatty conversational filler (e.g. NEVER use "Please help me", "As an AI, could you...", "I want to...").
2. **Defensive Blast Radius Guard & Negative Constraints**: When the user expresses or implies caution (e.g. "don't touch X", "keep diff minimal", "avoid regressions", "don't add heavy dependencies"), formalize them into explicit negative constraints (e.g., "Keep diff minimal; leave unrelated files and configurations untouched; do not add unrequested external dependencies").
3. **Pronoun & Anaphora Resolution**: If the user uses anaphoric pronouns ("here", "this function", "as discussed", "刚才说的"), resolve them cleanly using the provided context without hallucinating unmentioned file paths or inventing speculative requirements.
4. **Falsifiable Verification Anchor**: Where appropriate, frame the instruction with verifiable completion expectations (e.g. "Run existing tests to confirm zero regressions").
5. **100% Intent Fidelity (Zero Hallucination)**: Clarify logic and sharpen terminology in **${outLangName}**, but NEVER invent unmentioned file names, libraries, or speculative scaffolding.
6. **Code-Switch & CLI Flag Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators (e.g. \`@scope/pkg\`, \`@ts-expect-error\`), inline code (\`foo()\`), file paths (@file, path/to/file), and identifiers 100% verbatim. NEVER translate or alter CLI flags.${contextBlock}${learnBlock}${customRuleBlock}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}
${anchorBlock ? `\n${anchorBlock}\n` : ""}
Strict JSON format:
${jsonSchema}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

/**
 * Universal Multi-Candidate Prompt Builder (Mode 3 / select & custom transform).
 * 100% Slot-Driven.
 */
export function buildPromptCandidatesSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  promptSlots?: PromptSlotConfig[];
  learnInRewrite?: boolean;
  context?: string;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const defaultTarget = normSource === "en" ? "ja" : "en";
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || defaultTarget,
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const slots = (Array.isArray(options.promptSlots) && options.promptSlots.length > 0
    ? options.promptSlots
    : getDefaultPromptSlots(normSource)
  ).filter((s) => s.enabled !== false && s.role !== "source");

  const taskLines = slots.map((s, idx) => {
    const rawInstruction = s.instruction || (s.role === "vocab"
      ? "Extract 2-3 high-value authentic technical expressions or collocations relevant to the input."
      : `Express the message in ${s.label} style in authentic ${outLangName}.`);
    const instruction = interpolatePromptVariables(rawInstruction, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || defaultTarget,
      explainLang: options.sourceLang || "en",
    });

    if (s.role === "vocab") {
      return `${idx + 1}. "${s.id}" (${s.label}): ${instruction} ${spec.vocabInstruction}`;
    }
    const hasCustomLangDirective = /target language|output in|日本語|中文|english|spanish|french|german|korean|russian|portuguese/i.test(instruction);
    const langSuffix = hasCustomLangDirective ? "" : ` (Default language: **${outLangName}** unless instruction specifies otherwise)`;
    return `${idx + 1}. "${s.id}" (${s.label}): ${instruction}${langSuffix}`;
  });

  const jsonProps: string[] = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });

  if (options.learnInRewrite && !slots.some((s) => s.role === "vocab")) {
    taskLines.push(
      `${slots.length + 1}. "vocab": Extract 2–3 high-value authentic technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    );
    jsonProps.push(`  "vocab": "term1 (...) · term2 (...)"`);
  }

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0
    ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified condition(s):
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
    : "";

  const contextBlock = options.context && options.context.trim()
    ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use this context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and domain terminology. NEVER invent unmentioned requirements or copy unrelated code from the context.`
    : "";

  return `You are an elite Bilingual Translation & Prompt Architect.
Transform the user's raw input into ${slots.length} distinct output slots strictly following each slot's specific instruction and target language:
${taskLines.join("\n")}

[STRICT QUALITY GUARDRAILS]:
- **100% Semantic Fidelity**: Translate or refine EVERY sentence, clause, and detail from the user's input from start to finish. NEVER summarize, truncate, or drop details unless a slot explicitly asks for condensation.
- **Respect Slot Role & Register**: If a slot asks for spoken/colloquial translation, output natural spoken flow; if it asks for formal/written translation, output polished written prose; if it asks for prompt structuring, compile clear objectives, isolate negative constraints (minimal diff, blast radius guard), and eliminate robotic AI filler.
- **Zero Hallucination**: Never invent unmentioned files, bug reports, or speculative features.
- **Code & Symbol Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators, inline code, file paths, and technical identifiers 100% verbatim in every slot.${contextBlock}${customRuleBlock}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

/**
 * Universal Proofreading & Surgical Repair Prompt Builder (flow: "proofread").
 * 100% Slot-Driven.
 */
export function buildModifySystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  explainLang?: string;
  customSlots?: PromptSlotConfig[];
  promptSlots?: PromptSlotConfig[];
  context?: string;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (options.explainLang || normSource).toLowerCase().split("-")[0];
  const { code: outLangCode, name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "en",
    options.promptLang
  );
  const explainName = resolveLanguageName(expNorm);

  const explainLangDesc =
    `Explain each takeaway following the 3-Second Glanceability Rule strictly in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${explainName})'.`;

  let linguisticProfile = "";
  if (outLangCode === "zh" || outLangCode === "tw") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: CHINESE]:
- Eliminate awkward English-style stacked relative clauses.
- Trim redundant pronouns and restore natural Chinese subject-omission flow.
- Fix measure words and verb-object collocations.
- Distinguish pragmatic distance: use respectful honorifics vs natural peer flow.`;
  } else if (outLangCode === "ja") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: JAPANESE]:
- Fix particles (助詞: は, が, を, に, で) and natural verb-predicate dependencies.
- Maintain pragmatic consistency between casual team conversation and polite business context.`;
  } else if (outLangCode === "en") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: ENGLISH]:
- Fix prepositions (websites/platforms take 'on': 'on X', 'on GitHub', 'on Slack'), articles ('a' vs 'an'), and verb tenses.
- Zero casing/punctuation nitpicking: do NOT obsess over casual lowercase letters ('l' vs 'L') or missing trailing periods.`;
  }

  const rawSlots = options.promptSlots || options.customSlots;
  const slots = (Array.isArray(rawSlots) && rawSlots.length > 0
    ? rawSlots
    : getDefaultModifySlots(options.sourceLang, options.explainLang)
  ).filter((s) => s.enabled !== false && s.role !== "source");

  const taskLines = slots.map((s, idx) => {
    const num = idx + 1;
    const rawInst = s.role === "vocab" || s.id === "fixes" ? (s.instruction || explainLangDesc) : (s.instruction || "");
    const instruction = interpolatePromptVariables(rawInst, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || "en",
      explainLang: options.explainLang || expNorm,
    });
    return `${num}. "${s.id}" (${s.label}): ${instruction}`;
  });

  const jsonProps: string[] = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });

  const anchorBlock = outLangCode === "en"
    ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "this fucking bug happan again in X, it just suck so hard"
  Output: {
    "fixed": "this fucking bug happen again on X, it just sucks so hard",
    "native": "this fucking bug happened again on X, it honestly sucks so bad",
    "fixes": "happan ➔ happen · in X ➔ on X (platforms take on) · suck ➔ sucks"
  }`
    : "";

  const contextBlock = options.context && options.context.trim()
    ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and domain terminology. NEVER invent unmentioned requirements or copy unrelated code.`
    : "";

  return `You are an elite Developer Language Editor and Real-Time Proofreader.
The user is writing directly in ${outLangName}, but their draft may contain fast typing slips, grammatical errors, wrong prepositions, or non-native phrasing.
Perform proofreading according to the following tasks:
${taskLines.join("\n")}

[CRITICAL PROOFREADING RULES]:
- **Zero Level Leap (i+1 Rule)**: Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose.
- **Zero Tone Sanitization**: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')—passion and emotional heat are natural and MUST be preserved 100%!
- **Zero Punctuation/Casing Nitpicking**: Do NOT obsess over casual casing or missing periods.
- 100% preserve user's original words, rhythm, and cadence!${linguisticProfile}${contextBlock}
${anchorBlock ? `\n${anchorBlock}\n` : ""}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}
Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
