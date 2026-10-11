# `pi-lingual` 工业级第一性原理重构与工程落地终极总纲方案 (Master Plan)
**Document ID**: `SPEC-LINGUAL-REBUILD-2026-FINAL`  
**Classification**: Core Architecture / Engineering Blueprint  
**Status**: APPROVED & FROZEN FOR EXECUTION  
**Target Root**: `D:/Workspace/projects/pi-lingual`  

---

## 🧭 一、 战略决算：坚决保留、彻底重构与果断砍除 (The Disposition Matrix)

严格践行工作区总纲 **Ponytail Reflex（Smallest Working Diff & Anti-Overengineering，RFC 2119）**，坚决不搞形式主义玩具，划定三层绝对物理边界：

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        pi-lingual 终极源码与技术栈处置决策                             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
 【 1. 黄金资产 100% 保留 】         【 2. 核心硬伤彻底重构 】           【 3. 形式主义过度设计果断砍除 】
 • 六国语言预设与本地化字典         • 全局变量 ➔ 物理中止状态机 (FSM)    • ❌ 坚决砍掉 本地 0.5B ONNX / SLM
 • 工业级 Few-Shot 语料锚点         • 脆弱正则 ➔ 规范词法提炼管道        (体积暴涨 500MB，C++ 编译易炸)
 • 50 容量高效 LRU 淘汰算法         • 手工拼凑 ➔ UAX #11 盒模型求解器   • ❌ 坚决砍掉 无头 xterm 仿真器
 • 混合意图嫁接契约 (rawPayload)     • 孤立标点 ➔ 严格行头禁则 (Kinsoku)  (严重拖慢测试，引入浏览器依赖)
 • 现存 53 个 Gold Master 测试      • 磁盘重复 I/O ➔ 2s 内存快照缓存     • ❌ 坚决砍掉 Aho-Corasick 自动机
                                                                        (3个词的下划线用自动机纯属杀鸡用牛刀)
