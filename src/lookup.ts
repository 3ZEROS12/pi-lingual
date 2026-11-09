/**
 * Word lookup for copied selections.
 *
 * A double-click in the fullscreen transcript is a different request from a
 * prompt: it is one word or a short phrase the reader wants translated into
 * their own language, right now. So the direction is reversed (foreign →
 * native) and the backend defaults to a key-less dictionary endpoint that
 * answers in well under a second, which is what a double-click deserves.
 * The model backend exists for networks where Google is unreachable and for
 * phrases that need context.
 */

import { LingualLruCache } from "./cache.js";
import type { LookupStrings } from "./lookup-strings.js";
import { resolveLanguageName } from "./prompts.js";

export type LookupProvider = "google" | "model";

export interface LookupConfig {
  enabled: boolean;
  provider: LookupProvider;
  /** `provider/id` pinned for the model backend; empty follows `/lingual model`. */
  model?: string;
  /** Seconds the popup stays on screen. `0` keeps it until it is clicked away. */
  seconds: number;
  maxWords: number;
  maxChars: number;
}

export const DEFAULT_LOOKUP: LookupConfig = {
  enabled: true,
  provider: "google",
  seconds: 12,
  maxWords: 4,
  maxChars: 48,
};

const MAX_TOKENS = 300;

/** Google needs the region for Chinese; every other pair pi supports is a bare code. */
const GOOGLE_TARGET: Record<string, string> = {
  zh: "zh-CN",
  tw: "zh-TW",
  en: "en",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
  ru: "ru",
};

const CJK_SCRIPT = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/;
const CJK_LANGUAGES = new Set(["zh", "tw", "ja", "ko"]);
const LATIN_SCRIPT = /[A-Za-z]/;
const LETTER = /\p{L}/u;
// Positive allowlist: prose punctuation only, so paths, identifiers, URLs and
// code fragments fall out instead of being translated character by character.
const PROSE = /^[\p{L}\p{M}\p{N}\s.,;:'"!?…\-–—]*$/u;
const LONGEST_WORD = 32;
const CACHE_CAPACITY = 200;

export const globalLookupCache = new LingualLruCache<string>(CACHE_CAPACITY);

export class LookupError extends Error {}

function normLang(lang: string): string {
  return (lang || "").toLowerCase().split(/[-_]/)[0];
}

export function googleTargetCode(lang: string): string {
  const norm = normLang(lang);
  return GOOGLE_TARGET[norm] || norm || "en";
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function resolveLookupConfig(raw: unknown, overrides: Partial<LookupConfig> = {}): LookupConfig {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const provider = String(overrides.provider ?? source.provider ?? DEFAULT_LOOKUP.provider).toLowerCase();
  const model = String(overrides.model ?? source.model ?? "").trim();
  return {
    enabled: Boolean(overrides.enabled ?? source.enabled ?? DEFAULT_LOOKUP.enabled),
    provider: provider === "model" || provider === "llm" ? "model" : "google",
    ...(model ? { model } : {}),
    seconds: clampInt(overrides.seconds ?? source.seconds ?? source.popupSeconds, DEFAULT_LOOKUP.seconds, 0, 600),
    maxWords: clampInt(overrides.maxWords ?? source.maxWords, DEFAULT_LOOKUP.maxWords, 1, 20),
    maxChars: clampInt(overrides.maxChars ?? source.maxChars, DEFAULT_LOOKUP.maxChars, 2, 500),
  };
}

/** Collapse the newlines and runs of spaces a terminal selection carries. */
export function normalizeSelection(raw: string): string {
  return (raw || "").replace(/\s+/gu, " ").trim();
}

/**
 * Whether a copied selection is worth a popup. Every copy reaches this filter,
 * including drag selections of whole code blocks and long paragraphs, so a
 * selection has to look like a word or a short phrase in the foreign language.
 */
export function isLookupSelection(
  raw: string,
  config: Pick<LookupConfig, "maxWords" | "maxChars">,
  nativeLang: string,
  foreignLang: string
): boolean {
  const text = normalizeSelection(raw);
  if (!text || text.length > config.maxChars) return false;
  if (!LETTER.test(text)) return false;
  if (!PROSE.test(text)) return false;

  // Text in the reader's own language needs no translation; text in the
  // foreign language may legitimately be CJK (e.g. en ⇄ ja).
  const foreignIsCjk = CJK_LANGUAGES.has(normLang(foreignLang));
  if (CJK_SCRIPT.test(text) && (CJK_LANGUAGES.has(normLang(nativeLang)) || !foreignIsCjk)) return false;
  if (!foreignIsCjk && !LATIN_SCRIPT.test(text)) return false;

  const words = text.split(" ").filter(Boolean);
  if (words.length === 0 || words.length > config.maxWords) return false;
  return words.every((word) => word.length <= LONGEST_WORD);
}

export function lookupSystemPrompt(nativeLang: string, strings: LookupStrings): string {
  return strings.systemPrompt(resolveLanguageName(nativeLang));
}

export function parseGoogleLookup(payload: unknown): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new LookupError("unexpected response from translate.googleapis.com");
  }
  const segments = payload[0] as unknown[];
  const text = segments
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("")
    .trim();
  if (!text) throw new LookupError("translate.googleapis.com returned an empty translation");
  return text;
}

export interface LookupRequest {
  text: string;
  config: LookupConfig;
  /** Reader's language: the translation target. */
  nativeLang: string;
  strings: LookupStrings;
  signal: AbortSignal;
}

export interface LookupDeps {
  fetch?: typeof fetch;
  /** Model transport, injected so the engine stays free of pi session state. */
  complete?: (text: string, systemPrompt: string, signal: AbortSignal) => Promise<string | null>;
}

async function lookupWithGoogle(request: LookupRequest, deps: LookupDeps): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", googleTargetCode(request.nativeLang));
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", request.text);

  const doFetch = deps.fetch ?? fetch;
  const response = await doFetch(url, {
    signal: request.signal,
    headers: { "user-agent": "pi-lingual" },
  });
  if (!response.ok) throw new LookupError(`translate.googleapis.com returned HTTP ${response.status}`);
  return parseGoogleLookup(await response.json());
}

async function lookupWithModel(request: LookupRequest, deps: LookupDeps): Promise<string> {
  if (!deps.complete) throw new LookupError("no model transport available");
  const text = await deps.complete(request.text, lookupSystemPrompt(request.nativeLang, request.strings), request.signal);
  const trimmed = (text || "").trim();
  if (!trimmed) throw new LookupError("the model returned no text");
  return trimmed.slice(0, 600);
}

export async function lookupTranslate(request: LookupRequest, deps: LookupDeps = {}): Promise<string> {
  if (request.config.provider === "model") return await lookupWithModel(request, deps);
  return await lookupWithGoogle(request, deps);
}

export const LOOKUP_MAX_TOKENS = MAX_TOKENS;
