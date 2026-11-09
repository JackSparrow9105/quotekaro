import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store, fmtDate, inr } from '../store';
import { DocView } from './doc-view';
import { waLink } from './share';
import { isEmbedded } from '../memory-location';

@Component({
  selector: 'app-proforma-detail',
  imports: [RouterLink, DocView],
  template: `
    @if (pi(); as p) {
      <section class="page">
        <div class="page-head no-print">
          <a [routerLink]="['/quotes', p.quoteId]" class="back" aria-label="Back to quote">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="grow">
            <h1 class="page-title">{{ p.number }}</h1>
            <div class="card-meta">From quote {{ quoteNo() }} · {{ customer()?.name }}</div>
          </div>
          <span class="badge badge-proforma">Proforma</span>
        </div>

        <div class="detail-layout">
        <aside class="detail-side no-print">
        <div class="actions no-print">
          <a class="btn btn-whatsapp" [href]="shareLink()" target="_blank" rel="noopener" (click)="onShared()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>
            Share on WhatsApp
          </a>
          <button type="button" class="btn btn-ghost" (click)="print()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
            Download PDF
          </button>
        </div>

        </aside>

        <div class="detail-main">
        <app-doc-view kind="Proforma Invoice" [number]="p.number" [date]="p.date" [customerId]="p.customerId" [items]="p.items" [notes]="p.notes" />
        </div>
        </div>
      </section>
    } @else {
      <section class="page"><div class="empty">Proforma not found. <a routerLink="/quotes">Back to quotes</a></div></section>
    }
    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class ProformaDetail {
  protected readonly store = inject(Store);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly id = computed(() => this.params()?.get('id') ?? '');
  protected readonly pi = computed(() => this.store.proforma(this.id()));
  protected readonly customer = computed(() => this.store.customer(this.pi()?.customerId ?? ''));
  protected readonly toast = signal('');
  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2600);
  }
  protected readonly quoteNo = computed(() => this.store.quote(this.pi()?.quoteId ?? '')?.number ?? '');

  protected readonly shareLink = computed(() => {
    const p = this.pi();
    const c = this.customer();
    if (!p || !c) return '';
    const co = this.store.company();
    const text =
      `Dear ${c.contact || c.name},\n\nThank you for your order. Please find proforma invoice *${p.number}* ` +
      `dated ${fmtDate(p.date)} for *${inr(this.store.totals(p).total)}* (incl. GST).\n\n` +
      `Bank details: ${co.bank}\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  constructor() {
    if (history.state?.stockUpdated) setTimeout(() => this.flash('Proforma created. Stock updated.'));
  }

  onShared() {}

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }
}