```

### 1. 坚决保留的领域黄金资产 (Keep Verbatim)
* **六国语言双模语料字典与 Few-Shot 锚点 (`presets.ts`, `prompts.ts`)**：中、日、英、西、法、德经过深度语感打磨的口语与书面对照、代码屏蔽铁律是系统最值钱的领域资产，100% 原样继承；
* **混合意图嫁接契约 (`rawPayload`)**：在英文模式下只翻译自然语言提问、将原始堆栈/代码无损拼装发给 AI 的机制，完全符合大模型最佳推理实践，予以保留；
* **现存 53 个回归测试套件 (`tests/`)**：作为绝对冻结的**金标验收闸门（Gold Master Gate）**，重构全过程保证 0 修改、始终 100% 全绿！

### 2. 彻底连根拔起并重构的技术债务 (Rewrite from First Principles)
* **全局可变状态与悬挂 Promise**：物理销毁 `currentRequestId` 与可变数组，改用**单调递增令牌 + 物理 `AbortController` 绑定**，新输入到达瞬间物理掐断上游网络 Socket，彻底根除 Token 偷跑与幽灵卡片；
* **终端排版经验主义凑数**：用严格的 **Unicode Standard Annex #11（东亚宽度规范）** 替代粗糙的十六进制码点扫描，重构带禁则处理（Kinsoku Shori）的盒模型求解器，数学证明物理宽度永不超标；
* **单行胶囊模式列宽失控**：精确预先扣除前缀标签与省略号开销，并在最外层施加终极列宽保护，杜绝 7~17 列越界折行。

### 3. 果断剔除的“伪需求与企业级过度设计”（Anti-Overengineering）
* ❌ **坚决否定本地 0.5B ONNX / GGUF 端侧小模型**：原蓝图构想打包本地模型以节省 Token，但红队审计指出这会导致包体积暴涨 300~500MB，且在 Windows 缺少 C++ 编译环境时极易安装失败，0.5B 小模型也无法稳定输出雅思 8.0 双模语感。**坚持采用宿主原生模型调度（`ctx.modelRegistry`），0 额外开销，0 编译依赖！**
* ❌ **坚决否定无头终端 `xterm-headless`**：原蓝图试图用虚拟终端画布来做截屏对比，但这会引入庞大的 `node-pty/canvas` 依赖，将 70ms 的测试拖慢至 15 秒以上。**改用 40 行纯 TypeScript ANSI 虚拟单元格校验器 + `fast-check` 生成式测试（PBT，10,000 轮随机测试）**，轻量飞速！
* ❌ **坚决否定 6 层超微包碎片化拆分**：严防微服务综合征，全项目收敛为 **4 个高内聚核心源文件**。

---

## 🏛️ 二、 新系统高内聚四模块拓扑架构 (The Cohesive Architecture)

不搞过度碎片化，代码清晰划分为 4 个高内聚模块：

```text
src/
├── types.ts          # 领域数据契约、不可变配置、FSM 状态与事件枚举定义
├── layout.ts         # UAX #11 盒模型、物理列宽计算、标点禁则折行、树状/胶囊格式化器
├── fsm.ts            # 单调递增会话控制器 (内置物理 AbortController 网络掐断机制)
├── engine.ts         # 词法分词、意图提炼、提示词合成、LRU 缓存与模型调用门面
└── extension.ts      # 薄胶水 Controller：生命周期挂载、Pi API 钩子、/lingual 命令映射
```

### 数据与执行流（纯函数单向数据流）：
```text
[ 用户输入 raw text ] 
          │
          ▼
   1. 词法与意图提炼 (engine.ts / sanitizer & shield)
      - 全局正规化 Windows 路径斜杠，剥离剪贴板截图
      - 提取自然语言核心，保留 rawPayload 真实堆栈
          │
          ▼
   2. 会话状态机控制器 (fsm.ts / LingualSessionController)
      - abortActive(): 瞬间物理掐断上一轮未完成的远程网络连接
      - 生成新单调世代 generation 与新的 AbortSignal
          │
          ▼
   3. 异步翻译与两级缓存 (engine.ts / translatePrompt)
      - 命中内存 LRU ➔ 0ms 瞬间直出
      - 未命中 ➔ 调用 streamSimple (reasoning: "off", maxTokens: 600, signal: AbortSignal)
          │
          ▼
   4. 物理盒模型求解器 (layout.ts / renderCardLayout)
      - UAX #11 视觉列宽计算 (CJK 2 列，ASCII 1 列，ANSI 转义符 0 列)
      - 禁则处理 (行首严禁孤立标点)
      - 9 行硬预算闭环约束 (单行胶囊降级保障)
          │
          ▼
   5. 声明式挂载 (extension.ts)
      - 校验 generation === currentGeneration (拒绝陈旧回调)
      - 挂载 ctx.ui.setWidget("lingual_hud", lines)
      - 刷新底栏 ctx.ui.setStatus("lingual", "zh ⇄ en")
```

---

## 📐 三、 关键算法形式化设计（解决被审计出的 5 大隐蔽死穴）

### 1. 物理网络请求协同掐断（彻底杜绝僵尸请求与 Token 偷跑）
```typescript
// src/fsm.ts
export class LingualSessionController {
  private activeAbortController: AbortController | null = null;
  private currentGeneration = 0;

  public beginRequest(): { generation: number; signal: AbortSignal } {
    this.abortActive(); // 物理中断前序正在排队或流式传输的 HTTP Socket
    this.activeAbortController = new AbortController();
    return {
      generation: ++this.currentGeneration,
      signal: this.activeAbortController.signal,
    };
  }

