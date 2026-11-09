import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { DOC_TEMPLATES, DocTemplate, Store } from '../store';

/** Grid of PDF layouts with small previews. */
@Component({
  selector: 'app-layout-picker',
  template: `
    <div class="lp" [class.lp-compact]="compact()" role="radiogroup" [attr.aria-label]="label()">
      @for (o of options; track o.key) {
        <button type="button" class="lp-opt" role="radio" [attr.aria-checked]="value() === o.key" [class.on]="value() === o.key" (click)="picked.emit(o.key)">
          <svg class="lp-thumb" viewBox="0 0 84 108" aria-hidden="true">
            <rect x="0.5" y="0.5" width="83" height="107" rx="4" class="lp-paper" />
            @switch (o.key) {
              @case ('classic') {
                <rect x="8" y="9" width="30" height="5" rx="1" class="lp-ink" />
                <rect x="8" y="17" width="22" height="2.5" rx="1" class="lp-mute" />
                <rect x="52" y="9" width="24" height="5" rx="1" class="lp-brand" />
                <rect x="58" y="17" width="18" height="2.5" rx="1" class="lp-mute" />
                <rect x="8" y="26" width="68" height="1.5" class="lp-brand" />
                <rect x="8" y="32" width="26" height="3" rx="1" class="lp-ink" />
                <rect x="8" y="44" width="68" height="5" class="lp-soft" />
                <rect x="8" y="52" width="68" height="2.5" rx="1" class="lp-mute" />
                <rect x="8" y="58" width="68" height="2.5" rx="1" class="lp-mute" />
                <rect x="48" y="72" width="28" height="2.5" rx="1" class="lp-mute" />
                <rect x="48" y="78" width="28" height="4" rx="1" class="lp-ink" />
              }
              @case ('modern') {
                <rect x="1" y="1" width="82" height="22" rx="3" class="lp-brand" />
                <rect x="8" y="8" width="24" height="4" rx="1" class="lp-white" />
                <rect x="56" y="8" width="20" height="5" rx="1" class="lp-white" />
                <rect x="8" y="29" width="32" height="16" rx="2" class="lp-soft" />
                <rect x="44" y="29" width="32" height="16" rx="2" class="lp-soft" />
                <rect x="8" y="50" width="68" height="5" class="lp-brand-soft" />
                <rect x="8" y="58" width="68" height="3" class="lp-soft" />
                <rect x="8" y="64" width="68" height="3" class="lp-paper2" />
                <rect x="8" y="70" width="68" height="3" class="lp-soft" />
                <rect x="46" y="79" width="30" height="7" rx="1.5" class="lp-brand" />
                <rect x="1" y="100" width="82" height="7" class="lp-ink" />
              }
              @case ('gst') {
                <rect x="6" y="6" width="72" height="96" class="lp-line" />
                <rect x="28" y="9" width="28" height="3.5" rx="1" class="lp-ink" />
                <line x1="6" y1="16" x2="78" y2="16" class="lp-stroke" />
                <line x1="42" y1="16" x2="42" y2="38" class="lp-stroke" />
                <rect x="9" y="19" width="22" height="3" rx="1" class="lp-ink" />
                <rect x="9" y="24" width="28" height="2" rx="1" class="lp-mute" />
                <rect x="45" y="20" width="28" height="2" rx="1" class="lp-mute" />
                <rect x="45" y="25" width="28" height="2" rx="1" class="lp-mute" />
                <line x1="6" y1="27" x2="78" y2="27" class="lp-stroke" />
                <line x1="6" y1="38" x2="78" y2="38" class="lp-stroke" />
                <rect x="6" y="38" width="72" height="5" class="lp-soft" />
                <line x1="14" y1="38" x2="14" y2="66" class="lp-stroke" />
                <line x1="50" y1="38" x2="50" y2="66" class="lp-stroke" />
                <line x1="64" y1="38" x2="64" y2="66" class="lp-stroke" />
                <line x1="6" y1="66" x2="78" y2="66" class="lp-stroke" />
                <rect x="6" y="66" width="72" height="12" class="lp-paper" />
                <line x1="6" y1="78" x2="78" y2="78" class="lp-stroke" />
                <rect x="9" y="70" width="34" height="3" rx="1" class="lp-ink" />
                <rect x="6" y="78" width="72" height="4" class="lp-soft" />
                <line x1="6" y1="88" x2="78" y2="88" class="lp-stroke" />
                <line x1="42" y1="88" x2="42" y2="102" class="lp-stroke" />
                <rect x="52" y="97" width="20" height="2" rx="1" class="lp-mute" />
              }
              @case ('elegant') {
                <rect x="8" y="10" width="26" height="4" rx="1" class="lp-ink" />
                <rect x="54" y="10" width="22" height="3" rx="1" class="lp-mute" />
                <rect x="8" y="20" width="68" height="0.8" class="lp-ink" />
                <rect x="8" y="27" width="18" height="2" rx="1" class="lp-mute" />
                <rect x="8" y="31" width="16" height="3" rx="1" class="lp-ink" />
                <rect x="32" y="27" width="16" height="2" rx="1" class="lp-mute" />
                <rect x="56" y="27" width="20" height="2" rx="1" class="lp-mute" />
                <rect x="56" y="31" width="20" height="6" rx="1" class="lp-brand" />
                <rect x="8" y="46" width="68" height="0.6" class="lp-mute" />
                <rect x="8" y="51" width="68" height="0.6" class="lp-mute" />
                <rect x="8" y="56" width="68" height="0.6" class="lp-mute" />
                <rect x="8" y="61" width="68" height="0.6" class="lp-mute" />
                <rect x="50" y="68" width="26" height="4" rx="1" class="lp-ink" />
                <rect x="8" y="97" width="68" height="0.8" class="lp-brand" />
              }
            }
          </svg>
          <span class="lp-name">{{ o.name }}</span>
          @if (!compact()) {
            <span class="lp-desc">{{ o.desc }}</span>
          }
          @if (isDefault(o.key)) {
            <span class="lp-default">Default</span>
          }
        </button>
      }
    </div>
  `,
})
export class LayoutPicker {
  private readonly store = inject(Store);
  readonly value = input.required<DocTemplate>();
  readonly compact = input(false);
  readonly showDefault = input(true);
  readonly label = input('PDF layout');
  readonly picked = output<DocTemplate>();
  protected readonly options = DOC_TEMPLATES;
  isDefault(k: DocTemplate) {
    return this.showDefault() && this.store.docTemplate() === k;
  }
}

