import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store, fmtDate } from '../store';
import { ChallanView } from './challan-view';
import { waLink } from './share';
import { isEmbedded } from '../memory-location';

@Component({
  selector: 'app-challan-detail',
  imports: [RouterLink, ChallanView],
  template: `
    @if (challan(); as c) {
      <section class="page">
        <div class="page-head no-print">
          <a [routerLink]="c.proformaId ? ['/proforma', c.proformaId] : ['/quotes', c.quoteId]" class="back" aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="grow">
            <h1 class="page-title">{{ c.number }}</h1>
            <div class="card-meta"><a [routerLink]="['/customers', c.customerId]" class="link-plain">{{ customer()?.name }}</a> · {{ d(c.date) }}</div>
          </div>
          <span class="badge badge-sent">Challan</span>
        </div>

        <div class="detail-layout">
          <aside class="detail-side no-print">
            <div class="actions">
              <a class="btn btn-whatsapp" [href]="shareLink()" target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>
                Share on WhatsApp
              </a>
              <button type="button" class="btn btn-ghost" (click)="print()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
                Download PDF
              </button>
            </div>
            <div class="form-card">
              <div class="card-title">Dispatch details</div>
              <div class="pay-sum pay-sum-2">
                <div><span>Vehicle</span><b>{{ c.vehicle || '—' }}</b></div>
                <div><span>Transporter</span><b>{{ c.transporter || '—' }}</b></div>
              </div>
              <div class="btn-row">
                <a class="btn btn-ghost btn-sm" [routerLink]="['/quotes', c.quoteId]">Open quote</a>
                @if (c.proformaId) {
                  <a class="btn btn-ghost btn-sm" [routerLink]="['/proforma', c.proformaId]">Open proforma</a>
                }
                @if (confirmDelete()) {
                  <button type="button" class="btn btn-ghost danger btn-sm" (click)="remove(c.id)">Yes, delete</button>
                } @else {
                  <button type="button" class="btn btn-ghost danger btn-sm" (click)="confirmDelete.set(true)">Delete</button>
                }
              </div>
            </div>
          </aside>
          <div class="detail-main">
            <app-challan-view [challan]="c" />
          </div>
        </div>
      </section>
    } @else {
      <section class="page"><div class="empty">Challan not found. <a routerLink="/quotes" class="link">Back to quotes</a></div></section>
    }
    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class ChallanDetail {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  protected readonly challan = computed(() => this.store.challan(this.params()?.get('id') ?? ''));
  protected readonly customer = computed(() => this.store.customer(this.challan()?.customerId ?? ''));
  protected readonly confirmDelete = signal(false);
  protected readonly toast = signal('');

  protected readonly shareLink = computed(() => {
    const c = this.challan();
    const cu = this.customer();
    if (!c || !cu) return '';
    const co = this.store.company();
    const text =
      `Dear ${cu.contact || cu.name},\n\nYour goods have been dispatched under delivery challan *${c.number}* dated ${fmtDate(c.date)}.\n` +
      (c.vehicle ? `Vehicle: ${c.vehicle}\n` : '') +
      (c.transporter ? `Transporter: ${c.transporter}${c.lrNo ? ' · LR ' + c.lrNo : ''}\n` : '') +
      `\nItems:\n` +
      c.items.map((i) => `• ${i.name} × ${i.qty} ${i.unit}`).join('\n') +
      `\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(cu.phone, text);
  });

  constructor() {
    if (history.state?.created) setTimeout(() => this.flash('Challan saved'));
  }

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2400);
  }

  remove(id: string) {
    const c = this.challan();
    this.store.deleteChallan(id);
    this.router.navigate(c?.proformaId ? ['/proforma', c.proformaId] : ['/quotes', c?.quoteId ?? '']);
  }

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }

  d = fmtDate;
}