  public abortActive(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  public isLatest(generation: number): boolean {
    return this.currentGeneration === generation;
  }
}
```

### 2. 终端缩放（`SIGWINCH`）安全保底
针对窗口拖动缩放导致 `process.stdout.columns` 瞬间为 0 或 NaN 的问题：
```typescript
// src/layout.ts
export function getEffectiveMaxCols(requested?: number): number {
  const terminalCols = process.stdout?.columns;
  const raw = requested || (typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 80);
  return Math.max(25, raw); // 无论窗口如何缩放，物理保底 25 列，防除零与崩溃
}
```

### 3. 严格遵循 UAX #11 的列宽与截断数学保证
彻底修复 `truncateVisual` 系统性多出 3 列的缺陷：
```typescript
// src/layout.ts
export function truncateVisual(str: string, maxVisualCols: number): string {
  if (maxVisualCols <= 0) return "";
  const fullWidth = getVisualWidth(str);
  if (fullWidth <= maxVisualCols) return str;

  // 必须提前扣除省略号 "..." 的 3 列物理预算
  const targetCols = Math.max(1, maxVisualCols - 3);
  let curWidth = 0;
  let result = "";
  for (const char of str) {
    const w = getVisualWidth(char);
    if (curWidth + w > targetCols) break;
    result += char;
    curWidth += w;
  }
  return result + "..."; // 保证拼接后严格 <= maxVisualCols
}
```

---

## 🛠️ 四、 分阶段零风险重构施工路线图 (Step 1 ➔ Step 5)

施工过程严格遵循**金标冻结、零破坏、步步为营**的交付铁律：

```text
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │ Step 1: 几何  │ ──> │ Step 2: 状态机│ ──> │ Step 3: 词法  │ ──> │ Step 4: 引擎  │ ──> │ Step 5: 门面  │
 │ 提炼 layout.ts│     │ 实现 fsm.ts   │     │ 加固提炼与盾牌│     │ 整合 engine.ts│     │ extension.ts  │
 └───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
 (Pass 53/53 测试)     (Pass 53/53 测试)     (Pass 53/53 测试)     (Pass 53/53 测试)     (Pass 53/53 测试)
```

1. **Step 1: 盒模型与几何计算抽象 (`src/layout.ts`)**
   * 移植并加固 UAX #11 视觉宽度、标点禁则折行、修复后的 `truncateVisual` 与 `formatCapsuleLine`；
   * 验证：`npx tsx --test tests/capsule.test.ts tests/tree-hanging-indent.test.ts`。
2. **Step 2: 单调中止状态机落地 (`src/fsm.ts`)**
   * 编写 `LingualSessionController`，封装物理 `AbortController` 绑定与世代校验；
   * 验证：编写并发竞态单元测试，证明先发慢请求被 100% 物理掐断且不覆写屏幕。
3. **Step 3: 词法盾牌与意图提炼加固 (`src/engine.ts`)**
   * 统一正规化 Windows 路径斜杠，确保单行代码块起手的提问不被旁路误杀，超长无标点单句平滑切断；
   * 验证：`npx tsx --test tests/shield.test.ts tests/sanitizer.test.ts tests/chunker.test.ts`。
4. **Step 4: 领域整合与配置缓存优化 (`src/engine.ts`)**
   * 接入 2 秒内存配置快照与 LRU 字符长度上限保护；
   * 验证：`npx tsx --test tests/engine.test.ts tests/cache.test.ts`。
5. **Step 5: 扩展装配与全量金标验收 (`src/extension.ts`, `src/index.ts`)**
   * 作为纯 Presenter 连接 Pi API，对外导出完整兼容门面；
   * 终审验证：`npm run build && npm test`，**确保全部 53 项 Gold Master 测试一次性全绿通过**。

---

## 🔒 五、 质量防护网与不可动摇的 6 大工程戒律 (RFC 2119)

在 `docs/adr/` 中固化六大不可违背的绝对工程戒律：
1. **ADR-001 (禁止使用正则解析结构化语法)**：开发者 **MUST NOT** 使用复杂回溯正则去解析 Markdown、代码块、堆栈或 URL；一切结构化文本必须走规范分词与语法流。
2. **ADR-002 (严格 UAX #11 与开放式左导轨)**：终端几何计算 **MUST** 遵循 Unicode UAX #11，任何动态文本 **MUST NOT** 使用闭合右边框（`│ ... │`）。
3. **ADR-003 (核心与宿主物理隔离)**：核心层代码 **MUST NOT** 导入任何宿主特有包或平台全局 API。
4. **ADR-004 (交互绝对非阻塞与协同掐断)**：伴学分析与后台推理 **MUST NOT** 阻塞用户输入，且新输入到达时 **MUST** 立即通过 `AbortController` 掐断悬挂旧任务。
5. **ADR-005 (零残留配置回滚)**：回滚或禁用任何特性 **MUST** 从配置文件中物理删除键名（`delete config[target]`）。
6. **ADR-006 (反对口头承诺，机器证据交付)**：任何变更 **MUST NOT** 仅凭文字描述合入，**MUST** 附带自动化生成的物理测试与虚拟屏幕验证证据。
