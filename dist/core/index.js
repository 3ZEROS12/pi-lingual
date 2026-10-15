// src/prompts.ts
function getDefaultDirectSlots(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  return [
    {
      id: "en_direct",
      label: isZh ? "\u89C4\u8303\u82F1\u6587" : isJa ? "\u6A19\u6E96\u82F1\u8A9E" : "Logical Spec",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
      enabled: true
    },
    {
      id: "vocab",
      label: isZh ? "\u6838\u5FC3\u8868\u8FBE" : isJa ? "\u91CD\u8981\u8A9E\u5F59" : "Key Terms",
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) \xB7 term2 (...)'.",
      enabled: true
    }
  ];
}
function getDefaultPromptSlots(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  return [
    {
      id: "concise",
      label: isZh ? "\u6781\u7B80\u884C\u52A8" : isJa ? "\u7C21\u6F54\u30FB\u9AD8\u52B9\u7387" : "Concise",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      enabled: true
    },
    {
      id: "spec",
      label: isZh ? "\u7ED3\u6784\u89C4\u8303" : isJa ? "\u69CB\u9020\u5316\u4ED5\u69D8" : "Structured",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable without inventing unrequested features.",
      enabled: true
    },
    {
      id: "deep",
      label: isZh ? "\u6839\u56E0\u6EAF\u6E90" : isJa ? "\u6839\u672C\u539F\u56E0\u30FB\u53B3\u5BC6" : "Deep Rigor",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Root-cause & architectural rigor: trace end-to-end execution flow, fix shared root causes rather than symptom patches, and verify edge cases.",
      enabled: true
    },
    {
      id: "vocab",
      label: isZh ? "\u6838\u5FC3\u8868\u8FBE" : isJa ? "\u91CD\u8981\u8A9E\u5F59" : "Vocab",
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this prompt in ${explainLang}.",
      enabled: true
    }
  ];
}
function getDefaultModifySlots(sourceLang = "en", explainLang) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (explainLang || norm).toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  const expName = resolveLanguageName(expNorm);
  return [
    {
      id: "fixed",
      label: isZh ? "\u539F\u53E5\u4FEE\u8865" : isJa ? "\u539F\u6587\u4FEE\u6B63" : "Fixed",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' \u2794 'want you to'), wrong prepositions/articles (e.g. 'in X' \u2794 'on X'), and grammatical slips in the user's sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
      hideWhenLong: true,
      enabled: true
    },
    {
      id: "native",
      label: isZh ? "\u5730\u9053\u8868\u8FBE" : isJa ? "\u81EA\u7136\u8868\u73FE" : "Native",
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
      hideWhenLong: true,
      enabled: true
    },
    {
      id: "fixes",
      label: isZh ? "\u6536\u83B7\u590D\u76D8" : isJa ? "\u91CD\u8981\u30DD\u30A4\u30F3\u30C8" : "Takeaway",
      role: "vocab",
      instruction: `Extract 1-3 essential takeaways in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${expName})'.`,
      enabled: true
    }
  ];
}
function getDefaultSlots(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  return [
    {
      id: "source",
      label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Original",
      role: "source",
      enabled: true
    },
    {
      id: "spoken",
      label: isZh ? "\u53E3\u8BED" : isJa ? "\u53E3\u8A9E" : "Spoken",
      role: "translation",
      instruction: "Natural, idiomatic spoken ${targetLang} suitable for real-time team collaboration, peer discussions, and daily communication.",
      showMeaning: true,
      enabled: true
    },
    {
      id: "written",
      label: isZh ? "\u5199\u4F5C" : isJa ? "\u6587\u9762" : "Written",
      role: "translation",
      instruction: "Clear, precise, well-structured written ${targetLang} suitable for technical documentation, proposals, architecture reviews, and client communications. Active, concise, professional. STRICTLY AVOID archaic filler and AI-slop buzzwords.",
      showMeaning: true,
      enabled: true
    },
    {
      id: "vocab",
      label: isZh ? "\u91CD\u70B9" : isJa ? "\u5358\u8A9E" : "Vocab",
      role: "vocab",
      instruction: "Extract key idiomatic collocations, phrasal expressions, technical idioms, or nuanced terms in ${explainLang}.",
      enabled: true
    }
  ];
}
var LEGACY_SLOT_PRESETS = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Contractions, native phrasal verbs, idioms."
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional."
    }
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit."
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads and long-form posts. Direct without corporate marketing fluff."
    }
  },
  japanese: {
    slot1: {
      label: "\u53E3\u8A9E",
      name: "\u65E5\u5E38\u30BF\u30E1\u53E3 (Casual Spoken)",
      instruction: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u30C1\u30FC\u30E0\u3068\u306E\u65E5\u5E38\u4F1A\u8A71\u30FBSlack\u30CF\u30C9\u30EB\u30FB\u30AB\u30B8\u30E5\u30A2\u30EB\u306A\u3084\u308A\u53D6\u308A\u306B\u6700\u9069\u306A\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\u3002"
    },
    slot2: {
      label: "\u656C\u8A9E",
      name: "\u30D3\u30B8\u30CD\u30B9\u4E01\u5BE7\u8A9E\u30FB\u8B19\u8B72\u8A9E (Business Polite)",
      instruction: "\u4E0A\u53F8\u30FB\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u30FB\u516C\u5F0F\u9023\u7D61\u30FB\u696D\u52D9\u5831\u544A\u306B\u3075\u3055\u308F\u3057\u3044\u6D17\u7DF4\u3055\u308C\u305F\u4E01\u5BE7\u8A9E\u30FB\u8B19\u8B72\u8A9E\u306E\u30D3\u30B8\u30CD\u30B9\u6587\u9762\u3002"
    }
  },
  academic: {
    slot1: {
      label: "Discussion",
      name: "Lab Seminar Colloquy",
      instruction: "Natural conversational academic discourse (research lab discussions, seminar Q&A, conference banter). Fluent, collegial, and clear."
    },
    slot2: {
      label: "Paper",
      name: "Peer-Reviewed Paper Prose",
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE and ACM journal standards. Precise vocabulary."
    }
  }
};
var LANGUAGE_SPECS = {
  zh: {
    name: "Chinese",
    nativeName: "\u4E2D\u6587",
    meaningInstruction: "in native Chinese",
    vocabInstruction: 'in Chinese in parentheses separated by " \xB7 " (e.g. "term1 (\u4E2D\u6587\u91CA\u4E49) \xB7 term2 (\u4E2D\u6587\u91CA\u4E49) \xB7 ...")',
    anchors: [
      {
        input: "\u8BA4\u540C\uFF0C\u5F00\u59CB\u5427",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u5B8C\u5168\u8D5E\u540C\uFF0C\u54B1\u4EEC\u76F4\u63A5\u5F00\u641E",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u786E\u8BA4\u8D5E\u540C\uFF0C\u7740\u624B\u63A8\u8FDB\u5177\u4F53\u5B9E\u65BD",
        vocab: "on board with (\u8D5E\u6210/\u652F\u6301) \xB7 dive in (\u7ACB\u523B\u7740\u624B/\u5F00\u641E)"
      },
      {
        input: "\u7EE7\u7EED",
        spoken: "Let's keep going.",
        spoken_meaning: "\u7EE7\u7EED\u5F80\u4E0B\u641E",
        written: "Proceed with the next steps.",
        written_meaning: "\u63A8\u8FDB\u540E\u7EED\u6B65\u9AA4",
        vocab: "keep going (\u7EE7\u7EED\u63A8\u8FDB) \xB7 proceed with (\u7740\u624B\u8FDB\u884C)"
      },
      {
        input: "\u8FD9\u4E2A\u65B9\u6848\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u4E0D\u5982\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u5B9E\u73B0",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u611F\u89C9\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u7528\u6807\u51C6\u5E93\u5212\u7B97\u5F97\u591A",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u8BE5\u65B9\u6848\u5F15\u5165\u4E86\u4E0D\u5FC5\u8981\u7684\u590D\u6742\u5EA6\uFF0C\u5EFA\u8BAE\u4F18\u5148\u91C7\u7528\u539F\u751F\u6807\u51C6\u5E93\u5B9E\u73B0",
        vocab: "over-engineered (\u8FC7\u5EA6\u5DE5\u7A0B\u5316) \xB7 be better off (\u505A\u67D0\u4E8B\u66F4\u5408\u9002/\u5212\u7B97) \xB7 stick with (\u575A\u6301\u4F7F\u7528/\u6CBF\u7528) \xB7 leverage (\u5229\u7528/\u501F\u52A9)"
      },
      {
        input: "\u6211\u4EEC\u629B\u5F03\u4E86\u81C3\u80BF\u7684\u6846\u67B6\uFF0C\u6362\u6210\u96F6\u4F9D\u8D56\u5355\u6587\u4EF6\uFF0C\u51B7\u542F\u52A8\u76F4\u63A5\u63D0\u901F\u4E8610\u500D",
        spoken: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken_meaning: "\u7529\u6389\u4E86\u81C3\u80BF\u7684\u6846\u67B6\u6362\u6210\u4E86\u96F6\u4F9D\u8D56\u5355\u6587\u4EF6\uFF0C\u51B7\u542F\u52A8\u76F4\u63A5\u98D9\u4E8610\u500D\uFF01",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "\u7528\u96F6\u4F9D\u8D56\u67B6\u6784\u53D6\u4EE3\u4E86\u5355\u4F53\u6846\u67B6\uFF0C\u4F7F\u51B7\u542F\u52A8\u5EF6\u8FDF\u964D\u4F4E\u81F3\u539F\u6765\u7684\u5341\u5206\u4E4B\u4E00\u3002",
        vocab: "ditch ... for ... (\u629B\u5F03\u67D0\u7269\u6362\u7528) \xB7 zero-dep (\u96F6\u5916\u90E8\u4F9D\u8D56) \xB7 cold start (\u51B7\u542F\u52A8) \xB7 yield (\u4EA7\u51FA/\u5B9E\u73B0)"
      }
    ]
  },
  tw: {
    name: "Chinese",
    nativeName: "\u7E41\u9AD4\u4E2D\u6587",
    meaningInstruction: "in native Chinese",
    vocabInstruction: 'in Chinese in parentheses separated by " \xB7 "',
    anchors: []
  },
  ja: {
    name: "Japanese",
    nativeName: "\u65E5\u672C\u8A9E",
    meaningInstruction: "in native Japanese",
    vocabInstruction: 'in Japanese in parentheses separated by " \xB7 " (e.g. "term1 (\u65E5\u672C\u8A9E\u89E3\u8AAC) \xB7 term2 (\u65E5\u672C\u8A9E\u89E3\u8AAC) \xB7 ...")',
    anchors: [
      {
        input: "\u8CDB\u6210\u3001\u59CB\u3081\u307E\u3057\u3087\u3046",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u5927\u8CDB\u6210\u3001\u3059\u3050\u306B\u59CB\u3081\u3088\u3046",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u540C\u610F\u3057\u307E\u3057\u305F\u3002\u5B9F\u88C5\u3092\u9032\u3081\u307E\u3059",
        vocab: "on board with (\u8CDB\u6210/\u652F\u6301) \xB7 dive in (\u3059\u3050\u306B\u7740\u624B\u3059\u308B)"
      },
      {
        input: "\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044",
        spoken: "Let's keep going.",
        spoken_meaning: "\u305D\u306E\u307E\u307E\u9032\u3081\u3088\u3046",
        written: "Proceed with the next steps.",
        written_meaning: "\u6B21\u306E\u5DE5\u7A0B\u306B\u9032\u307F\u307E\u3059",
        vocab: "keep going (\u7D99\u7D9A\u3059\u308B) \xB7 proceed with (\u7740\u624B\u30FB\u9032\u884C\u3059\u308B)"
      },
      {
        input: "\u3053\u306E\u8A2D\u8A08\u306F\u5C11\u3057\u904E\u5270\u3067\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3092\u4F7F\u3063\u305F\u307B\u3046\u304C\u3044\u3044\u3067\u3057\u3087\u3046",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u5C11\u3057\u904E\u5270\u8A2D\u8A08\u306A\u6C17\u304C\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u5341\u5206\u3067\u3059",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u63D0\u6848\u3055\u308C\u305F\u69CB\u6210\u306F\u4E0D\u8981\u306A\u8907\u96D1\u3055\u3092\u3082\u305F\u3089\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306E\u5229\u7528\u3092\u63A8\u5968\u3057\u307E\u3059",
        vocab: "over-engineered (\u904E\u5270\u8A2D\u8A08) \xB7 be better off (\u301C\u3057\u305F\u307B\u3046\u304C\u3088\u3044) \xB7 stick with (\u301C\u3092\u4F7F\u3044\u7D9A\u3051\u308B) \xB7 leverage (\u6D3B\u7528\u3059\u308B)"
      }
    ]
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: 'in English in parentheses separated by " \xB7 " (e.g. "term1 (English definition) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "Looks great, let's deploy right away.",
        spoken_meaning: "Clear approval to proceed with deployment immediately.",
        written: "Confirmed. Proceed with deployment to production.",
        written_meaning: "Formal acknowledgment authorizing release to production.",
        vocab: "ship (deploy/release to production) \xB7 proceed with (move forward with)"
      },
      {
        input: "Keep going.",
        spoken: "Let's keep going with the next steps.",
        spoken_meaning: "Encouragement to continue ongoing implementation.",
        written: "Proceed with the subsequent implementation steps.",
        written_meaning: "Formal instruction to execute subsequent phase.",
        vocab: "keep going (continue implementation) \xB7 subsequent (following/next)"
      }
    ]
  },
  es: {
    name: "Spanish",
    nativeName: "Espa\xF1ol",
    meaningInstruction: "in native Spanish",
    vocabInstruction: 'in Spanish in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "De acuerdo, empecemos",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Totalmente de acuerdo, vamos al grano",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmado. Procedamos con la implementaci\xF3n",
        vocab: "on board with (estar de acuerdo) \xB7 dive in (empezar de lleno)"
      },
      {
        input: "Continuar",
        spoken: "Let's keep going.",
        spoken_meaning: "Sigamos adelante",
        written: "Proceed with the next steps.",
        written_meaning: "Continuar con los siguientes pasos",
        vocab: "keep going (seguir adelante) \xB7 proceed with (proceder con)"
      }
    ]
  },
  fr: {
    name: "French",
    nativeName: "Fran\xE7ais",
    meaningInstruction: "in native French",
    vocabInstruction: 'in French in parentheses separated by " \xB7 "',
    anchors: []
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: 'in German in parentheses separated by " \xB7 "',
    anchors: []
  },
  ko: {
    name: "Korean",
    nativeName: "\uD55C\uAD6D\uC5B4",
    meaningInstruction: "in native Korean",
    vocabInstruction: 'in Korean in parentheses separated by " \xB7 "',
    anchors: []
  },
  ru: {
    name: "Russian",
    nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    meaningInstruction: "in native Russian",
    vocabInstruction: 'in Russian in parentheses separated by " \xB7 "',
    anchors: []
  }
};
var PROMPT_TARGET_LANGUAGE_NAMES = {
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
  ms: "Malay"
};
function resolveLanguageName(code = "en") {
  const norm = (code || "en").toLowerCase().split("-")[0];
  return PROMPT_TARGET_LANGUAGE_NAMES[norm] || code.toUpperCase();
}
function interpolatePromptVariables(template, vars) {
  if (!template || typeof template !== "string") return template;
  const sCode = (vars.sourceLang || "en").toLowerCase().split("-")[0];
  const tCode = (vars.targetLang || "en").toLowerCase().split("-")[0];
  const eCode = (vars.explainLang || sCode).toLowerCase().split("-")[0];
  const sName = resolveLanguageName(sCode);
  const tName = resolveLanguageName(tCode);
  const eName = resolveLanguageName(eCode);
  return template.replace(/\$\{sourceLang\}/g, sName).replace(/\$\{targetLang\}/g, tName).replace(/\$\{explainLang\}/g, eName).replace(/\$\{sourceLangCode\}/g, sCode).replace(/\$\{targetLangCode\}/g, tCode).replace(/\$\{explainLangCode\}/g, eCode);
}
function resolvePromptTargetLangName(sourceLang = "en", targetLang = "ja", promptLang) {
  if (promptLang && promptLang.trim()) {
    const clean = promptLang.trim().toLowerCase().split("-")[0];
    return { code: clean, name: resolveLanguageName(clean) };
  }
  const s = (sourceLang || "en").toLowerCase().split("-")[0];
  const t = (targetLang || "en").toLowerCase().split("-")[0];
  const outCode = s === "en" ? t : "en";
  return { code: outCode, name: resolveLanguageName(outCode) };
}
var PROMPT_RULE_PRESETS = {
  concise: "Keep output strictly concise, minimal, and action-oriented. Eliminate all fluff.",
  spec: "Format output with explicit sections: Objective, Constraints, Edge Cases, and Deliverable.",
  deep: "Prioritize root-cause tracing, end-to-end flow inspection, and regression boundary checks."
};
var DEFAULT_KILL_LIST = [
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
  "multifaceted"
];
function compileKillListInstruction(killList, globalKillList) {
  const baseGlobal = globalKillList !== void 0 ? globalKillList : DEFAULT_KILL_LIST;
  const merged = Array.from(
    new Set([...baseGlobal, ...killList || []].map((w) => w.trim().toLowerCase()).filter(Boolean))
  );
  if (merged.length === 0) return "";
  return `

[KILL LIST - FORBIDDEN AI BUZZWORDS - ZERO TOLERANCE]:
Strictly forbid using any of the following clich\xE9, artificial, or corporate AI filler words/phrases:
${merged.map((w) => `\u2022 "${w}"`).join(", ")}.
Use plain, grounded, authentic developer language instead.`;
}
function resolvePromptRulePreset(input) {
  const key = input.trim().toLowerCase();
  return PROMPT_RULE_PRESETS[key] || input.trim();
}
function normalizePromptRules(rule) {
  if (!rule) return [];
  if (Array.isArray(rule)) {
    return rule.map((r) => resolvePromptRulePreset(String(r || ""))).filter(Boolean);
  }
  const s = resolvePromptRulePreset(String(rule));
  return s ? [s] : [];
}
function buildSystemPrompt(sourceLang = "en", targetLang = "ja", isLongInput = false, context, tone = "general", customSlots) {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "ja").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const targetName = resolveLanguageName(normTarget);
  const shouldInjectAnchors = (normTarget === "en" || normSource === "en") && spec.anchors && spec.anchors.length > 0;
  const anchorText = shouldInjectAnchors ? spec.anchors.map(
    (a) => `Input: ${JSON.stringify(a.input)}
Output: ${JSON.stringify({
      spoken: a.spoken,
      spoken_meaning: a.spoken_meaning,
      written: a.written,
      written_meaning: a.written_meaning,
      vocab: a.vocab
    })}`
  ).join("\n\n") : "";
  const anchorBlock = anchorText ? `

[GOLDEN FEW-SHOT ANCHORS]:
${anchorText}` : "";
  const condensationDirective = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish \u2014 NEVER omit any details!
