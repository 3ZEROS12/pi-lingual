import { spawn, execFileSync } from "node:child_process";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export function hasActiveUI(ctx: ExtensionContext | null | undefined): ctx is ExtensionContext {
  if (!ctx) return false;
  try {
    return Boolean(ctx.hasUI && ctx.ui);
  } catch {
    return false;
  }
}

export function safeClearWidget(ctx: ExtensionContext | null | undefined): void {
  if (!ctx) return;
  try {
    if (ctx.ui && typeof ctx.ui.setWidget === "function") {
      ctx.ui.setWidget("lingual_hud", undefined);
    }
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

/**
 * Lightweight Context Siphon: extracts recent assistant turn's anchor line (up to 160 chars)
 * strictly for pronoun/anaphora resolution ("here", "this function", "as discussed") and domain terminology.
 * Skips conversational boilerplate and targets lines with concrete technical density (paths, code, identifiers).
 */
export function extractRecentContextAnchor(ctx: ExtensionContext | null | undefined): string {
  if (!ctx) return "";
  try {
    const entries = (ctx as any)?.sessionManager?.getEntries?.() || [];
    const conversationalClosers = [
      /let me know/i,
      /hope this helps/i,
      /feel free to/i,
      /anything else/i,
      /happy to help/i,
      /还有什么/i,
      /随时告诉我/i,
      /请随时/i,
      /如有疑问/i,
      /需要我继续/i,
      /お気軽に/i,
      /他にご質問/i,
    ];

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry?.type === "message" && entry?.message?.role === "assistant") {
        const content = entry.message.content;
        let text = "";
        if (typeof content === "string") {
          text = content;
        } else if (Array.isArray(content)) {
          text = content
            .filter((c: any) => c?.type === "text" && typeof c.text === "string")
            .map((c: any) => c.text)
            .join(" ");
        }
        if (!text || !text.trim()) continue;

        const rawLines = text
          .trim()
          .split("\n")
          .map((l: string) => l.trim())
          .filter(
            (l: string) =>
              l.length > 0 &&
              !/^```/.test(l) &&
              !/^\|[-:\s|]+\|$/.test(l) &&
              !/^\s*\|.*\|/.test(l)
          );

        if (rawLines.length === 0) continue;

        // 1. High priority: backwards scan for lines with technical density (paths, code blocks, functions, flags)
        for (let j = rawLines.length - 1; j >= 0; j--) {
          const line = rawLines[j];
          if (conversationalClosers.some((re) => re.test(line))) continue;

          const isTechnical =
            /`[^`]+`/.test(line) ||
            /[\/\\]/.test(line) ||
            /\.[a-z0-9_-]{2,4}\b/i.test(line) ||
            /[a-z0-9_]\.[a-z0-9_]/i.test(line) ||
            /[_#]/.test(line) ||
            /\b(function|class|const|def|return|import|error|bug|test|file|path|route|api)\b/i.test(line);

          if (isTechnical && line.length >= 10) {
            return line.replace(/^(\s*[-*•]\s+|\s*\d+\.\s+)/, "").slice(0, 160);
          }
        }

        // 2. Medium priority: first non-boilerplate line from the bottom
        for (let j = rawLines.length - 1; j >= 0; j--) {
          const line = rawLines[j];
          if (!conversationalClosers.some((re) => re.test(line)) && line.length >= 8) {
            return line.replace(/^(\s*[-*•]\s+|\s*\d+\.\s+)/, "").slice(0, 160);
          }
        }

        // 3. Fallback: last non-empty line
        return rawLines[rawLines.length - 1].slice(0, 160);
      }
    }
  } catch {}
  return "";
}

export function copyToClipboard(text: string): boolean {
  if (!text) return false;
  // Emit ANSI OSC 52 only on TTYs so piped JSON/RPC stdout stays clean
  try {
    if (process.stdout?.isTTY) {
      const base64 = Buffer.from(text, "utf8").toString("base64");
      process.stdout.write(`\x1b]52;c;${base64}\x07`);
    }
  } catch {}

  try {
    if (process.platform === "win32") {
      const proc = spawn("clip.exe", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {});
      proc.stdin.on("error", () => {});
      // clip.exe handles raw UTF-16LE cleanly without injecting a leading U+FEFF BOM
      proc.stdin.write(Buffer.from(text, "utf16le"));
      proc.stdin.end();
      return true;
    } else if (process.platform === "darwin") {
      const proc = spawn("pbcopy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {});
      proc.stdin.on("error", () => {});
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    } else {
      // Linux: try wl-copy then fallback to xclip
      const proc = spawn("wl-copy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {
        try {
          const procX = spawn("xclip", ["-selection", "clipboard"], { stdio: ["pipe", "ignore", "ignore"] });
          procX.on("error", () => {});
          procX.stdin.on("error", () => {});
          procX.stdin.write(text, "utf8");
          procX.stdin.end();
        } catch {}
      });
      proc.stdin.on("error", () => {});
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Captures a brief git diff or git status snippet to ground commit or context-aware modes.
 */
export function captureGitContextSnapshot(cwd: string = process.cwd()): string {
  try {
    const diffOutput = execFileSync("git", ["diff", "--stat", "HEAD"], {
      cwd,
      encoding: "utf8",
      timeout: 250,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (diffOutput && diffOutput.trim()) {
      return `[GIT DIFF]:\n${diffOutput.trim().slice(0, 300)}`;
    }
    const statusOutput = execFileSync("git", ["status", "--short"], {
      cwd,
      encoding: "utf8",
      timeout: 250,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (statusOutput && statusOutput.trim()) {
      return `[GIT STATUS]:\n${statusOutput.trim().slice(0, 300)}`;
    }
  } catch {}
  return "";
}
