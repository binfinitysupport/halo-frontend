import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Observable } from 'rxjs';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Adjustment, TeamData, UserDetail, UserRow } from '../core/models';
import { KYC_LABEL, KYC_TAG, dateOnly, fmt, initials, tagStyle } from '../core/format';
import { LoaderComponent } from './loader.component';
import { IconComponent } from './icon.component';

type Tab = 'profile' | 'team';
type WalletKey = 'flexible' | 'active';

const WALLETS: Record<WalletKey, { name: string; field: 'flexBalance' | 'activeBalance' }> = {
  flexible: { name: 'Flexible wallet', field: 'flexBalance' },
  active: { name: 'Active strategy wallet', field: 'activeBalance' },
};

@Component({
  selector: 'app-user-drawer',
  standalone: true,
  imports: [IconComponent, LoaderComponent, NgStyle],
  template: `
    <div class="overlay" style="z-index:50" (click)="closed.emit()"></div>
    <aside class="sheet">
      <div class="sheet-body">
        <div class="row gap12">
          <div class="avatar lg grad">{{ user() ? initials(user()!.name) : '' }}</div>
          <div class="grow">
            <div class="h-phone">{{ user()?.phone ?? '…' }}</div>
            <div class="uuid-line">UUID {{ user()?.uuid }}</div>
          </div>
          <button class="x-btn" (click)="closed.emit()" aria-label="Close">
            <app-icon name="close" [size]="15" [width]="2.4" />
          </button>
        </div>

        <div class="tabs">
          <button class="tab" [class.on]="tab() === 'profile'" (click)="tab.set('profile')">Profile &amp; wallets</button>
          <button class="tab" [class.on]="tab() === 'team'" (click)="tab.set('team')">Team ({{ user()?.teamSize ?? 0 }})</button>
        </div>

        @if ((tab() === 'profile' && !user()) || (tab() === 'team' && !team())) { <app-loader [compact]="true" /> }
        @if (tab() === 'team' && team(); as t) {
          <div class="stat-grid">
            @for (s of teamStats(); track s.k) {
              <div class="stat">
                <div class="stat-k">{{ s.k }}</div>
                <div class="stat-v" [style.color]="s.color">{{ s.v }}</div>
              </div>
            }
          </div>

          <div class="panel">
            <div class="stat-k">Invited by</div>
            <div class="strong">{{ t.upline ? t.upline.phone + ' · UUID ' + t.upline.uuid : 'None (direct sign-up)' }}</div>
          </div>

          <div class="card inner">
            <div class="g thead sm" [style.--cols]="TEAM_COLS" style="--gap:8px">
              <div>Level</div><div class="right">Members</div><div class="right">Deposits</div><div class="right">Commission</div>
            </div>
            @for (l of t.levels; track l.name; let i = $index) {
              <button class="g lvl-row" [style.--cols]="TEAM_COLS" style="--gap:8px"
                      [ngStyle]="{ background: i === level() ? 'rgba(10,99,241,.16)' : 'transparent' }"
                      (click)="level.set(i)">
                <div class="strong">{{ l.name }}</div>
                <div class="right">{{ l.members.length }}</div>
                <div class="right">{{ fmt(l.deposits, 0) }}</div>
                <div class="right green">{{ fmt(l.commission) }}</div>
              </button>
            }
          </div>

          <div class="between">
            <div class="strong14">Level {{ level() + 1 }} members · {{ t.levels[level()].rate }}% commission</div>
            <div class="hint">Tap a level above to switch</div>
          </div>

          @if (t.levels[level()].members.length === 0) {
            <div class="empty-sm">No members at this level.</div>
          }

          <div class="card inner">
            <div style="min-width:480px">
              <div class="g thead sm" [style.--cols]="MEMBER_COLS" style="--gap:8px">
                <div>UUID</div><div>Phone</div><div>VIP</div><div class="right">Deposited</div><div>Joined</div><div class="right">Status</div>
              </div>
              @for (m of t.levels[level()].members; track m.uuid) {
                <div class="g trow sm" [style.--cols]="MEMBER_COLS" style="--gap:8px">
                  <div class="mono" style="font-size:11px;font-weight:700">{{ m.uuid }}</div>
                  <div class="strong">{{ m.phone }}</div>
                  <div>VIP {{ m.vip }}</div>
                  <div class="right strong tnum">{{ fmt(m.deposit, 0) }}</div>
                  <div class="muted">{{ dateOnly(m.joined) }}</div>
                  <div class="flex-end">
                    <span class="tag xs" [ngStyle]="tagStyle(m.active ? 'green' : 'neutral')">{{ m.active ? 'Active' : 'Inactive' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (tab() === 'profile' && user(); as u) {
          <div class="stat-grid">
            @for (s of profileStats(); track s.k) {
              <div class="stat">
                <div class="stat-k">{{ s.k }}</div>
                <div class="stat-v">{{ s.v }}</div>
              </div>
            }
          </div>

          <div class="panel lg">
            <div class="strong14">Adjust balance (USDT)</div>

            <div class="field-col">
              <div class="label">Wallet</div>
              <select class="field lg" [value]="wallet()" (change)="wallet.set($any($event.target).value)">
                <option value="flexible">Flexible wallet</option>
                <option value="active">Active strategy wallet</option>
              </select>
              <div class="hint">Current balance: {{ fmt(walletBalance()) }} USDT</div>
            </div>

            <div class="field-col">
              <div class="label">Amount</div>
              <input class="field lg big" inputmode="decimal" placeholder="0.00" [value]="amount()"
                     (input)="setAmount($event)" />
            </div>

            <div class="field-col">
              <div class="label">Description</div>
              <textarea class="field area" rows="3" placeholder="Reason for this adjustment, shown in the user's billing history"
                        [value]="note()" (input)="note.set($any($event.target).value)"></textarea>
            </div>

            <div class="row gap8">
              <button class="btn lg outline grow" (click)="adjust('debit')">Debit</button>
              <button class="btn lg approve grow" (click)="adjust('credit')">Credit</button>
            </div>

            @if (detail()?.adjustments?.length) {
              <div class="log">
                @for (l of detail()!.adjustments; track $index) {
                  <div class="log-row">
                    <div class="grow">
                      <div class="strong">{{ l.wallet }}</div>
                      <div class="muted-line">{{ l.note }}</div>
                    </div>
                    <div class="strong nowrap" [style.color]="l.amount > 0 ? '#16C784' : '#EA3943'">
                      {{ l.amount > 0 ? '+' : '−' }}{{ fmt(Math.abs(l.amount)) }} USDT
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="row gap8 wrap">
            <button class="btn xl outline grow" style="min-width:140px" (click)="resetPassword()">Reset password</button>
            <button class="btn xl grow" style="min-width:140px"
                    [ngStyle]="{ background: frozen() ? '#16C784' : 'rgba(234,57,67,.15)', color: frozen() ? '#0A0A0A' : '#EA3943' }"
                    (click)="toggleFreeze()">
              {{ frozen() ? 'Unfreeze account' : 'Freeze account' }}
            </button>
          </div>
        }
      </div>
    </aside>
  `,
})
export class UserDrawerComponent implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  userId = input.required<string>();
  initialTab = input<Tab>('profile');
  closed = output<void>();
  changed = output<void>();

  readonly fmt = fmt;
  readonly dateOnly = dateOnly;
  readonly initials = initials;
  readonly tagStyle = tagStyle;
  readonly Math = Math;
  readonly TEAM_COLS = '60px 1fr 1fr 1fr';
  readonly MEMBER_COLS = '.9fr 1.3fr .6fr .9fr .8fr .7fr';

  tab = signal<Tab>('profile');
  detail = signal<UserDetail | null>(null);
  team = signal<TeamData | null>(null);
  level = signal(0);
  wallet = signal<WalletKey>('flexible');
  amount = signal('');
  note = signal('');

  user = computed<UserRow | null>(() => this.detail()?.user ?? null);
  frozen = computed(() => this.user()?.status === 'frozen');
  walletName = computed(() => WALLETS[this.wallet()].name);
  walletBalance = computed(() => {
    const u = this.user();
    return u ? u[WALLETS[this.wallet()].field] : 0;
  });

  teamStats = computed(() => {
    const t = this.team();
    if (!t) return [];
    return [
      { k: 'Team size', v: String(t.totals.size), color: '#fff' },
      { k: 'Direct invites (L1)', v: String(t.totals.direct), color: '#fff' },
      { k: 'Active members', v: String(t.totals.active), color: '#fff' },
      { k: 'Inactive members', v: String(t.totals.inactive), color: 'rgba(255,255,255,.7)' },
      { k: 'Team deposits', v: `${fmt(t.totals.deposits, 0)} USDT`, color: '#fff' },
      { k: 'Commission earned', v: `${fmt(t.totals.commission)} USDT`, color: '#16C784' },
    ];
  });

  profileStats = computed(() => {
    const u = this.user();
    if (!u) return [];
    return [
      { k: 'Name', v: u.name },
      { k: 'Flexible wallet', v: `${fmt(u.flexBalance)} USDT` },
      { k: 'Active strategy', v: `${fmt(u.activeBalance)} USDT` },
      { k: 'Team size', v: String(u.teamSize) },
      { k: 'KYC', v: KYC_LABEL[u.kycStatus] },
      { k: 'Joined', v: dateOnly(u.joined) },
      { k: 'Status', v: u.status === 'frozen' ? 'Frozen' : 'Active' },
    ];
  });

  readonly KYC_TAG = KYC_TAG;

  ngOnInit(): void {
    this.tab.set(this.initialTab());
    this.load();
  }

  load(): void {
    const id = this.userId();
    this.api.get<UserDetail>(`/users/${id}`).subscribe({
      next: (d) => this.detail.set(d),
      error: (e) => this.ui.toast(errorMessage(e)),
    });
    this.api.get<TeamData>(`/users/${id}/team`).subscribe({
      next: (t) => this.team.set(t),
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  private run(action: Observable<unknown>, message: string): void {
    action.subscribe({
      next: () => {
        this.ui.toast(message);
        this.load();
        this.changed.emit();
      },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  setAmount(e: Event): void {
    this.amount.set((e.target as HTMLInputElement).value.replace(/[^\d.]/g, ''));
  }

  adjust(direction: 'credit' | 'debit'): void {
    const amount = Number(this.amount());
    const body = { wallet: this.wallet(), direction, amount, note: this.note() };
    this.run(
      this.api.post(`/users/${this.userId()}/adjust`, body),
      `${direction === 'credit' ? 'Credited' : 'Debited'} ${fmt(amount)} USDT · ${this.walletName()}`
    );
    this.amount.set('');
    this.note.set('');
  }

  toggleFreeze(): void {
    const next = this.frozen() ? 'active' : 'frozen';
    this.run(
      this.api.patch(`/users/${this.userId()}`, { status: next }),
      next === 'active' ? 'Account unfrozen' : 'Account frozen'
    );
  }

  resetPassword(): void {
    this.api.post<{ sentTo: string }>(`/users/${this.userId()}/reset-password`).subscribe({
      next: (r) => this.ui.toast(`Password reset link sent to ${r.sentTo}`),
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }
}