Express all points concisely so the complete meaning fits cleanly within the HUD without truncation.` : "";
  const contextDirective = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""` : "";
  let toneDirective = "";
  if (tone === "social") {
    toneDirective = `

[TONE FOCUS - SOCIAL & COMMUNITY]:
Prioritize X (Twitter), Reddit, and developer community engagement dynamics:
- "spoken": Craft a high-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter. Avoid robotic AI clich\xE9 words (e.g., NEVER use "delve", "testament", "tapestry", "revolutionize").
- "written": High-signal, structured technical insight. Concise, clear, and actionable.`;
  } else if (tone === "tech") {
    toneDirective = `

[TONE FOCUS - TECHNICAL RIGOR]:
Prioritize RFC, Pull Request, and architectural documentation precision:
- "spoken": Direct, respectful engineering alignment (Slack huddles, technical triage).
- "written": High-precision Plain ${targetName} matching modern IETF RFC and open-source release notes.`;
  }
  const isArraySlots = Array.isArray(customSlots);
  const nonSourceSlots = isArraySlots ? customSlots.filter((s) => s.enabled && s.role !== "source") : [];
  const hasSpoken = isArraySlots && nonSourceSlots.some((s) => s.id === "spoken");
  const hasWritten = isArraySlots && nonSourceSlots.some((s) => s.id === "written");
  const isStandardDuality = !isArraySlots || hasSpoken && hasWritten && nonSourceSlots.length <= 4;
  if (isStandardDuality) {
    const defaultSlots = LEGACY_SLOT_PRESETS.developer;
    const legacyConfig = !isArraySlots ? customSlots : void 0;
    const spokenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "spoken") : void 0;
    const writtenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "written") : void 0;
    const defaultLocSlots = getDefaultSlots(normSource);
    const defaultSpokenInst = defaultLocSlots.find((s) => s.id === "spoken")?.instruction;
    const defaultWrittenInst = defaultLocSlots.find((s) => s.id === "written")?.instruction;
    const isCustomSpoken = spokenSlot?.instruction && spokenSlot.instruction !== defaultSpokenInst;
    const isCustomWritten = writtenSlot?.instruction && writtenSlot.instruction !== defaultWrittenInst;
    const slot1Name = isCustomSpoken ? spokenSlot.label : legacyConfig?.slot1?.name || defaultSlots.slot1.name;
    const rawSlot1Instruction = isCustomSpoken ? spokenSlot.instruction : legacyConfig?.slot1?.instruction || defaultSlots.slot1.instruction;
    const slot1Instruction = interpolatePromptVariables(rawSlot1Instruction, { sourceLang, targetLang, explainLang: sourceLang });
    const slot2Name = isCustomWritten ? writtenSlot.label : legacyConfig?.slot2?.name || defaultSlots.slot2.name;
    const rawSlot2Instruction = isCustomWritten ? writtenSlot.instruction : legacyConfig?.slot2?.instruction || defaultSlots.slot2.instruction;
    const slot2Instruction = interpolatePromptVariables(rawSlot2Instruction, { sourceLang, targetLang, explainLang: sourceLang });
    const jsonFormatHint = isLongInput ? `Strict JSON format:
{
  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)",
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}` : `Strict JSON format:
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
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(void 0, DEFAULT_KILL_LIST)}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }
  const enabledSlots = customSlots.filter((s) => s.enabled && s.role !== "source");
  const taskLines = [];
  const jsonProps = [];
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
  const dynamicJsonHint = `Strict JSON format:
{
${jsonProps.join(",\n")}
}`;
  return `You are an elite multilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(void 0, DEFAULT_KILL_LIST)}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
}
function buildDirectRewriteSystemPrompt(options) {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "ja",
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0 ? `

[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Weave and enforce the following user-specified condition(s) directly into the rewritten prompt:
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}` : "";
  const learnBlock = options.learnInRewrite ? `
5. **Companion Takeaway ("vocab")**: Also extract 2\u20133 high-value authentic English technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) \xB7 term2 (meaning)\` ${spec.vocabInstruction}.` : "";
  const jsonSchema = options.learnInRewrite ? `{
  "prompt": "...",
  "vocab": "term1 (...) \xB7 term2 (...)"
}` : `{
  "prompt": "..."
}`;
  const anchorBlock = outLangName === "English" ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "The login session drops on page refresh, check if cookie expiration in src/auth.ts is wrong, keep diff minimal"
  Output in ${outLangName}: "Inspect \`src/auth.ts\` to diagnose and fix session loss on page refresh, specifically checking cookie expiration settings while keeping the diff minimal and leaving unrelated code untouched."` : "";
  return `You are an elite AI Coding Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Rewrite, structure, standardize, and optimize their input into a high-efficiency, unambiguous engineering prompt in **${outLangName}**:
1. **Direct Imperative Opening (Smart Verb Sniffing)**: Start immediately with an active imperative engineering verb. Accurately map vague conversational intents to sharp, specific engineering actions (e.g., "look into / check / \u770B\u770B / \u6392\u67E5" \u2794 "Inspect" / "Diagnose" / "Trace"; "clean up / tweak / \u6539\u6539 / \u91CD\u6784" \u2794 "Refactor" / "Streamline" / "Harden"; "add / create / \u52A0\u4E0A / \u505A\u4E2A" \u2794 "Implement" / "Scaffold" / "Wire up"; "remove / drop / \u5220\u6389" \u2794 "Prune" / "Deprecate" / "Strip"; "fix / \u641E\u597D" \u2794 "Fix" / "Resolve"). NEVER use robotic preambles like "As an expert software engineer, please comprehensively..." or "I would like you to...".
2. **100% Intent Fidelity (Zero Hallucination)**: Clarify logic and sharpen terminology in **${outLangName}**, but NEVER invent unmentioned file names, libraries, or speculative requirements.
3. **Proportional Density**: Keep short requests crisp (1\u20132 sentences); structure multi-constraint requests into clean clauses.
4. **Code-Switch & CLI Flag Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators (e.g. \`@scope/pkg\`, \`@ts-expect-error\`), inline code (\`foo()\`), file paths (@file, path/to/file), and identifiers 100% verbatim. NEVER translate or alter CLI flags (e.g. never translate '--dry-run' into words).${learnBlock}${customRuleBlock}${compileKillListInstruction(void 0, DEFAULT_KILL_LIST)}
${anchorBlock ? `
${anchorBlock}
` : ""}
Strict JSON format:
${jsonSchema}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
function buildPromptCandidatesSystemPrompt(options) {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "ja",
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const slots = (Array.isArray(options.promptSlots) && options.promptSlots.length > 0 ? options.promptSlots : getDefaultPromptSlots(normSource)).filter((s) => s.enabled !== false && s.role !== "source");
  const taskLines = slots.map((s, idx) => {
    if (s.role === "vocab") {
      return `${idx + 1}. "${s.id}" (${s.label}): ${s.instruction || "Extract 2-3 high-value authentic technical expressions or collocations relevant to the input."} ${spec.vocabInstruction}`;
    }
    const hasCustomLangDirective = /target language|output in|日本語|中文|english|spanish|french|german|korean|russian|portuguese/i.test(s.instruction || "");
    const langSuffix = hasCustomLangDirective ? "" : ` (Default language: **${outLangName}** unless instruction specifies otherwise)`;
    return `${idx + 1}. "${s.id}" (${s.label}): ${s.instruction}${langSuffix}`;
  });
  const jsonProps = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });
  if (options.learnInRewrite && !slots.some((s) => s.role === "vocab")) {
    taskLines.push(
      `${slots.length + 1}. "vocab": Extract 2\u20133 high-value authentic technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) \xB7 term2 (meaning)\` ${spec.vocabInstruction}.`
    );
    jsonProps.push(`  "vocab": "term1 (...) \xB7 term2 (...)"`);
  }
  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0 ? `

[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified condition(s):
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}` : "";
  return `You are an elite Bilingual Translation & Prompt Architect.
Transform the user's raw input into ${slots.length} distinct output slots strictly following each slot's specific instruction and target language:
${taskLines.join("\n")}

[STRICT QUALITY GUARDRAILS]:
- **100% Semantic Fidelity**: Translate or refine EVERY sentence, clause, and detail from the user's input from start to finish. NEVER summarize, truncate, or drop details unless a slot explicitly asks for condensation.
- **Respect Slot Role & Register**: If a slot asks for spoken/colloquial translation, output natural spoken flow; if it asks for formal/written translation, output polished written prose; if it asks for prompt structuring, structure it cleanly without robotic AI filler.
- **Zero Hallucination**: Never invent unmentioned files, bug reports, or speculative features.
- **Code & Symbol Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators, inline code, file paths, and technical identifiers 100% verbatim in every slot.${customRuleBlock}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
function buildModifySystemPrompt(options) {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (options.explainLang || normSource).toLowerCase().split("-")[0];
  const { code: outLangCode, name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "en",
    options.promptLang
  );
  const explainName = resolveLanguageName(expNorm);
  const explainLangDesc = `Explain each takeaway following the 3-Second Glanceability Rule strictly in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${explainName})'.`;
  let linguisticProfile = "";
  if (outLangCode === "zh" || outLangCode === "tw") {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: CHINESE]:
