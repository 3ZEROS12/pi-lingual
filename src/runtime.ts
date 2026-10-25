/**
 * Mode Runtime Resolver
 *
 * Single source of truth for turning a declarative `CustomModeConfig` into concrete
 * runtime behaviour. Every consumer (input dispatcher, prompt compiler, HUD renderer,
 * status badge) MUST derive its behaviour from `ModeRuntime` instead of branching on
 * a mode id string.
 *
 * Invariant 2 (Mode as Configuration): no `if (mode === "direct")` anywhere downstream.
 */

import type {
  CustomModeConfig,
  LingualResult,
  ModeAction,
  ModeFlow,
  ModeHud,
  ModeTarget,
  PromptSlotConfig,
  SlotConfig,
} from "./types.js";

/** Concrete HUD renderers. `adaptive-takeaway` normalises to `takeaway`. */
export type HudVariant = "tree" | "preview" | "takeaway" | "none";

export interface ModeRuntime {
  mode: CustomModeConfig;
  id: string;
  name: string;
  /** How the prompt leaves the extension. */
  dispatcher: ModeAction;
  flow: ModeFlow;
  hud: HudVariant;
  target: ModeTarget;
  /** Language the developer is expected to type in (display + prompt semantics). */
  inputLang: string;
  /** Language the mode produces. */
  outputLang: string;
  explainLang: string;
  reasoning?: string;
  /** Effective, non-disabled slots declared by the mode (or the caller's fallback). */
  slots: PromptSlotConfig[];
  /** Rewrite/translation slots only (no `source`, no `vocab`). */
  translationSlots: PromptSlotConfig[];
  /** The single slot rendered as the takeaway/diff rail. */
  takeawaySlot?: PromptSlotConfig;
  primarySlotId?: string;
  killList: string[];
  globalKillList?: string[];
  preserveCodeSwitching: boolean;
  contextAware: boolean;
  isProofread: boolean;
  /** True when the mode wants a single dense line rather than a tree. */
  isPreview: boolean;
}

export interface ResolveModeOptions {
  sourceLang: string;
  targetLang: string;
  explainLang?: string;
  /** Slots used when the mode declares none. Keeps legacy configs working. */
  fallbackSlots?: (SlotConfig | PromptSlotConfig)[];
  globalKillList?: string[];
}

const VALID_ACTIONS = new Set<ModeAction>(["pass-through", "transform", "select"]);
const VALID_FLOWS = new Set<ModeFlow>(["translate", "proofread", "custom"]);

export function normalizeHudVariant(hud: ModeHud | string | undefined): HudVariant {
  switch (hud) {
    case "none":
      return "none";
    case "preview":
      return "preview";
    case "adaptive-takeaway":
      return "takeaway";
    case "tree":
    default:
      return "tree";
  }
}

function normalizeSlots(
  declared: PromptSlotConfig[] | undefined,
  fallback: (SlotConfig | PromptSlotConfig)[] | undefined
): PromptSlotConfig[] {
  const source = Array.isArray(declared) && declared.length > 0
    ? declared
    : Array.isArray(fallback)
      ? fallback
      : [];

  return source
    .filter((s): s is PromptSlotConfig => Boolean(s && typeof s.id === "string"))
    .filter((s) => s.enabled !== false)
    .map((s) => ({
      ...s,
      role: s.role || "translation",
      enabled: s.enabled !== false,
    }));
}

/**
 * Derives the complete runtime contract for a mode.
 * Pure function: no disk access, no global state.
 */
