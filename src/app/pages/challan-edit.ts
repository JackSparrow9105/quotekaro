import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Challan, Store, fmtDate, today } from '../store';

interface Row {
  productId: string;
  name: string;
  hsn: string;
  unit: string;
  ordered: number;
  delivered: number;
  qty: number;
}

/** New delivery challan for a won quote; quantities default to what is still to be delivered. */
@Component({
  selector: 'app-challan-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page page-with-bar">
      <div class="page-head">
        <a [routerLink]="backLink()" class="back" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
        <div class="grow">
          <h1 class="page-title">New delivery challan</h1>
          @if (quote(); as q) {
            <div class="card-meta">{{ customerName() }} · {{ q.number }}{{ piNo() ? ' · ' + piNo() : '' }}</div>
          }
        </div>
      </div>

      @if (!quote() || quote()!.status !== 'won') {
        <div class="empty">Delivery challans are made from won quotes. <a routerLink="/quotes" class="link">Go to quotes</a></div>
      } @else {
        <div class="edit-layout">
          <div class="edit-main">
            <div class="section-head"><h2>Items to dispatch</h2></div>
            <div class="list">
              @for (r of rows(); track r.productId; let idx = $index) {
                <div class="item-card">
                  <div class="item-top">
                    <div>
                      <div class="card-title">{{ r.name }}</div>
                      <div class="card-meta">Ordered {{ r.ordered }} · already sent {{ r.delivered }} · left {{ left(r) }} {{ r.unit }}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field grow">
                      <label [for]="'dq' + idx">Quantity now ({{ r.unit }})</label>
                      <input [id]="'dq' + idx" type="number" inputmode="decimal" min="0" [ngModel]="r.qty" (ngModelChange)="setQty(idx, +$event)" />
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm dl-all" (click)="setQty(idx, left(r))">All {{ left(r) }}</button>
                  </div>
                  @if (r.qty > left(r)) {
                    <div class="stock-warn">More than the {{ left(r) }} {{ r.unit }} left to deliver.</div>
                  }
                </div>
              }
            </div>
          </div>

          <aside class="edit-side">
            <div class="form-card">
              <div class="field"><label for="dc-date">Challan date</label><input id="dc-date" type="date" [(ngModel)]="meta.date" /></div>
              <div class="field"><label for="dc-veh">Vehicle no.</label><input id="dc-veh" placeholder="e.g. UP 14 CT 2231" autocapitalize="characters" [(ngModel)]="meta.vehicle" /></div>
              <div class="grid-2">
                <div class="field"><label for="dc-tr">Transporter</label><input id="dc-tr" placeholder="Own vehicle" [(ngModel)]="meta.transporter" /></div>
                <div class="field"><label for="dc-lr">LR / docket no.</label><input id="dc-lr" [(ngModel)]="meta.lrNo" /></div>
              </div>
              <div class="field"><label for="dc-notes">Remarks (optional)</label><textarea id="dc-notes" rows="3" placeholder="e.g. Part delivery, balance to follow" [(ngModel)]="meta.notes"></textarea></div>
            </div>

            <div class="action-bar no-print">
              <div>
                <div class="bar-label">Dispatching</div>
                <div class="bar-total">{{ totalQty() }} units</div>
              </div>
              <button type="button" class="btn btn-primary" [disabled]="totalQty() <= 0" (click)="save()">Save challan</button>
            </div>
          </aside>
        </div>
      }
    </section>
  `,
})
export class ChallanEdit {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly quoteId = inject(ActivatedRoute).snapshot.queryParamMap.get('quote') ?? '';
  protected readonly quote = computed(() => this.store.quote(this.quoteId));
  protected readonly piNo = computed(() => {
    const q = this.quote();
    return q?.proformaId ? (this.store.proforma(q.proformaId)?.number ?? '') : '';
  });
  protected readonly customerName = computed(() => this.store.customer(this.quote()?.customerId ?? '')?.name ?? '');
  protected readonly backLink = computed(() => {
    const q = this.quote();
    if (!q) return ['/quotes'];
    return q.proformaId ? ['/proforma', q.proformaId] : ['/quotes', q.id];
  });

  protected readonly rows = signal<Row[]>(
    this.store.deliveryFor(this.quoteId).map((r) => ({ ...r, qty: Math.max(0, r.ordered - r.delivered) })),
  );
  protected readonly totalQty = computed(() => this.rows().reduce((s, r) => s + (r.qty || 0), 0));
  protected meta = { date: today(0), vehicle: '', transporter: '', lrNo: '', notes: '' };

  left(r: Row) {
    return Math.max(0, r.ordered - r.delivered);
  }

  setQty(idx: number, qty: number) {
    this.rows.update((rows) => rows.map((r, i) => (i === idx ? { ...r, qty: Math.max(0, qty || 0) } : r)));
  }

  save() {
    const q = this.quote();
    if (!q) return;
    const c: Challan = {
      id: '',
      number: '',
      quoteId: q.id,
      proformaId: q.proformaId,
      customerId: q.customerId,
      date: this.meta.date || today(0),
      items: this.rows().map((r) => ({ productId: r.productId, name: r.name, hsn: r.hsn, unit: r.unit, qty: r.qty })),
      vehicle: this.meta.vehicle.trim().toUpperCase(),
      transporter: this.meta.transporter.trim(),
      lrNo: this.meta.lrNo.trim(),
      notes: this.meta.notes.trim(),
    };
    const saved = this.store.saveChallan(c);
    this.router.navigate(['/challans', saved.id], { state: { created: true } });
  }

  d = fmtDate;
}
