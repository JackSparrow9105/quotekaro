import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocTemplate, PAY_MODES, PayMode, Proforma, Store, fmtDate, inr, today } from '../store';
import { LayoutChooser } from './layout-picker';
import { DocView } from './doc-view';
import { PayBadge } from './pay-badge';
import { waLink } from './share';
import { isEmbedded } from '../memory-location';

@Component({
  selector: 'app-proforma-detail',
  imports: [RouterLink, FormsModule, DocView, LayoutChooser, PayBadge],
  template: `
    @if (pi(); as p) {
      <section class="page">
        <div class="page-head no-print">
          <a [routerLink]="['/quotes', p.quoteId]" class="back" aria-label="Back to quote">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="grow">
            <h1 class="page-title">{{ p.number }}</h1>
            <div class="card-meta">From quote {{ quoteNo() }} · <a [routerLink]="['/customers', p.customerId]" class="link-plain">{{ customer()?.name }}</a></div>
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

            <!-- Payments -->
            <div class="form-card">
              <div class="lc-head">
                <div class="card-title">Payments</div>
                <app-pay-badge [status]="pay().status" />
              </div>
              <div class="pay-sum">
                <div><span>Total</span><b>{{ money(pay().total) }}</b></div>
                <div><span>Received</span><b class="pay-green">{{ money(pay().paid) }}</b></div>
                <div><span>Balance due</span><b [class.pay-red]="pay().due > 0">{{ money(pay().due) }}</b></div>
              </div>
              @if (pay().total > 0) {
                <div class="pay-track" aria-hidden="true"><span class="hx-bar-fill" [style.width.%]="paidPct()"></span></div>
              }

              @for (x of p.payments ?? []; track x.id) {
                <div class="pay-row">
                  <div class="grow">
                    <div class="pay-amt">{{ money(x.amount) }} <span class="card-meta">· {{ x.mode }}</span></div>
                    <div class="card-meta">{{ d(x.date) }}{{ x.ref ? ' · ' + x.ref : '' }}{{ x.note ? ' · ' + x.note : '' }}</div>
                  </div>
                  @if (confirmDel() === x.id) {
                    <button type="button" class="btn btn-ghost danger btn-sm" (click)="removePayment(p.id, x.id)">Delete</button>
                  } @else {
                    <button type="button" class="icon-btn" [attr.aria-label]="'Remove payment of ' + money(x.amount)" (click)="confirmDel.set(x.id)">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                    </button>
                  }
                </div>
              }

              @if (adding()) {
                <div class="inline-form">
                  <div class="grid-2">
                    <div class="field"><label for="pay-amt">Amount ₹</label><input id="pay-amt" type="number" inputmode="decimal" min="0" [(ngModel)]="form.amount" /></div>
                    <div class="field"><label for="pay-date">Date</label><input id="pay-date" type="date" [(ngModel)]="form.date" /></div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label for="pay-mode">Mode</label>
                      <select id="pay-mode" [(ngModel)]="form.mode">
                        @for (m of modes; track m) { <option [value]="m">{{ m }}</option> }
                      </select>
                    </div>
                    <div class="field"><label for="pay-ref">UTR / cheque no.</label><input id="pay-ref" [(ngModel)]="form.ref" /></div>
                  </div>
                  <div class="field"><label for="pay-note">Note (optional)</label><input id="pay-note" placeholder="e.g. Advance, Final payment" [(ngModel)]="form.note" /></div>
                  @if (+form.amount > pay().due && pay().due > 0) {
                    <div class="stock-warn">This is more than the balance due of {{ money(pay().due) }}.</div>
                  }
                  <div class="btn-row">
                    <button type="button" class="btn btn-primary btn-sm" [disabled]="!(+form.amount > 0)" (click)="savePayment(p)">Save payment</button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="adding.set(false)">Cancel</button>
                  </div>
                </div>
              } @else {
                <div class="btn-row">
                  @if (pay().due > 0) {
                    <button type="button" class="btn btn-primary btn-sm" (click)="startPayment()">+ Record payment</button>
                    <a class="btn btn-ghost btn-sm" [href]="reminderLink()" target="_blank" rel="noopener">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>
                      Send reminder
                    </a>
                  } @else {
                    <span class="stock-ok">Fully paid.</span>
                  }
                </div>
              }
              @if (pay().due > 0 && !store.company().upiId) {
                <div class="card-meta">Add your UPI ID in <a routerLink="/settings" class="link">Settings</a> to print a "scan to pay" QR on this proforma.</div>
              }
            </div>

            <!-- Delivery -->
            <div class="form-card">
              <div class="lc-head">
                <div class="card-title">Delivery</div>
                <span [class]="'badge ' + deliveryBadge().cls">{{ deliveryBadge().label }}</span>
              </div>
              <div class="dl-rows">
                @for (r of delivery(); track r.productId) {
                  <div class="dl-row">
                    <span class="grow">{{ r.name }}</span>
                    <span class="dl-qty" [class.done]="r.delivered >= r.ordered">{{ r.delivered }} / {{ r.ordered }} {{ r.unit }}</span>
                  </div>
                }
              </div>
              @for (c of challans(); track c.id) {
                <a class="dl-challan" [routerLink]="['/challans', c.id]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <span class="grow"><b>{{ c.number }}</b> · {{ d(c.date) }}</span>
                  <span class="card-meta">{{ c.vehicle }}</span>
                </a>
              }
              @if (remaining() > 0) {
                <a class="btn btn-ghost btn-sm" routerLink="/challans/new" [queryParams]="{ quote: p.quoteId }">+ Create delivery challan</a>
              }
            </div>

            <app-layout-chooser [(value)]="layout" />
          </aside>

          <div class="detail-main">
            <app-doc-view
              kind="Proforma Invoice"
              [number]="p.number"
              [date]="p.date"
              [customerId]="p.customerId"
              [items]="p.items"
              [notes]="p.notes"
              [template]="layout()"
              [payments]="p.payments ?? []"
              [showUpi]="true"
            />
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
  protected readonly layout = signal<DocTemplate | null>(null);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly id = computed(() => this.params()?.get('id') ?? '');
  protected readonly pi = computed(() => this.store.proforma(this.id()));
  protected readonly customer = computed(() => this.store.customer(this.pi()?.customerId ?? ''));
  protected readonly quoteNo = computed(() => this.store.quote(this.pi()?.quoteId ?? '')?.number ?? '');
  protected readonly toast = signal('');
  protected readonly adding = signal(false);
  protected readonly confirmDel = signal('');
  protected readonly modes = PAY_MODES;
  protected form = this.blankForm();

  protected readonly pay = computed(() => {
    const p = this.pi();
    return p ? this.store.payInfo(p) : { total: 0, paid: 0, due: 0, status: 'unpaid' as const };
  });
  protected readonly paidPct = computed(() => Math.min(100, (this.pay().paid / (this.pay().total || 1)) * 100));

  protected readonly delivery = computed(() => {
    this.store.challans();
    return this.store.deliveryFor(this.pi()?.quoteId ?? '');
  });
  protected readonly challans = computed(() => {
    this.store.challans();
    return this.store.challansFor(this.pi()?.quoteId ?? '');
  });
  protected readonly remaining = computed(() => this.delivery().reduce((s, r) => s + Math.max(0, r.ordered - r.delivered), 0));
  protected readonly deliveryBadge = computed(() => {
    const rows = this.delivery();
    const delivered = rows.reduce((s, r) => s + r.delivered, 0);
    if (!delivered) return { label: 'Not dispatched', cls: 'badge-draft' };
    if (this.remaining() > 0) return { label: 'Part delivered', cls: 'badge-low' };
    return { label: 'Delivered', cls: 'badge-won' };
  });

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2600);
  }

  private blankForm() {
    return { amount: 0 as number | string, date: today(0), mode: 'UPI' as PayMode, ref: '', note: '' };
  }

  protected readonly shareLink = computed(() => {
    const p = this.pi();
    const c = this.customer();
    if (!p || !c) return '';
    const co = this.store.company();
    const due = this.pay().due;
    const text =
      `Dear ${c.contact || c.name},\n\nThank you for your order. Please find proforma invoice *${p.number}* ` +
      `dated ${fmtDate(p.date)} for *${inr(this.pay().total)}* (incl. GST).` +
      (this.pay().paid > 0 ? `\nReceived: ${inr(this.pay().paid)} · Balance: *${inr(due)}*` : '') +
      `\n\n${co.upiId && due > 0 ? `Pay by UPI: ${co.upiId}\n` : ''}Bank details: ${co.bank}\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  protected readonly reminderLink = computed(() => {
    const p = this.pi();
    const c = this.customer();
    if (!p || !c) return '';
    const co = this.store.company();
    const text =
      `Dear ${c.contact || c.name},\n\nThis is a gentle reminder that *${inr(this.pay().due)}* is pending against our proforma invoice ` +
      `*${p.number}* dated ${fmtDate(p.date)} (total ${inr(this.pay().total)}` +
      (this.pay().paid > 0 ? `, received ${inr(this.pay().paid)}` : '') +
      `).\n\n${co.upiId ? `Pay by UPI: ${co.upiId}\n` : ''}Bank details: ${co.bank}\n\nPlease share the payment reference once done. Thank you!\n\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  constructor() {
    if (history.state?.stockUpdated) setTimeout(() => this.flash('Proforma created. Stock updated.'));
  }

  startPayment() {
    this.form = { ...this.blankForm(), amount: this.pay().due };
    this.adding.set(true);
  }

  savePayment(p: Proforma) {
    const amount = Math.round(+this.form.amount * 100) / 100;
    this.store.addPayment(p.id, { amount, date: this.form.date || today(0), mode: this.form.mode, ref: this.form.ref.trim(), note: this.form.note.trim() });
    this.adding.set(false);
    this.flash(`${inr(amount)} recorded`);
  }

  removePayment(piId: string, payId: string) {
    this.store.deletePayment(piId, payId);
    this.confirmDel.set('');
    this.flash('Payment removed');
  }

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }

  money = inr;
  d = fmtDate;
}