- Eliminate awkward English-style stacked relative clauses.
- Trim redundant pronouns and restore natural Chinese subject-omission flow.
- Fix measure words and verb-object collocations.
- Distinguish pragmatic distance: use respectful honorifics vs natural peer flow.`;
  } else if (outLangCode === "ja") {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: JAPANESE]:
- Fix particles (\u52A9\u8A5E: \u306F, \u304C, \u3092, \u306B, \u3067) and natural verb-predicate dependencies.
- Maintain pragmatic consistency between casual team conversation and polite business context.`;
  } else {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: ENGLISH]:
- Fix prepositions (websites/platforms take 'on': 'on X', 'on GitHub', 'on Slack'), articles ('a' vs 'an'), and verb tenses.
- Zero casing/punctuation nitpicking: do NOT obsess over casual lowercase letters ('l' vs 'L') or missing trailing periods.`;
  }
  const rawSlots = options.promptSlots || options.customSlots;
  const slots = (Array.isArray(rawSlots) && rawSlots.length > 0 ? rawSlots : getDefaultModifySlots(options.sourceLang, options.explainLang)).filter((s) => s.enabled !== false && s.role !== "source");
  const taskLines = slots.map((s, idx) => {
    const num = idx + 1;
    if (s.role === "vocab" || s.id === "fixes") {
      return `${num}. "${s.id}" (${s.label}): ${s.instruction || explainLangDesc}`;
    }
    return `${num}. "${s.id}" (${s.label}): ${s.instruction}`;
  });
  const jsonProps = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });
  const anchorBlock = outLangCode === "en" ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "this fucking bug happan again in X, it just suck so hard"
  Output: {
    "fixed": "this fucking bug happen again on X, it just sucks so hard",
    "native": "this fucking bug happened again on X, it honestly sucks so bad",
    "fixes": "happan \u2794 happen \xB7 in X \u2794 on X (platforms take on) \xB7 suck \u2794 sucks"
  }` : "";
  return `You are an elite Developer Language Editor and Real-Time Proofreader.
The user is writing directly in ${outLangName}, but their draft may contain fast typing slips, grammatical errors, wrong prepositions, or non-native phrasing.
Perform proofreading according to the following tasks:
${taskLines.join("\n")}

[CRITICAL PROOFREADING RULES]:
- **Zero Level Leap (i+1 Rule)**: Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose.
- **Zero Tone Sanitization**: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%!
- **Zero Punctuation/Casing Nitpicking**: Do NOT obsess over casual casing or missing periods.
- 100% preserve user's original words, rhythm, and cadence!${linguisticProfile}
${anchorBlock ? `
${anchorBlock}
` : ""}
Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

// src/engine.ts
import fs from "fs";
import path from "path";
import os from "os";

// src/presets.ts
function getDefaultFactoryModes(sourceLang = "en", explainLang) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  const directName = isZh ? "\u89C4\u8303\u76F4\u53D1" : isJa ? "\u4ED5\u69D8\u76F4\u884C" : "Logical Spec";
  const liveFlowName = isZh ? "\u5B9E\u6218\u72C2\u98D9" : isJa ? "\u5B9F\u6226\u75BE\u8D70" : "Live Flow";
  const vocabName = isZh ? "\u6838\u5FC3\u8868\u8FBE" : isJa ? "\u91CD\u8981\u8868\u73FE" : "Key Terms";
  const fixedName = isZh ? "\u539F\u53E5\u4FEE\u8865" : isJa ? "\u539F\u6587\u4FEE\u6B63" : "Fixed";
  const nativeName = isZh ? "\u5730\u9053\u8868\u8FBE" : isJa ? "\u81EA\u7136\u8868\u73FE" : "Native";
  const takeawayName = isZh ? "\u6536\u83B7\u590D\u76D8" : isJa ? "\u91CD\u8981\u30DD\u30A4\u30F3\u30C8" : "Takeaways";
  return [
    {
      id: "direct",
      name: directName,
      aliases: ["lazy"],
      flow: "translate",
      action: "transform",
      hud: "preview",
      reasoning: "low",
      slots: [
        {
          id: "direct_spec",
          label: directName,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
          enabled: true
        },
        {
          id: "vocab",
          label: vocabName,
          role: "vocab",
          instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) \xB7 term2 (...)'.",
          enabled: true
        }
      ],
      enabled: true
    },
    {
      id: "live-flow",
      name: liveFlowName,
      aliases: ["raw"],
      flow: "proofread",
      action: "transform",
      hud: "adaptive-takeaway",
      reasoning: "low",
      slots: [
        {
          id: "fixed",
          label: fixedName,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' \u2794 'want you to'), wrong prepositions/articles, and grammatical slips in the user's ${targetLang} sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "native",
          label: nativeName,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "fixes",
          label: takeawayName,
          role: "vocab",
          instruction: "Extract 1-3 essential takeaways in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${explainLang})'.",
          enabled: true
        }
      ],
      enabled: true
    }
  ];
}
var PRESET_LOADOUTS = {
  spec: {
    id: "spec",
    name: "Brain-Dump to Spec",
    description: "Transforms unstructured thoughts into clear Objective, Constraints, Edge Cases, and Do Not Touch clauses for agent plan mode",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "spec",
      name: sourceLang === "zh" ? "\u8111\u66B4\u538B\u94F8" : sourceLang === "ja" ? "\u4ED5\u69D8\u92F3\u9020" : "Brain-Dump Spec",
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "agent",
      reasoning: "medium",
      killList: ["make it fast", "handle errors properly", "delve", "seamless", "robust"],
      slots: [
        {
          id: "spec",
          label: "Spec",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Restructure user's raw thoughts from ${sourceLang} into structured engineering specification for an AI coding agent with explicit sections: Objective, Constraints, Edge Cases, and Do Not Touch modules. Use rigorous system architecture terms (e.g. idempotency, dead-letter queue, exponential backoff, rollback). NEVER invent unmentioned architectural features.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Arch Terms",
          role: "vocab",
          instruction: "Extract 2-3 key architectural term mappings with explanations in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  commit: {
    id: "commit",
    name: "Commit Dehydrator",
    description: "Extracts git diff and intent into conventional commits format (first line <=50 chars, imperative verb, Root Cause & Impact body)",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "commit",
      name: sourceLang === "zh" ? "\u63D0\u4EA4\u8131\u6C34" : sourceLang === "ja" ? "\u30B3\u30DF\u30C3\u30C8\u8131\u6C34" : "Commit Dehydrator",
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "clipboard",
      reasoning: "low",
      contextAware: true,
      killList: ["enhance", "robust", "seamless", "streamline", "comprehensive", "This PR aims to", "in summary"],
      slots: [
        {
          id: "commit",
          label: "Commit",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate strict Conventional Commits format (e.g. 'fix(scope): ...' or 'feat(scope): ...'). First line MUST be <= 50 characters starting directly with an imperative active verb (e.g. 'Prevent', 'Clear', 'Guard against', 'Handle'). Body must state strictly Root Cause and Impact without AI filler.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Git Verbs",
          role: "vocab",
          instruction: "Highlight the imperative Git verb replacement and rationale in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  oss: {
    id: "oss",
    name: "OSS Peer Comms",
    description: "Transforms blunt feedback or bug reports into peer-level, objective, non-defensive GitHub issue/PR comments (nit, blocker, repro)",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "oss",
      name: sourceLang === "zh" ? "\u5F00\u6E90\u5BF9\u7EBF" : sourceLang === "ja" ? "OSS\u5BFE\u8A71" : "OSS Peer Comms",
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["Sorry for my bad English", "Thank you so much for your kind review", "I would really appreciate it if", "delve"],
      slots: [
        {
          id: "peer_review",
          label: "Peer Comms",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Transform user's technical argument or critique from ${sourceLang} into objective, peer-level engineering communication. Erase self-deprecation (never say 'sorry for poor english') and personal blame. Inject natural GitHub maintainer idioms (e.g. 'nit:', 'under contention', 'race condition', 'idiomatic', 'repro:').",
          enabled: true
        },
        {
          id: "vocab",
          label: "Peer Idioms",
          role: "vocab",
          instruction: "Extract 1-2 diplomatic peer engineering expressions in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  yap: {
    id: "yap",
    name: "Indie Hacker Shipper",
    description: "Distills technical builds into cold, high-density Indie Hacker tech posts (<280 chars) for X and HN with 0 emojis and 0 corporate hype",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "yap",
      name: sourceLang === "zh" ? "\u6781\u5BA2\u53D1\u63A8" : sourceLang === "ja" ? "\u767A\u4FE1\u6295\u7A3F" : "Indie Shipper",
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["\u{1F680}", "\u{1F525}", "\u2728", "\u{1F9F5}", "Excited to announce", "Game-changer", "Revolutionize", "Unleash", "delve", "tapestry"],
      slots: [
        {
          id: "tweet",
          label: "Post",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate cold, high-density developer post under 280 characters. Structure: Pain (what sucked before) \u2794 What was built (one-line solution) \u2794 Under the hood (concrete technical mechanism). Zero emoji spam, zero marketing hype, direct developer voice.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Dev Slang",
          role: "vocab",
          instruction: "Extract 1-2 authentic developer phrasing alternatives in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  }
};
function getPresetLoadout(id, sourceLang = "en", explainLang) {
  const normId = id.trim().toLowerCase();
  const found = PRESET_LOADOUTS[normId];
  return found ? found.loadout(sourceLang, explainLang) : null;
}
function listPresetLoadouts() {
  return Object.values(PRESET_LOADOUTS);
}
function createCustomSlot(params) {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction: params.instruction?.trim() || (role === "source" ? void 0 : "Natural expressions matching context."),
    showMeaning: params.showMeaning !== void 0 ? params.showMeaning : role !== "source" && role !== "vocab",
    hideWhenLong: Boolean(params.hideWhenLong),
    enabled: params.enabled !== void 0 ? params.enabled : true
  };
}
function addSlotToList(slots, newSlot) {
  const normId = newSlot.id.trim().toLowerCase();
  const existingIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (existingIndex >= 0) {
    const copy = [...slots];
    copy[existingIndex] = { ...newSlot, id: normId };
    return copy;
  }
  return [...slots, { ...newSlot, id: normId }];
}
function removeSlotFromList(slots, slotId) {
  const normId = slotId.trim().toLowerCase();
  return slots.filter((s) => s.id.toLowerCase() !== normId);
}
function updateSlotInList(slots, slotId, patch) {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => s.id.toLowerCase() === normId ? { ...s, ...patch } : s);
}
function toggleSlotInList(slots, slotId) {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => s.id.toLowerCase() === normId ? { ...s, enabled: !s.enabled } : s);
}
function moveSlotInList(slots, slotId, targetIndex) {
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
function addCustomMode(modes, newMode) {
  const normId = newMode.id.trim().toLowerCase();
  const existingIndex = modes.findIndex((m) => m.id.toLowerCase() === normId);
  const modeNormalized = {
    ...newMode,
    id: normId,
    name: newMode.name?.trim() || normId,
    flow: newMode.flow || "translate",
    action: newMode.action || "transform",
    hud: newMode.hud || "preview",
    slots: Array.isArray(newMode.slots) ? newMode.slots : [],
    enabled: newMode.enabled !== void 0 ? newMode.enabled : true
  };
  if (existingIndex >= 0) {
    const copy = [...modes];
    copy[existingIndex] = modeNormalized;
    return copy;
  }
  return [...modes, modeNormalized];
}
function removeCustomMode(modes, modeId) {
  const normId = modeId.trim().toLowerCase();
  return modes.filter((m) => m.id.toLowerCase() !== normId);
}
function updateCustomMode(modes, modeId, patch) {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => m.id.toLowerCase() === normId ? { ...m, ...patch } : m);
}
function toggleCustomMode(modes, modeId) {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => m.id.toLowerCase() === normId ? { ...m, enabled: !m.enabled } : m);
}
function addSlotToMode(modes, modeId, slot) {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slot.id.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    const existingIdx = m.slots.findIndex((s) => s.id.toLowerCase() === normSlotId);
    let newSlots;
    if (existingIdx >= 0) {
      newSlots = [...m.slots];
      newSlots[existingIdx] = { ...slot, id: normSlotId };
    } else {
      newSlots = [...m.slots, { ...slot, id: normSlotId }];
    }
    return { ...m, slots: newSlots };
  });
}
function removeSlotFromMode(modes, modeId, slotId) {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slotId.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    return { ...m, slots: m.slots.filter((s) => s.id.toLowerCase() !== normSlotId) };
  });
}
var SLOT_PRESETS = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => getDefaultSlots(sourceLang)
  },
  social: {
    name: "Social",
    description: "Community building: Hook + Deep + Vocab",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement opening hook for social threads.", showMeaning: true, enabled: true },
      { id: "written", label: "Deep", role: "translation", instruction: "Insightful technical value and architecture reasoning.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", instruction: "Key engagement idioms and phrases.", enabled: true }
    ]
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: \u53E3\u8A9E + \u656C\u8A9E + \u5358\u8A9E",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "\u539F\u6587", role: "source", enabled: true },
      { id: "spoken", label: "\u53E3\u8A9E", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk).", showMeaning: true, enabled: true },
      { id: "written", label: "\u656C\u8A9E", role: "translation", instruction: "Formal, polite business Japanese (Keigo, professional email/PR).", showMeaning: true, enabled: true },
      { id: "vocab", label: "\u5358\u8A9E", role: "vocab", instruction: "Key Japanese vocabulary and idiomatic expressions.", enabled: true }
    ]
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
      { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for papers.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false }
    ]
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
      { id: "written", label: "Written", role: "translation", enabled: false },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false }
    ]
  }
};
function resolveSlotsForPreset(presetName = "developer", sourceLang = "en") {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}
var LANGUAGE_PRESETS = {
  en: {
    slot1Label: "Spoken",
    slot2Label: "Written",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "en \u21C4 ja",
    statusOriginal: "en \u21C4 ja",
    statusEnglish: "en \u21C4 ja",
    statusOff: "en \u21C4 ja: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[en \u21C4 ja] Companion mode: raw send + HUD learning card above",
    notifyEnglish: "[en \u21C4 ja] Direct mode: prompt optimized into target language",
    notifyOff: "[en \u21C4 ja] Companion disabled",
    notifyPaging: "[en \u21C4 ja] Long sentence paginated, use Alt+. or Alt+, to navigate",
    notifyNoHistory: "[en \u21C4 ja] No previous companion card recorded",
    notifyHistoryRestored: "[en \u21C4 ja] Restored previous companion card",
    notifyAgentHelp: "\u{1F4A1} Built-in lingual-tuner skill: Ask the agent to configure companion settings anytime.",
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Companion language switched to: {lang}",
    notifyLangInvalid: "Invalid language code. Supported: zh, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[en \u21C4 ja] Capsule mode enabled: single-line compact view",
    notifyCompactOff: "[en \u21C4 ja] Tree branch mode enabled: full multi-slot view",
    notifyTimeout: "[en \u21C4 ja] Prompt rewrite timed out; original prompt passed",
    notifyError: "[en \u21C4 ja] Prompt rewrite error; original prompt passed",
    cmdDescMode: "Cycle companion mode [en \u21C4 ja]: [Companion] \u2794 [Direct] \u2794 [Off]",
    cmdDescStatus: "View companion status and model diagnostics: /lingual-status",
    cmdDescModel: "Inspect or switch companion model [en \u21C4 ja]: /lingual-model [model-id|auto]",
    cmdDescLang: "Switch language pair [en \u21C4 ja]: /lang <source> [target]",
    cmdDescCompact: "Toggle single-line capsule mode and full tree layout: /lingual-compact",
    cmdDescLast: "Replay previous companion card: /last",
    cmdDescAgent: "View companion customization guide: /lingual-agent",
    shortcutNextPage: "Next companion page segment",
    shortcutPrevPage: "Previous companion page segment",
    capsuleSlot1Prefix: "Spk",
    capsuleSlot2Prefix: "Wrt",
    layoutCapsule: "Single-Line Capsule (1-Line)",
    layoutTree: "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Companion Status Report",
    statusReportMode: "Mode",
    statusReportFlow: "Language Flow",
    statusReportModel: "Model",
    statusReportCache: "Cache",
    statusReportLayout: "Layout: Trifecta Minimalist Left-Rail Tree",
    statusReportAuth: "Auth: Pi Native In-Process Credentials",
    statusReportShortcuts: "Shortcuts: /lingual \xB7 /slots \xB7 /lang \xB7 /lingual-compact",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill",
    modeDescOriginal: "Companion \xB7 0ms pass-through",
    modeDescEnglish: "Direct \xB7 Deep code reasoning",
    modeDescOff: "Disabled",
    modelCurrentLabel: "Current companion model",
    modelFollowSession: "follow session",
    modelAvailableListHeader: "Available models (use /lingual-model <id>):",
    modelAutoFollowDesc: "auto (follow active session model)",
    modelSelectHint: "Use /lingual-model <model-id> or auto.",
    langUsageHint: "Usage: /lang <source> [target] (e.g. /lang ja en or /lang en zh)",
    langList: ["\u2022 zh", "\u2022 ja", "\u2022 en", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ru", "\u2022 ko"],
    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Natural Language Customization:",
    slotsNlExamples: ['\u2022 "Customize slots: show tweets and deep analysis, no source"'],
    slotsCliTitle: "CLI Management Commands:",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults",
    slotsRemovedSuccess: '[{pair}] Removed slot [{id}] ("{label}")',
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: '[{pair}] Added/updated slot [{id}] "{label}"',
    slotsNotFound: "[{pair}] Slot [{id}] not found",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "Usage: /slots rm <slot-id>",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: 'Unknown slot command or preset "{cmd}".',
    spokenLabel: "Spoken",
    writtenLabel: "Written"
  },
  zh: {
    slot1Label: "\u53E3\u8BED",
    slot2Label: "\u5199\u4F5C",
    vocabLabel: "\u91CD\u70B9",
    sourceLabel: "\u539F\u6587",
    hudTitle: "zh \u21C4 en",
    statusOriginal: "zh \u21C4 en",
    statusEnglish: "zh \u21C4 en",
    statusOff: "zh \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[zh \u21C4 en] \u5DF2\u5207\u6362\u81F3\u3010\u539F\u6587\u6A21\u5F0F\u3011\uFF1A\u8F93\u5165\u4FDD\u6301\u7EAF\u51C0\u6BCD\u8BED\uFF0C\u4E0A\u65B9 HUD \u6D6E\u73B0\u4F34\u5B66\u89C6\u7A97",
    notifyEnglish: "[zh \u21C4 en] \u5DF2\u5207\u6362\u81F3\u3010\u82F1\u6587\u6A21\u5F0F\u3011\uFF1A\u53D1\u7ED9 AI \u7684\u8F93\u5165\u5C06\u81EA\u52A8\u8F6C\u6362\u4E3A\u7EAF\u6B63\u6280\u672F\u82F1\u6587",
    notifyOff: "[zh \u21C4 en] \u5DF2\u5173\u95ED\u4F34\u5B66",
    notifyPaging: "[zh \u21C4 en] \u957F\u53E5\u5DF2\u5207\u5206\u591A\u6BB5\uFF0C\u6309 Alt+. \u6216 Alt+, \u7FFB\u9875\u6D4F\u89C8",
    notifyNoHistory: "[zh \u21C4 en] \u6682\u65E0\u4E0A\u4E00\u6761\u4F34\u5B66\u8BB0\u5F55",
    notifyHistoryRestored: "[zh \u21C4 en] \u5DF2\u91CD\u65B0\u663E\u793A\u4E0A\u4E00\u6761\u4F34\u5B66\u5361\u7247",
    notifyAgentHelp: '\u{1F4A1} \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF1A\u76F4\u63A5\u5BF9\u5F53\u524D Agent \u8BF4 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66" \u5373\u53EF\u514D\u547D\u4EE4\u81EA\u52A8\u88C5\u914D\uFF01',
    notifyModelSwitched: "\u4F34\u5B66\u6A21\u578B\u5DF2\u5207\u6362\u4E3A: {model}",
    notifyLangSwitched: "\u4F34\u5B66\u8BED\u8A00\u5DF2\u5207\u6362\u4E3A: {lang}",
    notifyLangInvalid: "\u65E0\u6548\u7684\u8BED\u8A00\u4EE3\u7801\u3002\u652F\u6301: zh, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[zh \u21C4 en] \u5DF2\u5F00\u542F\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\uFF1A\u6781\u7B80\u5360\u4F4D",
    notifyCompactOff: "[zh \u21C4 en] \u5DF2\u5207\u6362\u4E3A\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784\uFF1A\u5C55\u793A\u5B8C\u6574\u591A\u69FD\u4E0E\u8BED\u611F",
    notifyTimeout: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u672A\u5C31\u7EEA\u6216\u8D85\u65F6\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u5F02\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    cmdDescMode: "\u5207\u6362\u4F34\u5B66\u6A21\u5F0F: /lingual",
    cmdDescStatus: "\u67E5\u770B\u72B6\u6001\u62A5\u544A: /lingual status",
    cmdDescModel: "\u5207\u6362\u4F34\u5B66\u6A21\u578B: /lingual model [id]",
    cmdDescLang: "\u5207\u6362\u4F34\u5B66\u8BED\u8A00: /lang <code>",
    cmdDescCompact: "\u5207\u6362\u80F6\u56CA\u4E0E\u6811\u72B6\u56FE: /lingual compact",
    cmdDescLast: "\u56DE\u770B\u4E0A\u4E00\u6761\u5361\u7247: /last",
    cmdDescAgent: "\u67E5\u770B\u4F34\u5B66\u6307\u5357: /lingual tuner",
    shortcutNextPage: "\u5207\u6362\u81F3\u4E0B\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    shortcutPrevPage: "\u5207\u6362\u81F3\u4E0A\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u5199",
    layoutCapsule: "\u5355\u884C\u80F6\u56CA\u6781\u7B80\u6D41 (1-Line Capsule)",
    layoutTree: "Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784 (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u8FD0\u884C\u72B6\u6001\u62A5\u544A",
    statusReportMode: "\u5F53\u524D\u6A21\u5F0F",
    statusReportFlow: "\u8BED\u8A00\u6D41\u5411",
    statusReportModel: "\u4F34\u5B66\u6A21\u578B",
    statusReportCache: "\u4F1A\u8BDD\u7F13\u5B58",
    statusReportLayout: "HUD\u5E03\u5C40: Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784",
    statusReportAuth: "\u51ED\u636E\u6A21\u5F0F: Pi \u539F\u751F\u8FDB\u7A0B\u5185\u8BA4\u8BC1 (Zero Config)",
    statusReportShortcuts: "\u5FEB\u6377\u64CD\u4F5C: /lingual \xB7 /slots \xB7 /lang \xB7 /last",
    statusReportTuner: "\u69FD\u4F4D\u8C03\u4F18: \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF08\u76F4\u63A5\u5411 Agent \u63CF\u8FF0\u5373\u53EF\u514D\u547D\u4EE4\u5B9A\u5236\uFF09",
    modeDescOriginal: "\u539F\u6587\u76F4\u901A \xB7 0ms\u975E\u963B\u585E",
    modeDescEnglish: "\u82F1\u6587\u6A21\u5F0F \xB7 \u6DF1\u5EA6\u4EE3\u7801\u63A8\u7406",
    modeDescOff: "\u5DF2\u5173\u95ED",
    modelCurrentLabel: "\u5F53\u524D\u4F34\u5B66\u6A21\u578B",
    modelFollowSession: "\u8DDF\u968F\u4F1A\u8BDD",
    modelAvailableListHeader: "\u53EF\u7528\u6A21\u578B (\u8F93\u5165 /lingual model <id> \u5207\u6362):",
    modelAutoFollowDesc: "auto (\u81EA\u52A8\u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u4E3B\u6A21\u578B)",
    modelSelectHint: "\u53EF\u8F93\u5165 /lingual model <model-id> \u6216 auto \u6307\u5B9A\u6A21\u578B\u3002",
    langUsageHint: "\u7528\u6CD5: /lang <zh|ja|en|es|fr|de> [target] (\u5982 /lang ja \u6216 /lang zh ja)",
    langList: ["\u2022 zh", "\u2022 ja", "\u2022 en", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ko", "\u2022 ru"],
    slotsHeader: "\u52A8\u6001\u69FD\u4F4D\u67B6\u6784",
    slotsActiveTag: "\u6FC0\u6D3B",
    slotsNone: "\u672A\u914D\u7F6E\u4EFB\u4F55\u69FD\u4F4D",
    slotsStatusEnabled: "\u5DF2\u542F\u7528",
    slotsStatusDisabled: "\u5DF2\u7981\u7528",
    slotsWithNuance: " +\u6BCD\u8BED\u5FAE\u91CA\u4E49",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8BED\u8A00\u5B9A\u5236\uFF08\u76F4\u63A5\u5BF9 Agent \u8BF4\u5373\u53EF\u5B9A\u5236\uFF09\uFF1A",
    slotsNlExamples: ['\u2022 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587"'],
    slotsCliTitle: "\u5E38\u7528\u5FEB\u6377\u547D\u4EE4\uFF1A",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] \u5DF2\u91CD\u7F6E\u69FD\u4F4D\u4E3A\u521D\u59CB\u9ED8\u8BA4\u72B6\u6001",
    slotsRemovedSuccess: '[{pair}] \u5DF2\u79FB\u9664\u69FD\u4F4D [{id}] ("{label}")',
    slotsRemovedSourceNote: " (\u5DF2\u7269\u7406\u9690\u85CF\u539F\u6587\u884C)",
    slotsToggled: "[{pair}] \u69FD\u4F4D [{id}] \u72B6\u6001\u53D8\u66F4\u4E3A: {status}",
    slotsAdded: '[{pair}] \u5DF2\u6DFB\u52A0/\u66F4\u65B0\u69FD\u4F4D [{id}] "{label}"',
    slotsNotFound: "[{pair}] \u672A\u627E\u5230\u69FD\u4F4D [{id}]",
    slotsUsageAdd: "\u7528\u6CD5: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "\u7528\u6CD5: /slots rm <slot-id>",
    slotsUsageToggle: "\u7528\u6CD5: /slots toggle <slot-id>",
    slotsUnknown: '\u672A\u8BC6\u522B\u7684\u69FD\u4F4D\u547D\u4EE4 "{cmd}"\u3002',
    spokenLabel: "\u53E3\u8BED",
    writtenLabel: "\u5199\u4F5C"
  },
  ja: {
    slot1Label: "\u53E3\u8A9E",
    slot2Label: "\u6587\u9762",
    vocabLabel: "\u5358\u8A9E",
    sourceLabel: "\u539F\u6587",
    hudTitle: "ja \u21C4 en",
    statusOriginal: "ja \u21C4 en",
    statusEnglish: "ja \u21C4 en",
    statusOff: "ja \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ja \u21C4 en] \u3010\u539F\u6587\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u539F\u6587\u9001\u4FE1\uFF0B\u5B66\u7FD2\u30AB\u30FC\u30C9\u8868\u793A",
    notifyEnglish: "[ja \u21C4 en] \u3010\u82F1\u8A9E\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u82F1\u8A9E\u306B\u5909\u63DB\u3057\u3066\u9001\u4FE1",
    notifyOff: "[ja \u21C4 en] \u30AA\u30D5\u306B\u3057\u307E\u3057\u305F",
    notifyPaging: "[ja \u21C4 en] \u9577\u6587\u3092\u5206\u5272\u3057\u307E\u3057\u305F\u3002Alt+. \u307E\u305F\u306F Alt+, \u3067\u79FB\u52D5",
    notifyNoHistory: "[ja \u21C4 en] \u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093",
    notifyHistoryRestored: "[ja \u21C4 en] \u524D\u56DE\u306E\u30AB\u30FC\u30C9\u3092\u518D\u8868\u793A\u3057\u307E\u3057\u305F",
    notifyAgentHelp: "\u{1F4A1} lingual-tuner \u30B9\u30AD\u30EB\u3067\u81EA\u7531\u306B\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u53EF\u80FD\u3067\u3059\uFF08\u6BCD\u8A9E\u5207\u66FF\u5BFE\u5FDC\uFF09",
    notifyModelSwitched: "\u30E2\u30C7\u30EB\u3092\u5909\u66F4\u3057\u307E\u3057\u305F: {model}",
    notifyLangSwitched: "\u8A00\u8A9E\u3092\u5909\u66F4\u3057\u307E\u3057\u305F: {lang}",
    notifyLangInvalid: "\u7121\u52B9\u306A\u8A00\u8A9E\u30B3\u30FC\u30C9\u3067\u3059",
    notifyCompactOn: "[ja \u21C4 en] 1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A\u3092\u6709\u52B9\u5316\u3057\u307E\u3057\u305F",
    notifyCompactOff: "[ja \u21C4 en] \u30C4\u30EA\u30FC\u8868\u793A\u3092\u6709\u52B9\u5316\u3057\u307E\u3057\u305F",
    notifyTimeout: "[ja \u21C4 en] \u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u306E\u305F\u3081\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    notifyError: "[ja \u21C4 en] \u30A8\u30E9\u30FC\u306E\u305F\u3081\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    cmdDescMode: "\u30E2\u30FC\u30C9\u5207\u66FF: /lingual",
    cmdDescStatus: "\u72B6\u614B\u8868\u793A: /lingual status",
    cmdDescModel: "\u30E2\u30C7\u30EB\u5207\u66FF: /lingual model [id]",
    cmdDescLang: "\u8A00\u8A9E\u5207\u66FF: /lang <code>",
    cmdDescCompact: "\u8868\u793A\u5207\u66FF: /lingual compact",
    cmdDescLast: "\u524D\u56DE\u30AB\u30FC\u30C9\u518D\u8868\u793A: /last",
    cmdDescAgent: "\u30AC\u30A4\u30C9\u8868\u793A: /lingual tuner",
    shortcutNextPage: "\u6B21\u306E\u30B9\u30E9\u30A4\u30B9\u3078\u79FB\u52D5",
    shortcutPrevPage: "\u524D\u306E\u30B9\u30E9\u30A4\u30B9\u3078\u79FB\u52D5",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u6587",
    layoutCapsule: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A",
    layoutTree: "Trifecta \u30C4\u30EA\u30FC\u8868\u793A",
    statusReportTitle: "\u30B9\u30C6\u30FC\u30BF\u30B9\u30EC\u30DD\u30FC\u30C8",
    statusReportMode: "\u73FE\u5728\u306E\u30E2\u30FC\u30C9",
    statusReportFlow: "\u8A00\u8A9E\u30D5\u30ED\u30FC",
    statusReportModel: "\u30E2\u30C7\u30EB",
    statusReportCache: "\u30AD\u30E3\u30C3\u30B7\u30E5",
    statusReportLayout: "\u30EC\u30A4\u30A2\u30A6\u30C8: Trifecta \u30C4\u30EA\u30FC\u8868\u793A",
    statusReportAuth: "\u8A8D\u8A3C\u65B9\u5F0F: Pi \u30CD\u30A4\u30C6\u30A3\u30D6\u30A4\u30F3\u30D7\u30ED\u30BB\u30B9\u8A8D\u8A3C",
    statusReportShortcuts: "\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8: /lingual \xB7 /slots \xB7 /lang \xB7 /last",
    statusReportTuner: "\u30C1\u30E5\u30FC\u30CA\u30FC: lingual-tuner \u30B9\u30AD\u30EB",
    modeDescOriginal: "\u539F\u6587\u30D1\u30B9\u30B9\u30EB\u30FC \xB7 0ms\u975E\u540C\u671F",
    modeDescEnglish: "\u76F4\u884C \xB7 \u30B3\u30FC\u30C9\u63A8\u8AD6",
    modeDescOff: "\u30AA\u30D5",
    modelCurrentLabel: "\u73FE\u5728\u306E\u5B66\u7FD2\u30E2\u30C7\u30EB",
    modelFollowSession: "\u30BB\u30C3\u30B7\u30E7\u30F3\u9023\u52D5",
    modelAvailableListHeader: "\u5229\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB:",
    modelAutoFollowDesc: "auto (\u30BB\u30C3\u30B7\u30E7\u30F3\u9023\u52D5)",
    modelSelectHint: "/lingual model <id> \u307E\u305F\u306F auto \u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    langUsageHint: "\u4F7F\u3044\u65B9: /lang <source> [target] (\u4F8B: /lang ja en)",
    langList: ["\u2022 ja", "\u2022 en", "\u2022 zh", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ko", "\u2022 ru"],
    slotsHeader: "\u30C0\u30A4\u30CA\u30DF\u30C3\u30AF\u30B9\u30ED\u30C3\u30C8",
    slotsActiveTag: "\u6709\u52B9",
    slotsNone: "\u30B9\u30ED\u30C3\u30C8\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    slotsStatusEnabled: "\u6709\u52B9",
    slotsStatusDisabled: "\u7121\u52B9",
    slotsWithNuance: " +\u30CB\u30E5\u30A2\u30F3\u30B9",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8A00\u8A9E\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA:",
    slotsNlExamples: ['\u2022 "\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u8003\u5BDF\u3060\u3051\u8868\u793A\u3057\u3066\u539F\u6587\u306F\u975E\u8868\u793A\u306B\u3057\u3066"'],
    slotsCliTitle: "CLI\u30B3\u30DE\u30F3\u30C9:",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] \u30C7\u30D5\u30A9\u30EB\u30C8\u8A2D\u5B9A\u306B\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F",
    slotsRemovedSuccess: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u3092\u524A\u9664\u3057\u307E\u3057\u305F",
    slotsRemovedSourceNote: " (\u539F\u6587\u306F\u8868\u793A\u3055\u308C\u306A\u304F\u306A\u308A\u307E\u3059)",
    slotsToggled: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u3092 {status} \u306B\u3057\u307E\u3057\u305F",
    slotsAdded: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] "{label}" \u3092\u8FFD\u52A0/\u66F4\u65B0\u3057\u307E\u3057\u305F',
    slotsNotFound: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    slotsUsageAdd: "\u4F7F\u3044\u65B9: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "\u4F7F\u3044\u65B9: /slots rm <slot-id>",
    slotsUsageToggle: "\u4F7F\u3044\u65B9: /slots toggle <slot-id>",
    slotsUnknown: '\u4E0D\u660E\u306A\u30B9\u30ED\u30C3\u30C8\u30B3\u30DE\u30F3\u30C9 "{cmd}" \u3067\u3059\u3002',
    spokenLabel: "\u53E3\u8A9E",
    writtenLabel: "\u6587\u9762"
  }
};
function resolveLabelsForLang(lang = "en", overrides, targetLang) {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.en;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} \u21C4 ${actualTarget}`;
  const merged = {
    ...LANGUAGE_PRESETS.en,
    // 1. Universal English baseline
    ...target,
    // 2. Localized native language preset
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...overrides || {}
    // 3. User explicit overrides
  };
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[[a-z]{2}\s*⇄\s*[a-z]{2}\]/gi, `[${pairTitle}]`);
    }
  }
  return merged;
}
function formatStatusReport(labels, info) {
  const modeDesc = info.mode === "original" ? labels.modeDescOriginal || "Original pass-through" : info.mode === "english" ? labels.modeDescEnglish || "English deep reasoning" : labels.modeDescOff || "Off";
  const layoutDesc = info.layout === "capsule" ? labels.layoutCapsule || "Single-Line Capsule (1-Line)" : labels.layoutTree || "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)";
  const lines = [
    `\u21C4 [${labels.hudTitle}] ${labels.statusReportTitle || "Status Report"}`,
    `\u2022 ${labels.statusReportMode || "Mode"}: [${info.mode}] (${modeDesc})`,
    `\u2022 ${labels.statusReportFlow || "Flow"}: [${info.sourceLang} \u2794 ${info.targetLang || "en"}]`,
    `\u2022 ${labels.statusReportModel || "Model"}: ${info.activeModel}`
  ];
  if (info.cacheStats) {
    const total = info.cacheStats.hits + info.cacheStats.misses;
    const rate = total > 0 ? Math.round(info.cacheStats.hits / total * 100) : 0;
    lines.push(
      `\u2022 ${labels.statusReportCache || "Cache"}: ${info.cacheStats.hits} hits / ${total} total (${rate}% hit rate) \xB7 ${info.cacheStats.size}/${info.cacheStats.capacity} items`
    );
  }
  lines.push(
    `\u2022 ${labels.statusReportLayout || "Layout"}: ${layoutDesc}`,
    `\u2022 ${labels.statusReportAuth || "Auth: Pi Native In-Process Auth"}`,
    `\u2022 ${labels.statusReportTuner || "Slot Tuner: Built-in lingual-tuner skill (Just describe preferences to Agent)"}`,
    `\u2022 ${labels.statusReportShortcuts || "Shortcuts: /lingual \xB7 /slots \xB7 /lang \xB7 /last"}`
  );
  return lines.join("\n");
}
function formatModelSelectionMessage(labels, currentActive, availableList) {
  let msg = `[${labels.hudTitle}] ${labels.modelCurrentLabel || "Current model"}: ${currentActive}
`;
  if (availableList) {
    msg += `${labels.modelAvailableListHeader || "Available models:"}
${availableList}
\u2022 ${labels.modelAutoFollowDesc || "auto"}
`;
  }
  msg += labels.modelSelectHint || "Specify model with /lingual model <model-id> or auto.";
  return msg;
}

