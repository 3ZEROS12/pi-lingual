import type { SlotDefinition, CustomSlotsConfig, SlotConfig, SlotRole } from "./types.js";

export function getDefaultSlots(sourceLang = "en"): SlotConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const labels: Record<string, { source: string; spoken: string; written: string; vocab: string }> = {
    en: { source: "Original", spoken: "Spoken", written: "Written", vocab: "Vocab" },
    zh: { source: "原文", spoken: "口语", written: "写作", vocab: "重点" },
    tw: { source: "原文", spoken: "口語", written: "書面", vocab: "重點" },
    ja: { source: "原文", spoken: "口語", written: "文面", vocab: "単語" },
    ko: { source: "원문", spoken: "구어", written: "문어", vocab: "핵심" },
    ru: { source: "Оригинал", spoken: "Разговорный", written: "Письменный", vocab: "Лексика" },
    pt: { source: "Original", spoken: "Falado", written: "Escrito", vocab: "Vocab" },
    es: { source: "Original", spoken: "Hablado", written: "Escrito", vocab: "Vocab" },
    vi: { source: "Nguyên bản", spoken: "Khẩu ngữ", written: "Văn bản", vocab: "Từ vựng" },
    tr: { source: "Orijinal", spoken: "Konuşma", written: "Yazılı", vocab: "Kelime" },
    ar: { source: "الأصل", spoken: "محادثة", written: "كتابة", vocab: "مفردات" },
    my: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    ms: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    fr: { source: "Original", spoken: "Parlé", written: "Écrit", vocab: "Vocab" },
    de: { source: "Original", spoken: "Gesprochen", written: "Schriftlich", vocab: "Wortschatz" },
  };
  const l = labels[norm] || labels.en;

  const instructions: Record<string, { spoken: string; written: string; vocab: string }> = {
    zh: {
      spoken: "自然地道的美式口语流（每日站会、Slack沟通、结对编程、敏捷协作）。地道硅谷口吻、自然缩读、动词短语与俚语习惯。",
      written: "严谨现代的架构规范书面语（PR描述、RFC文档、问题单、架构说明）。清晰专业的高级技术散文，杜绝陈旧维多利亚式套话与AI水词。",
      vocab: "自适应萃取关键地道搭配、动词词组、技术成语或高阶表达，助力掌握地道母语级语感。",
    },
    tw: {
      spoken: "自然道地的美式口語流（每日站會、Slack溝通、結對編程、敏捷協作）。道地矽谷語感、自然縮讀、動詞片語與慣用語。",
      written: "嚴謹現代的架構規範書面語（PR描述、RFC文檔、問題單、架構說明）。清晰專業的高級技術散文，杜絕陳舊套話與AI浮誇詞彙。",
      vocab: "自適應萃取關鍵道地搭配、動詞片語、技術成語或高階表達，助力掌握道地母語級語感。",
    },
    ja: {
      spoken: "親しい同僚やチームとの自然な口語表現（朝会、Slackハドル、ペアプログラミング、カジュアルチャット）。自然な短縮形やイディオム。",
      written: "明確で洗練された現代的技術文書表現（PR概要、RFC、Issue、技術設計書）。能動的で簡潔・論理的なプロフェッショナル文章。",
      vocab: "重要な連語、句動詞、技術表現を自律的に抽出し、母語話者レベルの語彙運用を支援。",
    },
    ko: {
      spoken: "일상적인 팀 협업 및 구어체 표현 (데일리 스탠드업, Slack, 페어 프로그래밍). 자연스러운 축약형과 구동사.",
      written: "명확하고 정교한 현대 기술 문서 표현 (PR 설명, RFC, 이슈, 아키텍처 문서). 간결하고 전문적인 문장.",
      vocab: "핵심 연어, 구동사 및 고급 기술 관용구를 추출하여 원어민 수준의 어감 습득 지원.",
    },
    ru: {
      spoken: "Естественная разговорная речь для командной работы (стендапы, Slack, код-ревью). Живые идиомы и сокращения.",
      written: "Четкий современный технический письменный стиль (описания PR, RFC, документация). Профессионально и лаконично.",
      vocab: "Ключевые словосочетания, фразовые глаголы и технические идиомы с переводом.",
    },
    en: {
      spoken: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms.",
      written: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff and AI-slop buzzwords.",
      vocab: "Adaptively extract key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency.",
    },
  };
  const inst = instructions[norm] || instructions.en;

  return [
    {
      id: "source",
      label: l.source,
      role: "source",
      enabled: true,
    },
    {
      id: "spoken",
      label: l.spoken,
      role: "translation",
      instruction: inst.spoken,
      showMeaning: true,
      enabled: true,
    },
    {
      id: "written",
      label: l.written,
      role: "translation",
      instruction: inst.written,
      showMeaning: true,
      enabled: true,
    },
    {
      id: "vocab",
      label: l.vocab,
      role: "vocab",
      instruction: inst.vocab,
      enabled: true,
    },
  ];
}

