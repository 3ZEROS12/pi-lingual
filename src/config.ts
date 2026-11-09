import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  CustomModeConfig,
  LingualConfig,
  LingualMode,
  PromptSlotConfig,
  SlotConfig,
} from "./types.js";
import {
  resolveLabelsForLang,
  getDefaultFactoryModes,
  resolveSeedNames,
  localizeModes,
} from "./presets.js";
import {
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
} from "./prompts.js";

let cachedUserConfig: Partial<LingualConfig> | null = null;
let lastConfigCheckTime = 0;
const CONFIG_CACHE_TTL_MS = 2000;

export function invalidateUserConfigCache(): void {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}

export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.execArgv.some((a) => a.startsWith("--test") || a === "--test") ||
    process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) ||
    process.env.npm_lifecycle_event === "test"
  );
}

/**
 * Check if user lingual config is already configured on disk.
 */
export function isUserLingualConfigured(): boolean {
  if (isTestEnvironment()) return true;
  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const lingualFile = path.join(agentDir, "lingual.json");
  if (!fs.existsSync(lingualFile)) return false;
  try {
    const raw = fs.readFileSync(lingualFile, "utf8");
    const parsed = JSON.parse(raw);
    const inner = parsed && (parsed["pi-lingual"] || parsed);
    return Boolean(inner && (inner.configured || (inner.sourceLang && inner.targetLang)));
  } catch {
    return false;
  }
}

const MODE_ALIAS_MAP: Record<string, LingualMode> = {
  "1": "original", companion: "original", learn: "original", study: "original", original: "original", orig: "original",
  "纯伴学": "original", "純伴學": "original", "伴学": "original", "伴走": "original",
  "2": "english", direct: "english", rewrite: "english", refine: "english", english: "english", en: "english", eng: "english", lazy: "english",
  "规范直发": "english", "直接改": "english", "直改": "english", "直出": "english", "仕様直行": "english",
  "3": "select", candidates: "select", candidate: "select", select: "select", choices: "select", choice: "select", pick: "select",
  "挑候选": "select", "挑候選": "select", "候选": "select", "候補選": "select",
  "4": "modify", modify: "modify", polish: "modify", fix: "modify", proofread: "modify", raw: "modify", "live-flow": "modify",
  "实战狂飙": "modify", "原句修补": "modify", "原句修補": "modify", "修补": "modify", "実戦疾走": "modify", "原文修正": "modify",
  "0": "off", off: "off", disable: "off", stop: "off",
  "已关闭": "off", "已關閉": "off", "关闭": "off", "オフ": "off",
};

export function normalizeLingualModeInput(raw?: string): LingualMode | null {
  if (!raw) return null;
  return MODE_ALIAS_MAP[raw.trim().toLowerCase()] || null;
}

/**
 * Load user configuration from single source of truth: ~/.pi/agent/lingual.json
 * If lingual.json does not exist, performs a one-time graceful migration from settings.json ("pi-lingual" block).
 * Uses high-efficiency 2-second in-memory memoization to prevent synchronous disk I/O thrashing.
 */
export function loadUserLingualConfig(): Partial<LingualConfig> {
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

  let target: Record<string, any> | null = null;

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
        } catch {}
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
    const filterSlots = (arr: any) =>
      Array.isArray(arr)
        ? arr.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string")
        : undefined;
    const filterModes = (arr: any) =>
      Array.isArray(arr)
        ? arr.filter((m: any) => m && typeof m === "object" && typeof m.id === "string")
        : undefined;
    const modes = filterModes(target.modes);
    const activeModeId = typeof target.activeModeId === "string" ? target.activeModeId : undefined;
    const globalKillList = Array.isArray(target.globalKillList) ? target.globalKillList : undefined;
    const slots = filterSlots(target.slots);
    const directSlots = filterSlots(target.directSlots);
    const promptSlots = filterSlots(target.promptSlots);
    const modifySlots = filterSlots(target.modifySlots);
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : undefined;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : undefined;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs)
      ? Math.min(60_000, Math.max(1000, target.timeoutMs))
      : undefined;
    const replyInSourceLang = target.replyInSourceLang !== undefined ? Boolean(target.replyInSourceLang) : undefined;
    const modeLocked = target.modeLocked !== undefined ? Boolean(target.modeLocked) : undefined;
    const lookup = target.lookup && typeof target.lookup === "object" && !Array.isArray(target.lookup)
      ? target.lookup
      : undefined;
    const labels = resolveLabelsForLang(sourceLang || "en", target.labels, targetLang || "ja");
    const normalizedMode = typeof target.mode === "string" ? (normalizeLingualModeInput(target.mode) || target.mode) : undefined;

    cachedUserConfig = {
      ...target,
      ...(endpoint ? { endpoint } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
      ...(selectedModel ? { selectedModel } : {}),
      ...(normalizedMode ? { mode: normalizedMode as any } : {}),
      ...(modeLocked !== undefined ? { modeLocked } : {}),
      ...(compact !== undefined ? { compact: Boolean(compact) } : {}),
      ...(slotPreset ? { slotPreset } : {}),
      ...(modes ? { modes } : {}),
      ...(activeModeId ? { activeModeId } : {}),
      ...(globalKillList ? { globalKillList } : {}),
      ...(slots ? { slots } : {}),
      ...(directSlots ? { directSlots } : {}),
      ...(promptSlots ? { promptSlots } : {}),
      ...(modifySlots ? { modifySlots } : {}),
      ...(lastSeenVersion ? { lastSeenVersion } : {}),
      ...(sourceLang ? { sourceLang } : {}),
      ...(targetLang ? { targetLang } : {}),
      ...(reasoning ? { reasoning: reasoning as any } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
      ...(replyInSourceLang !== undefined ? { replyInSourceLang } : {}),
      ...(lookup ? { lookup } : {}),
      labels,
    };
    lastConfigCheckTime = now;
    return cachedUserConfig;
  }

  cachedUserConfig = {};
  lastConfigCheckTime = now;
  return {};
}