// src/shield.ts
var SHELL_COMMAND_PREFIXES = [
  "git ",
  "npm ",
  "pnpm ",
  "yarn ",
  "bun ",
  "cargo ",
  "rustc ",
  "go ",
  "python ",
  "python3 ",
  "pip ",
  "node ",
  "deno ",
  "docker ",
  "podman ",
  "kubectl ",
  "helm ",
  "make ",
  "cmake ",
  "ninja ",
  "gcc ",
  "g++ ",
  "clang ",
  "cd ",
  "ls ",
  "dir ",
  "cat ",
  "type ",
  "rm ",
  "cp ",
  "mv ",
  "mkdir ",
  "chmod ",
  "chown ",
  "curl ",
  "wget ",
  "ssh ",
  "scp ",
  "grep ",
  "find ",
  "ps ",
  "kill ",
  "echo ",
  "export ",
  "set ",
  "typst ",
  "ffmpeg ",
  "yt-dlp ",
  "npx ",
  "tar ",
  "zip ",
  "unzip "
];
var CODE_STATEMENT_REGEX = /^(?:const|let|var|function|def|class|import|export|package|namespace|using|public|private|protected|fn|pub fn|impl|struct|enum|interface|type)\s+/;
var SQL_STATEMENT_REGEX = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+/i;
function isNonEnglish(text) {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}
function shouldShieldBypass(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("```")) {
    const withoutCodeFence = trimmed.replace(/```[\s\S]*?```/g, "").trim();
    if (withoutCodeFence && (/[?？]/.test(withoutCodeFence) || /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix)/i.test(withoutCodeFence))) {
      return false;
    }
    return true;
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
    if (trimmed.includes(":") || trimmed.includes(",")) {
      return true;
    }
  }
  const lower = trimmed.toLowerCase();
  for (const prefix of SHELL_COMMAND_PREFIXES) {
    if (lower.startsWith(prefix)) {
      if (/[?？]/.test(trimmed) || /(?:为什么|怎么|如何|报错|为何|explain|why|how)/i.test(trimmed)) {
        return false;
      }
      if (!/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed)) {
        return true;
      }
      if (/^git\s+(?:commit|tag)\s+.*-m\s+["'].*["']/i.test(trimmed)) {
        return true;
      }
    }
  }
  if (CODE_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("\uFF1F") && !trimmed.includes("?")) {
    if (!/[\u4e00-\u9fa5]/.test(trimmed) || /^[a-zA-Z0-9_\s<>{}\[\]();:=,"'.]+$/.test(trimmed)) {
      return true;
    }
  }
  if (SQL_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("\uFF1F") && !trimmed.includes("?")) {
    return true;
  }
  const SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i,
    /(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]{20}|AKIA[0-9A-Z]{16})/,
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/
  ];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  const isPurePathOrUrl = /^(?:[a-zA-Z]:[\\\/][^\s\r\n]+|\/(?:[a-zA-Z0-9_.-]+[\\\/])+[^\s\r\n]+|https?:\/\/[^\s\r\n]+)$/i.test(trimmed);
  const isPureUuidOrSession = /^(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.jsonl)?$/i.test(trimmed);
  if ((isPurePathOrUrl || isPureUuidOrSession) && !isNonEnglish(trimmed) && !/[?？]/.test(trimmed)) {
    return true;
  }
  return false;
}

