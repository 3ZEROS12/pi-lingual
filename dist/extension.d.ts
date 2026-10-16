import { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';

/**
 * Lightweight Context Siphon: extracts recent assistant turn's anchor line (up to 160 chars)
 * strictly for pronoun/anaphora resolution ("here", "this function", "as discussed") and domain terminology.
 * Skips conversational boilerplate and targets lines with concrete technical density (paths, code, identifiers).
 */
declare function extractRecentContextAnchor(ctx: ExtensionContext | null | undefined): string;
declare function export_default(pi: ExtensionAPI): void;

export { export_default as default, extractRecentContextAnchor };