export function resolveModeRuntime(
  mode: CustomModeConfig,
  options: ResolveModeOptions
): ModeRuntime {
  const flow: ModeFlow = VALID_FLOWS.has(mode.flow as ModeFlow) ? mode.flow : "translate";
  const dispatcher: ModeAction = VALID_ACTIONS.has(mode.action as ModeAction)
    ? mode.action
    : "transform";
  const hud = normalizeHudVariant(mode.hud);
  const target: ModeTarget = mode.target === "clipboard" ? "clipboard" : "agent";

  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "en";
  const explainLang = options.explainLang || sourceLang;

  // Proofread flow reads and writes the same language (the target language).
  // Custom flow honours its own declared pair, falling back to the session pair.
  const inputLang =
    flow === "proofread"
      ? targetLang
      : flow === "custom"
        ? mode.customInputLang || sourceLang
        : sourceLang;
  const outputLang =
    flow === "custom" ? mode.customOutputLang || targetLang : targetLang;

  const slots = normalizeSlots(mode.slots, options.fallbackSlots);
  const translationSlots = slots.filter((s) => s.role !== "vocab" && s.role !== "source");
  const takeawaySlot = slots.find((s) => s.role === "vocab");

  return {
    mode,
    id: mode.id,
    name: mode.name,
    dispatcher,
    flow,
    hud,
    target,
    inputLang,
    outputLang,
    explainLang,
    reasoning: mode.reasoning,
    slots,
    translationSlots,
    takeawaySlot,
    primarySlotId: mode.primarySlotId,
    killList: Array.isArray(mode.killList) ? mode.killList : [],
    globalKillList: options.globalKillList,
    preserveCodeSwitching: Boolean(mode.preserveCodeSwitching),
    contextAware: Boolean(mode.contextAware),
    isProofread: flow === "proofread",
    isPreview: hud === "preview",
  };
}

/**
 * Status-badge language pair for a runtime.
 * Custom flow advertises its own pair; every other flow keeps the session pair.
 */
export function runtimeLanguagePair(rt: ModeRuntime, sessionPair: string): string {
  if (rt.flow === "custom") {
    return `${rt.inputLang} ⇄ ${rt.outputLang}`;
  }
  return sessionPair;
}

/**
 * The slot whose content is dispatched to the agent (or clipboard).
 * Order of preference: `primarySlotId`, the first translation slot, the first slot.
 */
export function primarySlot(rt: ModeRuntime): PromptSlotConfig | undefined {
  if (rt.primarySlotId) {
    const match = rt.slots.find(
      (s) => s.id.toLowerCase() === rt.primarySlotId?.toLowerCase()
    );
    if (match) return match;
  }
  return rt.translationSlots[0] || rt.slots[0];
}

/**
 * Tolerant extraction of already-complete JSON string fields from a partially
 * streamed model response. Used to paint the HUD while tokens are still arriving.
 */
export function parsePartialJsonFields(buffer: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!buffer) return out;

  const cleaned = buffer
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "");

  const re = /"([A-Za-z0-9_-]+)"\s*:\s*"((?:[^"\\]|\\.)*)("?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    const key = match[1];
    const raw = match[2];
    if (!raw) continue;
    out[key] = unescapeJsonString(raw);
  }
  return out;
}

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Builds a renderable result from partially streamed JSON fields.
 * Used to paint the HUD before the model finishes its response.
 */
export function buildStreamingResult(
  fields: Record<string, string>,
  sourceText: string
): LingualResult {
  const slotOutputs: Record<string, { content: string; meaning?: string }> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key.endsWith("_meaning") || !value) continue;
    slotOutputs[key] = { content: value, meaning: fields[`${key}_meaning`] };
  }
  const summary = fields.summary && fields.summary.trim() ? fields.summary.trim() : undefined;
  return {
    sourceText: summary || sourceText,
    summary,
    spoken: slotOutputs.spoken?.content || "",
    spokenMeaning: slotOutputs.spoken?.meaning,
    written: slotOutputs.written?.content || "",
    writtenMeaning: slotOutputs.written?.meaning,
    vocab: slotOutputs.vocab?.content,
    annotated: "",
    slotOutputs,
  };
}

/** The payload a `target: "clipboard"` mode should copy. */
export function pickPrimaryContent(result: LingualResult, rt: ModeRuntime): string | undefined {
  const slot = primarySlot(rt);
  if (slot && result.slotOutputs?.[slot.id]?.content) {
    return result.slotOutputs[slot.id].content;
  }
  const fromSlots = result.slots?.find((s) => s.role !== "source" && s.role !== "vocab");
  return fromSlots?.content || result.spoken || undefined;
}

