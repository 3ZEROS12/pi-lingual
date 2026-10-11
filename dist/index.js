// src/core/prompts.ts
function getDefaultSlots(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const labels = {
    en: { source: "Original", spoken: "Spoken", written: "Written", vocab: "Vocab" },
    zh: { source: "\u539F\u6587", spoken: "\u53E3\u8BED", written: "\u5199\u4F5C", vocab: "\u91CD\u70B9" },
    tw: { source: "\u539F\u6587", spoken: "\u53E3\u8A9E", written: "\u66F8\u9762", vocab: "\u91CD\u9EDE" },
    ja: { source: "\u539F\u6587", spoken: "\u53E3\u8A9E", written: "\u6587\u9762", vocab: "\u5358\u8A9E" },
    ko: { source: "\uC6D0\uBB38", spoken: "\uAD6C\uC5B4", written: "\uBB38\uC5B4", vocab: "\uD575\u5FC3" },
    ru: { source: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B", spoken: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439", written: "\u041F\u0438\u0441\u044C\u043C\u0435\u043D\u043D\u044B\u0439", vocab: "\u041B\u0435\u043A\u0441\u0438\u043A\u0430" },
    pt: { source: "Original", spoken: "Falado", written: "Escrito", vocab: "Vocab" },
    es: { source: "Original", spoken: "Hablado", written: "Escrito", vocab: "Vocab" },
    vi: { source: "Nguy\xEAn b\u1EA3n", spoken: "Kh\u1EA9u ng\u1EEF", written: "V\u0103n b\u1EA3n", vocab: "T\u1EEB v\u1EF1ng" },
    tr: { source: "Orijinal", spoken: "Konu\u015Fma", written: "Yaz\u0131l\u0131", vocab: "Kelime" },
    ar: { source: "\u0627\u0644\u0623\u0635\u0644", spoken: "\u0645\u062D\u0627\u062F\u062B\u0629", written: "\u0643\u062A\u0627\u0628\u0629", vocab: "\u0645\u0641\u0631\u062F\u0627\u062A" },
    my: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    ms: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    fr: { source: "Original", spoken: "Parl\xE9", written: "\xC9crit", vocab: "Vocab" },
    de: { source: "Original", spoken: "Gesprochen", written: "Schriftlich", vocab: "Wortschatz" }
  };
  const l = labels[norm] || labels.en;
  const instructions = {
    zh: {
      spoken: "\u81EA\u7136\u5730\u9053\u7684\u7F8E\u5F0F\u53E3\u8BED\u6D41\uFF08\u6BCF\u65E5\u7AD9\u4F1A\u3001Slack\u6C9F\u901A\u3001\u7ED3\u5BF9\u7F16\u7A0B\u3001\u654F\u6377\u534F\u4F5C\uFF09\u3002\u5730\u9053\u7845\u8C37\u53E3\u543B\u3001\u81EA\u7136\u7F29\u8BFB\u3001\u52A8\u8BCD\u77ED\u8BED\u4E0E\u4FDA\u8BED\u4E60\u60EF\u3002",
      written: "\u4E25\u8C28\u73B0\u4EE3\u7684\u67B6\u6784\u89C4\u8303\u4E66\u9762\u8BED\uFF08PR\u63CF\u8FF0\u3001RFC\u6587\u6863\u3001\u95EE\u9898\u5355\u3001\u67B6\u6784\u8BF4\u660E\uFF09\u3002\u6E05\u6670\u4E13\u4E1A\u7684\u9AD8\u7EA7\u6280\u672F\u6563\u6587\uFF0C\u675C\u7EDD\u9648\u65E7\u7EF4\u591A\u5229\u4E9A\u5F0F\u5957\u8BDD\u4E0EAI\u6C34\u8BCD\u3002",
      vocab: "\u81EA\u9002\u5E94\u8403\u53D6\u5173\u952E\u5730\u9053\u642D\u914D\u3001\u52A8\u8BCD\u8BCD\u7EC4\u3001\u6280\u672F\u6210\u8BED\u6216\u9AD8\u9636\u8868\u8FBE\uFF0C\u52A9\u529B\u638C\u63E1\u5730\u9053\u6BCD\u8BED\u7EA7\u8BED\u611F\u3002"
    },
    tw: {
      spoken: "\u81EA\u7136\u9053\u5730\u7684\u7F8E\u5F0F\u53E3\u8A9E\u6D41\uFF08\u6BCF\u65E5\u7AD9\u6703\u3001Slack\u6E9D\u901A\u3001\u7D50\u5C0D\u7DE8\u7A0B\u3001\u654F\u6377\u5354\u4F5C\uFF09\u3002\u9053\u5730\u77FD\u8C37\u8A9E\u611F\u3001\u81EA\u7136\u7E2E\u8B80\u3001\u52D5\u8A5E\u7247\u8A9E\u8207\u6163\u7528\u8A9E\u3002",
      written: "\u56B4\u8B39\u73FE\u4EE3\u7684\u67B6\u69CB\u898F\u7BC4\u66F8\u9762\u8A9E\uFF08PR\u63CF\u8FF0\u3001RFC\u6587\u6A94\u3001\u554F\u984C\u55AE\u3001\u67B6\u69CB\u8AAA\u660E\uFF09\u3002\u6E05\u6670\u5C08\u696D\u7684\u9AD8\u7D1A\u6280\u8853\u6563\u6587\uFF0C\u675C\u7D55\u9673\u820A\u5957\u8A71\u8207AI\u6D6E\u8A87\u8A5E\u5F59\u3002",
      vocab: "\u81EA\u9069\u61C9\u8403\u53D6\u95DC\u9375\u9053\u5730\u642D\u914D\u3001\u52D5\u8A5E\u7247\u8A9E\u3001\u6280\u8853\u6210\u8A9E\u6216\u9AD8\u968E\u8868\u9054\uFF0C\u52A9\u529B\u638C\u63E1\u9053\u5730\u6BCD\u8A9E\u7D1A\u8A9E\u611F\u3002"
    },
    ja: {
      spoken: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u30C1\u30FC\u30E0\u3068\u306E\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\uFF08\u671D\u4F1A\u3001Slack\u30CF\u30C9\u30EB\u3001\u30DA\u30A2\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u3001\u30AB\u30B8\u30E5\u30A2\u30EB\u30C1\u30E3\u30C3\u30C8\uFF09\u3002\u81EA\u7136\u306A\u77ED\u7E2E\u5F62\u3084\u30A4\u30C7\u30A3\u30AA\u30E0\u3002",
      written: "\u660E\u78BA\u3067\u6D17\u7DF4\u3055\u308C\u305F\u73FE\u4EE3\u7684\u6280\u8853\u6587\u66F8\u8868\u73FE\uFF08PR\u6982\u8981\u3001RFC\u3001Issue\u3001\u6280\u8853\u8A2D\u8A08\u66F8\uFF09\u3002\u80FD\u52D5\u7684\u3067\u7C21\u6F54\u30FB\u8AD6\u7406\u7684\u306A\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u6587\u7AE0\u3002",
      vocab: "\u91CD\u8981\u306A\u9023\u8A9E\u3001\u53E5\u52D5\u8A5E\u3001\u6280\u8853\u8868\u73FE\u3092\u81EA\u5F8B\u7684\u306B\u62BD\u51FA\u3057\u3001\u6BCD\u8A9E\u8A71\u8005\u30EC\u30D9\u30EB\u306E\u8A9E\u5F59\u904B\u7528\u3092\u652F\u63F4\u3002"
    },
    en: {
      spoken: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms.",
      written: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff and AI-slop buzzwords.",
      vocab: "Adaptively extract key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency."
    }
  };
  const inst = instructions[norm] || instructions.en;
  return [
    {
      id: "source",
      label: l.source,
      role: "source",
      enabled: true
    },
    {
      id: "spoken",
      label: l.spoken,
      role: "translation",
      instruction: inst.spoken,
      showMeaning: true,
      enabled: true
    },
    {
      id: "written",
      label: l.written,
      role: "translation",
      instruction: inst.written,
      showMeaning: true,
      enabled: true
    },
    {
      id: "vocab",
      label: l.vocab,
      role: "vocab",
      instruction: inst.vocab,
      enabled: true
    }
  ];
}
var LEGACY_SLOT_PRESETS = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration, code reviews). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms."
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff (e.g. 'we may now proceed') and AI-slop buzzwords (e.g. 'delve', 'testament')."
    }
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit. Sharp, memorable, and human."
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads, Substack, and long-form posts. Concise, authoritative, and direct without corporate marketing fluff."
    }
  },
  japanese: {
    slot1: {
      label: "\u53E3\u8A9E",
      name: "\u65E5\u5E38\u30BF\u30E1\u53E3 (Casual Spoken)",
      instruction: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u53CB\u4EBA\u3068\u306E\u65E5\u5E38\u4F1A\u8A71\u30FBSlack\u30CF\u30C9\u30EB\u30FB\u30AB\u30B8\u30E5\u30A2\u30EB\u306A\u3084\u308A\u53D6\u308A\u306B\u6700\u9069\u306A\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\u3002\u30BF\u30E1\u53E3\u30FB\u89AA\u3057\u307F\u3084\u3059\u3044\u30C8\u30FC\u30F3\u3002"
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
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE, ACM, and Nature journal standards. Precise vocabulary, rigorous methodology descriptions."
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
      },
      {
        input: "\u80A5\u5927\u5316\u3057\u305F\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u6368\u3066\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u79FB\u884C\u3057\u305F\u3089\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F",
        spoken: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken_meaning: "\u91CD\u3044\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u3084\u3081\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u3057\u305F\u3089\u3001\u8D77\u52D5\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F\uFF01",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "\u4E00\u679A\u5CA9\u306E\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u304B\u3089\u4F9D\u5B58\u95A2\u4FC2\u30BC\u30ED\u306E\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u3078\u79FB\u884C\u3057\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u9045\u5EF6\u309210\u500D\u6539\u5584\u3057\u307E\u3057\u305F\u3002",
        vocab: "ditch ... for ... (\u301C\u3092\u624B\u653E\u3057\u3066\u301C\u306B\u4E57\u308A\u63DB\u3048\u308B) \xB7 zero-dep (\u5916\u90E8\u4F9D\u5B58\u30BC\u30ED) \xB7 cold start (\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8) \xB7 yield (\u3082\u305F\u3089\u3059)"
      }
    ]
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: 'in English in parentheses separated by " \xB7 " (e.g. "term1 (English definition) \xB7 term2 (definition) \xB7 ...")',
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "\u3044\u3044\u611F\u3058\u3067\u3059\u306D\u3001\u30EA\u30EA\u30FC\u30B9\u3057\u307E\u3057\u3087\u3046\uFF01",
        spoken_meaning: "Looks great, let's deploy right away.",
        written: "\u78BA\u8A8D\u3057\u307E\u3057\u305F\u3002\u672C\u756A\u74B0\u5883\u3078\u30C7\u30D7\u30ED\u30A4\u3092\u9032\u3081\u307E\u3059\u3002",
        written_meaning: "Reviewed and confirmed. Proceeding with deployment to production.",
        vocab: "\u30EA\u30EA\u30FC\u30B9\u3059\u308B (ship / deploy) \xB7 \u672C\u756A\u74B0\u5883 (production environment)"
      },
      {
        input: "Keep going.",
        spoken: "\u7D9A\u3051\u3066\u3044\u304D\u307E\u3057\u3087\u3046\u3002",
        spoken_meaning: "Let's keep making progress.",
        written: "\u5F8C\u7D9A\u306E\u51E6\u7406\u3092\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002",
        written_meaning: "Please proceed with the subsequent steps.",
        vocab: "\u5F8C\u7D9A\u306E\u51E6\u7406 (subsequent processing) \xB7 \u9032\u3081\u308B (proceed)"
      },
      {
        input: "This feels over-engineered; let's stick to the built-in standard library.",
        spoken: "\u3053\u308C\u3061\u3087\u3063\u3068\u4F5C\u308A\u8FBC\u307F\u3059\u304E\u304B\u3082\u3002\u7D20\u76F4\u306B\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u884C\u304D\u307E\u3057\u3087\u3046\u3002",
        spoken_meaning: "Might be a bit over-complicated; let's simply use the standard library.",
        written: "\u8A2D\u8A08\u304C\u904E\u5270\u306B\u8907\u96D1\u5316\u3057\u3066\u3044\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306E\u6D3B\u7528\u3092\u63A8\u5968\u3057\u307E\u3059\u3002",
        written_meaning: "Architecture is unnecessarily complex. Recommending the standard library.",
        vocab: "\u4F5C\u308A\u8FBC\u307F\u3059\u304E (over-engineered) \xB7 \u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA (standard library) \xB7 \u63A8\u5968\u3059\u308B (recommend)"
      },
      {
        input: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken: "\u91CD\u3044\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u3084\u3081\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u3057\u305F\u3089\u3001\u8D77\u52D5\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F\uFF01",
        spoken_meaning: "Discarded the heavy framework and switched to a zero-dep single file; boot speed jumped 10x!",
        written: "\u80A5\u5927\u5316\u3057\u305F\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u5EC3\u6B62\u3057\u3066\u4F9D\u5B58\u6027\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u69CB\u9020\u3092\u63A1\u7528\u3057\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u901F\u5EA6\u309210\u500D\u5411\u4E0A\u3055\u305B\u307E\u3057\u305F\u3002",
        written_meaning: "Eliminated the bloated framework in favor of a zero-dependency architecture, achieving a 10x speedup in cold-start times.",
        vocab: "\u4F9D\u5B58\u30BC\u30ED (zero-dependency) \xB7 \u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8 (cold start) \xB7 \u5411\u4E0A\u3055\u305B\u308B (improve / speed up)"
      }
    ]
  },
  es: {
    name: "Spanish",
    nativeName: "Espa\xF1ol",
    meaningInstruction: "in native Spanish",
    vocabInstruction: 'in Spanish in parentheses separated by " \xB7 " (e.g. "term1 (significado en espa\xF1ol) \xB7 term2 (...) \xB7 ...")',
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
      },
      {
        input: "Esta propuesta est\xE1 sobrecargada, mejor usar la biblioteca est\xE1ndar",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Parece demasiado complicado; nos ir\xEDa mucho mejor con la librer\xEDa est\xE1ndar",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "La soluci\xF3n propuesta introduce complejidad innecesaria. Se prefiere la biblioteca est\xE1ndar nativa",
        vocab: "over-engineered (sobreingenier\xEDa) \xB7 be better off (estar mejor con) \xB7 stick with (quedarse con) \xB7 leverage (aprovechar)"
      }
    ]
  },
  fr: {
    name: "French",
    nativeName: "Fran\xE7ais",
    meaningInstruction: "in native French",
    vocabInstruction: 'in French in parentheses separated by " \xB7 " (e.g. "term1 (d\xE9finition en fran\xE7ais) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "D'accord, commen\xE7ons",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Tout \xE0 fait d'accord, allons-y",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "D'accord. Proc\xE9dons \xE0 l'impl\xE9mentation",
        vocab: "on board with (\xEAtre d'accord) \xB7 dive in (s'y mettre directement)"
      },
      {
        input: "Continuer",
        spoken: "Let's keep going.",
        spoken_meaning: "Continuons",
        written: "Proceed with the next steps.",
        written_meaning: "Passer aux \xE9tapes suivantes",
        vocab: "keep going (continuer) \xB7 proceed with (proc\xE9der \xE0)"
      },
      {
        input: "Cette approche est trop complexe, autant utiliser la biblioth\xE8que standard",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\xC7a semble surdimensionn\xE9 ; on ferait bien mieux de rester sur la biblioth\xE8que standard",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "L'approche propos\xE9e introduit une complexit\xE9 superflue. L'utilisation de la biblioth\xE8que standard est recommand\xE9e",
        vocab: "over-engineered (surdimensionn\xE9) \xB7 be better off (avoir tout int\xE9r\xEAt \xE0) \xB7 stick with (s'en tenir \xE0) \xB7 leverage (exploiter)"
      }
    ]
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: 'in German in parentheses separated by " \xB7 " (e.g. "term1 (deutsche Definition) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "Einverstanden, fangen wir an",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Voll einverstanden, packen wir es an",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Best\xE4tigt. Wir fahren mit der Implementierung fort",
        vocab: "on board with (einverstanden sein) \xB7 dive in (direkt loslegen)"
      },
      {
        input: "Weiter",
        spoken: "Let's keep going.",
        spoken_meaning: "Machen wir weiter",
        written: "Proceed with the next steps.",
        written_meaning: "Mit den n\xE4chsten Schritten fortfahren",
        vocab: "keep going (weitermachen) \xB7 proceed with (fortfahren mit)"
      },
      {
        input: "Dieser Ansatz ist \xFCberdimensioniert, nutzen wir lieber die Standardbibliothek",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Das wirkt etwas \xFCberdimensioniert; mit der Standardbibliothek fahren wir deutlich besser",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Der vorgeschlagene Ansatz bringt unn\xF6tige Komplexit\xE4t mit sich. Die native Standardbibliothek wird empfohlen",
        vocab: "over-engineered (\xFCberdimensioniert) \xB7 be better off (besser dran sein mit) \xB7 stick with (bleiben bei) \xB7 leverage (nutzen/einsetzen)"
      }
    ]
  }
};
function buildSystemPrompt(sourceLang = "zh", targetLang = "en", isLongInput = false, context, tone = "general", customSlots) {
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.zh;
  const targetName = targetLang === "ja" ? "Japanese" : targetLang === "zh" ? "Chinese" : "English";
  if (Array.isArray(customSlots)) {
    const enabledSlots = customSlots.filter((s) => s.enabled && s.role !== "source");
    let taskLines = [];
    let jsonProps = [];
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
    const dynamicJsonHint = `Strict JSON format:
{
${jsonProps.join(",\n")}
}`;
    const condensationDirective2 = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish \u2014 NEVER drop the second half or final question of the user's message!
Keep the phrasing tight and high-density (under 20 words) so the complete meaning of all sentences fits cleanly on 1-2 lines without mid-sentence truncation.` : "";
    const contextDirective2 = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated translations fit naturally as a responsive reply to this specific context.` : "";
    return `You are an elite bilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), SQL keywords, variable names, and technical identifiers MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective2}${contextDirective2}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }
  const defaultSlots = LEGACY_SLOT_PRESETS.developer;
  const legacyConfig = customSlots;
  const slot1Name = legacyConfig?.slot1?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.name : defaultSlots.slot1.name);
  const slot1Instruction = legacyConfig?.slot1?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.instruction : defaultSlots.slot1.instruction);
  const slot2Name = legacyConfig?.slot2?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.name : defaultSlots.slot2.name);
  const slot2Instruction = legacyConfig?.slot2?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.instruction : defaultSlots.slot2.instruction);
  const anchorText = spec.anchors.map(
    (a) => `Input: ${JSON.stringify(a.input)}
Output: ${JSON.stringify({
      spoken: a.spoken,
      spoken_meaning: a.spoken_meaning,
      written: a.written,
      written_meaning: a.written_meaning,
      vocab: a.vocab
    })}`
  ).join("\n\n");
  const condensationDirective = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish (both in "summary" and in "spoken"/"written") \u2014 NEVER omit the second half or final question of the user's message!
Express all points tightly and concisely (under 22 words each) so the complete meaning fits cleanly within 2 lines without truncation.` : "";
  const contextDirective = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context (e.g. tweet, thread, issue):
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated spoken and written translations fit naturally as a responsive reply to this specific context, using authentic conversational grounding.` : "";
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

// src/presets.ts
function createCustomSlot(params) {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction: params.instruction?.trim() || (role === "source" ? void 0 : "Natural, authentic expressions matching requested context."),
    showMeaning: params.showMeaning !== void 0 ? params.showMeaning : role !== "source" && role !== "vocab",
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
var SLOT_PRESETS = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "\u53E3\u8BED" : isJa ? "\u53E3\u8A9E" : "Spoken", role: "translation", instruction: "Natural, fluent spoken flow (daily standup, Slack, agile collaboration, conversational banter).", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "\u5199\u4F5C" : isJa ? "\u6587\u9762" : "Written", role: "translation", instruction: "Clear, precise, modern technical written prose (RFCs, PR descriptions, documentation, deep insight).", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : isJa ? "\u5358\u8A9E" : "Vocab", role: "vocab", instruction: "Extract key idiomatic collocations, phrasal verbs, or technical idioms.", enabled: true }
      ];
    }
  },
  social: {
    name: "Social",
    description: "Overseas Twitter / Community building: Hook + Deep + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement, punchy opening hook optimized for Twitter/X threads and viral developer discussions.", showMeaning: true, enabled: true },
        { id: "written", label: "Deep", role: "translation", instruction: "Insightful, narrative technical value and nuanced architecture reasoning.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", instruction: "Key engagement idioms and technical phrases.", enabled: true }
      ];
    }
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: \u53E3\u8A9E + \u656C\u8A9E + \u5358\u8BED",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "\u53E3\u8A9E", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk, direct).", showMeaning: true, enabled: true },
        { id: "written", label: "\u656C\u8A9E", role: "translation", instruction: "Formal, polite business Japanese (Keigo, Sonkeigo/Kenjougo, professional email/PR).", showMeaning: true, enabled: true },
        { id: "vocab", label: "\u5358\u8A9E", role: "vocab", instruction: "Key Japanese vocabulary, kanji readings, and idiomatic expressions.", enabled: true }
      ];
    }
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
        { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for peer-reviewed IEEE/ACM papers and arXiv preprints.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", enabled: false }
      ];
    }
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "\u8BD1\u6587" : isJa ? "\u8A33\u6587" : "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "\u5199\u4F5C" : "Written", role: "translation", enabled: false },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", enabled: false }
      ];
    }
  }
};
function resolveSlotsForPreset(presetName = "developer", sourceLang = "en") {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}
var LANGUAGE_PRESETS = {
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
    notifyAgentHelp: '\u{1F4A1} \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF1A\u76F4\u63A5\u5BF9\u5F53\u524D Agent \u8BF4 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587" \u5373\u53EF\u514D\u547D\u4EE4\u81EA\u52A8\u88C5\u914D\uFF01\u5207\u6362\u6BCD\u8BED\u8BF7\u8FD0\u884C /lang <code>\u3002',
    notifyModelSwitched: "\u4F34\u5B66\u6A21\u578B\u5DF2\u5207\u6362\u4E3A: {model}",
    notifyLangSwitched: "\u4F34\u5B66\u8BED\u8A00\u5DF2\u5207\u6362\u4E3A: {lang}\uFF08\u63D0\u793A\uFF1A\u547D\u4EE4\u8865\u5168\u83DC\u5355\u6587\u9762\u5C06\u5728\u91CD\u542F\u7EC8\u7AEF\u540E\u5B8C\u5168\u540C\u6B65\uFF09",
    notifyLangInvalid: "\u65E0\u6548\u7684\u8BED\u8A00\u4EE3\u7801\u3002\u652F\u6301\u7684\u8BED\u8A00\u4EE3\u7801: zh, ja, en, es, fr, de",
    notifyCompactOn: "[zh \u21C4 en] \u5DF2\u5F00\u542F\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\uFF1A\u6781\u7B80\u5360\u4F4D\uFF0C\u4FDD\u62A4\u5206\u5C4F\u89C6\u91CE",
    notifyCompactOff: "[zh \u21C4 en] \u5DF2\u5207\u6362\u4E3A\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784\uFF1A\u5C55\u793A\u5B8C\u6574\u53CC\u6A21\u4E0E\u8BED\u611F",
    notifyTimeout: "[zh \u21C4 en] \u82F1\u6587\u7FFB\u8BD1\u8BF7\u6C42\u672A\u5C31\u7EEA\u6216\u8D85\u65F6\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[zh \u21C4 en] \u82F1\u6587\u7FFB\u8BD1\u8BF7\u6C42\u5F02\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    cmdDescMode: "\u5207\u6362\u4F34\u5B66\u6A21\u5F0F [zh \u21C4 en]: [\u539F\u6587] \u2794 [\u82F1\u6587] \u2794 [\u5173]",
    cmdDescStatus: "\u67E5\u770B\u4F34\u5B66\u63D2\u4EF6\u5F53\u524D\u72B6\u6001\u62A5\u544A\u4E0E\u6A21\u578B\u8BCA\u65AD: /lingual-status",
    cmdDescModel: "\u67E5\u770B\u6216\u5207\u6362\u4F34\u5B66\u6A21\u578B [zh \u21C4 en]: /lingual-model [model-id|auto]",
    cmdDescLang: "\u67E5\u770B\u6216\u5207\u6362\u4F34\u5B66\u6BCD\u8BED [zh \u21C4 en]: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "\u5207\u6362\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\u4E0E\u5B8C\u6574\u6811\u72B6\u56FE: /lingual-compact",
    cmdDescLast: "\u91CD\u65B0\u56DE\u770B\u6216\u91CD\u73B0\u4E0A\u4E00\u6761\u4F34\u5B66\u5361\u7247: /lingual-last",
    cmdDescAgent: "\u67E5\u770B\u4F34\u5B66\u5B9A\u5236\u4E0E\u6BCD\u8BED\u5207\u6362\u6307\u5357: /lingual-agent",
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
    statusReportLayout: "HUD\u5E03\u5C40: Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784 (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u51ED\u636E\u6A21\u5F0F: Pi \u539F\u751F\u8FDB\u7A0B\u5185\u8BA4\u8BC1 (Zero Config \xB7 \u96F6Token\u6CC4\u9732)",
    statusReportShortcuts: "\u5FEB\u6377\u64CD\u4F5C: /lingual (\u5207\u6362\u6A21\u5F0F) \xB7 /slots (\u7BA1\u7406\u69FD\u4F4D) \xB7 /lang (\u5207\u8BED\u8A00) \xB7 /lingual-compact (\u5207\u6362\u5E03\u5C40)",
    statusReportTuner: "\u69FD\u4F4D\u8C03\u4F18: \u5185\u7F6E lingual-tuner \u6280\u80FD\uFF08\u76F4\u63A5\u5411 Agent \u63CF\u8FF0\u5373\u53EF\u514D\u547D\u4EE4\u5B9A\u5236\uFF09",
    modeDescOriginal: "\u539F\u6587\u76F4\u901A \xB7 0ms\u975E\u963B\u585E",
    modeDescEnglish: "\u82F1\u6587\u6A21\u5F0F \xB7 \u6DF1\u5EA6\u4EE3\u7801\u63A8\u7406",
    modeDescOff: "\u5DF2\u5173\u95ED",
    modelCurrentLabel: "\u5F53\u524D\u4F34\u5B66\u6A21\u578B",
    modelFollowSession: "\u8DDF\u968F\u4F1A\u8BDD",
    modelAvailableListHeader: "\u53EF\u7528\u6A21\u578B (\u8F93\u5165 /lingual-model <id> \u5207\u6362):",
    modelAutoFollowDesc: "auto (\u81EA\u52A8\u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u4E3B\u6A21\u578B)",
    modelSelectHint: "\u53EF\u8F93\u5165 /lingual-model <model-id> \u6216 auto \u6307\u5B9A\u4F34\u5B66\u6A21\u578B\u3002",
    langUsageHint: "\u7528\u6CD5: /lang <zh|ja|en|es|fr|de> [target] (\u5982 /lang ja \u6216 /lang zh ja)",
    langList: [
      "\u2022 zh (\u4E2D\u6587 \u2794 \u82F1\u6587)",
      "\u2022 ja (\u65E5\u672C\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 en (\u82F1\u6587 \u2794 \u65E5\u6587)",
      "\u2022 es (\u897F\u73ED\u7259\u6587 \u2794 \u82F1\u6587)",
      "\u2022 fr (\u6CD5\u6587 \u2794 \u82F1\u6587)",
      "\u2022 de (\u5FB7\u6587 \u2794 \u82F1\u6587)"
    ],
    // 动态槽位架构本地化文案 (中文)
    slotsHeader: "\u52A8\u6001\u69FD\u4F4D\u67B6\u6784",
    slotsActiveTag: "\u6FC0\u6D3B",
    slotsNone: "\u672A\u914D\u7F6E\u4EFB\u4F55\u69FD\u4F4D",
    slotsStatusEnabled: "\u5DF2\u542F\u7528",
    slotsStatusDisabled: "\u5DF2\u7981\u7528",
    slotsWithNuance: " +\u6BCD\u8BED\u5FAE\u91CA\u4E49",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8BED\u8A00\u5B9A\u5236\uFF08\u76F4\u63A5\u5411\u5F53\u524D Agent \u63CF\u8FF0\uFF0C\u65E0\u9700\u624B\u52A8\u8F93\u5165\u547D\u4EE4\uFF09\uFF1A",
    slotsNlExamples: [
      '\u2022 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u7279\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587"',
      '\u2022 "\u628A\u4F34\u5B66\u6539\u6210\u5355\u69FD\u4F4D\u7EAF\u8BD1\u6587"',
      '\u2022 "\u6062\u590D\u9ED8\u8BA4\u4F34\u5B66\u69FD\u4F4D"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \u5E38\u7528\u5FEB\u6377\u547D\u4EE4\uFF1A",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u7269\u7406\u9690\u85CF\u539F\u6587\u884C",
      "\u2022 /slots compact2        - \u6781\u7B80\u53CC\u69FD\u4F4D",
      "\u2022 /slots reset           - \u6062\u590D\u521D\u59CB\u9ED8\u8BA4",
      "\u2022 /slots toggle <id>     - \u4E34\u65F6\u5F00\u5173\u69FD\u4F4D"
    ],
    slotsResetSuccess: "[{pair}] \u5DF2\u91CD\u7F6E\u69FD\u4F4D\u4E3A\u521D\u59CB\u9ED8\u8BA4\u72B6\u6001\uFF08\u539F\u6587 + \u53E3\u8BED + \u5199\u4F5C + \u91CD\u70B9\uFF09",
    slotsRemovedSuccess: '[{pair}] \u5DF2\u79FB\u9664\u69FD\u4F4D [{id}] ("{label}")',
    slotsRemovedSourceNote: "\uFF08\u5DF2\u7269\u7406\u9690\u85CF\u539F\u6587\u884C\uFF09",
    slotsToggled: "[{pair}] \u69FD\u4F4D [{id}] \u5F53\u524D\u72B6\u6001: {status}",
    slotsAdded: '[{pair}] \u5DF2\u6DFB\u52A0/\u66F4\u65B0\u69FD\u4F4D [{id}] "{label}"',
    slotsNotFound: "[{pair}] \u672A\u627E\u5230\u69FD\u4F4D [{id}]\u3002\u8FD0\u884C /slots \u67E5\u770B\u5F53\u524D\u69FD\u4F4D",
    slotsUsageAdd: "\u7528\u6CD5: /slots add <id> <\u6807\u7B7E> [\u63D0\u793A\u8BCD...]\n\u793A\u4F8B: /slots add twitter \u63A8\u6587 280\u5B57\u7B26\u4EE5\u5185\u7206\u6B3E\u6280\u672F\u63A8\u6587",
    slotsUsageRm: "\u7528\u6CD5: /slots rm <\u69FD\u4F4DID> (\u4F8B\u5982 /slots rm source \u9690\u85CF\u539F\u6587)",
    slotsUsageToggle: "\u7528\u6CD5: /slots toggle <\u69FD\u4F4DID>",
    slotsUnknown: '[{pair}] \u672A\u77E5\u69FD\u4F4D\u547D\u4EE4\u6216\u9884\u8BBE "{cmd}"\u3002\u8F93\u5165 /slots \u67E5\u770B\u5F53\u524D\u69FD\u4F4D\u4E0E\u5E2E\u52A9'
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
    notifyOriginal: "[ja \u21C4 en] \u3010\u539F\u6587\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u5165\u529B\u306F\u539F\u6587\u306E\u307E\u307E\u3001\u4E0A\u90E8\u30AB\u30FC\u30C9\u3067\u82F1\u8A9E\u3092\u8868\u793A",
    notifyEnglish: "[ja \u21C4 en] \u3010\u82F1\u8A9E\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1AAI\u3078\u306E\u5165\u529B\u306F\u7D14\u7C8B\u306A\u6280\u8853\u82F1\u8A9E\u306B\u81EA\u52D5\u5909\u63DB\u3055\u308C\u307E\u3059",
    notifyOff: "[ja \u21C4 en] \u4F34\u8D70\u6A5F\u80FD\u3092\u30AA\u30D5\u306B\u3057\u307E\u3057\u305F",
    notifyPaging: "[ja \u21C4 en] \u9577\u6587\u3092\u5206\u5272\u3057\u307E\u3057\u305F\u3002Alt+. \u307E\u305F\u306F Alt+, \u3067\u30DA\u30FC\u30B8\u9001\u308A",
    notifyNoHistory: "[ja \u21C4 en] \u524D\u56DE\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093",
    notifyHistoryRestored: "[ja \u21C4 en] \u524D\u56DE\u306E\u30AB\u30FC\u30C9\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F",
    notifyAgentHelp: "\u{1F4A1} lingual-tuner \u30B9\u30ED\u30C3\u30C8\u8ABF\u6574\u30B9\u30AD\u30EB\u642D\u8F09\uFF1AAgent\u306B\u300C\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u7684\u6D1E\u5BDF\u306E\u307F\u3001\u539F\u6587\u306F\u4E0D\u8981\u300D\u3068\u4F1D\u3048\u308B\u3060\u3051\u3067\u81EA\u52D5\u8A2D\u5B9A\u5B8C\u4E86\uFF01\u6BCD\u8A9E\u5207\u66FF\u306F /lang <code> \u3067\u3059\u3002",
    notifyModelSwitched: "\u30E2\u30C7\u30EB\u3092\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {model}",
    notifyLangSwitched: "\u6BCD\u8A9E\u3092\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {lang}\uFF08\u203B\u30B3\u30DE\u30F3\u30C9\u88DC\u5B8C\u30E1\u30CB\u30E5\u30FC\u306E\u6587\u9762\u306F\u7AEF\u672B\u518D\u8D77\u52D5\u5F8C\u306B\u5B8C\u5168\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\uFF09",
    notifyLangInvalid: "\u7121\u52B9\u306A\u8A00\u8A9E\u30B3\u30FC\u30C9\u3067\u3059\u3002\u5BFE\u5FDC\u8A00\u8A9E: zh, ja, en, es, fr, de",
    notifyCompactOn: "[ja \u21C4 en] 1\u884C\u30AB\u30D7\u30BB\u30EB\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\uFF1A\u753B\u9762\u9818\u57DF\u3092\u6700\u5927\u9650\u78BA\u4FDD",
    notifyCompactOff: "[ja \u21C4 en] \u30D5\u30EB\u30C4\u30EA\u30FC\u8868\u793A\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u8A73\u7D30\u306A\u30CB\u30E5\u30A2\u30F3\u30B9\u3092\u8868\u793A",
    notifySlotSwitched: "[ja \u21C4 en] \u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u3092 [{preset}] \u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {desc}",
    notifyTimeout: "[ja \u21C4 en] \u82F1\u8A9E\u7FFB\u8A33\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    notifyError: "[ja \u21C4 en] \u82F1\u8A9E\u7FFB\u8A33\u30EA\u30AF\u30A8\u30B9\u30C8\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    cmdDescMode: "\u30E2\u30FC\u30C9\u5207\u66FF [ja \u21C4 en]: [\u539F\u6587] \u2794 [\u82F1\u8A9E] \u2794 [\u30AA\u30D5]",
    cmdDescStatus: "\u72B6\u614B\u30EC\u30DD\u30FC\u30C8\u3068\u30E2\u30C7\u30EB\u8A3A\u65AD\u3092\u8868\u793A: /lingual-status",
    cmdDescModel: "\u5B66\u7FD2\u30E2\u30C7\u30EB\u306E\u78BA\u8A8D\u30FB\u5207\u66FF: /lingual-model [model-id|auto]",
    cmdDescLang: "\u4F34\u8D70\u306E\u6BCD\u8A9E\u3092\u78BA\u8A8D\u30FB\u5909\u66F4: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "\u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u306E\u78BA\u8A8D\u30FB\u5207\u66FF [ja \u21C4 en]: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A\u3068\u30D5\u30EB\u30C4\u30EA\u30FC\u306E\u5207\u66FF: /lingual-compact",
    cmdDescLast: "\u524D\u56DE\u306E\u4F34\u8D70\u30AB\u30FC\u30C9\u3092\u518D\u8868\u793A: /lingual-last",
    cmdDescAgent: "\u4F34\u8D70\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3068\u6BCD\u8A9E\u5909\u66F4\u306E\u6848\u5185\u3092\u8868\u793A: /lingual-agent",
    shortcutNextPage: "\u6B21\u306E\u30BB\u30B0\u30E1\u30F3\u30C8\u306B\u5207\u308A\u66FF\u3048",
    shortcutPrevPage: "\u524D\u306E\u30BB\u30B0\u30E1\u30F3\u30C8\u306B\u5207\u308A\u66FF\u3048",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u6587",
    layoutCapsule: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A (1-Line Capsule)",
    layoutTree: "Trifecta \u30AA\u30FC\u30D7\u30F3\u5DE6\u30EC\u30FC\u30EB\u30C4\u30EA\u30FC\u69CB\u9020 (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u30B9\u30C6\u30FC\u30BF\u30B9\u30EC\u30DD\u30FC\u30C8",
    statusReportMode: "\u73FE\u5728\u306E\u30E2\u30FC\u30C9",
    statusReportFlow: "\u8A00\u8A9E\u30D5\u30ED\u30FC",
    statusReportModel: "\u4F34\u8D70\u30E2\u30C7\u30EB",
    statusReportCache: "\u30BB\u30C3\u30B7\u30E7\u30F3\u30AD\u30E3\u30C3\u30B7\u30E5",
    statusReportLayout: "HUD\u30EC\u30A4\u30A2\u30A6\u30C8: Trifecta \u30AA\u30FC\u30D7\u30F3\u5DE6\u30EC\u30FC\u30EB\u30C4\u30EA\u30FC\u69CB\u9020 (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u8A8D\u8A3C\u65B9\u5F0F: Pi \u30CD\u30A4\u30C6\u30A3\u30D6\u30A4\u30F3\u30D7\u30ED\u30BB\u30B9\u8A8D\u8A3C (\u30BC\u30ED\u8A2D\u5B9A\u30FBToken\u5B89\u5168)",
    statusReportShortcuts: "\u30AF\u30A4\u30C3\u30AF\u64CD\u4F5C: /lingual (\u30E2\u30FC\u30C9\u5207\u66FF) \xB7 /slots (\u30B9\u30ED\u30C3\u30C8\u7BA1\u7406) \xB7 /lang (\u8A00\u8A9E\u5207\u66FF) \xB7 /lingual-compact (\u30EC\u30A4\u30A2\u30A6\u30C8\u5207\u66FF)",
    statusReportTuner: "\u30B9\u30ED\u30C3\u30C8\u8ABF\u6574: lingual-tuner \u30B9\u30AD\u30EB\u642D\u8F09\uFF08Agent\u306B\u8981\u671B\u3092\u4F1D\u3048\u308B\u3060\u3051\u3067\u8A2D\u5B9A\uFF09",
    modeDescOriginal: "\u539F\u6587\u30D1\u30B9\u30B9\u30EB\u30FC \xB7 0ms\u975E\u540C\u671F",
    modeDescEnglish: "\u82F1\u8A9E\u30E2\u30FC\u30C9 \xB7 \u9AD8\u5EA6\u30B3\u30FC\u30C9\u63A8\u8AD6",
    modeDescOff: "\u30AA\u30D5",
    modelCurrentLabel: "\u73FE\u5728\u306E\u5B66\u7FD2\u30E2\u30C7\u30EB",
    modelFollowSession: "\u30BB\u30C3\u30B7\u30E7\u30F3\u9023\u52D5",
    modelAvailableListHeader: "\u5229\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB (/lingual-model <id> \u3067\u5207\u66FF):",
    modelAutoFollowDesc: "auto (\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u4E3B\u30E2\u30C7\u30EB\u306B\u81EA\u52D5\u8FFD\u5F93)",
    modelSelectHint: "/lingual-model <model-id> \u307E\u305F\u306F auto \u3092\u5165\u529B\u3057\u3066\u30E2\u30C7\u30EB\u3092\u6307\u5B9A\u3067\u304D\u307E\u3059\u3002",
    langUsageHint: "\u4F7F\u3044\u65B9: /lang <zh|ja|en|es|fr|de> [target] (\u4F8B: /lang ja \u307E\u305F\u306F /lang zh ja)",
    langList: [
      "\u2022 zh (\u4E2D\u56FD\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 ja (\u65E5\u672C\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 en (\u82F1\u8A9E \u2794 \u65E5\u672C\u8A9E)",
      "\u2022 es (\u30B9\u30DA\u30A4\u30F3\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 fr (\u30D5\u30E9\u30F3\u30B9\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 de (\u30C9\u30A4\u30C4\u8A9E \u2794 \u82F1\u8A9E)"
    ],
    // 動的スロット構成ローカライズ文言 (日本語)
    slotsHeader: "\u52D5\u7684\u30B9\u30ED\u30C3\u30C8\u69CB\u6210",
    slotsActiveTag: "\u6709\u52B9",
    slotsNone: "\u30B9\u30ED\u30C3\u30C8\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    slotsStatusEnabled: "\u6709\u52B9",
    slotsStatusDisabled: "\u7121\u52B9",
    slotsWithNuance: " +\u30CB\u30E5\u30A2\u30F3\u30B9",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8A00\u8A9E\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\uFF08\u73FE\u5728\u306E Agent \u306B\u76F4\u63A5\u4F1D\u3048\u308B\u3060\u3051\uFF09\uFF1A",
    slotsNlExamples: [
      "\u2022 \u300C\u4F34\u8D70\u30B9\u30ED\u30C3\u30C8\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3057\u3066\uFF1A\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u7684\u6D1E\u5BDF\u306E\u307F\u3001\u539F\u6587\u306F\u4E0D\u8981\u300D",
      "\u2022 \u300C1\u884C\u306E\u7D14\u7C8B\u306A\u8A33\u6587\u306E\u307F\u306B\u5909\u66F4\u3057\u3066\u300D",
      "\u2022 \u300C\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u306B\u623B\u3057\u3066\u300D"
    ],
    slotsCliTitle: "\u26A1\uFE0F \u30AF\u30A4\u30C3\u30AFCLI\u30B3\u30DE\u30F3\u30C9\uFF1A",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u539F\u6587\u884C\u3092\u5B8C\u5168\u306B\u975E\u8868\u793A",
      "\u2022 /slots compact2        - \u30DF\u30CB\u30DE\u30EB2\u30B9\u30ED\u30C3\u30C8",
      "\u2022 /slots reset           - \u30C7\u30D5\u30A9\u30EB\u30C8\u72B6\u614B\u306B\u30EA\u30BB\u30C3\u30C8",
      "\u2022 /slots toggle <id>     - \u30B9\u30ED\u30C3\u30C8\u306E\u4E00\u6642\u7684\u306A\u30AA\u30F3/\u30AA\u30D5"
    ],
    slotsResetSuccess: "[{pair}] \u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u3092\u30C7\u30D5\u30A9\u30EB\u30C8\u306B\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F",
    slotsRemovedSuccess: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] ("{label}") \u3092\u524A\u9664\u3057\u307E\u3057\u305F',
    slotsRemovedSourceNote: "\uFF08\u539F\u6587\u884C\u306F\u975E\u8868\u793A\u306B\u306A\u308A\u307E\u3059\uFF09",
    slotsToggled: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u306F\u73FE\u5728: {status}",
    slotsAdded: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] "{label}" \u3092\u8FFD\u52A0/\u66F4\u65B0\u3057\u307E\u3057\u305F',
    slotsNotFound: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002/slots \u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044",
    slotsUsageAdd: "\u4F7F\u3044\u65B9: /slots add <id> <\u30E9\u30D9\u30EB> [\u30D7\u30ED\u30F3\u30D7\u30C8...]\n\u4F8B: /slots add twitter \u30C4\u30A4\u30FC\u30C8 280\u5B57\u4EE5\u5185\u306E\u6280\u8853\u30C4\u30A4\u30FC\u30C8",
    slotsUsageRm: "\u4F7F\u3044\u65B9: /slots rm <\u30B9\u30ED\u30C3\u30C8ID> (\u4F8B: /slots rm source)",
    slotsUsageToggle: "\u4F7F\u3044\u65B9: /slots toggle <\u30B9\u30ED\u30C3\u30C8ID>",
    slotsUnknown: '[{pair}] \u672A\u77E5\u306E\u30B3\u30DE\u30F3\u30C9\u307E\u305F\u306F\u30D7\u30EA\u30BB\u30C3\u30C8 "{cmd}" \u3067\u3059\u3002/slots \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044'
  },
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
    notifyOriginal: "[en \u21C4 ja] Switched to [Original] mode: Prompt passed to AI unmodified, HUD displays translations",
    notifyEnglish: "[en \u21C4 ja] Switched to [English] mode: Prompt transformed into idiomatic technical English",
    notifyOff: "[en \u21C4 ja] Companion turned off",
    notifyPaging: "[en \u21C4 ja] Long prompt segmented. Press Alt+. or Alt+, to navigate pages",
    notifyNoHistory: "[en \u21C4 ja] No previous companion card recorded",
    notifyHistoryRestored: "[en \u21C4 ja] Restored previous companion card",
    notifyAgentHelp: '\u{1F4A1} Built-in lingual-tuner skill: Just tell your Agent "Customize companion: tweet and deep insight only, no source text" to tune slots in 1 turn! Switch language via /lang <code>.',
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Native language switched to: {lang} (Note: Command autocomplete descriptions will fully refresh on terminal restart)",
    notifyLangInvalid: "Invalid language code. Supported: zh, ja, en, es, fr, de",
    notifyCompactOn: "[en \u21C4 ja] Single-line capsule mode enabled for compact split panes",
    notifyCompactOff: "[en \u21C4 ja] Full tree layout restored",
    notifySlotSwitched: "[en \u21C4 ja] Switched slot architecture to [{preset}]: {desc}",
    notifyTimeout: "[en \u21C4 ja] English translation timed out or not ready; original prompt passed",
    notifyError: "[en \u21C4 ja] English translation request error; original prompt passed",
    cmdDescMode: "Cycle companion mode [en \u21C4 ja]: [Original] \u2794 [English] \u2794 [Off]",
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
    layoutTree: "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Companion Status Report",
    statusReportMode: "Current mode",
    statusReportFlow: "Language flow",
    statusReportModel: "Companion model",
    statusReportCache: "Session Cache",
    statusReportLayout: "HUD Layout: Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Auth: Pi Native In-Process Auth (Zero Config \xB7 Secure)",
    statusReportShortcuts: "Shortcuts: /lingual (mode) \xB7 /slots (slots) \xB7 /lang (lang) \xB7 /lingual-compact (layout)",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill (Just describe your preferences to Agent)",
    modeDescOriginal: "Pass-through \xB7 0ms non-blocking",
    modeDescEnglish: "English mode \xB7 Deep reasoning",
    modeDescOff: "Disabled",
    modelCurrentLabel: "Current companion model",
    modelFollowSession: "Follow session",
    modelAvailableListHeader: "Available models (run /lingual-model <id> to switch):",
    modelAutoFollowDesc: "auto (Automatically follows active session model)",
    modelSelectHint: "Run /lingual-model <model-id> or auto to designate a model.",
    langUsageHint: "Usage: /lang <zh|ja|en|es|fr|de> [target] (e.g. /lang ja or /lang zh ja)",
    langList: [
      "\u2022 zh (Chinese \u2794 English)",
      "\u2022 ja (Japanese \u2794 English)",
      "\u2022 en (English \u2794 Japanese)",
      "\u2022 es (Spanish \u2794 English)",
      "\u2022 fr (French \u2794 English)",
      "\u2022 de (German \u2794 English)"
    ],
    // Dynamic slots chrome (English)
    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Natural Language Customization (Just ask your Agent directly):",
    slotsNlExamples: [
      '\u2022 "Customize companion: only tweet and deep insight, no source text"',
      '\u2022 "Switch companion to single-slot clean translation"',
      '\u2022 "Reset companion slots to default"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Quick CLI Commands:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Hide original source text row",
      "\u2022 /slots compact2        - Minimal dual slot",
      "\u2022 /slots reset           - Reset to clean defaults",
      "\u2022 /slots toggle <id>     - Toggle slot enable/disable"
    ],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults (Source + Spoken + Written + Vocab)",
    slotsRemovedSuccess: '[{pair}] Removed slot [{id}] ("{label}")',
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: '[{pair}] Added/updated slot [{id}] "{label}"',
    slotsNotFound: "[{pair}] Slot [{id}] not found. Run /slots to inspect",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]\nExample: /slots add twitter Tweet Short punchy tweet under 280 chars",
    slotsUsageRm: "Usage: /slots rm <slot-id> (e.g. /slots rm source)",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: '[{pair}] Unknown slot command or preset "{cmd}". Type /slots to view help'
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
  }
};
function resolveLabelsForLang(lang, overrides, targetLang) {
  const norm = (lang || "zh").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.zh;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} \u21C4 ${actualTarget}`;
  const merged = {
    ...LANGUAGE_PRESETS.en,
    // 1. 英文全量保底 (保证任何新增 key 不为空，不泄露中文)
    ...target,
    // 2. 目标母语官方预设
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...overrides || {}
    // 3. 用户显式覆盖
  };
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[(?:zh|ja|en|es|fr|de)\s*⇄\s*(?:zh|ja|en|es|fr|de)\]/g, `[${pairTitle}]`);
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
    `\u2022 ${labels.statusReportShortcuts || "Shortcuts: /lingual \xB7 /slots \xB7 /lang \xB7 /lingual-compact \xB7 /status"}`
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
  msg += labels.modelSelectHint || "Specify model with /lingual-model <model-id> or auto.";
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
   * 生成标准化缓存键（结合源语言与目标语言）
   */
  static buildKey(text, sourceLang = "zh", targetLang = "en") {
    return `${sourceLang}\u2794${targetLang}:${text.trim()}`;
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
  const terminalCols = process.stdout?.columns;
  const raw = typeof requested === "number" ? requested : typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 80;
  return Math.max(25, raw);
}
var ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
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
function truncateVisual(str, maxVisualCols) {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);
  const targetCols = Math.max(1, maxVisualCols - 3);
  let curWidth = 0;
  let result = "";
  let i = 0;
  while (i < singleLine.length) {
    ANSI_ESCAPE_REGEX.lastIndex = i;
    const ansiMatch = ANSI_ESCAPE_REGEX.exec(singleLine);
    if (ansiMatch && ansiMatch.index === i) {
      result += ansiMatch[0];
      i += ansiMatch[0].length;
      continue;
    }
    const code = singleLine.codePointAt(i) || 0;
    const charLen = code > 65535 ? 2 : 1;
    const ch = singleLine.slice(i, i + charLen);
    const w = getVisualWidth(ch);
    if (curWidth + w > targetCols) {
      break;
    }
    result += ch;
    curWidth += w;
    i += charLen;
  }
  result = result.replace(/\s*[\(\[\{（【]$/, "");
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
      { id: "source", label: labels.sourceLabel || "\u539F\u6587", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...card.written ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true }] : [],
      ...card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true }] : []
    ];
  }
  const resolveSlotContent = (slot) => {
    if (slot.role === "source") {
      return { content: card.sourceText || "" };
    }
    if (card.slotOutputs && card.slotOutputs[slot.id]) {
      const out = card.slotOutputs[slot.id];
      return { content: out.content || "", meaning: out.meaning };
    }
    if (card.slots) {
      const match = card.slots.find((s) => s.id === slot.id);
      if (match) {
        return { content: match.content || "", meaning: match.meaning };
      }
    }
    if (slot.id === "spoken" || slot.role === "translation" && !card.slotOutputs) {
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
        role: slot.role,
        content: content.trim(),
        meaning: slot.showMeaning !== false && meaning && meaning.trim() ? meaning.trim() : void 0
      });
    }
  }
  if (isCompact || maxCols < 35) {
    if (contentBranches.length === 0) {
      return [truncateVisual(`\u21C4 [${labels.hudTitle}] ${card.sourceText}`, maxCols) + pageTag];
    }
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return `${shortLabel}: ${b.content}`;
    });
    const prefix = `\u21C4 [${labels.hudTitle}] `;
    const fullText = prefix + parts.join(" \xB7 ");
    return [truncateVisual(fullText, maxCols) + pageTag];
  }
  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines = [];
  if (sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "\u539F\u6587";
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
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > 2) {
      clampedSourceLines = [
        sourceLines[0],
        truncateVisual(sourceLines[1] + "...", maxCols)
      ];
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
            branchBudget = Math.max(1, Math.min(remainingBudget, 1));
          } else {
            const transLeft = Math.max(1, transCount - transHandled);
            const reservedForRest = transLeft - 1 + vocabCount;
            const maxPossible = Math.max(1, remainingBudget - reservedForRest);
            const fairShare = Math.ceil(availForTrans / transCount);
            branchBudget = Math.min(maxPossible, Math.max(fairShare, Math.min(branchRendered.length, maxPossible)));
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

// src/engine.ts
import fs from "fs";
import path from "path";
import os from "os";

// src/core/engine.ts
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    try {
      const repaired = str.replace(/,\s*([}\]])/g, "$1").replace(
        /("(?:spoken|spoken_meaning|written|written_meaning|vocab|casual|academic|slot1|slot2)"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
        (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
      );
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}
function parseLlmResponse(raw) {
  try {
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    const jsonSubstr = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson(jsonSubstr);
    if (!parsed) return null;
    const spoken = (parsed.spoken || parsed.casual || parsed.slot1 || "").trim();
    const spokenMeaning = (parsed.spoken_meaning || parsed.spokenMeaning || "").trim();
    const written = (parsed.written || parsed.academic || parsed.slot2 || "").trim();
    const writtenMeaning = (parsed.written_meaning || parsed.writtenMeaning || "").trim();
    const vocab = typeof parsed.vocab === "string" ? parsed.vocab.trim() : "";
    const summary = typeof (parsed.summary || parsed.core_intent || parsed.coreIntent) === "string" ? (parsed.summary || parsed.core_intent || parsed.coreIntent).trim() : "";
    const slotOutputs = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim() && !k.endsWith("_meaning") && k !== "summary") {
        const meaningVal = typeof parsed[k + "_meaning"] === "string" ? parsed[k + "_meaning"].trim() : void 0;
        slotOutputs[k] = {
          content: v.trim(),
          meaning: meaningVal || void 0
        };
      }
    }
    const effectiveSpoken = spoken || Object.values(slotOutputs)[0]?.content || "";
    if (effectiveSpoken) {
      return {
        spoken: effectiveSpoken,
        spokenMeaning: spokenMeaning || void 0,
        written: written || void 0,
        writtenMeaning: writtenMeaning || void 0,
        vocab: vocab || void 0,
        summary: summary || void 0,
        slotOutputs: Object.keys(slotOutputs).length > 0 ? slotOutputs : void 0
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function translateCore(req, options) {
  const text = (req.text || "").trim();
  const sourceLang = req.sourceLang || "zh";
  const targetLang = req.targetLang || "en";
  if (!text) {
    return {
      spoken: "",
      written: "",
      cached: false,
      shieldBypassed: false
    };
  }
  if (shouldShieldBypass(text)) {
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: true
    };
  }
  const cache = options?.cache || globalLingualCache;
  const cacheKey = LingualLruCache.buildKey(text, sourceLang, targetLang);
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
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: false
    };
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
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: false
    };
  }
  const parsed = parseLlmResponse(raw);
  if (parsed) {
    cache.set(cacheKey, parsed);
    const configuredSlots = Array.isArray(req.slots) ? req.slots : getDefaultSlots(sourceLang);
    let rawObj = {};
    try {
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        rawObj = tryParseJson(raw.slice(firstBrace, lastBrace + 1)) || {};
      }
    } catch {
    }
    const slotResults = [];
    for (const slot of configuredSlots) {
      if (!slot.enabled) continue;
      if (slot.role === "source") {
        slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content: text });
      } else {
        const content = (rawObj[slot.id] || (slot.id === "spoken" ? parsed.spoken : slot.id === "written" ? parsed.written : slot.id === "vocab" ? parsed.vocab : "") || "").trim();
        const meaning = (rawObj[slot.id + "_meaning"] || (slot.id === "spoken" ? parsed.spokenMeaning : slot.id === "written" ? parsed.writtenMeaning : void 0) || "").trim() || void 0;
        if (content) {
          slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content, meaning });
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
  return {
    spoken: text,
    written: text,
    cached: false,
    shieldBypassed: false
  };
}

