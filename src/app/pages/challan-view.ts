import { Component, computed, inject, input } from '@angular/core';
import { Challan, Store, fmtDate } from '../store';

/** Printable delivery challan (no prices), in the boxed ERP style. */
@Component({
  selector: 'app-challan-view',
  template: `
    @let c = challan();
    <article class="doc print-area t-gst" [style.--doc]="company().color">
      <div class="tg">
        <div class="tg-title">Delivery Challan</div>

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
            </div>
          </div>
          <div class="tg-cell tg-pad0">
            <div class="tg-kv">
              <div><span>Challan No.</span><b>{{ c.number }}</b></div>
              <div><span>Dated</span><b>{{ d(c.date) }}</b></div>
              @if (piNo()) {
                <div><span>Against proforma</span><b>{{ piNo() }}</b></div>
              }
              <div><span>Against quote</span><b>{{ quoteNo() }}</b></div>
              <div><span>Vehicle no.</span><b>{{ c.vehicle || '—' }}</b></div>
              <div><span>Transporter</span><b>{{ c.transporter || '—' }}</b></div>
              <div><span>LR / docket no.</span><b>{{ c.lrNo || '—' }}</b></div>
            </div>
          </div>
        </div>

        <div class="tg-row tg-2">
          <div class="tg-cell">
            <div class="tg-label">Consignee (Ship to)</div>
            <div class="tg-name2">{{ customer()?.name }}</div>
            <div>{{ customer()?.address }}, {{ customer()?.state }}</div>
            <div><b>GSTIN/UIN:</b> {{ customer()?.gstin || 'Unregistered' }}</div>
          </div>
          <div class="tg-cell">
            <div class="tg-label">Contact</div>
            <div class="tg-name2">{{ customer()?.contact || customer()?.name }}</div>
            @if (customer()?.phone) {
              <div>Ph: {{ customer()?.phone }}</div>
            }
          </div>
        </div>

        <table class="tg-table">
          <thead>
            <tr>
              <th>Sr</th>
              <th class="left">Description of goods</th>
              <th>HSN/SAC</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            @for (i of c.items; track $index) {
              <tr>
                <td class="c">{{ $index + 1 }}</td>
                <td class="left"><b>{{ i.name }}</b></td>
                <td class="c">{{ i.hsn }}</td>
                <td>{{ i.qty }}</td>
                <td class="c">{{ i.unit }}</td>
              </tr>
            }
            @for (f of fillers(); track $index) {
              <tr class="tg-filler"><td></td><td></td><td></td><td></td><td></td></tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td class="left"><b>Total</b></td>
              <td></td>
              <td><b>{{ totalQty() }}</b></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="tg-row">
          <div class="tg-cell">
            <div class="tg-label">Remarks</div>
            <div class="pre">{{ c.notes || 'Goods sent against the order referenced above. Not for sale.' }}</div>
          </div>
        </div>

        <div class="tg-row tg-2">
          <div class="tg-cell tg-signs">
            <div class="tg-sign-box tg-cust" style="border-top: 0">
              <div>Received the above goods in good condition.</div>
              <div class="tg-sign-space"></div>
              <div>Receiver's signature, name &amp; date</div>
            </div>
          </div>
          <div class="tg-cell tg-signs">
            <div class="tg-sign-box">
              <div class="tg-for">For {{ company().name }}</div>
              <div class="tg-sign-space"></div>
              <div>Authorised signatory</div>
            </div>
          </div>
        </div>
      </div>
      <div class="tg-note">This is a computer generated document.</div>
    </article>
  `,
})
export class ChallanView {
  private readonly store = inject(Store);
  readonly challan = input.required<Challan>();
  readonly company = this.store.company;
  readonly customer = computed(() => this.store.customer(this.challan().customerId));
  readonly quoteNo = computed(() => this.store.quote(this.challan().quoteId)?.number ?? '');
  readonly piNo = computed(() => (this.challan().proformaId ? (this.store.proforma(this.challan().proformaId)?.number ?? '') : ''));
  readonly totalQty = computed(() => this.challan().items.reduce((s, i) => s + (i.qty || 0), 0));
  readonly fillers = computed(() => Array(Math.max(0, 8 - this.challan().items.length)).fill(0));
  d = fmtDate;
}
