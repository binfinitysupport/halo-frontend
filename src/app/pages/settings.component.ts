import { LoaderComponent } from '../components/loader.component';
import { Component, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Settings } from '../core/models';
import { ToggleComponent } from '../components/toggle.component';

const PRESETS = [1, 2, 4, 8, 24];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LoaderComponent, ToggleComponent],
  template: `
    @if (error(); as e) { <div class="empty">{{ e }}</div> }
    @if (!data() && !error()) { <app-loader label="Loading settings…" /> }
    @if (data(); as s) {
      <div class="card-pad">
        <div class="title">Platform</div>

        <div class="setting-row">
          <div class="grow"><div class="setting-title">Minimum deposit (USDT)</div><div class="hint">Applies to USDT and USDC</div></div>
          <input class="field num" inputmode="decimal" [value]="minDeposit" (input)="minDeposit = $any($event.target).value" />
        </div>

        <div class="setting-row">
          <div class="grow"><div class="setting-title">Minimum withdrawal (USDT)</div><div class="hint">Per request</div></div>
          <input class="field num" inputmode="decimal" [value]="minWithdrawal" (input)="minWithdrawal = $any($event.target).value" />
        </div>

        <div class="setting-row top">
          <div class="grow"><div class="setting-title">Maintenance mode</div><div class="hint">Blocks new orders and deposits in the app</div></div>
          <app-toggle [on]="s.maintenance.enabled" [large]="true" onColor="#EA3943" (changed)="toggleMaintenance()" />
        </div>

        @if (s.maintenance.enabled) {
          <div class="maint-box">
            <div class="setting-row">
              <div class="grow"><div class="setting-title">Duration (hours)</div><div class="hint">The app shows this countdown on the maintenance page</div></div>
              <div class="stepper">
                <button (click)="stepHours(-1)" aria-label="Decrease">−</button>
                <input inputmode="numeric" [value]="hours" (input)="setHours($event)" />
                <button (click)="stepHours(1)" aria-label="Increase">+</button>
              </div>
            </div>
            <div class="chips">
              @for (n of presets; track n) {
                <button class="chip sm" [class.on]="String(n) === hours" (click)="hours = String(n)">{{ n }} h</button>
              }
            </div>
            <div class="until">{{ untilText(s) }}</div>
          </div>
        }
      </div>

      <div class="card-pad">
        <div class="title">Telegram channels</div>
        @for (ch of channels; track ch.key) {
          <div class="tg-row">
            <div class="tg-label">{{ ch.label }}</div>
            <input class="field tg" placeholder="https://t.me/your_channel" [value]="links[ch.key]"
                   (input)="links[ch.key] = $any($event.target).value" />
            <button class="btn outline save-sm" (click)="saveLink(ch.key, ch.label)">Save</button>
          </div>
        }
      </div>

      <button class="btn xl white" style="align-self:flex-start" (click)="save()">Save settings</button>
    }
  `,
})
export class SettingsComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  readonly presets = PRESETS;
  readonly String = String;
  readonly channels = [
    { key: 'official', label: 'Official channel' },
    { key: 'support', label: 'Customer support' },
    { key: 'community', label: 'Community group' },
  ];

  data = signal<Settings | null>(null);
  error = signal<string | null>(null);
  minDeposit = '';
  minWithdrawal = '';
  hours = '2';
  links: Record<string, string> = { official: '', support: '', community: '' };

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.get<Settings>('/settings').subscribe({
      next: (s) => {
        this.data.set(s);
        this.minDeposit = String(s.minDeposit);
        this.minWithdrawal = String(s.minWithdrawal);
        this.hours = String(s.maintenance.hours);
        this.links = { ...s.telegram };
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private hoursNum(): number {
    return parseInt(this.hours, 10) || 0;
  }

  setHours(e: Event): void {
    this.hours = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 3);
  }

  stepHours(delta: number): void {
    this.hours = String(Math.min(168, Math.max(1, this.hoursNum() + delta)));
  }

  untilText(s: Settings): string {
    const h = this.hoursNum();
    if (!h) return 'Set at least 1 hour';
    const start = s.maintenance.startedAt ? new Date(s.maintenance.startedAt).getTime() : Date.now();
    const end = new Date(start + h * 3.6e6).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `App returns automatically at ${end}`;
  }

  save(): void {
    this.api.put('/settings', {
      minDeposit: Number(this.minDeposit),
      minWithdrawal: Number(this.minWithdrawal),
      maintenanceHours: this.hoursNum(),
    }).subscribe({
      next: () => { this.ui.toast('Settings saved'); this.reload(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  toggleMaintenance(): void {
    const s = this.data();
    if (!s) return;
    const on = s.maintenance.enabled;
    this.api.post('/settings/maintenance', { enabled: !on }).subscribe({
      next: () => { this.ui.toast(on ? 'Maintenance mode off' : `Maintenance mode on for ${this.hoursNum()} h`); this.reload(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  saveLink(key: string, label: string): void {
    this.api.put(`/settings/telegram/${key}`, { value: (this.links[key] ?? '').trim() }).subscribe({
      next: () => { this.ui.toast(`${label} link saved`); this.reload(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }
}