// src/engine.ts
var cachedUserConfig = null;
var lastConfigCheckTime = 0;
var CONFIG_CACHE_TTL_MS = 2e3;
function invalidateUserConfigCache() {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}
function isTestEnvironment() {
  return process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT !== void 0 || process.execArgv.some((a) => a.startsWith("--test") || a === "--test") || process.argv.some((a) => a.includes(".test.") || a.includes("test")) || process.env.npm_lifecycle_event === "test";
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
      target = parsed["pi-lingual"] || parsed;
    } catch {
      target = null;
    }
  }
  if (!target && fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, "utf8");
      const parsed = JSON.parse(raw);
      const legacyBlock = parsed["pi-lingual"] || parsed["lingua"];
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
    const slots = Array.isArray(target.slots) ? target.slots : void 0;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : void 0;
    const timeoutMs = typeof target.timeoutMs === "number" ? target.timeoutMs : void 0;
    const replyInSourceLang = target.replyInSourceLang !== void 0 ? Boolean(target.replyInSourceLang) : void 0;
    const labels = resolveLabelsForLang(sourceLang || "zh", target.labels);
    cachedUserConfig = {
      ...endpoint ? { endpoint } : {},
      ...apiKey ? { apiKey } : {},
      ...model ? { model } : {},
      ...selectedModel ? { selectedModel } : {},
      ...target.mode ? { mode: target.mode } : {},
      ...compact !== void 0 ? { compact: Boolean(compact) } : {},
      ...slotPreset ? { slotPreset } : {},
      ...slots ? { slots } : {},
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
var DEFAULT_CONFIG = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "original",
  sourceLang: "zh",
  targetLang: "en",
  temperature: 0.2,
  timeoutMs: 3e4
};
var LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("zh", "en");
function isNonEnglish(text) {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}
var MAX_TRANSLATION_CHARS = 2500;
var MAX_TRANSLATION_LINES = 30;
function shouldTriggerTranslation(text, sourceLang = "zh") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRANSLATION_CHARS) {
    return false;
  }
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > MAX_TRANSLATION_LINES) {
    return false;
  }
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) {
    return false;
  }
  if (shouldShieldBypass(trimmed)) {
    return false;
  }
  if (sourceLang !== "en") {
    return isNonEnglish(trimmed);
  }
  const words = trimmed.split(/\s+/);
  if (words.length < 2) {
    return false;
  }
  return /[a-zA-Z]{2,}/.test(trimmed);
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
  return {
    raw: rawLines.join("\n").trim(),
    spoken,
    written,
    vocab
  };
}
function isDynamicLongInput(text, sourceLang = "zh") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const isCjk = sourceLang === "zh" || sourceLang === "ja" || isNonEnglish(trimmed);
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
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) {
    return null;
  }
  if (shouldShieldBypass(trimmed)) {
    return null;
  }
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) {
    return cached;
  }
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
    let content = null;
    const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
    const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : void 0);
    const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, void 0, "general", effectiveSlots);
    if (typeof cfg.complete === "function") {
      content = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers = {
        "Content-Type": "application/json"
      };
      if (cfg.apiKey) {
        headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      }
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed }
          ],
          temperature: cfg.temperature
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        return null;
      }
      const json = await response.json();
      content = json?.choices?.[0]?.message?.content ?? null;
    } else {
      return null;
    }
    if (typeof content !== "string" || !content.trim()) {
      return null;
    }
    const payload = parseLlmResponse(content);
    if (!payload || !payload.spoken) return null;
    const labels = resolveLabelsForLang(cfg.sourceLang || "zh", cfg.labels);
    const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
    const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
    const vocabLabel = labels.vocabLabel || "Vocab";
    const sourceLabel = labels.sourceLabel || "Source";
    const effectiveSourceText = trimmed.length > 80 && isLongInput && payload.summary && payload.summary.trim() ? payload.summary.trim() : trimmed;
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
var LINGUA_SYSTEM_PROMPT = LINGUAL_SYSTEM_PROMPT;
var stripLinguaAnnotation = stripLingualAnnotation;
var loadUserConfig = loadUserLingualConfig;
function shouldInjectNativeReplyGuard(originalText, _sourceLang = "zh", enabled = false) {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed) return false;
  if (!isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  if (isEnglishWritingIntent) {
    return false;
  }
  return true;
}
function formatNativeReplyGuardHint(sourceLang = "zh") {
  if (sourceLang === "ja") {
    return "\n\n(Please reply and explain in Japanese.)";
  }
  if (sourceLang === "zh" || sourceLang === "tw") {
    return "\n\n(Please reply and explain in Chinese.)";
  }
  if (sourceLang === "es") {
    return "\n\n(Please reply and explain in Spanish.)";
  }
  if (sourceLang === "fr") {
    return "\n\n(Please reply and explain in French.)";
  }
  if (sourceLang === "de") {
    return "\n\n(Please reply and explain in German.)";
  }
  return "\n\n(Please reply in the user's native language.)";
}

