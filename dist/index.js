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
  const isZhSource = normSource === "zh" || normSource === "tw";
  const verbExamples = isZhSource ? `"look into / check / \u770B\u770B / \u6392\u67E5" \u2794 "Inspect" / "Diagnose" / "Trace"; "clean up / tweak / \u6539\u6539 / \u91CD\u6784" \u2794 "Refactor" / "Streamline" / "Harden"; "add / create / \u52A0\u4E0A / \u505A\u4E2A" \u2794 "Implement" / "Scaffold" / "Wire up"; "remove / drop / \u5220\u6389" \u2794 "Prune" / "Deprecate" / "Strip"; "fix / \u641E\u597D" \u2794 "Fix" / "Resolve"` : `"look into / check" \u2794 "Inspect" / "Diagnose" / "Trace"; "clean up / tweak" \u2794 "Refactor" / "Streamline" / "Harden"; "add / create" \u2794 "Implement" / "Scaffold" / "Wire up"; "remove / drop" \u2794 "Prune" / "Deprecate" / "Strip"; "fix" \u2794 "Fix" / "Resolve"`;
  return `You are an elite AI Coding Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Rewrite, structure, standardize, and optimize their input into a high-efficiency, unambiguous engineering prompt in **${outLangName}**:
1. **Direct Imperative Opening (Smart Verb Sniffing)**: Start immediately with an active imperative engineering verb. Accurately map vague conversational intents to sharp, specific engineering actions (e.g., ${verbExamples}). NEVER use robotic preambles like "As an expert software engineer, please comprehensively..." or "I would like you to...".
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

// src/presets.ts
function getDefaultFactoryModes(sourceLang = "en", explainLang) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const SEED_NAMES = {
    en: { direct: "Logical Spec", liveFlow: "Live Flow", vocab: "Key Terms", fixed: "Fixed", native: "Native", takeaway: "Takeaways" },
    zh: { direct: "\u89C4\u8303\u76F4\u53D1", liveFlow: "\u5B9E\u6218\u72C2\u98D9", vocab: "\u6838\u5FC3\u8868\u8FBE", fixed: "\u539F\u53E5\u4FEE\u8865", native: "\u5730\u9053\u8868\u8FBE", takeaway: "\u6536\u83B7\u590D\u76D8" },
    tw: { direct: "\u898F\u7BC4\u76F4\u767C", liveFlow: "\u5BE6\u6230\u72C2\u98C6", vocab: "\u6838\u5FC3\u8868\u9054", fixed: "\u539F\u53E5\u4FEE\u88DC", native: "\u9053\u5730\u8868\u9054", takeaway: "\u6536\u7A6B\u8907\u76E4" },
    ja: { direct: "\u4ED5\u69D8\u76F4\u884C", liveFlow: "\u5B9F\u6226\u75BE\u8D70", vocab: "\u91CD\u8981\u8A9E\u5F59", fixed: "\u539F\u6587\u4FEE\u6B63", native: "\u81EA\u7136\u8868\u73FE", takeaway: "\u91CD\u8981\u30DD\u30A4\u30F3\u30C8" },
    ko: { direct: "\uB17C\uB9AC\uC815\uC81C", liveFlow: "\uC2E4\uC804\uC9C8\uC8FC", vocab: "\uD575\uC2EC\uC5B4\uD718", fixed: "\uC6D0\uBB38\uC218\uC815", native: "\uC790\uC5F0\uC2A4\uB7EC\uC6B4\uD45C\uD604", takeaway: "\uD575\uC2EC\uD3EC\uC778\uD2B8" },
    es: { direct: "Directo L\xF3gico", liveFlow: "Live Flow", vocab: "T\xE9rminos clave", fixed: "Corregido", native: "Nativo", takeaway: "Puntos clave" },
    fr: { direct: "Direct Logique", liveFlow: "Live Flow", vocab: "Termes cl\xE9s", fixed: "Corrig\xE9", native: "Naturel", takeaway: "Points cl\xE9s" },
    de: { direct: "Direkte Logik", liveFlow: "Live Flow", vocab: "Schl\xFCsselbegriffe", fixed: "Korrigiert", native: "Nativ", takeaway: "Wichtige Punkte" },
    ru: { direct: "\u041F\u0440\u044F\u043C\u043E\u0439 \u043F\u043E\u0442\u043E\u043A", liveFlow: "Live Flow", vocab: "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430", fixed: "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E", native: "\u041D\u0430\u0442\u0438\u0432\u043D\u044B\u0439", takeaway: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435" }
  };
  const n = SEED_NAMES[norm] || SEED_NAMES.en;
  return [
    {
      id: "direct",
      name: n.direct,
      aliases: ["lazy"],
      flow: "translate",
      action: "transform",
      hud: "preview",
      reasoning: "low",
      slots: [
        {
          id: "direct_spec",
          label: n.direct,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
          enabled: true
        },
        {
          id: "vocab",
          label: n.vocab,
          role: "vocab",
          instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) \xB7 term2 (...)'.",
          enabled: true
        }
      ],
      enabled: true
    },
    {
      id: "live-flow",
      name: n.liveFlow,
      aliases: ["raw"],
      flow: "proofread",
      action: "transform",
      hud: "adaptive-takeaway",
      reasoning: "low",
      slots: [
        {
          id: "fixed",
          label: n.fixed,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' \u2794 'want you to'), wrong prepositions/articles, and grammatical slips in the user's ${targetLang} sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "native",
          label: n.native,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "fixes",
          label: n.takeaway,
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
    notifyLangInvalid: "Invalid language code. Supported: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[en \u21C4 ja] Capsule mode enabled: single-line compact view",
    notifyCompactOff: "[en \u21C4 ja] Tree branch mode enabled: full multi-slot view",
    notifyTimeout: "[en \u21C4 ja] Prompt rewrite timed out; original prompt passed",
    notifyError: "[en \u21C4 ja] Prompt rewrite error; original prompt passed",
    cmdDescMode: "Cycle companion mode [en \u21C4 ja]: [Companion] \u2794 [Direct] \u2794 [Off]",
    cmdDescLang: "Switch language pair [en \u21C4 ja]: /lang <source> [target]",
    cmdDescLast: "Replay previous companion card: /last",
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
    statusReportShortcuts: "Shortcuts: /lingual \xB7 /slots \xB7 /lang \xB7 /last",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill",
    modeDescOriginal: "Companion \xB7 0ms pass-through",
    modeDescEnglish: "Direct \xB7 Deep code reasoning",
    modeDescOff: "Disabled",
    modelCurrentLabel: "Current companion model",
    modelFollowSession: "follow session",
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
    notifyLangInvalid: "\u65E0\u6548\u7684\u8BED\u8A00\u4EE3\u7801\u3002\u652F\u6301: zh, tw, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[zh \u21C4 en] \u5DF2\u5F00\u542F\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\uFF1A\u6781\u7B80\u5360\u4F4D",
    notifyCompactOff: "[zh \u21C4 en] \u5DF2\u5207\u6362\u4E3A\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784\uFF1A\u5C55\u793A\u5B8C\u6574\u591A\u69FD\u4E0E\u8BED\u611F",
    notifyTimeout: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u672A\u5C31\u7EEA\u6216\u8D85\u65F6\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u5F02\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    cmdDescMode: "\u5207\u6362\u4F34\u5B66\u6A21\u5F0F: /lingual",
    cmdDescLang: "\u5207\u6362\u4F34\u5B66\u8BED\u8A00: /lang <code>",
    cmdDescLast: "\u56DE\u770B\u4E0A\u4E00\u6761\u5361\u7247: /last",
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
    cmdDescLang: "\u8A00\u8A9E\u5207\u66FF: /lang <code>",
    cmdDescLast: "\u524D\u56DE\u30AB\u30FC\u30C9\u518D\u8868\u793A: /last",
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
  },
  es: {
    slot1Label: "Coloquial",
    slot2Label: "Escrito",
    vocabLabel: "Vocab",
    sourceLabel: "Original",
    hudTitle: "es \u21C4 en",
    statusOriginal: "es \u21C4 en",
    statusEnglish: "es \u21C4 en",
    statusOff: "es \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[es \u21C4 en] Cambiado al modo [Original]: El texto se env\xEDa sin modificar",
    notifyEnglish: "[es \u21C4 en] Cambiado al modo [Ingl\xE9s]: El texto se transforma en ingl\xE9s t\xE9cnico",
    notifyOff: "[es \u21C4 en] Asistente desactivado",
    notifyPaging: "[es \u21C4 en] Texto largo segmentado. Presione Alt+. o Alt+, para navegar",
    notifyNoHistory: "[es \u21C4 en] No hay registros anteriores",
    notifyHistoryRestored: "[es \u21C4 en] Tarjeta anterior restaurada",
    notifyAgentHelp: '\u{1F4A1} Habilidad lingual-tuner integrada: Simplemente p\xEDdale a su Agente "Personaliza el asistente: solo tuit y an\xE1lisis, sin texto original" para configurar las ranuras al instante. Cambie de idioma con /lang <code>.',
    notifyModelSwitched: "Modelo cambiado a: {model}",
    notifyLangSwitched: "Idioma nativo cambiado a: {lang} (Nota: Las descripciones del men\xFA de comandos se actualizar\xE1n tras reiniciar la terminal)",
    notifyLangInvalid: "C\xF3digo de idioma no v\xE1lido. Admitidos: zh, ja, en, es, fr, de",
    notifyCompactOn: "[es \u21C4 en] Modo c\xE1psula de una l\xEDnea activado",
    notifyCompactOff: "[es \u21C4 en] Modo \xE1rbol completo restaurado",
    notifySlotSwitched: "[es \u21C4 en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es \u21C4 en] La traducci\xF3n al ingl\xE9s agot\xF3 el tiempo; se envi\xF3 el texto original",
    notifyError: "[es \u21C4 en] Error en la traducci\xF3n al ingl\xE9s; se envi\xF3 el texto original",
    cmdDescMode: "Cambiar modo [es \u21C4 en]: [Original] \u2794 [Ingl\xE9s] \u2794 [Apagado]",
    cmdDescStatus: "Mostrar diagn\xF3stico y estado del modelo: /lingual-status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual-model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma nativo: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Alternar modo c\xE1psula de una l\xEDnea: /lingual-compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual-last",
    cmdDescAgent: "Ver gu\xEDa de personalizaci\xF3n y cambio de idioma: /lingual-agent",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",
    capsuleSlot1Prefix: "Col",
    capsuleSlot2Prefix: "Esc",
    layoutCapsule: "C\xE1psula de una l\xEDnea (1-Line Capsule)",
    layoutTree: "Trifecta \xE1rbol de gu\xEDa izquierda (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Informe de estado",
    statusReportMode: "Modo actual",
    statusReportFlow: "Flujo de idiomas",
    statusReportModel: "Modelo asistente",
    statusReportCache: "Cach\xE9 de sesi\xF3n",
    statusReportLayout: "Dise\xF1o HUD: Trifecta \xE1rbol de gu\xEDa izquierda (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Autenticaci\xF3n: Proceso nativo de Pi (Sin config \xB7 Seguro)",
    statusReportShortcuts: "Accesos directos: /lingual (modo) \xB7 /slots (ranuras) \xB7 /lang (idioma) \xB7 /lingual-compact (dise\xF1o)",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo \xB7 0ms no bloqueante",
    modeDescEnglish: "Modo ingl\xE9s \xB7 Razonamiento profundo",
    modeDescOff: "Apagado",
    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesi\xF3n",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Sigue autom\xE1ticamente el modelo de la sesi\xF3n)",
    modelSelectHint: "Use /lingual-model <id> o auto para asignar un modelo.",
    langUsageHint: "Uso: /lang <zh|ja|en|es|fr|de> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "\u2022 zh (Chino \u2794 Ingl\xE9s)",
      "\u2022 ja (Japon\xE9s \u2794 Ingl\xE9s)",
      "\u2022 en (Ingl\xE9s \u2794 Japon\xE9s)",
      "\u2022 es (Espa\xF1ol \u2794 Ingl\xE9s)",
      "\u2022 fr (Franc\xE9s \u2794 Ingl\xE9s)",
      "\u2022 de (Alem\xE1n \u2794 Ingl\xE9s)"
    ],
    // Ranuras dinámicas (Español)
    slotsHeader: "Arquitectura de ranuras din\xE1micas",
    slotsActiveTag: "activas",
    slotsNone: "No hay ranuras configuradas",
    slotsStatusEnabled: "activada",
    slotsStatusDisabled: "desactivada",
    slotsWithNuance: " +matiz",
    slotsNlTitle: "\u{1F4AC} Personalizaci\xF3n con lenguaje natural (consulte a su Agente directamente):",
    slotsNlExamples: [
      '\u2022 "Personaliza el asistente: solo tuit y an\xE1lisis profundo, sin texto original"',
      '\u2022 "Cambia el asistente a traducci\xF3n limpia de una sola ranura"',
      '\u2022 "Restablece las ranuras predeterminadas"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Comandos CLI r\xE1pidos:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Ocultar la fila de texto original",
      "\u2022 /slots compact2        - Ranura doble m\xEDnima",
      "\u2022 /slots reset           - Restablecer valores predeterminados",
      "\u2022 /slots toggle <id>     - Activar/desactivar ranura"
    ],
    slotsResetSuccess: "[{pair}] Ranuras restablecidas a los valores predeterminados",
    slotsRemovedSuccess: '[{pair}] Ranura [{id}] ("{label}") eliminada',
    slotsRemovedSourceNote: " (La l\xEDnea de texto original ya no aparecer\xE1)",
    slotsToggled: "[{pair}] La ranura [{id}] ahora est\xE1: {status}",
    slotsAdded: '[{pair}] Ranura [{id}] "{label}" agregada/actualizada',
    slotsNotFound: "[{pair}] No se encontr\xF3 la ranura [{id}]. Ejecute /slots para inspeccionar",
    slotsUsageAdd: "Uso: /slots add <id> <etiqueta> [instrucci\xF3n...]",
    slotsUsageRm: "Uso: /slots rm <id_ranura>",
    slotsUsageToggle: "Uso: /slots toggle <id_ranura>",
    slotsUnknown: '[{pair}] Comando o ajuste preestablecido desconocido "{cmd}". Escriba /slots para ver la ayuda'
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "\xC9crit",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "fr \u21C4 en",
    statusOriginal: "fr \u21C4 en",
    statusEnglish: "fr \u21C4 en",
    statusOff: "fr \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[fr \u21C4 en] Mode [Original] activ\xE9 : Votre texte reste inchang\xE9",
    notifyEnglish: "[fr \u21C4 en] Mode [Anglais] activ\xE9 : Votre prompt est traduit en anglais technique",
    notifyOff: "[fr \u21C4 en] Compagnon d\xE9sactiv\xE9",
    notifyPaging: "[fr \u21C4 en] Long texte segment\xE9. Appuyez sur Alt+. ou Alt+, pour parcourir",
    notifyNoHistory: "[fr \u21C4 en] Aucun historique pr\xE9c\xE9dent",
    notifyHistoryRestored: "[fr \u21C4 en] Carte pr\xE9c\xE9dente restaur\xE9e",
    notifyAgentHelp: '\u{1F4A1} Comp\xE9tence lingual-tuner int\xE9gr\xE9e : Dites simplement \xE0 votre Agent "Personnalise le compagnon : uniquement tweet et analyse, sans texte original" pour ajuster les emplacements. Changez de langue avec /lang <code>.',
    notifyModelSwitched: "Mod\xE8le chang\xE9 pour : {model}",
    notifyLangSwitched: "Langue maternelle chang\xE9e en : {lang} (Note : L'autocompl\xE9tion des commandes sera actualis\xE9e apr\xE8s red\xE9marrage du terminal)",
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, ja, en, es, fr, de",
    notifyCompactOn: "[fr \u21C4 en] Mode capsule sur une seule ligne activ\xE9",
    notifyCompactOff: "[fr \u21C4 en] Mode arborescence compl\xE8te restaur\xE9",
    notifyTimeout: "[fr \u21C4 en] La traduction en anglais a expir\xE9 ; le prompt original a \xE9t\xE9 transmis",
    notifyError: "[fr \u21C4 en] Erreur de traduction en anglais ; le prompt original a \xE9t\xE9 transmis",
    cmdDescMode: "Changer de mode [fr \u21C4 en]: [Original] \u2794 [Anglais] \u2794 [D\xE9sactiv\xE9]",
    cmdDescStatus: "Afficher le rapport d'\xE9tat et le diagnostic: /lingual-status",
    cmdDescModel: "Consulter ou changer de mod\xE8le: /lingual-model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue maternelle: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne: /lingual-compact",
    cmdDescLast: "R\xE9afficher la carte pr\xE9c\xE9dente: /lingual-last",
    cmdDescAgent: "Afficher le guide de personnalisation et de changement de langue : /lingual-agent",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment pr\xE9c\xE9dent",
    capsuleSlot1Prefix: "Oral",
    capsuleSlot2Prefix: "\xC9crit",
    layoutCapsule: "Capsule sur une ligne (1-Line Capsule)",
    layoutTree: "Disposition HUD : Arbre guide gauche Trifecta (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Rapport d'\xE9tat",
    statusReportMode: "Mode actuel",
    statusReportFlow: "Flux linguistique",
    statusReportModel: "Mod\xE8le compagnon",
    statusReportCache: "Cache de session",
    statusReportLayout: "Disposition HUD : Arbre guide gauche Trifecta (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Authentification : Processus interne Pi natif (Z\xE9ro config \xB7 S\xE9curis\xE9)",
    statusReportShortcuts: "Raccourcis : /lingual (mode) \xB7 /slots (emplacements) \xB7 /lang (langue) \xB7 /lingual-compact (mise en page)",
    statusReportTuner: "Ajustement d'emplacements : Comp\xE9tence lingual-tuner int\xE9gr\xE9e (d\xE9crivez vos pr\xE9f\xE9rences \xE0 l'Agent)",
    modeDescOriginal: "Passerelle directe \xB7 0ms non bloquant",
    modeDescEnglish: "Mode anglais \xB7 Raisonnement approfondi",
    modeDescOff: "D\xE9sactiv\xE9",
    modelCurrentLabel: "Mod\xE8le actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Mod\xE8les disponibles (tapez /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le mod\xE8le principal)",
    modelSelectHint: "Entrez /lingual-model <id> ou auto pour d\xE9finir le mod\xE8le.",
    langUsageHint: "Utilisation : /lang <zh|ja|en|es|fr|de> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "\u2022 zh (Chinois \u2794 Anglais)",
      "\u2022 ja (Japonais \u2794 Anglais)",
      "\u2022 en (Anglais \u2794 Japonais)",
      "\u2022 es (Espagnol \u2794 Anglais)",
      "\u2022 fr (Fran\xE7ais \u2794 Anglais)",
      "\u2022 de (Allemand \u2794 Anglais)"
    ],
    // Emplacements dynamiques (Français)
    slotsHeader: "Architecture d'emplacements dynamiques",
    slotsActiveTag: "actifs",
    slotsNone: "Aucun emplacement configur\xE9",
    slotsStatusEnabled: "activ\xE9",
    slotsStatusDisabled: "d\xE9sactiv\xE9",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Personnalisation en langage naturel (demandez \xE0 votre Agent) :",
    slotsNlExamples: [
      '\u2022 "Personnalise le compagnon : uniquement tweet et analyse approfondie, sans texte original"',
      '\u2022 "Passe le compagnon \xE0 une traduction unique \xE9pur\xE9e"',
      '\u2022 "R\xE9initialise les emplacements par d\xE9faut"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Commandes CLI rapides :",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Masquer la ligne de texte source",
      "\u2022 /slots compact2        - Double emplacement minimal",
      "\u2022 /slots reset           - R\xE9initialiser par d\xE9faut",
      "\u2022 /slots toggle <id>     - Activer/d\xE9sactiver l'emplacement"
    ],
    slotsResetSuccess: "[{pair}] Emplacements r\xE9initialis\xE9s par d\xE9faut",
    slotsRemovedSuccess: '[{pair}] Emplacement [{id}] ("{label}") supprim\xE9',
    slotsRemovedSourceNote: " (La ligne source ne sera plus affich\xE9e)",
    slotsToggled: "[{pair}] L'emplacement [{id}] est maintenant : {status}",
    slotsAdded: '[{pair}] Emplacement [{id}] "{label}" ajout\xE9/mis \xE0 jour',
    slotsNotFound: "[{pair}] Emplacement [{id}] introuvable. Ex\xE9cutez /slots pour v\xE9rifier",
    slotsUsageAdd: "Utilisation : /slots add <id> <\xE9tiquette> [instruction...]",
    slotsUsageRm: "Utilisation : /slots rm <id_emplacement>",
    slotsUsageToggle: "Utilisation : /slots toggle <id_emplacement>",
    slotsUnknown: `[{pair}] Commande ou pr\xE9r\xE9glage inconnu "{cmd}". Tapez /slots pour afficher l'aide`
  },
  de: {
    slot1Label: "Gesprochen",
    slot2Label: "Schriftlich",
    vocabLabel: "Wortschatz",
    sourceLabel: "Quelle",
    hudTitle: "de \u21C4 en",
    statusOriginal: "de \u21C4 en",
    statusEnglish: "de \u21C4 en",
    statusOff: "de \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[de \u21C4 en] Modus [Original] aktiviert: Eingabe wird unver\xE4ndert weitergeleitet",
    notifyEnglish: "[de \u21C4 en] Modus [Englisch] aktiviert: Eingabe wird in technisches Englisch \xFCbersetzt",
    notifyOff: "[de \u21C4 en] Begleiter deaktiviert",
    notifyPaging: "[de \u21C4 en] Langer Text segmentiert. Mit Alt+. oder Alt+, bl\xE4ttern",
    notifyNoHistory: "[de \u21C4 en] Kein vorheriger Eintrag vorhanden",
    notifyHistoryRestored: "[de \u21C4 en] Vorherige Karte wiederhergestellt",
    notifyAgentHelp: '\u{1F4A1} Integrierter lingual-tuner Skill: Sagen Sie Ihrem Agenten einfach "Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext", um Slots anzupassen. Sprache wechseln mit /lang <code>.',
    notifyModelSwitched: "Modell gewechselt zu: {model}",
    notifyLangSwitched: "Muttersprache ge\xE4ndert zu: {lang} (Hinweis: Befehlsbeschreibungen werden nach dem Terminal-Neustart vollst\xE4ndig aktualisiert)",
    notifyLangInvalid: "Ung\xFCltiger Sprachcode. Unterst\xFCtzt: zh, ja, en, es, fr, de",
    notifyCompactOn: "[de \u21C4 en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de \u21C4 en] Vollst\xE4ndige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de \u21C4 en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de \u21C4 en] Englische \xDCbersetzung hat das Zeitlimit \xFCberschritten; Originaltext wurde \xFCbergeben",
    notifyError: "[de \u21C4 en] Fehler bei der englischen \xDCbersetzung; Originaltext wurde \xFCbergeben",
    cmdDescMode: "Modus umschalten [de \u21C4 en]: [Original] \u2794 [Englisch] \u2794 [Aus]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual-status",
    cmdDescModel: "Modell pr\xFCfen oder wechseln: /lingual-model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual-compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual-last",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual-agent",
    shortcutNextPage: "Zum n\xE4chsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",
    capsuleSlot1Prefix: "Ges",
    capsuleSlot2Prefix: "Sch",
    layoutCapsule: "Einzeilige Kapsel (1-Line Capsule)",
    layoutTree: "HUD-Layout: Trifecta Minimalistische Baumstruktur (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Statusbericht",
    statusReportMode: "Aktueller Modus",
    statusReportFlow: "Sprachfluss",
    statusReportModel: "Begleitmodell",
    statusReportCache: "Sitzungscache",
    statusReportLayout: "HUD-Layout: Trifecta Minimalistische Baumstruktur (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Authentifizierung: Pi nativer In-Process Modus (Zero Config \xB7 Sicher)",
    statusReportShortcuts: "Befehle: /lingual (Modus) \xB7 /slots (Slots) \xB7 /lang (Sprache) \xB7 /lingual-compact (Layout)",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Pr\xE4ferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt \xB7 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus \xB7 Tiefgreifende Logik",
    modeDescOff: "Aus",
    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verf\xFCgbare Modelle (/lingual-model <id> ausf\xFChren):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual-model <id> oder auto ein.",
    langUsageHint: "Verwendung: /lang <zh|ja|en|es|fr|de> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "\u2022 zh (Chinesisch \u2794 Englisch)",
      "\u2022 ja (Japanisch \u2794 Englisch)",
      "\u2022 en (Englisch \u2794 Japanisch)",
      "\u2022 es (Spanisch \u2794 Englisch)",
      "\u2022 fr (Franz\xF6sisch \u2794 Englisch)",
      "\u2022 de (Deutsch \u2794 Englisch)"
    ],
    // Dynamische Slot-Architektur (Deutsch)
    slotsHeader: "Dynamische Slot-Architektur",
    slotsActiveTag: "aktiv",
    slotsNone: "Keine Slots konfiguriert",
    slotsStatusEnabled: "aktiviert",
    slotsStatusDisabled: "deaktiviert",
    slotsWithNuance: " +Nuance",
    slotsNlTitle: "\u{1F4AC} Anpassung in nat\xFCrlicher Sprache (fragen Sie Ihren Agenten direkt):",
    slotsNlExamples: [
      '\u2022 "Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext"',
      '\u2022 "Stellen Sie auf reine einzeilige \xDCbersetzung um"',
      '\u2022 "Slots auf Standard zur\xFCcksetzen"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Schnelle CLI-Befehle:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Originaltextzeile ausblenden",
      "\u2022 /slots compact2        - Minimaler Doppel-Slot",
      "\u2022 /slots reset           - Auf Standard zur\xFCcksetzen",
      "\u2022 /slots toggle <id>     - Slot aktivieren/deaktivieren"
    ],
    slotsResetSuccess: "[{pair}] Slots auf Standard zur\xFCckgesetzt",
    slotsRemovedSuccess: '[{pair}] Slot [{id}] ("{label}") entfernt',
    slotsRemovedSourceNote: " (Originaltextzeile wird nicht mehr angezeigt)",
    slotsToggled: "[{pair}] Slot [{id}] ist jetzt: {status}",
    slotsAdded: '[{pair}] Slot [{id}] "{label}" hinzugef\xFCgt/aktualisiert',
    slotsNotFound: "[{pair}] Slot [{id}] nicht gefunden. F\xFChren Sie /slots aus",
    slotsUsageAdd: "Verwendung: /slots add <id> <Label> [Anweisung...]",
    slotsUsageRm: "Verwendung: /slots rm <Slot-ID>",
    slotsUsageToggle: "Verwendung: /slots toggle <Slot-ID>",
    slotsUnknown: '[{pair}] Unbekannter Befehl oder Preset "{cmd}". /slots f\xFCr Hilfe eingeben'
  },
  ko: {
    slot1Label: "\uAD6C\uC5B4\uCCB4",
    slot2Label: "\uBB38\uC5B4\uCCB4",
    vocabLabel: "\uD575\uC2EC\uD45C\uD604",
    sourceLabel: "\uC6D0\uBB38",
    hudTitle: "ko \u21C4 en",
    statusOriginal: "ko \u21C4 en",
    statusEnglish: "ko \u21C4 en",
    statusOff: "ko \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ko \u21C4 en] [\uC6D0\uBB38 \uBAA8\uB4DC] \uD65C\uC131\uD654: \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB429\uB2C8\uB2E4",
    notifyEnglish: "[ko \u21C4 en] [\uC601\uC5B4 \uBAA8\uB4DC] \uD65C\uC131\uD654: \uAE30\uC220 \uC601\uC5B4\uB85C \uC790\uB3D9 \uBCC0\uD658\uB418\uC5B4 \uC804\uB2EC\uB429\uB2C8\uB2E4",
    notifyOff: "[ko \u21C4 en] \uB3D9\uBC18 \uBAA8\uB4DC \uAEBC\uC9D0",
    notifyPaging: "[ko \u21C4 en] \uC7A5\uBB38 \uBD84\uD560\uB428. Alt+. \uB610\uB294 Alt+, \uD0A4\uB85C \uD0D0\uC0C9",
    notifyNoHistory: "[ko \u21C4 en] \uC774\uC804 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    notifyHistoryRestored: "[ko \u21C4 en] \uC774\uC804 \uCE74\uB4DC\uAC00 \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    notifyAgentHelp: '\u{1F4A1} lingual-tuner \uAE30\uB2A5 \uB0B4\uC7A5: \uC5D0\uC774\uC804\uD2B8\uC5D0\uAC8C "\uC6D0\uBB38 \uC5C6\uC774 \uD575\uC2EC \uC694\uC57D\uB9CC \uD45C\uC2DC\uD574\uC918"\uB77C\uACE0 \uC694\uCCAD\uD558\uBA74 \uC790\uB3D9 \uC124\uC815\uB429\uB2C8\uB2E4.',
    notifyModelSwitched: "\uB3D9\uBC18 \uBAA8\uB378 \uBCC0\uACBD\uB428: {model}",
    notifyLangSwitched: "\uBAA8\uAD6D\uC5B4 \uBCC0\uACBD\uB428: {lang}",
    notifyLangInvalid: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC5B8\uC5B4 \uCF54\uB4DC\uC785\uB2C8\uB2E4. \uC9C0\uC6D0: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ko \u21C4 en] \uB2E8\uC77C \uD589 \uCEA1\uC290 \uBAA8\uB4DC \uCF1C\uC9D0",
    notifyCompactOff: "[ko \u21C4 en] \uD2B8\uB9AC \uB808\uC774\uC544\uC6C3 \uBCF5\uC6D0\uB428",
    notifyTimeout: "[ko \u21C4 en] \uBC88\uC5ED \uC2DC\uAC04 \uCD08\uACFC; \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    notifyError: "[ko \u21C4 en] \uBC88\uC5ED \uC624\uB958; \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    cmdDescMode: "\uBAA8\uB4DC \uC804\uD658 [ko \u21C4 en]: [\uC6D0\uBB38] \u2794 [\uC601\uC5B4] \u2794 [\uB054]",
    cmdDescStatus: "\uC0C1\uD0DC \uBCF4\uACE0\uC11C \uBC0F \uC9C4\uB2E8 \uD655\uC778: /lingual-status",
    cmdDescModel: "\uBAA8\uB378 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual-model [model-id|auto]",
    cmdDescLang: "\uBAA8\uAD6D\uC5B4 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual-lang",
    cmdDescSlots: "\uC2AC\uB86F \uAD6C\uC131 \uBCC0\uACBD: /slots",
    cmdDescCompact: "\uB2E8\uC77C \uD589 \uCEA1\uC290 \uBAA8\uB4DC \uD1A0\uAE00: /lingual-compact",
    cmdDescLast: "\uC774\uC804 \uCE74\uB4DC \uB2E4\uC2DC \uBCF4\uAE30: /lingual-last",
    cmdDescAgent: "\uC0AC\uC6A9\uC790 \uC124\uC815 \uAC00\uC774\uB4DC: /lingual-agent",
    shortcutNextPage: "\uB2E4\uC74C \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
    shortcutPrevPage: "\uC774\uC804 \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
    capsuleSlot1Prefix: "\uAD6C",
    capsuleSlot2Prefix: "\uBB38",
    layoutCapsule: "\uB2E8\uC77C \uD589 \uCEA1\uC290 (1-Line Capsule)",
    layoutTree: "Trifecta \uC88C\uCE21 \uB808\uC77C \uD2B8\uB9AC (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\uC0C1\uD0DC \uBCF4\uACE0\uC11C",
    statusReportMode: "\uD604\uC7AC \uBAA8\uB4DC",
    statusReportFlow: "\uC5B8\uC5B4 \uD750\uB984",
    statusReportModel: "\uB3D9\uBC18 \uBAA8\uB378",
    statusReportCache: "\uC138\uC158 \uCE90\uC2DC",
    statusReportLayout: "HUD \uB808\uC774\uC544\uC6C3: Trifecta \uC88C\uCE21 \uB808\uC77C \uD2B8\uB9AC (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\uC778\uC99D \uBAA8\uB4DC: Pi \uD504\uB85C\uC138\uC2A4 \uB0B4 \uC9C1\uC811 \uC778\uC99D (Zero Config)",
    statusReportShortcuts: "\uBA85\uB839\uC5B4: /lingual (\uBAA8\uB4DC) \xB7 /slots (\uC2AC\uB86F) \xB7 /lang (\uC5B8\uC5B4) \xB7 /lingual-compact (\uB808\uC774\uC544\uC6C3)",
    statusReportTuner: "\uC2AC\uB86F \uD29C\uB108: lingual-tuner \uB0B4\uC7A5",
    modeDescOriginal: "\uC6D0\uBB38 \uC9C1\uD1B5 \xB7 0ms \uBE44\uCC28\uB2E8",
    modeDescEnglish: "\uC601\uC5B4 \uBAA8\uB4DC \xB7 \uC2EC\uCE35 \uCF54\uB4DC \uCD94\uB860",
    modeDescOff: "\uAEBC\uC9D0",
    modelCurrentLabel: "\uD604\uC7AC \uBAA8\uB378",
    modelFollowSession: "\uC138\uC158 \uB530\uB984",
    modelAvailableListHeader: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBAA8\uB378 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (\uD604\uC7AC \uC138\uC158 \uC8FC \uBAA8\uB378 \uC790\uB3D9 \uCD94\uC885)",
    modelSelectHint: "/lingual-model <id> \uB610\uB294 auto \uC9C0\uC815.",
    langUsageHint: "\uC0AC\uC6A9\uBC95: /lang <\uCF54\uB4DC> [\uBAA9\uD45C\uC5B8\uC5B4]",
    langList: [
      "\u2022 zh (\uC911\uAD6D\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 ja (\uC77C\uBCF8\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 en (\uC601\uC5B4 \u2794 \uC77C\uBCF8\uC5B4/\uD55C\uAD6D\uC5B4)",
      "\u2022 ko (\uD55C\uAD6D\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 es (\uC2A4\uD398\uC778\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 fr (\uD504\uB791\uC2A4\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 de (\uB3C5\uC77C\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 ru (\uB7EC\uC2DC\uC544\uC5B4 \u2794 \uC601\uC5B4)"
    ],
    slotsHeader: "\uB3D9\uC801 \uC2AC\uB86F \uC544\uD0A4\uD14D\uCC98",
    slotsActiveTag: "\uD65C\uC131",
    slotsNone: "\uAD6C\uC131\uB41C \uC2AC\uB86F \uC5C6\uC74C",
    slotsStatusEnabled: "\uD65C\uC131\uD654\uB428",
    slotsStatusDisabled: "\uBE44\uD65C\uC131\uD654\uB428",
    slotsWithNuance: " +\uB258\uC559\uC2A4",
    slotsNlTitle: "\u{1F4AC} \uC790\uC5F0\uC5B4 \uC124\uC815:",
    slotsNlExamples: [
      '\u2022 "\uC6D0\uBB38 \uC5C6\uC774 \uCE90\uC8FC\uC5BC\uACFC \uACA9\uC2DD\uCCB4\uB9CC \uBCF4\uC5EC\uC918"',
      '\u2022 "\uB2E8\uC77C \uD589 \uC21C\uC218 \uBC88\uC5ED\uC73C\uB85C \uBCC0\uACBD\uD574\uC918"',
      '\u2022 "\uAE30\uBCF8 \uC2AC\uB86F\uC73C\uB85C \uBCF5\uC6D0\uD574\uC918"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \uBE60\uB978 CLI \uBA85\uB839\uC5B4:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \uC6D0\uBB38 \uD589 \uC228\uAE30\uAE30",
      "\u2022 /slots compact2        - \uCD5C\uC18C \uB4C0\uC5BC \uC2AC\uB86F",
      "\u2022 /slots reset           - \uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0",
      "\u2022 /slots toggle <id>     - \uC2AC\uB86F \uCF1C\uAE30/\uB044\uAE30"
    ],
    slotsResetSuccess: "[{pair}] \uC2AC\uB86F\uC774 \uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    slotsRemovedSuccess: '[{pair}] \uC2AC\uB86F [{id}] ("{label}") \uC81C\uAC70\uB428',
    slotsRemovedSourceNote: " (\uC6D0\uBB38 \uD589\uC774 \uB354 \uC774\uC0C1 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4)",
    slotsToggled: "[{pair}] \uC2AC\uB86F [{id}] \uC0C1\uD0DC: {status}",
    slotsAdded: '[{pair}] \uC2AC\uB86F [{id}] "{label}" \uCD94\uAC00/\uC5C5\uB370\uC774\uD2B8\uB428',
    slotsNotFound: "[{pair}] \uC2AC\uB86F [{id}]\uC744(\uB97C) \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    slotsUsageAdd: "\uC0AC\uC6A9\uBC95: /slots add <id> <\uB77C\uBCA8> [\uD504\uB86C\uD504\uD2B8...]",
    slotsUsageRm: "\uC0AC\uC6A9\uBC95: /slots rm <\uC2AC\uB86F_id>",
    slotsUsageToggle: "\uC0AC\uC6A9\uBC95: /slots toggle <\uC2AC\uB86F_id>",
    slotsUnknown: '[{pair}] \uC54C \uC218 \uC5C6\uB294 \uBA85\uB839\uC5B4 "{cmd}". /slots \uB3C4\uC6C0\uB9D0 \uCC38\uC870'
  },
  ru: {
    slot1Label: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439",
    slot2Label: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439",
    vocabLabel: "\u041B\u0435\u043A\u0441\u0438\u043A\u0430",
    sourceLabel: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    hudTitle: "ru \u21C4 en",
    statusOriginal: "ru \u21C4 en",
    statusEnglish: "ru \u21C4 en",
    statusOff: "ru \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ru \u21C4 en] \u0420\u0435\u0436\u0438\u043C [\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B]: \u0432\u0430\u0448 \u0442\u0435\u043A\u0441\u0442 \u043F\u0435\u0440\u0435\u0434\u0430\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439",
    notifyEnglish: "[ru \u21C4 en] \u0420\u0435\u0436\u0438\u043C [\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439]: \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0438\u0442\u0441\u044F \u043D\u0430 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    notifyOff: "[ru \u21C4 en] \u041F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D",
    notifyPaging: "[ru \u21C4 en] \u0414\u043B\u0438\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0440\u0430\u0437\u0431\u0438\u0442 \u043D\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u044B. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Alt+. \u0438\u043B\u0438 Alt+,",
    notifyNoHistory: "[ru \u21C4 en] \u041D\u0435\u0442 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0439 \u0437\u0430\u043F\u0438\u0441\u0438",
    notifyHistoryRestored: "[ru \u21C4 en] \u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430",
    notifyAgentHelp: "\u{1F4A1} \u041D\u0430\u0432\u044B\u043A lingual-tuner: \u043F\u0440\u043E\u0441\u0442\u043E \u0441\u043A\u0430\u0436\u0438\u0442\u0435 \u0410\u0433\u0435\u043D\u0442\u0443 \u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u043B\u043E\u0442\u044B \u0431\u0435\u0437 \u0440\u0443\u0447\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434.",
    notifyModelSwitched: "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u043D\u0430: {model}",
    notifyLangSwitched: "\u042F\u0437\u044B\u043A \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D \u043D\u0430: {lang}",
    notifyLangInvalid: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434 \u044F\u0437\u044B\u043A\u0430. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ru \u21C4 en] \u041E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043A\u0430\u043F\u0441\u0443\u043B\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D",
    notifyCompactOff: "[ru \u21C4 en] \u041F\u043E\u043B\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    notifyTimeout: "[ru \u21C4 en] \u0412\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u043E; \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    notifyError: "[ru \u21C4 en] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430; \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    cmdDescMode: "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C [ru \u21C4 en]: [\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B] \u2794 [\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439] \u2794 [\u0412\u044B\u043A\u043B]",
    cmdDescStatus: "\u041E\u0442\u0447\u0435\u0442 \u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0438 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430: /lingual-status",
    cmdDescModel: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C: /lingual-model [model-id|auto]",
    cmdDescLang: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u044F\u0437\u044B\u043A: /lingual-lang",
    cmdDescSlots: "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u043B\u043E\u0442\u044B: /slots",
    cmdDescCompact: "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C \u043A\u0430\u043F\u0441\u0443\u043B\u044B: /lingual-compact",
    cmdDescLast: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0443\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443: /lingual-last",
    cmdDescAgent: "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043F\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435: /lingual-agent",
    shortcutNextPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
    shortcutPrevPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
    capsuleSlot1Prefix: "\u0420\u0430\u0437\u0433",
    capsuleSlot2Prefix: "\u0414\u0435\u043B",
    layoutCapsule: "\u041E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u0430\u044F \u043A\u0430\u043F\u0441\u0443\u043B\u0430 (1-Line Capsule)",
    layoutTree: "Trifecta \u043B\u0435\u0432\u043E\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u041E\u0442\u0447\u0435\u0442 \u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438",
    statusReportMode: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043C",
    statusReportFlow: "\u041F\u043E\u0442\u043E\u043A \u044F\u0437\u044B\u043A\u043E\u0432",
    statusReportModel: "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A\u0430",
    statusReportCache: "\u041A\u044D\u0448 \u0441\u0435\u0441\u0441\u0438\u0438",
    statusReportLayout: "HUD: Trifecta \u043B\u0435\u0432\u043E\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u0410\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F: \u0412\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0446\u0435\u0441\u0441 Pi (Zero Config)",
    statusReportShortcuts: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B: /lingual (\u0440\u0435\u0436\u0438\u043C) \xB7 /slots (\u0441\u043B\u043E\u0442\u044B) \xB7 /lang (\u044F\u0437\u044B\u043A)",
    statusReportTuner: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0441\u043B\u043E\u0442\u043E\u0432: \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043D\u0430\u0432\u044B\u043A lingual-tuner",
    modeDescOriginal: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B \xB7 0\u043C\u0441 \u0431\u0435\u0437 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438",
    modeDescEnglish: "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \xB7 \u0433\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u0440\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435",
    modeDescOff: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    modelCurrentLabel: "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C",
    modelFollowSession: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0441\u0435\u0441\u0441\u0438\u0435\u0439",
    modelAvailableListHeader: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u0441\u0435\u0441\u0441\u0438\u0438)",
    modelSelectHint: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /lingual-model <id> \u0438\u043B\u0438 auto.",
    langUsageHint: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /lang <\u043A\u043E\u0434> [\u0446\u0435\u043B\u0435\u0432\u043E\u0439_\u044F\u0437\u044B\u043A]",
    langList: [
      "\u2022 zh (\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 ja (\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 en (\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u2794 \u0420\u0443\u0441\u0441\u043A\u0438\u0439/\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439)",
      "\u2022 ko (\u041A\u043E\u0440\u0435\u0439\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 es (\u0418\u0441\u043F\u0430\u043D\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 fr (\u0424\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 de (\u041D\u0435\u043C\u0435\u0446\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 ru (\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)"
    ],
    slotsHeader: "\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0430 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0441\u043B\u043E\u0442\u043E\u0432",
    slotsActiveTag: "\u0430\u043A\u0442\u0438\u0432\u043D\u044B",
    slotsNone: "\u0421\u043B\u043E\u0442\u044B \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B",
    slotsStatusEnabled: "\u0432\u043A\u043B\u044E\u0447\u0435\u043D",
    slotsStatusDisabled: "\u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D",
    slotsWithNuance: " +\u043D\u044E\u0430\u043D\u0441",
    slotsNlTitle: "\u{1F4AC} \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u043C \u044F\u0437\u044B\u043A\u043E\u043C:",
    slotsNlExamples: [
      '\u2022 "\u0421\u0434\u0435\u043B\u0430\u0439 \u0442\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439 \u0438 \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u0441\u0442\u0438\u043B\u044C, \u0431\u0435\u0437 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430"',
      '\u2022 "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438 \u043D\u0430 \u0447\u0438\u0441\u0442\u044B\u0439 \u043E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434"',
      '\u2022 "\u0421\u0431\u0440\u043E\u0441\u044C \u0441\u043B\u043E\u0442\u044B \u043D\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B CLI:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u0421\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430",
      "\u2022 /slots compact2        - \u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u043E\u0439\u043D\u043E\u0439 \u0441\u043B\u043E\u0442",
      "\u2022 /slots reset           - \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435",
      "\u2022 /slots toggle <id>     - \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u043B\u043E\u0442"
    ],
    slotsResetSuccess: "[{pair}] \u0421\u043B\u043E\u0442\u044B \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435",
    slotsRemovedSuccess: '[{pair}] \u0421\u043B\u043E\u0442 [{id}] ("{label}") \u0443\u0434\u0430\u043B\u0435\u043D',
    slotsRemovedSourceNote: " (\u0421\u0442\u0440\u043E\u043A\u0430 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F)",
    slotsToggled: "[{pair}] \u0421\u043B\u043E\u0442 [{id}] \u0442\u0435\u043F\u0435\u0440\u044C: {status}",
    slotsAdded: '[{pair}] \u0421\u043B\u043E\u0442 [{id}] "{label}" \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D/\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D',
    slotsNotFound: "[{pair}] \u0421\u043B\u043E\u0442 [{id}] \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
    slotsUsageAdd: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots add <id> <\u043C\u0435\u0442\u043A\u0430> [\u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F...]",
    slotsUsageRm: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots rm <id_\u0441\u043B\u043E\u0442\u0430>",
    slotsUsageToggle: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots toggle <id_\u0441\u043B\u043E\u0442\u0430>",
    slotsUnknown: '[{pair}] \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430 "{cmd}". \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /slots \u0434\u043B\u044F \u0441\u043F\u0440\u0430\u0432\u043A\u0438'
  }
};
var SUPPORTED_LANG_CODES = ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"];
function isSupportedLangCode(code) {
  return SUPPORTED_LANG_CODES.includes((code || "").toLowerCase().split(/[-_]/)[0]);
}
function normalizeLangCode(input) {
  const s = (input || "").trim().toLowerCase().replace(/[-_].*$/, "");
  if (s === "zh" || s === "cn" || s === "chinese" || s === "\u4E2D\u6587") return "zh";
  if (s === "tw" || s === "zh-tw" || s === "traditional" || s === "\u7E41\u4E2D" || s === "\u7E41\u9AD4\u4E2D\u6587") return "tw";
  if (s === "ja" || s === "jp" || s === "japanese" || s === "\u65E5\u672C\u8A9E" || s === "\u65E5\u6587" || s === "\u65E5\u8BED") return "ja";
  if (s === "ko" || s === "kr" || s === "korean" || s === "\uD55C\uAD6D\uC5B4" || s === "\u97E9\u8BED" || s === "\u97E9\u6587" || s === "\u97D3\u8A9E" || s === "\u97D3\u6587") return "ko";
  if (s === "en" || s === "eng" || s === "english" || s === "\u82F1\u8BED" || s === "\u82F1\u6587") return "en";
  if (s === "es" || s === "spanish" || s === "espa\xF1ol" || s === "\u897F\u8BED" || s === "\u897F\u73ED\u7259\u8BED") return "es";
  if (s === "fr" || s === "french" || s === "fran\xE7ais" || s === "\u6CD5\u8BED" || s === "\u6CD5\u6587") return "fr";
  if (s === "de" || s === "german" || s === "deutsch" || s === "\u5FB7\u8BED" || s === "\u5FB7\u6587") return "de";
  if (s === "ru" || s === "russian" || s === "\u0440\u0443\u0441\u0441\u043A\u0438\u0439" || s === "\u4FC4\u8BED" || s === "\u4FC4\u6587") return "ru";
  return s;
}
function resolveLangPair(input, fallbackPair) {
  const [fallbackSource, fallbackTarget] = (fallbackPair || "en ja").trim().split(/\s+/);
  const [rawSource, rawTarget] = (input || "").trim().split(/\s+/);
  const normalizedSource = normalizeLangCode(rawSource || "");
  const normalizedTarget = normalizeLangCode(rawTarget || "");
  const source = isSupportedLangCode(normalizedSource) ? normalizedSource : fallbackSource || "en";
  const target = isSupportedLangCode(normalizedTarget) ? normalizedTarget : source === "en" ? fallbackTarget && isSupportedLangCode(fallbackTarget) && fallbackTarget !== "en" ? fallbackTarget : "ja" : "en";
  return { source, target: target === source ? source === "en" ? "ja" : "en" : target };
}
function resolveLabelsForLang(lang = "en", overrides, targetLang) {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const presetKey = norm === "tw" ? "zh" : norm;
  const target = LANGUAGE_PRESETS[presetKey] || LANGUAGE_PRESETS.en;
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

// src/chunker.ts
function splitSemanticChunks(text, maxChunkChars = 65) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkChars) {
    return [trimmed];
  }
  const rawSegments = trimmed.split(/([。！？；\n]|[.!?](?=\s|$))/);
  const sentences = [];
  let cur = "";
  for (let i = 0; i < rawSegments.length; i++) {
    const part = rawSegments[i];
    if (!part) continue;
    cur += part;
    if (/[。！？；\n]/.test(part) || /[.!?]/.test(part)) {
      if (cur.trim()) sentences.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) {
    sentences.push(cur.trim());
  }
  if (sentences.length <= 1) {
    if (trimmed.length <= maxChunkChars) {
      return [trimmed];
    }
    const commaParts = [];
    let lastIdx = 0;
    const commaRegex = /[，,、]/g;
    let match;
    while ((match = commaRegex.exec(trimmed)) !== null) {
      const end = match.index + 1;
      commaParts.push(trimmed.slice(lastIdx, end).trim());
      lastIdx = end;
    }
    if (lastIdx < trimmed.length) {
      commaParts.push(trimmed.slice(lastIdx).trim());
    }
    const subChunks = [];
    let subCur = "";
    for (const cp of commaParts) {
      if (!cp) continue;
      if (subCur.length + cp.length <= maxChunkChars || subCur === "") {
        subCur += cp;
      } else {
        if (subCur.trim()) subChunks.push(subCur.trim());
        subCur = cp;
      }
    }
    if (subCur.trim()) subChunks.push(subCur.trim());
    const boundedChunks = [];
    for (const chunk of subChunks) {
      if (chunk.length <= maxChunkChars) {
        boundedChunks.push(chunk);
      } else {
        let remain = chunk;
        while (remain.length > maxChunkChars) {
          const slicePoint = remain.lastIndexOf(" ", maxChunkChars);
          const splitIdx = slicePoint > 10 ? slicePoint : maxChunkChars;
          boundedChunks.push(remain.slice(0, splitIdx).trim());
          remain = remain.slice(splitIdx).trim();
        }
        if (remain.trim()) {
          boundedChunks.push(remain.trim());
        }
      }
    }
    return boundedChunks.length > 0 ? boundedChunks : [trimmed];
  }
  const chunks = [];
  let chunkBuffer = "";
  for (const s of sentences) {
    const needSpace = chunkBuffer && !/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af，。！？；]/.test(chunkBuffer.slice(-1));
    const addedLen = s.length + (needSpace ? 1 : 0);
    if (chunkBuffer.length + addedLen <= maxChunkChars || chunkBuffer === "") {
      chunkBuffer += (needSpace ? " " : "") + s;
    } else {
      if (chunkBuffer.trim()) chunks.push(chunkBuffer.trim());
      chunkBuffer = s;
    }
  }
  if (chunkBuffer.trim()) {
    chunks.push(chunkBuffer.trim());
  }
  return chunks.length > 0 ? chunks : [trimmed];
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

