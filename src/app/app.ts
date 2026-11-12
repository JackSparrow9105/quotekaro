import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from './store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar no-print">
      <a routerLink="/" class="brand" aria-label="Home">
        @if (store.company().logo) {
          <img [src]="store.company().logo" alt="" class="brand-logo" />
        } @else {
          <span class="brand-mark" [style.background]="store.company().color">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>
          </span>
        }
        <span class="brand-name">QuoteKaro</span>
      </a>
      <div class="topbar-actions">
        @if (installEvent()) {
          <button class="btn btn-sm btn-accent" type="button" (click)="install()">Install app</button>
        }
        <a routerLink="/reports" class="icon-btn top-reports" aria-label="Reports" routerLinkActive="active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 13v4M19 8v9"/></svg>
        </a>
        <a routerLink="/settings" class="icon-btn" aria-label="Settings" routerLinkActive="active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </a>
      </div>
    </header>

    <main class="main">
      <router-outlet />
    </main>

    <nav class="tabbar no-print" aria-label="Main">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
        <span>Home</span>
      </a>
      <a routerLink="/quotes" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>
        <span>Quotes</span>
      </a>
      <a routerLink="/quotes/new" class="tab tab-new" aria-label="New quote">
        <span class="tab-new-btn" [style.background]="store.company().color">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        <span class="tab-new-label">New quote</span>
      </a>
      <a routerLink="/customers" routerLinkActive="active" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>
        <span>Customers</span>
      </a>
      <a routerLink="/inventory" routerLinkActive="active" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
        <span>Inventory</span>
        @if (store.lowStock().length) {
          <span class="tab-dot" aria-label="Low stock items"></span>
        }
      </a>
      <a routerLink="/reports" routerLinkActive="active" class="tab tab-desk">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 13v4M19 8v9"/></svg>
        <span>Reports</span>
      </a>
    </nav>
  `,
  host: { '[style.--brand]': 'store.company().color' },
})
export class App {
  protected readonly store = inject(Store);
  protected readonly installEvent = signal<any>(null);

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstall(e: Event) {
    e.preventDefault();
    this.installEvent.set(e);
  }

  async install() {
    const e = this.installEvent();
    if (!e) return;
    e.prompt();
    await e.userChoice;
    this.installEvent.set(null);
  }
}