// src/sanitizer.ts
var TARGETED_CLIPBOARD_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)/gi;
var LEADING_TARGETED_CLIPBOARD_REGEX = /^(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)\s*/i;
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
  let trailingPathPayload;
  if (inlinePathMatches && inlinePathMatches.length > 0) {
    trailingPathPayload = inlinePathMatches.join("\n");
    text = text.replace(TARGETED_CLIPBOARD_PATH_REGEX, "").trim();
  }
  if (!text) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
      rawPayload: trailingPathPayload
    };
  }
  let hasCollapsed = false;
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

// src/fsm.ts
var LingualSessionController = class {
  activeAbortController = null;
  currentGeneration = 0;
  // 分页状态管理
  pagedResults = [];
  currentPageIndex = 0;
  totalExpectedPages = 1;
  lastResult = null;
  /**
   * 启动一次新的会话请求：
   * 1. 物理中断前序正在排队或流式传输的 HTTP 请求；
   * 2. 生成单调递增的新世代号；
   * 3. 绑定全新的 AbortSignal。
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
   * 物理中断当前正在活跃的网络请求
   */
  abortActive() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
  /**
   * 判定指定世代号是否仍为当前最新的活跃世代
   */
  isLatest(generation) {
    return this.currentGeneration === generation;
  }
  /**
   * 获取当前最新世代号
   */
  getCurrentGeneration() {
    return this.currentGeneration;
  }
  /**
   * 初始化分页池 (当输入被切分为多个意群分块时调用)
   */
  initPagination(totalExpectedPages) {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = Math.max(1, totalExpectedPages);
  }
  /**
   * 存入某个切片的翻译结果 (具备世代守卫，拒绝陈旧世代脏写)
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
   * 获取当前展示页的翻译结果
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
   * 获取所有已就绪的分页结果列表
   */
  getReadyPages() {
    return this.pagedResults.filter((item) => Boolean(item));
  }
  /**
   * 获取当前分页状态快照
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
   * 翻至下一页 (循环翻页)
   * 返回 true 表示发生了有效翻页
   */
  nextPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex + 1) % readyList.length;
    return true;
  }
  /**
   * 翻至上一页 (循环翻页)
   * 返回 true 表示发生了有效翻页
   */
  prevPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex - 1 + readyList.length) % readyList.length;
    return true;
  }
  /**
   * 清空分页池 (在遇到非自然语言输入、或关闭伴学时调用，杜绝幽灵卡片复活)
   */
  clearPagination() {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = 1;
  }
  /**
   * 获取上一条记录 (用于 /lingual-last 回显)
   */
  getLastResult() {
    return this.lastResult;
  }
  /**
   * 显式设置上一条记录
   */
  setLastResult(result) {
    this.lastResult = result;
  }
  /**
   * 彻底重置状态机
   */
  reset() {
    this.abortActive();
    this.clearPagination();
    this.lastResult = null;
  }
};
export {
  CANNOT_START_LINE_CHARS,
  DEFAULT_CONFIG,
  LANGUAGE_PRESETS,
  LEGACY_SLOT_PRESETS,
  LINGUAL_SYSTEM_PROMPT,
  LINGUA_SYSTEM_PROMPT,
  LinguaLruCache,
  LingualLruCache,
  LingualSessionController,
  MAX_TRANSLATION_CHARS,
  MAX_TRANSLATION_LINES,
  SLOT_PRESETS,
  addSlotToList,
  buildSystemPrompt,
  createCustomSlot,
  extractVocabPhrases,
  formatCapsuleLine,
  formatModelSelectionMessage,
  formatNativeReplyGuardHint,
  formatStatusReport,
  formatSubRail,
  formatTerminalAnnotation,
  formatTreeBranch,
  formatVocabItemsAtomic,
  getDefaultSlots,
  getEffectiveMaxCols,
  getVisualWidth,
  globalLinguaCache,
  globalLingualCache,
  invalidateUserConfigCache,
  isDynamicLongInput,
  isNonEnglish,
  loadUserConfig,
  loadUserLingualConfig,
  moveSlotInList,
  parseLlmResponse,
  removeSlotFromList,
  renderCardLayout,
  resolveLabelsForLang,
  resolveSlotsForPreset,
  sanitizePromptForTranslation,
  shouldInjectNativeReplyGuard,
  shouldShieldBypass,
  shouldTriggerTranslation,
  splitSemanticChunks,
  spotlightPhrases,
  stripLinguaAnnotation,
  stripLingualAnnotation,
  toggleSlotInList,
  translateCore,
  translatePrompt,
  truncateVisual,
  updateSlotInList,
  wrapVisualText
};
