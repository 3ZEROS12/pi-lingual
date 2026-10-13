import type { SlotDefinition, CustomSlotsConfig, SlotConfig, SlotRole, PromptSlotConfig } from "./types.js";

export function getDefaultDirectSlots(sourceLang = "en"): PromptSlotConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];

  if (norm === "zh") {
    return [
      {
        id: "en_direct",
        label: "规范英文",
        role: "rewrite",
        instruction: "Target Language: English. Strictly output in English ONLY: 将用户口语化、零散的想法翻译并重组为逻辑严密、清晰明确的高质量英文工程指令。智能嗅探并映射精准工程动词（如'排查/看看/查查' ➔ Inspect/Diagnose/Trace，'重构/改改/精简' ➔ Refactor/Streamline/Harden，'加上/做个' ➔ Implement/Scaffold，'删掉/去掉' ➔ Prune/Deprecate），以动词原形直接开篇，消除口语冗余与寒暄。严禁翻译命令行参数（如 --dry-run, -rf 等 flags）、装饰器与包名（如 @scope/pkg, @ts-expect-error），保留所有代码标识符、路径与符号 100% 原型，杜绝幻觉。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重点词汇",
        role: "vocab",
        instruction: "自适应萃取 2-3 个与本英文指令相关的地道技术词汇或词组搭配，格式为 'term (中文释义) · term2 (中文释义)'。",
        enabled: true,
      },
    ];
  }

  if (norm === "tw") {
    return [
      {
        id: "en_direct",
        label: "規範英文",
        role: "rewrite",
        instruction: "Target Language: English. Strictly output in English ONLY: 將使用者口語化、零散的想法翻譯並重組為邏輯嚴密、清晰明確的高品質英文工程指令。以祈使動詞原形直接開篇，明確核心目標、執行動作與約束邊界，保留所有程式碼標識符與路徑。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重點詞彙",
        role: "vocab",
        instruction: "自適應萃取 2-3 個與本英文指令相關的道地技術詞彙或詞組搭配，格式為 'term (中文釋義) · term2 (中文釋義)'。",
        enabled: true,
      },
    ];
  }

  if (norm === "ja") {
    return [
      {
        id: "en_direct",
        label: "標準英語",
        role: "rewrite",
        instruction: "Target Language: English. Strictly output in English ONLY: 口語的・断片的な入力を、論理的で明確な高品質英語エンジニアリング指示文に翻訳・再構成してください。命令動詞（Inspect, Fix, Implement等）から直接開始し、コード識別子やパスは100%維持してください。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重要語彙",
        role: "vocab",
        instruction: "この指示に関連する実用的な英語技術表現を 2〜3 個抽出し、'term (日本語の意味) · term2 (意味)' の形式で出力してください。",
        enabled: true,
      },
    ];
  }

  if (norm === "ko") {
    return [
      {
        id: "en_direct",
        label: "표준 영문",
        role: "rewrite",
        instruction: "Target Language: English. Strictly output in English ONLY: 단편적인 한국어 입력을 논리적이고 명확한 고품질 영문 엔지니어링 지시문으로 번역 및 재구성하십시오. 동사 원형으로 직접 시작하고 코드 식별자와 파일 경로를 100% 보존하십시오.",
        enabled: true,
      },
      {
        id: "vocab",
        label: "핵심 어휘",
        role: "vocab",
        instruction: "이 지시문과 관련된 실용적인 영어 기술 표현 2~3개를 'term (한국어 뜻) · term2 (뜻)' 형식으로 추출하십시오.",
        enabled: true,
      },
    ];
  }

  return [
    {
      id: "en_refine",
      label: "Logical Spec",
      role: "rewrite",
      instruction: "Target Language: English. Strictly output in English ONLY: Translate or restructure the user's raw, colloquial, or fragmented thoughts into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
      enabled: true,
    },
    {
      id: "vocab",
      label: "Key Terms",
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic technical expressions relevant to this instruction.",
      enabled: true,
    },
  ];
}

