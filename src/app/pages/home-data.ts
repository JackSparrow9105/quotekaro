import { Injectable, computed, inject } from '@angular/core';
import { Quote, QuoteStatus, Store, today } from '../store';

/** Extra numbers for the home overview (all derived from the local store). */
@Injectable({ providedIn: 'root' })
export class HomeData {
  private readonly store = inject(Store);

  readonly dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  total(q: Quote) {
    return this.store.totals(q).total;
  }

  customerName(id: string) {
    return this.store.customer(id)?.name ?? '—';
  }

  /** Count + value per status, for the pipeline bar. */
  readonly pipeline = computed(() => {
    const order: QuoteStatus[] = ['draft', 'sent', 'won', 'lost'];
    const qs = this.store.quotes();
    const rows = order.map((status) => {
      const list = qs.filter((q) => q.status === status);
      return { status, count: list.length, value: list.reduce((s, q) => s + this.total(q), 0) };
    });
    const sum = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / sum) * 1000) / 10 }));
  });

  /** Quoted vs won value for each of the last 4 weeks (oldest first). */
  readonly weeks = computed(() => {
    const qs = this.store.quotes();
    const out = [3, 2, 1, 0].map((w) => {
      const from = today(-(w * 7 + 6));
      const to = today(-(w * 7));
      const inWeek = qs.filter((q) => q.date >= from && q.date <= to);
      return {
        label: w === 0 ? 'This wk' : w === 1 ? 'Last wk' : `${w} wks ago`,
        quoted: inWeek.reduce((s, q) => s + this.total(q), 0),
        won: inWeek.filter((q) => q.status === 'won').reduce((s, q) => s + this.total(q), 0),
      };
    });
    const max = Math.max(1, ...out.map((o) => o.quoted));
    return out.map((o) => ({ ...o, qPct: (o.quoted / max) * 100, wPct: (o.won / max) * 100 }));
  });

  readonly quoted30 = computed(() =>
    this.store
      .quotes()
      .filter((q) => q.date >= today(-30))
      .reduce((s, q) => s + this.total(q), 0),
  );

  /** Customers ranked by total quoted value. */
  readonly topCustomers = computed(() => {
    const map = new Map<string, { id: string; value: number; count: number }>();
    for (const q of this.store.quotes()) {
      const r = map.get(q.customerId) ?? { id: q.customerId, value: 0, count: 0 };
      r.value += this.total(q);
      r.count++;
      map.set(q.customerId, r);
    }
    const list = [...map.values()].sort((a, b) => b.value - a.value).slice(0, 4);
    const max = Math.max(1, ...list.map((l) => l.value));
    return list.map((l) => ({ ...l, name: this.customerName(l.id), pct: (l.value / max) * 100 }));
  });
}
