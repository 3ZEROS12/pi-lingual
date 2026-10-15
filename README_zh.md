# pi-lingual

面向 Pi Coding Agent 的终端双语视窗与提示词转写引擎。

敲母语写代码。输入框上方实时显示地道技术口语与书面语；也可一键将提示词转写为规范技术英文，保持代码、注释与提交全英文规范。

[![npm version](https://img.shields.io/npm/v/pi-lingual?color=blue)](https://www.npmjs.com/package/pi-lingual)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for Pi](https://img.shields.io/badge/Built%20for-Pi%20Coding%20Agent-orange)](https://github.com/earendil-works/pi-coding-agent)
[![Tests](https://img.shields.io/badge/Tests-116%2F116%20Pass%20(100%25)-brightgreen)](tests/engine.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Error-blue)](tsconfig.json)

[English](./README.md) | **简体中文**

<p align="center">
  <img src="assets/demo.gif" alt="pi-lingual 终端伴学视窗交互实录" width="840">
</p>

```text
  · [原文] 这个方案有点过度设计了，不如直接用标准库实现
  ┌ [口语] This feels a bit over-engineered; we'd be much better off sticking with the standard library.
  │        (感觉有点过度设计了，用标准库划算得多)
  ├ [写作] The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.
  │        (该方案引入了不必要的复杂度，建议优先采用原生标准库实现)
  └ [重点] over-engineered (过度工程化) · be better off (更合适) · stick with (沿用) · leverage (利用)
```

## 一键安装

在 Pi 终端内运行：

```bash
pi install npm:pi-lingual
```

安装即可直接使用。默认直接调用当前会话的模型凭据，无需额外配置。

---

## 核心价值：为什么需要它？

在终端中使用 AI 编写代码时，开发者每天都会遇到四个非常具体的痛点：

### 1. 团队与开源代码库必须是全英文
参与开源项目或跨国团队时，代码注释、Commit Message 和 PR 描述必须统一为纯英文。
用中文向 AI 提问，AI 很容易产出带有中文注释的代码或中文解释。每次提交前，你都得手动检查并修改一遍。
开启规范直发模式（`direct` / `lazy`）后：你在终端里用最习惯的母语随手提问，插件自动转写为专业技术英文下发给 AI。**AI 产出的代码、注释和说明天然保持统一的纯英文规范。**

### 2. 抓住大模型生成代码的 5 秒空隙
敲下回车后，大模型通常需要 5 到 15 秒来生成代码或重构逻辑。
这段时间很微妙：切出去刷网页太短，盯着屏幕发呆又容易走神。
`pi-lingual` 在输入框上方开辟了一个低认知负荷的语感视窗。利用等待代码生成的短暂间隙，一眼看清同一句话在日常站会（Slack/Standup）与正式技术规范（RFC/PR/Review）中的真实表达，顺手积累地道语感。

### 3. 零上下文污染，不浪费一个多余 Token
传统翻译工具通常把翻译文字追加在用户 Prompt 后面发给模型。
在多轮对话中，这会导致会话历史堆积大量冗余英文，白白浪费上下文预算，还会干扰长对话的推理焦点。
`pi-lingual` 运行在完全独立的 TUI 悬浮视窗中。**发给 AI 的输入保持纯净原文，不会向会话历史写入任何多余内容。**

### 4. 彻底解决终端排版撕裂
东亚全角字符（CJK）在终端中占据 2 个显示列宽。
常见的闭合四方框（`│ ... │`）一旦混入中文或特殊符号，字符测算失准就会导致边框断裂、重影和光标错位。
`pi-lingual` 放弃闭合边框，改用基于 Unicode UAX #11 的开放式树状布局（`· ┌ ├ └`）。无论分屏多窄，排版永不撕裂。

---

## 双核黄金预设与声明式模式架构 (`Mode as Configuration`)

`pi-lingual` 出厂预置**双核黄金基准模式**，并通过通用状态机引擎支持无限自定义。敲 `/lingual` 即可在已启用的模式与已关闭之间平滑循环轮转，或通过 `/lingual <id|序号>` 一步直达：

| 模式 | 核心命令与别名 | 你输入什么 | 引擎执行逻辑 | 底栏与界面反馈 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[1] 规范直发`** | `direct` *(别名: `lazy`)* | 母语自由输入 *(如中文/日文)* | **自动转化成规范英文工程指令直发 Agent** | 底栏 `zh ⇄ en · 规范直发` + 顶部转换预览 | 回车自动 1 对 1 结构化规范直发，保证代码库与注释 100% 纯英文 |
| **`[2] 实战狂飙`** | `live-flow` *(别名: `raw`)* | 英文草稿 / 粗口狂飙 | **只修错词/介词/句法，保留粗口情绪，直发 Agent** | 底栏 `zh ⇄ en · 实战狂飙` + 顶部自适应复盘卡 | 亲自坐上驾驶位直接飙外语，错词自动兜底，下方中文讲透盲点 |
| **`[0] 已关闭`** | `off` | 任意输入 | **隐藏底栏徽标 (`undefined`)、卸载终端监听、剥离技能块** | **0 像素、0 监听、0 Token**，彻底无痕 | 纯沉浸编码或录屏演示，不留任何视觉与上下文痕迹 |

---

### 首次启动语言握手 (First-Run Language Handshake)
在新用户首次安装且缺少配置文件时，`session_start` 会自动嗅探系统原生语言环境，唤起单行预填闪电填空：
```text
✦ [pi-lingual Setup] Native ⇄ Target language (detected: zh):
> zh en
```
- **0.2 秒直过**：猜对了直接敲 `Enter`，一键落盘；想换语言直接退格修改；
- **0 视觉残留**：按下回车瞬间物理卸载输入挂件，屏幕恢复绝对纯净；数据一次落盘终生有效，后续不再弹窗打扰。

---

### 模式注册表管理与极客 CLI 命令 (`/lingual mode`)
用户不仅可以通过自然语言让 `lingual-tuner` 配置模式，也可以在终端直接传参操作：
- `/lingual mode list`：列出当前模式注册表、状态、流动方向与槽位数；
- `/lingual mode add <id> <name> [flow] [action] [hud]`：注册自定义工作流模式；
- `/lingual mode rm <id>`：删除指定模式；
- `/lingual mode toggle <id>`：临时停用/启用某个模式；
- `/lingual mode reset`：一键恢复双核黄金出厂预设。

---

### 四大战术配装库 (`/lingual loadout`)

除了出厂自带的双核预设，`pi-lingual` 提供 4 套专为高频编码场景调校的战术配装，敲一行命令即可装配，也支持通过 `/lingual tuner` 对话定制：

- **`spec`（脑暴压铸）**：`flow: "translate"` · `action: "transform"` · `target: "agent"` · `hud: "preview"`  
  中英杂乱思路 ➔ 压铸为「目标、硬约束、边界流、禁止修改模块」严谨规范，喂给 AI 的 Plan 模式打底。
- **`commit`（提交脱水）**：`flow: "translate"` · `action: "transform"` · `target: "clipboard"` · `hud: "preview"`  
  大白话修改说明 ➔ 自动提取差异转写为首行 $\le 50$ 字符、强动词开头的 Conventional Commits 规范，自动复制到剪贴板。
- **`oss`（开源对线）**：`flow: "translate"` · `action: "transform"` · `target: "clipboard"` · `hud: "tree"`  
  技术反驳与 Issue 讨论 ➔ 转为硅谷 Maintainer 平视、克制、对事不对人的行话（`nit:`, `under contention`, `repro:`），自动复制到剪贴板。
- **`yap`（极客发推）**：`flow: "translate"` · `action: "transform"` · `target: "clipboard"` · `hud: "tree"`  
  刚写完功能顺手甩出 ➔ 冷峻高密度 Indie Hacker 风格（$< 280$ 字符），0 Emoji 铁律，绝无微商软文，自动复制到剪贴板。

### 混合意图嫁接（代码与堆栈绝不乱翻）
在规范直发模式下，粘贴大段代码块或报错日志时，插件**绝不翻译代码**：
- **只翻人话**：仅提取指令前方的自然语言提问，转写为精准专业的技术英文（或当前配置的目标外语，实现全对等双向对称）；
- **原样拼接**：原始代码块、编译器诊断或报错堆栈 100% 原样保留，缝合在优化后的指令后方；
- **最终效果**：AI 收到地道规范的英文指令，同时拥有完整的代码与报错上下文。

---

## 交互实录：双语境视窗的设计哲学

死记孤立的单词表无法形成真实的表达能力。真实工程协作通常分化为两个截然不同的语境：

```text
  · [原文] 这个方案有点过度设计了，不如直接用标准库实现
  ┌ [口语] This feels a bit over-engineered; we'd be much better off sticking with the standard library.
  │        (感觉有点过度设计了，用标准库划算得多)
  ├ [写作] The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.
  │        (该方案引入了不必要的复杂度，建议优先采用原生标准库实现)
  └ [重点] over-engineered (过度工程化) · be better off (更合适) · stick with (沿用) · leverage (利用)
```

* **`[口语] (Spoken Register)`**：北美硅谷团队日常沟通的高频表达。包含站会交流、Slack 讨论、结对编程中的常用短语动词与口语俚语。
* **`[写作] (Written Register)`**：符合工程规范的技术书面语。适用于 RFC 提案、PR 描述、代码审查与技术方案编写。
* **`[重点] (Collocations)`**：动态提取的核心词汇与搭配。在口语和写作句中命中时，自动施加 ANSI 微光下划线高亮。

---

## 视窗形态：完整树状 vs 单行胶囊

针对不同开发分屏环境，提供两套视窗形态：

<p align="center">
  <img src="assets/capsule-mode.svg" alt="pi-lingual 视窗形态切换" width="840">
</p>

1. **左导轨树状架构（默认）**：开放式单侧边框（`· ┌ ├ └`）。基于 Unicode UAX #11 计算列宽，窄分屏下也绝不断行重影；严格限制不超过 9 行，避免触发宿主终端小部件截断报错。
2. **单行胶囊模式（`/lingual compact`）**：将视窗压缩为单行高密度流：
   ```text
   zh ⇄ en · [口] This feels over-engineered... │ [写] Proposed approach introduces unnecessary complexity...
   ```
   *在 tmux、WezTerm 等窄分屏下节省 80% 纵向空间。当终端高度不足 22 行时自动生效。*

---

## 多语言真实场景对照

核心功能是将母语转为高阶英文，但也支持主流工程语言双向互转：

<p align="center">
  <img src="assets/multilingual-showcase.svg" alt="多语言工程矩阵" width="840">
</p>

| 源语言 | 场景 | 输入提示词 | [口语] 站会与交流 | [写作] RFC / PR 规范 |
| :--- | :--- | :--- | :--- | :--- |
| **🇨🇳 zh** | 架构评审 | `这个方案过度设计了，不如直接用标准库` | `This feels a bit over-engineered; let's stick with the standard library.` | `The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.` |
| **🇯🇵 ja** | 系统工程 | `メモリリークの可能性があるので、クリーンアップ処理を追加してください` | `There might be a memory leak here, so let's make sure we toss in some cleanup logic.` | `To prevent potential memory leaks, please incorporate explicit cleanup and resource disposal routines.` |
| **🇪🇸 es** | 代码审查 | `El PR es demasiado grande, sugiero dividirlo en dos cambios atómicos` | `This PR is huge — how about we split it into a couple of bite-sized PRs instead?` | `The PR scope is excessively broad; decomposing it into two discrete, atomic commits is advised.` |
| **🇩🇪 de** | 分布式系统 | `Wir müssen sicherstellen, dass diese Schnittstelle idempotent ist` | `We've gotta make sure this endpoint is strictly idempotent so duplicate requests don't bite us.` | `It is imperative to guarantee strict idempotency for this API endpoint to prevent duplicate mutations.` |

随时通过命令切换语言对：
```bash
/lang ja en      # 日语转英语
/lang es en      # 西班牙语转英语
/lang de en      # 德语转英语
/lang en ja      # 英语转日语
/lang zh ja      # 中文转日语
/lang 日语       # 支持自然语言中文别名
```

**绝对母语主权（Language Sovereignty）**：切换母语后，底栏状态、命令说明、视窗标签、错误提示全部 100% 动态本地化，绝无硬编码残留。

---

## 底层硬核机制

- **输入流拦截**：在 `pass-through` 伴学模式下通过 `{ action: "continue" }` 实现 0ms 零延迟放行；在 `transform` 规范模式下通过 `{ action: "transform", text }` 动态重写提示词；在 `target: "clipboard"` 模式下自动写入系统剪贴板。
- **即时请求熔断**：敲回车或新输入到达时，单调递增世代令牌（Generation Token）立刻用 `AbortController` 物理掐断上一轮未完成的后台网络请求，杜绝幽灵响应与 Token 浪费。
- **零延迟清屏与避峰**：敲回车瞬间立即清空旧卡片，底栏切换为 `polishing...`；在 `pass-through` 伴学模式下请求延迟 80ms 触发，让出连接池给主任务完成首包握手，彻底免除排队互斥。
- **命令行与代码护盾**：40+ 常见 CLI 命令（`git`, `docker`, `npm`, `cargo`, `python`）及代码块以 0ms 直通放行，不耗费任何请求。
- **内存极速缓存**：内置 50 条 LRU 缓存，高频确认词（“继续”、“开始吧”、“认同”）0ms 瞬间直出。
- **输入审查与脱敏**：自动剥离剪贴板截图路径（`pi-clipboard-*.png`），折叠长堆栈报错与编译器诊断，提取核心自然语言。

---

## 精简命令矩阵（仅注册 4 个核心命令，零菜单刷屏）

为保持 Pi `/` 补全菜单干净清爽，`pi-lingual` 仅注册 4 个核心命令，其余低频管理全部收拢在 `/lingual` 子命令下：

| 核心命令 | 子命令 / 传参 | 功能说明 |
| :--- | :--- | :--- |
| **`/lingual`** | `/lingual [id\|序号\|off]` | 平滑轮转当前已启用的模式；带数字或 ID 直接切换到对应模式 |
| ↳ 思考深度 | `/lingual reasoning [low\|medium\|high]` | 调节模型推理思考深度（日常 `low` 秒级极速，结构化 `spec` 自适应 `medium`） |
| ↳ 模式管理 | `/lingual mode [list\|add\|rm\|toggle\|reset]` | 查看模式注册表，通过命令行直接增删改查模式与流向 |
| ↳ 战术配装 | `/lingual loadout [list\|apply <id>]` | 查看或一键装配战术配装（`spec`, `commit`, `oss`, `yap`） |
| ↳ 快捷子命令 | `/lingual compact` \| `model` \| `status` \| `news` \| `lock` | 切换单行胶囊、切换模型、查看状态、版本说明或模式防漂移锁定 |
| **`/tuner`** | `/tuner [自然语言需求]` | 直接唤醒双语架构师向导，对话式定制模式与提示词 |
| **`/lang`** | `/lang <源> [目标]` | 切换语言对（如 `/lang ja en`、`/lang 日语`） |
| **`/slots`** | `/slots [add\|rm\|toggle\|reset]` | 管理当前模式的槽位（添加槽位若超过 1 个译文槽自动升级树状 HUD） |
| **`/last`** | `/last` | 重新浮现上一条伴学或改写卡片 |

*快捷键：`Alt+.`（下一页），`Alt+,`（上一页）。系统独立命令行：`lingual "输入需求"`。*

---

## 全动态槽位流水线（所有槽位完全可动）

伴学卡片的每个槽位（包括原文）都是独立可插拔的构件，不强制绑定任何固定模板：

- **不喜欢回显原文行**：  
  运行 `/slots rm source` 物理移除原文槽位。卡片不占用顶行空间，直接渲染紧凑译文分支。
- **添加自定义风格槽位**：  
  运行 `/slots add twitter 推文 Short punchy tweet under 280 chars`。系统提示词输出结构与 HUD 树状图实时同步适配。
- **一键开关与恢复初始**：  
  运行 `/slots toggle <id>` 临时静音指定槽位；运行 `/slots reset` 恢复初始槽位。

> 💡 **Agent 交互规范**：Agent 在协助你配置或优化伴学风格时，会主动向你确认两件事：**期望的槽位数**，以及**每个槽位具体想要的功能风格（包括是否保留原文）**，按你的真实习惯组装流水线。

---

## 独立模型分流与隐私

### 可配置思考深度 (`/lingual reasoning`)
无需为不同任务频繁切换模型，`pi-lingual` 支持声明式调节每个模式的推理思考深度（Reasoning Effort）：
```bash
/lingual reasoning low       # 极速（~200ms）执行，适合日常规范直发与实战狂飙
/lingual reasoning medium    # 深度结构化推演，适合复杂工程规范压铸（Brain-Dump to Spec）
/lingual reasoning high      # 高难度多约束场景深度推理
```
- 日常模式（`direct`/`lazy`、`live-flow`/`raw`、`commit`、`oss`、`yap`）出厂默认 `"low"`，兼顾极致响应速度；
- 结构化压铸配装（`spec`）出厂默认 `"medium"`，确保目标、约束边界与勿碰模块逻辑缜密、零幻觉。

### 保护主力模型额度
默认自动复用当前 Pi 会话凭证，零配置开箱即用。

如果主任务在使用高配长思考主力模型，可将伴学转写交给环境中的轻量高速模型，保护昂贵的主力推理配额：
```bash
/lingual model <轻量模型ID>   # 指定环境中的任意轻量高速模型
/lingual model auto          # 恢复跟随当前会话主模型
```

也支持在 `~/.pi/agent/lingual.json` 中配置本地 Ollama 或私有兼容端点：
```json
{
  "endpoint": "http://127.0.0.1:11434/v1/chat/completions",
  "model": "qwen2.5:3b"
}
```

> 🔒 **绝对隐私承诺**：`pi-lingual` **零外部依赖**（`dependencies: {}`），零遥测，不上传任何隐私数据。仅与你配置的模型端点通信。

---

## 作者手记 (Author's Note)

翻译模型的 Prompts 目前是我预先定制好的，但大家完全可以通过我们提供的 `/lingual tuner` 命令或内置的 `lingual-tuner` 技能，针对各自的具体情况进行深度个性化定制。

不仅局限于此，大家尽可能真的好好考虑自己想要的输出效果到底是什么：
* **需要多细的颗粒度去分解句子里的重点短语？**
* **是否需要针对特定的语法或工程语境额外增加用法讲解？**
* **提取几个核心搭配最适合自己的认知负荷？**

这些都是很重要的，只有用心调整了，才能达到更好的效果。在终端里敲完回车、等待 AI 生成代码的日常间隙中，顺便多看一眼屏幕上方浮现的地道表达。

启发我这个工具灵感的，可能源于我之前使用水杉输入法等项目的切身经历。我切实地用了很长一段时间，但结果并不是很好，感觉并没有真正学到什么：简单的词汇平时本就熟悉，不用重复学习；而真正困难生僻的词汇，脱离了真实语境光看孤立的词条也学不明白，那段时间我的词汇软件都快被翻烂了。真正能让人自然内化并能脱口而出的，永远是完整语境下的地道表达与真实搭配。

希望大家能用心调出最适合自己的提示词，日常多看一眼，坚持下去吧。

---

## 质量验证与构建

```bash
npm run typecheck   # TypeScript 严格类型检查 (0 错误)
npm test            # 全套自动化单元测试 (116/116 全绿通过)
npm run build       # 多入口生产构建 (插件 + 核心语言引擎)
```

---

## 开源协议

MIT © [Jason Song](https://github.com/3ZEROS12)