export function getDefaultPromptSlots(sourceLang = "en"): PromptSlotConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];

  if (norm === "zh") {
    return [
      {
        id: "concise",
        label: "极简行动",
        role: "rewrite",
        instruction: "Target Language: Chinese (Simplified). Strictly output in Chinese (Simplified) ONLY: 去除冗余口语寒暄，精炼为直奔核心动作的极简中文指令，聚焦最小工作改动面（Smallest Working Diff）。",
        enabled: true,
      },
      {
        id: "spec",
        label: "结构规范",
        role: "rewrite",
        instruction: "Target Language: Chinese (Simplified). Strictly output in Chinese (Simplified) ONLY: 结构化整理为「目标 + 约束边界 + 交付标准」清晰三要素的中文规范，不臆测未提及的需求。",
        enabled: true,
      },
      {
        id: "deep",
        label: "根因溯源",
        role: "rewrite",
        instruction: "Target Language: Chinese (Simplified). Strictly output in Chinese (Simplified) ONLY: 提炼为要求全链路溯源、定位共享根因与边界用例物理验证的严谨排查指令，拒绝治标不治本。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重点词",
        role: "vocab",
        instruction: "提取 2-3 个与本提示词相关的地道英文技术词汇，格式为 'term (中文释义) · term2 (中文释义)'。",
        enabled: true,
      },
    ];
  }

  if (norm === "tw") {
    return [
      {
        id: "concise",
        label: "極簡行動",
        role: "rewrite",
        instruction: "Target Language: Chinese (Traditional). Strictly output in Chinese (Traditional) ONLY: 去除冗餘口語寒暄，精煉為直奔核心動作的極簡繁體中文指令，聚焦最小工作改動面（Smallest Working Diff）。",
        enabled: true,
      },
      {
        id: "spec",
        label: "結構規範",
        role: "rewrite",
        instruction: "Target Language: Chinese (Traditional). Strictly output in Chinese (Traditional) ONLY: 結構化整理為「目標 + 約束邊界 + 交付標準」清晰三要素的繁體中文規範，不臆測未提及的需求。",
        enabled: true,
      },
      {
        id: "deep",
        label: "根因溯源",
        role: "rewrite",
        instruction: "Target Language: Chinese (Traditional). Strictly output in Chinese (Traditional) ONLY: 提煉為要求全鏈路溯源、定位共享根因與邊界用例物理驗證的嚴謹排查指令，拒絕治標不治本。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重點詞",
        role: "vocab",
        instruction: "提取 2-3 個與本提示詞相關的道地英文技術詞彙，格式為 'term (中文釋義) · term2 (中文釋義)'。",
        enabled: true,
      },
    ];
  }

  if (norm === "ja") {
    return [
      {
        id: "concise",
        label: "簡潔・高効率",
        role: "rewrite",
        instruction: "Target Language: Japanese. Strictly output in Japanese ONLY: 無駄を省いた高効率な指示：核心のアクションと最小限の変更差分（Smallest Working Diff）を直接指示。",
        enabled: true,
      },
      {
        id: "spec",
        label: "構造化仕様",
        role: "rewrite",
        instruction: "Target Language: Japanese. Strictly output in Japanese ONLY: 構造化された技術仕様：曖昧な表現を「目的・制約条件・期待される結果」に整理し、明確化。",
        enabled: true,
      },
      {
        id: "deep",
        label: "根本原因・厳密",
        role: "rewrite",
        instruction: "Target Language: Japanese. Strictly output in Japanese ONLY: 根本原因の特定と厳密な検証：表面的な対処ではなくエンドツーエンドの原因追跡と境界値検証を要求。",
        enabled: true,
      },
      {
        id: "vocab",
        label: "重要語彙",
        role: "vocab",
        instruction: "関連する実用的な英語技術表現を 2〜3 個抽出し、'term (意味) · term2 (意味)' 形式で出力。",
        enabled: true,
      },
    ];
  }

  if (norm === "ko") {
    return [
      {
        id: "concise",
        label: "간결·즉시실행",
        role: "rewrite",
        instruction: "Target Language: Korean. Strictly output in Korean ONLY: 불필요한 인사말을 제거하고 핵심 동작과 최소 변경 범위(Smallest Working Diff)를 지시하는 간결한 한국어 명령문.",
        enabled: true,
      },
      {
        id: "spec",
        label: "구조화 명세",
        role: "rewrite",
        instruction: "Target Language: Korean. Strictly output in Korean ONLY: 모호한 표현을 '목표 + 제약 조건 + 산출물 기준'의 명확한 3요소 한국어 명세로 구조화.",
        enabled: true,
      },
      {
        id: "deep",
        label: "근본원인 추적",
        role: "rewrite",
        instruction: "Target Language: Korean. Strictly output in Korean ONLY: 임시방편 패치가 아닌 엔드투엔드 실행 흐름 추적, 근본 원인 해결 및 경계 조건 물리적 검증을 요구하는 엄밀한 지시문.",
        enabled: true,
      },
      {
        id: "vocab",
        label: "핵심 어휘",
        role: "vocab",
        instruction: "관련된 실용적인 영어 기술 표현 2~3개를 'term (한국어 뜻) · term2 (뜻)' 형식으로 추출.",
        enabled: true,
      },
    ];
  }

  return [
    {
      id: "concise",
      label: "Concise",
      role: "rewrite",
      instruction: "Target Language: English. Strictly output in English ONLY: High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      enabled: true,
    },
    {
      id: "spec",
      label: "Structured",
      role: "rewrite",
      instruction: "Target Language: English. Strictly output in English ONLY: Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable without inventing unrequested features.",
      enabled: true,
    },
    {
      id: "deep",
      label: "Deep Rigor",
      role: "rewrite",
      instruction: "Target Language: English. Strictly output in English ONLY: Root-cause & architectural rigor: trace end-to-end execution flow, fix shared root causes rather than symptom patches, and verify edge cases.",
      enabled: true,
    },
    {
      id: "vocab",
      label: "Vocab",
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic English technical expressions relevant to this prompt.",
      enabled: true,
    },
  ];
}

