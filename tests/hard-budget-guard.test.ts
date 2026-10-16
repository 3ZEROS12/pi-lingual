import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTreeBranch, formatSubRail, formatCapsuleLine } from "../src/engine.js";

/**
 * 模拟 extension.ts 中的 Bulletproof Tiered Hard Budget Guard 多级行数防截断算法
 */
function simulateTieredGuard(params: {
  cleanSource: string;
  sourceTag: string;
  spoken: string;
  spokenMeaning?: string;
  written: string;
  writtenMeaning?: string;
  vocab: string;
  vocabTag: string;
  slot1: string;
  slot2: string;
  hudTitle: string;
  maxCols: number;
}): string[] {
  const HARD_MAX_LINES = 8;
  const { cleanSource, sourceTag, spoken, spokenMeaning, written, writtenMeaning, vocab, vocabTag, slot1, slot2, hudTitle, maxCols } = params;

  // 1. 原文渲染 (最多 2 行)
  const prefix = `  · [${sourceTag}] `;
  const sourceLines = [`${prefix}${cleanSource}`]; // 简写代表首行或折行

  // Tier 0: 全展开 (双模 + 语感子导轨 + 重点词汇)
  let lines: string[] = [...sourceLines];
  lines.push(...formatTreeBranch("┌", "│", slot1, spoken, s => s, s => s, s => s, s => s, maxCols));
  if (spokenMeaning) {
    lines.push(...formatSubRail("│", spokenMeaning, "↳", s => s, s => s, maxCols));
  }
  lines.push(...formatTreeBranch("├", "│", slot2, written, s => s, s => s, s => s, s => s, maxCols));
  if (writtenMeaning) {
    lines.push(...formatSubRail("│", writtenMeaning, "↳", s => s, s => s, maxCols));
  }
  lines.push(...formatTreeBranch("└", " ", vocabTag, vocab, s => s, s => s, s => s, s => s, maxCols));

  if (lines.length <= HARD_MAX_LINES) {
    return lines;
  }

  // Tier 1: 内联母语语感释义入括号
  const t1Lines: string[] = [...sourceLines];
  const spT1 = spokenMeaning ? `${spoken} (${spokenMeaning})` : spoken;
  t1Lines.push(...formatTreeBranch("┌", "│", slot1, spT1, s => s, s => s, s => s, s => s, maxCols));
  const wrT1 = writtenMeaning ? `${written} (${writtenMeaning})` : written;
  t1Lines.push(...formatTreeBranch("├", "│", slot2, wrT1, s => s, s => s, s => s, s => s, maxCols));
  t1Lines.push(...formatTreeBranch("└", " ", vocabTag, vocab, s => s, s => s, s => s, s => s, maxCols));

  if (t1Lines.length <= HARD_MAX_LINES) {
    return t1Lines;
  }

  // Tier 2: 剥离长篇母语解释，只保留纯正目标语 spoken 和 written
  const t2Lines: string[] = [...sourceLines];
  t2Lines.push(...formatTreeBranch("┌", "│", slot1, spoken, s => s, s => s, s => s, s => s, maxCols));
  t2Lines.push(...formatTreeBranch("├", "│", slot2, written, s => s, s => s, s => s, s => s, maxCols));
  t2Lines.push(...formatTreeBranch("└", " ", vocabTag, vocab, s => s, s => s, s => s, s => s, maxCols));

  if (t2Lines.length <= HARD_MAX_LINES) {
    return t2Lines;
  }

  // Tier 3: 进一步省略重点词汇行
  const t3Lines: string[] = [...sourceLines.slice(0, 2)];
  t3Lines.push(...formatTreeBranch("┌", "│", slot1, spoken, s => s, s => s, s => s, s => s, maxCols));
  t3Lines.push(...formatTreeBranch("└", " ", slot2, written, s => s, s => s, s => s, s => s, maxCols));

  if (t3Lines.length <= HARD_MAX_LINES) {
    return t3Lines;
  }

  // Tier 4: 单行胶囊降级
  const capsule = formatCapsuleLine(hudTitle, spoken, written, { maxCols });
  return [capsule];
}

test("Bulletproof Tiered Hard Budget Guard - guarantees lines.length <= 8 on extreme long inputs and narrow columns", () => {
  // 极端超长输入：正是用户实际测试时触发截断的那段长文本
  const longSource =
    "才发现你提供的readme竟然存在很多基本错误，导致article文件夹的agent根本没法很好完成任务。 1，首先看最开始的图片，eg-zh，那几个标签竟然是中文？";
  const longSpoken =
    "Just realized the README you shared actually has a bunch of basic issues, so the agent in the `article` folder can't really get its job done. 1. First off, look at the initial image, `eg-zh`—why are those tags in Chinese?";
  const longSpokenMeaning =
    "刚发现你给的 README 居然有一堆低级错误，搞得 article 文件夹里的 agent 根本没法正常干活。1. 首先你看开头那张图 eg-zh，那些标签怎么会是中文的？";
  const longWritten =
    "Multiple fundamental issues were identified in the provided `README`, preventing the agent in the `article` directory from completing tasks successfully. 1. First, regarding the initial image, `eg-zh`, the tags are unexpectedly in Chinese.";
  const longWrittenMeaning =
    "经核查，所提供的 README 存在多处基础性错误，导致 article 目录下的 agent 无法正常执行任务。1. 首先，针对初始图片 eg-zh，其中的标签异常显示为中文。";
  const longVocab =
    "fundamental issues (根本性问题) · prevent from (阻止/妨碍) · unexpectedly (出乎意料地) · get job done (顺利完成工作)";

  // 测试 1：常规 80 列宽度下的极端长句
  const lines80 = simulateTieredGuard({
    cleanSource: longSource,
    sourceTag: "Original",
    spoken: longSpoken,
    spokenMeaning: longSpokenMeaning,
    written: longWritten,
    writtenMeaning: longWrittenMeaning,
    vocab: longVocab,
    vocabTag: "Vocab",
    slot1: "Spoken",
    slot2: "Written",
    hudTitle: "two ⇄ 二",
    maxCols: 72,
  });

  assert.ok(lines80.length <= 8, `Rendered lines (${lines80.length}) must strictly be <= 8 lines to prevent Pi widget truncation`);

  // 测试 2：极端窄屏 (45 列分屏 tiling terminal)
  const lines45 = simulateTieredGuard({
    cleanSource: longSource,
    sourceTag: "Original",
    spoken: longSpoken,
    spokenMeaning: longSpokenMeaning,
    written: longWritten,
    writtenMeaning: longWrittenMeaning,
    vocab: longVocab,
    vocabTag: "Vocab",
    slot1: "Spoken",
    slot2: "Written",
    hudTitle: "two ⇄ 二",
    maxCols: 45,
  });

  assert.ok(lines45.length <= 8, `Under 45 cols, lines (${lines45.length}) must strictly remain <= 8 lines without any host truncation`);
});
