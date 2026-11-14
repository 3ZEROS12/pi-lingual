import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ExtensionState, LingualResult } from "../types.js";
import type { ModeRuntime } from "../runtime.js";
import type { LingualSessionController } from "../fsm.js";
import type { LookupController } from "../lookup-controller.js";

export interface CommandHandlerDeps {
  state: ExtensionState;
  session: LingualSessionController;
  updateFooter: (ctx: ExtensionContext | null | undefined) => void;
  refreshActiveView: (ctx: ExtensionContext) => void;
  renderActiveCard: (ctx: ExtensionContext) => void;
  renderHudWidget: (
    ctx: ExtensionContext,
    result: LingualResult,
    rt: ModeRuntime,
    extras?: { pageTag?: string; isLong?: boolean; isStreaming?: boolean }
  ) => void;
  activeRuntime: () => ModeRuntime;
  renderReleaseBanner: (ctx: ExtensionContext, explicitLang?: string) => boolean;
  syncResizeListener: () => void;
  clearPendingTimers: () => void;
  armTuner: () => void;
  lookupController?: LookupController;
  pi: ExtensionAPI;
}

export interface CommandHandlers {
  setModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setModelHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  switchLangHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  toggleCompactHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  switchSlotsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showStatusHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  copyLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  manageModesHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  manageLoadoutsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showAgentGuideHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  digestHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setReasoningHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setDefaultModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  lookupHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  journalHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  masterCommandHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
}