export function getDefaultModifySlots(sourceLang = "en", explainLang?: string): PromptSlotConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (explainLang || norm).toLowerCase().split("-")[0];
  const labels: Record<string, { fixed: string; native: string; fixes: string }> = {
    en: { fixed: "Fixed", native: "Native", fixes: "Takeaway" },
    zh: { fixed: "原句修补", native: "地道表达", fixes: "收获复盘" },
    tw: { fixed: "原句修補", native: "道地表達", fixes: "收穫複盤" },
    ja: { fixed: "原文修正", native: "自然表現", fixes: "重要ポイント" },
    ko: { fixed: "원문수정", native: "자연스러운표현", fixes: "핵심포인트" },
  };
  const l = labels[norm] || labels.en;

  const explainLangDesc =
    expNorm === "zh"
      ? "Explain the intuition/rule briefly in Chinese (中文)."
      : expNorm === "ja"
        ? "Explain the intuition/rule briefly in Japanese (日本語)."
        : expNorm === "ko"
          ? "Explain the intuition/rule briefly in Korean (한국어)."
          : "Explain the intuition/rule briefly in simple, clear English.";

  const fixedInstruction =
    "Target Language: English. Strictly output in English ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' ➔ 'want you to'), wrong prepositions/articles (e.g. 'in X' ➔ 'on X', 'as I\\'m' ➔ 'as if I\\'m'), and grammatical slips in the user's sentence. CRITICAL RULES: (1) Zero Level Leap (水平绝不跃迁 / i+1 Rule): STRICTLY match the user's current vocabulary tier and tone! If user writes everyday dev or junior-high level English, do NOT artificially inflate it into university academic GRE/SAT prose or bureaucratic corporate fluff. Fix the joints and syntax, but NEVER replace their words with alien SAT vocabulary! (2) Zero Tone Sanitization: NEVER sanitize, censor, or tone down swear words or raw emotions (e.g. 'fuck', 'suck', 'shit', 'idiot')—passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking: Do NOT obsess over casual lowercase casing (e.g. 'l' vs 'L') or missing trailing periods/commas ('.', ',') if the user writes informally. (4) 100% preserve original sentence structure, words, and cadence so the user can send it immediately with zero hesitation.";

  const nativeInstruction =
    "Target Language: English. Strictly output in English ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent. CRITICAL: Keep the semantic and stylistic gap between 'Fixed' and 'Native' small and realistic—do NOT over-complicate, do NOT jump vocabulary tiers, and do NOT turn it into an essay.";

  const fixesInstruction =
    `Extract 1-3 essential takeaways covering syntax structure, word choice & collocations, and grammar slips in the format: 'typo ➔ fix · in X ➔ on X (concise takeaway)'. ${explainLangDesc}`;

  return [
    {
      id: "fixed",
      label: l.fixed,
      role: "rewrite",
      instruction: fixedInstruction,
      enabled: true,
    },
    {
      id: "native",
      label: l.native,
      role: "rewrite",
      instruction: nativeInstruction,
      enabled: true,
    },
    {
      id: "fixes",
      label: l.fixes,
      role: "vocab",
      instruction: fixesInstruction,
      enabled: true,
    },
  ];
}

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
      spoken: "自然地道的美式口语流（每日站会、Slack沟通、结对编程、敏捷协作）。地道硅谷口吻、自然缩读、鲜活动词短语与母语习语。",
      written: "严谨现代的架构规范书面语（PR描述、RFC文档、问题单、架构说明）。清晰精炼的高阶平实英文，精准动词与地道搭配，杜绝陈旧维多利亚式套话与AI水词。",
      vocab: "自适应萃取关键地道词伙搭配（Collocations）、动词词组、技术成语或高阶表达，助力掌握地道母语级语感。",
    },
    tw: {
      spoken: "自然道地的美式口語流（每日站會、Slack溝通、結對編程、敏捷協作）。道地矽谷語感、自然縮讀、鮮活動詞片語與母語慣用語。",
      written: "嚴謹現代的架構規範書面語（PR描述、RFC文檔、問題單、架構說明）。清晰精煉的高階平實英文，精準動詞與道地搭配，杜絕陳舊套話與AI浮誇詞彙。",
      vocab: "自適應萃取關鍵道地詞夥搭配（Collocations）、動詞片語、技術成語或高階表達，助力掌握道地母語級語感。",
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
        spoken: "Looks great, let's deploy right away.",
        spoken_meaning: "Clear approval to proceed with deployment immediately.",
        written: "Confirmed. Proceed with deployment to production.",
        written_meaning: "Formal acknowledgment authorizing release to production.",
        vocab: "ship (deploy/release to production) · proceed with (move forward with)",
      },
      {
        input: "Keep going.",
        spoken: "Let's keep going with the next steps.",
        spoken_meaning: "Encouragement to continue ongoing implementation.",
        written: "Proceed with the subsequent implementation steps.",
        written_meaning: "Formal instruction to execute subsequent phase.",
        vocab: "keep going (continue implementation) · subsequent (following/next)",
      },
      {
        input: "This feels over-engineered; let's stick to the built-in standard library.",
        spoken: "This feels a bit over-complicated; let's stick with the native standard library.",
        spoken_meaning: "Suggestion to reduce complexity by leveraging built-in standard libraries.",
        written: "The proposed approach introduces unnecessary complexity. Utilizing native standard library implementations is preferred.",
        written_meaning: "Architectural recommendation to minimize dependencies in favor of standard libraries.",
        vocab: "over-engineered (unnecessarily complex) · stick with (continue using) · utilize (leverage effectively)",
      },
      {
        input: "Ditched the bloated framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken: "Ditched the heavy framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken_meaning: "Informal celebration of moving to zero-dependency single-file design with massive speedup.",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "Technical summary of architectural migration and latency metrics.",
        vocab: "ditch ... for (replace with lighter alternative) · zero-dep (zero external dependencies) · cold start (initial boot latency)",
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
      : legacyConfig?.slot1?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.name : defaultSlots.slot1.name);
    const slot1Instruction = isCustomSpoken
      ? spokenSlot!.instruction!
      : legacyConfig?.slot1?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.instruction : defaultSlots.slot1.instruction);

    const slot2Name = isCustomWritten
      ? writtenSlot!.label
      : legacyConfig?.slot2?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.name : defaultSlots.slot2.name);
    const slot2Instruction = isCustomWritten
      ? writtenSlot!.instruction!
      : legacyConfig?.slot2?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.instruction : defaultSlots.slot2.instruction);

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
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Do NOT artificially cap at 1-2; extract as many as genuinely beneficial, while keeping each definition concise ${spec.vocabInstruction} to ensure the terminal HUD remains vertically compact.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens. CRITICAL: NEVER expand, hallucinate, or fabricate file paths, UUIDs, or timestamps not explicitly in the user's input.
${condensationDirective}${contextDirective}${toneDirective}

