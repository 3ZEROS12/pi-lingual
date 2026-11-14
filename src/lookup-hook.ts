/**
 * Observing what the user copied in the fullscreen transcript.
 *
 * Fullscreen mode owns text selection: a double-click, a drag, and the copy
 * keybinding all end in the same injected clipboard callback that pi hands to
 * the alternate-screen renderer. The TUI exposes no copy event and consumes
 * mouse input before extension listeners see it, so that callback is the only
 * place a lookup can learn "the user copied this". We wrap it on the live
 * renderer instance, leave pi's own clipboard behaviour untouched, and notify
 * only after a copy that actually succeeded.
 */

export type CopyHookTarget = "copySelection" | "copyTextToClipboard" | "none";

type CopyListener = (text: string) => void;
type CopyFn = (text: string) => Promise<boolean | string>;
type CopyTextFn = (text: string) => Promise<boolean>;

interface Installed {
  listener: CopyListener;
  target: CopyHookTarget;
}

/** Marks a renderer instance so re-attaching after a reload swaps the listener instead of stacking wrappers. */
const INSTALLED = Symbol.for("pi-lingual.lookup-copy-hook");

function notify(listener: CopyListener, text: string): void {
  try {
    const result = listener(text) as unknown;
    // A listener that went async must not re-enter pi as an unhandled rejection:
    // that path ends in pi's uncaughtException handler, which exits the process.
    if (result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    // A lookup failure must never turn into a failed copy.
  }
}

/** Runs the callback below ours; a broken wrapper ahead of us returns a failed copy instead of a crash. */
async function callOriginal<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch {
    return fallback;
  }
}

export function attachCopyHook(tui: unknown, listener: CopyListener): CopyHookTarget {
  if (!tui || typeof tui !== "object") return "none";
  const target = tui as Record<string | symbol, unknown>;
  const existing = target[INSTALLED] as Installed | undefined;
  if (existing) {
    existing.listener = listener;
    return existing.target;
  }

  const record = target as { copySelection?: unknown; copyTextToClipboard?: unknown };
  const installed: Installed = { listener, target: "none" };

  if (typeof record.copySelection === "function") {
    const original = record.copySelection as CopyFn;
    record.copySelection = async (text: string): Promise<boolean | string> => {
      const result = await callOriginal(() => original.call(tui, text), false);
      if (result === true) notify(installed.listener, text);
      return result;
    };
    installed.target = "copySelection";
  } else if (typeof record.copyTextToClipboard === "function") {
    const original = record.copyTextToClipboard as CopyTextFn;
    record.copyTextToClipboard = async (text: string): Promise<boolean> => {
      const ok = await callOriginal(() => original.call(tui, text), false);
      if (ok) notify(installed.listener, text);
      return ok;
    };
    installed.target = "copyTextToClipboard";
  }

  target[INSTALLED] = installed;
  return installed.target;
}