// src/cache.ts
var LingualLruCache = class {
  constructor(capacity = 50) {
    this.capacity = capacity;
  }
  capacity;
  cache = /* @__PURE__ */ new Map();
  hits = 0;
  misses = 0;
  /**
   * Generates a normalized cache key incorporating language pairs and slot signature.
   */
  static buildKey(text, sourceLang = "en", targetLang = "ja", slotSignature) {
    const sig = slotSignature ? `[${slotSignature}]` : "";
    return `${sourceLang}\u2794${targetLang}${sig}:${text.trim()}`;
  }
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return void 0;
    }
    this.hits++;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  set(key, val) {
    if (!key || key.length > 256) {
      return;
    }
    if (typeof val === "string" && val.length > 2048) {
      return;
    }
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== void 0) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }
  has(key) {
    return this.cache.has(key);
  }
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  get size() {
    return this.cache.size;
  }
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      capacity: this.capacity
    };
  }
};
var LinguaLruCache = LingualLruCache;
var globalLingualCache = new LingualLruCache(50);
var globalLinguaCache = globalLingualCache;

// src/engine.ts
var DEFAULT_CONFIG = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "direct",
  sourceLang: "en",
  targetLang: "ja",
  temperature: 0.2,
  timeoutMs: 3e4
};
var LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("en", "ja");
var BLOCKED_JSON_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function toCleanString(val) {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toCleanString).filter(Boolean).join(" \xB7 ");
  return "";
}
function repairAndParseJsonObject(raw) {
  try {
    if (!raw || typeof raw !== "string" || raw.length > 32768) return null;
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) cleaned = fence[1].trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;
    const jsonSubstr = cleaned.slice(first, last + 1);
    let parsed;
    try {
      parsed = JSON.parse(jsonSubstr);
    } catch {
      const repaired = jsonSubstr.replace(/,\s*([}\]])/g, "$1").replace(
        /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
        (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
      );
      parsed = JSON.parse(repaired);
    }
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function parseLlmResponse(raw) {
  const parsed = repairAndParseJsonObject(raw);
  if (!parsed) return null;
  const spoken = toCleanString(parsed.spoken ?? parsed.casual ?? parsed.slot1);
  const spokenMeaning = toCleanString(parsed.spoken_meaning ?? parsed.spokenMeaning);
  const written = toCleanString(parsed.written ?? parsed.academic ?? parsed.slot2);
  const writtenMeaning = toCleanString(parsed.written_meaning ?? parsed.writtenMeaning);
  const vocab = toCleanString(parsed.vocab);
  const summary = toCleanString(parsed.summary ?? parsed.core_intent ?? parsed.coreIntent);
  const slotOutputs = /* @__PURE__ */ Object.create(null);
  for (const [k, v] of Object.entries(parsed)) {
    if (BLOCKED_JSON_KEYS.has(k) || k.endsWith("_meaning") || k === "summary") continue;
    const textVal = toCleanString(v);
    if (textVal) {
      const meaningVal = toCleanString(parsed[k + "_meaning"]);
      slotOutputs[k] = {
        content: textVal,
        meaning: meaningVal || void 0
      };
    }
  }
  const nonVocabOutputs = Object.entries(slotOutputs).filter(([k]) => k !== "vocab").map(([, val]) => val);
  const effectiveSpoken = spoken || nonVocabOutputs[0]?.content || vocab || "";
  const effectiveSpokenMeaning = spokenMeaning || nonVocabOutputs[0]?.meaning || "";
  if (!effectiveSpoken) return null;
  return {
    spoken: effectiveSpoken,
    spokenMeaning: effectiveSpokenMeaning || void 0,
    written: written || void 0,
    writtenMeaning: writtenMeaning || void 0,
    vocab: vocab || void 0,
    summary: summary || void 0,
    slotOutputs: Object.keys(slotOutputs).length > 0 ? slotOutputs : void 0
  };
}
async function translateCore(req, options) {
  const text = (req.text || "").trim();
  const sourceLang = req.sourceLang || "en";
  const targetLang = req.targetLang || "ja";
  if (!text) {
    return { spoken: "", written: "", cached: false, shieldBypassed: false };
  }
  if (shouldShieldBypass(text)) {
    return { spoken: text, written: text, cached: false, shieldBypassed: true };
  }
  const cache = options?.cache || globalLingualCache;
  const slotSig = Array.isArray(req.slots) ? req.slots.filter((s) => s.enabled !== false).map((s) => s.id).join(",") : void 0;
  const cacheKey = LingualLruCache.buildKey(text, sourceLang, targetLang, slotSig);
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      spoken: cached.spoken,
      spokenMeaning: cached.spokenMeaning,
      written: cached.written || cached.spoken,
      writtenMeaning: cached.writtenMeaning,
      vocab: cached.vocab,
      summary: cached.summary,
      cached: true,
      shieldBypassed: false
    };
  }
  if (!options?.completer) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }
  const systemPrompt = buildSystemPrompt(
    sourceLang,
    targetLang,
    Boolean(req.isLongInput),
    req.context,
    req.tone || "general",
    req.slots
  );
  const raw = await options.completer(text, systemPrompt, options.signal);
  if (!raw) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }
  const parsed = parseLlmResponse(raw);
  if (!parsed) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }
  cache.set(cacheKey, parsed);
  const configuredSlots = Array.isArray(req.slots) ? req.slots : getDefaultSlots(sourceLang);
  const rawObj = repairAndParseJsonObject(raw) || {};
  const slotResults = [];
  for (const slot of configuredSlots) {
    if (!slot.enabled) continue;
    if (slot.role === "source") {
      slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content: text });
    } else {
      const out = parsed.slotOutputs && Object.hasOwn(parsed.slotOutputs, slot.id) ? parsed.slotOutputs[slot.id] : void 0;
      const content = out?.content || toCleanString(rawObj[slot.id]) || (slot.id === "spoken" ? parsed.spoken : slot.id === "written" ? parsed.written || "" : slot.id === "vocab" ? parsed.vocab || "" : "");
      const meaning = out?.meaning || toCleanString(rawObj[slot.id + "_meaning"]) || (slot.id === "spoken" ? parsed.spokenMeaning : slot.id === "written" ? parsed.writtenMeaning : void 0) || void 0;
      if (content) {
        slotResults.push({ id: slot.id, label: slot.label, role: slot.role || "translation", content, meaning });
      }
    }
  }
  return {
    spoken: parsed.spoken,
    spokenMeaning: parsed.spokenMeaning,
    written: parsed.written || parsed.spoken,
    writtenMeaning: parsed.writtenMeaning,
    vocab: parsed.vocab,
    summary: parsed.summary,
    slots: slotResults,
    cached: false,
    shieldBypassed: false
  };
}