// src/layout.ts
var CANNOT_START_LINE_CHARS = /* @__PURE__ */ new Set([
  ",",
  ".",
  ";",
  "!",
  "?",
  ":",
  "\uFF0C",
  "\u3002",
  "\uFF1B",
  "\uFF01",
  "\uFF1F",
  "\uFF1A",
  "\u3001",
  ")",
  "]",
  "}",
  "\uFF09",
  "\u3011",
  "\u201D",
  "\u2019",
  "\xBB"
]);
function getEffectiveMaxCols(requested) {
  const terminalCols = process.stdout?.columns || (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : void 0);
  const raw = typeof requested === "number" ? requested : typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 120;
  return Math.max(25, raw);
}
var ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
function getBannerMaxCols() {
  const terminalCols = process.stdout?.columns || (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : void 0);
  const raw = typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 2 : 78;
  return Math.max(25, raw);
}
function getVisualWidth(str) {
  let width = 0;
  const clean = str.replace(ANSI_ESCAPE_REGEX, "");
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (code === 8205 || code === 65039 || code === 65038 || code >= 768 && code <= 879 || code >= 8203 && code <= 8207) {
      continue;
    }
    if (code >= 4352 && code <= 4447 || code >= 8986 && code <= 9215 || code >= 9728 && code <= 10175 || code >= 11904 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65040 && code <= 65049 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 127744 && code <= 128591 || code >= 128640 && code <= 128767 || code >= 129280 && code <= 129791 || code >= 131072 && code <= 195103) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
function closingDelimitersFor(text) {
  const deficit = (opens, closes) => {
    const o = (text.match(opens) || []).length;
    const c = (text.match(closes) || []).length;
    return Math.max(0, o - c);
  };
  return ")".repeat(deficit(/[\(\[\{]/g, /[\)\]\}]/g)) + "\uFF09".repeat(deficit(/[（【]/g, /[）】]/g));
}
function truncateVisual(str, maxVisualCols) {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);
  const clipAt = (limit) => {
    let curWidth = 0;
    let result2 = "";
    let i = 0;
    while (i < singleLine.length) {
      ANSI_ESCAPE_REGEX.lastIndex = i;
      const ansiMatch = ANSI_ESCAPE_REGEX.exec(singleLine);
      if (ansiMatch && ansiMatch.index === i) {
        result2 += ansiMatch[0];
        i += ansiMatch[0].length;
        continue;
      }
      const code = singleLine.codePointAt(i) || 0;
      const charLen = code > 65535 ? 2 : 1;
      const ch = singleLine.slice(i, i + charLen);
      const w = getVisualWidth(ch);
      if (curWidth + w > limit) {
        break;
      }
      result2 += ch;
      curWidth += w;
      i += charLen;
    }
    return result2.replace(/\s*[\(\[\{（【]$/, "");
  };
  const targetCols = Math.max(1, maxVisualCols - 3);
  let result = clipAt(targetCols);
  const closers = closingDelimitersFor(result);
  const closerWidth = getVisualWidth(closers);
  if (closerWidth > 0 && targetCols > closerWidth) {
    result = clipAt(targetCols - closerWidth) + closers;
  }
  return result + (singleLine.includes("\x1B") ? "\x1B[0m" : "") + "...";
}
function wrapVisualText(text, maxWidth) {
  if (maxWidth <= 0) return [text];
  const rawLines = [];
  let currentLine = "";
  let currentWidth = 0;
  const tokenRegex = /\x1b\[[0-9;]*[a-zA-Z]|\s+|[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]|[^\s\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\x1b]+/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const tokenWidth = getVisualWidth(token);
    if (tokenWidth === 0) {
      currentLine += token;
      continue;
    }
    if (currentWidth + tokenWidth <= maxWidth) {
      currentLine += token;
      currentWidth += tokenWidth;
    } else {
      if (currentLine === "") {
        if (tokenWidth > maxWidth) {
          let curToken = token;
          while (getVisualWidth(curToken) > maxWidth) {
            let sliceIdx = 0;
            let accW = 0;
            for (const ch of curToken) {
              const chW = getVisualWidth(ch);
              if (accW + chW > maxWidth) break;
              accW += chW;
              sliceIdx += ch.length;
            }
            if (sliceIdx === 0) sliceIdx = 1;
            rawLines.push(curToken.slice(0, sliceIdx));
            curToken = curToken.slice(sliceIdx);
          }
          if (curToken.trim()) {
            currentLine = curToken;
            currentWidth = getVisualWidth(curToken);
          }
          continue;
        }
        rawLines.push(token);
        continue;
      }
      rawLines.push(currentLine.trimEnd());
      currentLine = token.trimStart();
      currentWidth = getVisualWidth(currentLine);
    }
  }
  if (currentLine.trim()) {
    rawLines.push(currentLine.trimEnd());
  }
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (i > 0 && line.length > 0 && lines.length > 0) {
      const firstChar = line[0];
      if (CANNOT_START_LINE_CHARS.has(firstChar)) {
        const prevIdx = lines.length - 1;
        const prevLine = lines[prevIdx];
        if (getVisualWidth(prevLine) + getVisualWidth(firstChar) <= maxWidth) {
          lines[prevIdx] = prevLine + firstChar;
          line = line.slice(1).trimStart();
        } else {
          const prevChars = Array.from(prevLine);
          if (prevChars.length > 1) {
            const pulledChar = prevChars.pop();
            lines[prevIdx] = prevChars.join("");
            line = pulledChar + line;
          }
        }
      }
    }
    if (line.trim()) {
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines : [text];
}
function formatTreeBranch(branchChar, contChar, tag, content, prefixDecorator = (s) => s, tagDecorator = (s) => s, contDecorator = (s) => s, lineDecorator = (s) => s, maxCols = (process.stdout?.columns || 80) - 8) {
  const actualLineDecorator = typeof lineDecorator === "function" ? lineDecorator : (s) => s;
  const actualMaxCols = typeof lineDecorator === "number" ? lineDecorator : typeof maxCols === "number" ? maxCols : (process.stdout?.columns || 80) - 8;
  const rawPrefix = `  ${branchChar} [${tag}] `;
  const prefixW = getVisualWidth(rawPrefix);
  const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
  const availW = Math.max(25, actualMaxCols - prefixW);
  const lines = wrapVisualText(content, availW);
  if (lines.length === 0) {
    return [prefixDecorator(`  ${branchChar} `) + tagDecorator(`[${tag}]`)];
  }
  return lines.map((line, idx) => {
    if (idx === 0) {
      return prefixDecorator(`  ${branchChar} `) + tagDecorator(`[${tag}] `) + actualLineDecorator(line);
    }
    return contDecorator(rawCont) + actualLineDecorator(line);
  });
}
function formatSubRail(contChar, nuanceText, arrow = "\u21B3", contDecorator = (s) => s, lineDecorator = (s) => s, maxCols = (process.stdout?.columns || 80) - 8, indentCols = 11) {
  if (!nuanceText || !nuanceText.trim()) return [];
  const rawPrefix = `  ${contChar}${" ".repeat(Math.max(1, indentCols - 5))}${arrow} `;
  const prefixW = getVisualWidth(rawPrefix);
  const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
  const availW = Math.max(20, maxCols - prefixW);
  const cleanText = nuanceText.startsWith("(") && nuanceText.endsWith(")") ? nuanceText : `(${nuanceText})`;
  const lines = wrapVisualText(cleanText, availW);
  return lines.map((line, idx) => {
    if (idx === 0) {
      return contDecorator(rawPrefix) + lineDecorator(line);
    }
    return contDecorator(rawCont) + lineDecorator(line);
  });
}
function extractVocabPhrases(vocab) {
  if (!vocab || !vocab.trim()) return [];
  const items = vocab.split(/\s*(?:·|•|,)\s*/);
  const phrases = [];
  for (const raw of items) {
    const clean = raw.replace(/\s*(?:\(.*?\)|（.*?）)\s*$/, "").trim();
    if (clean.length >= 2 && !phrases.includes(clean)) {
      phrases.push(clean);
    }
  }
  return phrases.sort((a, b) => b.length - a.length);
}
function spotlightPhrases(text, phrases) {
  if (!text || phrases.length === 0) return text;
  let result = text;
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithAscii = /^[a-zA-Z0-9]/.test(phrase);
    const endsWithAscii = /[a-zA-Z0-9]$/.test(phrase);
    const pattern = `${startsWithAscii ? "(?<=\\b|^)" : ""}${escaped}${endsWithAscii ? "(?=\\b|$)" : ""}`;
    const regex = new RegExp(pattern, "gi");
    result = result.replace(regex, (matched) => `\x1B[4m${matched}\x1B[24m`);
  }
  return result;
}
function formatVocabItemsAtomic(vocab, prefix, maxCols) {
  if (!vocab || !vocab.trim()) return prefix.trimEnd();
  const items = vocab.split(/\s*(?:·|•)\s*/);
  const prefixW = getVisualWidth(prefix);
  const availW = Math.max(20, maxCols - prefixW);
  const keptItems = [];
  let curW = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (!item) continue;
    const itemW = getVisualWidth(item);
    const sepW = keptItems.length > 0 ? 3 : 0;
    if (curW + sepW + itemW <= availW) {
      keptItems.push(item);
      curW += sepW + itemW;
    } else {
      if (keptItems.length === 0) {
        return prefix + truncateVisual(item, availW);
      } else {
        if (curW + 5 <= availW) {
          return prefix + keptItems.join(" \xB7 ") + " \xB7 ...";
        }
        return prefix + keptItems.join(" \xB7 ");
      }
    }
  }
  return prefix + keptItems.join(" \xB7 ");
}
function formatTerminalAnnotation(sourceText, spoken, written, vocab, options = {}) {
  const slot1 = options.slot1Label || "Spoken";
  const slot2 = options.slot2Label || "Written";
  const vocabTag = options.vocabLabel || "Vocab";
  const sourceTag = options.sourceLabel || "Original";
  const hasSlot2 = Boolean(written && written.trim());
  const hasVocab = Boolean(vocab && vocab.trim());
  const spotlightEnabled = options.spotlight !== false;
  const phrases = hasVocab && spotlightEnabled ? extractVocabPhrases(vocab) : [];
  const displaySpoken = phrases.length > 0 ? spotlightPhrases(spoken, phrases) : spoken;
  const displayWritten = written && phrases.length > 0 ? spotlightPhrases(written, phrases) : written;
  const cleanSource = sourceText.replace(/\r?\n+/g, " ").trim();
  const lines = [`  \xB7 [${sourceTag}] ${cleanSource}`];
  const branch1Char = hasSlot2 || hasVocab ? "\u250C" : "\u2514";
  const cont1Char = hasSlot2 || hasVocab ? "\u2502" : " ";
  lines.push(...formatTreeBranch(branch1Char, cont1Char, slot1, displaySpoken));
  if (options.spokenMeaning) {
    lines.push(...formatSubRail(cont1Char, options.spokenMeaning));
  }
  if (hasSlot2) {
    const branchChar = hasVocab ? "\u251C" : "\u2514";
    const contChar = hasVocab ? "\u2502" : " ";
    lines.push(...formatTreeBranch(branchChar, contChar, slot2, displayWritten));
    if (options.writtenMeaning) {
      lines.push(...formatSubRail(contChar, options.writtenMeaning));
    }
  }
  if (hasVocab) {
    lines.push(...formatTreeBranch("\u2514", " ", vocabTag, vocab));
  }
  return lines.join("\n");
}
function formatCapsuleLine(hudTitle, spoken, written, options = {}) {
  const maxCols = options.maxCols || (process.stdout?.columns ? Math.max(30, process.stdout.columns) : 80);
  const slot1 = options.slot1Short || "Spk";
  const slot2 = options.slot2Short || "Wrt";
  const cleanSpoken = spoken.replace(/\r?\n+/g, " ").trim();
  const cleanWritten = (written || "").replace(/\r?\n+/g, " ").trim();
  const prefix = `\u21C4 [${hudTitle}] `;
  const prefixW = getVisualWidth(prefix);
  const hasSlot2 = Boolean(cleanWritten);
  const availW = Math.max(8, maxCols - prefixW);
  let body = "";
  if (hasSlot2) {
    const s1PrefixW = getVisualWidth(`${slot1}: `);
    const s2PrefixW = getVisualWidth(`${slot2}: `);
    const fixedOverhead = s1PrefixW + 3 + s2PrefixW;
    const textAvail = Math.max(4, availW - fixedOverhead);
    const halfW = Math.max(2, Math.floor(textAvail / 2));
    const s1 = truncateVisual(cleanSpoken, halfW);
    const s2 = truncateVisual(cleanWritten, halfW);
    body = `${slot1}: ${s1} \xB7 ${slot2}: ${s2}`;
  } else {
    const s1PrefixW = getVisualWidth(`${slot1}: `);
    const textAvail = Math.max(2, availW - s1PrefixW);
    const s1 = truncateVisual(cleanSpoken, textAvail);
    body = `${slot1}: ${s1}`;
  }
  const fullLine = prefix + body;
  if (getVisualWidth(fullLine) > maxCols) {
    return truncateVisual(fullLine, maxCols);
  }
  return fullLine;
}
function renderCardLayout(card, labels, options = {}) {
  const maxCols = getEffectiveMaxCols(options.maxCols);
  const maxLines = options.maxLines || 9;
  const isCompact = Boolean(options.isCompact);
  const pageTag = options.pageTag || "";
  const decMuted = options.themeDecorators?.muted || ((s) => s);
  const decAccent = options.themeDecorators?.accent || ((s) => s);
  const decDim = options.themeDecorators?.dim || ((s) => s);
  let effectiveSlots = [];
  if (options.slots && options.slots.length > 0) {
    effectiveSlots = options.slots.filter((s) => s.enabled);
  } else {
    effectiveSlots = [
      { id: "source", label: labels.sourceLabel || "Source", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...card.written ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true }] : [],
      ...card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true }] : []
    ];
  }
  const resolveSlotContent = (slot) => {
    if (slot.role === "source") {
      return { content: card.sourceText || "" };
    }
    if (card.slotOutputs && Object.hasOwn(card.slotOutputs, slot.id)) {
      const out = card.slotOutputs[slot.id];
      return { content: out.content || "", meaning: out.meaning };
    }
    if (card.slots) {
      const match = card.slots.find((s) => s.id === slot.id);
      if (match) {
        return { content: match.content || "", meaning: match.meaning };
      }
    }
    if (slot.id === "spoken" || (slot.role === "translation" || slot.role === "custom") && !card.slotOutputs) {
      if (slot.id === "written") {
        return { content: card.written || "", meaning: card.writtenMeaning };
      }
      return { content: card.spoken || "", meaning: card.spokenMeaning };
    }
    if (slot.id === "written") {
      return { content: card.written || "", meaning: card.writtenMeaning };
    }
    if (slot.id === "vocab" || slot.role === "vocab") {
      return { content: card.vocab || "" };
    }
    return { content: "" };
  };
  const contentBranches = [];
  for (const slot of effectiveSlots) {
    if (slot.role === "source") continue;
    const { content, meaning } = resolveSlotContent(slot);
    if (content && content.trim()) {
      contentBranches.push({
        id: slot.id,
        label: slot.label,
        role: slot.role || "translation",
        content: content.trim(),
        meaning: slot.showMeaning !== false && meaning && meaning.trim() ? meaning.trim() : void 0
      });
    }
  }
  if (isCompact || maxCols < 35) {
    const tagWidth = getVisualWidth(pageTag);
    const availCols = Math.max(20, maxCols - tagWidth);
    if (contentBranches.length === 0) {
      return [truncateVisual(`\u21C4 [${labels.hudTitle}] ${card.sourceText}`, availCols) + pageTag];
    }
    const prefix = `\u21C4 [${labels.hudTitle}] `;
    const prefixW = getVisualWidth(prefix);
    const sepW = (contentBranches.length - 1) * 3;
    const perBranchBudget = Math.max(12, Math.floor((availCols - prefixW - sepW) / contentBranches.length));
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return truncateVisual(`${shortLabel}: ${b.content}`, perBranchBudget);
    });
    const fullText = prefix + parts.join(" \xB7 ");
    return [truncateVisual(fullText, availCols) + pageTag];
  }
  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines = [];
  if (sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "Source";
    const prefixRaw = `  \xB7 [${sourceLabel}] `;
    const prefixW = getVisualWidth(prefixRaw);
    const pageTagW = pageTag ? getVisualWidth(pageTag) : 0;
    const availLine1W = Math.max(20, maxCols - prefixW - pageTagW);
    const cleanSource = card.sourceText.replace(/\r?\n+/g, " ").trim();
    if (getVisualWidth(cleanSource) <= availLine1W) {
      sourceLines = [
        decMuted("  \xB7 ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + cleanSource + pageTag
      ];
    } else {
      const wrapped = wrapVisualText(cleanSource, Math.max(20, maxCols - prefixW));
      sourceLines = wrapped.map((wLine, idx) => {
        const isLast = idx === wrapped.length - 1;
        const tagSuffix = isLast ? pageTag : "";
        if (idx === 0) {
          return decMuted("  \xB7 ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + wLine + tagSuffix;
        }
        return " ".repeat(prefixW) + decDim(wLine) + tagSuffix;
      });
    }
  }
  let lines = [...sourceLines];
  const numBranches = contentBranches.length;
  for (let i = 0; i < numBranches; i++) {
    const branch = contentBranches[i];
    const isFirst = i === 0;
    const isLast = i === numBranches - 1;
    let branchChar = "\u251C";
    let contChar = "\u2502";
    if (numBranches === 1) {
      branchChar = "\u2514";
      contChar = " ";
    } else if (isFirst) {
      branchChar = "\u250C";
      contChar = "\u2502";
    } else if (isLast) {
      branchChar = "\u2514";
      contChar = " ";
    }
    const isVocab = branch.role === "vocab";
    const contentColor = isVocab ? decDim : (s) => s;
    const headingColor = isVocab ? decMuted : decAccent;
    lines.push(
      ...formatTreeBranch(
        branchChar,
        contChar,
        branch.label,
        branch.content,
        decMuted,
        headingColor,
        decMuted,
        contentColor,
        maxCols
      )
    );
    if (branch.meaning) {
      lines.push(...formatSubRail(contChar, branch.meaning, "\u21B3", decMuted, decDim, maxCols));
    }
  }
  if (lines.length > maxLines) {
    const maxSourceRows = numBranches >= maxLines - 1 ? 1 : 2;
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > maxSourceRows) {
      if (maxSourceRows === 1) {
        clampedSourceLines = [truncateVisual(sourceLines[0] + "...", maxCols)];
      } else {
        clampedSourceLines = [
          sourceLines[0],
          truncateVisual(sourceLines[1] + "...", maxCols)
        ];
      }
    }
    const inlineLines = [...clampedSourceLines];
    for (let i = 0; i < numBranches; i++) {
      const branch = contentBranches[i];
      const isFirst = i === 0;
      const isLast = i === numBranches - 1;
      const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
      const contChar = numBranches === 1 || isLast ? " " : "\u2502";
      const isVocab = branch.role === "vocab";
      const headingColor = isVocab ? decMuted : decAccent;
      const contentColor = isVocab ? decDim : (s) => s;
      const inlineText = branch.meaning ? `${branch.content} (${branch.meaning})` : branch.content;
      inlineLines.push(
        ...formatTreeBranch(
          branchChar,
          contChar,
          branch.label,
          inlineText,
          decMuted,
          headingColor,
          decMuted,
          contentColor,
          maxCols
        )
      );
    }
    if (inlineLines.length <= maxLines) {
      lines = inlineLines;
    } else {
      const pureLines = [...clampedSourceLines];
      for (let i = 0; i < numBranches; i++) {
        const branch = contentBranches[i];
        const isFirst = i === 0;
        const isLast = i === numBranches - 1;
        const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
        const contChar = numBranches === 1 || isLast ? " " : "\u2502";
        const isVocab = branch.role === "vocab";
        const headingColor = isVocab ? decMuted : decAccent;
        const contentColor = isVocab ? decDim : (s) => s;
        pureLines.push(
          ...formatTreeBranch(
            branchChar,
            contChar,
            branch.label,
            branch.content,
            decMuted,
            headingColor,
            decMuted,
            contentColor,
            maxCols
          )
        );
      }
      if (pureLines.length <= maxLines) {
        lines = pureLines;
      } else {
        const availForBranches = Math.max(1, maxLines - clampedSourceLines.length);
        const vocabCount = contentBranches.filter((b) => b.role === "vocab").length;
        const transCount = Math.max(1, numBranches - vocabCount);
        const availForTrans = Math.max(1, availForBranches - vocabCount);
        let remainingBudget = availForBranches;
        let transHandled = 0;
        const clampedBranchLines = [...clampedSourceLines];
        for (let i = 0; i < numBranches; i++) {
          const branch = contentBranches[i];
          const isFirst = i === 0;
          const isLast = i === numBranches - 1;
          const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
          const contChar = numBranches === 1 || isLast ? " " : "\u2502";
          const isVocab = branch.role === "vocab";
          const headingColor = isVocab ? decMuted : decAccent;
          const contentColor = isVocab ? decDim : (s) => s;
          const branchRendered = formatTreeBranch(
            branchChar,
            contChar,
            branch.label,
            branch.content,
            decMuted,
            headingColor,
            decMuted,
            contentColor,
            maxCols
          );
          let branchBudget;
          if (isVocab) {
            branchBudget = Math.max(1, Math.min(branchRendered.length, Math.min(2, remainingBudget)));
          } else {
            const branchesLeftAfterThis = numBranches - 1 - i;
            const maxPossible = Math.max(1, remainingBudget - branchesLeftAfterThis);
            const evenShare = Math.max(1, Math.floor(remainingBudget / Math.max(1, numBranches - i)));
            branchBudget = Math.min(maxPossible, Math.min(branchRendered.length, Math.max(evenShare, 2)));
            transHandled++;
          }
          if (branchRendered.length <= branchBudget) {
            clampedBranchLines.push(...branchRendered);
            remainingBudget -= branchRendered.length;
          } else {
            const sliced = branchRendered.slice(0, branchBudget);
            sliced[sliced.length - 1] = truncateVisual(sliced[sliced.length - 1] + "...", maxCols);
            clampedBranchLines.push(...sliced);
            remainingBudget -= sliced.length;
          }
        }
        lines = clampedBranchLines.slice(0, maxLines);
      }
    }
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
  }
  return lines.map((line) => getVisualWidth(line) > maxCols ? truncateVisual(line, maxCols) : line);
}

