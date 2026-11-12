import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Customer, STATES, Store, fmtDate, inr, today } from '../store';
import { StatusBadge } from './status-badge';
import { waLink } from './share';
import { downloadCsv } from './csv';
import { isEmbedded } from '../memory-location';

type Tab = 'statement' | 'quotes';

/** Customer page: contact, totals, a running statement (ledger) and their quotes. */
@Component({
  selector: 'app-customer-detail',
  imports: [RouterLink, FormsModule, StatusBadge],
  template: `
    @if (customer(); as c) {
      <section class="page">
        <div class="page-head no-print">
          <a routerLink="/customers" class="back" aria-label="Back to customers">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="avatar" aria-hidden="true">{{ c.name.charAt(0) }}</div>
          <div class="grow">
            <h1 class="page-title cd-title">{{ c.name }}</h1>
            <div class="card-meta">{{ c.contact }}{{ c.contact && c.state ? ' · ' : '' }}{{ c.state }}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" (click)="startEdit(c)">Edit</button>
        </div>

        @if (editing(); as e) {
          <div class="form-card no-print">
            <div class="field"><label for="c-name">Business name</label><input id="c-name" [(ngModel)]="e.name" /></div>
            <div class="grid-2">
              <div class="field"><label for="c-contact">Contact person</label><input id="c-contact" [(ngModel)]="e.contact" /></div>
              <div class="field"><label for="c-phone">WhatsApp number</label><input id="c-phone" inputmode="tel" [(ngModel)]="e.phone" /></div>
            </div>
            <div class="grid-2">
              <div class="field"><label for="c-gst">GSTIN</label><input id="c-gst" [(ngModel)]="e.gstin" /></div>
              <div class="field">
                <label for="c-state">State</label>
                <select id="c-state" [(ngModel)]="e.state">
                  @for (s of states; track s) { <option [value]="s">{{ s }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label for="c-addr">Address</label><input id="c-addr" [(ngModel)]="e.address" /></div>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" [disabled]="!e.name" (click)="saveEdit()">Save customer</button>
              <button type="button" class="btn btn-ghost" (click)="editing.set(null)">Cancel</button>
            </div>
          </div>
        }

        <div class="cd-contact no-print">
          @if (c.phone) {
            <a class="btn btn-ghost btn-sm" [href]="'tel:' + c.phone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>
              Call
            </a>
          }
          <a class="btn btn-ghost btn-sm" routerLink="/quotes/new" [state]="{ customerId: c.id }">+ New quote</a>
          @if (c.gstin) {
            <span class="card-meta">GSTIN {{ c.gstin }}</span>
          }
        </div>

        <div class="cd-tiles hx-stagger no-print">
          <div class="cd-tile"><span>Quotes</span><b>{{ quotes().length }}</b><small>{{ wonCount() }} won</small></div>
          <div class="cd-tile"><span>Billed</span><b>{{ money(billed()) }}</b><small>{{ proformaCount() }} {{ proformaCount() === 1 ? 'proforma' : 'proformas' }}</small></div>
          <div class="cd-tile"><span>Received</span><b class="pay-green">{{ money(received()) }}</b><small>{{ paymentCount() }} {{ paymentCount() === 1 ? 'payment' : 'payments' }}</small></div>
          <div class="cd-tile" [class.cd-due]="balance() > 0"><span>Balance due</span><b>{{ money(balance()) }}</b><small>{{ balance() > 0 ? 'to collect' : 'all clear' }}</small></div>
        </div>

        <div class="seg seg-2 no-print" role="tablist" aria-label="Customer view">
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'statement'" [class.on]="tab() === 'statement'" (click)="tab.set('statement')">Statement</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'quotes'" [class.on]="tab() === 'quotes'" (click)="tab.set('quotes')">Quotes ({{ quotes().length }})</button>
        </div>

        @if (tab() === 'statement') {
          <div class="btn-row no-print cd-actions">
            @if (c.phone) {
              <a class="btn btn-whatsapp btn-sm" [href]="statementLink()" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>
                Send statement
              </a>
            }
            <button type="button" class="btn btn-ghost btn-sm" (click)="print()">Download PDF</button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="exportCsv(c)">Export CSV</button>
          </div>

          <article class="doc print-area st-doc" [style.--doc]="company().color">
            <header class="st-head">
              <div>
                <div class="doc-company-name">{{ company().name }}</div>
                <div class="doc-small">{{ company().address }}</div>
                <div class="doc-small">GSTIN {{ company().gstin }}</div>
              </div>
              <div class="st-title">
                <div class="doc-kind">Statement of account</div>
                <div class="doc-small">As on {{ d(todayStr) }}</div>
              </div>
            </header>
            <div class="st-party">
              <div class="doc-label">Customer</div>
              <div class="doc-strong">{{ c.name }}</div>
              <div class="doc-small">{{ c.address }}{{ c.address ? ', ' : '' }}{{ c.state }}</div>
            </div>
            <div class="doc-table-wrap">
              <table class="doc-table st-table">
                <thead>
                  <tr>
                    <th class="left">Date</th>
                    <th class="left">Particulars</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of ledger(); track $index) {
                    <tr>
                      <td class="left nowrap">{{ d(r.date) }}</td>
                      <td class="left">
                        <a [routerLink]="r.link" class="st-ref">{{ r.ref }}</a>
                        <div class="doc-small">{{ r.text }}</div>
                      </td>
                      <td>{{ r.debit ? money(r.debit) : '' }}</td>
                      <td class="st-cr">{{ r.credit ? money(r.credit) : '' }}</td>
                      <td><b>{{ money(r.balance) }}</b></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="left doc-small">No proformas or payments yet.</td></tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td class="left" colspan="2"><b>Closing balance</b></td>
                    <td><b>{{ money(billed()) }}</b></td>
                    <td><b>{{ money(received()) }}</b></td>
                    <td><b>{{ money(balance()) }}</b></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p class="doc-small st-foot">Debit = proforma invoices raised. Credit = payments received. Please report any difference within 7 days.</p>
          </article>
        } @else {
          <div class="list list-grid">
            @for (q of quotes(); track q.id) {
              <a class="card card-link" [routerLink]="['/quotes', q.id]">
                <div class="card-row">
                  <div>
                    <div class="card-title">{{ q.number }}</div>
                    <div class="card-meta">{{ d(q.date) }}{{ q.preparedBy ? ' · ' + q.preparedBy : '' }}</div>
                  </div>
                  <div class="right">
                    <div class="card-amount">{{ money(store.totals(q).total) }}</div>
                    <app-status-badge [status]="q.status" />
                  </div>
                </div>
              </a>
            } @empty {
              <div class="empty">No quotes for this customer yet.</div>
            }
          </div>
        }
      </section>
    } @else {
      <section class="page"><div class="empty">Customer not found. <a routerLink="/customers" class="link">Back to customers</a></div></section>
    }
    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class CustomerDetail {
  protected readonly store = inject(Store);
  protected readonly states = STATES;
  protected readonly company = this.store.company;
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly id = computed(() => this.params()?.get('id') ?? '');
  protected readonly customer = computed(() => this.store.customer(this.id()));
  protected readonly tab = signal<Tab>('statement');
  protected readonly editing = signal<Customer | null>(null);
  protected readonly toast = signal('');
  protected readonly todayStr = today(0);

  protected readonly quotes = computed(() => this.store.quotes().filter((q) => q.customerId === this.id()));
  protected readonly wonCount = computed(() => this.quotes().filter((q) => q.status === 'won').length);
  protected readonly ledger = computed(() => {
    this.store.proformas();
    return this.store.ledger(this.id());
  });
  protected readonly billed = computed(() => this.ledger().reduce((s, r) => s + r.debit, 0));
  protected readonly received = computed(() => this.ledger().reduce((s, r) => s + r.credit, 0));
  protected readonly balance = computed(() => Math.round((this.billed() - this.received()) * 100) / 100);
  protected readonly proformaCount = computed(() => this.ledger().filter((r) => r.kind === 'proforma').length);
  protected readonly paymentCount = computed(() => this.ledger().filter((r) => r.kind === 'payment').length);

  protected readonly statementLink = computed(() => {
    const c = this.customer();
    if (!c) return '';
    const co = this.store.company();
    const lines = this.store.receivables().filter((r) => r.p.customerId === c.id);
    const text =
      `Dear ${c.contact || c.name},\n\nStatement of account as on ${fmtDate(this.todayStr)}:\n` +
      `Billed: ${inr(this.billed())}\nReceived: ${inr(this.received())}\n*Balance due: ${inr(this.balance())}*\n` +
      (lines.length ? `\nPending:\n` + lines.map((r) => `• ${r.p.number} (${fmtDate(r.p.date)}): ${inr(r.due)}`).join('\n') + '\n' : '') +
      `\n${co.upiId && this.balance() > 0 ? `Pay by UPI: ${co.upiId}\n` : ''}Bank details: ${co.bank}\n\nRegards,\n${co.name}\n${co.phone}`;
    return waLink(c.phone, text);
  });

  startEdit(c: Customer) {
    this.editing.set({ ...c });
  }

  saveEdit() {
    const e = this.editing();
    if (e) this.store.saveCustomer(e);
    this.editing.set(null);
    this.flash('Customer updated');
  }

  exportCsv(c: Customer) {
    const rows: (string | number)[][] = [['Date', 'Reference', 'Particulars', 'Debit', 'Credit', 'Balance']];
    for (const r of this.ledger()) rows.push([r.date, r.ref, r.text, r.debit || '', r.credit || '', r.balance]);
    downloadCsv(`statement-${c.name.replace(/[^\w]+/g, '-').toLowerCase()}-${this.todayStr}`, rows);
  }

  print() {
    if (isEmbedded()) {
      this.flash('PDF download works in the installed app or your hosted site.');
      return;
    }
    window.print();
  }

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2400);
  }

  money = inr;
  d = fmtDate;
}