[GOLDEN FEW-SHOT ANCHORS]:
${anchorText}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }

  // Dynamic Arbitrary Multi-Slot Assembly
  const enabledSlots = (customSlots as SlotConfig[]).filter((s) => s.enabled && s.role !== "source");
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

  return `You are an elite multilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens. CRITICAL: NEVER expand, hallucinate, or fabricate file paths, UUIDs, or timestamps not explicitly in the user's input.
${condensationDirective}${contextDirective}${toneDirective}

[GOLDEN FEW-SHOT ANCHORS]:
${anchorText}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
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
};

export function resolvePromptTargetLangName(
  sourceLang = "en",
  targetLang = "ja",
  promptLang?: string
): { code: string; name: string } {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "ja").toLowerCase().split("-")[0];
  const raw = (promptLang || "").trim().toLowerCase();

  const code =
    !raw || raw === "default" || raw === "auto"
      ? normTarget
      : raw === "native" || raw === "source" || raw === "母语"
        ? normSource
        : raw.split("-")[0];

  return {
    code,
    name: PROMPT_TARGET_LANGUAGE_NAMES[code] || "English",
  };
}

export const PROMPT_RULE_PRESETS: Record<string, string> = {
  minimal: "Follow the Smallest Working Diff principle; never refactor or touch unrelated code.",
  "root-cause": "Trace the end-to-end execution flow to fix the shared root cause rather than applying surface symptom patches.",
  tdd: "Verify boundary edge cases and run physical tests before declaring completion.",
  "explain-zh": "Keep code and identifiers exact, and provide all explanations and analysis in Chinese.",
};

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
 * Mode 2 (Direct Rewrite): Build a focused Prompt Optimizer system prompt.
 * Equipped with Golden Few-Shot Anchors, Zero-AI-Slop Imperative Guard, and optional 1-line Vocab extraction (`learnInRewrite`).
 */
export function buildDirectRewriteSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  learnInRewrite?: boolean;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "ja",
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0
    ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Weave and enforce the following user-specified condition(s) directly into the rewritten prompt:
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
    : "";

  const learnBlock = options.learnInRewrite
    ? `\n5. **Companion Takeaway ("vocab")**: Also extract 2–3 high-value authentic English technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    : "";

  const jsonSchema = options.learnInRewrite
    ? `{\n  "prompt": "...",\n  "vocab": "term1 (...) · term2 (...)"\n}`
    : `{\n  "prompt": "..."\n}`;

  const anchorBlock =
    normSource === "zh" || normSource === "tw"
      ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "那个登录刷新一下就掉线，帮我看看是不是 src/auth.ts 里 cookie 过期时间写错了，别乱改别的地方"
  Output in ${outLangName}: "Inspect \`src/auth.ts\` to diagnose and fix session loss on page refresh, specifically checking cookie expiration settings while keeping the diff minimal and leaving unrelated code untouched."`
      : `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "The login session drops on page refresh, check if cookie expiration in src/auth.ts is wrong, keep diff minimal"
  Output in ${outLangName}: "Inspect \`src/auth.ts\` to diagnose and fix session loss on page refresh, specifically checking cookie expiration settings while keeping the diff minimal and leaving unrelated code untouched."`;

  return `You are an elite AI Coding Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Rewrite, structure, standardize, and optimize their input into a high-efficiency, unambiguous engineering prompt in **${outLangName}**:
