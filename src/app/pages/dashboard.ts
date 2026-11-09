import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store, fmtDate, inr, today } from '../store';
import { HomeData } from './home-data';

/** Home: ERP-style overview with KPIs, pipeline bar, weekly chart, top customers, follow-ups and stock. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="page-head hp-head">
        <div>
          <h1 class="page-title">Overview</h1>
          <p class="page-sub">{{ h.dateLabel }}</p>
        </div>
      </div>

      <div class="hp-kpis hx-stagger">
        <div class="hp-kpi">
          <span class="hp-kpi-ico hp-c-sent"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>
          <div class="hp-kpi-label">Open quotes</div>
          <div class="hp-kpi-val">{{ money(s().openValue) }}</div>
          <div class="hp-kpi-sub">{{ s().openCount }} quotes in pipeline</div>
        </div>
        <div class="hp-kpi">
          <span class="hp-kpi-ico hp-c-won"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg></span>
          <div class="hp-kpi-label">Won</div>
          <div class="hp-kpi-val">{{ money(s().wonValue) }}</div>
          <div class="hp-kpi-sub">{{ s().wonCount }} {{ s().wonCount === 1 ? 'order' : 'orders' }}</div>
        </div>
        <div class="hp-kpi">
          <span class="hp-kpi-ico hp-c-brand"><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span>
          <div class="hp-kpi-label">Win rate</div>
          <div class="hp-kpi-val">{{ s().winRate }}%</div>
          <div class="hp-kpi-sub">{{ s().wonCount }} won · {{ s().lostCount }} lost</div>
        </div>
        <div class="hp-kpi">
          <span class="hp-kpi-ico hp-c-ink"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 13v4M19 8v9"/></svg></span>
          <div class="hp-kpi-label">Quoted · 30 days</div>
          <div class="hp-kpi-val">{{ money(h.quoted30()) }}</div>
          <div class="hp-kpi-sub">{{ store.proformas().length }} {{ store.proformas().length === 1 ? 'proforma' : 'proformas' }} raised</div>
        </div>
      </div>

      <div class="hp-panel">
        <div class="hp-panel-head"><h2>Pipeline by value</h2><a routerLink="/quotes" class="link">Open quotes</a></div>
        <div class="hp-stack" role="img" aria-label="Pipeline split by status">
          @for (r of h.pipeline(); track r.status) {
            @if (r.pct > 0) {
              <span class="hx-bar-fill hp-seg-{{ r.status }}" [style.width.%]="r.pct"></span>
            }
          }
        </div>
        <div class="hp-legend">
          @for (r of h.pipeline(); track r.status) {
            <div class="hp-leg">
              <span class="hp-sw hp-seg-{{ r.status }}"></span>
              <div>
                <div class="hp-leg-name">{{ r.status }} <span class="card-meta">· {{ r.count }}</span></div>
                <div class="hp-leg-val">{{ money(r.value) }}</div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="hp-grid">
        <div class="hp-panel">
          <div class="hp-panel-head"><h2>Last 4 weeks</h2>
            <div class="hp-key"><span class="hp-sw hp-q"></span>Quoted <span class="hp-sw hp-w"></span>Won</div>
          </div>
          <div class="hp-chart">
            @for (w of h.weeks(); track w.label) {
              <div class="hp-col" [attr.title]="w.label + ': quoted ' + money(w.quoted) + ', won ' + money(w.won)">
                <div class="hp-bars">
                  <span class="hp-bar hp-q" [style.height.%]="w.qPct"></span>
                  <span class="hp-bar hp-w" [style.height.%]="w.wPct"></span>
                </div>
                <div class="hp-col-val">{{ short(w.quoted) }}</div>
                <div class="hp-col-label">{{ w.label }}</div>
              </div>
            }
          </div>
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head"><h2>Top customers</h2><a routerLink="/customers" class="link">All</a></div>
          <div class="hp-top">
            @for (c of h.topCustomers(); track c.id) {
              <div class="hp-top-row">
                <div class="hp-top-line"><span class="hp-top-name">{{ c.name }}</span><b>{{ money(c.value) }}</b></div>
                <div class="hp-track"><span class="hx-bar-fill" [style.width.%]="c.pct"></span></div>
                <div class="card-meta">{{ c.count }} {{ c.count === 1 ? 'quote' : 'quotes' }}</div>
              </div>
            }
          </div>
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head"><h2>Follow-ups</h2><span class="pill">{{ store.followUps().length + store.upcoming().length }}</span></div>
          <div class="hp-table">
            @for (q of store.followUps(); track q.id) {
              <a class="hp-tr" [routerLink]="['/quotes', q.id]">
                <span class="grow"><b>{{ h.customerName(q.customerId) }}</b><br /><span class="card-meta">{{ q.number }}</span></span>
                <span class="hp-amt">{{ money(h.total(q)) }}</span>
                <span class="due" [class.overdue]="q.followUp < todayStr">{{ q.followUp < todayStr ? 'Overdue' : 'Today' }}</span>
              </a>
            }
            @for (q of store.upcoming(); track q.id) {
              <a class="hp-tr" [routerLink]="['/quotes', q.id]">
                <span class="grow"><b>{{ h.customerName(q.customerId) }}</b><br /><span class="card-meta">{{ q.number }}</span></span>
                <span class="hp-amt">{{ money(h.total(q)) }}</span>
                <span class="card-meta">{{ d(q.followUp) }}</span>
              </a>
            }
            @if (!store.followUps().length && !store.upcoming().length) {
              <div class="empty">No follow-ups scheduled.</div>
            }
          </div>
        </div>

        <div class="hp-panel">
          <div class="hp-panel-head"><h2>Inventory</h2><a routerLink="/inventory" class="link">Manage</a></div>
          <div class="hp-inv">
            <div><span class="card-meta">Stock value</span><b>{{ money(store.inventory().value) }}</b></div>
            <div><span class="card-meta">Items tracked</span><b>{{ store.inventory().items }}</b></div>
            <div [class.hp-warn]="store.inventory().low"><span class="card-meta">Low stock</span><b>{{ store.inventory().low }}</b></div>
          </div>
          @for (p of store.lowStock().slice(0, 3); track p.id) {
            <div class="hp-low"><span>{{ p.name }}</span><b>{{ p.stock }} {{ p.unit }}</b></div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Dashboard {
  protected readonly store = inject(Store);
  protected readonly h = inject(HomeData);
  protected readonly s = this.store.stats;
  protected readonly todayStr = today(0);
  money = inr;
  d = fmtDate;
  /** ₹1.9L / ₹45K style labels for chart columns. */
  short(n: number) {
    if (!n) return '—';
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 1e3) return '₹' + Math.round(n / 1e3) + 'K';
    return '₹' + Math.round(n);
  }
}
