import type { CustomModeConfig, PromptSlotConfig, SlotConfig } from "../types.js";
import { getDefaultSlots } from "../prompts.js";

export interface SlotPresetDefinition {
  name: string;
  description: string;
  slots: (sourceLang?: string) => SlotConfig[];
}

export function createCustomSlot(params: Partial<SlotConfig> & { id: string; label: string }): SlotConfig {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction:
      params.instruction?.trim() || (role === "source" ? undefined : "Natural expressions matching context."),
    showMeaning: params.showMeaning !== undefined ? params.showMeaning : role !== "source" && role !== "vocab",
    hideWhenLong: Boolean(params.hideWhenLong),
    enabled: params.enabled !== undefined ? params.enabled : true,
  };
}

export function addSlotToList(slots: SlotConfig[], newSlot: SlotConfig): SlotConfig[] {
  const normId = newSlot.id.trim().toLowerCase();
  const existingIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (existingIndex >= 0) {
    const copy = [...slots];
    copy[existingIndex] = { ...newSlot, id: normId };
    return copy;
  }
  return [...slots, { ...newSlot, id: normId }];
}

export function removeSlotFromList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.filter((s) => s.id.toLowerCase() !== normId);
}

export function updateSlotInList(slots: SlotConfig[], slotId: string, patch: Partial<SlotConfig>): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, ...patch } : s));
}

export function toggleSlotInList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, enabled: !s.enabled } : s));
}

export function moveSlotInList(slots: SlotConfig[], slotId: string, targetIndex: number): SlotConfig[] {
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

export function addCustomMode(modes: CustomModeConfig[], newMode: CustomModeConfig): CustomModeConfig[] {
  const normId = newMode.id.trim().toLowerCase();
  const existingIndex = modes.findIndex((m) => m.id.toLowerCase() === normId);
  const modeNormalized: CustomModeConfig = {
    ...newMode,
    id: normId,
    name: newMode.name?.trim() || normId,
    flow: newMode.flow || "translate",
    action: newMode.action || "transform",
    hud: newMode.hud || "preview",
    slots: Array.isArray(newMode.slots) ? newMode.slots : [],
    enabled: newMode.enabled !== undefined ? newMode.enabled : true,
  };
  if (existingIndex >= 0) {
    const copy = [...modes];
    copy[existingIndex] = modeNormalized;
    return copy;
  }
  return [...modes, modeNormalized];
}

export function removeCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.filter((m) => m.id.toLowerCase() !== normId);
}

export function updateCustomMode(
  modes: CustomModeConfig[],
  modeId: string,
  patch: Partial<CustomModeConfig>
): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => (m.id.toLowerCase() === normId ? { ...m, ...patch } : m));
}

export function toggleCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => (m.id.toLowerCase() === normId ? { ...m, enabled: !m.enabled } : m));
}

export function addSlotToMode(
  modes: CustomModeConfig[],
  modeId: string,
  slot: PromptSlotConfig
): CustomModeConfig[] {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slot.id.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    const existingIdx = m.slots.findIndex((s) => s.id.toLowerCase() === normSlotId);
    let newSlots: PromptSlotConfig[];
    if (existingIdx >= 0) {
      newSlots = [...m.slots];
      newSlots[existingIdx] = { ...slot, id: normSlotId };
    } else {
      newSlots = [...m.slots, { ...slot, id: normSlotId }];
    }
    return { ...m, slots: newSlots };
  });
}

export function removeSlotFromMode(
  modes: CustomModeConfig[],
  modeId: string,
  slotId: string
): CustomModeConfig[] {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slotId.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    return { ...m, slots: m.slots.filter((s) => s.id.toLowerCase() !== normSlotId) };
  });
}

export const SLOT_PRESETS: Record<string, SlotPresetDefinition> = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => getDefaultSlots(sourceLang),
  },
  social: {
    name: "Social",
    description: "Community building: Hook + Deep + Vocab",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      {
        id: "spoken",
        label: "Hook",
        role: "translation",
        instruction: "High-engagement opening hook for social threads.",
        showMeaning: true,
        enabled: true,
      },
      {
        id: "written",
        label: "Deep",
        role: "translation",
        instruction: "Insightful technical value and architecture reasoning.",
        showMeaning: true,
        enabled: true,
      },
      { id: "vocab", label: "Vocab", role: "vocab", instruction: "Key engagement idioms and phrases.", enabled: true },
    ],
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: 口語 + 敬語 + 単語",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "原文", role: "source", enabled: true },
      {
        id: "spoken",
        label: "口語",
        role: "translation",
        instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk).",
        showMeaning: true,
        enabled: true,
      },
      {
        id: "written",
        label: "敬語",
        role: "translation",
        instruction: "Formal, polite business Japanese (Keigo, professional email/PR).",
        showMeaning: true,
        enabled: true,
      },
      {
        id: "vocab",
        label: "単語",
        role: "vocab",
        instruction: "Key Japanese vocabulary and idiomatic expressions.",
        enabled: true,
      },
    ],
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      {
        id: "spoken",
        label: "Discussion",
        role: "translation",
        instruction: "Academic colloquium and seminar discussion tone.",
        showMeaning: true,
        enabled: true,
      },
      {
        id: "written",
        label: "Paper",
        role: "translation",
        instruction: "Formal, objective academic prose suitable for papers.",
        showMeaning: true,
        enabled: true,
      },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false },
    ],
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      {
        id: "spoken",
        label: "Translation",
        role: "translation",
        instruction: "Natural, idiomatic target language translation.",
        showMeaning: true,
        enabled: true,
      },
      { id: "written", label: "Written", role: "translation", enabled: false },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false },
    ],
  },
};

export function resolveSlotsForPreset(presetName = "developer", sourceLang = "en"): SlotConfig[] {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}
