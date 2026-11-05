import { Component, input } from '@angular/core';
import { QuoteStatus } from '../store';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="'badge badge-' + status()">{{ labels[status()] }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<QuoteStatus>();
  labels: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', won: 'Won', lost: 'Lost' };
}
