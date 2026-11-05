import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Company, STATES, Store } from '../store';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <section class="page page-with-bar">
      <h1 class="page-title">Business &amp; branding</h1>
      <p class="page-sub">This appears on every quote and proforma you send.</p>

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
        <div class="field"><label for="s-terms">Default terms &amp; conditions</label><textarea id="s-terms" rows="5" [(ngModel)]="c.terms"></textarea></div>
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
    </section>

    <div class="action-bar no-print">
      <div class="bar-label">{{ saved() ? 'Saved' : 'Unsaved changes' }}</div>
      <button type="button" class="btn btn-primary" (click)="save()">Save</button>
    </div>
  `,
})
export class Settings {
  private readonly store = inject(Store);
  protected readonly states = STATES;
  protected readonly colors = ['#E8930C', '#1F6FEB', '#0E9F6E', '#D9364A', '#7C3AED', '#0F1B2D'];
  protected c: Company = { ...this.store.company() };
  protected readonly saved = signal(true);
  protected readonly confirmReset = signal(false);

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

  save() {
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
