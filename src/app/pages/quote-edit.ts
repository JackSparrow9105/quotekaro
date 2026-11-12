import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Customer, Quote, STATES, Store, inr, uid } from '../store';
import { ScanButton } from './scan-button';

@Component({
  selector: 'app-quote-edit',
  imports: [FormsModule, RouterLink, ScanButton],
  template: `
    <section class="page page-with-bar">
      <div class="page-head">
        <a [routerLink]="draft().id ? ['/quotes', draft().id] : ['/quotes']" class="back" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
        <h1 class="page-title">{{ draft().id ? 'Edit ' + draft().number : 'New quote' }}</h1>
      </div>

      <div class="edit-layout">
      <div class="edit-main">
      <div class="form-card">
        <div class="field">
          <label for="cust">Customer</label>
          <div class="field-row">
            <select id="cust" [ngModel]="draft().customerId" (ngModelChange)="set({ customerId: $event })">
              <option value="" disabled>Select customer</option>
              @for (c of store.customers(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
            <button type="button" class="btn btn-ghost btn-sm" (click)="showNewCust.set(!showNewCust())">+ New</button>
          </div>
        </div>

        @if (showNewCust()) {
          <div class="inline-form">
            <div class="field"><label for="nc-name">Business name</label><input id="nc-name" [(ngModel)]="newCust.name" /></div>
            <div class="grid-2">
              <div class="field"><label for="nc-phone">WhatsApp number</label><input id="nc-phone" inputmode="tel" [(ngModel)]="newCust.phone" /></div>
              <div class="field">
                <label for="nc-state">State</label>
                <select id="nc-state" [(ngModel)]="newCust.state">
                  @for (s of states; track s) { <option [value]="s">{{ s }}</option> }
                </select>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="addCustomer()" [disabled]="!newCust.name">Add customer</button>
          </div>
        }

        <div class="grid-2">
          <div class="field"><label for="date">Quote date</label><input id="date" type="date" [ngModel]="draft().date" (ngModelChange)="set({ date: $event })" /></div>
          <div class="field"><label for="valid">Valid till</label><input id="valid" type="date" [ngModel]="draft().validTill" (ngModelChange)="set({ validTill: $event })" /></div>
        </div>
      </div>

      <div class="section-head"><h2>Items</h2></div>
      <div class="list">
        @for (i of draft().items; track $index; let idx = $index) {
          <div class="item-card">
            <div class="item-top">
              <div>
                <div class="card-title">{{ i.name }}</div>
                <div class="card-meta">HSN {{ i.hsn }} · GST {{ i.gst }}%</div>
                @if (stockOf(i.productId); as p) {
                  @if (needOf(i.productId) > p.stock) {
                    <div class="stock-warn">Only {{ p.stock }} {{ p.unit }} in stock</div>
                  } @else {
                    <div class="stock-ok">{{ p.stock }} {{ p.unit }} in stock</div>
                  }
                }
              </div>
              <button type="button" class="icon-btn danger" (click)="removeItem(idx)" [attr.aria-label]="'Remove ' + i.name">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="grid-3">
              <div class="field"><label [for]="'qty' + idx">Qty ({{ i.unit }})</label><input [id]="'qty' + idx" type="number" inputmode="decimal" min="0" [ngModel]="i.qty" (ngModelChange)="setItem(idx, { qty: +$event })" /></div>
              <div class="field"><label [for]="'rate' + idx">Rate ₹</label><input [id]="'rate' + idx" type="number" inputmode="decimal" min="0" [ngModel]="i.rate" (ngModelChange)="setItem(idx, { rate: +$event })" /></div>
              <div class="field"><label [for]="'disc' + idx">Disc %</label><input [id]="'disc' + idx" type="number" inputmode="decimal" min="0" max="100" [ngModel]="i.discount" (ngModelChange)="setItem(idx, { discount: +$event })" /></div>
            </div>
            <div class="item-amount">{{ money(i.qty * i.rate * (1 - (i.discount || 0) / 100)) }}</div>
          </div>
        } @empty {
          <div class="empty">No items yet. Add products from your catalogue below.</div>
        }
      </div>

      <div class="field add-item">
        <label for="addp">Add product</label>
        <select id="addp" #addSel (change)="addItem(addSel.value); addSel.value = ''">
          <option value="">Choose from catalogue…</option>
          @for (p of store.products(); track p.id) {
            <option [value]="p.id">{{ p.sku ? p.sku + ' · ' : '' }}{{ p.name }} — {{ money(p.rate) }}/{{ p.unit }}{{ p.trackStock ? ' · ' + p.stock + ' in stock' : '' }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="code">Or add by SKU / barcode</label>
        <div class="field-row">
          <input id="code" placeholder="Type or scan, then Enter" autocapitalize="characters" [(ngModel)]="code" (keydown.enter)="addByCode(code)" />
          <app-scan-button (scanned)="addByCode($event)" />
        </div>
        @if (codeMsg()) {
          <div class="stock-warn">{{ codeMsg() }}</div>
        }
      </div>

      </div>

      <aside class="edit-side">
      <div class="form-card">
        @if (store.team().length) {
          <div class="field">
            <label for="by">Prepared by</label>
            <select id="by" [ngModel]="draft().preparedBy ?? ''" (ngModelChange)="set({ preparedBy: $event })">
              <option value="">Not set</option>
              @for (m of store.team(); track m) { <option [value]="m">{{ m }}</option> }
            </select>
          </div>
        }
        <div class="field">
          <label for="fu">Follow-up reminder</label>
          <input id="fu" type="date" [ngModel]="draft().followUp" (ngModelChange)="set({ followUp: $event })" />
        </div>
        <div class="field">
          <label for="notes">Terms for this quote (optional)</label>
          <textarea id="notes" rows="3" placeholder="Leave empty to use your default terms" [ngModel]="draft().notes" (ngModelChange)="set({ notes: $event })"></textarea>
        </div>
      </div>

      <div class="totals-card">
        <div class="row"><span>Taxable value</span><span>{{ money(t().taxable) }}</span></div>
        @if (t().interState) {
          <div class="row"><span>IGST</span><span>{{ money(t().igst) }}</span></div>
        } @else {
          <div class="row"><span>CGST + SGST</span><span>{{ money(t().cgst + t().sgst) }}</span></div>
        }
      </div>

      <div class="action-bar no-print">
        <div>
          <div class="bar-label">Total</div>
          <div class="bar-total">{{ money(t().total) }}</div>
        </div>
        <button type="button" class="btn btn-primary" (click)="save()" [disabled]="!canSave()">Save quote</button>
      </div>
      </aside>
      </div>
    </section>

  `,
})
export class QuoteEdit {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly states = STATES;