// src/fsm.ts
var LingualSessionController = class {
  activeAbortController = null;
  currentGeneration = 0;
  // Pagination state management
  pagedResults = [];
  currentPageIndex = 0;
  totalExpectedPages = 1;
  lastResult = null;
  /**
   * Begins a new session request:
   * 1. Aborts in-flight HTTP stream/request from previous turn;
   * 2. Increments monotonic generation counter;
   * 3. Binds a fresh AbortSignal.
   */
  beginRequest() {
    this.abortActive();
    this.activeAbortController = new AbortController();
    const generation = ++this.currentGeneration;
    return {
      generation,
      signal: this.activeAbortController.signal
    };
  }
  /**
   * Aborts currently active in-flight network requests.
   */
  abortActive() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
  /**
   * Checks if the specified generation token is still the latest active generation.
   */
  isLatest(generation) {
    return this.currentGeneration === generation;
  }
  /**
   * Gets the latest generation counter value.
   */
  getCurrentGeneration() {
    return this.currentGeneration;
  }
  /**
   * Initializes the pagination pool when input is split into multiple semantic chunks.
   */
  initPagination(totalExpectedPages) {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = Math.max(1, totalExpectedPages);
  }
  /**
   * Sets page result for a chunk index with generation guard to reject stale writes.
   */
  setPageResult(chunkIndex, result, generation) {
    if (!this.isLatest(generation)) {
      return false;
    }
    this.pagedResults[chunkIndex] = result;
    this.lastResult = result;
    return true;
  }
  /**
   * Gets translation result for currently active page.
   */
  getActiveResult() {
    const readyList = this.getReadyPages();
    if (readyList.length === 0) {
      return this.lastResult;
    }
    if (this.currentPageIndex >= readyList.length) {
      this.currentPageIndex = Math.max(0, readyList.length - 1);
    }
    return readyList[this.currentPageIndex] || null;
  }
  /**
   * Gets all ready page results.
   */
  getReadyPages() {
    return this.pagedResults.filter((item) => Boolean(item));
  }
  /**
   * Gets a snapshot of the current pagination state.
   */
  getPaginationSnapshot() {
    const readyCount = this.getReadyPages().length;
    const totalPages = Math.max(readyCount, this.totalExpectedPages);
    return {
      pageIndex: this.currentPageIndex,
      totalPages,
      readyCount,
      isMultiPage: totalPages > 1
    };
  }
  /**
   * Cycles to the next ready page.
   * Returns true if pagination changed.
   */
  nextPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex + 1) % readyList.length;
    return true;
  }
  /**
   * Cycles to the previous ready page.
   * Returns true if pagination changed.
   */
  prevPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex - 1 + readyList.length) % readyList.length;
    return true;
  }
  /**
   * Clears pagination pool on non-translatable input or teardown to prevent ghost cards.
   */
  clearPagination() {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = 1;
  }
  /**
   * Gets the most recent translation result for /last replay.
   */
  getLastResult() {
    return this.lastResult;
  }
  /**
   * Explicitly sets the last translation result.
   */
  setLastResult(result) {
    this.lastResult = result;
  }
  /**
   * Resets the controller completely.
   */
  reset() {
    this.abortActive();
    this.clearPagination();
    this.lastResult = null;
  }
};

