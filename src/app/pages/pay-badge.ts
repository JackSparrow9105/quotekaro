import { Component, input } from '@angular/core';
import { PayStatus } from '../store';

/** Paid / Part paid / Unpaid pill for proformas. */
@Component({
  selector: 'app-pay-badge',
  template: `<span class="badge" [class.badge-won]="status() === 'paid'" [class.badge-low]="status() === 'part'" [class.badge-lost]="status() === 'unpaid'">{{ label[status()] }}</span>`,
})
export class PayBadge {
  readonly status = input.required<PayStatus>();
  protected readonly label: Record<PayStatus, string> = { paid: 'Paid', part: 'Part paid', unpaid: 'Unpaid' };
}
