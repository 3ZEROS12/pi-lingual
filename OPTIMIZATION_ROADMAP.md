# `pi-lingual` 工业级重构与工程发布路线图 (Optimization Roadmap & Release Gate)

> 📌 **基线状态 (Baseline Status)**: `ALL 5 PHASES COMPLETED · 64/64 TESTS PASS (100% GREEN)`  
> **归属工程池**: `D:/Workspace/projects/pi-lingual`  
> **技术规格书**: `docs/ARCHITECTURE_REBUILD_SPEC.md`  
> **设计准则**: 严格遵循 Ponytail Reflex（Smallest Working Diff & Anti-Overengineering，RFC 2119）与 Trifecta Invariants 1~9

---

## 一、 核心资产处置决算 (Asset Disposition Decision)

1. **REUSE (资产 100% 继承)**：
   * 中、日、英、西、法、德六国语言双模预设字典 (`src/presets.ts`)；
   * 高保真 Few-Shot 语料锚点与 `[CODE & SYMBOL SHIELD]` 规则 (`src/prompts.ts`)；
   * LRU 缓存双向链表 O(1) 淘汰算法与命中统计 (`src/cache.ts`)；
   * 混合意图嫁接契约 (`rawPayload`) 与路径清洗规则 (`src/sanitizer.ts`)；
   * 现存全部 53 个测试套件 (`tests/`) 作为不可动摇的 Gold Master 验证闸门。
2. **REFACTOR (结构化现代化升级)**：
   * `engine.ts` 上帝模块解耦：分拆为排版层、模型传输层与领域逻辑层；
   * 命令前缀扫描升级为常量级字典判定。
3. **SCRAP & REWRITE (彻底推翻重写)**：
   * 销毁全局可变状态 `currentRequestId` 与共享数组，改用单调递增世代 + 物理 `AbortController` 绑定；
   * 废弃手工十六进制码点扫描与后处理改字，重构为严格遵循 **Unicode UAX #11** 的盒模型排版求解器 (`src/layout.ts`)；
   * 废弃 9 行硬预算的事后逐层截断凑数逻辑。

---

## 二、 五阶段逐步构建实施路径 (Step 1 ➔ Step 5)

- [x] **Step 1: 几何计算与盒模型抽象 (`src/layout.ts`)**
  - 实现 UAX #11 视觉列宽精准测算（CJK 2 列，ASCII 1 列，ANSI 转义符 0 列）；
  - 实现严格标点行头禁则（Kinsoku Shori）前瞻性折行；
  - 彻底修复 `truncateVisual` 省略号溢出与 `formatCapsuleLine` 列宽越界；
  - **验收闸门**: `npx tsx --test tests/capsule.test.ts tests/tree-hanging-indent.test.ts tests/layout.test.ts` (PASS)。

- [x] **Step 2: 单调中止状态机与会话控制 (`src/fsm.ts`)**
  - 实现 `LingualSessionController`，封装物理 `AbortController` 绑定与世代校验；
  - 每次新输入到达时物理掐断前序远程网络连接，彻底消灭 Token 偷跑与幽灵卡片；
  - **验收闸门**: 并发竞态单元测试，证明先发慢请求被 100% 物理掐断且不覆写屏幕 (PASS)。

- [x] **Step 3: 词法拦截与意图提炼加固 (`src/engine.ts`, `src/sanitizer.ts`, `src/shield.ts`)**
  - 统一正规化 Windows 路径斜杠，确保单行代码块起手提问不被误杀；
  - 接入超长无标点单句的 65 字符平滑切片；
  - **验收闸门**: `npx tsx --test tests/shield.test.ts tests/sanitizer.test.ts tests/chunker.test.ts` (PASS)。

- [x] **Step 4: 领域整合与配置缓存优化 (`src/engine.ts`, `src/cache.ts`)**
  - 接入 2 秒内存配置快照与 LRU 字符长度上限保护 (key <= 256, payload <= 2048)；
  - 封装多语言驱动与提示词工厂，透传 `AbortSignal`；
  - **验收闸门**: `npx tsx --test tests/engine.test.ts tests/cache.test.ts tests/sovereignty.test.ts` (PASS)。

- [x] **Step 5: 插件装配层接合与全量兼容门面加固 (`src/extension.ts`, `src/index.ts`)**
  - 作为纯 Presenter 监听 Pi API 事件，挂载终端 HUD 与状态栏；
  - 在 `src/index.ts` 暴露全量向后兼容 Facade；
  - **终审验收闸门**: `npm run build && npm test` 确保 64/64 全绿通过 (PASS)。
