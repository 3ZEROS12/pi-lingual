// Sandboxed boot fixture: runs the built extension in an isolated HOME and reports the real
// release-banner / config lifecycle as JSON on stdout. Spawned by tests/release-hardening.test.ts.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf("=");
    return [a.slice(2, i), a.slice(i + 1)];
  })
);

const lang = argv.lang || "en";
const variant = argv.variant || "fresh";
const cols = Number(argv.cols || 80);
const root = argv.root;
const home = process.env.SANDBOX_HOME;

const errors = [];
process.on("uncaughtException", (e) => errors.push(`uncaught: ${e.message}`));
process.on("unhandledRejection", (e) => errors.push(`unhandled: ${String(e && e.message)}`));

delete process.env.NODE_TEST_CONTEXT;
delete process.env.npm_lifecycle_event;
delete process.env.NODE_ENV;
process.env.HOME = home;
process.env.USERPROFILE = home;
Object.defineProperty(process.stdout, "columns", { value: cols, configurable: true, writable: true });

const agentDir = path.join(home, ".pi", "agent");
fs.mkdirSync(agentDir, { recursive: true });
const cfgFile = path.join(agentDir, "lingual.json");

const LEGACY_CONFIG = {
  sourceLang: lang === "tw" ? "tw" : lang,
  targetLang: "en",
  explainLang: lang === "tw" ? "tw" : lang,
  mode: "english",
  compact: false,
  lastSeenVersion: "0.5.5",
  slots: [
    { id: "source", label: "原文", role: "source", enabled: true },
    { id: "spoken", label: "口语", role: "translation", instruction: "Spoken flow.", showMeaning: true, enabled: true },
    { id: "written", label: "写作", role: "translation", instruction: "Written prose.", showMeaning: true, enabled: true },
    { id: "vocab", label: "重点", role: "vocab", instruction: "Extract terms.", enabled: true },
  ],
};

if (variant === "legacy") {
  fs.writeFileSync(cfgFile, JSON.stringify(LEGACY_CONFIG, null, 2), "utf8");
} else if (variant === "corrupt") {
  fs.writeFileSync(cfgFile, "<<< not json at all >>>", "utf8");
} else if (variant === "locked") {
  // Permission-denied config: the extension must degrade, never crash the editor.
  fs.writeFileSync(cfgFile, JSON.stringify(LEGACY_CONFIG, null, 2), "utf8");
  fs.chmodSync(cfgFile, 0o444);
}

const widgetOps = [];
let inputPrompted = false;
const widgetThrows = variant === "throwy";

const pi = {
  handlers: {},
  on(event, handler) {
    (this.handlers[event] ||= []).push(handler);
  },
  registerCommand() {},
  registerShortcut() {},
};

const makeCtx = () => ({
  hasUI: true,
  model: { id: "mock", provider: "mock" },
  modelRegistry: { getAvailable: () => [] },
  sessionManager: { getEntries: () => [] },
  ui: {
    setStatus() {},
    setWidget(key, content, opts) {
      if (widgetThrows && Array.isArray(content)) throw new Error("setWidget rejected by host");
      widgetOps.push({ key, content: content === undefined ? null : content, opts });
    },
    notify() {},
    clearWidget() {},
    theme: { fg: (_c, t) => t },
    input: async (_prompt, def) => {
      inputPrompted = true;
      return def;
    },
  },
});

const fire = async (event, ctx) => {
  for (const handler of pi.handlers[event] || []) {
    try {
      await handler({ type: event, reason: "start", source: "interactive", text: "hello" }, ctx);
    } catch (e) {
      errors.push(`${event}: ${e && e.message}`);
    }
  }
};

const extension = await import(pathToFileURL(path.join(root, "dist/extension.js")).href);
extension.default(pi);

const firstCtx = makeCtx();
await fire("session_start", firstCtx);

const bannerOps = widgetOps.filter((o) => o.key === "lingual_hud" && Array.isArray(o.content));
const bannerLines = bannerOps.length ? bannerOps[bannerOps.length - 1].content : [];

let configAfter = null;
try {
  configAfter = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
} catch (e) {
  configAfter = { __unreadable: String(e.message) };
}

widgetOps.length = 0;
await fire("session_start", makeCtx());
const secondStartBanner = widgetOps.some((o) => o.key === "lingual_hud" && Array.isArray(o.content));

const thirdCtx = makeCtx();
await fire("session_start", thirdCtx);
widgetOps.length = 0;
await fire("input", thirdCtx);
const clearedAfterInput = widgetOps.some((o) => o.key === "lingual_hud" && o.content === null);

console.log(
  JSON.stringify({
    lang,
    variant,
    cols,
    bannerLines,
    bannerPlacement: bannerOps.length ? bannerOps[bannerOps.length - 1].opts?.placement : null,
    secondStartBanner,
    clearedAfterInput,
    inputPrompted,
    configAfter,
    errors,
  })
);
