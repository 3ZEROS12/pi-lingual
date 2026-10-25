import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SEED_NAMES } from "./presets.js";
import { truncateVisual } from "./layout.js";

export const CURRENT_FEATURE_BANNER_VERSION = "0.7.0";

export interface ModeDisplaySpec {
  companion: string;
  direct: string;
  candidates: string;
  modify: string;
  off: string;
  notifyOff: (pair: string) => string;
}

const MODE_DISPLAY_BY_LANG: Record<string, ModeDisplaySpec> = {
  zh: {
    companion: SEED_NAMES.zh.companion,
    direct: SEED_NAMES.zh.direct,
    candidates: SEED_NAMES.zh.candidates,
    modify: SEED_NAMES.zh.liveFlow,
    off: "已关闭",
    notifyOff: (p) => `[${p}] 已切换至【0 已关闭 (off)】：底栏隐藏 · 监听已卸 · 0 Token 零负担`,
  },
  tw: {
    companion: SEED_NAMES.tw.companion,
    direct: SEED_NAMES.tw.direct,
    candidates: SEED_NAMES.tw.candidates,
    modify: SEED_NAMES.tw.liveFlow,
    off: "已關閉",
    notifyOff: (p) => `[${p}] 已切換至【0 已關閉 (off)】：底欄隱藏 · 監聽已卸 · 0 Token 零負擔`,
  },
  ja: {
    companion: SEED_NAMES.ja.companion,
    direct: SEED_NAMES.ja.direct,
    candidates: SEED_NAMES.ja.candidates,
    modify: SEED_NAMES.ja.liveFlow,
    off: "オフ",
    notifyOff: (p) => `[${p}] 【0 オフ (off)】：下部バー非表示・監視停止・0 Token 無負荷`,
  },
  ko: {
    companion: SEED_NAMES.ko.companion,
    direct: SEED_NAMES.ko.direct,
    candidates: SEED_NAMES.ko.candidates,
    modify: SEED_NAMES.ko.liveFlow,
    off: "꺼짐",
    notifyOff: (p) => `[${p}] 【0 꺼짐 (off)】：상태 숨김 · 리스너 분리 · 0 토큰`,
  },
  es: {
    companion: SEED_NAMES.es.companion,
    direct: SEED_NAMES.es.direct,
    candidates: SEED_NAMES.es.candidates,
    modify: SEED_NAMES.es.liveFlow,
    off: "Apagado",
    notifyOff: (p) => `[${p}] Cambiado a [0 Apagado]: Estado oculto · 0 tokens`,
  },
  fr: {
    companion: SEED_NAMES.fr.companion,
    direct: SEED_NAMES.fr.direct,
    candidates: SEED_NAMES.fr.candidates,
    modify: SEED_NAMES.fr.liveFlow,
    off: "Désactivé",
    notifyOff: (p) => `[${p}] Passé en mode [0 Désactivé] : Statut masqué · 0 tokens`,
  },
  de: {
    companion: SEED_NAMES.de.companion,
    direct: SEED_NAMES.de.direct,
    candidates: SEED_NAMES.de.candidates,
    modify: SEED_NAMES.de.liveFlow,
    off: "Aus",
    notifyOff: (p) => `[${p}] Gewechselt zu [0 Aus]: Status ausgeblendet · 0 Tokens`,
  },
  ru: {
    companion: SEED_NAMES.ru.companion,
    direct: SEED_NAMES.ru.direct,
    candidates: SEED_NAMES.ru.candidates,
    modify: SEED_NAMES.ru.liveFlow,
    off: "Выкл",
    notifyOff: (p) => `[${p}] Переключено в режим [0 Выкл]: скрыт статус · 0 токенов`,
  },
  en: {
    companion: SEED_NAMES.en.companion,
    direct: SEED_NAMES.en.direct,
    candidates: SEED_NAMES.en.candidates,
    modify: SEED_NAMES.en.liveFlow,
    off: "Off",
    notifyOff: (p) => `[${p}] Switched to [0 Off] mode: Status hidden · listeners detached · 0 tokens`,
  },
};

