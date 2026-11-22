// Admin "Settings" page: deposit/withdrawal minimums, maintenance mode (with a duration) and Telegram links.
// Loads GET /api/settings. "Save settings" sends PUT /api/settings; the maintenance switch and each
// Telegram "Save" button save straight away with their own requests.
import { LoaderComponent } from '../components/loader.component';
import { Component, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Settings } from '../core/models';
import { ToggleComponent } from '../components/toggle.component';

// Quick-pick buttons for the maintenance duration.
const MAINTENANCE_HOUR_PRESETS = [1, 2, 4, 8, 24];
// Allowed maintenance duration: 1 hour to 1 week (the backend checks the same limits).
const MIN_MAINTENANCE_HOURS = 1;
const MAX_MAINTENANCE_HOURS = 168;
const MAX_HOUR_DIGITS = 3;
const MS_PER_HOUR = 3_600_000;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LoaderComponent, ToggleComponent],
  template: `
    <!-- Error / loading states -->
    @if (error(); as errorText) { <div class="empty">{{ errorText }}</div> }
    @if (!data() && !error()) { <app-loader label="Loading settings…" /> }
    @if (data(); as settings) {
      <!-- Platform card: minimums and maintenance mode -->
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
          <app-toggle [on]="settings.maintenance.enabled" [large]="true" onColor="#EA3943" (changed)="toggleMaintenance()" />
        </div>

        <!-- Maintenance duration (only while maintenance mode is on) -->
        @if (settings.maintenance.enabled) {
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
              @for (presetHours of hourPresets; track presetHours) {
                <button class="chip sm" [class.on]="String(presetHours) === hours" (click)="hours = String(presetHours)">{{ presetHours }} h</button>
              }
            </div>
            <div class="until">{{ untilText(settings) }}</div>
          </div>
        }
      </div>

      <!-- Telegram links card: each link has its own Save button -->
      <div class="card-pad">
        <div class="title">Telegram channels</div>
        @for (channel of channels; track channel.key) {
          <div class="tg-row">
            <div class="tg-label">{{ channel.label }}</div>
            <input class="field tg" placeholder="https://t.me/your_channel" [value]="links[channel.key]"
                   (input)="links[channel.key] = $any($event.target).value" />
            <button class="btn outline save-sm" (click)="saveLink(channel.key, channel.label)">Save</button>
          </div>
        }
      </div>

      <!-- Saves the minimums and the maintenance duration -->
      <button class="btn xl white" style="align-self:flex-start" (click)="save()">Save settings</button>
    }
  `,
})
export class SettingsComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  readonly hourPresets = MAINTENANCE_HOUR_PRESETS;
  readonly String = String; // lets the template call String(...)
  readonly channels = [
    { key: 'official', label: 'Official channel' },
    { key: 'support', label: 'Customer support' },
    { key: 'community', label: 'Community group' },
  ];

  data = signal<Settings | null>(null); // the saved settings; null until loaded
  error = signal<string | null>(null);

  // Values being edited in the form (as typed). They are sent to the backend only on Save.
  minDeposit = '';
  minWithdrawal = '';
  hours = '2'; // maintenance duration being edited, as typed
  links: Record<string, string> = { official: '', support: '', community: '' };

  constructor() {
    this.reload();
  }

  // Loads the saved settings and copies them into the form fields.
  reload(): void {
    this.api.get<Settings>('/settings').subscribe({
      next: (settings) => {
        this.data.set(settings);
        this.minDeposit = String(settings.minDeposit);
        this.minWithdrawal = String(settings.minWithdrawal);
        this.hours = String(settings.maintenance.hours);
        this.links = { ...settings.telegram };
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  // The typed duration as a number (0 when the box is empty).
  private hoursAsNumber(): number {
    return parseInt(this.hours, 10) || 0;
  }

  // Typing in the duration box: keep digits only, at most 3.
  setHours(event: Event): void {
    const typed = (event.target as HTMLInputElement).value;
    this.hours = typed.replace(/\D/g, '').slice(0, MAX_HOUR_DIGITS);
  }

  // The − and + buttons: change the duration by one hour, staying within the allowed range.
  stepHours(delta: number): void {
    const next = this.hoursAsNumber() + delta;
    const clamped = Math.min(MAX_MAINTENANCE_HOURS, Math.max(MIN_MAINTENANCE_HOURS, next));
    this.hours = String(clamped);
  }

  // The line under the duration, e.g. "App returns automatically at Nov 20, 09:00 PM".
  untilText(settings: Settings): string {
    const hours = this.hoursAsNumber();
    if (!hours) return 'Set at least 1 hour';
    // Counted from when maintenance was switched on (or from now, if it has no start time yet).
    const startedAt = settings.maintenance.startedAt ? new Date(settings.maintenance.startedAt).getTime() : Date.now();
    const endsAt = new Date(startedAt + hours * MS_PER_HOUR).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `App returns automatically at ${endsAt}`;
  }

  // "Save settings": sends the minimums and the maintenance duration.
  save(): void {
    this.api.put('/settings', {
      minDeposit: Number(this.minDeposit),
      minWithdrawal: Number(this.minWithdrawal),
      maintenanceHours: this.hoursAsNumber(),
    }).subscribe({
      next: () => {
        this.ui.toast('Settings saved');
        this.reload();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // The maintenance switch: turns maintenance mode on or off immediately.
  toggleMaintenance(): void {
    const settings = this.data();
    if (!settings) return;
    const wasEnabled = settings.maintenance.enabled;
    this.api.post('/settings/maintenance', { enabled: !wasEnabled }).subscribe({
      next: () => {
        const message = wasEnabled ? 'Maintenance mode off' : `Maintenance mode on for ${this.hoursAsNumber()} h`;
        this.ui.toast(message);
        this.reload();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // A Telegram row's Save button: saves that one link.
  saveLink(key: string, label: string): void {
    const link = (this.links[key] ?? '').trim();
    this.api.put(`/settings/telegram/${key}`, { value: link }).subscribe({
      next: () => {
        this.ui.toast(`${label} link saved`);
        this.reload();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }
}