/**
 * Atomic, zero-residue configuration persistence to ~/.pi/agent/lingual.json
 */
export function saveUserLingualConfig(patch: Record<string, any>): void {
  if (isTestEnvironment()) {
    return;
  }

  try {
    const agentDir = path.join(os.homedir(), ".pi", "agent");
    const configFile = path.join(agentDir, "lingual.json");

    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    let existing: Record<string, any> = {};
    if (fs.existsSync(configFile)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const raw = fs.readFileSync(configFile, "utf8");
          if (raw && raw.trim()) {
            existing = JSON.parse(raw);
            break;
          }
        } catch {
          // Brief synchronous pause on Windows NTFS file locking collision
          try {
            const start = Date.now();
            while (Date.now() - start < 15) {}
          } catch {}
        }
      }
    }

    for (const [k, v] of Object.entries(patch)) {
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      // Intentional revert-to-default semantic: passing "auto" deletes key to restore auto-probing
      if (
        v === undefined ||
        v === "" ||
        isEmptyArray ||
        v === "auto" ||
        (k === "compact" && v === false) ||
        (k === "modeLocked" && v === false)
      ) {
        delete existing[k];
      } else if (k === "mode") {
        const canonical = v === "english" ? "direct" : v === "select" ? "candidates" : v;
        existing.mode = canonical;
        if (!patch.activeModeId) {
          existing.activeModeId = canonical;
        }
      } else if (k === "defaultMode") {
        const canonical = v === "1" ? "companion" : v === "2" ? "direct" : v === "3" ? "live-flow" : v === "0" ? "off" : v === "english" ? "direct" : v === "select" ? "candidates" : v;
        existing.defaultMode = canonical;
      } else if (k === "activeModeId") {
        existing.activeModeId = v;
        if (!patch.mode) {
          existing.mode = v === "english" ? "direct" : v === "select" ? "candidates" : v;
        }
      } else {
        existing[k] = v;
      }
    }

    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

    try {
      fs.writeFileSync(tmpFile, content, "utf8");
      try {
        fs.renameSync(tmpFile, configFile);
      } catch {
        // Windows NTFS EPERM fallback: unlink destination before renaming
        try { fs.unlinkSync(configFile); } catch {}
        fs.renameSync(tmpFile, configFile);
      }
    } catch {
      try { fs.writeFileSync(configFile, content, "utf8"); } catch {}
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
    }

    invalidateUserConfigCache();
  } catch {}
}

export const loadUserConfig = loadUserLingualConfig;

export function resolveDirectSlotsFromConfig(cfg: {
  sourceLang?: string;
  directSlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.directSlots) && cfg.directSlots.length > 0) {
    const enabled = cfg.directSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultDirectSlots(cfg.sourceLang);
}

