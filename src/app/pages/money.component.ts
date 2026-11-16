import { LoaderComponent } from '../components/loader.component';
import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Tx } from '../core/models';
import { GAS_RATE, TX_TAG, fmt, shortDateTime, tagStyle } from '../core/format';
import { IconComponent } from '../components/icon.component';

type TxType = 'deposit' | 'withdrawal';

@Component({
  selector: 'app-money',
  standalone: true,
  imports: [LoaderComponent, NgStyle, IconComponent],
  template: `
    @if (isDeposit()) {
      <div class="notice">
        <app-icon name="shield" [size]="20" stroke="#4C8DFF" />
        <p>Deposits are processed by the payment gateway and credited automatically. No manual review is needed.</p>
      </div>
    }

    <div class="filters">
      @if (!isDeposit()) {
        @for (f of filters; track f) {
          <button class="chip" [class.on]="filter() === f" (click)="filter.set(f)">{{ f === 'Done' ? doneStatus() : f }}</button>
        }
      }
      <div class="grow"></div>
      @if (!isDeposit() && ui.meta().withdrawalsPending > 0) {
        <button class="btn md approve" (click)="approveAll()">Approve all pending ({{ ui.meta().withdrawalsPending }})</button>
      }
    </div>

    @if (error(); as e) { <div class="empty">{{ e }}</div> }

    @if (!rows() && !error()) { <app-loader [label]="isDeposit() ? 'Loading deposits…' : 'Loading withdrawals…'" /> }

    @if (rows(); as list) {
      @if (isDeposit()) {
        <div class="card">
          <div style="min-width:900px">
            <div class="g thead" [style.--cols]="DEPOSIT_COLS" style="--gap:14px">
              <div>Deposit ID</div><div>UUID</div><div>User</div><div>Network</div>
              <div>Deposit address</div><div class="right">Amount</div><div class="right">Status</div><div class="right">Action</div>
            </div>
            @for (m of list; track m.id) {
              <div class="g trow" [style.--cols]="DEPOSIT_COLS" style="--gap:14px">
                <div>
                  <div class="mono strong" style="font-size:12px">{{ m.txId }}</div>
                  <div class="sub">{{ dateTime(m.createdAt) }}</div>
                </div>
                <div class="mono" style="font-weight:700;font-size:12px">{{ m.user.uuid }}</div>
                <div class="strong">{{ m.user.phone }}</div>
                <div>{{ m.network }}</div>
                <div class="addr">{{ m.address }}</div>
                <div class="right strong tnum">{{ fmt(m.amount) }} USDT</div>
                <div class="flex-end"><span class="tag" [ngStyle]="tagStyle(TX_TAG[m.status])">{{ m.status }}</span></div>
                <div class="flex-end">
                  <button class="icon-sq" title="Reload status from gateway" (click)="sync(m)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round"
                         [style.transform]="'rotate(' + (spin()[m.id] || 0) * 360 + 'deg)'" style="transition:transform .6s">
                      <path [attr.d]="reloadIcon"></path>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="card">
          <div style="min-width:980px">
            <div class="g thead" [style.--cols]="WITHDRAW_COLS" style="--gap:12px">
              <div>Request</div><div>UUID</div><div>User</div><div>Network</div>
              <div>Withdrawal address</div><div>Amount</div><div>Status</div><div></div>
            </div>
            @for (m of list; track m.id) {
              <div class="g trow" [style.--cols]="WITHDRAW_COLS" style="--gap:12px">
                <div>
                  <div class="mono strong" style="font-size:12px">{{ m.txId }}</div>
                  <div class="sub">{{ dateTime(m.createdAt) }}</div>
                </div>
                <div class="mono" style="font-weight:700;font-size:12px">{{ m.user.uuid }}</div>
                <div class="strong">{{ m.user.phone }}</div>
                <div>{{ m.network }}</div>
                <div class="addr-row">
                  <div class="addr grow">{{ m.address }}</div>
                  <button class="copy-btn" title="Copy address" (click)="copy(m.address)">
                    <app-icon name="copy" [size]="13" stroke="#8DB6FF" [width]="2.2" />
                  </button>
                </div>
                <div>
                  <div class="strong tnum">{{ fmt(m.amount) }} USDT</div>
                  <div class="sub">GAS {{ fmt(m.amount * GAS) }} · Net {{ fmt(m.amount - m.amount * GAS) }}</div>
                </div>
                <div><span class="tag" [ngStyle]="tagStyle(TX_TAG[m.status])">{{ m.status }}</span></div>
                <div class="actions-end">
                  @if (m.status === 'Pending') {
                    <button class="btn reject" (click)="setStatus(m, 'Rejected', 'rejected')">Reject</button>
                    <button class="btn approve" (click)="setStatus(m, 'Paid', 'approved')">Approve</button>
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

  readonly DEPOSIT_COLS = '1fr .8fr 1.1fr .9fr minmax(0,1.6fr) .8fr 100px 70px';
  readonly WITHDRAW_COLS = '1.1fr .8fr 1.1fr .9fr 1.5fr .9fr .9fr 170px';
  readonly filters = ['Pending', 'Done', 'Rejected', 'All'];
  readonly GAS = GAS_RATE;
  readonly TX_TAG = TX_TAG;
  readonly fmt = fmt;
  readonly tagStyle = tagStyle;
  readonly dateTime = shortDateTime;
  readonly reloadIcon = 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5';

  filter = signal('Pending');
  rows = signal<Tx[] | null>(null);
  error = signal<string | null>(null);
  spin = signal<Record<string, number>>({});

  isDeposit = computed(() => this.type() === 'deposit');
  doneStatus = computed(() => (this.isDeposit() ? 'Credited' : 'Paid'));

  constructor() {
    effect(() => {
      this.type();
      this.filter();
      this.ui.q();
      this.reload();
    });
  }

  reload(): void {
    const isDeposit = this.isDeposit();
    const status = isDeposit ? 'All' : this.filter() === 'Done' ? this.doneStatus() : this.filter();
    this.api.get<Tx[]>('/transactions', { type: this.type(), status, q: this.ui.q().trim() }).subscribe({
      next: (r) => { this.rows.set(r); this.error.set(null); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  sync(m: Tx): void {
    this.spin.update((s) => ({ ...s, [m.id]: (s[m.id] || 0) + 1 }));
    this.api.post<{ status: string }>(`/transactions/${m.id}/sync`).subscribe({
      next: (r) => this.ui.toast(`${m.txId} status refreshed · ${r.status}`),
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  setStatus(m: Tx, status: string, verb: string): void {
    this.api.patch(`/transactions/${m.id}`, { status }).subscribe({
      next: () => { this.ui.toast(`${m.txId} ${verb}`); this.changed(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  approveAll(): void {
    const type = this.type();
    this.api.post<{ count: number }>('/transactions/approve-all', { type }).subscribe({
      next: (r) => { this.ui.toast(`${r.count} requests ${this.isDeposit() ? 'confirmed' : 'approved'}`); this.changed(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  copy(address: string): void {
    navigator.clipboard?.writeText(address).catch(() => undefined);
    this.ui.toast('Address copied');
  }

  private changed(): void {
    this.reload();
    this.ui.refreshMeta();
  }
}
