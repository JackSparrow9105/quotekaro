import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MoveType, Product, Store, fmtDate, inr, today } from '../store';
import { ScanButton } from './scan-button';
import { downloadCsv } from './csv';

type Filter = 'all' | 'low' | 'services';
type View = 'products' | 'register';
type MoveFilter = 'all' | MoveType;

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, ScanButton],
  template: `
    <section class="page page-split">
      <div class="page-head">
        <h1 class="page-title">Inventory</h1>
        <button type="button" class="btn btn-primary btn-sm" (click)="openNew()">+ Add product</button>
      </div>

      <div class="seg seg-2 inv-view" role="tablist" aria-label="Inventory view">
        <button type="button" role="tab" [attr.aria-selected]="view() === 'products'" [class.on]="view() === 'products'" (click)="view.set('products')">Products</button>
        <button type="button" role="tab" [attr.aria-selected]="view() === 'register'" [class.on]="view() === 'register'" (click)="view.set('register'); close()">Stock register</button>
      </div>

      @if (editing(); as e) {
        <div class="form-card sheet split-panel">
          <div class="sheet-head">
            <div class="card-title">{{ e.id ? 'Edit product' : 'New product' }}</div>
            <button type="button" class="icon-btn" aria-label="Close" (click)="close()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          @if (e.id && e.trackStock) {
            <div class="stock-panel" [class.is-low]="live()!.stock <= live()!.reorderLevel">
              <div>
                <div class="label-sm">In stock</div>
                <div class="stock-big">{{ live()!.stock }} <span>{{ e.unit }}</span></div>
                <div class="card-meta">Alert at {{ e.reorderLevel }} {{ e.unit }} · Value {{ money(max0(live()!.stock) * e.rate) }}</div>
              </div>
              @if (live()!.stock <= live()!.reorderLevel) {
                <span class="badge badge-lost">{{ live()!.stock <= 0 ? 'Out of stock' : 'Low stock' }}</span>
              }
            </div>

            <div class="seg seg-2" role="group" aria-label="Stock action">
              <button type="button" [class.on]="action() === 'in'" (click)="action.set('in')">Stock in</button>
              <button type="button" [class.on]="action() === 'adjust'" (click)="action.set('adjust')">Adjust count</button>
            </div>

            @if (action() === 'in') {
              <div class="grid-2">
                <div class="field"><label for="in-qty">Quantity received ({{ e.unit }})</label><input id="in-qty" type="number" inputmode="decimal" min="0" [(ngModel)]="moveQty" /></div>
                <div class="field"><label for="in-date">Date</label><input id="in-date" type="date" [(ngModel)]="buy.date" /></div>
              </div>
              <div class="grid-2">
                <div class="field"><label for="in-sup">Supplier</label><input id="in-sup" placeholder="e.g. Ravi Traders" list="suppliers" [(ngModel)]="buy.supplier" /></div>
                <div class="field"><label for="in-bill">Bill no.</label><input id="in-bill" placeholder="e.g. 2231" [(ngModel)]="buy.billNo" /></div>
              </div>
              <datalist id="suppliers">
                @for (sp of suppliers(); track sp) { <option [value]="sp"></option> }
              </datalist>
              <div class="field">
                <label for="in-rate">Purchase cost per {{ e.unit }} ₹ (optional)</label>
                <input id="in-rate" type="number" inputmode="decimal" min="0" [(ngModel)]="buy.rate" />
              </div>
              @if (+moveQty > 0 && +buy.rate > 0) {
                <div class="card-meta">Purchase value {{ money(+moveQty * +buy.rate) }} · margin at selling rate {{ margin(e.rate, +buy.rate) }}%</div>
              }
              <button type="button" class="btn btn-primary" [disabled]="!(+moveQty > 0)" (click)="doStockIn(e.id)">Add {{ +moveQty || '' }} {{ e.unit }} to stock</button>
            } @else {
              <div class="grid-2">
                <div class="field"><label for="adj-qty">Counted quantity ({{ e.unit }})</label><input id="adj-qty" type="number" inputmode="decimal" min="0" [(ngModel)]="moveQty" /></div>
                <div class="field">
                  <label for="adj-note">Reason</label>
                  <select id="adj-note" [(ngModel)]="moveNote">
                    <option value="Physical stock count">Physical stock count</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Returned by customer">Returned by customer</option>
                    <option value="Lost / missing">Lost / missing</option>
                  </select>
                </div>
              </div>
              <button type="button" class="btn btn-primary" [disabled]="moveQty === '' || +moveQty < 0" (click)="doAdjust(e.id)">Set stock to {{ moveQty === '' ? '…' : +moveQty }} {{ e.unit }}</button>
            }
          }

          <div class="field"><label for="p-name">Product or service</label><input id="p-name" [(ngModel)]="e.name" /></div>
          <div class="grid-2">
            <div class="field">
              <label for="p-sku">SKU / item code</label>
              <div class="field-row">
                <input id="p-sku" autocapitalize="characters" [(ngModel)]="e.sku" />
                @if (!e.sku && e.name) {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="e.sku = suggestSku(e.name)">Auto</button>
                }
              </div>
            </div>
            <div class="field">
              <label for="p-bar">Barcode</label>
              <div class="field-row">
                <input id="p-bar" inputmode="numeric" [(ngModel)]="e.barcode" />
                <app-scan-button (scanned)="e.barcode = $event" />
              </div>
            </div>
          </div>
          @if (codeClash(e); as other) {
            <div class="stock-warn">That code is already used by "{{ other }}".</div>
          }
          <div class="grid-2">
            <div class="field"><label for="p-hsn">HSN / SAC</label><input id="p-hsn" [(ngModel)]="e.hsn" /></div>
            <div class="field">
              <label for="p-unit">Unit</label>
              <select id="p-unit" [(ngModel)]="e.unit">
                @for (u of units; track u) { <option [value]="u">{{ u }}</option> }
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field"><label for="p-rate">Selling rate ₹</label><input id="p-rate" type="number" inputmode="decimal" [(ngModel)]="e.rate" /></div>
            <div class="field">
              <label for="p-gst">GST %</label>
              <select id="p-gst" [(ngModel)]="e.gst">
                @for (g of gsts; track g) { <option [ngValue]="g">{{ g }}%</option> }
              </select>
            </div>
          </div>

          <label class="toggle">
            <input type="checkbox" [(ngModel)]="e.trackStock" />
            <span class="toggle-ui" aria-hidden="true"></span>
            <span>Track stock for this item <span class="card-meta">(turn off for services)</span></span>
          </label>

          @if (e.trackStock) {
            <div class="grid-2">
              @if (!e.id) {
                <div class="field"><label for="p-open">Opening stock</label><input id="p-open" type="number" inputmode="decimal" min="0" [(ngModel)]="e.stock" /></div>
              }
              <div class="field"><label for="p-reorder">Low-stock alert at</label><input id="p-reorder" type="number" inputmode="decimal" min="0" [(ngModel)]="e.reorderLevel" /></div>
            </div>
          }

          <div class="btn-row">
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="!e.name">Save details</button>
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            @if (e.id) {
              @if (confirmDelete()) {
                <button type="button" class="btn btn-ghost danger" (click)="remove(e.id)">Yes, delete</button>
              } @else {
                <button type="button" class="btn btn-ghost danger" (click)="confirmDelete.set(true)">Delete</button>
              }
            }
          </div>

          @if (e.id && e.trackStock) {
            <div class="section-head"><h2>Stock history</h2></div>
            <ul class="moves">
              @for (m of history(); track m.id) {
                <li class="move">
                  <span class="move-qty" [class.plus]="m.qty > 0" [class.minus]="m.qty < 0">{{ m.qty > 0 ? '+' : '' }}{{ m.qty }}</span>
                  <div class="grow">
                    <div class="move-note">{{ m.note }}</div>
                    <div class="card-meta">{{ typeLabel[m.type] }} · {{ d(m.date) }}{{ m.rate ? ' · ' + money(m.rate) + '/' + e.unit : '' }}</div>
                  </div>
                </li>
              } @empty {
                <li class="card-meta">No stock movements yet.</li>
              }
            </ul>
          }
        </div>
      }

      @if (view() === 'register') {
        <div class="inv-summary">
          <div>
            <div class="stat-label">Purchases · 30 days</div>
            <div class="inv-value">{{ money(purchase30()) }}</div>
          </div>
          <div>
            <div class="stat-label">Units in</div>
            <div class="inv-value">{{ unitsIn30() }}</div>
          </div>
          <div>
            <div class="stat-label">Units out</div>
            <div class="inv-value">{{ unitsOut30() }}</div>
          </div>
        </div>

        <div class="chips-row">
          <div class="chips" role="tablist" aria-label="Filter stock movements">
            @for (f of moveFilters; track f.key) {
              <button type="button" class="chip" role="tab" [class.active]="moveFilter() === f.key" [attr.aria-selected]="moveFilter() === f.key" (click)="moveFilter.set(f.key)">{{ f.label }}</button>
            }
          </div>
          <button type="button" class="btn btn-ghost btn-sm" (click)="exportRegister()">Export CSV</button>
        </div>

        <ul class="moves reg">
          @for (m of register(); track m.id) {
            <li class="move">
              <span class="move-qty" [class.plus]="m.qty > 0" [class.minus]="m.qty < 0">{{ m.qty > 0 ? '+' : '' }}{{ m.qty }}</span>
              <div class="grow">
                <div class="move-note">{{ productName(m.productId) }}</div>
                <div class="card-meta">{{ m.note }}</div>
              </div>
              <div class="right">
                <div class="card-meta">{{ d(m.date) }}</div>
                @if (m.rate) {
                  <div class="card-meta">{{ money(m.rate * m.qty) }}</div>
                }
                <span class="badge" [class.badge-won]="m.type === 'in'" [class.badge-lost]="m.type === 'out'" [class.badge-draft]="m.type === 'adjust'">{{ typeLabel[m.type] }}</span>
              </div>
            </li>
          } @empty {
            <li class="empty">No stock movements yet.</li>
          }
        </ul>
      } @else {
      <div class="inv-summary">
        <div>
          <div class="stat-label">Stock value</div>
          <div class="inv-value">{{ money(store.inventory().value) }}</div>
        </div>
        <div>
          <div class="stat-label">Items</div>
          <div class="inv-value">{{ store.inventory().items }}</div>
        </div>
        <div>
          <div class="stat-label">Low stock</div>
          <div class="inv-value" [class.warn]="store.inventory().low > 0">{{ store.inventory().low }}</div>
        </div>
      </div>

      <div class="search-row">
      <label class="search">
        <span class="sr-only">Search products</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="search" placeholder="Search name, SKU, barcode or HSN" [ngModel]="q()" (ngModelChange)="q.set($event)" (keydown.enter)="openByCode(q())" />
      </label>
      <app-scan-button (scanned)="onScan($event)" />
      </div>

      <div class="chips" role="tablist" aria-label="Filter products">
        <button type="button" class="chip" role="tab" [class.active]="filter() === 'all'" [attr.aria-selected]="filter() === 'all'" (click)="filter.set('all')">All <span class="chip-count">{{ store.products().length }}</span></button>
        <button type="button" class="chip" role="tab" [class.active]="filter() === 'low'" [attr.aria-selected]="filter() === 'low'" (click)="filter.set('low')">Low stock <span class="chip-count">{{ store.lowStock().length }}</span></button>
        <button type="button" class="chip" role="tab" [class.active]="filter() === 'services'" [attr.aria-selected]="filter() === 'services'" (click)="filter.set('services')">Services <span class="chip-count">{{ serviceCount() }}</span></button>
      </div>

      <div class="list list-grid">
        @for (p of list(); track p.id) {
          <button type="button" class="card card-link card-btn" (click)="open(p)">
            <div class="card-row">
              <div class="grow">
                <div class="card-title">{{ p.name }}</div>
                <div class="card-meta">{{ p.sku ? p.sku + ' · ' : '' }}HSN {{ p.hsn }} · {{ money(p.rate) }}/{{ p.unit }} · GST {{ p.gst }}%</div>
              </div>
              <div class="right">
                @if (p.trackStock) {
                  <div class="stock-qty" [class.warn]="p.stock <= p.reorderLevel">{{ p.stock }} {{ p.unit }}</div>
                  @if (p.stock <= 0) {
                    <span class="badge badge-lost">Out of stock</span>
                  } @else if (p.stock <= p.reorderLevel) {
                    <span class="badge badge-low">Low</span>
                  } @else {
                    <span class="badge badge-won">In stock</span>
                  }
                } @else {
                  <span class="badge badge-draft">Service</span>
                }
              </div>
            </div>
          </button>
        } @empty {
          <div class="empty">{{ filter() === 'low' ? 'Nothing is running low.' : 'No products match.' }}</div>
        }
      </div>
      }
    </section>

    @if (toast()) {
      <div class="toast" role="status">{{ toast() }}</div>
    }
  `,
})
export class Inventory {
  protected readonly store = inject(Store);
  protected readonly editing = signal<Product | null>(null);
  protected readonly action = signal<'in' | 'adjust'>('in');
  protected readonly view = signal<View>('products');
  protected readonly moveFilter = signal<MoveFilter>('all');
  protected readonly moveFilters: { key: MoveFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in', label: 'Purchases / in' },
    { key: 'out', label: 'Sold' },
    { key: 'adjust', label: 'Adjusted' },
  ];
  protected buy = { date: today(0), supplier: '', billNo: '', rate: '' as number | '' };
  protected readonly filter = signal<Filter>('all');
  protected readonly q = signal('');
  protected readonly toast = signal('');
  protected readonly confirmDelete = signal(false);
  protected moveQty: number | '' = '';
  protected moveNote = '';

