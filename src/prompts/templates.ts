import type { CustomSlotsConfig, SlotConfig, PromptSlotConfig } from "../types.js";
import { LANGUAGE_SPECS, resolveLanguagePairAnchors } from "./anchors.js";
import {
  DEFAULT_KILL_LIST,
  compileKillListInstruction,
  interpolatePromptVariables,
  normalizePromptRules,
  resolveLanguageName,
  resolvePromptTargetLangName,
} from "./rules.js";
import {
  LEGACY_SLOT_PRESETS,
  getDefaultModifySlots,
  getDefaultPromptSlots,
  getDefaultSlots,
} from "./slots.js";

export function buildSystemPrompt(
  sourceLang = "en",
  targetLang = "ja",
  isLongInput = false,
  context?: string,
  tone: "general" | "social" | "tech" = "general",
  customSlots?: SlotConfig[] | CustomSlotsConfig,
  killList?: string[],
  globalKillList?: string[],
  systemHint?: string | string[],
  explainLang?: string
): string {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "ja").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const targetName = resolveLanguageName(normTarget);

  const pairAnchors = resolveLanguagePairAnchors(normSource, normTarget);
  const anchorText =
    pairAnchors.length > 0
      ? pairAnchors
          .map(
            (a) =>
              `Input: ${JSON.stringify(a.input)}\nOutput: ${JSON.stringify({
                spoken: a.spoken,
                spoken_meaning: a.spoken_meaning,
                written: a.written,
                written_meaning: a.written_meaning,
                vocab: a.vocab,
              })}`
          )
          .join("\n\n")
      : "";

  const anchorBlock = anchorText
    ? `\n\n[GOLDEN FEW-SHOT ANCHORS (Pair: ${normSource} ➔ ${normTarget})]:\n${anchorText}`
    : "";

  const condensationDirective = isLongInput
    ? `\n\n[LONG INPUT CONDENSATION DIRECTIVE - 1:1 INTENT ALIGNMENT & ZERO TRUNCATION]:
The user's input is a long or multi-sentence paragraph.
CRITICAL RULES FOR LONG INPUTS:
1. Distill the user's core thesis, question, and key contrast into "summary" in native ${spec.name} (1 concise sentence, under 25 words/chars).
2. Synchronously condense "spoken", "written", and any translation slots so they express that exact distilled core intent in 1-2 tight, natural ${targetName} sentences (STRICTLY <= 28 words / <= 160 characters per slot).
3. Drop repetitive background setup or tangential filler so "summary", "spoken", and "written" align 1:1 in scope and fit completely within 2 lines per slot with ZERO mid-sentence truncation.`
    : "";

  const contextDirective =
    context && context.trim()
      ? `\n\n[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""`
      : "";

  let toneDirective = "";
  if (tone === "social") {
    toneDirective = `\n\n[TONE FOCUS - SOCIAL & COMMUNITY]:
Prioritize X (Twitter), Reddit, and developer community engagement dynamics:
- "spoken": Craft a high-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter. Avoid robotic AI cliché words (e.g., NEVER use "delve", "testament", "tapestry", "revolutionize").
- "written": High-signal, structured technical insight. Concise, clear, and actionable.`;
  } else if (tone === "tech") {
    toneDirective = `\n\n[TONE FOCUS - TECHNICAL RIGOR]:
Prioritize RFC, Pull Request, and architectural documentation precision:
- "spoken": Direct, respectful engineering alignment (Slack huddles, technical triage).
- "written": High-precision Plain ${targetName} matching modern IETF RFC and open-source release notes.`;
  }

  const isArraySlots = Array.isArray(customSlots);
  const nonSourceSlots = isArraySlots
    ? (customSlots as SlotConfig[]).filter((s) => s.enabled && s.role !== "source")
    : [];
  const hasSpoken = isArraySlots && nonSourceSlots.some((s) => s.id === "spoken");
  const hasWritten = isArraySlots && nonSourceSlots.some((s) => s.id === "written");
  const isStandardDuality = !isArraySlots || (hasSpoken && hasWritten && nonSourceSlots.length <= 4);

  if (isStandardDuality) {
    const defaultSlots = LEGACY_SLOT_PRESETS.developer;
    const legacyConfig = !isArraySlots ? (customSlots as CustomSlotsConfig | undefined) : undefined;
    const spokenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "spoken") : undefined;
    const writtenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "written") : undefined;

    const defaultLocSlots = getDefaultSlots(normSource);
    const defaultSpokenInst = defaultLocSlots.find((s) => s.id === "spoken")?.instruction;
    const defaultWrittenInst = defaultLocSlots.find((s) => s.id === "written")?.instruction;

    const isCustomSpoken = spokenSlot?.instruction && spokenSlot.instruction !== defaultSpokenInst;
    const isCustomWritten = writtenSlot?.instruction && writtenSlot.instruction !== defaultWrittenInst;

    const slot1Name = isCustomSpoken
      ? spokenSlot!.label
      : legacyConfig?.slot1?.name || defaultSlots.slot1.name;
    const rawSlot1Instruction = isCustomSpoken
      ? spokenSlot!.instruction!
      : legacyConfig?.slot1?.instruction || defaultSlots.slot1.instruction;
    const slot1Instruction = interpolatePromptVariables(rawSlot1Instruction, {
      sourceLang,
      targetLang,
      explainLang: sourceLang,
    });

    const slot2Name = isCustomWritten
      ? writtenSlot!.label
      : legacyConfig?.slot2?.name || defaultSlots.slot2.name;
    const rawSlot2Instruction = isCustomWritten
      ? writtenSlot!.instruction!
      : legacyConfig?.slot2?.instruction || defaultSlots.slot2.instruction;
    const slot2Instruction = interpolatePromptVariables(rawSlot2Instruction, {
      sourceLang,
      targetLang,
      explainLang: sourceLang,
    });

    const jsonFormatHint = isLongInput
      ? `Strict JSON format:
{
  "summary": "1-sentence distilled core intent in native ${spec.name} (<= 25 words/chars); spoken & written must translate this condensed intent in <= 28 words each",
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}`
      : `Strict JSON format:
{
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}`;

    const systemHintList = Array.isArray(systemHint) ? systemHint : systemHint ? [systemHint] : [];
    const hintBlock =
      systemHintList.length > 0
        ? `\n\n[USER SPECIFIED MODE RULES - MANDATORY]:\n${systemHintList.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`
        : "";

    return `You are an elite bilingual developer language coach and senior software architect.
Task:
Translate the user's message from native ${spec.name} (language A) into TWO distinct authentic ${targetName} registers (Slot 1 and Slot 2), and provide the exact back-translation/nuance ${spec.meaningInstruction} for each register:
1. "spoken" (Slot 1: ${slot1Name}): ${slot1Instruction}
2. "spoken_meaning": The exact nuance and meaning of Slot 1 ${spec.meaningInstruction}.
3. "written" (Slot 2: ${slot2Name}): ${slot2Instruction}
4. "written_meaning": The exact nuance and meaning of Slot 2 ${spec.meaningInstruction}.
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Keep definitions concise ${spec.vocabInstruction}.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens. CRITICAL: NEVER expand, hallucinate, or fabricate file paths, UUIDs, or timestamps not explicitly in the user's input.
${condensationDirective}${contextDirective}${toneDirective}${hintBlock}${anchorBlock}${compileKillListInstruction(killList, globalKillList)}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }

  const enabledSlots = (customSlots as SlotConfig[]).filter((s) => s.enabled && s.role !== "source");
  const taskLines: string[] = [];
  const jsonProps: string[] = [];

  if (isLongInput) {
    jsonProps.push(
      `  "summary": "1-sentence distilled core intent in native ${spec.name} (<= 25 words/chars); spoken & written must translate this condensed intent in <= 28 words each"`
    );
  }

  enabledSlots.forEach((slot, idx) => {
    const num = idx + 1;
    const rawInstruction =
      slot.instruction || `Express the message in ${slot.label} style in authentic ${targetName}.`;
    const instruction = interpolatePromptVariables(rawInstruction, {
      sourceLang,
      targetLang,
      explainLang: explainLang || sourceLang,
    });
    taskLines.push(`${num}. "${slot.id}" (${slot.label}): ${instruction}`);
    jsonProps.push(`  "${slot.id}": "..."`);

    if (slot.showMeaning && slot.role !== "vocab") {
      taskLines.push(
        `${num}_meaning. "${slot.id}_meaning": The exact nuance and meaning of "${slot.id}" ${spec.meaningInstruction}.`
      );
      jsonProps.push(`  "${slot.id}_meaning": "..."`);
    }
  });

  const systemHintList = Array.isArray(systemHint) ? systemHint : systemHint ? [systemHint] : [];
  const hintBlock =
    systemHintList.length > 0
      ? `\n\n[USER SPECIFIED MODE RULES - MANDATORY]:\n${systemHintList.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`
      : "";

  const dynamicTasks = taskLines.join("\n");
  const dynamicJsonHint = `Strict JSON format:\n{\n${jsonProps.join(",\n")}\n}`;

  return `You are an elite multilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}${hintBlock}${anchorBlock}${compileKillListInstruction(killList, globalKillList)}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
}