1. **Direct Imperative Opening (Smart Verb Sniffing)**: Start immediately with an active imperative engineering verb. Accurately map vague conversational intents to sharp, specific engineering actions (e.g., "look into / check / 看看 / 排查" ➔ "Inspect" / "Diagnose" / "Trace"; "clean up / tweak / 改改 / 重构" ➔ "Refactor" / "Streamline" / "Harden"; "add / create / 加上 / 做个" ➔ "Implement" / "Scaffold" / "Wire up"; "remove / drop / 删掉" ➔ "Prune" / "Deprecate" / "Strip"; "fix / 搞好" ➔ "Fix" / "Resolve"). NEVER use robotic preambles like "As an expert software engineer, please comprehensively..." or "I would like you to...".
2. **100% Intent Fidelity (Zero Hallucination)**: Clarify logic and sharpen terminology in **${outLangName}**, but NEVER invent unmentioned file names, libraries, or speculative requirements.
3. **Proportional Density**: Keep short requests crisp (1–2 sentences); structure multi-constraint requests into clean clauses.
4. **Code-Switch & CLI Flag Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators (e.g. \`@scope/pkg\`, \`@ts-expect-error\`), inline code (\`foo()\`), file paths (@file, path/to/file), and identifiers 100% verbatim. NEVER translate or alter CLI flags (e.g. never translate '--dry-run' into words).${learnBlock}${customRuleBlock}

${anchorBlock}

Strict JSON format:
${jsonSchema}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

/**
 * Mode 3 (N-Choice Interactive Selector): Build a multi-style Prompt Optimizer system prompt
 * generating N candidate prompts according to `promptSlots` (defaulting to Concise, Structured, Deep).
 */
export function buildPromptCandidatesSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  promptSlots?: PromptSlotConfig[];
  learnInRewrite?: boolean;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "ja",
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const slots = (Array.isArray(options.promptSlots) && options.promptSlots.length > 0
    ? options.promptSlots
    : getDefaultPromptSlots(normSource)
  ).filter((s) => s.enabled !== false);

  const activeSlots = slots.length > 0 ? slots : getDefaultPromptSlots(normSource);

  const taskLines = activeSlots.map((s, idx) => {
    if (s.role === "vocab") {
      return `${idx + 1}. "${s.id}" (${s.label}): ${s.instruction || "Extract 2-3 high-value authentic technical expressions or collocations relevant to the input."} ${spec.vocabInstruction}`;
    }
    const hasCustomLangDirective = /target language|output in|日本語|中文|english|spanish|french|german|korean|russian|portuguese/i.test(s.instruction || "");
    const langSuffix = hasCustomLangDirective ? "" : ` (Default language: **${outLangName}** unless instruction specifies otherwise)`;
    return `${idx + 1}. "${s.id}" (${s.label}): ${s.instruction}${langSuffix}`;
  });
  const jsonProps = activeSlots.map((s) => `  "${s.id}": "..."`);
  if (options.learnInRewrite && !activeSlots.some((s) => s.role === "vocab")) {
    taskLines.push(
      `${activeSlots.length + 1}. "vocab": Extract 2–3 high-value authentic English technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    );
    jsonProps.push(`  "vocab": "term1 (...) · term2 (...)"`);
  }

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0
    ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified condition(s):
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
    : "";

  return `You are an elite Bilingual Translation & Prompt Architect.
Transform the user's raw input into ${activeSlots.length} distinct output slots strictly following each slot's specific instruction and target language:
${taskLines.join("\n")}

[STRICT QUALITY GUARDRAILS]:
- **100% Semantic Fidelity**: Translate or refine EVERY sentence, clause, and detail from the user's input from start to finish. NEVER summarize, truncate, or drop details unless a slot explicitly asks for condensation.
- **Respect Slot Role & Register**: If a slot asks for spoken/colloquial translation, output natural spoken flow; if it asks for formal/written translation, output polished written prose; if it asks for prompt structuring, structure it cleanly without robotic AI filler ("As an AI...", "Please kindly...").
- **Zero Hallucination**: Never invent unmentioned files, bug reports, or speculative features.
- **Code & Symbol Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators (e.g. \`@scope/pkg\`, \`@ts-expect-error\`), inline code (\`foo()\`), file paths (@file, path/to/file), and technical identifiers 100% verbatim in every slot. NEVER translate or drop flags.${customRuleBlock}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

/**
 * Mode 4 (Modify / In-Place Fix): Build a real-time developer proofreading & surgical syntax repair system prompt.
 * Features two distinct tiers:
 * 1. "fixed": Smallest Working Diff surgical fix (patches typos, prepositions, grammar; preserves original words & rhythm 100%).
 * 2. "native": Natural idiomatic sibling (small gap, natural flow).
 * 3. "fixes": 1-line inline diff callout (`typo ➔ fix · in X ➔ on X`).
 */
export function buildModifySystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  explainLang?: string;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (options.explainLang || normSource).toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "en",
    options.promptLang
  );

  const explainLangDesc =
    expNorm === "zh"
      ? "Explain the takeaway in concise Chinese (e.g. 'in X ➔ on X: 网络平台一律用 on · want that you ➔ want you to: 习惯用 want [sb] to')."
      : expNorm === "ja"
        ? "Explain the takeaway in concise Japanese (e.g. 'in X ➔ on X: プラットフォームは常に on · want that you ➔ want you to: want [人] to の構文')."
        : expNorm === "ko"
          ? "Explain the takeaway in concise Korean."
          : "Explain the takeaway in concise, simple English.";

  return `You are an elite Developer Language Editor and Real-Time Proofreader.
