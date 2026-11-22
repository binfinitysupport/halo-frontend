// Admin "Deposits" and "Withdrawals" pages. One component serves both: app.component.ts passes
// type="deposit" or type="withdrawal". Data comes from GET /api/transactions.
// Deposits are read-only (with a "reload status" button); withdrawals can be approved or rejected.
import { LoaderComponent } from '../components/loader.component';
import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Tx } from '../core/models';
import { GAS_RATE, TX_TAG, fmt, shortDateTime, tagStyle } from '../core/format';
import { IconComponent } from '../components/icon.component';

// Which page this component is showing.
type TxType = 'deposit' | 'withdrawal';

@Component({
  selector: 'app-money',
  standalone: true,
  imports: [LoaderComponent, NgStyle, IconComponent],
  template: `
    <!-- Deposits only: explanation that deposits need no review -->
    @if (isDeposit()) {
      <div class="notice">
        <app-icon name="shield" [size]="20" stroke="#4C8DFF" />
        <p>Deposits are processed by the payment gateway and credited automatically. No manual review is needed.</p>
      </div>
    }

    <!-- Withdrawals only: status filter chips and "Approve all" -->
    <div class="filters">
      @if (!isDeposit()) {
        @for (statusFilter of filters; track statusFilter) {
          <button class="chip" [class.on]="filter() === statusFilter" (click)="filter.set(statusFilter)">{{ statusFilter === 'Done' ? doneStatus() : statusFilter }}</button>
        }
      }
      <div class="grow"></div>
      @if (!isDeposit() && ui.meta().withdrawalsPending > 0) {
        <button class="btn md approve" (click)="approveAll()">Approve all pending ({{ ui.meta().withdrawalsPending }})</button>
      }
    </div>

    <!-- Error / loading states -->
    @if (error(); as errorText) { <div class="empty">{{ errorText }}</div> }

    @if (!rows() && !error()) { <app-loader [label]="isDeposit() ? 'Loading deposits…' : 'Loading withdrawals…'" /> }

    @if (rows(); as list) {
      <!-- Deposits table -->
      @if (isDeposit()) {
        <div class="card">
          <div style="min-width:900px">
            <div class="g thead" [style.--cols]="DEPOSIT_TABLE_COLUMNS" style="--gap:14px">
              <div>Deposit ID</div><div>UUID</div><div>User</div><div>Network</div>
              <div>Deposit address</div><div class="right">Amount</div><div class="right">Status</div><div class="right">Action</div>
            </div>
            @for (transaction of list; track transaction.id) {
              <div class="g trow" [style.--cols]="DEPOSIT_TABLE_COLUMNS" style="--gap:14px">
                <div>
                  <div class="mono strong" style="font-size:12px">{{ transaction.txId }}</div>
                  <div class="sub">{{ dateTime(transaction.createdAt) }}</div>
                </div>
                <div class="mono" style="font-weight:700;font-size:12px">{{ transaction.user.uuid }}</div>
                <div class="strong">{{ transaction.user.phone }}</div>
                <div>{{ transaction.network }}</div>
                <div class="addr">{{ transaction.address }}</div>
                <div class="right strong tnum">{{ fmt(transaction.amount) }} USDT</div>
                <div class="flex-end"><span class="tag" [ngStyle]="tagStyle(TX_TAG[transaction.status])">{{ transaction.status }}</span></div>
                <div class="flex-end">
                  <button class="icon-sq" title="Reload status from gateway" (click)="sync(transaction)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round"
                         [style.transform]="'rotate(' + (reloadSpins()[transaction.id] || 0) * 360 + 'deg)'" style="transition:transform .6s">
                      <path [attr.d]="reloadIcon"></path>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Withdrawals table -->
        <div class="card">
          <div style="min-width:980px">
            <div class="g thead" [style.--cols]="WITHDRAWAL_TABLE_COLUMNS" style="--gap:12px">
              <div>Request</div><div>UUID</div><div>User</div><div>Network</div>
              <div>Withdrawal address</div><div>Amount</div><div>Status</div><div></div>
            </div>
            @for (transaction of list; track transaction.id) {
              <div class="g trow" [style.--cols]="WITHDRAWAL_TABLE_COLUMNS" style="--gap:12px">
                <div>
                  <div class="mono strong" style="font-size:12px">{{ transaction.txId }}</div>
                  <div class="sub">{{ dateTime(transaction.createdAt) }}</div>
                </div>
                <div class="mono" style="font-weight:700;font-size:12px">{{ transaction.user.uuid }}</div>
                <div class="strong">{{ transaction.user.phone }}</div>
                <div>{{ transaction.network }}</div>
                <div class="addr-row">
                  <div class="addr grow">{{ transaction.address }}</div>
                  <button class="copy-btn" title="Copy address" (click)="copy(transaction.address)">
                    <app-icon name="copy" [size]="13" stroke="#8DB6FF" [width]="2.2" />
                  </button>
                </div>
                <div>
                  <div class="strong tnum">{{ fmt(transaction.amount) }} USDT</div>
                  <div class="sub">GAS {{ fmt(transaction.amount * GAS_RATE) }} · Net {{ fmt(transaction.amount - transaction.amount * GAS_RATE) }}</div>
                </div>
                <div><span class="tag" [ngStyle]="tagStyle(TX_TAG[transaction.status])">{{ transaction.status }}</span></div>
                <div class="actions-end">
                  @if (transaction.status === 'Pending') {
                    <button class="btn reject" (click)="setStatus(transaction, 'Rejected', 'rejected')">Reject</button>
                    <button class="btn approve" (click)="setStatus(transaction, 'Paid', 'approved')">Approve</button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class MoneyComponent {
  private api = inject(ApiService);
  ui = inject(UiStore);

  type = input.required<TxType>();

  // CSS grid column widths for each table (header and rows share them).
  readonly DEPOSIT_TABLE_COLUMNS = '1fr .8fr 1.1fr .9fr minmax(0,1.6fr) .8fr 100px 70px';
  readonly WITHDRAWAL_TABLE_COLUMNS = '1.1fr .8fr 1.1fr .9fr 1.5fr .9fr .9fr 170px';
  // Withdrawal filter chips. "Done" is shown as "Paid" (see doneStatus).
  readonly filters = ['Pending', 'Done', 'Rejected', 'All'];

  // Helpers made available to the template.
  readonly GAS_RATE = GAS_RATE;
  readonly TX_TAG = TX_TAG;
  readonly fmt = fmt;
  readonly tagStyle = tagStyle;
  readonly dateTime = shortDateTime;
  readonly reloadIcon = 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5';

  filter = signal('Pending'); // selected withdrawal filter chip
  rows = signal<Tx[] | null>(null); // null until the first load finishes
  error = signal<string | null>(null);
  // Times each deposit's reload icon was clicked; each click rotates the icon one more full turn.
  reloadSpins = signal<Record<string, number>>({});

  isDeposit = computed(() => this.type() === 'deposit');
  // The status a finished transaction has: deposits are "Credited", withdrawals are "Paid".
  doneStatus = computed(() => (this.isDeposit() ? 'Credited' : 'Paid'));

  constructor() {
    // Re-runs (and reloads the list) when the page type, the filter chip or the global search changes.
    effect(() => {
      this.type();
      this.filter();
      this.ui.searchText();
      this.reload();
    });
  }

  // Fetches the list for the current page, filter chip and search text.
  reload(): void {
    // Deposits always show every status; withdrawals use the selected chip ("Done" means "Paid").
    let status: string;
    if (this.isDeposit()) {
      status = 'All';
    } else if (this.filter() === 'Done') {
      status = this.doneStatus();
    } else {
      status = this.filter();
    }

    const query = { type: this.type(), status, q: this.ui.searchText().trim() };
    this.api.get<Tx[]>('/transactions', query).subscribe({
      next: (transactions) => {
        this.rows.set(transactions);
        this.error.set(null);
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  // Deposits: asks the backend for the latest status from the payment gateway (and spins the icon).
  sync(transaction: Tx): void {
    this.reloadSpins.update((spins) => ({ ...spins, [transaction.id]: (spins[transaction.id] || 0) + 1 }));
    this.api.post<{ status: string }>(`/transactions/${transaction.id}/sync`).subscribe({
      next: (result) => this.ui.toast(`${transaction.txId} status refreshed · ${result.status}`),
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Withdrawals: approves ("Paid") or rejects one pending request. `verb` is only used in the toast text.
  setStatus(transaction: Tx, status: string, verb: string): void {
    this.api.patch(`/transactions/${transaction.id}`, { status }).subscribe({
      next: () => {
        this.ui.toast(`${transaction.txId} ${verb}`);
        this.changed();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Withdrawals: approves every pending request at once.
  approveAll(): void {
    const type = this.type();
    this.api.post<{ count: number }>('/transactions/approve-all', { type }).subscribe({
      next: (result) => {
        const verb = this.isDeposit() ? 'confirmed' : 'approved';
        this.ui.toast(`${result.count} requests ${verb}`);
        this.changed();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Copies a wallet address to the clipboard.
  copy(address: string): void {
    navigator.clipboard?.writeText(address).catch(() => undefined);
    this.ui.toast('Address copied');
  }

  // After any change: reload the list and the sidebar badge counts.
  private changed(): void {
    this.reload();
    this.ui.refreshMeta();
  }
}
