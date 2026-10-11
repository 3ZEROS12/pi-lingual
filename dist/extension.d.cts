import { ExtensionAPI } from '@earendil-works/pi-coding-agent';

/**
 * Parse one-shot prompt refiner prefix (`>> <messy input>`, `提炼: <messy input>`, `refine: <messy input>`).
 * Allows users in `original` (Learn) mode to refine and structure a specific messy prompt on the spot!
 */
declare function parseOneShotRefinePrefix(text: string): string | null;
declare function export_default(pi: ExtensionAPI): void;

export { export_default as default, parseOneShotRefinePrefix };
