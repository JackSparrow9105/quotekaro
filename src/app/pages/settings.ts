import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Company, DocTemplate, STATES, Store } from '../store';
import { LayoutPicker } from './layout-picker';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, LayoutPicker],
  template: `
    <section class="page page-with-bar">
      <h1 class="page-title">Business &amp; branding</h1>
      <p class="page-sub">This appears on every quote and proforma you send.</p>

      <div class="edit-layout">
      <div class="edit-main">
      <div class="form-card" (input)="saved.set(false)" (change)="saved.set(false)" (click)="onClickInside($event)">
        <div class="logo-row">
          <div class="logo-preview" [style.background]="c.logo ? '#fff' : c.color">
            @if (c.logo) {
              <img [src]="c.logo" alt="Company logo" />
            } @else {
              <span>{{ c.name.charAt(0) }}</span>
            }
          </div>
          <div class="grow">
            <label class="btn btn-ghost btn-sm file-btn">
              Upload logo
              <input type="file" accept="image/*" (change)="onLogo($event)" />
            </label>
            @if (c.logo) {
              <button type="button" class="btn btn-ghost btn-sm" (click)="c.logo = ''">Remove</button>
            }
          </div>
        </div>

        <div class="field">
          <span class="label-sm" id="color-label">Brand colour</span>
          <div class="swatches" role="radiogroup" aria-labelledby="color-label">
            @for (col of colors; track col) {
              <button type="button" class="swatch" role="radio" [attr.aria-checked]="c.color === col" [attr.aria-label]="col" [class.on]="c.color === col" [style.background]="col" (click)="c.color = col"></button>
            }
            <label class="swatch swatch-custom" aria-label="Custom colour">
              <input type="color" [(ngModel)]="c.color" />
            </label>
          </div>
        </div>

        <div class="field"><label for="s-name">Company name</label><input id="s-name" [(ngModel)]="c.name" /></div>
        <div class="grid-2">
          <div class="field"><label for="s-gst">GSTIN</label><input id="s-gst" [(ngModel)]="c.gstin" /></div>
          <div class="field">
            <label for="s-state">State</label>
            <select id="s-state" [(ngModel)]="c.state">
              @for (s of states; track s) { <option [value]="s">{{ s }}</option> }
            </select>
          </div>
        </div>
        <div class="field"><label for="s-addr">Address</label><input id="s-addr" [(ngModel)]="c.address" /></div>
        <div class="grid-2">
          <div class="field"><label for="s-phone">Phone</label><input id="s-phone" inputmode="tel" [(ngModel)]="c.phone" /></div>
          <div class="field"><label for="s-email">Email</label><input id="s-email" type="email" [(ngModel)]="c.email" /></div>
        </div>
        <div class="field"><label for="s-bank">Bank details</label><input id="s-bank" [(ngModel)]="c.bank" /></div>
        <div class="grid-2">
          <div class="field">
            <label for="s-upi">UPI ID</label>
            <input id="s-upi" placeholder="yourcompany@hdfcbank" autocapitalize="off" [(ngModel)]="c.upiId" />
          </div>
          <div class="field"><label for="s-upiname">Name shown in UPI apps</label><input id="s-upiname" [placeholder]="c.name" [(ngModel)]="c.upiName" /></div>
        </div>
        @if (c.upiId && !upiValid()) {
          <div class="stock-warn">A UPI ID looks like name&#64;bank, e.g. yourcompany&#64;hdfcbank.</div>
        } @else {
          <div class="card-meta">Proformas print a "scan to pay" QR for the balance due.</div>
        }
        <div class="field"><label for="s-terms">Default terms &amp; conditions</label><textarea id="s-terms" rows="5" [(ngModel)]="c.terms"></textarea></div>
      </div>

      <div class="form-card">
        <div>
          <div class="card-title">Quote &amp; invoice layout</div>
          <p class="card-meta lp-help">Pick the PDF design used for every quote and proforma. You can still switch for a single document from its page.</p>
        </div>
        <app-layout-picker [value]="c.docTemplate || 'classic'" [showDefault]="false" (picked)="pickLayout($event)" />
      </div>
      </div>

      <aside class="edit-side">
      <div class="form-card">
        <div>
          <div class="card-title">Sales team</div>
          <p class="card-meta lp-help">People who prepare quotes. Used for "Prepared by" and sales reports.</p>
        </div>
        @for (m of c.team ?? []; track m; let i = $index) {
          <div class="team-row">
            <span class="avatar avatar-sm" aria-hidden="true">{{ m.charAt(0) }}</span>
            <span class="grow">{{ m }}</span>
            <button type="button" class="icon-btn" [attr.aria-label]="'Remove ' + m" (click)="removeMember(i)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        }
        <div class="field-row">
          <input aria-label="Team member name" placeholder="Add a name" [(ngModel)]="newMember" (keydown.enter)="addMember()" />
          <button type="button" class="btn btn-ghost btn-sm" [disabled]="!newMember.trim()" (click)="addMember()">Add</button>
        </div>
      </div>

      <div class="form-card">
        <div class="card-title">Demo data</div>
        <p class="card-meta">Start over with the sample customers, products and quotes.</p>
        @if (confirmReset()) {
          <div class="btn-row">
            <button type="button" class="btn btn-primary btn-sm" (click)="reset()">Yes, reset everything</button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="confirmReset.set(false)">Cancel</button>
          </div>
        } @else {
          <button type="button" class="btn btn-ghost danger btn-sm" (click)="confirmReset.set(true)">Reset demo data</button>
        }
      </div>

      <div class="action-bar no-print">
        <div class="bar-label">{{ saved() ? 'Saved' : 'Unsaved changes' }}</div>
        <button type="button" class="btn btn-primary" (click)="save()">Save</button>
      </div>
      </aside>
      </div>
    </section>

  `,
})
export class Settings {
  private readonly store = inject(Store);
  protected readonly states = STATES;
  protected readonly colors = ['#E8930C', '#1F6FEB', '#0E9F6E', '#D9364A', '#7C3AED', '#0F1B2D'];
  protected c: Company = { ...this.store.company() };
  protected readonly saved = signal(true);
  protected readonly confirmReset = signal(false);
  protected newMember = '';

  onLogo(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        // Downscale so the logo stays small in storage
        const max = 240;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.c.logo = canvas.toDataURL('image/png');
        this.saved.set(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onClickInside(ev: Event) {
    if ((ev.target as HTMLElement).closest('.swatch, button')) this.saved.set(false);
  }

  upiValid() {
    return /^[\w.\-]{2,}@[a-zA-Z][\w.\-]{1,}$/.test((this.c.upiId ?? '').trim());
  }

  addMember() {
    const name = this.newMember.trim();
    if (!name) return;
    const team = this.c.team ?? [];
    if (!team.some((t) => t.toLowerCase() === name.toLowerCase())) this.c.team = [...team, name];
    this.newMember = '';
    this.saved.set(false);
  }

  removeMember(i: number) {
    this.c.team = (this.c.team ?? []).filter((_, idx) => idx !== i);
    this.saved.set(false);
  }

  pickLayout(t: DocTemplate) {
    this.c.docTemplate = t;
    this.saved.set(false);
  }

  save() {
    this.c.upiId = (this.c.upiId ?? '').trim();
    this.store.saveCompany(this.c);
    this.saved.set(true);
  }

  reset() {
    this.store.reset();
    this.confirmReset.set(false);
    this.c = { ...this.store.company() };
    this.saved.set(true);
  }
}
