/**
 * Monotonic Session FSM & Cooperative Abort Controller.
 * 
 * Responsibilities:
 * 1. Monotonic generation counter tracking: eliminates asynchronous race conditions and stale callback overwrites.
 * 2. Cooperative AbortController cancellation: immediately aborts in-flight remote sockets when a new prompt arrives.
 * 3. Encapsulates pagination pool and history card cache, eliminating scattered mutable state.
 * 4. Zero external dependencies, pure native TypeScript event model.
 */

import type { LingualResult } from "./types.js";

export interface SessionRequestToken {
  readonly generation: number;
  readonly signal: AbortSignal;
}

export interface PaginationSnapshot {
  readonly pageIndex: number;
  readonly totalPages: number;
  readonly readyCount: number;
  readonly isMultiPage: boolean;
}

export class LingualSessionController {
  private activeAbortController: AbortController | null = null;
  private currentGeneration = 0;

  // Pagination state management
  private pagedResults: LingualResult[] = [];
  private currentPageIndex = 0;
  private totalExpectedPages = 1;
  private lastResult: LingualResult | null = null;

  /**
   * Begins a new session request:
   * 1. Aborts in-flight HTTP stream/request from previous turn;
   * 2. Increments monotonic generation counter;
   * 3. Binds a fresh AbortSignal.
   */
  public beginRequest(): SessionRequestToken {
    this.abortActive();
    this.activeAbortController = new AbortController();
    const generation = ++this.currentGeneration;
    return {
      generation,
      signal: this.activeAbortController.signal,
    };
  }

  /**
   * Aborts currently active in-flight network requests.
   */
  public abortActive(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  /**
   * Checks if the specified generation token is still the latest active generation.
   */
  public isLatest(generation: number): boolean {
    return this.currentGeneration === generation;
  }

  /**
   * Gets the latest generation counter value.
   */
  public getCurrentGeneration(): number {
    return this.currentGeneration;
  }

  /**
   * Initializes the pagination pool when input is split into multiple semantic chunks.
   */
  public initPagination(totalExpectedPages: number): void {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = Math.max(1, totalExpectedPages);
  }

  /**
   * Sets page result for a chunk index with generation guard to reject stale writes.
   */
  public setPageResult(chunkIndex: number, result: LingualResult, generation: number): boolean {
    if (!this.isLatest(generation)) {
      return false; // Stale generation, reject write
    }
    this.pagedResults[chunkIndex] = result;
    this.lastResult = result;
    return true;
  }

  /**
   * Gets translation result for currently active page.
   */
  public getActiveResult(): LingualResult | null {
    const readyList = this.getReadyPages();
    if (readyList.length === 0) {
      return this.lastResult;
    }
    if (this.currentPageIndex >= readyList.length) {
      this.currentPageIndex = Math.max(0, readyList.length - 1);
    }
    return readyList[this.currentPageIndex] || null;
  }

  /**
   * Gets all ready page results.
   */
  public getReadyPages(): LingualResult[] {
    return this.pagedResults.filter((item): item is LingualResult => Boolean(item));
  }

  /**
   * Gets a snapshot of the current pagination state.
   */
  public getPaginationSnapshot(): PaginationSnapshot {
    const readyCount = this.getReadyPages().length;
    const totalPages = Math.max(readyCount, this.totalExpectedPages);
    return {
      pageIndex: this.currentPageIndex,
      totalPages,
      readyCount,
      isMultiPage: totalPages > 1,
    };
  }

  /**
   * Cycles to the next ready page.
   * Returns true if pagination changed.
   */
  public nextPage(): boolean {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex + 1) % readyList.length;
    return true;
  }

  /**
   * Cycles to the previous ready page.
   * Returns true if pagination changed.
   */
  public prevPage(): boolean {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex - 1 + readyList.length) % readyList.length;
    return true;
  }

  /**
   * Clears pagination pool on non-translatable input or teardown to prevent ghost cards.
   */
  public clearPagination(): void {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = 1;
  }

  /**
   * Gets the most recent translation result for /last replay.
   */
  public getLastResult(): LingualResult | null {
    return this.lastResult;
  }

  /**
   * Explicitly sets the last translation result.
   */
  public setLastResult(result: LingualResult | null): void {
    this.lastResult = result;
  }

  /**
   * Resets the controller completely.
   */
  public reset(): void {
    this.abortActive();
    this.clearPagination();
    this.lastResult = null;
  }
}
