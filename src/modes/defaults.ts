import type { CustomModeConfig } from "../types.js";
import { getDefaultSlots } from "../prompts.js";
import { resolveSeedNames } from "./names.js";

export function getDefaultFactoryModes(sourceLang = "en", _explainLang?: string): CustomModeConfig[] {
  const n = resolveSeedNames(sourceLang);

  return [
    {
      id: "companion",
      name: n.companion,
      aliases: ["original"],
      flow: "translate",
      action: "pass-through",
      hud: "tree",
      reasoning: "low",
      slots: getDefaultSlots(sourceLang),
      enabled: true,
    },
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
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Compile user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a high-signal AI Coding Agent Prompt (Intent Compiler). (1) Start with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'); (2) Isolate the core technical objective; (3) Extract explicit or implicit negative constraints (minimal diff, blast radius guard, leave unrelated files untouched, zero speculative scaffolding); (4) Preserve all code tokens, file paths, and CLI flags 100% verbatim; (5) Resolve anaphoric pronouns ('this function', 'here', 'as discussed') cleanly when context permits; (6) Eliminate conversational filler and AI clichés. NEVER invent unmentioned files or unrequested features.",
          enabled: true,
        },
        {
          id: "vocab",
          label: n.vocab,
          role: "vocab",
          instruction:
            "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) · term2 (...)'.",
          enabled: true,
        },
      ],
      enabled: true,
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
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' ➔ 'want you to'), wrong prepositions/articles, and grammatical slips in the user's ${targetLang} sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')—passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
          hideWhenLong: true,
          enabled: true,
        },
        {
          id: "native",
          label: n.native,
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
          hideWhenLong: true,
          enabled: true,
        },
        {
          id: "fixes",
          label: n.takeaway,
          role: "vocab",
          instruction:
            "Extract 1-3 essential takeaways in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${explainLang})'.",
          enabled: true,
        },
      ],
      enabled: true,
    },
  ];
}

export interface LoadoutDefinition {
  id: string;
  name: string;
  description: string;
  loadout: (sourceLang?: string, explainLang?: string) => CustomModeConfig;
}

export const PRESET_LOADOUTS: Record<string, LoadoutDefinition> = {
  spec: {
    id: "spec",
    name: "Brain-Dump to Spec",
    description:
      "Transforms unstructured thoughts into clear Objective, Constraints, Edge Cases, and Do Not Touch clauses for agent plan mode",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "spec",
      name: resolveSeedNames(sourceLang).loadoutSpec,
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
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Restructure user's raw thoughts from ${sourceLang} into structured engineering specification for an AI coding agent with explicit sections: Objective, Constraints, Edge Cases, and Do Not Touch modules. Use rigorous system architecture terms (e.g. idempotency, dead-letter queue, exponential backoff, rollback). NEVER invent unmentioned architectural features.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Arch Terms",
          role: "vocab",
          instruction: "Extract 2-3 key architectural term mappings with explanations in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  commit: {
    id: "commit",
    name: "Commit Dehydrator",
    description:
      "Extracts git diff and intent into conventional commits format (first line <=72 chars, imperative verb, Root Cause & Impact body)",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "commit",
      name: resolveSeedNames(sourceLang).loadoutCommit,
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
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate strict Conventional Commits format (e.g. 'fix(scope): ...' or 'feat(scope): ...'). First line MUST be <= 72 characters starting directly with an imperative active verb (e.g. 'Prevent', 'Clear', 'Guard against', 'Handle'). Body must state strictly Root Cause and Impact without AI filler.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Git Verbs",
          role: "vocab",
          instruction: "Highlight the imperative Git verb replacement and rationale in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  oss: {
    id: "oss",
    name: "OSS Peer Comms",
    description:
      "Transforms blunt feedback or bug reports into peer-level, objective, non-defensive GitHub issue/PR comments (nit, blocker, repro)",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "oss",
      name: resolveSeedNames(sourceLang).loadoutOss,
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: [
        "Sorry for my bad English",
        "Thank you so much for your kind review",
        "I would really appreciate it if",
        "delve",
      ],
      slots: [
        {
          id: "peer_review",
          label: "Peer Comms",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Transform user's technical argument or critique from ${sourceLang} into objective, peer-level engineering communication. Erase self-deprecation (never say 'sorry for poor english') and personal blame. Inject natural GitHub maintainer idioms (e.g. 'nit:', 'under contention', 'race condition', 'idiomatic', 'repro:').",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Peer Idioms",
          role: "vocab",
          instruction: "Extract 1-2 diplomatic peer engineering expressions in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  yap: {
    id: "yap",
    name: "Indie Hacker Shipper",
    description:
      "Distills technical builds into cold, high-density Indie Hacker tech posts (<280 chars) for X and HN with 0 emojis and 0 corporate hype",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "yap",
      name: resolveSeedNames(sourceLang).loadoutYap,
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: [
        "🚀",
        "🔥",
        "✨",
        "🧵",
        "Excited to announce",
        "Game-changer",
        "Revolutionize",
        "Unleash",
        "delve",
        "tapestry",
      ],
      slots: [
        {
          id: "tweet",
          label: "Post",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate cold, high-density developer post under 280 characters. Structure: Pain (what sucked before) ➔ What was built (one-line solution) ➔ Under the hood (concrete technical mechanism). Zero emoji spam, zero marketing hype, direct developer voice.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Dev Slang",
          role: "vocab",
          instruction: "Extract 1-2 authentic developer phrasing alternatives in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
};

export function getPresetLoadout(id: string, sourceLang = "en", explainLang?: string): CustomModeConfig | null {
  const normId = id.trim().toLowerCase();
  const found = PRESET_LOADOUTS[normId];
  return found ? found.loadout(sourceLang, explainLang) : null;
}

export function listPresetLoadouts(): LoadoutDefinition[] {
  return Object.values(PRESET_LOADOUTS);
}