export function resolveModeDisplaySpec(sourceLang = "en"): ModeDisplaySpec {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  return MODE_DISPLAY_BY_LANG[norm] || MODE_DISPLAY_BY_LANG.en;
}

/** Normalizes POSIX/BCP-47 locale tags (zh_TW.UTF-8, zh-Hant-TW) into a comparable dashed form. */
function normalizeLocaleTag(raw: string): string {
  return (raw || "").toLowerCase().replace(/_/g, "-").split(".")[0];
}

function isTraditionalChineseLocale(tag: string): boolean {
  return (
    tag.startsWith("zh-tw") ||
    tag.startsWith("zh-hk") ||
    tag.startsWith("zh-hant") ||
    tag === "zh-mo"
  );
}

export function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string {
  const supported = new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);

  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    return supported.has(clean) ? clean : "en";
  }

  if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
    for (let i = sessionEntries.length - 1; i >= 0; i--) {
      const e = sessionEntries[i];
      if (e?.type === "message" && e?.message?.role === "user") {
        const text = Array.isArray(e.message.content)
          ? e.message.content.map((c: any) => c?.text || "").join(" ")
          : String(e.message.content || "");
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
        if (/[\uac00-\ud7af]/.test(text)) return "ko";
        if (/[\u0400-\u04ff]/.test(text)) return "ru";
        if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
      }
    }
  }

  try {
    const i18nFile = path.join(os.homedir(), ".config", "rpiv-i18n", "config.json");
    if (fs.existsSync(i18nFile)) {
      const raw = JSON.parse(fs.readFileSync(i18nFile, "utf8"));
      const loc = normalizeLocaleTag(String(raw?.locale || raw?.lang || ""));
      if (isTraditionalChineseLocale(loc)) return "tw";
      const prefix = loc.split("-")[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {}

  try {
    const envLocale = normalizeLocaleTag(
      process.env.LC_ALL ||
        process.env.LANGUAGE ||
        process.env.LANG ||
        Intl.DateTimeFormat().resolvedOptions().locale ||
        "en"
    );
    if (isTraditionalChineseLocale(envLocale)) return "tw";
    const prefix = envLocale.split("-")[0];
    if (supported.has(prefix)) return prefix;
  } catch {}

  return "en";
}

interface BannerSpec {
  title: string;
  subtitle: string;
  rows: [string, string, string, string, string, string];
}

export interface SelectPromptSpec {
  title: string;
  keepOrig: string;
  hint: string;
}

export function resolveSelectPrompts(lang = "en", candidatesCount = 3): SelectPromptSpec {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const selectPrompts: Record<string, SelectPromptSpec> = {
    zh: {
      title: "✦ 挑候选发送",
      keepOrig: "原话直发",
      hint: `按数字 1-${candidatesCount} 直接发出 · ←→/↑↓ 切换 Enter 确认 · 0/Esc 发原话`,
    },
    tw: {
      title: "✦ 挑候選發送",
      keepOrig: "原話直發",
      hint: `按數字 1-${candidatesCount} 直接發出 · ←→/↑↓ 切換 Enter 確認 · 0/Esc 發原話`,
    },
    ja: {
      title: "✦ 候補を選んで送信",
      keepOrig: "原文のまま",
      hint: `数字 1-${candidatesCount} で即送信 · ←→/↑↓ 選択 Enter 確定 · 0/Esc 原文送信`,
    },
    ko: {
      title: "✦ 후보 선택 전송",
      keepOrig: "원문 전송",
      hint: `숫자 1-${candidatesCount} 즉시 전송 · ←→/↑↓ Enter 확인 · 0/Esc 원문 전송`,
    },
    es: {
      title: "✦ Elegir candidato",
      keepOrig: "Texto original",
      hint: `1-${candidatesCount} enviar · ←→/↑↓ Enter confirmar · 0/Esc original`,
    },
    fr: {
      title: "✦ Choisir une variante",
      keepOrig: "Texte original",
      hint: `1-${candidatesCount} envoyer · ←→/↑↓ Entrée valider · 0/Esc original`,
    },
    de: {
      title: "✦ Variante wählen",
      keepOrig: "Originaltext",
      hint: `1-${candidatesCount} senden · ←→/↑↓ Eingabe bestätigen · 0/Esc Original`,
    },
    ru: {
      title: "✦ Выбор варианта",
      keepOrig: "Исходный текст",
      hint: `1-${candidatesCount} отправить · ←→/↑↓ Enter подтвердить · 0/Esc исходный`,
    },
    en: {
      title: "✦ Pick candidate",
      keepOrig: "Send original",
      hint: `1-${candidatesCount} send · ←→/↑↓ Enter · 0/Esc original`,
    },
  };
  return selectPrompts[norm] || selectPrompts.en;
}

export function formatReleaseBannerLines(
  sourceLang = "en",
  maxCols = 80,
  fg: (color: string, text: string) => string = (_c, t) => t
): string[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  // Strictly honor live column budget on narrow viewports without artificial inflation
  const effectiveCols = typeof maxCols === "number" && maxCols > 0 ? maxCols : 80;

  const copyByLang: Record<string, BannerSpec> = {
    zh: {
      title: "· [pi-lingual v0.7.0] 三核出厂：伴学 · 规范直发 · 实战狂飙",
      subtitle: "│ 在 AI 生成的 5-15 秒间隙顺手捡语感；提示词始终纯净英文",
      rows: [
        "┌ [定制中心 · Tuner] 敲 /tuner 跟 AI 说话，随意增删改模式",
        "│   (4 大配装就绪：spec 压铸 · commit 脱水 · oss 对线 · yap 发推)",
        "├ [1 纯伴学 · companion] 中文原样直发；上方浮出双语对照卡",
        "├ [2 规范直发 · direct] 敲中文，0ms 转成规范英文工程指令",
        "├ [3 实战狂飙 · live-flow] 打英文；只修错词，粗口情绪 100% 保留",
        "└   (/lingual 1|2|3 按注册表顺序；/lingual <id> 永远有效)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.7.0] 三核出廠：純伴學 · 規範直發 · 實戰狂飆",
      subtitle: "│ 在 AI 生成的 5-15 秒間隙順手撿語感；提示詞始終純淨英文",
      rows: [
        "┌ [定製中心 · Tuner] 敲 /tuner 跟 AI 說話，隨意增刪改模式",
        "│   (4 大配裝就緒：spec 壓鑄 · commit 脫水 · oss 對線 · yap 發推)",
        "├ [1 純伴學 · companion] 中文原樣直發；上方浮出雙語對照卡",
        "├ [2 規範直發 · direct] 敲中文，0ms 轉成規範英文工程指令",
        "├ [3 實戰狂飆 · live-flow] 打英文；只修錯詞，粗口情緒 100% 保留",
        "└   (/lingual 1|2|3 按註冊表順序；/lingual <id> 永遠有效)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.7.0] 3コア：伴走 · 仕様直行 · 実戦疾走",
      subtitle: "│ AI 生成の 5-15 秒に語感を拾う；プロンプトは常に純英語",
      rows: [
        "┌ [設計センター · Tuner] /tuner で AI と対話しモードを編集",
        "│   (4大レシピ：spec 圧縮 · commit 脱水 · oss 対論 · yap 投稿)",
        "├ [1 伴走 · companion] 母語をそのまま送信；上部に二言語カード",
        "├ [2 仕様直行 · direct] 0ms で母語 ➔ 規範的な英語仕様に整形",
        "├ [3 実戦疾走 · live-flow] 英語入力；誤字のみ修正、感情は保持",
        "└   (/lingual 1|2|3 は登録順；/lingual <id> は常に有効)",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.7.0] 3코어: 동행학습 · 논리정제 · 실전질주",
      subtitle: "│ AI 생성 5-15초에 어감을 줍는다; 프롬프트는 순수 영어",
      rows: [
        "┌ [설계 센터 · Tuner] /tuner 로 AI 와 모드를 편집",
        "│   (4대 레시피: spec · commit · oss · yap)",
        "├ [1 동행학습 · companion] 모국어 원문 전송; 이중언어 카드",
        "├ [2 논리정제 · direct] 0ms 로 모국어 ➔ 규격 영어 사양",
        "├ [3 실전질주 · live-flow] 영어 입력; 오타만 수정, 감정 유지",
        "└   (/lingual 1|2|3 은 등록 순서; /lingual <id> 는 항상 유효)",
      ],
    },
    es: {
      title: "· [pi-lingual v0.7.0] Tres núcleos: Compañero · Directo · Live Flow",
      subtitle: "│ Aprovecha los 5-15 s; tu prompt siempre en inglés limpio",
      rows: [
        "┌ [Centro Tuner] /tuner para crear o editar modos con AI",
        "│   (4 recetas: spec · commit · oss · yap)",
        "├ [1 Aprendizaje · companion] Idioma nativo intacto; tarjeta arriba",
        "├ [2 Directo Lógico · direct] 0ms nativo ➔ especificación inglesa",
        "├ [3 Flujo en Vivo · live-flow] Escribe en inglés; solo corrige erratas",
        "└   (/lingual 1|2|3 por registro; /lingual <id> siempre funciona)",
      ],
    },
    fr: {
      title: "· [pi-lingual v0.7.0] Trois cœurs : Compagnon · Direct · Live Flow",
      subtitle: "│ Profitez des 5-15 s ; prompt toujours en anglais propre",
      rows: [
        "┌ [Centre Tuner]   Tapez /tuner pour créer ou modifier des modes",
        "│   (4 recettes : spec · commit · oss · yap)",
        "├ [1 Compagnon · companion] Langue native brute ; carte au-dessus",
        "├ [2 Direct Logique · direct] 0ms natif ➔ spec anglaise structurée",
        "├ [3 Flux en Direct · live-flow] Tapez en anglais ; seules fautes fixées",
        "└   (/lingual 1|2|3 selon registre ; /lingual <id> marche toujours)",
      ],
    },
    de: {
      title: "· [pi-lingual v0.7.0] Drei Kerne: Begleitung · Logik · Live Flow",
      subtitle: "│ Nutze die 5-15 s; Prompt bleibt klares Englisch",
      rows: [
        "┌ [Tuner-Zentrale]  /tuner für Modi im Gespräch",
        "│   (4 Rezepte: spec · commit · oss · yap)",
        "├ [1 Begleitung · companion] Muttersprache roh; Karte darüber",
        "├ [2 Direkte Logik · direct] 0ms nativ ➔ englische Spezifikation",
        "├ [3 Live-Fluss · live-flow] Englisch tippen; nur Fehler korrigiert",
        "└   (/lingual 1|2|3 nach Registry; /lingual <id> löst immer auf)",
      ],
    },
    ru: {
      title: "· [pi-lingual v0.7.0] Три ядра: Сопровождение · Логика · Live Flow",
      subtitle: "│ Ловите язык в паузе 5-15 с; промпт — чистый английский",
      rows: [
        "┌ [Центр Tuner]    /tuner — правьте режимы в диалоге",
        "│   (4 рецепта: spec · commit · oss · yap)",
        "├ [1 Сопровождение · companion] Родной текст как есть; карточка",
        "├ [2 Прямой поток · direct] 0ms родной ➔ англ. спецификация",
        "├ [3 Живой поток · live-flow] English-ввод; правятся только опечатки",
        "└   (/lingual 1|2|3 по реестру; /lingual <id> всегда работает)",
      ],
    },
    en: {
      title: "· [pi-lingual v0.7.0] Three cores: Companion · Spec · Live Flow",
      subtitle: "│ Catch phrasing in the 5-15 s gap; prompts stay clean English",
      rows: [
        "┌ [Architect Tuner] Run /tuner to add or edit modes with AI",
        "│   (4 tactical loadouts: spec · commit · oss · yap)",
        "├ [1 Companion · companion] Native text sent raw; card above",
        "├ [2 Logical Spec · direct] 0ms native ➔ imperative English spec",
        "├ [3 Live Flow · live-flow] Draft English; only typos fixed, tone kept",
        "└   (/lingual 1|2|3 = registry order; /lingual <id> always works)",
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}
