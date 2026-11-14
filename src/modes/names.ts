import type { CustomModeConfig } from "../types.js";
import { localizeSlotLabel } from "../prompts.js";

export interface SeedNames {
  companion: string;
  direct: string;
  liveFlow: string;
  candidates: string;
  loadoutSpec: string;
  loadoutCommit: string;
  loadoutOss: string;
  loadoutYap: string;
  vocab: string;
  fixed: string;
  native: string;
  takeaway: string;
}

export const SEED_NAMES: Record<string, SeedNames> = {
  en: {
    companion: "Companion",
    direct: "Logical Spec",
    liveFlow: "Live Flow",
    candidates: "Candidates",
    loadoutSpec: "Brain-Dump Spec",
    loadoutCommit: "Commit Dehydrator",
    loadoutOss: "OSS Peer Comms",
    loadoutYap: "Indie Shipper",
    vocab: "Key Terms",
    fixed: "Fixed",
    native: "Native",
    takeaway: "Takeaways",
  },
  zh: {
    companion: "纯伴学",
    direct: "规范直发",
    liveFlow: "实战狂飙",
    candidates: "挑候选",
    loadoutSpec: "脑暴压铸",
    loadoutCommit: "提交脱水",
    loadoutOss: "开源对线",
    loadoutYap: "极客发推",
    vocab: "核心表达",
    fixed: "原句修补",
    native: "地道表达",
    takeaway: "收获复盘",
  },
  tw: {
    companion: "純伴學",
    direct: "規範直發",
    liveFlow: "實戰狂飆",
    candidates: "挑候選",
    loadoutSpec: "腦暴壓鑄",
    loadoutCommit: "提交脫水",
    loadoutOss: "開源對線",
    loadoutYap: "極客發推",
    vocab: "核心表達",
    fixed: "原句修補",
    native: "道地表達",
    takeaway: "收穫複盤",
  },
  ja: {
    companion: "伴走",
    direct: "仕様直行",
    liveFlow: "実戦疾走",
    candidates: "候補選択",
    loadoutSpec: "仕様鋳造",
    loadoutCommit: "コミット脱水",
    loadoutOss: "OSS対話",
    loadoutYap: "発信投稿",
    vocab: "重要語彙",
    fixed: "原文修正",
    native: "自然表現",
    takeaway: "重要ポイント",
  },
  ko: {
    companion: "동행학습",
    direct: "논리정제",
    liveFlow: "실전질주",
    candidates: "후보선택",
    loadoutSpec: "사양주조",
    loadoutCommit: "커밋정제",
    loadoutOss: "OSS대화",
    loadoutYap: "개발자발신",
    vocab: "핵심어휘",
    fixed: "원문수정",
    native: "자연스러운표현",
    takeaway: "핵심포인트",
  },
  es: {
    companion: "Aprendizaje",
    direct: "Directo Lógico",
    liveFlow: "Flujo en Vivo",
    candidates: "Candidatos",
    loadoutSpec: "Spec Lógica",
    loadoutCommit: "Commit Deshidratado",
    loadoutOss: "OSS Comms",
    loadoutYap: "Post Indie",
    vocab: "Términos clave",
    fixed: "Corregido",
    native: "Nativo",
    takeaway: "Puntos clave",
  },
  fr: {
    companion: "Compagnon",
    direct: "Direct Logique",
    liveFlow: "Flux en Direct",
    candidates: "Candidats",
    loadoutSpec: "Spécification",
    loadoutCommit: "Commit Épuré",
    loadoutOss: "Comms OSS",
    loadoutYap: "Post Indie",
    vocab: "Termes clés",
    fixed: "Corrigé",
    native: "Naturel",
    takeaway: "Points clés",
  },
  de: {
    companion: "Begleitung",
    direct: "Direkte Logik",
    liveFlow: "Live-Fluss",
    candidates: "Kandidaten",
    loadoutSpec: "Spezifikation",
    loadoutCommit: "Commit-Kompakt",
    loadoutOss: "OSS-Dialog",
    loadoutYap: "Indie-Post",
    vocab: "Schlüsselbegriffe",
    fixed: "Korrigiert",
    native: "Nativ",
    takeaway: "Wichtige Punkte",
  },
  ru: {
    companion: "Сопровождение",
    direct: "Прямой поток",
    liveFlow: "Живой поток",
    candidates: "Кандидаты",
    loadoutSpec: "Спецификация",
    loadoutCommit: "Коммит-дехидрат",
    loadoutOss: "OSS-диалог",
    loadoutYap: "Инди-пост",
    vocab: "Ключевые слова",
    fixed: "Исправлено",
    native: "Нативный",
    takeaway: "Главное",
  },
};

export function resolveSeedNames(lang = "en"): SeedNames {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SEED_NAMES[norm] || SEED_NAMES.en;
}

export function resolveModeDisplayName(modeId: string, lang = "en"): string {
  const n = resolveSeedNames(lang);
  const norm = (modeId || "").toLowerCase();
  switch (norm) {
    case "companion":
    case "original":
      return n.companion;
    case "direct":
    case "lazy":
    case "english":
      return n.direct;
    case "live-flow":
    case "modify":
    case "raw":
      return n.liveFlow;
    case "candidates":
    case "select":
      return n.candidates;
    case "off": {
      const OFF_MAP: Record<string, string> = {
        zh: "已关闭",
        tw: "已關閉",
        ja: "オフ",
        ko: "꺼짐",
        es: "Apagado",
        fr: "Désactivé",
        de: "Aus",
        ru: "Выкл",
        en: "Off",
      };
      const normLang = (lang || "en").toLowerCase().split("-")[0];
      return OFF_MAP[normLang] || OFF_MAP.en;
    }
    default:
      return modeId;
  }
}

export function localizeModeName(modeId: string, currentName: string, sourceLang = "en"): string {
  const isChineseSource = sourceLang === "zh" || sourceLang === "tw";
  const hasChinese = /[\u4e00-\u9fa5]/.test(currentName || "");
  const normId = (modeId || "").toLowerCase();

  if (!isChineseSource && (hasChinese || !currentName)) {
    return resolveModeDisplayName(normId, sourceLang);
  }

  if (
    !isChineseSource &&
    (normId === "companion" ||
      normId === "original" ||
      normId === "direct" ||
      normId === "live-flow" ||
      normId === "off" ||
      normId === "candidates")
  ) {
    return resolveModeDisplayName(normId, sourceLang);
  }

  return currentName || resolveModeDisplayName(normId, sourceLang);
}

export function localizeModes(
  modes: CustomModeConfig[],
  sourceLang = "en",
  _explainLang?: string
): CustomModeConfig[] {
  return modes.map((m) => {
    const localizedName = localizeModeName(m.id, m.name, sourceLang);
    const localizedSlots = Array.isArray(m.slots)
      ? m.slots.map((s) => ({
          ...s,
          label: localizeSlotLabel(s.id, s.label, sourceLang),
        }))
      : [];

    return {
      ...m,
      name: localizedName,
      slots: localizedSlots,
    };
  });
}