The user is writing directly in ${outLangName}, but their draft may contain fast typing slips, grammatical errors, wrong prepositions, or non-native phrasing.
Perform two distinct tiers of proofreading:

1. "fixed": **Smallest Working Diff (Surgical Repair)**.
   Surgically fix ONLY typos, misspellings, syntax structure (e.g. clause connectors like 'want that you can' ➔ 'want you to'), wrong prepositions/articles (e.g. 'in X' ➔ 'on X', 'as I'm' ➔ 'as if I'm'), and grammatical slips that hinder clarity.
   CRITICAL RULES:
   - **Zero Level Leap (水平绝不跃迁 / i+1 Rule)**: STRICTLY match the user's current vocabulary tier and tone! If user writes everyday dev or junior-high level English, do NOT artificially inflate it into university academic GRE/SAT prose or bureaucratic corporate fluff. Fix the joints and syntax, but NEVER replace their words with alien SAT vocabulary!
   - **Zero Tone Sanitization**: NEVER sanitize, censor, or tone down raw emotion, swear words, or informal venting (e.g. 'fuck', 'suck', 'shit', 'idiot', 'damn'). Passion and emotional intensity are completely normal and human—preserve them 100%!
   - **Zero Punctuation/Casing Nitpicking**: Do NOT obsess over casual casing (e.g. 'l' vs 'L') or missing final periods/commas ('.', ',') if the user writes in lowercase. Focus strictly on actual word typos and structural clarity.
   - 100% preserve the user's original word choices, sentence structure, and cadence! The user must immediately recognize it as their own sentence and be able to send it with zero hesitation. Do NOT turn it into an alien sentence.

