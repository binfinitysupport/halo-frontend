// Admin "Dashboard" page: six summary cards (users, balances, deposits, pending withdrawals, fee revenue).
// The numbers come from GET /api/dashboard/kpis; the card texts and colours are built in `cards` below.
import { LoaderComponent } from '../components/loader.component';
import { Component, computed, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { Kpis } from '../core/models';
import { fmt } from '../core/format';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LoaderComponent],
  template: `
    <!-- Error from the API, if loading failed -->
    @if (error(); as errorText) {
      <div class="empty">{{ errorText }}</div>
    }
    <!-- Spinner while the numbers are loading -->
    @if (!kpis() && !error()) { <app-loader /> }
    <!-- The summary cards -->
    @if (cards().length) {
      <div class="kpi-grid">
        @for (card of cards(); track card.label) {
          <div class="kpi">
            <div class="kpi-label">{{ card.label }}</div>
            <div class="kpi-value">{{ card.value }}</div>
            @if (card.delta) {
              <div class="kpi-delta" [style.color]="card.color">{{ card.delta }}</div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  kpis = signal<Kpis | null>(null); // null until the API answers
  error = signal<string | null>(null);

  // One entry per card: label, big value, small line under it, and that line's colour.
  // Recalculated automatically when `kpis` is set.
  cards = computed(() => {
    const kpis = this.kpis();
    if (!kpis) return [];
    const GREEN = '#16C784';
    const AMBER = '#F5A524';
    const MUTED = 'rgba(255,255,255,.55)';
    return [
      { label: 'Total users', value: String(kpis.totalUsers), delta: '', color: GREEN },
      { label: 'Active today', value: fmt(kpis.activeToday, 0), delta: '', color: GREEN },
      { label: 'User balances', value: `${fmt(kpis.userBalances, 0)} USDT`, delta: 'Across all wallets', color: MUTED },
      { label: 'Deposits credited', value: `${fmt(kpis.depositsCredited, 0)} USDT`, delta: 'Auto-credited via gateway', color: MUTED },
      { label: 'Pending withdrawals', value: String(kpis.pendingWithdrawals.count), delta: `${fmt(kpis.pendingWithdrawals.amount, 0)} USDT waiting`, color: AMBER },
      { label: 'Platform fee revenue', value: `${fmt(kpis.feeRevenue)} USDT`, delta: `${kpis.feePercent}% of task income`, color: GREEN },
    ];
  });

  // Loads the numbers once, when the page opens.
  constructor() {
    this.api.get<Kpis>('/dashboard/kpis').subscribe({
      next: (kpis) => this.kpis.set(kpis),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
