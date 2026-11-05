import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product, Store, inr } from '../store';

@Component({
  selector: 'app-products',
  imports: [FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <h1 class="page-title">Products</h1>
        <button type="button" class="btn btn-primary btn-sm" (click)="open()">+ Add</button>
      </div>
      <p class="page-sub">Your catalogue. Rates and GST fill in automatically when you add an item to a quote.</p>

      @if (editing(); as e) {
        <div class="form-card">
          <div class="field"><label for="p-name">Product or service</label><input id="p-name" [(ngModel)]="e.name" /></div>
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
            <div class="field"><label for="p-rate">Rate ₹</label><input id="p-rate" type="number" inputmode="decimal" [(ngModel)]="e.rate" /></div>
            <div class="field">
              <label for="p-gst">GST %</label>
              <select id="p-gst" [(ngModel)]="e.gst">
                @for (g of gsts; track g) { <option [ngValue]="g">{{ g }}%</option> }
              </select>
            </div>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="!e.name">Save product</button>
            <button type="button" class="btn btn-ghost" (click)="editing.set(null)">Cancel</button>
            @if (e.id) {
              <button type="button" class="btn btn-ghost danger" (click)="remove(e.id)">Delete</button>
            }
          </div>
        </div>
      }

      <div class="list">
        @for (p of store.products(); track p.id) {
          <button type="button" class="card card-link card-btn" (click)="open(p)">
            <div class="card-row">
              <div class="grow">
                <div class="card-title">{{ p.name }}</div>
                <div class="card-meta">HSN {{ p.hsn }} · GST {{ p.gst }}%</div>
              </div>
              <div class="right">
                <div class="card-amount">{{ money(p.rate) }}</div>
                <div class="card-meta">per {{ p.unit }}</div>
              </div>
            </div>
          </button>
        }
      </div>
    </section>
  `,
})
export class Products {
  protected readonly store = inject(Store);
  protected readonly editing = signal<Product | null>(null);
  protected readonly units = ['pcs', 'm', 'kg', 'bag', 'set', 'box', 'job', 'hr', 'sq ft'];
  protected readonly gsts = [0, 5, 12, 18, 28];

  open(p?: Product) {
    this.editing.set(p ? { ...p } : { id: '', name: '', hsn: '', unit: 'pcs', rate: 0, gst: 18 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  save() {
    const e = this.editing();
    if (e) this.store.saveProduct({ ...e, rate: +e.rate });
    this.editing.set(null);
  }
  remove(id: string) {
    this.store.deleteProduct(id);
    this.editing.set(null);
  }
  money = inr;
}
