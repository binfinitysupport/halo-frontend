// Admin "KYC review" page: identity checks waiting for a decision (GET /api/kyc).
// Approve/Reject on a row (or in the review modal) sends POST /api/kyc/:id/decision, then reloads the list
// and the sidebar badge count.
import { LoaderComponent } from '../components/loader.component';
import { Component, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { KycItem } from '../core/models';
import { initials, minutesAgo } from '../core/format';
import { KycModalComponent } from '../components/kyc-modal.component';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [LoaderComponent, KycModalComponent],
  template: `
    <!-- Error / loading states -->
    @if (error(); as errorText) { <div class="empty">{{ errorText }}</div> }
    @if (!rows() && !error()) { <app-loader label="Loading KYC requests…" /> }
    @if (rows(); as list) {
      <!-- Nothing to review -->
      @if (list.length === 0) {
        <div class="empty">No KYC requests waiting.</div>
      }
      <!-- Requests table: click a row to open the review modal -->
      <div class="card">
        <div style="min-width:860px">
          <div class="g thead" [style.--cols]="TABLE_COLUMNS">
            <div>Name</div><div>Phone</div><div>Country</div><div>Document</div><div>Number</div><div>Submitted</div><div></div>
          </div>
          @for (item of list; track item.id) {
            <div class="g trow clickable" [style.--cols]="TABLE_COLUMNS" (click)="openedRequest.set(item)">
              <div class="row gap12 minw0">
                <div class="avatar sm">{{ initials(item.name) }}</div>
                <div class="strong">{{ item.name }}</div>
              </div>
              <div>{{ item.phone }}</div>
              <div>{{ item.country }}</div>
              <div>{{ item.doc }}</div>
              <div class="mono" style="font-weight:700;font-size:12px">{{ item.num }}</div>
              <div class="muted">{{ ago(item.submittedAt) }}</div>
              <div class="actions-end">
                <button class="btn reject" (click)="$event.stopPropagation(); decide(item, false)">Reject</button>
                <button class="btn approve" (click)="$event.stopPropagation(); decide(item, true)">Approve</button>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Review modal with the document details -->
    @if (openedRequest(); as request) {
      <app-kyc-modal [item]="request" (closed)="openedRequest.set(null)" (decided)="decide(request, $event)" />
    }
  `,
})
export class KycComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  // CSS grid column widths for the table (header and rows share them).
  readonly TABLE_COLUMNS = '1.4fr 1.2fr 1fr .9fr 1.1fr .8fr 170px';

  // Helpers made available to the template.
  readonly initials = initials;
  readonly ago = minutesAgo;

  rows = signal<KycItem[] | null>(null); // null until the first load finishes
  openedRequest = signal<KycItem | null>(null); // request shown in the review modal
  error = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  // Fetches the pending requests.
  reload(): void {
    this.api.get<KycItem[]>('/kyc').subscribe({
      next: (requests) => this.rows.set(requests),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  // Approves or rejects one request, then refreshes the list and the sidebar badge.
  decide(item: KycItem, approve: boolean): void {
    this.api.post(`/kyc/${item.id}/decision`, { approve }).subscribe({
      next: () => {
        this.ui.toast(`${item.name} ${approve ? 'verified' : 'rejected'}`);
        this.openedRequest.set(null);
        this.reload();
        this.ui.refreshMeta();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }
}