// src/sanitizer.ts
var TARGETED_CLIPBOARD_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)/gi;
var LEADING_TARGETED_CLIPBOARD_REGEX = /^(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)\s*/i;
var ABSOLUTE_LONG_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t\s<>"]+[\\\/])+[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+|\/(?:[a-zA-Z0-9_\-\.]+[\\\/]){3,}[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+)/gi;
var UUID_OR_SESSION_REGEX = /(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4,16}(?:\.jsonl)?/gi;
var STACK_LINE_REGEX = /^\s*(?:at\s+(?:[\w$.<>]+|[^\s]+)\s*\(.*:\d+:\d+\)|at\s+.*:\d+:\d+|File\s+".*", line \d+, in\s+.*|goroutine \d+ \[.*\]:|Caused by:.*|^\s*\d+:\s+0x[0-9a-f]+)/;
var COMPILER_DIAGNOSTIC_REGEX = /^(?:[a-zA-Z]:[\\\/]|\.{0,2}[\\\/]|[a-zA-Z0-9_\-\.]+)[^:\r\n]+:\d+:\d+:\s*(?:error|warning|fatal error|note):/i;
var LIST_ITEM_REGEX = /^\s*(?:[-*•]|\d+[\.、)])\s+/;
function sanitizePromptForTranslation(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0
    };
  }
  let text = trimmed;
  while (LEADING_TARGETED_CLIPBOARD_REGEX.test(text)) {
    text = text.replace(LEADING_TARGETED_CLIPBOARD_REGEX, "").trim();
  }
  const inlinePathMatches = text.match(TARGETED_CLIPBOARD_PATH_REGEX);
  const extraPayloads = [];
  if (inlinePathMatches && inlinePathMatches.length > 0) {
    extraPayloads.push(...inlinePathMatches);
    text = text.replace(TARGETED_CLIPBOARD_PATH_REGEX, "").trim();
  }
  const longPathMatches = text.match(ABSOLUTE_LONG_PATH_REGEX);
  if (longPathMatches && longPathMatches.length > 0) {
    extraPayloads.push(...longPathMatches);
    text = text.replace(ABSOLUTE_LONG_PATH_REGEX, "(...)");
  }
  const uuidMatches = text.match(UUID_OR_SESSION_REGEX);
  if (uuidMatches && uuidMatches.length > 0) {
    extraPayloads.push(...uuidMatches);
    text = text.replace(UUID_OR_SESSION_REGEX, "(...)");
  }
  text = text.replace(/(?:\(\.\.\.\)\s*){2,}/g, "(...) ").trim();
  let trailingPathPayload = extraPayloads.length > 0 ? extraPayloads.join("\n") : void 0;
  if (!text) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
      rawPayload: trailingPathPayload
    };
  }
  let hasCollapsed = Boolean(longPathMatches || uuidMatches);
  text = text.replace(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g, (_match, codeContent) => {
    hasCollapsed = true;
    const codeLines = codeContent.trim().split(/\r?\n/);
    if (codeLines.length <= 1) {
      return `[${codeLines[0] || "code"}]`;
    }
    return "[code ...]";
  });
  const lines = text.split(/\r?\n/);
  const resultLines = [];
  let inStackBlock = false;
  let inDiagnosticBlock = false;
  const currentListItems = [];
  const collapsedListBlocks = [];
  const flushListItems = () => {
    const totalLength = currentListItems.reduce((acc, cur) => acc + cur.length, 0);
    if (currentListItems.length >= 2 && (currentListItems.length > 4 || totalLength > 120)) {
      hasCollapsed = true;
      resultLines.push(`[${currentListItems.length} items ...]`);
      collapsedListBlocks.push(currentListItems.join("\n"));
      currentListItems.length = 0;
    } else {
      resultLines.push(...currentListItems);
      currentListItems.length = 0;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();
    if (!lineTrim) {
      flushListItems();
      inStackBlock = false;
      inDiagnosticBlock = false;
      continue;
    }
    if (STACK_LINE_REGEX.test(lineTrim) || lineTrim.startsWith("Traceback (most recent call last):")) {
      flushListItems();
      hasCollapsed = true;
      if (!inStackBlock) {
        resultLines.push("[... stack trace ...]");
        inStackBlock = true;
      }
      continue;
    } else {
      inStackBlock = false;
    }
    if (COMPILER_DIAGNOSTIC_REGEX.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!inDiagnosticBlock) {
        resultLines.push(lineTrim);
        resultLines.push("[... diagnostics ...]");
        inDiagnosticBlock = true;
      }
      continue;
    } else {
      inDiagnosticBlock = false;
    }
    if (/^npm ERR!/i.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!resultLines[resultLines.length - 1]?.includes("npm ERR! [...]")) {
        resultLines.push("npm ERR! [...]");
      }
      continue;
    }
    if (LIST_ITEM_REGEX.test(lineTrim)) {
      currentListItems.push(line);
      continue;
    } else {
      flushListItems();
    }
    resultLines.push(line);
  }
  flushListItems();
  const distilledText = resultLines.join(" ").replace(/\s+/g, " ").trim();
  const withoutPlaceholders = distilledText.replace(/\[\.\.\.[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/g, "").replace(/[a-zA-Z0-9_\-\.\/\\:]+/g, "").trim();
  const hasCJK = isNonEnglish(distilledText);
  const hasQuestionKeywords = /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix|should|what|inspect)/i.test(distilledText);
  const isPureDiagnosticOutput = /^(?:[a-zA-Z0-9_\-\.\/\\:]+\s*-\s*error\s+[a-zA-Z0-9]+|error(?:\s+TS\d+|:)|warning:)/i.test(distilledText) && !hasQuestionKeywords;
  const isPureErrorOrDiagnostic = isPureDiagnosticOutput || /^Error:\s*[\w\s:]*\[\.\.\.\s*stack trace\s*\.\.\.\]/i.test(distilledText) && !hasQuestionKeywords;
  const cleanEnglishWords = distilledText.replace(/\[\.\.\.[^\]]*\]|\[code[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/gi, " ").trim();
  const words = cleanEnglishWords.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const hasEnglishSentence = !isPureErrorOrDiagnostic && words.length >= 4 && !distilledText.startsWith("Error:");
  const hasNaturalLanguage = (hasCJK || hasQuestionKeywords || hasEnglishSentence || withoutPlaceholders.length > 5) && !isPureErrorOrDiagnostic;
  let rawPayload;
  const payloadParts = [];
  if (trailingPathPayload) {
    payloadParts.push(trailingPathPayload);
  }
  if (hasCollapsed) {
    const codeMatch = trimmed.match(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g);
    if (codeMatch) {
      payloadParts.push(...codeMatch);
    }
    const stackLines = lines.filter(
      (l) => STACK_LINE_REGEX.test(l.trim()) || COMPILER_DIAGNOSTIC_REGEX.test(l.trim()) || l.trim().startsWith("Traceback")
    );
    if (stackLines.length > 0 && !codeMatch) {
      payloadParts.push(stackLines.join("\n"));
    }
    if (collapsedListBlocks.length > 0) {
      payloadParts.push(collapsedListBlocks.join("\n\n"));
    }
  }
  if (payloadParts.length > 0) {
    rawPayload = payloadParts.join("\n\n").trim();
  }
  return {
    distilledText,
    hasNaturalLanguage,
    hasCollapsedContent: hasCollapsed,
    naturalCharsLength: distilledText.length,
    rawPayload
  };
}
export {
  DEFAULT_KILL_LIST,
  LANGUAGE_PRESETS,
  LANGUAGE_SPECS,
  LEGACY_SLOT_PRESETS,
  LinguaLruCache,
  LingualLruCache,
  PRESET_LOADOUTS,
  PROMPT_RULE_PRESETS,
  SLOT_PRESETS,
  addCustomMode,
  addSlotToList,
  addSlotToMode,
  buildDirectRewriteSystemPrompt,
  buildModifySystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildSystemPrompt,
  compileKillListInstruction,
  createCustomSlot,
  formatModelSelectionMessage,
  formatStatusReport,
  getDefaultDirectSlots,
  getDefaultFactoryModes,
  getDefaultModifySlots,
  getDefaultPromptSlots,
  getDefaultSlots,
  getPresetLoadout,
  globalLinguaCache,
  globalLingualCache,
  interpolatePromptVariables,
  isNonEnglish,
  listPresetLoadouts,
  moveSlotInList,
  normalizePromptRules,
  parseLlmResponse,
  removeCustomMode,
  removeSlotFromList,
  removeSlotFromMode,
  repairAndParseJsonObject,
  resolveLabelsForLang,
  resolveLanguageName,
  resolvePromptRulePreset,
  resolvePromptTargetLangName,
  resolveSlotsForPreset,
  sanitizePromptForTranslation,
  shouldShieldBypass,
  toggleCustomMode,
  toggleSlotInList,
  translateCore,
  updateCustomMode,
  updateSlotInList
};
