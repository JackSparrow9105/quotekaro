import { Component, computed, inject, input } from '@angular/core';
import { LineItem, Store, fmtDate, inr } from '../store';

/** Branded document preview used for both quotations and proforma invoices. Prints as the PDF. */
@Component({
  selector: 'app-doc-view',
  template: `
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
        </div>
      </section>
      <footer class="doc-sign">For {{ company().name }}<br /><span class="doc-small">Authorised signatory</span></footer>
    </article>
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

  readonly company = this.store.company;
  readonly customer = computed(() => this.store.customer(this.customerId()));
  readonly t = computed(() => this.store.totals({ items: this.items(), customerId: this.customerId() }));

  money = inr;
  d = fmtDate;
  lineAmount(i: LineItem) {
    return i.qty * i.rate * (1 - (i.discount || 0) / 100);
  }
}
