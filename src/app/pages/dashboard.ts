import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store, fmtDate, inr, today } from '../store';
import { StatusBadge } from './status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatusBadge],
  template: `
    <section class="page">
      <h1 class="page-title">Good day</h1>
      <p class="page-sub">Here's how your quotes are doing.</p>

      <div class="stats">
        <div class="stat">
          <div class="stat-label">Open quotes</div>
          <div class="stat-value">{{ s().openCount }}</div>
          <div class="stat-sub">{{ money(s().openValue) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Won</div>
          <div class="stat-value">{{ s().wonCount }}</div>
          <div class="stat-sub">{{ money(s().wonValue) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Lost</div>
          <div class="stat-value">{{ s().lostCount }}</div>
          <div class="stat-sub">&nbsp;</div>
        </div>
        <div class="stat stat-accent">
          <div class="stat-label">Win rate</div>
          <div class="stat-value">{{ s().winRate }}%</div>
          <div class="meter"><span [style.width.%]="s().winRate"></span></div>
        </div>
      </div>

      @if (store.lowStock().length) {
        <a routerLink="/inventory" class="low-stock-card">
          <div class="grow">
            <div class="low-stock-title">{{ store.lowStock().length }} {{ store.lowStock().length === 1 ? 'item is' : 'items are' }} running low</div>
            <div class="card-meta">
              @for (p of store.lowStock().slice(0, 3); track p.id; let last = $last) {
                {{ p.name }} ({{ p.stock }} {{ p.unit }}){{ last ? '' : ', ' }}
              }
            </div>
          </div>
          <span class="link">Restock</span>
        </a>
      }

      <div class="section-head">
        <h2>Follow up today</h2>
        <span class="pill">{{ store.followUps().length }}</span>
      </div>
      @if (store.followUps().length) {
        <div class="list">
          @for (q of store.followUps(); track q.id) {
            <a class="card card-link" [routerLink]="['/quotes', q.id]">
              <div class="card-row">
                <div>
                  <div class="card-title">{{ cust(q.customerId) }}</div>
                  <div class="card-meta">{{ q.number }} · {{ money(store.totals(q).total) }}</div>
                </div>
                <span class="due" [class.overdue]="q.followUp < todayStr">{{ q.followUp < todayStr ? 'Overdue' : 'Today' }}</span>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="empty">You're all caught up. No follow-ups due.</div>
      }

      @if (store.upcoming().length) {
        <div class="section-head"><h2>Upcoming</h2></div>
        <div class="list">
          @for (q of store.upcoming(); track q.id) {
            <a class="card card-link" [routerLink]="['/quotes', q.id]">
              <div class="card-row">
                <div>
                  <div class="card-title">{{ cust(q.customerId) }}</div>
                  <div class="card-meta">{{ q.number }} · {{ money(store.totals(q).total) }}</div>
                </div>
                <span class="card-meta">{{ d(q.followUp) }}</span>
              </div>
            </a>
          }
        </div>
      }

      <div class="section-head">
        <h2>Recent quotes</h2>
        <a routerLink="/quotes" class="link">See all</a>
      </div>
      <div class="list">
        @for (q of store.quotes().slice(0, 4); track q.id) {
          <a class="card card-link" [routerLink]="['/quotes', q.id]">
            <div class="card-row">
              <div>
                <div class="card-title">{{ cust(q.customerId) }}</div>
                <div class="card-meta">{{ q.number }} · {{ d(q.date) }}</div>
              </div>
              <div class="right">
                <div class="card-amount">{{ money(store.totals(q).total) }}</div>
                <app-status-badge [status]="q.status" />
              </div>
            </div>
          </a>
        }
      </div>
    </section>
  `,
})
export class Dashboard {
  protected readonly store = inject(Store);
  protected readonly s = this.store.stats;
  protected readonly todayStr = today(0);
  money = inr;
  d = fmtDate;
  cust(id: string) {
    return this.store.customer(id)?.name ?? '—';
  }
}