export function resolveCandidateSlotsFromConfig(cfg: {
  sourceLang?: string;
  promptSlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0) {
    const enabled = cfg.promptSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultPromptSlots(cfg.sourceLang);
}

export function resolveModifySlotsFromConfig(cfg: {
  sourceLang?: string;
  explainLang?: string;
  modifySlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.modifySlots) && cfg.modifySlots.length > 0) {
    const enabled = cfg.modifySlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultModifySlots(cfg.sourceLang, cfg.explainLang);
}

/** Resolves default slots for a custom mode based on its action and flow. */
export function defaultSlotsForMode(
  mode: Pick<CustomModeConfig, "action" | "flow">,
  sourceLang: string,
  explainLang?: string
): SlotConfig[] {
  if (mode.action === "pass-through") return [];
  if (mode.action === "select") return getDefaultPromptSlots(sourceLang);
  return mode.flow === "proofread"
    ? getDefaultModifySlots(sourceLang, explainLang)
    : getDefaultDirectSlots(sourceLang);
}

export function resolveModesFromConfig(cfg: Partial<LingualConfig>, fallbackSourceLang = "en"): CustomModeConfig[] {
  const sourceLang = cfg.sourceLang || fallbackSourceLang;
  const explainLang = cfg.explainLang || sourceLang;
  if (Array.isArray(cfg.modes) && cfg.modes.length > 0) {
    // Keep every user-authored mode; populate clean defaults for missing/empty slots by flow
    const valid = cfg.modes
      .filter((m) => m && typeof m.id === "string" && m.id.trim())
      .map((m) => {
        if (Array.isArray(m.slots) && m.slots.length > 0) return m;
        return { ...m, slots: defaultSlotsForMode(m, sourceLang, explainLang) };
      });
    if (valid.length > 0) return localizeModes(valid, sourceLang, explainLang);
  }

  // Legacy fallback: If user has legacy slots on disk, map them seamlessly into modes
  const hasLegacyCustomSlots =
    Array.isArray(cfg.slots) ||
    Array.isArray(cfg.directSlots) ||
    Array.isArray(cfg.promptSlots) ||
    Array.isArray(cfg.modifySlots);

  if (hasLegacyCustomSlots) {
    const directSlots = resolveDirectSlotsFromConfig({ sourceLang, directSlots: cfg.directSlots });
    const modifySlots = resolveModifySlotsFromConfig({ sourceLang, explainLang, modifySlots: cfg.modifySlots });
    const promptSlots = resolveCandidateSlotsFromConfig({ sourceLang, promptSlots: cfg.promptSlots });
    const companionSlots = (Array.isArray(cfg.slots) && cfg.slots.length > 0 ? cfg.slots : getDefaultSlots(sourceLang))
      .map((s) => ({
        id: s.id,
        label: s.label,
        role: (s.role === "vocab" ? "vocab" : "rewrite") as "vocab" | "rewrite",
        instruction: s.instruction || "Natural expressions matching context",
        enabled: s.enabled !== false,
      }));

    const n = resolveSeedNames(sourceLang);
    return [
      {
        id: "direct",
        name: n.direct,
        flow: "translate",
        action: "transform",
        hud: "preview",
        slots: directSlots,
        enabled: true,
      },
      {
        id: "live-flow",
        name: n.liveFlow,
        flow: "proofread",
        action: "transform",
        hud: "adaptive-takeaway",
        slots: modifySlots,
        enabled: true,
      },
      {
        id: "companion",
        name: n.companion,
        flow: "translate",
        action: "pass-through",
        hud: "tree",
        slots: companionSlots,
        enabled: true,
      },
      {
        id: "candidates",
        name: n.candidates,
        flow: "translate",
        action: "select",
        hud: "tree",
        slots: promptSlots,
        enabled: true,
      },
    ];
  }

  // Brand-new install default: Return the 3 golden defaults
  return getDefaultFactoryModes(sourceLang, explainLang);
}

export function normalizeActiveModeId(cfg: Partial<LingualConfig>, modes: CustomModeConfig[]): string {
  if (cfg.mode === "off" || cfg.activeModeId === "off") return "off";
  const activeModes = modes.filter((m) => m.enabled !== false);
  const targetId = cfg.activeModeId || cfg.mode;
  if (!targetId) {
    return activeModes[0]?.id || "companion";
  }

  // Legacy mode mapping applied to targetId (supports both mode and activeModeId legacy aliases)
  const legacyMap: Record<string, string> = {
    original: "companion",
    companion: "companion",
    english: "direct",
    direct: "direct",
    lazy: "direct",
    select: "candidates",
    candidates: "candidates",
    modify: "live-flow",
    "live-flow": "live-flow",
    raw: "live-flow",
    polish: "live-flow",
  };

  const mappedId = legacyMap[targetId] || targetId;
  if (activeModes.some((m) => m.id === mappedId)) {
    return mappedId;
  }
  if (activeModes.some((m) => m.id === targetId)) {
    return targetId;
  }

  return activeModes[0]?.id || "companion";
}