/** Layout switcher for a quote / proforma page: preview any layout, save it as the default. */
@Component({
  selector: 'app-layout-chooser',
  imports: [LayoutPicker],
  template: `
    <div class="form-card no-print">
      <div class="lc-head">
        <div class="label-sm">PDF layout</div>
        @if (isDefault()) {
          <span class="card-meta">Your default</span>
        }
      </div>
      <app-layout-picker [value]="current()" [compact]="true" (picked)="value.set($event)" />
      @if (!isDefault()) {
        <div class="lc-row">
          <span class="card-meta">Only this view uses {{ name() }}.</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="makeDefault()">Make default</button>
        </div>
      }
      @if (justSaved()) {
        <div class="stock-ok">{{ name() }} is now the default for all quotes and proformas.</div>
      }
    </div>
  `,
})
export class LayoutChooser {
  private readonly store = inject(Store);
  /** Layout picked on this page; null means "use the default". */
  readonly value = model<DocTemplate | null>(null);
  protected readonly justSaved = signal(false);
  protected readonly current = computed(() => this.value() || this.store.docTemplate());
  protected readonly isDefault = computed(() => this.current() === this.store.docTemplate());
  protected readonly name = computed(() => DOC_TEMPLATES.find((o) => o.key === this.current())?.name ?? '');

  makeDefault() {
    this.store.setDocTemplate(this.current());
    this.value.set(null);
    this.justSaved.set(true);
    setTimeout(() => this.justSaved.set(false), 2500);
  }
}
