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

export const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  zh: {
    name: "Chinese",
    nativeName: "中文",
    meaningInstruction: "in native Chinese",
    vocabInstruction:
      'in Chinese in parentheses separated by " · " (e.g. "term1 (中文释义) · term2 (中文释义) · ...")',
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
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "感觉有点过度设计了，用标准库划算得多",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "该方案引入了不必要的复杂度，建议优先采用原生标准库实现",
        vocab:
          "over-engineered (过度工程化) · be better off (做某事更合适/划算) · stick with (坚持使用/沿用) · leverage (利用/借助)",
      },
      {
        input: "我们抛弃了臃肿的框架，换成零依赖单文件，冷启动直接提速了10倍",
        spoken: "Ditched the bloated framework for a zero-dep single file — cold starts are 10x faster now!",
        spoken_meaning: "甩掉了臃肿的框架换成了零依赖单文件，冷启动直接飙了10倍！",
        written:
          "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "用零依赖架构取代了单体框架，使冷启动延迟降低至原来的十分之一。",
        vocab: "ditch ... for ... (抛弃某物换用) · zero-dep (零外部依赖) · cold start (冷启动) · yield (产出/实现)",
      },
    ],
  },
  tw: {
    name: "Chinese",
    nativeName: "繁體中文",
    meaningInstruction: "in native Chinese",
    vocabInstruction: 'in Chinese in parentheses separated by " · "',
    anchors: [
      {
        input: "這個方案有點過度設計了，不如直接用標準庫實現",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "感覺有點過度設計了，用標準庫划算得多",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "該方案引入了不必要的複雜度，建議優先採用原生標準庫實現",
        vocab:
          "over-engineered (過度工程化) · be better off (做某事更划算) · stick with (沿用/堅持使用) · leverage (善用/借助)",
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
    vocabInstruction:
      'in Japanese in parentheses separated by " · " (e.g. "term1 (日本語解説) · term2 (日本語解説) · ...")',
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
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "少し過剰設計な気がします。標準ライブラリで十分です",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "提案された構成は不要な複雑さをもたらします。標準ライブラリの利用を推奨します",
        vocab:
          "over-engineered (過剰設計) · be better off (〜したほうがよい) · stick with (〜を使い続ける) · leverage (活用する)",
      },
    ],
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction:
      'in English in parentheses separated by " · " (e.g. "term1 (English definition) · term2 (...) · ...")',
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
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Suggestion to keep architecture simple and avoid unnecessary dependencies.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Formal architectural recommendation favoring standard library.",
        vocab: "over-engineered (excessively complex) · be better off (preferable) · stick with (adhere to)",
      },
    ],
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    meaningInstruction: "in native Spanish",
    vocabInstruction: 'in Spanish in parentheses separated by " · "',
    anchors: [
      {
        input: "Este enfoque está un poco sobreingeniado, es mejor que usemos la biblioteca estándar.",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Se siente un poco sobreingeniado, nos conviene más usar la biblioteca estándar.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning:
          "El enfoque propuesto introduce una complejidad innecesaria. Se recomienda priorizar la biblioteca estándar.",
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
    vocabInstruction: 'in French in parentheses separated by " · "',
    anchors: [
      {
        input: "Cette approche est surconçue, on ferait mieux d'utiliser la bibliothèque standard.",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Ça semble un peu trop complexe, on a meilleur compte à garder la lib standard.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning:
          "L'approche proposée introduit une complexité superflue. Il est recommandé de privilégier la bibliothèque standard.",
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
    vocabInstruction: 'in German in parentheses separated by " · "',
    anchors: [
      {
        input: "Der Ansatz ist überkompliziert, wir sollten lieber die Standardbibliothek nutzen.",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Fühlt sich überdimensioniert an, mit der Standardbibliothek fahren wir besser.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning:
          "Der Vorschlag erhöht die Komplexität unnötig. Native Implementierungen der Standardbibliothek werden bevorzugt.",
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
    vocabInstruction: 'in Korean in parentheses separated by " · "',
    anchors: [
      {
        input: "이 방식은 좀 오버엔지니어링 같아요. 그냥 표준 라이브러리를 쓰는 게 낫겠습니다.",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "조금 과한 설계인 것 같아요. 표준 라이브러리로 가는 게 훨씬 낫습니다.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
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
    vocabInstruction: 'in Russian in parentheses separated by " · "',
    anchors: [
      {
        input: "Кажется, это оверинжиниринг, лучше использовать стандартную библиотеку.",
        spoken:
          "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Похоже на оверинжиниринг, намного проще остаться на стандартной библиотеке.",
        written:
          "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning:
          "Предложенное решение неоправданно усложняет архитектуру. Рекомендуется использовать стандартную библиотеку.",
        vocab:
          "over-engineered (оверинжиниринг/избыточная сложность) · stick with (придерживаться) · leverage (задействовать)",
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

export const LANGUAGE_PAIR_ANCHORS: Record<string, LanguageAnchor[]> = {
  "zh->en": LANGUAGE_SPECS.zh.anchors,
  "tw->en": LANGUAGE_SPECS.tw.anchors,
  "ja->en": LANGUAGE_SPECS.ja.anchors,
  "ko->en": LANGUAGE_SPECS.ko.anchors,
  "de->en": LANGUAGE_SPECS.de.anchors,
  "fr->en": LANGUAGE_SPECS.fr.anchors,
  "es->en": LANGUAGE_SPECS.es.anchors,
  "ru->en": LANGUAGE_SPECS.ru.anchors,

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

export function resolveLanguagePairAnchors(sourceLang = "en", targetLang = "en"): LanguageAnchor[] {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const pairKey = `${normSource}->${normTarget}`;

  if (LANGUAGE_PAIR_ANCHORS[pairKey] && LANGUAGE_PAIR_ANCHORS[pairKey].length > 0) {
    return LANGUAGE_PAIR_ANCHORS[pairKey];
  }

  if (normTarget === "en" && LANGUAGE_SPECS[normSource]?.anchors?.length > 0) {
    return LANGUAGE_SPECS[normSource].anchors;
  }

  if (normSource === "tw") {
    const zhKey = `zh->${normTarget}`;
    if (LANGUAGE_PAIR_ANCHORS[zhKey]) return LANGUAGE_PAIR_ANCHORS[zhKey];
  }

  if (normSource === "en" && normTarget === "en") {
    return LANGUAGE_SPECS.en?.anchors || [];
  }

  return [];
}
