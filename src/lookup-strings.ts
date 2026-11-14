/**
 * Localized copy for the lookup popup and its command.
 *
 * Kept next to the feature instead of in the i18n label table: the lookup
 * surface is small, and every supported language gets its own strings so the
 * Language Surface Parity invariant holds even when `sourceLang !== "zh"`.
 */

export interface LookupStrings {
  title: string;
  loading: string;
  dismiss: (seconds: number) => string;
  timeout: string;
  unavailable: string;
  enabled: string;
  disabled: string;
  usage: string;
  provider: (name: string) => string;
  systemPrompt: (languageName: string) => string;
}

interface LookupStringTable {
  title: string;
  loading: string;
  dismissZero: string;
  dismissWithSeconds: (seconds: number) => string;
  timeout: string;
  unavailable: string;
  enabled: string;
  disabled: string;
  usage: string;
  provider: (name: string) => string;
}

const ENGLISH_PROMPT = (languageName: string): string =>
  [
    `You translate a short selection from a terminal transcript into ${languageName}.`,
    "Reply with the translation only: no preamble, no quotes, no markdown, at most three lines.",
    "For a single word, start with the phonetic transcription in slashes when you are confident of it,",
    'then give the main senses separated by "；", each tagged with its part of speech.',
    "For a phrase or a sentence, give one natural translation.",
  ].join(" ");

const TABLE: Record<string, LookupStringTable> = {
  en: {
    title: "Lookup",
    loading: "looking up…",
    dismissZero: "click to close",
    dismissWithSeconds: (s) => `click to close · ${s}s`,
    timeout: "lookup timed out",
    unavailable: "this pi build does not copy through the fullscreen renderer, so double-click lookup is off",
    enabled: "lookup popup on",
    disabled: "lookup popup off",
    usage: "usage: /lingual lookup [on|off|google|model|status|<text>]",
    provider: (name) => `lookup provider: ${name}`,
  },
  zh: {
    title: "查词",
    loading: "查询中…",
    dismissZero: "点击关闭",
    dismissWithSeconds: (s) => `点击关闭 · ${s}s`,
    timeout: "查询超时",
    unavailable: "此 pi 版本的全屏渲染器不暴露复制回调，双击查词不可用",
    enabled: "双击查词已开启",
    disabled: "双击查词已关闭",
    usage: "用法：/lingual lookup [on|off|google|model|status|<文本>]",
    provider: (name) => `查词通道：${name}`,
  },
  tw: {
    title: "查詞",
    loading: "查詢中…",
    dismissZero: "點擊關閉",
    dismissWithSeconds: (s) => `點擊關閉 · ${s}s`,
    timeout: "查詢逾時",
    unavailable: "此 pi 版本的全螢幕渲染器不暴露複製回呼，雙擊查詞不可用",
    enabled: "雙擊查詞已開啟",
    disabled: "雙擊查詞已關閉",
    usage: "用法：/lingual lookup [on|off|google|model|status|<文字>]",
    provider: (name) => `查詞通道：${name}`,
  },
  ja: {
    title: "辞書",
    loading: "検索中…",
    dismissZero: "クリックで閉じる",
    dismissWithSeconds: (s) => `クリックで閉じる · ${s}s`,
    timeout: "検索がタイムアウトしました",
    unavailable: "この pi ビルドの全画面レンダラーはコピーコールバックを公開しないため、ダブルクリック検索は使えません",
    enabled: "ダブルクリック検索を有効化",
    disabled: "ダブルクリック検索を無効化",
    usage: "使い方: /lingual lookup [on|off|google|model|status|<テキスト>]",
    provider: (name) => `検索プロバイダー: ${name}`,
  },
  ko: {
    title: "단어 찾기",
    loading: "검색 중…",
    dismissZero: "클릭하여 닫기",
    dismissWithSeconds: (s) => `클릭하여 닫기 · ${s}s`,
    timeout: "검색 시간 초과",
    unavailable: "이 pi 빌드의 전체 화면 렌더러는 복사 콜백을 노출하지 않아 더블클릭 검색을 쓸 수 없습니다",
    enabled: "더블클릭 검색 켜짐",
    disabled: "더블클릭 검색 꺼짐",
    usage: "사용법: /lingual lookup [on|off|google|model|status|<텍스트>]",
    provider: (name) => `검색 제공자: ${name}`,
  },
  es: {
    title: "Consulta",
    loading: "consultando…",
    dismissZero: "clic para cerrar",
    dismissWithSeconds: (s) => `clic para cerrar · ${s}s`,
    timeout: "la consulta expiró",
    unavailable: "esta versión de pi no expone la copia del renderizador a pantalla completa, así que la consulta por doble clic está desactivada",
    enabled: "consulta por doble clic activada",
    disabled: "consulta por doble clic desactivada",
    usage: "uso: /lingual lookup [on|off|google|model|status|<texto>]",
    provider: (name) => `proveedor de consulta: ${name}`,
  },
  fr: {
    title: "Consultation",
    loading: "recherche…",
    dismissZero: "cliquer pour fermer",
    dismissWithSeconds: (s) => `cliquer pour fermer · ${s}s`,
    timeout: "la recherche a expiré",
    unavailable: "cette version de pi n'expose pas la copie du rendu plein écran, la recherche par double-clic est désactivée",
    enabled: "recherche par double-clic activée",
    disabled: "recherche par double-clic désactivée",
    usage: "usage : /lingual lookup [on|off|google|model|status|<texte>]",
    provider: (name) => `service de recherche : ${name}`,
  },
  de: {
    title: "Nachschlagen",
    loading: "suche…",
    dismissZero: "klicken zum Schließen",
    dismissWithSeconds: (s) => `klicken zum Schließen · ${s}s`,
    timeout: "Zeitüberschreitung beim Nachschlagen",
    unavailable: "diese pi-Version gibt den Kopier-Callback des Vollbild-Renderers nicht frei, Doppelklick-Suche ist aus",
    enabled: "Doppelklick-Suche an",
    disabled: "Doppelklick-Suche aus",
    usage: "Nutzung: /lingual lookup [on|off|google|model|status|<Text>]",
    provider: (name) => `Suchdienst: ${name}`,
  },
  ru: {
    title: "Поиск",
    loading: "поиск…",
    dismissZero: "нажмите, чтобы закрыть",
    dismissWithSeconds: (s) => `нажмите, чтобы закрыть · ${s}s`,
    timeout: "время поиска истекло",
    unavailable: "эта сборка pi не отдаёт колбэк копирования полноэкранного рендерера, поиск по двойному клику отключён",
    enabled: "поиск по двойному клику включён",
    disabled: "поиск по двойному клику отключён",
    usage: "использование: /lingual lookup [on|off|google|model|status|<текст>]",
    provider: (name) => `сервис поиска: ${name}`,
  },
};

