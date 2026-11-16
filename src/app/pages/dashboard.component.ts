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
    @if (error(); as e) {
      <div class="empty">{{ e }}</div>
    }
    @if (!kpis() && !error()) { <app-loader /> }
    @if (cards().length) {
      <div class="kpi-grid">
        @for (c of cards(); track c.label) {
          <div class="kpi">
            <div class="kpi-label">{{ c.label }}</div>
            <div class="kpi-value">{{ c.value }}</div>
            <div class="kpi-delta" [style.color]="c.color">{{ c.delta }}</div>
          </div>
        }
      </div>
    }
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  kpis = signal<Kpis | null>(null);
  error = signal<string | null>(null);

  cards = computed(() => {
    const d = this.kpis();
    if (!d) return [];
    const GREEN = '#16C784', AMBER = '#F5A524', MUTED = 'rgba(255,255,255,.55)';
    return [
      { label: 'Total users', value: String(d.totalUsers), delta: '+184 this week', color: GREEN },
      { label: 'Active today', value: fmt(d.activeToday, 0), delta: '+6.2% vs yesterday', color: GREEN },
      { label: 'User balances', value: `${fmt(d.userBalances, 0)} USDT`, delta: 'Across all wallets', color: MUTED },
      { label: 'Deposits credited', value: `${fmt(d.depositsCredited, 0)} USDT`, delta: 'Auto-credited via gateway', color: MUTED },
      { label: 'Pending withdrawals', value: String(d.pendingWithdrawals.count), delta: `${fmt(d.pendingWithdrawals.amount, 0)} USDT waiting`, color: AMBER },
      { label: 'Platform fee revenue', value: `${fmt(d.feeRevenue)} USDT`, delta: `${d.feePercent}% of task income`, color: GREEN },
    ];
  });

  constructor() {
    this.api.get<Kpis>('/dashboard/kpis').subscribe({
      next: (d) => this.kpis.set(d),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