  protected readonly draft = signal<Quote>(this.initial());
  protected readonly showNewCust = signal(false);
  protected newCust: Customer = this.blankCust();
  protected code = '';
  protected readonly codeMsg = signal('');

  protected readonly t = computed(() => this.store.totals(this.draft()));
  protected readonly canSave = computed(() => !!this.draft().customerId && this.draft().items.length > 0);

  private initial(): Quote {
    const id = this.route.snapshot.paramMap.get('id');
    const existing = id ? this.store.quote(id) : undefined;
    if (existing) return { ...existing, items: existing.items.map((i) => ({ ...i })) };
    const fromCustomer = typeof history !== 'undefined' ? (history.state?.customerId as string | undefined) : undefined;
    return { ...this.store.newQuote(), preparedBy: this.lastPreparedBy(), customerId: fromCustomer && this.store.customer(fromCustomer) ? fromCustomer : '' };
  }

  /** Whoever saved the last quote on this device, so the team member doesn't pick themselves each time. */
  private lastPreparedBy(): string {
    try {
      const v = localStorage.getItem('qk_prepared_by') ?? '';
      return this.store.team().includes(v) ? v : (this.store.team()[0] ?? '');
    } catch {
      return this.store.team()[0] ?? '';
    }
  }

  private blankCust(): Customer {
    return { id: '', name: '', contact: '', phone: '', gstin: '', state: this.store.company().state, address: '' };
  }

  set(changes: Partial<Quote>) {
    this.draft.update((d) => ({ ...d, ...changes }));
  }
  setItem(idx: number, changes: object) {
    this.draft.update((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...changes } : it)) }));
  }
  removeItem(idx: number) {
    this.draft.update((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  }
  addItem(productId: string) {
    const p = this.store.products().find((x) => x.id === productId);
    if (!p) return;
    this.draft.update((d) => ({
      ...d,
      items: [...d.items, { productId: p.id, name: p.name, hsn: p.hsn, unit: p.unit, qty: 1, rate: p.rate, discount: 0, gst: p.gst }],
    }));
  }
  /** Add a product by SKU/barcode; scanning the same item again adds one more. */
  addByCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    const p = this.store.productByCode(code);
    if (!p) {
      this.codeMsg.set(`No product with code "${code}". Add it in Inventory first.`);
      return;
    }
    this.codeMsg.set('');
    this.code = '';
    const idx = this.draft().items.findIndex((i) => i.productId === p.id);
    if (idx >= 0) this.setItem(idx, { qty: (this.draft().items[idx].qty || 0) + 1 });
    else this.addItem(p.id);
  }

  addCustomer() {
    const c = this.store.saveCustomer({ ...this.newCust, id: uid() });
    this.set({ customerId: c.id });
    this.newCust = this.blankCust();
    this.showNewCust.set(false);
  }
  save() {
    try {
      localStorage.setItem('qk_prepared_by', this.draft().preparedBy ?? '');
    } catch {
      /* storage unavailable */
    }
    const saved = this.store.saveQuote(this.draft());
    this.router.navigate(['/quotes', saved.id]);
  }
  /** Product if it tracks stock, so the item can show availability. */
  stockOf(productId: string) {
    const p = this.store.product(productId);
    return p?.trackStock ? p : null;
  }
  /** Total quantity of a product across all lines of this quote. */
  needOf(productId: string) {
    return this.draft().items.filter((i) => i.productId === productId).reduce((s, i) => s + (i.qty || 0), 0);
  }
  money = inr;
}