  protected readonly units = ['pcs', 'm', 'kg', 'bag', 'set', 'box', 'roll', 'ltr', 'job', 'hr', 'sq ft'];
  protected readonly gsts = [0, 5, 12, 18, 28];
  protected readonly typeLabel = { in: 'Stock in', out: 'Sold', adjust: 'Adjusted' };

  /** Latest stock for the product being edited (the form copy holds details only). */
  protected readonly live = computed(() => {
    const e = this.editing();
    return e?.id ? this.store.product(e.id) : undefined;
  });
  protected readonly history = computed(() => {
    this.store.moves();
    const e = this.editing();
    return e?.id ? this.store.movesFor(e.id) : [];
  });
  protected readonly serviceCount = computed(() => this.store.products().filter((p) => !p.trackStock).length);

  protected readonly list = computed(() => {
    const term = this.q().trim().toLowerCase();
    return this.store
      .products()
      .filter((p) => {
        if (this.filter() === 'low') return p.trackStock && p.stock <= p.reorderLevel;
        if (this.filter() === 'services') return !p.trackStock;
        return true;
      })
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.hsn.includes(term) ||
          (p.sku ?? '').toLowerCase().includes(term) ||
          (p.barcode ?? '').includes(term),
      );
  });

  protected readonly register = computed(() =>
    [...this.store.moves()]
      .filter((m) => this.moveFilter() === 'all' || m.type === this.moveFilter())
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
  );
  private readonly last30 = computed(() => this.store.moves().filter((m) => m.date >= today(-30)));
  protected readonly purchase30 = computed(() =>
    this.last30()
      .filter((m) => m.type === 'in' && m.rate)
      .reduce((s, m) => s + (m.rate ?? 0) * m.qty, 0),
  );
  protected readonly unitsIn30 = computed(() => this.last30().filter((m) => m.type === 'in').reduce((s, m) => s + m.qty, 0));
  protected readonly unitsOut30 = computed(() => this.last30().filter((m) => m.type === 'out').reduce((s, m) => s - m.qty, 0));
  protected readonly suppliers = computed(() => [...new Set(this.store.moves().map((m) => m.supplier).filter((x): x is string => !!x))]);

  private flash(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2200);
  }

  private resetMove() {
    this.moveQty = '';
    this.moveNote = this.action() === 'adjust' ? 'Physical stock count' : '';
    this.buy = { date: today(0), supplier: '', billNo: '', rate: '' };
  }

  open(p: Product) {
    this.editing.set({ ...p });
    this.action.set('in');
    this.confirmDelete.set(false);
    this.resetMove();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  openNew(barcode = '') {
    this.view.set('products');
    this.editing.set({ id: '', name: '', hsn: '', unit: 'pcs', rate: 0, gst: 18, trackStock: true, stock: 0, reorderLevel: 5, sku: '', barcode });
    this.confirmDelete.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  close() {
    this.editing.set(null);
  }

  doStockIn(id: string) {
    const qty = +this.moveQty;
    this.store.stockIn(id, qty, '', { date: this.buy.date, supplier: this.buy.supplier, billNo: this.buy.billNo, rate: +this.buy.rate || 0 });
    this.flash(`Added ${qty} to stock`);
    this.resetMove();
  }
  doAdjust(id: string) {
    const qty = +this.moveQty;
    this.store.adjustStock(id, qty, this.moveNote);
    this.flash(`Stock set to ${qty}`);
    this.action.set('in');
    this.resetMove();
  }

  save() {
    const e = this.editing();
    if (!e) return;
    this.store.saveProduct({
      ...e,
      rate: +e.rate,
      stock: +e.stock || 0,
      reorderLevel: +e.reorderLevel || 0,
      sku: (e.sku ?? '').trim().toUpperCase(),
      barcode: (e.barcode ?? '').trim(),
    });
    this.flash(e.id ? 'Product updated' : 'Product added');
    this.editing.set(null);
  }
  remove(id: string) {
    this.store.deleteProduct(id);
    this.editing.set(null);
    this.flash('Product deleted');
  }

  /** Open the product whose SKU/barcode exactly matches (USB scanners type the code + Enter). */
  openByCode(code: string) {
    const p = this.store.productByCode(code);
    if (p) {
      this.q.set('');
      this.open(p);
    }
  }

  onScan(code: string) {
    const p = this.store.productByCode(code);
    if (p) {
      this.open(p);
    } else {
      this.openNew(code);
      this.flash(`New product for barcode ${code}`);
    }
  }

  /** e.g. "Copper strip 25x3 mm" → "CS-25X3" style codes, kept unique. */
  suggestSku(name: string) {
    const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const letters = words.filter((w) => /^[A-Z]/.test(w)).slice(0, 3).map((w) => w[0]).join('');
    const num = words.find((w) => /\d/.test(w)) ?? '';
    let base = [letters || 'ITEM', num].filter(Boolean).join('-').slice(0, 14);
    let code = base;
    for (let n = 2; this.store.productByCode(code); n++) code = `${base}-${n}`;
    return code;
  }

  /** Name of another product already using this SKU or barcode. */
  codeClash(e: Product): string {
    for (const code of [e.sku, e.barcode]) {
      const other = code ? this.store.productByCode(code) : undefined;
      if (other && other.id !== e.id) return other.name;
    }
    return '';
  }

  margin(sell: number, cost: number) {
    return sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
  }

  productName(id: string) {
    return this.store.product(id)?.name ?? 'Deleted product';
  }

  exportRegister() {
    const rows: (string | number)[][] = [['Date', 'Product', 'SKU', 'Type', 'Qty', 'Unit', 'Cost/unit', 'Value', 'Supplier', 'Bill no.', 'Note']];
    for (const m of this.register()) {
      const p = this.store.product(m.productId);
      rows.push([m.date, p?.name ?? '', p?.sku ?? '', this.typeLabel[m.type], m.qty, p?.unit ?? '', m.rate ?? '', m.rate ? m.rate * m.qty : '', m.supplier ?? '', m.billNo ?? '', m.note]);
    }
    downloadCsv(`stock-register-${today(0)}`, rows);
  }

  max0(n: number) {
    return Math.max(0, n);
  }
  money = inr;
  d = fmtDate;
}
