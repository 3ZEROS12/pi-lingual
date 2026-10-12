/**
 * Code & Shell Pass-through Shield (代码与纯命令行 0ms 旁路拦截器)
 * 
 * 开发者在与 AI 对话时频繁输入终端命令或粘贴大段代码，这类输入无伴学翻译价值。
 * 在此做 0.1ms 级的快速特征嗅探，命中后直接跳过，零网络请求，零 Token 损耗。
 */

// 常见终端常用命令行前缀 (行首匹配)
const SHELL_COMMAND_PREFIXES = [
  "git ", "npm ", "pnpm ", "yarn ", "bun ", "cargo ", "rustc ",
  "go ", "python ", "python3 ", "pip ", "node ", "deno ",
  "docker ", "podman ", "kubectl ", "helm ",
  "make ", "cmake ", "ninja ", "gcc ", "g++ ", "clang ",
  "cd ", "ls ", "dir ", "cat ", "type ", "rm ", "cp ", "mv ",
  "mkdir ", "chmod ", "chown ", "curl ", "wget ", "ssh ", "scp ",
  "grep ", "find ", "ps ", "kill ", "echo ", "export ", "set ",
  "typst ", "ffmpeg ", "yt-dlp ", "npx ", "tar ", "zip ", "unzip "
];

// 常见编程语言顶级语句关键字
const CODE_STATEMENT_REGEX = /^(?:const|let|var|function|def|class|import|export|package|namespace|using|public|private|protected|fn|pub fn|impl|struct|enum|interface|type)\s+/;

// SQL 关键字前缀
const SQL_STATEMENT_REGEX = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+/i;

/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
export function isNonEnglish(text: string): boolean {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}

/**
 * 判定输入文本是否为纯代码块、Shell 指令或数据结构体，应当 0ms 旁路放行
 */
export function shouldShieldBypass(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // 1. Markdown 代码块 (以 ``` 开头)
  if (trimmed.startsWith("```")) {
    // 若代码块外包含明确的人类自然语言提问或说明，绝不旁路拦截！
    const withoutCodeFence = trimmed.replace(/```[\s\S]*?```/g, "").trim();
    if (withoutCodeFence && (/[?？]/.test(withoutCodeFence) || /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix)/i.test(withoutCodeFence))) {
      return false;
    }
    return true;
  }

  // 2. 闭合的 JSON 对象或数组
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    // 简易验证是否具有结构特征
    if (trimmed.includes(":") || trimmed.includes(",")) {
      return true;
    }
  }

  // 3. Shell CLI 指令识别 (例如 git status, npm test, cargo run)
  const lower = trimmed.toLowerCase();
  for (const prefix of SHELL_COMMAND_PREFIXES) {
    if (lower.startsWith(prefix)) {
      // 若整句包含疑问标点或疑问关键词，判定为自然语言技术提问，绝不拦截
      if (/[?？]/.test(trimmed) || /(?:为什么|怎么|如何|报错|为何|explain|why|how)/i.test(trimmed)) {
        return false;
      }

      // 如果整句不包含任何中日韩等自然语言字符，严格判定为纯 CLI 指令
      if (!/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed)) {
        return true;
      }

      // 即使含有非英文字符，如果明确以提交参数 flags 开头（如 `git commit -m "修复bug"`）
      if (/^git\s+(?:commit|tag)\s+.*-m\s+["'].*["']/i.test(trimmed)) {
        return true;
      }
    }
  }

  // 4. 纯单行代码定义语句 (若无自然语言解释)
  if (CODE_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("？") && !trimmed.includes("?")) {
    // 若没有明显的口语引导词，判定为代码
    if (!/[\u4e00-\u9fa5]/.test(trimmed) || /^[a-zA-Z0-9_\s<>{}\[\]();:=,"'.]+$/.test(trimmed)) {
      return true;
    }
  }

  // 5. 纯 SQL 查询语句
  if (SQL_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("？") && !trimmed.includes("?")) {
    return true;
  }

  // 6. Local Data Loss Prevention (DLP) & Secret Shield:
  // 零 Token 拦截并直通敏感凭据，严禁将 API Key、数据库密码、私钥、JWT 泄漏至公网大模型
  const SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i,
    /(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]{20}|AKIA[0-9A-Z]{16})/,
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  ];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}