// src/engine.ts
import fs from "fs";
import path from "path";
import os from "os";
var cachedUserConfig = null;
var lastConfigCheckTime = 0;
var CONFIG_CACHE_TTL_MS = 2e3;
function invalidateUserConfigCache() {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}
function isTestEnvironment() {
  return process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT !== void 0 || process.execArgv.some((a) => a.startsWith("--test") || a === "--test") || process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) || process.env.npm_lifecycle_event === "test";
}
function isUserLingualConfigured() {
  if (isTestEnvironment()) return true;
  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const lingualFile = path.join(agentDir, "lingual.json");
  if (!fs.existsSync(lingualFile)) return false;
  try {
    const raw = fs.readFileSync(lingualFile, "utf8");
    const parsed = JSON.parse(raw);
    const inner = parsed && (parsed["pi-lingual"] || parsed);
    return Boolean(inner && (inner.configured || inner.sourceLang && inner.targetLang));
  } catch {
    return false;
  }
}
function loadUserLingualConfig() {
  if (isTestEnvironment()) {
    return {};
  }
  const now = Date.now();
  if (cachedUserConfig && now - lastConfigCheckTime < CONFIG_CACHE_TTL_MS) {
    return cachedUserConfig;
  }
  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const lingualFile = path.join(agentDir, "lingual.json");
  const settingsFile = path.join(agentDir, "settings.json");
  let target = null;
  if (fs.existsSync(lingualFile)) {
    try {
      const raw = fs.readFileSync(lingualFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const inner = parsed["pi-lingual"] || parsed;
        target = inner && typeof inner === "object" && !Array.isArray(inner) ? inner : null;
      }
    } catch {
      target = null;
    }
  }
  if (!target && fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, "utf8");
      const parsed = JSON.parse(raw);
      const legacyBlock = parsed["pi-lingual"];
      if (legacyBlock && typeof legacyBlock === "object") {
        target = legacyBlock;
        try {
          if (!fs.existsSync(agentDir)) {
            fs.mkdirSync(agentDir, { recursive: true });
          }
          fs.writeFileSync(lingualFile, JSON.stringify(target, null, 2), "utf8");
        } catch {
        }
      }
    } catch {
      target = null;
    }
  }
  if (target) {
    const endpoint = target.endpoint || target.antigravity?.endpoint;
    const apiKey = target.apiKey || target.antigravity?.apiKey;
    const model = target.model || target.antigravity?.model;
    const selectedModel = target.selectedModel || target.model;
    const sourceLang = target.sourceLang;
    const targetLang = target.targetLang;
    const compact = target.compact;
    const slotPreset = target.slotPreset;
    const filterSlots = (arr) => Array.isArray(arr) ? arr.filter((s) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string") : void 0;
    const filterModes = (arr) => Array.isArray(arr) ? arr.filter((m) => m && typeof m === "object" && typeof m.id === "string") : void 0;
    const modes = filterModes(target.modes);
    const activeModeId = typeof target.activeModeId === "string" ? target.activeModeId : void 0;
    const globalKillList = Array.isArray(target.globalKillList) ? target.globalKillList : void 0;
    const slots = filterSlots(target.slots);
    const directSlots = filterSlots(target.directSlots);
    const promptSlots = filterSlots(target.promptSlots);
    const modifySlots = filterSlots(target.modifySlots);
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : void 0;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : void 0;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs) ? Math.min(6e4, Math.max(1e3, target.timeoutMs)) : void 0;
    const replyInSourceLang = target.replyInSourceLang !== void 0 ? Boolean(target.replyInSourceLang) : void 0;
    const modeLocked = target.modeLocked !== void 0 ? Boolean(target.modeLocked) : void 0;
    const labels = resolveLabelsForLang(sourceLang || "en", target.labels, targetLang || "ja");
    const normalizedMode = typeof target.mode === "string" ? normalizeLingualModeInput(target.mode) || target.mode : void 0;
    cachedUserConfig = {
      ...target,
      ...endpoint ? { endpoint } : {},
      ...apiKey ? { apiKey } : {},
      ...model ? { model } : {},
      ...selectedModel ? { selectedModel } : {},
      ...normalizedMode ? { mode: normalizedMode } : {},
      ...modeLocked !== void 0 ? { modeLocked } : {},
      ...compact !== void 0 ? { compact: Boolean(compact) } : {},
      ...slotPreset ? { slotPreset } : {},
      ...modes ? { modes } : {},
      ...activeModeId ? { activeModeId } : {},
      ...globalKillList ? { globalKillList } : {},
      ...slots ? { slots } : {},
      ...directSlots ? { directSlots } : {},
      ...promptSlots ? { promptSlots } : {},
      ...modifySlots ? { modifySlots } : {},
      ...lastSeenVersion ? { lastSeenVersion } : {},
      ...sourceLang ? { sourceLang } : {},
      ...targetLang ? { targetLang } : {},
      ...reasoning ? { reasoning } : {},
      ...timeoutMs ? { timeoutMs } : {},
      ...replyInSourceLang !== void 0 ? { replyInSourceLang } : {},
      labels
    };
    lastConfigCheckTime = now;
    return cachedUserConfig;
  }
  cachedUserConfig = {};
  lastConfigCheckTime = now;
  return {};
}
function saveUserLingualConfig(patch) {
  if (isTestEnvironment()) {
    return;
  }
  try {
    const agentDir = path.join(os.homedir(), ".pi", "agent");
    const configFile = path.join(agentDir, "lingual.json");
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
    let existing = {};
    if (fs.existsSync(configFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(configFile, "utf8"));
      } catch {
      }
    }
    for (const [k, v] of Object.entries(patch)) {
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (v === void 0 || v === "" || isEmptyArray || v === "auto" || // Intentional revert-to-default semantic: passing "auto" deletes key to restore auto-probing
      k === "compact" && v === false || k === "modeLocked" && v === false) {
        delete existing[k];
      } else if (k === "mode") {
        existing[k] = v === "english" ? "direct" : v === "select" ? "candidates" : v;
      } else {
        existing[k] = v;
      }
    }
    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    try {
      fs.writeFileSync(tmpFile, content, "utf8");
      fs.renameSync(tmpFile, configFile);
    } catch {
      try {
        fs.writeFileSync(configFile, content, "utf8");
      } catch {
      }
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {
      }
    }
    invalidateUserConfigCache();
  } catch {
  }
}
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
var LINGUA_SYSTEM_PROMPT = LINGUAL_SYSTEM_PROMPT;
var loadUserConfig = loadUserLingualConfig;
var MAX_TRANSLATION_CHARS = 2500;
var MAX_TRANSLATION_LINES = 30;
function shouldTriggerTranslation(text, sourceLang = "en", allowSameLangPromptOpt = false) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRANSLATION_CHARS) return false;
  if (trimmed.split(/\r?\n/).length > MAX_TRANSLATION_LINES) return false;
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) return false;
  if (shouldShieldBypass(trimmed)) return false;
  if (allowSameLangPromptOpt) {
    if (isNonEnglish(trimmed)) return true;
    const words2 = trimmed.split(/\s+/);
    return words2.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
  }
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const nonLatinLangs = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }
  if (isNonEnglish(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
}
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
async function executeLlmCompletion(text, sysPrompt, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  if (cfg.signal) {
    if (cfg.signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    cfg.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    if (typeof cfg.complete === "function") {
      return await cfg.complete(text, sysPrompt, controller.signal, { reasoning: cfg.reasoning });
    }
    if (cfg.endpoint) {
      const headers = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const requestBody = {
        model: cfg.model || "gemini-3.8-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: text }
        ],
        temperature: cfg.temperature
      };
      if (cfg.reasoning) {
        requestBody.reasoning = cfg.reasoning;
      }
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json?.choices?.[0]?.message?.content ?? null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
function stripLingualAnnotation(annotatedText) {
  const lines = annotatedText.split("\n");
  const rawLines = [];
  let spoken;
  let written;
  let vocab;
  for (const line of lines) {
    const trimmed = line.trim();
    const sourceMatch = trimmed.match(/^·\s*\[?(?:原文|source|original|quelle)\]?\s+(.*)$/i);
    if (sourceMatch) {
      rawLines.push(sourceMatch[1].trim());
      continue;
    }
    if (/^(?:[│\s]*↳\s*\(.*\)|↳\s*\(.*\))/.test(trimmed)) {
      continue;
    }
    const slotMatch = trimmed.match(/^(?:[┌├└│]\s*|↳\s*)\[([^\]]+)\]\s*(.*)$/);
    if (slotMatch) {
      const tag = slotMatch[1].trim();
      let text = slotMatch[2].trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
      const parenIdx = text.lastIndexOf(" (");
      if (parenIdx !== -1 && text.endsWith(")")) {
        text = text.slice(0, parenIdx).trim();
      }
      if (/^(?:口语|spoken|口語|slack|slot1)$/i.test(tag)) {
        spoken = text;
      } else if (/^(?:写作|written|文面|rfc|slot2|敬語)$/i.test(tag)) {
        written = text;
      } else if (/^(?:重点|vocab|単語|词汇)$/i.test(tag)) {
        vocab = text;
      }
    } else {
      rawLines.push(line);
    }
  }
  return { raw: rawLines.join("\n").trim(), spoken, written, vocab };
}
var stripLinguaAnnotation = stripLingualAnnotation;
function isDynamicLongInput(text, sourceLang = "en") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const hasCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed);
  const isCjk = normSource === "zh" || normSource === "tw" || normSource === "ja" || normSource === "ko" || hasCjk;
  if (isCjk) {
    if (trimmed.length >= 45) return true;
    const sentenceCount = (trimmed.match(/[。！？；\n]/g) || []).length;
    if (sentenceCount >= 2 && trimmed.length >= 30) return true;
  } else {
    if (trimmed.length >= 85) return true;
    const sentenceCount = (trimmed.match(/[.!?](\s+|$)|[\n;]/g) || []).length;
    if (sentenceCount >= 2 && trimmed.length >= 50) return true;
  }
  return trimmed.length >= 85;
}
async function translatePrompt(text, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) return null;
  if (shouldShieldBypass(trimmed)) return null;
  const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : void 0);
  const slotSig = Array.isArray(effectiveSlots) ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",") : void 0;
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang, slotSig);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) return cached;
  const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
  const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, void 0, "general", effectiveSlots);
  const content = await executeLlmCompletion(trimmed, sysPrompt, cfg);
  if (typeof content !== "string" || !content.trim()) return null;
  const payload = parseLlmResponse(content);
  if (!payload || !payload.spoken) return null;
  const labels = resolveLabelsForLang(cfg.sourceLang || "en", cfg.labels, cfg.targetLang || "ja");
  const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
  const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
  const vocabLabel = labels.vocabLabel || "Vocab";
  const sourceLabel = labels.sourceLabel || "Source";
  const effectiveSourceText = isLongInput && payload.summary && payload.summary.trim() ? payload.summary.trim() : trimmed;
  const result = {
    spoken: payload.spoken,
    spokenMeaning: payload.spokenMeaning,
    written: payload.written || "",
    writtenMeaning: payload.writtenMeaning,
    vocab: payload.vocab,
    summary: payload.summary,
    sourceText: effectiveSourceText,
    slotOutputs: payload.slotOutputs,
    annotated: formatTerminalAnnotation(
      effectiveSourceText,
      payload.spoken,
      payload.written,
      payload.vocab,
      {
        spokenMeaning: payload.spokenMeaning,
        writtenMeaning: payload.writtenMeaning,
        slot1Label,
        slot2Label,
        vocabLabel,
        sourceLabel
      }
    )
  };
  globalLingualCache.set(cacheKey, result);
  return result;
}
function shouldInjectNativeReplyGuard(originalText, _sourceLang = "en", enabled = false) {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed || !isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  return !isEnglishWritingIntent;
}
function formatNativeReplyGuardHint(sourceLang = "en") {
  const name = resolveLanguageName(sourceLang);
  return `

(Please reply and explain in ${name}.)`;
}
function extractCleanJsonField(raw, fieldName) {
  const obj = repairAndParseJsonObject(raw);
  if (obj && !BLOCKED_JSON_KEYS.has(fieldName)) {
    const val = obj[fieldName] ?? obj.prompt ?? obj.written ?? obj.spoken;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  const cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").replace(/```(?:json)?|```/gi, "").trim();
  const regexFallback = cleaned.match(/"(?:prompt|written|spoken)"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (regexFallback && regexFallback[1].trim()) {
    return regexFallback[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return "";
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}
function resolveDirectSlotsFromConfig(cfg) {
  if (Array.isArray(cfg.directSlots) && cfg.directSlots.length > 0) {
    const enabled = cfg.directSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultDirectSlots(cfg.sourceLang);
}
function resolveCandidateSlotsFromConfig(cfg) {
  if (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0) {
    const enabled = cfg.promptSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultPromptSlots(cfg.sourceLang);
}
function resolveModifySlotsFromConfig(cfg) {
  if (Array.isArray(cfg.modifySlots) && cfg.modifySlots.length > 0) {
    const enabled = cfg.modifySlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultModifySlots(cfg.sourceLang, cfg.explainLang);
}
function resolveModesFromConfig(cfg) {
  if (Array.isArray(cfg.modes) && cfg.modes.length > 0) {
    const sourceLang = cfg.sourceLang || "en";
    const explainLang = cfg.explainLang;
    const valid = cfg.modes.filter((m) => m && typeof m.id === "string" && m.id.trim()).map((m) => {
      if (Array.isArray(m.slots) && m.slots.length > 0) return m;
      if (m.action === "pass-through") return { ...m, slots: [] };
      const defaultSlots = m.flow === "proofread" ? getDefaultModifySlots(sourceLang, explainLang) : getDefaultDirectSlots(sourceLang);
      return { ...m, slots: defaultSlots };
    });
    if (valid.length > 0) return valid;
  }
  const hasLegacyCustomSlots = Array.isArray(cfg.slots) || Array.isArray(cfg.directSlots) || Array.isArray(cfg.promptSlots) || Array.isArray(cfg.modifySlots);
  if (hasLegacyCustomSlots) {
    const sourceLang = cfg.sourceLang || "en";
    const explainLang = cfg.explainLang;
    const directSlots = resolveDirectSlotsFromConfig({ sourceLang, directSlots: cfg.directSlots });
    const modifySlots = resolveModifySlotsFromConfig({ sourceLang, explainLang, modifySlots: cfg.modifySlots });
    const promptSlots = resolveCandidateSlotsFromConfig({ sourceLang, promptSlots: cfg.promptSlots });
    const companionSlots = (Array.isArray(cfg.slots) && cfg.slots.length > 0 ? cfg.slots : getDefaultSlots(sourceLang)).map((s) => ({
      id: s.id,
      label: s.label,
      role: s.role === "vocab" ? "vocab" : "rewrite",
      instruction: s.instruction || "Natural expressions matching context",
      enabled: s.enabled !== false
    }));
    return [
      {
        id: "direct",
        name: sourceLang === "zh" ? "\u89C4\u8303\u76F4\u53D1" : sourceLang === "ja" ? "\u4ED5\u69D8\u76F4\u884C" : "Logical Spec",
        flow: "translate",
        action: "transform",
        hud: "preview",
        slots: directSlots,
        enabled: true
      },
      {
        id: "live-flow",
        name: sourceLang === "zh" ? "\u5B9E\u6218\u72C2\u98D9" : sourceLang === "ja" ? "\u5B9F\u6226\u75BE\u8D70" : "Live Flow",
        flow: "proofread",
        action: "transform",
        hud: "adaptive-takeaway",
        slots: modifySlots,
        enabled: true
      },
      {
        id: "companion",
        name: sourceLang === "zh" ? "\u7EAF\u4F34\u5B66" : sourceLang === "ja" ? "\u7D14\u4F34\u8D70" : "Companion",
        flow: "translate",
        action: "pass-through",
        hud: "tree",
        slots: companionSlots,
        enabled: true
      },
      {
        id: "candidates",
        name: sourceLang === "zh" ? "\u6311\u5019\u9009" : sourceLang === "ja" ? "\u5019\u88DC\u9078\u629E" : "Candidates",
        flow: "translate",
        action: "select",
        hud: "tree",
        slots: promptSlots,
        enabled: true
      }
    ];
  }
  return getDefaultFactoryModes(cfg.sourceLang, cfg.explainLang);
}
function normalizeActiveModeId(cfg, modes) {
  if (cfg.mode === "off") return "off";
  const activeModes = modes.filter((m) => m.enabled !== false);
  if (cfg.activeModeId && activeModes.some((m) => m.id === cfg.activeModeId)) {
    return cfg.activeModeId;
  }
  if (cfg.mode) {
    const legacyMap = {
      original: "companion",
      companion: "companion",
      english: "direct",
      direct: "direct",
      lazy: "direct",
      select: "candidates",
      candidates: "candidates",
      modify: "live-flow",
      "live-flow": "live-flow",
      raw: "live-flow"
    };
    const mappedId = legacyMap[cfg.mode] || cfg.mode;
    if (activeModes.some((m) => m.id === mappedId)) {
      return mappedId;
    }
  }
  return activeModes[0]?.id || "direct";
}
function compileModeSystemPrompt(mode, options) {
  const sourceLang = mode.customInputLang || options.sourceLang || "en";
  const targetLang = mode.customOutputLang || options.targetLang || "en";
  const explainLang = options.explainLang || sourceLang;
  const rawSlots = Array.isArray(mode.slots) && mode.slots.length > 0 ? mode.slots : mode.action === "pass-through" ? [] : mode.flow === "proofread" ? getDefaultModifySlots(sourceLang, explainLang) : getDefaultDirectSlots(sourceLang);
  const interpolatedSlots = rawSlots.map((s) => ({
    ...s,
    instruction: s.instruction ? interpolatePromptVariables(s.instruction, {
      sourceLang,
      targetLang,
      explainLang
    }) : ""
  }));
  const slotKillLists = rawSlots.flatMap((s) => s.killList || []);
  const combinedKillList = [...mode.killList || [], ...slotKillLists];
  const killListBlock = compileKillListInstruction(combinedKillList, options.globalKillList);
  let systemHintBlock = "";
  if (mode.systemHint) {
    const rawHints = Array.isArray(mode.systemHint) ? mode.systemHint : [mode.systemHint];
    const hints = rawHints.map((h) => interpolatePromptVariables(h, { sourceLang, targetLang, explainLang }).trim()).filter(Boolean);
    if (hints.length > 0) {
      systemHintBlock = `

[USER SPECIFIED MODE RULES - MANDATORY]:
${hints.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`;
    }
  }
  let codeSwitchingBlock = "";
  if (mode.preserveCodeSwitching && mode.flow === "proofread") {
    codeSwitchingBlock = `

[CODE-SWITCHING PRESERVATION]:
If the user's input draft contains native ${sourceLang} words or expressions mixed in, seamlessly translate them into ${targetLang} in the fixed and native outputs, and explicitly record the translation in the takeaways ("fixes").`;
  }
  let contextBlock = "";
  if (options.context && options.context.trim()) {
    contextBlock = `

[CONTEXT / RECENT GIT DIFF]:
${options.context.trim().slice(0, 500)}`;
  }
  if (mode.flow === "proofread") {
    const base2 = buildModifySystemPrompt({
      sourceLang,
      targetLang,
      explainLang,
      customSlots: interpolatedSlots
    });
    return `${base2}${codeSwitchingBlock}${systemHintBlock}${contextBlock}${killListBlock}`;
  }
  const base = buildPromptCandidatesSystemPrompt({
    sourceLang,
    targetLang,
    promptSlots: interpolatedSlots
  });
  return `${base}${codeSwitchingBlock}${systemHintBlock}${contextBlock}${killListBlock}`;
}
async function executeModeRunner(text, mode, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }
  const resolvedReasoning = mode.reasoning ?? cfg.reasoning ?? "low";
  const effectiveCfg = {
    ...cfg,
    reasoning: resolvedReasoning
  };
  const sysPrompt = compileModeSystemPrompt(mode, {
    sourceLang: effectiveCfg.sourceLang,
    targetLang: effectiveCfg.targetLang,
    explainLang: effectiveCfg.explainLang,
    globalKillList: effectiveCfg.globalKillList,
    context: effectiveCfg.context || userConfig.context
  });
  const raw = await executeLlmCompletion(trimmed, sysPrompt, effectiveCfg);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const obj = repairAndParseJsonObject(raw);
  if (!obj) {
    const fallbackSingle = extractCleanJsonField(raw, mode.slots[0]?.id || "prompt");
    if (fallbackSingle) {
      return [{ id: mode.slots[0]?.id || "concise", label: mode.slots[0]?.label || "Direct", content: fallbackSingle }];
    }
    return null;
  }
  const enabledSlots = mode.slots.filter((s) => s.enabled !== false);
  const vocabSlot = enabledSlots.find((s) => s.role === "vocab" || s.id === "vocab" || s.id === "fixes");
  const extractedVocab = vocabSlot && !BLOCKED_JSON_KEYS.has(vocabSlot.id) && typeof obj[vocabSlot.id] === "string" && obj[vocabSlot.id].trim() ? obj[vocabSlot.id].trim() : typeof obj.fixes === "string" && obj.fixes.trim() ? obj.fixes.trim() : typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : void 0;
  const rewriteSlots = enabledSlots.filter((s) => s.role !== "vocab" && s.id !== "source");
  const candidates = [];
  for (const slot of rewriteSlots) {
    if (BLOCKED_JSON_KEYS.has(slot.id)) continue;
    let val = obj[slot.id];
    if (!val) {
      if (slot.id === "fixed" && typeof obj.fixed === "string") val = obj.fixed;
      else if (slot.id === "native" && typeof obj.native === "string") val = obj.native;
      else if (rewriteSlots.length === 1) val = obj.prompt ?? obj.direct_spec ?? obj.fixed ?? obj.spoken;
    }
    const meaningVal = typeof obj[`${slot.id}_meaning`] === "string" ? obj[`${slot.id}_meaning`].trim() : void 0;
    if (typeof val === "string" && val.trim()) {
      candidates.push({
        id: slot.id,
        label: slot.label,
        content: val.trim(),
        meaning: meaningVal,
        ...extractedVocab ? { vocab: extractedVocab } : {},
        hideWhenLong: Boolean(slot.hideWhenLong)
      });
    }
  }
  if (mode.primarySlotId && candidates.length > 1) {
    const pIdx = candidates.findIndex((c) => c.id.toLowerCase() === mode.primarySlotId?.toLowerCase());
    if (pIdx > 0) {
      const [primary] = candidates.splice(pIdx, 1);
      candidates.unshift(primary);
    }
  }
  return candidates.length > 0 ? candidates : null;
}
async function generatePromptCandidates(text, userConfig = {}) {
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  const slots = resolveCandidateSlotsFromConfig({
    sourceLang: cfg.sourceLang,
    promptSlots: userConfig.promptSlots ?? diskConfig.promptSlots
  });
  const isModify = slots.some((s) => s.id === "fixed");
  const virtualMode = {
    id: isModify ? "live-flow" : "candidates",
    name: isModify ? "\u5B9E\u6218\u72C2\u98D9" : "\u5019\u9009\u751F\u6210",
    flow: isModify ? "proofread" : "translate",
    action: isModify ? "transform" : "select",
    hud: isModify ? "adaptive-takeaway" : "tree",
    slots,
    enabled: true
  };
  return executeModeRunner(text, virtualMode, userConfig);
}
async function rewritePromptDirect(text, userConfig = {}) {
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  const allSlots = resolveDirectSlotsFromConfig({
    sourceLang: cfg.sourceLang,
    directSlots: userConfig.directSlots ?? userConfig.promptSlots ?? diskConfig.directSlots
  }).filter((s) => s.enabled !== false && s.role !== "vocab");
  const firstSlot = allSlots[0] || getDefaultDirectSlots(cfg.sourceLang)[0];
  const res = await generatePromptCandidates(text, { ...userConfig, promptSlots: [firstSlot] });
  return res && res[0] ? res[0].content : null;
}
function stripLingualContextWhenOff(systemPrompt, lastUserText = "", tunerArmed = false) {
  if (!systemPrompt) return systemPrompt;
  if (tunerArmed || /(?:lingual-tuner|\/lingual\s+(?:tuner|tune|agent)|(?:定制|配置|调整)伴学)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt.replace(/\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "").replace(/\s*<skill[^>]*>[\s\S]*?<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "");
}
var MODE_DISPLAY_BY_LANG = {
  zh: {
    companion: "\u7EAF\u4F34\u5B66",
    direct: "\u76F4\u63A5\u6539",
    candidates: "\u6311\u5019\u9009",
    modify: "\u539F\u53E5\u4FEE\u8865",
    off: "\u5DF2\u5173\u95ED",
    notifyCompanion: (p) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30101 \u7EAF\u4F34\u5B66 (companion)\u3011\uFF1A\u539F\u8BDD 0ms \u76F4\u53D1 + \u4E0A\u65B9\u6D6E\u73B0\u4F34\u5B66\u5361`,
    notifyDirect: (p, s1) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30102 \u76F4\u63A5\u6539 (direct)\u3011\uFF1A\u6309\u9996\u69FD [${s1}] 1\u5BF91 \u76F4\u63A5\u6539\u597D\u53D1\u51FA`,
    notifyCandidates: (p, s) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30103 \u6311\u5019\u9009 (candidates)\u3011\uFF1A\u751F\u6210\u5019\u9009 (${s}) \u6311\u4E00\u53D1\u51FA`,
    notifyModify: (p, s1) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30104 \u539F\u53E5\u4FEE\u8865 (modify)\u3011\uFF1A\u6781\u7B80\u4FEE\u6B63 [${s1}] \u79D2\u53D1 + \u4E0A\u65B9\u539F\u751F\u5BF9\u7167`,
    notifyOff: (p) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30100 \u5DF2\u5173\u95ED (off)\u3011\uFF1A\u5E95\u680F\u9690\u85CF \xB7 \u76D1\u542C\u5DF2\u5378 \xB7 0 Token \u96F6\u8D1F\u62C5`
  },
  tw: {
    companion: "\u7D14\u4F34\u5B78",
    direct: "\u76F4\u63A5\u6539",
    candidates: "\u6311\u5019\u9078",
    modify: "\u539F\u53E5\u4FEE\u88DC",
    off: "\u5DF2\u95DC\u9589",
    notifyCompanion: (p) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30101 \u7D14\u4F34\u5B78 (companion)\u3011\uFF1A\u539F\u8A71 0ms \u76F4\u767C + \u4E0A\u65B9\u6D6E\u73FE\u4F34\u5B78\u5361`,
    notifyDirect: (p, s1) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30102 \u76F4\u63A5\u6539 (direct)\u3011\uFF1A\u6309\u9996\u69FD [${s1}] 1\u5C0D1 \u76F4\u63A5\u6539\u597D\u767C\u51FA`,
    notifyCandidates: (p, s) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30103 \u6311\u5019\u9078 (candidates)\u3011\uFF1A\u751F\u6210\u5019\u9078 (${s}) \u6311\u4E00\u767C\u51FA`,
    notifyModify: (p, s1) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30104 \u539F\u53E5\u4FEE\u88DC (modify)\u3011\uFF1A\u6975\u7C21\u4FEE\u6B63 [${s1}] \u79D2\u767C + \u4E0A\u65B9\u539F\u751F\u5C0D\u7167`,
    notifyOff: (p) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30100 \u5DF2\u95DC\u9589 (off)\u3011\uFF1A\u5E95\u6B04\u96B1\u85CF \xB7 \u76E3\u807D\u5DF2\u5378 \xB7 0 Token \u96F6\u8CA0\u64D4`
  },
  ja: {
    companion: "\u4F34\u8D70",
    direct: "\u76F4\u6539",
    candidates: "\u5019\u88DC\u9078",
    modify: "\u539F\u6587\u4FEE\u6B63",
    off: "\u30AA\u30D5",
    notifyCompanion: (p) => `[${p}] \u30101 \u4F34\u8D70 (companion)\u3011\u306B\u5207\u66FF\uFF1A\u539F\u65870ms\u9001\u4FE1\uFF0B\u4E0A\u90E8\u306B\u5B66\u7FD2\u30AB\u30FC\u30C9\u8868\u793A`,
    notifyDirect: (p, s1) => `[${p}] \u30102 \u76F4\u6539 (direct)\u3011\u306B\u5207\u66FF\uFF1A\u7B2C1\u30B9\u30ED\u30C3\u30C8 [${s1}] \u3067\u76F4\u63A5\u66F8\u304D\u63DB\u3048\u3066\u9001\u4FE1`,
    notifyCandidates: (p, s) => `[${p}] \u30103 \u5019\u88DC\u9078 (candidates)\u3011\u306B\u5207\u66FF\uFF1A\u5019\u88DC (${s}) \u304B\u3089\u9078\u629E\u3057\u3066\u9001\u4FE1`,
    notifyModify: (p, s1) => `[${p}] \u30104 \u539F\u6587\u4FEE\u6B63 (modify)\u3011\u306B\u5207\u66FF\uFF1A\u6700\u5C0F\u4FEE\u6B63 [${s1}] \u5373\u6642\u9001\u4FE1\uFF0B\u81EA\u7136\u8868\u73FE\u6BD4\u8F03`,
    notifyOff: (p) => `[${p}] \u30100 \u30AA\u30D5 (off)\u3011\uFF1A\u4E0B\u90E8\u30D0\u30FC\u975E\u8868\u793A\u30FB\u76E3\u8996\u505C\u6B62\u30FB0 Token \u7121\u8CA0\u8377`
  },
  en: {
    companion: "Companion",
    direct: "Direct",
    candidates: "Candidates",
    modify: "Modify",
    off: "Off",
    notifyCompanion: (p) => `[${p}] Switched to [1 Companion] mode: 0ms raw send + learning card above`,
    notifyDirect: (p, s1) => `[${p}] Switched to [2 Direct (Prompt)] mode: 1-to-1 send via Slot #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Switched to [3 Candidates (select)] mode: Pick from (${s})`,
    notifyModify: (p, s1) => `[${p}] Switched to [4 Modify (In-Place Fix)] mode: Surgical fix via [${s1}] + native sibling`,
    notifyOff: (p) => `[${p}] Switched to [0 Off] mode: Status hidden \xB7 listeners detached \xB7 0 tokens`
  }
};
function resolveModeDisplaySpec(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  return MODE_DISPLAY_BY_LANG[norm] || MODE_DISPLAY_BY_LANG.en;
}
var MODE_ALIAS_MAP = {
  "1": "original",
  companion: "original",
  learn: "original",
  study: "original",
  original: "original",
  orig: "original",
  "\u7EAF\u4F34\u5B66": "original",
  "\u7D14\u4F34\u5B78": "original",
  "\u4F34\u5B66": "original",
  "\u4F34\u8D70": "original",
  "2": "english",
  direct: "english",
  rewrite: "english",
  refine: "english",
  english: "english",
  en: "english",
  eng: "english",
  lazy: "english",
  "\u89C4\u8303\u76F4\u53D1": "english",
  "\u76F4\u63A5\u6539": "english",
  "\u76F4\u6539": "english",
  "\u76F4\u51FA": "english",
  "\u4ED5\u69D8\u76F4\u884C": "english",
  "3": "select",
  candidates: "select",
  candidate: "select",
  select: "select",
  choices: "select",
  choice: "select",
  pick: "select",
  "\u6311\u5019\u9009": "select",
  "\u6311\u5019\u9078": "select",
  "\u5019\u9009": "select",
  "\u5019\u88DC\u9078": "select",
  "4": "modify",
  modify: "modify",
  polish: "modify",
  fix: "modify",
  proofread: "modify",
  raw: "modify",
  "live-flow": "modify",
  "\u5B9E\u6218\u72C2\u98D9": "modify",
  "\u539F\u53E5\u4FEE\u8865": "modify",
  "\u539F\u53E5\u4FEE\u88DC": "modify",
  "\u4FEE\u8865": "modify",
  "\u5B9F\u6226\u75BE\u8D70": "modify",
  "\u539F\u6587\u4FEE\u6B63": "modify",
  "0": "off",
  off: "off",
  disable: "off",
  stop: "off",
  "\u5DF2\u5173\u95ED": "off",
  "\u5DF2\u95DC\u9589": "off",
  "\u5173\u95ED": "off",
  "\u30AA\u30D5": "off"
};
function normalizeLingualModeInput(raw) {
  if (!raw) return null;
  return MODE_ALIAS_MAP[raw.trim().toLowerCase()] || null;
}
var CURRENT_FEATURE_BANNER_VERSION = "0.6.0";
function normalizeLocaleTag(raw) {
  return (raw || "").toLowerCase().replace(/_/g, "-").split(".")[0];
}
function isTraditionalChineseLocale(tag) {
  return tag.startsWith("zh-tw") || tag.startsWith("zh-hk") || tag.startsWith("zh-hant") || tag === "zh-mo";
}
function resolveReleaseBannerLang(explicitSourceLang, sessionEntries) {
  const supported = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);
  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    return supported.has(clean) ? clean : "en";
  }
  if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
    for (let i = sessionEntries.length - 1; i >= 0; i--) {
      const e = sessionEntries[i];
      if (e?.type === "message" && e?.message?.role === "user") {
        const text = Array.isArray(e.message.content) ? e.message.content.map((c) => c?.text || "").join(" ") : String(e.message.content || "");
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
        if (/[\uac00-\ud7af]/.test(text)) return "ko";
        if (/[\u0400-\u04ff]/.test(text)) return "ru";
        if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
      }
    }
  }
  try {
    const i18nFile = path.join(os.homedir(), ".config", "rpiv-i18n", "config.json");
    if (fs.existsSync(i18nFile)) {
      const raw = JSON.parse(fs.readFileSync(i18nFile, "utf8"));
      const loc = normalizeLocaleTag(String(raw?.locale || raw?.lang || ""));
      if (isTraditionalChineseLocale(loc)) return "tw";
      const prefix = loc.split("-")[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {
  }
  try {
    const envLocale = normalizeLocaleTag(
      process.env.LC_ALL || process.env.LANGUAGE || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale || "en"
    );
    if (isTraditionalChineseLocale(envLocale)) return "tw";
    const prefix = envLocale.split("-")[0];
    if (supported.has(prefix)) return prefix;
  } catch {
  }
  return "en";
}
function formatReleaseBannerLines(sourceLang = "en", maxCols = 80, fg = (_c, t) => t) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const effectiveCols = typeof maxCols === "number" && maxCols > 0 ? maxCols : 80;
  const copyByLang = {
    zh: {
      title: "\xB7 [pi-lingual v0.6.0] \u6781\u7B80\u53CC\u6838\u6A21\u5F0F\u4E0A\u7EBF & Tuner \u5B8C\u5168\u5F00\u653E (\u53D1\u6D88\u606F\u81EA\u52A8\u6536\u8D77)",
      subtitle: "\u2502 \u4E00\u5207\u6A21\u5F0F\u4E0E\u63D0\u793A\u8BCD\u7686\u53EF\u5BF9\u8BDD\u5B9A\u5236\uFF1B\u51FA\u5382\u7CBE\u7B80\u4E3A\u4E24\u5927\u6838\u5FC3\uFF1B\u914D\u7F6E\u6C38\u4E45\u72EC\u7ACB",
      rows: [
        "\u250C [\u6838\u5FC3\u5B9A\u5236\u4E2D\u5FC3 \xB7 Tuner] \u6572 /tuner \u76F4\u63A5\u8DDF AI \u8BF4\u8BDD\uFF0C\u968F\u610F\u589E\u5220\u6539\u6A21\u5F0F\u4E0E\u63D0\u793A\u8BCD",
        "\u2502   (\u5185\u7F6E 4 \u5927\u5B9E\u6218\u914D\u88C5\uFF1B\u60F3\u52A0\u53D1\u63A8\u3001\u63D0\u4EA4\u3001\u5BF9\u7EBF\u7B49\u6A21\u5F0F\uFF0C\u4E00\u53E5\u8BDD\u79D2\u6210)",
        "\u251C [1 \u89C4\u8303\u76F4\u53D1 \xB7 direct]  \u6572\u4E2D\u6587\uFF0C0ms \u8F6C\u6210\u4E13\u4E1A\u89C4\u8303\u82F1\u6587\u76F4\u53D1 Agent (/lingual 1)",
        "\u2502   (\u4FDD\u8BC1\u4EE3\u7801\u548C\u6CE8\u91CA\u662F\u7EAF\u82F1\u6587\uFF1B\u9002\u5408\u4E13\u6CE8\u5F00\u53D1\u3001\u4E0D\u60F3\u8D39\u8111\u618B\u82F1\u8BED\u65F6\u4F7F\u7528)",
        "\u251C [2 \u5B9E\u6218\u72C2\u98D9 \xB7 live]    \u76F4\u63A5\u6253\u82F1\u6587\uFF1B\u53EA\u4FEE\u8BED\u6CD5\u9519\u8BCD\uFF0C\u7C97\u53E3\u4E0E\u60C5\u7EEA 100% \u4FDD\u7559",
        "\u2514   (\u60F3\u9A82\u5C31\u9A82\uFF0C\u8BED\u6CD5\u81EA\u52A8\u515C\u5E95\uFF1B\u4E0B\u65B9\u7528\u4E2D\u6587\u8BB2\u900F\u76F2\u70B9\uFF0C\u8D8A\u7528\u8BED\u611F\u8D8A\u5F3A)"
      ]
    },
    tw: {
      title: "\xB7 [pi-lingual v0.6.0] \u6975\u7C21\u96D9\u6838\u6A21\u5F0F\u4E0A\u7DDA & Tuner \u5B8C\u5168\u958B\u653E (\u767C\u8A0A\u606F\u81EA\u52D5\u6536\u8D77)",
      subtitle: "\u2502 \u4E00\u5207\u6A21\u5F0F\u8207\u63D0\u793A\u8A5E\u7686\u53EF\u5C0D\u8A71\u5B9A\u5236\uFF1B\u51FA\u5EE0\u7CBE\u7C21\u70BA\u5169\u5927\u6838\u5FC3\uFF1B\u8A2D\u5B9A\u6C38\u4E45\u7368\u7ACB",
      rows: [
        "\u250C [\u6838\u5FC3\u5B9A\u5236\u4E2D\u5FC3 \xB7 Tuner] \u6572 /tuner \u76F4\u63A5\u8DDF AI \u8AAA\u8A71\uFF0C\u96A8\u610F\u589E\u522A\u6539\u6A21\u5F0F\u8207\u63D0\u793A\u8A5E",
        "\u2502   (\u5167\u7F6E 4 \u5927\u5BE6\u6230\u914D\u88DD\uFF1B\u60F3\u52A0\u767C\u63A8\u3001\u63D0\u4EA4\u3001\u5C0D\u7DDA\u7B49\u6A21\u5F0F\uFF0C\u4E00\u53E5\u8A71\u79D2\u6210)",
        "\u251C [1 \u898F\u7BC4\u76F4\u767C \xB7 direct]  \u6572\u4E2D\u6587\uFF0C0ms \u8F49\u6210\u5C08\u696D\u898F\u7BC4\u82F1\u6587\u76F4\u767C Agent (/lingual 1)",
        "\u2502   (\u4FDD\u8B49\u4EE3\u78BC\u548C\u8A3B\u91CB\u662F\u7D14\u82F1\u6587\uFF1B\u9069\u5408\u5C08\u6CE8\u958B\u767C\u3001\u4E0D\u60F3\u8CBB\u8166\u618B\u82F1\u8A9E\u6642\u4F7F\u7528)",
        "\u251C [2 \u5BE6\u6230\u72C2\u98C6 \xB7 live]    \u76F4\u63A5\u6253\u82F1\u6587\uFF1B\u53EA\u4FEE\u8A9E\u6CD5\u932F\u8A5E\uFF0C\u7C97\u53E3\u8207\u60C5\u7DD2 100% \u4FDD\u7559",
        "\u2514   (\u60F3\u7F75\u5C31\u7F75\uFF0C\u8A9E\u6CD5\u81EA\u52D5\u515C\u5E95\uFF1B\u4E0B\u65B9\u7528\u4E2D\u6587\u8B1B\u900F\u76F2\u9EDE\uFF0C\u8D8A\u7528\u8A9E\u611F\u8D8A\u5F37)"
      ]
    },
    ja: {
      title: "\xB7 [pi-lingual v0.6.0] \u30B3\u30A22\u30E2\u30FC\u30C9\u5237\u65B0 & Tuner \u5168\u9762\u958B\u653E (\u9001\u4FE1\u3067\u9589\u3058\u308B)",
      subtitle: "\u2502 \u5168\u30E2\u30FC\u30C9\u3068\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u5BFE\u8A71\u3067\u81EA\u5728\u306B\u8A2D\u8A08\uFF1B\u8A2D\u5B9A\u306F\u6C38\u4E45\u30ED\u30FC\u30AB\u30EB\u4FDD\u6301",
      rows: [
        "\u250C [\u5BFE\u8A71\u8A2D\u8A08 \xB7 Tuner]     /tuner \u3067AI\u3068\u5BFE\u8A71\u3057\u3001\u65B0\u30E2\u30FC\u30C9\u3084\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u5373\u8FFD\u52A0",
        "\u2502   (4\u5927\u30D7\u30EA\u30BB\u30C3\u30C8\u5185\u8535 \xB7 PR\u30EC\u30D3\u30E5\u30FC\u3084SNS\u6295\u7A3F\u7528\u30E2\u30FC\u30C9\u3082\u4F1A\u8A71\u3060\u3051\u3067\u5B8C\u6210)",
        "\u251C [1 \u4ED5\u69D8\u76F4\u884C \xB7 direct]  \u6BCD\u8A9E\u5165\u529B\u30010ms\u3067\u898F\u7BC4\u7684\u82F1\u8A9E\u306B\u6574\u3048\u5373\u9001\u4FE1 (/lingual 1)",
        "\u2502   (\u30B3\u30FC\u30C9\u3068\u30B3\u30E1\u30F3\u30C8\u306E\u5B8C\u5168\u82F1\u8A9E\u5316\u3092\u4FDD\u8A3C \xB7 \u96C6\u4E2D\u3057\u3066\u958B\u767A\u3092\u9032\u3081\u305F\u3044\u6642\u306B)",
        "\u251C [2 \u5B9F\u6226\u75BE\u8D70 \xB7 live]    \u82F1\u8A9E\u3067\u76F4\u63A5\u5165\u529B\uFF1B\u30B9\u30E9\u30F3\u30B0\u30FB\u611F\u60C5\u3092100%\u4FDD\u6301\u3057\u88DC\u6B63",
        "\u2514   (\u611F\u60C5\u306E\u307E\u307E\u306B\u5165\u529B\u53EF\u80FD \xB7 \u4E0B\u90E8\u306B\u6BCD\u8A9E\u3067\u6587\u6CD5\u76F2\u70B9\u3092\u76F4\u611F\u7684\u306B\u89E3\u8AAC)"
      ]
    },
    ko: {
      title: "\xB7 [pi-lingual v0.6.0] \uB4C0\uC5BC \uCF54\uC5B4 \uBAA8\uB4DC & Tuner \uC804\uBA74 \uAC1C\uBC29 (\uC785\uB825 \uC2DC \uB2EB\uD798)",
      subtitle: "\u2502 \uBAA8\uB4E0 \uBAA8\uB4DC\uC640 \uD504\uB86C\uD504\uD2B8\uB97C \uB300\uD654\uB85C \uB9DE\uCDA4 \uC124\uC815; \uC124\uC815\uC740 \uB85C\uCEEC\uC5D0 \uC601\uAD6C \uBCF4\uC874",
      rows: [
        "\u250C [\uB9DE\uCDA4 \uC124\uACC4 \xB7 Tuner]    /tuner \uB85C AI\uC640 \uB300\uD654\uD558\uBA70 \uBAA8\uB4DC\uC640 \uD504\uB86C\uD504\uD2B8 \uC790\uC720 \uCD94\uAC00",
        "\u2502   (4\uB300 \uD504\uB9AC\uC14B \uB0B4\uC7A5 \xB7 PR \uAC80\uD1A0\uB098 SNS\uC6A9 \uBAA8\uB4DC\uB3C4 \uB9D0 \uD55C\uB9C8\uB514\uB85C \uC989\uC2DC \uC0DD\uC131)",
        "\u251C [1 \uB17C\uB9AC\uC815\uC81C \xB7 direct]  \uBAA8\uAD6D\uC5B4 \uC785\uB825, 0ms \uADDC\uACA9\uD654\uB41C \uAE30\uC220 \uC601\uC5B4\uB85C \uC989\uC2DC \uC804\uC1A1",
        "\u2502   (\uCF54\uB4DC\uC640 \uC8FC\uC11D\uC758 \uC21C\uC218 \uC601\uC5B4 \uC720\uC9C0 \xB7 \uAC1C\uBC1C\uC5D0 \uC9D1\uC911\uD558\uACE0 \uC2F6\uC744 \uB54C \uCD5C\uC801)",
        "\u251C [2 \uC2E4\uC804\uC9C8\uC8FC \xB7 live]    \uC601\uC5B4\uB85C \uC9C1\uC811 \uC791\uC131; \uAC70\uCE5C \uD45C\uD604 100% \uC720\uC9C0\uD558\uBA70 \uAD50\uC815 \uC804\uC1A1",
        "\u2514   (\uAC10\uC815 \uADF8\uB300\uB85C \uC785\uB825 \uAC00\uB2A5 \xB7 \uD558\uB2E8\uC5D0 \uBAA8\uAD6D\uC5B4\uB85C \uD575\uC2EC \uBB38\uBC95 \uB9F9\uC810 \uBCF5\uAE30)"
      ]
    },
    es: {
      title: "\xB7 [pi-lingual v0.6.0] D\xFAo esencial y Tuner abierto (cierra al enviar)",
      subtitle: "\u2502 Dise\xF1a modos y prompts conversando; configuraci\xF3n aislada en local",
      rows: [
        "\u250C [Centro Tuner]   Ejecuta /tuner para crear o cambiar modos con AI",
        "\u2502   (4 recetas listas; a\xF1ade flujos de PR o Twitter en una frase)",
        "\u251C [1 Directo]      Escribe en tu idioma, 0ms a ingl\xE9s t\xE9cnico",
        "\u2502   (Mantiene c\xF3digo y comentarios en ingl\xE9s; avanza r\xE1pido)",
        "\u251C [2 Live Flow]    Escribe directo en ingl\xE9s; pasi\xF3n y tacos intactos",
        "\u2514   (Pasa tu rabia sin censura; notas abajo para aprender el porqu\xE9)"
      ]
    },
    fr: {
      title: "\xB7 [pi-lingual v0.6.0] Duo essentiel et Tuner ouvert (ferm\xE9 \xE0 l'envoi)",
      subtitle: "\u2502 Cr\xE9ez modes et prompts en dialoguant ; configuration locale isol\xE9e",
      rows: [
        "\u250C [Centre Tuner]   Tapez /tuner pour cr\xE9er ou modifier des modes avec l'IA",
        "\u2502   (4 recettes int\xE9gr\xE9es ; ajoutez des modes PR en une phrase)",
        "\u251C [1 Direct]       Saisie en langue native, 0ms vers l'anglais technique",
        "\u2502   (Code et commentaires en anglais pur ; id\xE9al pour coder)",
        "\u251C [2 Live Flow]    Saisie directe en anglais ; passion et jurons gard\xE9s",
        "\u2514   (Exprimez-vous sans filtre ; explications claires sous la saisie)"
      ]
    },
    de: {
      title: "\xB7 [pi-lingual v0.6.0] 2 Kern-Modi & Tuner offen (schlie\xDFt bei Senden)",
      subtitle: "\u2502 Modi & Prompts per Chat anpassen; Konfiguration dauerhaft isoliert",
      rows: [
        "\u250C [Tuner-Zentrale]  /tuner starten, um Modi und Prompts anzupassen",
        "\u2502   (4 Rezepte an Bord; neue PR- oder Twitter-Modi mit einem Satz)",
        "\u251C [1 Direkt]        Auf Deutsch tippen, 0ms als klares Englisch",
        "\u2502   (H\xE4lt Code & Kommentare auf Englisch; perfekt f\xFCr Fokus)",
        "\u251C [2 Live Flow]     Direkt auf Englisch tippen; Emotionen 100% erhalten",
        "\u2514   (Tippen ohne Zensur; kurze muttersprachliche Erkl\xE4rungen unten)"
      ]
    },
    ru: {
      title: "\xB7 [pi-lingual v0.6.0] 2 \u0433\u043B\u0430\u0432\u043D\u044B\u0445 \u0440\u0435\u0436\u0438\u043C\u0430 \u0438 Tuner (\u0437\u0430\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u0432\u0432\u043E\u0434\u0435)",
      subtitle: "\u2502 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0440\u0435\u0436\u0438\u043C\u043E\u0432 \u0438 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0447\u0435\u0440\u0435\u0437 AI; \u043A\u043E\u043D\u0444\u0438\u0433 \u0438\u0437\u043E\u043B\u0438\u0440\u043E\u0432\u0430\u043D \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E",
      rows: [
        "\u250C [\u0426\u0435\u043D\u0442\u0440 Tuner]    \u041D\u0430\u0431\u0435\u0440\u0438\u0442\u0435 /tuner \u0434\u043B\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0436\u0438\u043C\u043E\u0432 \u0441 AI",
        "\u2502   (4 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u0440\u0435\u0446\u0435\u043F\u0442\u0430; \u0440\u0435\u0436\u0438\u043C\u044B \u0441\u043E\u0437\u0434\u0430\u044E\u0442\u0441\u044F \u0432 \u043E\u0434\u043D\u0443 \u0444\u0440\u0430\u0437\u0443)",
        "\u251C [1 \u041F\u0440\u044F\u043C\u043E\u0439 \u043F\u043E\u0442\u043E\u043A] \u0412\u0432\u043E\u0434 \u043D\u0430 \u0440\u043E\u0434\u043D\u043E\u043C \u044F\u0437\u044B\u043A\u0435, 0\u043C\u0441 \u0432 \u0447\u0435\u0442\u043A\u0438\u0439 \u0442\u0435\u0445-\u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
        "\u2502   (\u0427\u0438\u0441\u0442\u044B\u0439 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0432 \u043A\u043E\u0434\u0435 \u0438 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F\u0445; \u0434\u043B\u044F \u0431\u044B\u0441\u0442\u0440\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B)",
        "\u251C [2 Live Flow]    \u041F\u0438\u0448\u0438\u0442\u0435 \u0441\u0440\u0430\u0437\u0443 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u043C; \u0441\u043B\u0435\u043D\u0433 \u0438 \u044D\u043C\u043E\u0446\u0438\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B",
        "\u2514   (\u0412\u0432\u043E\u0434 \u0431\u0435\u0437 \u0446\u0435\u043D\u0437\u0443\u0440\u044B; \u0432\u043D\u0438\u0437\u0443 \u043F\u043E\u043D\u044F\u0442\u043D\u044B\u0439 \u0440\u0430\u0437\u0431\u043E\u0440 \u043F\u0440\u0430\u0432\u0438\u043B)"
      ]
    },
    en: {
      title: "\xB7 [pi-lingual v0.6.0] Dual-Core Golden Defaults & Tuner (auto-dismiss)",
      subtitle: "\u2502 Pure declarative modes & slots; customize via natural language",
      rows: [
        "\u250C [Architect Tuner] Run /tuner to add or edit modes with AI",
        "\u2502   (4 tactical loadouts included: spec, commit, oss, yap)",
        "\u251C [1 Logical Spec \xB7 direct]  Native input \u2794 0ms imperative spec",
        "\u2502   (Ensures clean English instructions while keeping code untouched)",
        "\u251C [2 Live Flow \xB7 live]       Draft in English; grammar patched, passion kept",
        "\u2514   (Vent freely without censorship; takeaway diffs explain rules below)"
      ]
    }
  };
  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}
export {
  CANNOT_START_LINE_CHARS,
  CURRENT_FEATURE_BANNER_VERSION,
  DEFAULT_CONFIG,
  DEFAULT_KILL_LIST,
  LANGUAGE_PRESETS,
  LANGUAGE_SPECS,
  LEGACY_SLOT_PRESETS,
  LINGUAL_SYSTEM_PROMPT,
  LINGUA_SYSTEM_PROMPT,
  LinguaLruCache,
  LingualLruCache,
  LingualSessionController,
  MAX_TRANSLATION_CHARS,
  MAX_TRANSLATION_LINES,
  PRESET_LOADOUTS,
  PROMPT_RULE_PRESETS,
  SLOT_PRESETS,
  SUPPORTED_LANG_CODES,
  addCustomMode,
  addSlotToList,
  addSlotToMode,
  buildDirectRewriteSystemPrompt,
  buildModifySystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildSystemPrompt,
  compileKillListInstruction,
  compileModeSystemPrompt,
  createCustomSlot,
  executeModeRunner,
  extractVocabPhrases,
  formatCapsuleLine,
  formatModelSelectionMessage,
  formatNativeReplyGuardHint,
  formatReleaseBannerLines,
  formatStatusReport,
  formatSubRail,
  formatTerminalAnnotation,
  formatTreeBranch,
  formatVocabItemsAtomic,
  generatePromptCandidates,
  getBannerMaxCols,
  getDefaultDirectSlots,
  getDefaultFactoryModes,
  getDefaultModifySlots,
  getDefaultPromptSlots,
  getDefaultSlots,
  getEffectiveMaxCols,
  getPresetLoadout,
  getVisualWidth,
  globalLinguaCache,
  globalLingualCache,
  interpolatePromptVariables,
  invalidateUserConfigCache,
  isDynamicLongInput,
  isNonEnglish,
  isSupportedLangCode,
  isTestEnvironment,
  isUserLingualConfigured,
  listPresetLoadouts,
  loadUserConfig,
  loadUserLingualConfig,
  moveSlotInList,
  normalizeActiveModeId,
  normalizeLangCode,
  normalizeLingualModeInput,
  normalizePromptRules,
  parseLlmResponse,
  removeCustomMode,
  removeSlotFromList,
  removeSlotFromMode,
  renderCardLayout,
  repairAndParseJsonObject,
  resolveCandidateSlotsFromConfig,
  resolveDirectSlotsFromConfig,
  resolveLabelsForLang,
  resolveLangPair,
  resolveLanguageName,
  resolveModeDisplaySpec,
  resolveModesFromConfig,
  resolveModifySlotsFromConfig,
  resolvePromptRulePreset,
  resolvePromptTargetLangName,
  resolveReleaseBannerLang,
  resolveSlotsForPreset,
  rewritePromptDirect,
  sanitizePromptForTranslation,
  saveUserLingualConfig,
  shouldInjectNativeReplyGuard,
  shouldShieldBypass,
  shouldTriggerTranslation,
  splitSemanticChunks,
  spotlightPhrases,
  stripLinguaAnnotation,
  stripLingualAnnotation,
  stripLingualContextWhenOff,
  toggleCustomMode,
  toggleSlotInList,
  translateCore,
  translatePrompt,
  truncateVisual,
  updateCustomMode,
  updateSlotInList,
  wrapVisualText
};
