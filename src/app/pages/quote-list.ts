import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuoteStatus, Store, fmtDate, inr } from '../store';
import { StatusBadge } from './status-badge';
import { PayBadge } from './pay-badge';

type Filter = 'all' | QuoteStatus | 'proforma' | 'due' | 'challan';

@Component({
  selector: 'app-quote-list',
  imports: [RouterLink, FormsModule, StatusBadge, PayBadge],
  template: `
    <section class="page">
      <div class="page-head">
        <h1 class="page-title">Quotes</h1>
        <a routerLink="/quotes/new" class="btn btn-primary btn-sm">+ New quote</a>
      </div>

      <label class="search">
        <span class="sr-only">Search quotes</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="search" placeholder="Search customer or quote no." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </label>

      <div class="chips" role="tablist" aria-label="Filter quotes">
        @for (f of filters; track f.key) {
          <button type="button" class="chip" role="tab" [attr.aria-selected]="filter() === f.key" [class.active]="filter() === f.key" (click)="filter.set(f.key)">
            {{ f.label }} <span class="chip-count">{{ count(f.key) }}</span>
          </button>
        }
      </div>

      @if (filter() === 'due') {
        <div class="due-banner">
          <span>Outstanding</span><b>{{ money(store.outstanding()) }}</b>
        </div>
      }
      @if (filter() === 'challan') {
        <div class="list list-grid">
          @for (c of challans(); track c.id) {
            <a class="card card-link" [routerLink]="['/challans', c.id]">
              <div class="card-row">
                <div>
                  <div class="card-title">{{ cust(c.customerId) }}</div>
                  <div class="card-meta">{{ c.number }} · {{ d(c.date) }}{{ c.vehicle ? ' · ' + c.vehicle : '' }}</div>
                </div>
                <div class="right">
                  <div class="card-amount">{{ c.items.length }} {{ c.items.length === 1 ? 'item' : 'items' }}</div>
                  <span class="badge badge-sent">Challan</span>
                </div>
              </div>
            </a>
          } @empty {
            <div class="empty">No delivery challans yet. Open a proforma and tap "Create delivery challan".</div>
          }
        </div>
      } @else if (filter() === 'proforma' || filter() === 'due') {
        <div class="list list-grid">
          @for (p of proformas(); track p.id) {
            <a class="card card-link" [routerLink]="['/proforma', p.id]">
              <div class="card-row">
                <div>
                  <div class="card-title">{{ cust(p.customerId) }}</div>
                  <div class="card-meta">{{ p.number }} · {{ d(p.date) }}</div>
                </div>
                <div class="right">
                  <div class="card-amount">{{ money(store.payInfo(p).total) }}</div>
                  @if (store.payInfo(p).status === 'part') {
                    <div class="card-meta pay-red">Due {{ money(store.payInfo(p).due) }}</div>
                  }
                  <app-pay-badge [status]="store.payInfo(p).status" />
                </div>
              </div>
            </a>
          } @empty {
            <div class="empty">{{ filter() === 'due' ? 'Nothing pending. Every proforma is fully paid.' : 'No proforma invoices yet. Open a won quote and tap "Convert to proforma".' }}</div>
          }
        </div>
      } @else {
        <div class="list list-grid">
          @for (q of list(); track q.id) {
            <a class="card card-link" [routerLink]="['/quotes', q.id]">
              <div class="card-row">
                <div>
                  <div class="card-title">{{ cust(q.customerId) }}</div>
                  <div class="card-meta">{{ q.number }}@if (q.revision > 1) { · Rev {{ q.revision }} } · {{ d(q.date) }}</div>
                </div>
                <div class="right">
                  <div class="card-amount">{{ money(store.totals(q).total) }}</div>
                  <app-status-badge [status]="q.status" />
                </div>
              </div>
            </a>
          } @empty {
            <div class="empty">No quotes match.</div>
          }
        </div>
      }
    </section>
  `,
})
export class QuoteList {
  protected readonly store = inject(Store);
  protected readonly filter = signal<Filter>(
    (['due', 'proforma', 'challan'] as Filter[]).includes(history.state?.filter) ? history.state.filter : 'all',
  );
  protected readonly q = signal('');
  protected readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'proforma', label: 'Proforma' },
    { key: 'due', label: 'Payment due' },
    { key: 'challan', label: 'Challans' },
  ];

  private matches(customerId: string, number: string) {
    const term = this.q().trim().toLowerCase();
    if (!term) return true;
    return number.toLowerCase().includes(term) || this.cust(customerId).toLowerCase().includes(term);
  }

  protected readonly list = computed(() =>
    this.store.quotes().filter((x) => (this.filter() === 'all' || x.status === this.filter()) && this.matches(x.customerId, x.number)),
  );
  protected readonly proformas = computed(() =>
    [...this.store.proformas()]
      .reverse()
      .filter((p) => this.matches(p.customerId, p.number))
      .filter((p) => this.filter() !== 'due' || this.store.payInfo(p).due > 0),
  );
  protected readonly challans = computed(() => this.store.challans().filter((c) => this.matches(c.customerId, c.number)));

  count(f: Filter) {
    if (f === 'proforma') return this.store.proformas().length;
    if (f === 'due') return this.store.receivables().length;
    if (f === 'challan') return this.store.challans().length;
    if (f === 'all') return this.store.quotes().length;
    return this.store.quotes().filter((x) => x.status === f).length;
  }
  cust(id: string) {
    return this.store.customer(id)?.name ?? '—';
  }
  money = inr;
  d = fmtDate;
}