/** The language names a prompt can use in its own script; an English name reads wrong inside a native-language instruction. */
const NATIVE_LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  zh: "简体中文",
  tw: "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "español",
  fr: "français",
  de: "Deutsch",
  ru: "русский",
};

const SYSTEM_PROMPTS: Record<string, (languageName: string) => string> = {
  zh: (name) =>
    `把终端记录里选中的一小段文字翻译成${name}。只输出译文本身：不要开场白、不要引号、不要 markdown，最多三行。` +
    "如果是单个单词，先给出你有把握的音标（用斜杠包裹），再用“；”分隔按词性标注主要义项。" +
    "如果是短语或句子，给出一条自然译文。",
  tw: (name) =>
    `把終端記錄中選取的一小段文字翻譯成${name}。只輸出譯文本身：不要開場白、不要引號、不要 markdown，最多三行。` +
    "如果是單個單詞，先給出你有把握的音標（用斜線包裹），再用「；」分隔按詞性標註主要義項。" +
    "如果是片語或句子，給出一條自然譯文。",
  ja: (name) =>
    `ターミナル履歴で選択された短いテキストを${name}に翻訳してください。訳文だけを出力し、前置き・引用符・markdown は使わず、最大3行までにしてください。` +
    "単語の場合は、確信があるときだけ発音記号をスラッシュで囲んで先に示し、その後、品詞タグ付きの主な語義を「；」で区切って示してください。" +
    "句や文の場合は、自然な訳文を1つ示してください。",
  ko: (name) =>
    `터미널 기록에서 선택한 짧은 텍스트를 ${name}(으)로 번역하세요. 번역문만 출력하고, 서두·따옴표·markdown 없이 최대 세 줄로 작성하세요.` +
    "단어라면 확실할 때 발음 기호를 슬래시로 감싸 먼저 제시하고, 그다음 품사 표기가 붙은 주요 뜻을 '；'로 구분해 제시하세요." +
    "구나 문장이라면 자연스러운 번역 하나를 제시하세요.",
  es: (name) =>
    `Traduce al ${name} una selección breve del historial de la terminal. Responde solo con la traducción: sin preámbulo, sin comillas, sin markdown, como máximo tres líneas.` +
    " Si es una sola palabra, empieza por la transcripción fonética entre barras cuando estés seguro y después da las acepciones principales separadas por «；», cada una con su categoría gramatical." +
    " Si es una frase o una oración, da una traducción natural.",
  fr: (name) =>
    `Traduis en ${name} une courte sélection de l'historique du terminal. Réponds uniquement par la traduction : sans préambule, sans guillemets, sans markdown, trois lignes maximum.` +
    " S'il s'agit d'un mot, commence par la transcription phonétique entre barres quand tu en es sûr, puis donne les sens principaux séparés par « ; », chacun étiqueté par sa nature grammaticale." +
    " S'il s'agit d'une expression ou d'une phrase, donne une traduction naturelle.",
  de: (name) =>
    `Übersetze eine kurze Auswahl aus dem Terminalverlauf ins ${name}. Antworte nur mit der Übersetzung: keine Einleitung, keine Anführungszeichen, kein Markdown, höchstens drei Zeilen.` +
    ' Bei einem einzelnen Wort beginne mit der Lautschrift in Schrägstrichen, wenn du sicher bist, und gib danach die Hauptbedeutungen durch "；" getrennt an, jeweils mit Wortart.' +
    " Bei einer Wendung oder einem Satz gib eine natürliche Übersetzung.",
  ru: (name) =>
    `Переведи короткий фрагмент из истории терминала на ${name}. Отвечай только переводом: без вступления, без кавычек, без markdown, не более трёх строк.` +
    " Если это одно слово, сначала дай транскрипцию в косых чертах, если уверен, затем основные значения через «；» с указанием части речи." +
    " Если это фраза или предложение, дай один естественный перевод.",
};

export function resolveLookupStrings(lang: string): LookupStrings {
  const norm = (lang || "en").toLowerCase().split(/[-_]/)[0];
  const table = TABLE[norm] || TABLE.en;
  const prompt = SYSTEM_PROMPTS[norm] || ENGLISH_PROMPT;
  const selfName = NATIVE_LANGUAGE_NAME[norm];
  return {
    title: table.title,
    loading: table.loading,
    dismiss: (seconds) => (seconds > 0 ? table.dismissWithSeconds(seconds) : table.dismissZero),
    timeout: table.timeout,
    unavailable: table.unavailable,
    enabled: table.enabled,
    disabled: table.disabled,
    usage: table.usage,
    provider: table.provider,
    systemPrompt: (languageName) => prompt(selfName || languageName),
  };
}