export function buildDirectRewriteSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  learnInRewrite?: boolean;
  context?: string;
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const defaultTarget = normSource === "en" ? "ja" : "en";
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || defaultTarget,
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock =
    rules.length > 0
      ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Weave and enforce the following user-specified condition(s) directly into the rewritten prompt:
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
      : "";

  const contextBlock =
    options.context && options.context.trim()
      ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use this context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and anchor domain terminology. NEVER invent unmentioned requirements or copy unrelated code from the context.`
      : "";

  const learnBlock = options.learnInRewrite
    ? `\n5. **Companion Takeaway ("vocab")**: Also extract 2–3 high-value authentic English technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    : "";

  const jsonSchema = options.learnInRewrite
    ? `{\n  "prompt": "...",\n  "vocab": "term1 (...) · term2 (...)"\n}`
    : `{\n  "prompt": "..."\n}`;

  let anchorBlock = "";
  if (outLangName === "English") {
    anchorBlock = `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "刚才登录接口报500了，排查一下src/auth.ts里的token过期逻辑，别动数据库配置，改动尽量小"
  Output in ${outLangName}: "Diagnose and fix the 500 error on the login endpoint by inspecting the token expiration logic in \`src/auth.ts\`. Keep the diff minimal, leave unrelated code untouched, and do not modify any database configurations."
- Input: "把这个函数改成异步的，顺便跑一下测试确保别挂了"
  Output in ${outLangName}: "Refactor the function to be asynchronous while preserving its existing contract and behavior. Run the existing test suite to verify zero regressions."
- Input: "The login session drops on page refresh, check if cookie expiration in src/auth.ts is wrong, keep diff minimal"
  Output in ${outLangName}: "Inspect \`src/auth.ts\` to diagnose and fix session loss on page refresh, specifically checking cookie expiration settings while keeping the diff minimal and leaving unrelated code untouched."`;
  } else if (outLangName === "Japanese") {
    anchorBlock = `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "刚才登录接口报500了，排查一下src/auth.ts里的token过期逻辑，别动数据库配置，改动尽量小"
  Output in ${outLangName}: "ログインエンドポイントの500エラーを解消するため、\`src/auth.ts\`のトークン失効ロジックを調査・修正してください。差分は最小限にとどめ、関連のないコードやデータベース設定には一切触れないでください。"
- Input: "把这个函数改成异步的，顺便跑一下测试确保别挂了"
  Output in ${outLangName}: "既存の仕様および動作を維持したまま、この関数を非同期（async）にリファクタリングしてください。完了後は既存のテストを実行し、リグレッションがないことを確認してください。"`;
  }

  const isZhSource = normSource === "zh" || normSource === "tw";
  const verbExamples = isZhSource
    ? `"look into / check / 看看 / 排查" ➔ "Inspect" / "Diagnose" / "Trace"; "clean up / tweak / 改改 / 重构" ➔ "Refactor" / "Streamline" / "Harden"; "add / create / 加上 / 做个" ➔ "Implement" / "Scaffold" / "Wire up"; "remove / drop / 删掉" ➔ "Prune" / "Deprecate" / "Strip"; "fix / 搞好" ➔ "Fix" / "Resolve"`
    : `"look into / check" ➔ "Inspect" / "Diagnose" / "Trace"; "clean up / tweak" ➔ "Refactor" / "Streamline" / "Harden"; "add / create" ➔ "Implement" / "Scaffold" / "Wire up"; "remove / drop" ➔ "Prune" / "Deprecate" / "Strip"; "fix" ➔ "Fix" / "Resolve"`;

  return `You are an elite AI Coding Intent Compiler & Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Compile, structure, and optimize their input into a high-signal, unambiguous engineering prompt in **${outLangName}** that maximizes the AI agent's probability of one-shot success:
1. **Direct Imperative Opening & Objective Isolation**: Start immediately with an active imperative engineering verb. Accurately map vague conversational intents to sharp, specific engineering actions (e.g., ${verbExamples}). Clearly isolate the core technical objective and eliminate chatty conversational filler (e.g. NEVER use "Please help me", "As an AI, could you...", "I want to...").
2. **Defensive Blast Radius Guard & Negative Constraints**: When the user expresses or implies caution (e.g. "don't touch X", "keep diff minimal", "avoid regressions", "don't add heavy dependencies"), formalize them into explicit negative constraints (e.g., "Keep diff minimal; leave unrelated files and configurations untouched; do not add unrequested external dependencies").
3. **Pronoun & Anaphora Resolution**: If the user uses anaphoric pronouns ("here", "this function", "as discussed", "刚才说的"), resolve them cleanly using the provided context without hallucinating unmentioned file paths or inventing speculative requirements.
4. **Falsifiable Verification Anchor**: Where appropriate, frame the instruction with verifiable completion expectations (e.g. "Run existing tests to confirm zero regressions").
5. **100% Intent Fidelity (Zero Hallucination)**: Clarify logic and sharpen terminology in **${outLangName}**, but NEVER invent unmentioned file names, libraries, or speculative scaffolding.
6. **Code-Switch & CLI Flag Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators (e.g. \`@scope/pkg\`, \`@ts-expect-error\`), inline code (\`foo()\`), file paths (@file, path/to/file), and identifiers 100% verbatim. NEVER translate or alter CLI flags.${contextBlock}${learnBlock}${customRuleBlock}${compileKillListInstruction(undefined, DEFAULT_KILL_LIST)}
${anchorBlock ? `\n${anchorBlock}\n` : ""}
Strict JSON format:
${jsonSchema}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

export function buildPromptCandidatesSystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  promptRule?: string | string[];
  promptSlots?: PromptSlotConfig[];
  learnInRewrite?: boolean;
  context?: string;
  killList?: string[];
  globalKillList?: string[];
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const defaultTarget = normSource === "en" ? "ja" : "en";
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || defaultTarget,
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;

  const slots = (
    Array.isArray(options.promptSlots) && options.promptSlots.length > 0
      ? options.promptSlots
      : getDefaultPromptSlots(normSource)
  ).filter((s) => s.enabled !== false && s.role !== "source");

  const taskLines = slots.map((s, idx) => {
    const rawInstruction =
      s.instruction ||
      (s.role === "vocab"
        ? "Extract 2-3 high-value authentic technical expressions or collocations relevant to the input."
        : `Express the message in ${s.label} style in authentic ${outLangName}.`);
    const instruction = interpolatePromptVariables(rawInstruction, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || defaultTarget,
      explainLang: options.sourceLang || "en",
    });

    if (s.role === "vocab") {
      return `${idx + 1}. "${s.id}" (${s.label}): ${instruction} ${spec.vocabInstruction}`;
    }
    const hasCustomLangDirective =
      /target language|output in|日本語|中文|english|spanish|french|german|korean|russian|portuguese/i.test(
        instruction
      );
    const langSuffix = hasCustomLangDirective
      ? ""
      : ` (Default language: **${outLangName}** unless instruction specifies otherwise)`;
    return `${idx + 1}. "${s.id}" (${s.label}): ${instruction}${langSuffix}`;
  });

  const jsonProps: string[] = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });

  if (options.learnInRewrite && !slots.some((s) => s.role === "vocab")) {
    taskLines.push(
      `${slots.length + 1}. "vocab": Extract 2–3 high-value authentic technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) · term2 (meaning)\` ${spec.vocabInstruction}.`
    );
    jsonProps.push(`  "vocab": "term1 (...) · term2 (...)"`);
  }

  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock =
    rules.length > 0
      ? `\n\n[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified condition(s):
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`
      : "";

  const contextBlock =
    options.context && options.context.trim()
      ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use this context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed"), domain terminology, and explicit [REPO FILE ANCHORS] matching modules named by the user (preferring exact grounded file paths over generic module names). NEVER invent unmentioned requirements or unrelated files.`
      : "";

  return `You are an elite Bilingual Translation & Prompt Architect.
Transform the user's raw input into ${slots.length} distinct output slots strictly following each slot's specific instruction and target language:
${taskLines.join("\n")}

[STRICT QUALITY GUARDRAILS]:
- **100% Semantic Fidelity**: Translate or refine EVERY sentence, clause, and detail from the user's input from start to finish. NEVER summarize, truncate, or drop details unless a slot explicitly asks for condensation.
- **Respect Slot Role & Register**: If a slot asks for spoken/colloquial translation, output natural spoken flow; if it asks for formal/written translation, output polished written prose; if it asks for prompt structuring, compile clear objectives, isolate negative constraints (minimal diff, blast radius guard), and eliminate robotic AI filler.
- **Zero Hallucination**: Never invent unmentioned files, bug reports, or speculative features.
- **Code & Symbol Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators, inline code, file paths, and technical identifiers 100% verbatim in every slot.${contextBlock}${customRuleBlock}${compileKillListInstruction(options.killList, options.globalKillList)}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

export function buildModifySystemPrompt(options: {
  sourceLang?: string;
  targetLang?: string;
  promptLang?: string;
  explainLang?: string;
  customSlots?: PromptSlotConfig[];
  promptSlots?: PromptSlotConfig[];
  context?: string;
  killList?: string[];
  globalKillList?: string[];
  preserveCodeSwitching?: boolean;
  systemHint?: string | string[];
}): string {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (options.explainLang || normSource).toLowerCase().split("-")[0];
  const { code: outLangCode, name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "en",
    options.promptLang
  );
  const explainName = resolveLanguageName(expNorm);

  const explainLangDesc = `Explain each takeaway following the 3-Second Glanceability Rule strictly in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${explainName})'.`;

  let linguisticProfile = "";
  if (outLangCode === "zh" || outLangCode === "tw") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: CHINESE]:
