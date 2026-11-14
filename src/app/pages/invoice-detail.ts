import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocTemplate, Store, fmtDate, inr } from '../store';
import { LayoutChooser } from './layout-picker';
import { DocView } from './doc-view';
import { PayBadge } from './pay-badge';
import { waLink } from './share';
import { isEmbedded } from '../memory-location';

/** GST tax invoice issued from a proforma. Read-only: payments are recorded on the proforma. */
@Component({
  selector: 'app-invoice-detail',
  imports: [RouterLink, DocView, LayoutChooser, PayBadge],
  template: `
    @if (inv(); as v) {
      <section class="page">
        <div class="page-head no-print">
          <a [routerLink]="['/proforma', v.proformaId]" class="back" aria-label="Back to proforma">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="grow">
            <h1 class="page-title">{{ v.number }}</h1>
            <div class="card-meta">Tax invoice · from {{ proformaNo() }} · <a [routerLink]="['/customers', v.customerId]" class="link-plain">{{ customer()?.name }}</a></div>
          </div>
          <app-pay-badge [status]="pay().status" />
        </div>

        <div class="detail-layout">
          <aside class="detail-side no-print">
            <div class="actions no-print">
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
              <div class="lc-head">
                <div class="card-title">Payment</div>
                <app-pay-badge [status]="pay().status" />
              </div>
              <div class="pay-sum">
                <div><span>Total</span><b>{{ money(pay().total) }}</b></div>
                <div><span>Received</span><b class="pay-green">{{ money(pay().paid) }}</b></div>
                <div><span>Balance due</span><b [class.pay-red]="pay().due > 0">{{ money(pay().due) }}</b></div>
              </div>
              @if (pay().due > 0) {
                <div class="btn-row">
                  <a class="btn btn-ghost btn-sm" [routerLink]="['/proforma', v.proformaId]">Record payment on {{ proformaNo() }}</a>
                </div>
              }
            </div>

            <div class="tinv-note">
              This tax invoice is final and can't be edited or deleted. If something is wrong, tell your accountant: GST corrections are made with a credit or debit note.
            </div>

            <app-layout-chooser [(value)]="layout" />
          </aside>

          <div class="detail-main">
            <app-doc-view
              kind="Tax Invoice"
              [number]="v.number"
              [date]="v.date"
              [customerId]="v.customerId"
              [items]="v.items"
              [notes]="v.notes"
              [template]="layout()"
              [payments]="payments()"
              [showUpi]="true"
              [invoiceMeta]="true"
              [reference]="proformaNo()"
            />
          </div>
        </div>
      </section>
    } @else {
      <section class="page"><div class="empty">Tax invoice not found. <a routerLink="/quotes">Back to quotes</a></div></section>
    }
    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class InvoiceDetail {
  protected readonly store = inject(Store);
  protected readonly layout = signal<DocTemplate | null>(null);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly id = computed(() => this.params()?.get('id') ?? '');
  protected readonly inv = computed(() => this.store.invoice(this.id()));
  protected readonly proforma = computed(() => this.store.proforma(this.inv()?.proformaId ?? ''));
  protected readonly proformaNo = computed(() => this.proforma()?.number ?? '');
  protected readonly customer = computed(() => this.store.customer(this.inv()?.customerId ?? ''));
  protected readonly payments = computed(() => this.proforma()?.payments ?? []);
  protected readonly toast = signal('');

  /** Paid and due come from the proforma's payments, measured against this invoice's total. */
  protected readonly pay = computed(() => {
    const v = this.inv();
    if (!v) return { total: 0, paid: 0, due: 0, status: 'unpaid' as const };
    const total = this.store.totals(v).total;
    const paid = Math.round(this.payments().reduce((s, x) => s + (x.amount || 0), 0) * 100) / 100;
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    return { total, paid, due, status: paid <= 0 ? ('unpaid' as const) : due > 0 ? ('part' as const) : ('paid' as const) };
  });

  protected readonly shareLink = computed(() => {
    const v = this.inv();
    const c = this.customer();
    if (!v || !c) return '';
    const co = this.store.company();
    const due = this.pay().due;
    const text =
      `Dear ${c.contact || c.name},\n\nPlease find our tax invoice *${v.number}* dated ${fmtDate(v.date)} ` +
      `for *${inr(this.pay().total)}* (incl. GST).` +
      (this.pay().paid > 0 ? `\nReceived: ${inr(this.pay().paid)} · Balance: *${inr(due)}*` : '') +
      (due > 0 ? `\n\n${co.upiId ? `Pay by UPI: ${co.upiId}\n` : ''}Bank details: ${co.bank}` : '\n\nThank you, this invoice is fully paid.') +
      `\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  constructor() {
    if (history.state?.issued) setTimeout(() => this.flash('Tax invoice issued.'));
  }

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2600);
  }

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }

  money = inr;
}
