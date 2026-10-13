# pi-lingual

面向 Pi Coding Agent 的终端双语视窗与提示词转写引擎。

敲母语写代码。输入框上方实时显示地道技术口语与书面语；也可一键将提示词转写为规范技术英文，保持代码、注释与提交全英文规范。

[![npm version](https://img.shields.io/npm/v/pi-lingual?color=blue)](https://www.npmjs.com/package/pi-lingual)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for Pi](https://img.shields.io/badge/Built%20for-Pi%20Coding%20Agent-orange)](https://github.com/earendil-works/pi-coding-agent)
[![Tests](https://img.shields.io/badge/Tests-97%2F97%20Pass%20(100%25)-brightgreen)](tests/engine.test.ts)
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
开启 `english` 模式后：你在终端里用最习惯的母语随手提问，插件自动转写为专业技术英文下发给 AI。**AI 产出的代码、注释和说明天然保持统一的纯英文规范。**

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

## 五大工作状态 (`1 ➔ 2 ➔ 3 ➔ 4 ➔ 0`)

终端中输入 `/lingual` 顺序循环切换，或敲 `/lingual <1|2|3|4|0|companion|direct|candidates|modify|off>` 一步直达：

| 状态 | 英文标识 | 你输入什么 | 引擎执行逻辑 | 底栏与界面反馈 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[1] 纯伴学`** | `companion` | 母语 *(如中文/日文)* | **0ms 原话直发主 AI** + 后台异步生成伴学词卡 (`slots`) | 底栏 `zh ⇄ en · 纯伴学` + 顶部伴学卡 | 日常高速开发，顺带利用等待间隙积累地道表达 |
| **`[2] 直接改`** | `direct` | 母语 / 日常输入 | **自动跑专属 `directSlots`，1 对 1 直接转换发出** | 底栏 `zh ⇄ en · 直接改` + 顶部转换预览 | 回车自动 1 对 1 忠实直译或按唯一标准改好直发 |
| **`[3] 挑候选`** | `candidates` | 母语 / 多语需求 | **跑 `promptSlots` 全部候选，按键盘数字键 `1..N` 免回车秒发** | 底栏 `zh ⇄ en · 挑候选` + 顶部完整卡片 + 底部数字快捷键栏 | 多语种/多语气同屏对比，按 `1~N` 一键秒发（按 `0`/`Esc` 发原话） |
| **`[4] 实战狂飙`** | `modify` | 外语狂飙 / 英文草稿 | **只修错词/介词/句法，保留粗口情绪，不挑剔标点大小写，直发 Agent** | 底栏 `zh ⇄ en · 实战狂飙` + 顶部盲点复盘卡 (短句带改版，长句盲点聚焦) | 亲自坐上驾驶位直接飙外语，错词句法自动兜底，越用语感越强 |
| **`[0] 已关闭`** | `off` | 任意输入 | **隐藏底栏状态徽标 (`undefined`)、卸载终端监听、剥离技能块** | **0 像素、0 监听、0 Token**，彻底无痕 | 纯沉浸编码或录屏演示，不留任何视觉与上下文痕迹 |

### 四模式严格物理隔离 + 按需隐形唤醒定制 (`/lingual tuner` · 平时 0 系统提示词占用)
`pi-lingual` 在 `~/.pi/agent/lingual.json` 中为四大工作状态设立了**四套严格物理隔离的槽位数组**，彻底杜绝跨模式配置串味（且日常写代码时自动剥离 `lingual-tuner` 技能块，实现 **0.00 Token** 占用；仅在输入 `/lingual tuner` 时通过 `display: false` 隐形消息按需唤醒向导）：
1. **`slots`（仅管状态 `[1] 纯伴学`）**：
   - 定义伴学卡片展示的语域或语种行（支持任意行数自由扩展），也可敲 `/lingual hide-source` 一键隐藏原文行节省纵向高度。
2. **`directSlots`（仅管状态 `[2] 直接改`）**：
   - 独立专属的 1 对 1 转换规则（出厂默认为 100% 忠实自然的直译/润色，绝不擅自缩写总结），无论模式 1 或模式 3 如何折腾多国语言，模式 2 稳如泰山绝不串味。
3. **`promptSlots`（仅管状态 `[3] 挑候选`）**：
   - 在输入框上方完整折行展示所有候选句子，下方仅渲染紧凑的 `▸ [1] ... [2] ... [0] 原话` 胶囊栏，**直接按键盘数字键 `1..N` 免回车 0ms 秒发对应候选**！
4. **`modifySlots`（仅管状态 `[4] 实战狂飙`）**：
   - **水平绝不跃迁（i+1 原则）**：根据用户原句水准做平实修润，绝不把日常工程英文拔高为晦涩大学学术腔。
   - **情绪粗口完整保留**：怒火与真实情绪（`fuck`, `suck`, `shit`）原汁原味放行，标点符号与大小写零吹毛求疵。
   - **自适应视窗排版**：短句呈现改版 + 收获复盘；长句/段落自动折叠改版全文（已直发 Agent），HUD 聚焦 3 条核心盲点心法。
   - **`explainLang` 认知母语固化**：盲点解析固定用用户最熟悉的母语（中文/日文/英文）呈现，更新版本永不丢失。

### 混合意图嫁接（代码与堆栈绝不乱翻）
在 `english` 模式下，粘贴大段代码块或报错日志时，插件**绝不翻译代码**：
- **只翻人话**：仅提取指令前方的自然语言提问，转写为精准专业的技术英文；
- **原样拼接**：原始代码块、编译器诊断或报错堆栈 100% 原样保留，缝合在英文指令后方；
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

## 动态双槽位架构与领域定制 (Dynamic Dual-Slot Architecture)

`[口语]` 与 `[写作]` 仅是 `pi-lingual` 底层**双槽位架构（Slot 1 & Slot 2）**的出厂默认值。本引擎并非仅局限于软件开发，两个槽位完全解耦，任何人均可通过定制 Agent 提示词或预设配置将其重绑定为适配自身行业的专属语域：

| 预设场景 | 目标领域 | 槽位 1 (轻快 / 日常) | 槽位 2 (正式 / 严谨) |
| :--- | :--- | :--- | :--- |
| **`developer` (默认)** | 软件工程协作 | `[口语]` 硅谷站会交流 / Slack 日常 | `[写作]` RFC 提案 / PR 审查技术规范 |
| **`social`** | 出海推特与社媒推广 | `[Hook]` 爆款开场 / 社交网感俚语 | `[Deep]` 深度技术洞察 / 长推干货 |
| **`japanese`** | 日语双轨伴学 | `[口語]` 朋友日常タメ口 / Huddle 对话 | `[敬語]` 商务严谨敬语 / 官方邮件 |
| **`academic`** | 学术科研出版 | `[Discussion]` 组会研讨口语 / 答辩提问 | `[Paper]` IEEE/ACM 顶级期刊正文规范 |

*如需定制槽位风格，可随时在会话中直接向 Agent 描述你的偏好与受众（如 `/lingual-agent`），或通过 API 的 `CustomSlotsConfig` 直接传入领域规则。*

---

## 视窗形态：完整树状 vs 单行胶囊

针对不同开发分屏环境，提供两套视窗形态：

<p align="center">
  <img src="assets/capsule-mode.svg" alt="pi-lingual 视窗形态切换" width="840">
</p>

1. **左导轨树状架构（默认）**：开放式单侧边框（`· ┌ ├ └`）。基于 Unicode UAX #11 计算列宽，窄分屏下也绝不断行重影；严格限制不超过 9 行，避免触发宿主终端小部件截断报错。
2. **单行胶囊模式（`/compact`）**：将视窗压缩为单行高密度流：
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

- **输入流拦截**：在 `original` 模式下通过 `{ action: "continue" }` 实现 0ms 零延迟放行；在 `english` 模式下通过 `{ action: "transform", text: english }` 动态重写提示词。
- **即时请求熔断**：敲回车或新输入到达时，单调递增世代令牌（Generation Token）立刻用 `AbortController` 物理掐断上一轮未完成的后台网络请求，杜绝幽灵响应与 Token 浪费。
- **零延迟清屏与避峰**：敲回车瞬间立即清空旧卡片，底栏切换为 `polishing...`；在 `original` 模式下伴学请求延迟 80ms 触发，让出连接池给主任务完成首包握手，彻底免除排队互斥。
- **命令行与代码护盾**：40+ 常见 CLI 命令（`git`, `docker`, `npm`, `cargo`, `python`）及代码块以 0ms 直通放行，不耗费任何请求。
- **内存极速缓存**：内置 50 条 LRU 缓存，高频确认词（“继续”、“开始吧”、“认同”）0ms 瞬间直出。
- **输入审查与脱敏**：自动剥离剪贴板截图路径（`pi-clipboard-*.png`），折叠长堆栈报错与编译器诊断，提取核心自然语言。

---

## 精简命令矩阵（仅注册 4 个核心命令，零菜单刷屏）

为保持 Pi `/` 补全菜单干净清爽，`pi-lingual` 仅注册 4 个核心命令，其余低频管理全部收拢在 `/lingual` 子命令下：

| 核心命令 | 常用子命令 / 参数 | 功能说明 |
| :--- | :--- | :--- |
| **`/lingual`** | `/lingual [1\|2\|3\|0]` | 无参数按 `1 ➔ 2 ➔ 3 ➔ 0` 循环切换；带数字或名称直接跳到对应状态 |
| ↳ 子命令 | `/lingual tuner <自然语言要求>` | 按需唤醒 `lingual-tuner` 技能自动修改 `slots` 或 `promptSlots` |
| ↳ 子命令 | `/lingual compact` \| `model` \| `status` \| `news` | 切换单行胶囊、切换伴学模型、查看缓存状态或版本更新说明 |
| **`/lang`** | `/lang <源> [目标]` | 切换语言对（如 `/lang ja en`、`/lang 日语`） |
| **`/slots`** | `/slots [add\|rm\|toggle\|reset]` | 伴学槽位管理（自由增删改查槽位、彻底移除 `source` 原文行） |
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

### 保护主力模型额度
默认自动复用当前 Pi 会话凭证，零配置开箱即用。

如果主任务在使用高配长思考主力模型，可将伴学转写交给环境中的轻量高速模型，保护昂贵的主力推理配额：
```bash
/lingual-model <轻量模型ID>   # 指定环境中的任意轻量高速模型
/lingual-model auto          # 恢复跟随当前会话主模型
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

翻译模型的 Prompts 目前是我预先定制好的，但大家完全可以通过我们提供的 `/lingual agent` 命令或内置的 `lingual-tuner` 技能，针对各自的具体情况进行深度个性化定制。

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
npm test            # 全套自动化单元测试 (96/96 全绿通过)
npm run build       # 多入口生产构建 (插件 + 核心语言引擎)
```

---

## 开源协议

MIT © [Jason Song](https://github.com/3ZEROS12)