2. "native": **Idiomatic Native Sibling**.
   Provide a natural, idiomatic native phrasing expressing the exact same intent.
   CRITICAL: Keep the gap between "fixed" and "native" small and realistic—do NOT jump vocabulary tiers, do NOT write an alien essay, and do NOT delete their personality and emotion.

3. "fixes": Extract 1-3 essential takeaways covering: (1) Syntax structure (句法), (2) Word choice & collocations (用词搭配), and (3) Grammar slips.
   ${explainLangDesc}

[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "this fucking bug happan again in X, it just suck so hard"
  Output: {
    "fixed": "this fucking bug happen again on X, it just sucks so hard",
    "native": "this fucking bug happened again on X, it honestly sucks so bad",
    "fixes": "happan ➔ happen · in X ➔ on X · suck ➔ sucks"
  }
- Input: "test more. I don't want it happan again"
  Output: {
    "fixed": "Add more tests. I don't want it to happen again.",
    "native": "Add more tests. I want to make sure this never happens again.",
    "fixes": "happan ➔ happen · test more ➔ add more tests"
  }
- Input: "what I meant is that you have to work as I'm a amercian dev, because I want to market my projects in X in english. and I want that you can treat other language including chinese fairely. so? can you feel me"
  Output: {
    "fixed": "What I meant is that you have to work as if I'm an American dev, because I want to market my projects on X in English. And I want that you can treat other languages including Chinese fairly. So? Can you feel me?",
    "native": "What I mean is, you need to work as if I'm an American dev, because I want to market my projects on X in English. And I want you to treat other languages including Chinese fairly. So, do you get me?",
    "fixes": "as I'm ➔ as if I'm · in X ➔ on X · other language ➔ other languages · amercian ➔ American"
  }

Strict JSON format:
{
  "fixed": "...",
  "native": "...",
  "fixes": "..."
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
