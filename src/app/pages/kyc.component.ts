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
    @if (error(); as e) { <div class="empty">{{ e }}</div> }
    @if (!rows() && !error()) { <app-loader label="Loading KYC requests…" /> }
    @if (rows(); as list) {
      @if (list.length === 0) {
        <div class="empty">No KYC requests waiting.</div>
      }
      <div class="card">
        <div style="min-width:860px">
          <div class="g thead" [style.--cols]="COLS">
            <div>Name</div><div>Phone</div><div>Country</div><div>Document</div><div>Number</div><div>Submitted</div><div></div>
          </div>
          @for (item of list; track item.id) {
            <div class="g trow clickable" [style.--cols]="COLS" (click)="open.set(item)">
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

    @if (open(); as o) {
      <app-kyc-modal [item]="o" (closed)="open.set(null)" (decided)="decide(o, $event)" />
    }
  `,
})
export class KycComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  readonly COLS = '1.4fr 1.2fr 1fr .9fr 1.1fr .8fr 170px';
  readonly initials = initials;
  readonly ago = minutesAgo;

  rows = signal<KycItem[] | null>(null);
  open = signal<KycItem | null>(null);
  error = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.get<KycItem[]>('/kyc').subscribe({
      next: (r) => this.rows.set(r),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  decide(item: KycItem, approve: boolean): void {
    this.api.post(`/kyc/${item.id}/decision`, { approve }).subscribe({
      next: () => {
        this.ui.toast(`${item.name} ${approve ? 'verified' : 'rejected'}`);
        this.open.set(null);
        this.reload();
        this.ui.refreshMeta();
      },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }
}