- Eliminate awkward English-style stacked relative clauses.
- Trim redundant pronouns and restore natural Chinese subject-omission flow.
- Fix measure words and verb-object collocations.
- Distinguish pragmatic distance: use respectful honorifics vs natural peer flow.`;
  } else if (outLangCode === "ja") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: JAPANESE]:
- Fix particles (助詞: は, が, を, に, で) and natural verb-predicate dependencies.
- Maintain pragmatic consistency between casual team conversation and polite business context.`;
  } else if (outLangCode === "en") {
    linguisticProfile = `\n[TARGET-LANGUAGE LINGUISTIC PROFILE: ENGLISH]:
- Fix prepositions (websites/platforms take 'on': 'on X', 'on GitHub', 'on Slack'), articles ('a' vs 'an'), and verb tenses.
- Zero casing/punctuation nitpicking: do NOT obsess over casual lowercase letters ('l' vs 'L') or missing trailing periods.`;
  }

  const rawSlots = options.promptSlots || options.customSlots;
  const slots = (
    Array.isArray(rawSlots) && rawSlots.length > 0
      ? rawSlots
      : getDefaultModifySlots(options.sourceLang, options.explainLang)
  ).filter((s) => s.enabled !== false && s.role !== "source");

  const taskLines = slots.map((s, idx) => {
    const num = idx + 1;
    const rawInst =
      s.role === "vocab" || s.id === "fixes" ? s.instruction || explainLangDesc : s.instruction || "";
    const instruction = interpolatePromptVariables(rawInst, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || "en",
      explainLang: options.explainLang || expNorm,
    });
    return `${num}. "${s.id}" (${s.label}): ${instruction}`;
  });

  const jsonProps: string[] = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });

  const anchorBlock =
    outLangCode === "en"
      ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "this fucking bug happan again in X, it just suck so hard"
  Output: {
    "fixed": "this fucking bug happen again on X, it just sucks so hard",
    "native": "this fucking bug happened again on X, it honestly sucks so bad",
    "fixes": "happan ➔ happen · in X ➔ on X (platforms take on) · suck ➔ sucks"
  }`
      : "";

  const contextBlock =
    options.context && options.context.trim()
      ? `\n\n[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and domain terminology. NEVER invent unmentioned requirements or copy unrelated code.`
      : "";

  let codeSwitchingBlock = "";
  if (options.preserveCodeSwitching) {
    codeSwitchingBlock = `\n\n[CODE-SWITCHING PRESERVATION]:\nIf the user's input draft contains native ${options.sourceLang || "en"} words or expressions mixed in, seamlessly translate them into ${outLangName} in the fixed and native outputs, and explicitly record the translation in the takeaways ("fixes").`;
  }

  let systemHintBlock = "";
  if (options.systemHint) {
    const rawHints = Array.isArray(options.systemHint) ? options.systemHint : [options.systemHint];
    const hints = rawHints
      .map((h) =>
        interpolatePromptVariables(h, {
          sourceLang: options.sourceLang || "en",
          targetLang: options.targetLang || "en",
          explainLang: options.explainLang || expNorm,
        }).trim()
      )
      .filter(Boolean);
    if (hints.length > 0) {
      systemHintBlock = `\n\n[USER SPECIFIED MODE RULES - MANDATORY]:\n${hints.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`;
    }
  }

  return `You are an elite Developer Language Editor and Real-Time Proofreader.
The user is writing directly in ${outLangName}, but their draft may contain fast typing slips, grammatical errors, wrong prepositions, or non-native phrasing.
Perform proofreading according to the following tasks:
${taskLines.join("\n")}

[CRITICAL PROOFREADING RULES]:
- **Zero Level Leap (i+1 Rule)**: Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose.
- **Zero Tone Sanitization**: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')—passion and emotional heat are natural and MUST be preserved 100%!
- **Zero Punctuation/Casing Nitpicking**: Do NOT obsess over casual casing or missing periods.
- 100% preserve user's original words, rhythm, and cadence!${linguisticProfile}${contextBlock}
${anchorBlock ? `\n${anchorBlock}\n` : ""}${codeSwitchingBlock}${systemHintBlock}${compileKillListInstruction(options.killList, options.globalKillList)}
Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
