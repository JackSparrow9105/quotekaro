import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Quote, Store, fmtDate, inr, today } from '../store';
import { downloadCsv } from './csv';

type Period = 'month' | 'lastMonth' | 'quarter' | 'fy' | 'all';

interface Group {
  key: string;
  label: string;
  quotes: number;
  quoted: number;
  won: number;
  wonValue: number;
  lost: number;
}

/** Sales reports: conversion, by salesperson, customer and product, lost reasons, collections. */
@Component({
  selector: 'app-reports',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="page-head">
        <div class="grow">
          <h1 class="page-title">Reports</h1>
          <p class="page-sub">{{ rangeLabel() }}</p>
        </div>
      </div>

      <div class="chips" role="tablist" aria-label="Report period">
        @for (p of periods; track p.key) {
          <button type="button" class="chip" role="tab" [class.active]="period() === p.key" [attr.aria-selected]="period() === p.key" (click)="period.set(p.key)">{{ p.label }}</button>
        }
      </div>

      <div class="hp-kpis hx-stagger">
        <div class="hp-kpi">
          <div class="hp-kpi-label">Quotes made</div>
          <div class="hp-kpi-val">{{ quotes().length }}</div>
          <div class="hp-kpi-sub">{{ money(quotedValue()) }} quoted</div>
        </div>
        <div class="hp-kpi">
          <div class="hp-kpi-label">Orders won</div>
          <div class="hp-kpi-val">{{ money(wonValue()) }}</div>
          <div class="hp-kpi-sub">{{ won().length }} {{ won().length === 1 ? 'quote' : 'quotes' }}</div>
        </div>
        <div class="hp-kpi">
          <div class="hp-kpi-label">Conversion</div>
          <div class="hp-kpi-val">{{ conversion() }}%</div>
          <div class="hp-kpi-sub">Win rate {{ winRate() }}% of decided</div>
        </div>
        <div class="hp-kpi">
          <div class="hp-kpi-label">Collected</div>
          <div class="hp-kpi-val">{{ money(collected()) }}</div>
          <div class="hp-kpi-sub"><a routerLink="/quotes" [state]="{ filter: 'due' }" class="link-plain">{{ money(store.outstanding()) }} outstanding</a></div>
        </div>
      </div>

      <div class="hp-panel">
        <div class="hp-panel-head"><h2>Quote funnel</h2><span class="card-meta">Avg quote {{ money(round(avgQuote())) }}</span></div>
        <div class="rp-funnel">
          @for (f of funnel(); track f.label) {
            <div class="rp-fun-row">
              <span class="rp-fun-label">{{ f.label }}</span>
              <div class="rp-fun-track"><span class="hx-bar-fill" [style.width.%]="f.pct" [class]="'hx-bar-fill rp-f-' + f.cls"></span></div>
              <span class="rp-fun-val">{{ f.count }}</span>
            </div>
          }
        </div>
      </div>

      <div class="rp-grid">
        <div class="hp-panel">
          <div class="hp-panel-head">
            <h2>By salesperson</h2>
            <button type="button" class="btn btn-ghost btn-sm" (click)="export('salesperson', bySales())">CSV</button>
          </div>
          <div class="rp-table-wrap">
            <table class="rp-table">
              <thead><tr><th class="left">Name</th><th>Quotes</th><th>Quoted</th><th>Won</th><th>Conv.</th></tr></thead>
              <tbody>
                @for (g of bySales(); track g.key) {
                  <tr>
                    <td class="left"><b>{{ g.label }}</b></td>
                    <td>{{ g.quotes }}</td>
                    <td>{{ short(g.quoted) }}</td>
                    <td>{{ short(g.wonValue) }}</td>
                    <td><span class="rp-pct" [class.good]="pct(g.won, g.quotes) >= 40">{{ pct(g.won, g.quotes) }}%</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="left card-meta">No quotes in this period.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (!store.team().length) {
            <p class="card-meta">Add your sales team in <a routerLink="/settings" class="link">Settings</a> to see who brings in orders.</p>
          }
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head">
            <h2>By customer</h2>
            <button type="button" class="btn btn-ghost btn-sm" (click)="export('customers', byCustomer())">CSV</button>
          </div>
          <div class="rp-table-wrap">
            <table class="rp-table">
              <thead><tr><th class="left">Customer</th><th>Quotes</th><th>Quoted</th><th>Won</th><th>Conv.</th></tr></thead>
              <tbody>
                @for (g of byCustomer(); track g.key) {
                  <tr>
                    <td class="left"><a [routerLink]="['/customers', g.key]" class="link-plain"><b>{{ g.label }}</b></a></td>
                    <td>{{ g.quotes }}</td>
                    <td>{{ short(g.quoted) }}</td>
                    <td>{{ short(g.wonValue) }}</td>
                    <td><span class="rp-pct" [class.good]="pct(g.won, g.quotes) >= 40">{{ pct(g.won, g.quotes) }}%</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="left card-meta">No quotes in this period.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head">
            <h2>By product</h2>
            <button type="button" class="btn btn-ghost btn-sm" (click)="exportProducts()">CSV</button>
          </div>
          <div class="rp-table-wrap">
            <table class="rp-table">
              <thead><tr><th class="left">Product</th><th>Qty quoted</th><th>Qty won</th><th>Won value</th></tr></thead>
              <tbody>
                @for (p of byProduct(); track p.key) {
                  <tr>
                    <td class="left"><b>{{ p.name }}</b></td>
                    <td>{{ p.qtyQuoted }} {{ p.unit }}</td>
                    <td>{{ p.qtyWon }} {{ p.unit }}</td>
                    <td>{{ short(p.wonValue) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="left card-meta">No quotes in this period.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="card-meta">Values are before GST.</p>
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head"><h2>Why quotes were lost</h2><span class="pill">{{ lost().length }}</span></div>
          @for (r of lostReasons(); track r.reason) {
            <div class="hp-top-row">
              <div class="hp-top-line"><span class="hp-top-name">{{ r.reason }}</span><b>{{ r.count }} · {{ short(r.value) }}</b></div>
              <div class="hp-track"><span class="hx-bar-fill rp-lost" [style.width.%]="r.pct"></span></div>
            </div>
          } @empty {
            <div class="empty">No lost quotes in this period.</div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Reports {
  protected readonly store = inject(Store);
  protected readonly period = signal<Period>('fy');
  protected readonly periods: { key: Period; label: string }[] = [
    { key: 'month', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'quarter', label: 'This quarter' },
    { key: 'fy', label: 'This FY' },
    { key: 'all', label: 'All time' },
  ];

  /** [from, to] as yyyy-mm-dd. Quarters and FY follow the Indian April–March year. */
  protected readonly range = computed<[string, string]>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0 = Jan
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    switch (this.period()) {
      case 'month':
        return [iso(new Date(y, m, 1)), today(0)];
      case 'lastMonth':
        return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
      case 'quarter': {
        const fyMonth = (m + 9) % 12; // months since April
        const start = new Date(y, m - (fyMonth % 3), 1);
        return [iso(start), today(0)];
      }
      case 'fy': {
        const startYear = m >= 3 ? y : y - 1;
        return [iso(new Date(startYear, 3, 1)), today(0)];
      }
      default:
        return ['0000-01-01', '9999-12-31'];
    }
  });

  protected readonly rangeLabel = computed(() => {
    if (this.period() === 'all') return 'All time';
    const [a, b] = this.range();
    return `${fmtDate(a)} – ${fmtDate(b)}`;
  });

  private inRange(date: string) {
    const [a, b] = this.range();
    return date >= a && date <= b;
  }

  protected readonly quotes = computed(() => this.store.quotes().filter((q) => this.inRange(q.date)));
  protected readonly won = computed(() => this.quotes().filter((q) => q.status === 'won'));
  protected readonly lost = computed(() => this.quotes().filter((q) => q.status === 'lost'));
  protected readonly quotedValue = computed(() => this.sum(this.quotes()));
  protected readonly wonValue = computed(() => this.sum(this.won()));
  protected readonly avgQuote = computed(() => (this.quotes().length ? this.quotedValue() / this.quotes().length : 0));
  protected readonly conversion = computed(() => this.pct(this.won().length, this.quotes().length));
  protected readonly winRate = computed(() => this.pct(this.won().length, this.won().length + this.lost().length));
  protected readonly collected = computed(() =>
    this.store
      .proformas()
      .flatMap((p) => p.payments ?? [])
      .filter((x) => this.inRange(x.date))
      .reduce((s, x) => s + x.amount, 0),
  );

  protected readonly funnel = computed(() => {
    const all = this.quotes().length || 1;
    const sent = this.quotes().filter((q) => q.status !== 'draft').length;
    const proformas = this.quotes().filter((q) => q.proformaId).length;
    const rows = [
      { label: 'Quoted', count: this.quotes().length, cls: 'q' },
      { label: 'Sent', count: sent, cls: 's' },
      { label: 'Won', count: this.won().length, cls: 'w' },
      { label: 'Proforma', count: proformas, cls: 'p' },
    ];
    return rows.map((r) => ({ ...r, pct: (r.count / all) * 100 }));
  });

  private group(keyOf: (q: Quote) => string, labelOf: (key: string) => string): Group[] {
    const map = new Map<string, Group>();
    for (const q of this.quotes()) {
      const key = keyOf(q);
      const g = map.get(key) ?? { key, label: labelOf(key), quotes: 0, quoted: 0, won: 0, wonValue: 0, lost: 0 };
      const total = this.store.totals(q).total;
      g.quotes++;
      g.quoted += total;
      if (q.status === 'won') {
        g.won++;
        g.wonValue += total;
      }
      if (q.status === 'lost') g.lost++;
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.wonValue - a.wonValue || b.quoted - a.quoted);
  }

  protected readonly bySales = computed(() => this.group((q) => q.preparedBy || '', (k) => k || 'Not set'));
  protected readonly byCustomer = computed(() => this.group((q) => q.customerId, (k) => this.store.customer(k)?.name ?? '—'));

  protected readonly byProduct = computed(() => {
    const map = new Map<string, { key: string; name: string; unit: string; qtyQuoted: number; qtyWon: number; wonValue: number }>();
    for (const q of this.quotes()) {
      for (const i of q.items) {
        const r = map.get(i.productId) ?? { key: i.productId, name: i.name, unit: i.unit, qtyQuoted: 0, qtyWon: 0, wonValue: 0 };
        r.qtyQuoted += i.qty || 0;
        if (q.status === 'won') {
          r.qtyWon += i.qty || 0;
          r.wonValue += (i.qty || 0) * (i.rate || 0) * (1 - (i.discount || 0) / 100);
        }
        map.set(i.productId, r);
      }
    }
    return [...map.values()].sort((a, b) => b.wonValue - a.wonValue || b.qtyQuoted - a.qtyQuoted);
  });

  protected readonly lostReasons = computed(() => {
    const map = new Map<string, { reason: string; count: number; value: number }>();
    for (const q of this.lost()) {
      const reason = q.lostReason || 'No reason given';
      const r = map.get(reason) ?? { reason, count: 0, value: 0 };
      r.count++;
      r.value += this.store.totals(q).total;
      map.set(reason, r);
    }
    const list = [...map.values()].sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...list.map((l) => l.count));
    return list.map((l) => ({ ...l, pct: (l.count / max) * 100 }));
  });

  private sum(qs: Quote[]) {
    return qs.reduce((s, q) => s + this.store.totals(q).total, 0);
  }

  round(n: number) {
    return Math.round(n);
  }

  pct(a: number, b: number) {
    return b ? Math.round((a / b) * 100) : 0;
  }

  short(n: number) {
    if (!n) return '—';
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
    return inr(Math.round(n));
  }

  export(name: string, groups: Group[]) {
    const rows: (string | number)[][] = [[name === 'salesperson' ? 'Salesperson' : 'Customer', 'Quotes', 'Quoted value', 'Won', 'Won value', 'Lost', 'Conversion %']];
    for (const g of groups) rows.push([g.label, g.quotes, Math.round(g.quoted), g.won, Math.round(g.wonValue), g.lost, this.pct(g.won, g.quotes)]);
    downloadCsv(`report-${name}-${this.range()[0]}-to-${this.range()[1]}`.replace('0000-01-01-to-9999-12-31', 'all-time'), rows);
  }

  exportProducts() {
    const rows: (string | number)[][] = [['Product', 'Unit', 'Qty quoted', 'Qty won', 'Won value (before GST)']];
    for (const p of this.byProduct()) rows.push([p.name, p.unit, p.qtyQuoted, p.qtyWon, Math.round(p.wonValue)]);
    downloadCsv(`report-products-${this.range()[0]}-to-${this.range()[1]}`.replace('0000-01-01-to-9999-12-31', 'all-time'), rows);
  }

  money = inr;
}
