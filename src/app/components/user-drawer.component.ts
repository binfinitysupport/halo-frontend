// Side panel with one user's details, opened from the Users page.
// Tab "Profile & wallets": account facts, a form to credit/debit a wallet, the last balance changes,
// and Reset password / Freeze buttons. Tab "Team": the user's team stats, levels and members.
// Data: GET /api/users/:id and GET /api/users/:id/team. After any change it emits `changed` so the list reloads.
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

// The two wallets a user has: display name and which UserRow field holds its balance.
const WALLETS: Record<WalletKey, { name: string; field: 'flexBalance' | 'activeBalance' }> = {
  flexible: { name: 'Flexible wallet', field: 'flexBalance' },
  active: { name: 'Active strategy wallet', field: 'activeBalance' },
};

@Component({
  selector: 'app-user-drawer',
  standalone: true,
  imports: [IconComponent, LoaderComponent, NgStyle],
  template: `
    <!-- Dark background; clicking it closes the drawer -->
    <div class="overlay" style="z-index:50" (click)="closed.emit()"></div>
    <aside class="sheet">
      <div class="sheet-body">
        <!-- Header: avatar, phone, UUID, close button -->
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

        <!-- Tab buttons -->
        <div class="tabs">
          <button class="tab" [class.on]="tab() === 'profile'" (click)="tab.set('profile')">Profile &amp; wallets</button>
          <button class="tab" [class.on]="tab() === 'team'" (click)="tab.set('team')">Team ({{ user()?.teamSize ?? 0 }})</button>
        </div>

        <!-- Spinner while the open tab's data is loading -->
        @if ((tab() === 'profile' && !user()) || (tab() === 'team' && !team())) { <app-loader [compact]="true" /> }

        <!-- ===== Team tab ===== -->
        @if (tab() === 'team' && team(); as teamData) {
          <!-- Team totals -->
          <div class="stat-grid">
            @for (stat of teamStats(); track stat.label) {
              <div class="stat">
                <div class="stat-k">{{ stat.label }}</div>
                <div class="stat-v" [style.color]="stat.color">{{ stat.value }}</div>
              </div>
            }
          </div>

          <!-- Who invited this user -->
          <div class="panel">
            <div class="stat-k">Invited by</div>
            <div class="strong">{{ teamData.upline ? teamData.upline.phone + ' · UUID ' + teamData.upline.uuid : 'None (direct sign-up)' }}</div>
          </div>

          <!-- Levels table: click a level to list its members below -->
          <div class="card inner">
            <div class="g thead sm" [style.--cols]="TEAM_TABLE_COLUMNS" style="--gap:8px">
              <div>Level</div><div class="right">Members</div><div class="right">Deposits</div><div class="right">Commission</div>
            </div>
            @for (teamLevel of teamData.levels; track teamLevel.name; let i = $index) {
              <button class="g lvl-row" [style.--cols]="TEAM_TABLE_COLUMNS" style="--gap:8px"
                      [ngStyle]="{ background: i === selectedLevelIndex() ? 'rgba(10,99,241,.16)' : 'transparent' }"
                      (click)="selectedLevelIndex.set(i)">
                <div class="strong">{{ teamLevel.name }}</div>
                <div class="right">{{ teamLevel.members.length }}</div>
                <div class="right">{{ fmt(teamLevel.deposits, 0) }}</div>
                <div class="right green">{{ fmt(teamLevel.commission) }}</div>
              </button>
            }
          </div>

          <div class="between">
            <div class="strong14">Level {{ selectedLevelIndex() + 1 }} members · {{ teamData.levels[selectedLevelIndex()].rate }}% commission</div>
            <div class="hint">Tap a level above to switch</div>
          </div>

          @if (teamData.levels[selectedLevelIndex()].members.length === 0) {
            <div class="empty-sm">No members at this level.</div>
          }

          <!-- Members of the selected level -->
          <div class="card inner">
            <div style="min-width:480px">
              <div class="g thead sm" [style.--cols]="MEMBER_TABLE_COLUMNS" style="--gap:8px">
                <div>UUID</div><div>Phone</div><div>VIP</div><div class="right">Deposited</div><div>Joined</div><div class="right">Status</div>
              </div>
              @for (member of teamData.levels[selectedLevelIndex()].members; track member.uuid) {
                <div class="g trow sm" [style.--cols]="MEMBER_TABLE_COLUMNS" style="--gap:8px">
                  <div class="mono" style="font-size:11px;font-weight:700">{{ member.uuid }}</div>
                  <div class="strong">{{ member.phone }}</div>
                  <div>VIP {{ member.vip }}</div>
                  <div class="right strong tnum">{{ fmt(member.deposit, 0) }}</div>
                  <div class="muted">{{ dateOnly(member.joined) }}</div>
                  <div class="flex-end">
                    <span class="tag xs" [ngStyle]="tagStyle(member.active ? 'green' : 'neutral')">{{ member.active ? 'Active' : 'Inactive' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ===== Profile & wallets tab ===== -->
        @if (tab() === 'profile' && user()) {
          <!-- Account facts -->
          <div class="stat-grid">
            @for (stat of profileStats(); track stat.label) {
              <div class="stat">
                <div class="stat-k">{{ stat.label }}</div>
                <div class="stat-v">{{ stat.value }}</div>
              </div>
            }
          </div>

          <!-- Credit/debit form and the latest balance changes -->
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
                @for (adjustment of detail()!.adjustments; track $index) {
                  <div class="log-row">
                    <div class="grow">
                      <div class="strong">{{ adjustment.wallet }}</div>
                      <div class="muted-line">{{ adjustment.note }}</div>
                    </div>
                    <div class="strong nowrap" [style.color]="adjustment.amount > 0 ? '#16C784' : '#EA3943'">
                      {{ adjustment.amount > 0 ? '+' : '−' }}{{ fmt(Math.abs(adjustment.amount)) }} USDT
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Account actions -->
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

  userId = input.required<string>(); // which user to show
  initialTab = input<Tab>('profile'); // tab to open on
  closed = output<void>(); // the drawer should close
  changed = output<void>(); // something was saved; the Users list should reload

  // Helpers and constants made available to the template.
  readonly fmt = fmt;
  readonly dateOnly = dateOnly;
  readonly initials = initials;
  readonly tagStyle = tagStyle;
  readonly Math = Math;
  // CSS grid column widths for the two tables.
  readonly TEAM_TABLE_COLUMNS = '60px 1fr 1fr 1fr';
  readonly MEMBER_TABLE_COLUMNS = '.9fr 1.3fr .6fr .9fr .8fr .7fr';

  tab = signal<Tab>('profile');
  detail = signal<UserDetail | null>(null); // null until loaded
  team = signal<TeamData | null>(null); // null until loaded
  selectedLevelIndex = signal(0); // team level whose members are listed

  // The adjust-balance form fields.
  wallet = signal<WalletKey>('flexible');
  amount = signal('');
  note = signal('');

  // Values worked out from the signals above (they update automatically).
  user = computed<UserRow | null>(() => this.detail()?.user ?? null);
  frozen = computed(() => this.user()?.status === 'frozen');
  walletName = computed(() => WALLETS[this.wallet()].name);
  walletBalance = computed(() => {
    const user = this.user();
    return user ? user[WALLETS[this.wallet()].field] : 0;
  });

  // The six boxes at the top of the Team tab.
  teamStats = computed(() => {
    const team = this.team();
    if (!team) return [];
    return [
      { label: 'Team size', value: String(team.totals.size), color: '#fff' },
      { label: 'Direct invites (L1)', value: String(team.totals.direct), color: '#fff' },
      { label: 'Active members', value: String(team.totals.active), color: '#fff' },
      { label: 'Inactive members', value: String(team.totals.inactive), color: 'rgba(255,255,255,.7)' },
      { label: 'Team deposits', value: `${fmt(team.totals.deposits, 0)} USDT`, color: '#fff' },
      { label: 'Commission earned', value: `${fmt(team.totals.commission)} USDT`, color: '#16C784' },
    ];
  });

  // The boxes at the top of the Profile tab.
  profileStats = computed(() => {
    const user = this.user();
    if (!user) return [];
    return [
      { label: 'Name', value: user.name },
      { label: 'Flexible wallet', value: `${fmt(user.flexBalance)} USDT` },
      { label: 'Active strategy', value: `${fmt(user.activeBalance)} USDT` },
      { label: 'Team size', value: String(user.teamSize) },
      { label: 'KYC', value: KYC_LABEL[user.kycStatus] },
      { label: 'Joined', value: dateOnly(user.joined) },
      { label: 'Status', value: user.status === 'frozen' ? 'Frozen' : 'Active' },
    ];
  });

  readonly KYC_TAG = KYC_TAG;

  // Runs once when the drawer opens: pick the starting tab and load the data.
  ngOnInit(): void {
    this.tab.set(this.initialTab());
    this.load();
  }

  // Loads the user's details and team (two requests that run at the same time).
  load(): void {
    const userId = this.userId();
    this.api.get<UserDetail>(`/users/${userId}`).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error) => this.ui.toast(errorMessage(error)),
    });
    this.api.get<TeamData>(`/users/${userId}/team`).subscribe({
      next: (team) => this.team.set(team),
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Runs an admin action, then shows its message and reloads this user (and the list behind the drawer).
  private runAction(action: Observable<unknown>, successMessage: string): void {
    action.subscribe({
      next: () => {
        this.ui.toast(successMessage);
        this.load();
        this.changed.emit();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Typing in the amount box: keep only digits and the decimal point.
  setAmount(event: Event): void {
    const typed = (event.target as HTMLInputElement).value;
    this.amount.set(typed.replace(/[^\d.]/g, ''));
  }

  // Credit or Debit button: adds or removes the amount on the chosen wallet, then clears the form.
  adjust(direction: 'credit' | 'debit'): void {
    const amount = Number(this.amount());
    const body = { wallet: this.wallet(), direction, amount, note: this.note() };
    const verb = direction === 'credit' ? 'Credited' : 'Debited';
    this.runAction(
      this.api.post(`/users/${this.userId()}/adjust`, body),
      `${verb} ${fmt(amount)} USDT · ${this.walletName()}`
    );
    this.amount.set('');
    this.note.set('');
  }

  // Freeze / Unfreeze button.
  toggleFreeze(): void {
    const nextStatus = this.frozen() ? 'active' : 'frozen';
    this.runAction(
      this.api.patch(`/users/${this.userId()}`, { status: nextStatus }),
      nextStatus === 'active' ? 'Account unfrozen' : 'Account frozen'
    );
  }

  // Reset password button: the backend sends the user a reset link.
  resetPassword(): void {
    this.api.post<{ sentTo: string }>(`/users/${this.userId()}/reset-password`).subscribe({
      next: (result) => this.ui.toast(`Password reset link sent to ${result.sentTo}`),
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }
}
