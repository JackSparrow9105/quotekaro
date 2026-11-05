import { Injectable } from '@angular/core';
import { LocationChangeListener, LocationStrategy } from '@angular/common';

/** True when the app runs inside a frame (e.g. an embedded preview), where URL changes may be blocked. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Keeps navigation history in memory instead of the address bar. Used only when embedded. */
@Injectable()
export class MemoryLocationStrategy extends LocationStrategy {
  private stack: string[] = [''];
  private listeners: LocationChangeListener[] = [];

  path(): string {
    return this.stack[this.stack.length - 1];
  }
  prepareExternalUrl(internal: string): string {
    return internal;
  }
  getState(): unknown {
    return null;
  }
  pushState(_state: unknown, _title: string, url: string, query: string): void {
    this.stack.push(url + (query ? '?' + query : ''));
  }
  replaceState(_state: unknown, _title: string, url: string, query: string): void {
    this.stack[this.stack.length - 1] = url + (query ? '?' + query : '');
  }
  forward(): void {}
  back(): void {
    if (this.stack.length > 1) {
      this.stack.pop();
      this.listeners.forEach((fn) => fn({ state: null, type: 'popstate' } as never));
    }
  }
  onPopState(fn: LocationChangeListener): void {
    this.listeners.push(fn);
  }
  getBaseHref(): string {
    return '';
  }
}
