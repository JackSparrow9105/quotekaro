import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store, fmtDate, inr, today } from '../store';
import { DocView } from './doc-view';
import { StatusBadge } from './status-badge';
import { waLink } from './share';
import { isEmbedded } from '../memory-location';

@Component({
  selector: 'app-quote-detail',
  imports: [RouterLink, FormsModule, DocView, StatusBadge],
  template: `
    @if (quote(); as q) {
      <section class="page">
        <div class="page-head no-print">
          <a routerLink="/quotes" class="back" aria-label="Back to quotes">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="grow">
            <h1 class="page-title">{{ q.number }}</h1>
            <div class="card-meta">{{ customer()?.name }}</div>
          </div>
          <app-status-badge [status]="q.status" />
        </div>

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

        <div class="form-card no-print">
          <div class="label-sm">Status</div>
          <div class="seg" role="group" aria-label="Quote status">
            <button type="button" [class.on]="q.status === 'draft'" (click)="setStatus('draft')">Draft</button>
            <button type="button" [class.on]="q.status === 'sent'" (click)="setStatus('sent')">Sent</button>
            <button type="button" class="won" [class.on]="q.status === 'won'" (click)="setStatus('won')">Won</button>
            <button type="button" class="lost" [class.on]="q.status === 'lost'" (click)="setStatus('lost')">Lost</button>
          </div>

          @if (q.status === 'lost') {
            <div class="field">
              <label for="reason">Reason lost</label>
              <select id="reason" [ngModel]="q.lostReason" (ngModelChange)="store.updateQuote(q.id, { lostReason: $event })">
                <option value="">Select a reason</option>
                <option>Price too high</option>
                <option>Went with competitor</option>
                <option>Project cancelled</option>
                <option>No response</option>
              </select>
            </div>
          }

          @if (q.status === 'draft' || q.status === 'sent') {
            <div class="field">
              <label for="fu">Follow-up reminder</label>
              <div class="field-row">
                <input id="fu" type="date" [ngModel]="q.followUp" (ngModelChange)="store.updateQuote(q.id, { followUp: $event })" />
                <button type="button" class="btn btn-ghost btn-sm" (click)="snooze(2)">+2 days</button>
              </div>
            </div>
          }

          @if (!q.proformaId && q.status !== 'lost') {
            @if (shortages().length) {
              <div class="stock-alert" role="note">
                <div class="stock-alert-title">Not enough stock for this order</div>
                @for (x of shortages(); track x.name) {
                  <div class="card-meta">{{ x.name }}: need {{ x.need }}, have {{ x.have }} {{ x.unit }}</div>
                }
              </div>
            } @else {
              <div class="stock-ok">All items are in stock. Converting to proforma will reserve them.</div>
            }
          }

          <div class="btn-row">
            @if (q.proformaId) {
              <a class="btn btn-primary" [routerLink]="['/proforma', q.proformaId]">View proforma</a>
            } @else if (q.status !== 'lost') {
              <button type="button" class="btn btn-primary" (click)="convert()">Convert to proforma</button>
            }
            <a class="btn btn-ghost" [routerLink]="['/quotes', q.id, 'edit']">Edit</a>
            <button type="button" class="btn btn-ghost" (click)="duplicate()">Duplicate</button>
          </div>
          @if (q.revision > 1) {
            <div class="card-meta">Revision {{ q.revision }} — prices changed after it was sent.</div>
          }
        </div>

        <app-doc-view
          kind="Quotation"
          [number]="q.number"
          [date]="q.date"
          [validTill]="q.validTill"
          [revision]="q.revision"
          [customerId]="q.customerId"
          [items]="q.items"
          [notes]="q.notes"
        />
      </section>
    } @else {
      <section class="page"><div class="empty">Quote not found. <a routerLink="/quotes">Back to quotes</a></div></section>
    }

    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class QuoteDetail {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly id = computed(() => this.params()?.get('id') ?? '');
  protected readonly quote = computed(() => this.store.quote(this.id()));
  protected readonly customer = computed(() => this.store.customer(this.quote()?.customerId ?? ''));
  protected readonly toast = signal('');
  protected readonly shortages = computed(() => this.store.shortages(this.quote()?.items ?? []));

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2200);
  }

  setStatus(status: 'draft' | 'sent' | 'won' | 'lost') {
    const changes: Record<string, unknown> = { status };
    if (status === 'won' || status === 'lost') changes['followUp'] = '';
    if (status === 'sent' && !this.quote()?.followUp) changes['followUp'] = today(3);
    this.store.updateQuote(this.id(), changes);
    this.flash(status === 'won' ? 'Marked as won' : `Marked as ${status}`);
  }

  snooze(days: number) {
    this.store.updateQuote(this.id(), { followUp: today(days) });
    this.flash(`Reminder set for ${fmtDate(today(days))}`);
  }

  protected readonly shareLink = computed(() => {
    const q = this.quote();
    const c = this.customer();
    if (!q || !c) return '';
    const co = this.store.company();
    const total = inr(this.store.totals(q).total);
    const text =
      `Dear ${c.contact || c.name},\n\nPlease find our quotation *${q.number}* for *${total}* (incl. GST).\n` +
      `Valid till ${fmtDate(q.validTill)}.\n\nItems:\n` +
      q.items.map((i) => `• ${i.name} × ${i.qty} ${i.unit}`).join('\n') +
      `\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  onShared() {
    if (this.quote()?.status === 'draft') this.setStatus('sent');
  }

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }

  convert() {
    const pi = this.store.convertToProforma(this.id());
    if (pi) this.router.navigate(['/proforma', pi.id], { state: { stockUpdated: true } });
  }

  duplicate() {
    const copy = this.store.duplicateQuote(this.id());
    if (copy) this.router.navigate(['/quotes', copy.id, 'edit']);
  }
}
