import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DocTemplate, LineItem, Payment, Store, fmtDate, inWords, inr } from '../store';

interface Line {
  i: LineItem;
  gross: number;
  taxable: number;
  tax: number;
  amount: number;
}

interface HsnRow {
  hsn: string;
  gst: number;
  taxable: number;
  tax: number;
}

/** Branded document used for both quotations and proforma invoices. Prints as the PDF. */
@Component({
  selector: 'app-doc-view',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #paidRows>
      @if (received() > 0) {
        <div class="row doc-paid"><span>Received</span><span>− {{ money(received()) }}</span></div>
        <div class="row doc-due"><span>Balance due</span><span>{{ money(due()) }}</span></div>
      }
    </ng-template>
    <ng-template #upiBox>
      @if (upiQr()) {
        <div class="doc-upi">
          <img [src]="upiQr()" alt="UPI payment QR code" class="doc-upi-qr" />
          <div>
            <div class="doc-label">Scan to pay with any UPI app</div>
            <div class="doc-strong">{{ money(due()) }}</div>
            <div class="doc-small">UPI ID: {{ company().upiId }}</div>
          </div>
        </div>
      }
    </ng-template>

    @switch (tpl()) {
      <!-- ===================== MODERN ===================== -->
      @case ('modern') {
        <article class="doc print-area t-modern" [style.--doc]="company().color">
          <header class="tm-band">
            <div class="tm-brand">
              @if (company().logo) {
                <img [src]="company().logo" alt="" class="tm-logo" />
              }
              <div>
                <div class="tm-company">{{ company().name }}</div>
                <div class="tm-band-small">{{ company().address }}</div>
                <div class="tm-band-small">GSTIN {{ company().gstin }}</div>
              </div>
            </div>
            <div class="tm-title">
              <div class="tm-kind">{{ kind() }}</div>
              <div class="tm-no">{{ number() }}@if (revision() > 1) { · Rev {{ revision() }} }</div>
            </div>
          </header>

          <div class="tm-meta">
            <div class="tm-card">
              <div class="doc-label">Bill to</div>
              <div class="doc-strong">{{ customer()?.name }}</div>
              @if (customer()?.contact) {
                <div class="doc-small">Attn: {{ customer()?.contact }}@if (customer()?.phone) { · {{ customer()?.phone }} }</div>
              }
              <div class="doc-small">{{ customer()?.address }}, {{ customer()?.state }}</div>
              @if (customer()?.gstin) {
                <div class="doc-small">GSTIN: {{ customer()?.gstin }}</div>
              }
            </div>
            <div class="tm-card">
              <div class="doc-label">{{ kind() }} details</div>
              <dl class="tm-kv">
                <dt>Date</dt><dd>{{ d(date()) }}</dd>
                @if (validTill()) { <dt>Valid till</dt><dd>{{ d(validTill()) }}</dd> }
                <dt>Place of supply</dt><dd>{{ customer()?.state }}</dd>
                <dt>Tax type</dt><dd>{{ t().interState ? 'IGST (inter-state)' : 'CGST + SGST' }}</dd>
              </dl>
            </div>
          </div>

          <div class="doc-table-wrap">
            <table class="doc-table tm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th class="left">Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Disc</th>
                  <th>GST</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (l of lines(); track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td class="left">
                      <div class="tm-item">{{ l.i.name }}</div>
                      <div class="tm-item-sub">HSN/SAC {{ l.i.hsn }}</div>
                    </td>
                    <td>{{ l.i.qty }} {{ l.i.unit }}</td>
                    <td>{{ money(l.i.rate) }}</td>
                    <td>{{ l.i.discount ? l.i.discount + '%' : '–' }}</td>
                    <td>{{ l.i.gst }}%</td>
                    <td>{{ money(l.taxable) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <section class="tm-bottom">
            <div class="tm-left">
              <div class="tm-words">
                <div class="doc-label">Amount in words</div>
                <div class="doc-strong">{{ words() }}</div>
              </div>
              <div class="tm-box">
                <div class="doc-label">Bank details</div>
                <div class="doc-small">{{ company().bank }}</div>
                <ng-container [ngTemplateOutlet]="upiBox" />
              </div>
              <div class="tm-box">
                <div class="doc-label">Terms &amp; conditions</div>
                <div class="doc-small pre">{{ notes() || company().terms }}</div>
              </div>
            </div>
            <div class="tm-totals">
              <div class="row"><span>Subtotal</span><span>{{ money(t().subtotal) }}</span></div>
              @if (t().discount) {
                <div class="row"><span>Discount</span><span>− {{ money(t().discount) }}</span></div>
              }
              <div class="row"><span>Taxable value</span><span>{{ money(t().taxable) }}</span></div>
              @if (t().interState) {
                <div class="row"><span>IGST</span><span>{{ money(t().igst) }}</span></div>
              } @else {
                <div class="row"><span>CGST</span><span>{{ money(t().cgst) }}</span></div>
                <div class="row"><span>SGST</span><span>{{ money(t().sgst) }}</span></div>
              }
              @if (roundOff()) {
                <div class="row"><span>Round off</span><span>{{ signed(roundOff()) }}</span></div>
              }
              <div class="tm-grand"><span>Total</span><span>{{ money(t().total) }}</span></div>
              <ng-container [ngTemplateOutlet]="paidRows" />
            </div>
          </section>

          <div class="doc-push"></div>
          <footer class="tm-foot">
            <div class="tm-thanks">Thank you for your business!</div>
            <div class="tm-sign">
              <div class="tm-sign-line"></div>
              For {{ company().name }}<br /><span class="doc-small">Authorised signatory</span>
            </div>
          </footer>
          <div class="tm-strip">{{ company().phone }} · {{ company().email }}</div>
        </article>
      }

      <!-- ===================== GST / ERP ===================== -->
      @case ('gst') {
        <article class="doc print-area t-gst" [style.--doc]="company().color">
          <div class="tg">
            <div class="tg-title">{{ kind() }}</div>

            <div class="tg-row tg-2">
              <div class="tg-cell tg-company">
                @if (company().logo) {
                  <img [src]="company().logo" alt="" class="tg-logo" />
                }
                <div>
                  <div class="tg-name">{{ company().name }}</div>
                  <div>{{ company().address }}</div>
                  <div>Ph: {{ company().phone }} · {{ company().email }}</div>
                  <div><b>GSTIN/UIN:</b> {{ company().gstin }}</div>
                  <div><b>State:</b> {{ company().state }}</div>
                </div>
              </div>
              <div class="tg-cell tg-pad0">
                <div class="tg-kv">
                  <div><span>{{ kind() }} No.</span><b>{{ number() }}</b></div>
                  <div><span>Dated</span><b>{{ d(date()) }}</b></div>
                  <div><span>Valid till</span><b>{{ validTill() ? d(validTill()) : '—' }}</b></div>
                  <div><span>Revision</span><b>{{ revision() }}</b></div>
                  <div><span>Place of supply</span><b>{{ customer()?.state }}</b></div>
                  <div><span>Reverse charge</span><b>No</b></div>
                </div>
              </div>
            </div>

            <div class="tg-row tg-2">
              <div class="tg-cell">
                <div class="tg-label">Buyer (Bill to)</div>
                <div class="tg-name2">{{ customer()?.name }}</div>
                <div>{{ customer()?.address }}</div>
                <div><b>State:</b> {{ customer()?.state }}</div>
                <div><b>GSTIN/UIN:</b> {{ customer()?.gstin || 'Unregistered' }}</div>
              </div>
              <div class="tg-cell">
                <div class="tg-label">Consignee (Ship to)</div>
                <div class="tg-name2">{{ customer()?.name }}</div>
                <div>{{ customer()?.address }}</div>
                @if (customer()?.contact) {
                  <div><b>Contact:</b> {{ customer()?.contact }}@if (customer()?.phone) { · {{ customer()?.phone }} }</div>
                }
              </div>
            </div>

            <table class="tg-table">
              <thead>
                <tr>
                  <th>Sr</th>
                  <th class="left">Description of goods / services</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Disc %</th>
                  <th>Taxable value</th>
                  <th>GST %</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (l of lines(); track $index) {
                  <tr>
                    <td class="c">{{ $index + 1 }}</td>
                    <td class="left"><b>{{ l.i.name }}</b></td>
                    <td class="c">{{ l.i.hsn }}</td>
                    <td>{{ l.i.qty }}</td>
                    <td class="c">{{ l.i.unit }}</td>
                    <td>{{ num(l.i.rate) }}</td>
                    <td>{{ l.i.discount || '' }}</td>
                    <td>{{ num(l.taxable) }}</td>
                    <td>{{ l.i.gst }}%</td>
                    <td>{{ num(l.amount) }}</td>
                  </tr>
                }
                @for (f of fillers(); track $index) {
                  <tr class="tg-filler"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td class="left"><b>Total</b></td>
                  <td></td>
                  <td><b>{{ totalQty() }}</b></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><b>{{ num(t().taxable) }}</b></td>
                  <td></td>
                  <td><b>{{ num(t().taxable + taxTotal()) }}</b></td>
                </tr>
              </tfoot>
            </table>

            <div class="tg-row tg-sum">
              <div class="tg-cell">
                <div class="tg-label">Amount chargeable (in words)</div>
                <div class="tg-words">{{ words() }}</div>
                <ng-container [ngTemplateOutlet]="upiBox" />
              </div>
              <div class="tg-cell tg-pad0">
                <div class="tg-tot">
                  <div><span>Gross amount</span><span>{{ num(t().subtotal) }}</span></div>
                  @if (t().discount) {
                    <div><span>Less: discount</span><span>−{{ num(t().discount) }}</span></div>
                  }
                  <div><span>Taxable value</span><span>{{ num(t().taxable) }}</span></div>
                  @if (t().interState) {
                    <div><span>IGST</span><span>{{ num(t().igst) }}</span></div>
                  } @else {
                    <div><span>CGST</span><span>{{ num(t().cgst) }}</span></div>
                    <div><span>SGST</span><span>{{ num(t().sgst) }}</span></div>
                  }
                  <div><span>Round off</span><span>{{ signedNum(roundOff()) }}</span></div>
                  <div class="tg-grand"><span>Grand total</span><span>{{ money(t().total) }}</span></div>
                  <ng-container [ngTemplateOutlet]="paidRows" />
                </div>
              </div>
            </div>

            <table class="tg-table tg-hsn">
              <thead>
                @if (t().interState) {
                  <tr>
                    <th class="left" rowspan="2">HSN/SAC</th>
                    <th rowspan="2">Taxable value</th>
                    <th colspan="2">IGST</th>
                    <th rowspan="2">Total tax</th>
                  </tr>
                  <tr><th>Rate</th><th>Amount</th></tr>
                } @else {
                  <tr>
                    <th class="left" rowspan="2">HSN/SAC</th>
                    <th rowspan="2">Taxable value</th>
                    <th colspan="2">CGST</th>
                    <th colspan="2">SGST/UTGST</th>
                    <th rowspan="2">Total tax</th>
                  </tr>
                  <tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr>
                }
              </thead>
              <tbody>
                @for (h of hsn(); track h.hsn + h.gst) {
                  <tr>
                    <td class="left">{{ h.hsn }}</td>
                    <td>{{ num(h.taxable) }}</td>
                    @if (t().interState) {
                      <td>{{ h.gst }}%</td><td>{{ num(h.tax) }}</td>
                    } @else {
                      <td>{{ h.gst / 2 }}%</td><td>{{ num(h.tax / 2) }}</td>
                      <td>{{ h.gst / 2 }}%</td><td>{{ num(h.tax / 2) }}</td>
                    }
                    <td>{{ num(h.tax) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td class="left"><b>Total</b></td>
                  <td><b>{{ num(t().taxable) }}</b></td>
                  @if (t().interState) {
                    <td></td><td><b>{{ num(t().igst) }}</b></td>
                  } @else {
                    <td></td><td><b>{{ num(t().cgst) }}</b></td>
                    <td></td><td><b>{{ num(t().sgst) }}</b></td>
                  }
                  <td><b>{{ num(taxTotal()) }}</b></td>
                </tr>
              </tfoot>
            </table>
            <div class="tg-row">
              <div class="tg-cell"><b>Tax amount (in words):</b> {{ taxWords() }}</div>
            </div>

            <div class="tg-row tg-2 tg-grow">
              <div class="tg-cell">
                <div class="tg-label">Company's bank details</div>
                <div>{{ company().bank }}</div>
                <div class="tg-label" style="margin-top: 8px">Terms &amp; conditions</div>
                <div class="pre">{{ notes() || company().terms }}</div>
                <div class="tg-label" style="margin-top: 8px">Declaration</div>
                <div>We declare that this {{ kind().toLowerCase() }} shows the actual price of the goods described and that all particulars are true and correct.</div>
              </div>
              <div class="tg-cell tg-signs">
                <div class="tg-sign-box">
                  <div class="tg-for">For {{ company().name }}</div>
                  <div class="tg-sign-space"></div>
                  <div>Authorised signatory</div>
                </div>
                <div class="tg-sign-box tg-cust">
                  <div class="tg-sign-space"></div>
                  <div>Customer's seal &amp; signature</div>
                </div>
              </div>
            </div>
          </div>
          <div class="tg-note">This is a computer generated document.</div>
        </article>
      }

      <!-- ===================== ELEGANT ===================== -->
      @case ('elegant') {
        <article class="doc print-area t-elegant" [style.--doc]="company().color">
          <header class="te-head">
            <div class="te-brand">
              @if (company().logo) {
                <img [src]="company().logo" alt="" class="te-logo" />
              }
              <div class="te-company">{{ company().name }}</div>
            </div>
            <div class="te-kind">{{ kind() }}</div>
          </header>
          <div class="te-rule"></div>

          <section class="te-meta">
            <div>
              <div class="te-label">Billed to</div>
              <div class="doc-strong">{{ customer()?.name }}</div>
              <div class="doc-small">{{ customer()?.address }}, {{ customer()?.state }}</div>
              @if (customer()?.gstin) {
                <div class="doc-small">GSTIN {{ customer()?.gstin }}</div>
              }
            </div>
            <div>
              <div class="te-label">Reference</div>
              <div class="doc-small"><b>{{ number() }}</b>@if (revision() > 1) { · Rev {{ revision() }} }</div>
              <div class="doc-small">Issued {{ d(date()) }}</div>
              @if (validTill()) {
                <div class="doc-small">Valid till {{ d(validTill()) }}</div>
              }
            </div>
            <div class="te-due">
              <div class="te-label">Total amount</div>
              <div class="te-due-amt">{{ money(t().total) }}</div>
              <div class="doc-small">incl. GST</div>
            </div>
          </section>

          <div class="doc-table-wrap">
            <table class="doc-table te-table">
              <thead>
                <tr>
                  <th class="left">Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>GST</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (l of lines(); track $index) {
                  <tr>
                    <td class="left">
                      <div class="te-item">{{ l.i.name }}</div>
                      <div class="te-item-sub">HSN {{ l.i.hsn }}@if (l.i.discount) { · {{ l.i.discount }}% discount }</div>
                    </td>
                    <td>{{ l.i.qty }} {{ l.i.unit }}</td>
                    <td>{{ money(l.i.rate) }}</td>
                    <td>{{ l.i.gst }}%</td>
                    <td>{{ money(l.taxable) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <section class="te-sum">
            <div class="te-words">{{ words() }}</div>
            <div class="te-totals">
              <div class="row"><span>Subtotal</span><span>{{ money(t().subtotal) }}</span></div>
              @if (t().discount) {
                <div class="row"><span>Discount</span><span>− {{ money(t().discount) }}</span></div>
              }
              @if (t().interState) {
                <div class="row"><span>IGST</span><span>{{ money(t().igst) }}</span></div>
              } @else {
                <div class="row"><span>CGST</span><span>{{ money(t().cgst) }}</span></div>
                <div class="row"><span>SGST</span><span>{{ money(t().sgst) }}</span></div>
              }
              <div class="row te-grand"><span>Total</span><span>{{ money(t().total) }}</span></div>
              <ng-container [ngTemplateOutlet]="paidRows" />
            </div>
          </section>

          <section class="te-info">
            <div>
              <div class="te-label">Terms</div>
              <div class="doc-small pre">{{ notes() || company().terms }}</div>
            </div>
            <div>
              <div class="te-label">Payment</div>
              <div class="doc-small">{{ company().bank }}</div>
              <ng-container [ngTemplateOutlet]="upiBox" />
            </div>
          </section>

          <div class="doc-push"></div>
          <footer class="te-foot">
            <div class="te-sign">
              <div class="te-sign-line"></div>
              Authorised signatory, {{ company().name }}
            </div>
            <div class="te-contact">
              <span>{{ company().address }}</span>
              <span>{{ company().phone }} · {{ company().email }} · GSTIN {{ company().gstin }}</span>
            </div>
          </footer>
        </article>
      }

      <!-- ===================== CLASSIC (original) ===================== -->
      @default {
        <article class="doc print-area" [style.--doc]="company().color">
          <header class="doc-head">
            <div class="doc-company">
              @if (company().logo) {
                <img [src]="company().logo" alt="" class="doc-logo" />
              }
              <div>
                <div class="doc-company-name">{{ company().name }}</div>
                <div class="doc-small">{{ company().address }}</div>
                <div class="doc-small">{{ company().phone }} · {{ company().email }}</div>
                <div class="doc-small">GSTIN: {{ company().gstin }}</div>
              </div>
            </div>
            <div class="doc-title">
              <div class="doc-kind">{{ kind() }}</div>
              <div class="doc-small"><strong>{{ number() }}</strong>@if (revision() > 1) { · Rev {{ revision() }} }</div>
              <div class="doc-small">Date: {{ d(date()) }}</div>
              @if (validTill()) {
                <div class="doc-small">Valid till: {{ d(validTill()) }}</div>
              }
            </div>
          </header>

          <section class="doc-to">
            <div class="doc-label">Bill to</div>
            <div class="doc-strong">{{ customer()?.name }}</div>
            <div class="doc-small">{{ customer()?.address }}, {{ customer()?.state }}</div>
            @if (customer()?.gstin) {
              <div class="doc-small">GSTIN: {{ customer()?.gstin }}</div>
            }
          </section>

          <div class="doc-table-wrap">
            <table class="doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th class="left">Item</th>
                  <th>HSN</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Disc</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (i of items(); track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td class="left">{{ i.name }}</td>
                    <td>{{ i.hsn }}</td>
                    <td>{{ i.qty }} {{ i.unit }}</td>
                    <td>{{ money(i.rate) }}</td>
                    <td>{{ i.discount ? i.discount + '%' : '–' }}</td>
                    <td>{{ money(lineAmount(i)) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <section class="doc-bottom">
            <div class="doc-terms">
              <div class="doc-label">Bank details</div>
              <div class="doc-small">{{ company().bank }}</div>
              <ng-container [ngTemplateOutlet]="upiBox" />
              <div class="doc-label" style="margin-top: 10px">Terms &amp; conditions</div>
              <div class="doc-small" style="white-space: pre-line">{{ notes() || company().terms }}</div>
            </div>
            <div class="doc-totals">
              <div class="row"><span>Subtotal</span><span>{{ money(t().subtotal) }}</span></div>
              @if (t().discount) {
                <div class="row"><span>Discount</span><span>− {{ money(t().discount) }}</span></div>
              }
              <div class="row"><span>Taxable value</span><span>{{ money(t().taxable) }}</span></div>
              @if (t().interState) {
                <div class="row"><span>IGST</span><span>{{ money(t().igst) }}</span></div>
              } @else {
                <div class="row"><span>CGST</span><span>{{ money(t().cgst) }}</span></div>
                <div class="row"><span>SGST</span><span>{{ money(t().sgst) }}</span></div>
              }
              <div class="row grand"><span>Total</span><span>{{ money(t().total) }}</span></div>
              <ng-container [ngTemplateOutlet]="paidRows" />
            </div>
          </section>
          <footer class="doc-sign">For {{ company().name }}<br /><span class="doc-small">Authorised signatory</span></footer>
        </article>
      }
    }
  `,
})
export class DocView {
  private readonly store = inject(Store);
  readonly kind = input.required<string>();
  readonly number = input.required<string>();
  readonly date = input.required<string>();
  readonly validTill = input('');
  readonly revision = input(1);
  readonly customerId = input.required<string>();
  readonly items = input.required<LineItem[]>();
  readonly notes = input('');
  /** Layout to show; falls back to the business default from Settings. */
  readonly template = input<DocTemplate | null>(null);
  /** Payments received (proformas only) — shows Received / Balance due. */
  readonly payments = input<Payment[] | null>(null);
  /** Show a UPI QR for the balance due (proformas only, needs a UPI ID in Settings). */
  readonly showUpi = input(false);

  readonly company = this.store.company;
  readonly tpl = computed(() => this.template() || this.store.docTemplate());
  readonly customer = computed(() => this.store.customer(this.customerId()));
  readonly t = computed(() => this.store.totals({ items: this.items(), customerId: this.customerId() }));
  readonly taxTotal = computed(() => r2(this.t().cgst + this.t().sgst + this.t().igst));
  readonly roundOff = computed(() => r2(this.t().total - (this.t().taxable + this.taxTotal())));
  readonly words = computed(() => inWords(this.t().total));
  readonly taxWords = computed(() => inWords(this.taxTotal()));
  readonly received = computed(() => Math.round((this.payments() ?? []).reduce((s, p) => s + (p.amount || 0), 0) * 100) / 100);
  readonly due = computed(() => Math.max(0, Math.round((this.t().total - this.received()) * 100) / 100));
  /** upi://pay deep link for the balance due; any UPI app can scan it. */
  readonly upiLink = computed(() => {
    const co = this.company();
    if (!this.showUpi() || !co.upiId || this.due() <= 0) return '';
    const q = new URLSearchParams({ pa: co.upiId, pn: co.upiName || co.name, am: this.due().toFixed(2), cu: 'INR', tn: this.number() });
    return 'upi://pay?' + q.toString().replace(/\+/g, '%20');
  });
  readonly upiQr = signal('');
  readonly totalQty = computed(() => this.items().reduce((s, i) => s + (i.qty || 0), 0));

  readonly lines = computed<Line[]>(() =>
    this.items().map((i) => {
      const gross = (i.qty || 0) * (i.rate || 0);
      const taxable = r2(gross * (1 - (i.discount || 0) / 100));
      const tax = r2(taxable * ((i.gst || 0) / 100));
      return { i, gross, taxable, tax, amount: r2(taxable + tax) };
    }),
  );

  /** HSN-wise tax summary, as required on GST invoices. */
  readonly hsn = computed<HsnRow[]>(() => {
    const map = new Map<string, HsnRow>();
    for (const l of this.lines()) {
      const key = l.i.hsn + '|' + l.i.gst;
      const row = map.get(key) ?? { hsn: l.i.hsn, gst: l.i.gst, taxable: 0, tax: 0 };
      row.taxable = r2(row.taxable + l.taxable);
      row.tax = r2(row.tax + l.tax);
      map.set(key, row);
    }
    return [...map.values()];
  });

  /** Blank rows so the boxed GST table keeps an invoice-like height with few items. */
  readonly fillers = computed(() => Array(Math.max(0, 6 - this.items().length)).fill(0));

  constructor() {
    effect(() => {
      const link = this.upiLink();
      if (!link) {
        this.upiQr.set('');
        return;
      }
      // Loaded on demand: only proformas with a balance need the QR library
      import('qrcode')
        .then((QRCode) => (QRCode.toDataURL ?? (QRCode as unknown as { default: typeof QRCode }).default.toDataURL)(link, { margin: 1, width: 240, errorCorrectionLevel: 'M' }))
        .then((url) => {
          if (this.upiLink() === link) this.upiQr.set(url);
        })
        .catch(() => this.upiQr.set(''));
    });
  }

  money = inr;
  d = fmtDate;
  num(n: number) {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  }
  signed(n: number) {
    return (n < 0 ? '− ' : '+ ') + inr(Math.abs(n));
  }
  signedNum(n: number) {
    return (n < 0 ? '−' : '') + this.num(Math.abs(n));
  }
  lineAmount(i: LineItem) {
    return i.qty * i.rate * (1 - (i.discount || 0) / 100);
  }
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
