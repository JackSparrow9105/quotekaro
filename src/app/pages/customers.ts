import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer, STATES, Store, inr } from '../store';

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  template: `
    <section class="page page-split">
      <div class="page-head">
        <h1 class="page-title">Customers</h1>
        <button type="button" class="btn btn-primary btn-sm" (click)="open()">+ Add</button>
      </div>

      @if (editing(); as e) {
        <div class="form-card split-panel">
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
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="!e.name">Save customer</button>
            <button type="button" class="btn btn-ghost" (click)="editing.set(null)">Cancel</button>
          </div>
        </div>
      }

      <div class="list list-grid">
        @for (c of rows(); track c.c.id) {
          <button type="button" class="card card-link card-btn" (click)="open(c.c)">
            <div class="card-row">
              <div class="avatar" aria-hidden="true">{{ c.c.name.charAt(0) }}</div>
              <div class="grow">
                <div class="card-title">{{ c.c.name }}</div>
                <div class="card-meta">{{ c.c.contact }} · {{ c.c.state }}</div>
              </div>
              <div class="right">
                <div class="card-amount">{{ c.quotes }} quotes</div>
                <div class="card-meta">{{ money(c.won) }} won</div>
              </div>
            </div>
          </button>
        }
      </div>
    </section>
  `,
})
export class Customers {
  protected readonly store = inject(Store);
  protected readonly states = STATES;
  protected readonly editing = signal<Customer | null>(null);

  protected readonly rows = computed(() =>
    this.store.customers().map((c) => {
      const qs = this.store.quotes().filter((q) => q.customerId === c.id);
      return {
        c,
        quotes: qs.length,
        won: qs.filter((q) => q.status === 'won').reduce((s, q) => s + this.store.totals(q).total, 0),
      };
    }),
  );

  open(c?: Customer) {
    this.editing.set(c ? { ...c } : { id: '', name: '', contact: '', phone: '', gstin: '', state: this.store.company().state, address: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  save() {
    const e = this.editing();
    if (e) this.store.saveCustomer(e);
    this.editing.set(null);
  }
  money = inr;
}