export const LEGACY_SLOT_PRESETS: Record<string, { slot1: SlotDefinition; slot2: SlotDefinition }> = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration, code reviews). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms.",
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff (e.g. 'we may now proceed') and AI-slop buzzwords (e.g. 'delve', 'testament').",
    },
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit. Sharp, memorable, and human.",
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads, Substack, and long-form posts. Concise, authoritative, and direct without corporate marketing fluff.",
    },
  },
  japanese: {
    slot1: {
      label: "口語",
      name: "日常タメ口 (Casual Spoken)",
      instruction: "親しい同僚や友人との日常会話・Slackハドル・カジュアルなやり取りに最適な自然な口語表現。タメ口・親しみやすいトーン。",
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
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE, ACM, and Nature journal standards. Precise vocabulary, rigorous methodology descriptions.",
    },
  },
};

interface LanguageSpec {
  name: string;
  nativeName: string;
  meaningInstruction: string;
  vocabInstruction: string;
  anchors: Array<{
    input: string;
    spoken: string;
    spoken_meaning: string;
    written: string;
    written_meaning: string;
    vocab: string;
  }>;
}

const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
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
      {
        input: "肥大化したフレームワークを捨てて依存ゼロの単一ファイルに移行したら、コールドスタートが10倍速くなりました",
        spoken: "Ditched the bloated framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken_meaning: "重いフレームワークをやめて依存ゼロの単一ファイルにしたら、起動が10倍速くなりました！",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "一枚岩のフレームワークから依存関係ゼロのアーキテクチャへ移行し、コールドスタート遅延を10倍改善しました。",
        vocab: "ditch ... for ... (〜を手放して〜に乗り換える) · zero-dep (外部依存ゼロ) · cold start (コールドスタート) · yield (もたらす)",
      },
    ],
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: "in English in parentheses separated by \" · \" (e.g. \"term1 (English definition) · term2 (definition) · ...\")",
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "いい感じですね、リリースしましょう！",
        spoken_meaning: "Looks great, let's deploy right away.",
        written: "確認しました。本番環境へデプロイを進めます。",
        written_meaning: "Reviewed and confirmed. Proceeding with deployment to production.",
        vocab: "リリースする (ship / deploy) · 本番環境 (production environment)",
      },
      {
        input: "Keep going.",
        spoken: "続けていきましょう。",
        spoken_meaning: "Let's keep making progress.",
        written: "後続の処理を進めてください。",
        written_meaning: "Please proceed with the subsequent steps.",
        vocab: "後続の処理 (subsequent processing) · 進める (proceed)",
      },
      {
        input: "This feels over-engineered; let's stick to the built-in standard library.",
        spoken: "これちょっと作り込みすぎかも。素直に標準ライブラリで行きましょう。",
        spoken_meaning: "Might be a bit over-complicated; let's simply use the standard library.",
        written: "設計が過剰に複雑化しています。標準ライブラリの活用を推奨します。",
        written_meaning: "Architecture is unnecessarily complex. Recommending the standard library.",
        vocab: "作り込みすぎ (over-engineered) · 標準ライブラリ (standard library) · 推奨する (recommend)",
      },
      {
        input: "Ditched the bloated framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken: "重いフレームワークをやめて依存ゼロの単一ファイルにしたら、起動が10倍速くなりました！",
        spoken_meaning: "Discarded the heavy framework and switched to a zero-dep single file; boot speed jumped 10x!",
        written: "肥大化したフレームワークを廃止して依存性ゼロの単一ファイル構造を採用し、コールドスタート速度を10倍向上させました。",
        written_meaning: "Eliminated the bloated framework in favor of a zero-dependency architecture, achieving a 10x speedup in cold-start times.",
        vocab: "依存ゼロ (zero-dependency) · コールドスタート (cold start) · 向上させる (improve / speed up)",
      },
    ],
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    meaningInstruction: "in native Spanish",
    vocabInstruction: "in Spanish in parentheses separated by \" · \" (e.g. \"term1 (significado en español) · term2 (...) · ...\")",
    anchors: [
      {
        input: "De acuerdo, empecemos",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Totalmente de acuerdo, vamos al grano",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmado. Procedamos con la implementación",
        vocab: "on board with (estar de acuerdo) · dive in (empezar de lleno)",
      },
      {
        input: "Continuar",
        spoken: "Let's keep going.",
        spoken_meaning: "Sigamos adelante",
        written: "Proceed with the next steps.",
        written_meaning: "Continuar con los siguientes pasos",
        vocab: "keep going (seguir adelante) · proceed with (proceder con)",
      },
      {
        input: "Esta propuesta está sobrecargada, mejor usar la biblioteca estándar",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Parece demasiado complicado; nos iría mucho mejor con la librería estándar",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "La solución propuesta introduce complejidad innecesaria. Se prefiere la biblioteca estándar nativa",
        vocab: "over-engineered (sobreingeniería) · be better off (estar mejor con) · stick with (quedarse con) · leverage (aprovechar)",
      },
    ],
  },
  fr: {
    name: "French",
    nativeName: "Français",
    meaningInstruction: "in native French",
    vocabInstruction: "in French in parentheses separated by \" · \" (e.g. \"term1 (définition en français) · term2 (...) · ...\")",
    anchors: [
      {
        input: "D'accord, commençons",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Tout à fait d'accord, allons-y",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "D'accord. Procédons à l'implémentation",
        vocab: "on board with (être d'accord) · dive in (s'y mettre directement)",
      },
      {
        input: "Continuer",
        spoken: "Let's keep going.",
        spoken_meaning: "Continuons",
        written: "Proceed with the next steps.",
        written_meaning: "Passer aux étapes suivantes",
        vocab: "keep going (continuer) · proceed with (procéder à)",
      },
      {
        input: "Cette approche est trop complexe, autant utiliser la bibliothèque standard",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Ça semble surdimensionné ; on ferait bien mieux de rester sur la bibliothèque standard",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "L'approche proposée introduit une complexité superflue. L'utilisation de la bibliothèque standard est recommandée",
        vocab: "over-engineered (surdimensionné) · be better off (avoir tout intérêt à) · stick with (s'en tenir à) · leverage (exploiter)",
      },
    ],
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: "in German in parentheses separated by \" · \" (e.g. \"term1 (deutsche Definition) · term2 (...) · ...\")",
    anchors: [
      {
        input: "Einverstanden, fangen wir an",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Voll einverstanden, packen wir es an",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Bestätigt. Wir fahren mit der Implementierung fort",
        vocab: "on board with (einverstanden sein) · dive in (direkt loslegen)",
      },
      {
        input: "Weiter",
        spoken: "Let's keep going.",
        spoken_meaning: "Machen wir weiter",
        written: "Proceed with the next steps.",
        written_meaning: "Mit den nächsten Schritten fortfahren",
        vocab: "keep going (weitermachen) · proceed with (fortfahren mit)",
      },
      {
        input: "Dieser Ansatz ist überdimensioniert, nutzen wir lieber die Standardbibliothek",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Das wirkt etwas überdimensioniert; mit der Standardbibliothek fahren wir deutlich besser",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Der vorgeschlagene Ansatz bringt unnötige Komplexität mit sich. Die native Standardbibliothek wird empfohlen",
        vocab: "over-engineered (überdimensioniert) · be better off (besser dran sein mit) · stick with (bleiben bei) · leverage (nutzen/einsetzen)",
      },
    ],
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    meaningInstruction: "in native Korean",
    vocabInstruction: "in Korean in parentheses separated by \" · \" (e.g. \"term1 (한국어 뜻) · term2 (...) · ...\")",
    anchors: [
      {
        input: "좋아요, 시작합시다",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "완전 찬성이에요, 바로 시작해 보죠",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "확인했습니다. 구현을 진행하겠습니다",
        vocab: "on board with (찬성하다/동의하다) · dive in (바로 착수하다)",
      },
      {
        input: "계속 진행해줘",
        spoken: "Let's keep going.",
        spoken_meaning: "계속 진행하죠",
        written: "Proceed with the next steps.",
        written_meaning: "다음 단계를 진행해 주십시오",
        vocab: "keep going (계속 가다) · proceed with (~을 진행하다)",
      },
      {
        input: "이 방식은 너무 복잡한 것 같아요, 표준 라이브러리를 쓰는 게 낫겠어요",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "조금 과하게 설계된 느낌이에요. 그냥 표준 라이브러리를 쓰는 게 훨씬 낫겠어요",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "제안된 방식은 불필요한 복잡성을 초래하므로 표준 라이브러리 활용을 권장합니다",
        vocab: "over-engineered (과도하게 설계된) · be better off (~하는 편이 더 낫다) · stick with (~을 고수하다) · leverage (활용하다)",
      },
    ],
  },
  ru: {
    name: "Russian",
    nativeName: "Русский",
    meaningInstruction: "in native Russian",
    vocabInstruction: "in Russian in parentheses separated by \" · \" (e.g. \"term1 (русское значение) · term2 (...) · ...\")",
    anchors: [
      {
        input: "Согласен, давай начинать",
        spoken: "Totally on board with that — let's dive right in.",
        spoken_meaning: "Полностью поддерживаю — давай сразу приступим",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Принято. Переходим к реализации",
        vocab: "on board with (быть согласным) · dive in (сразу приступить к делу)",
      },
      {
        input: "Продолжай",
        spoken: "Let's keep going.",
        spoken_meaning: "Давай продолжать",
        written: "Proceed with the next steps.",
        written_meaning: "Переходите к следующим шагам",
        vocab: "keep going (продолжать) · proceed with (приступить к)",
      },
      {
        input: "Это решение кажется слишком сложным, лучше использовать стандартную библиотеку",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Выглядит переусложненным; нам гораздо проще держаться стандартной библиотеки",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Предложенный подход вносит излишнюю сложность. Предпочтительно использовать стандартную библиотеку",
        vocab: "over-engineered (переусложненный) · be better off (быть в выигрыше) · stick with (придерживаться) · leverage (использовать)",
      },
    ],
  },
};

/**
 * 动态根据母语 A (sourceLang) 与目标学习语言 B (targetLang) 生成严格遵循【母语最高统治权】的系统提示词
 * 支持长输入总结 (isLongInput)、上下文注入 (context) 和风格侧重 (tone: "general" | "social" | "tech")。
 */
export function buildSystemPrompt(
  sourceLang = "zh",
  targetLang = "en",
  isLongInput = false,
  context?: string,
  tone: "general" | "social" | "tech" = "general",
  customSlots?: SlotConfig[] | CustomSlotsConfig
): string {
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.zh;
  const TARGET_LANGUAGE_NAMES: Record<string, string> = {
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
  const targetName = TARGET_LANGUAGE_NAMES[normTarget] || "English";

  // Dynamic Multi-Slot Assembly
  if (Array.isArray(customSlots)) {
    const enabledSlots = customSlots.filter((s) => s.enabled && s.role !== "source");
    
    // 1. Build dynamic numbered task directives
    let taskLines: string[] = [];
    let jsonProps: string[] = [];

    if (isLongInput) {
      jsonProps.push(`  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)"`);
    }

    enabledSlots.forEach((slot, idx) => {
      const num = idx + 1;
      const instruction = slot.instruction || `Express the message in ${slot.label} style in authentic ${targetName}.`;
      taskLines.push(`${num}. "${slot.id}" (${slot.label}): ${instruction}`);
      jsonProps.push(`  "${slot.id}": "..."`);

      if (slot.showMeaning && slot.role !== "vocab") {
        taskLines.push(`${num}_meaning. "${slot.id}_meaning": The exact nuance and meaning of "${slot.id}" ${spec.meaningInstruction}.`);
        jsonProps.push(`  "${slot.id}_meaning": "..."`);
      }
    });

    const dynamicTasks = taskLines.join("\n");
    const dynamicJsonHint = `Strict JSON format:\n{\n${jsonProps.join(",\n")}\n}`;

    const condensationDirective = isLongInput
      ? `\n\n[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish — NEVER drop the second half or final question of the user's message!
Keep the phrasing tight and high-density (under 20 words) so the complete meaning of all sentences fits cleanly on 1-2 lines without mid-sentence truncation.`
      : "";

    const contextDirective = context && context.trim()
      ? `\n\n[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated translations fit naturally as a responsive reply to this specific context.`
      : "";

    return `You are an elite bilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), SQL keywords, variable names, and technical identifiers MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }

  // Legacy CustomSlotsConfig / Pre-configured slots
  const defaultSlots = LEGACY_SLOT_PRESETS.developer;
  const legacyConfig = customSlots as CustomSlotsConfig | undefined;
  const slot1Name = legacyConfig?.slot1?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.name : defaultSlots.slot1.name);
  const slot1Instruction = legacyConfig?.slot1?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.instruction : defaultSlots.slot1.instruction);

  const slot2Name = legacyConfig?.slot2?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.name : defaultSlots.slot2.name);
  const slot2Instruction = legacyConfig?.slot2?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.instruction : defaultSlots.slot2.instruction);

  const anchorText = spec.anchors
    .map(
      (a) => `Input: ${JSON.stringify(a.input)}\nOutput: ${JSON.stringify({
        spoken: a.spoken,
        spoken_meaning: a.spoken_meaning,
        written: a.written,
        written_meaning: a.written_meaning,
        vocab: a.vocab,
      })}`
    )
    .join("\n\n");

  const condensationDirective = isLongInput
    ? `\n\n[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish (both in "summary" and in "spoken"/"written") — NEVER omit the second half or final question of the user's message!
Express all points tightly and concisely (under 22 words each) so the complete meaning fits cleanly within 2 lines without truncation.`
    : "";

  const contextDirective = context && context.trim()
    ? `\n\n[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context (e.g. tweet, thread, issue):
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated spoken and written translations fit naturally as a responsive reply to this specific context, using authentic conversational grounding.`
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

  return `You are an elite bilingual developer language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into TWO distinct authentic ${targetName} registers (Slot 1 and Slot 2), and provide the exact back-translation/nuance in native ${spec.name} for each register:
1. "spoken" (Slot 1: ${slot1Name}): ${slot1Instruction}
2. "spoken_meaning": The exact nuance and meaning of Slot 1 ${spec.meaningInstruction}.
3. "written" (Slot 2: ${slot2Name}): ${slot2Instruction}
4. "written_meaning": The exact nuance and meaning of Slot 2 ${spec.meaningInstruction}.
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Do NOT artificially cap at 1-2; extract as many as genuinely beneficial, while keeping each definition concise ${spec.vocabInstruction} to ensure the terminal HUD remains vertically compact.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), SQL keywords, variable names, and technical identifiers MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}

[GOLDEN FEW-SHOT ANCHORS]:
${anchorText}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
}
