// Pop-up for reviewing one KYC request (opened from the KYC review page).
// Shows the person, the document details and a drawing of the ID card's front and back.
// Approve/Reject emit `decided` (true/false); the KYC page sends the decision to the backend.
import { Component, computed, input, output } from '@angular/core';
import { KycItem } from '../core/models';
import { minutesAgo } from '../core/format';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-kyc-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    <!-- Dark background; clicking it closes the pop-up -->
    <div class="overlay" style="z-index:50;background:rgba(0,0,0,.7)" (click)="closed.emit()"></div>
    <div class="modal">
      <!-- Header: name, phone, country, submitted time, close button -->
      <div class="row gap12">
        <div class="grow">
          <div style="font-size:18px;font-weight:800">{{ item().name }}</div>
          <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.55)">
            {{ item().phone }} · {{ item().country }} · {{ submittedAgo() }}
          </div>
        </div>
        <button class="x-btn" (click)="closed.emit()" aria-label="Close">
          <app-icon name="close" [size]="15" [width]="2.4" />
        </button>
      </div>

      <!-- Document type and number -->
      <div class="stat-grid">
        <div class="stat"><div class="stat-k">Document</div><div class="stat-v">{{ item().doc }}</div></div>
        <div class="stat"><div class="stat-k">Number</div><div class="stat-v mono">{{ item().num }}</div></div>
      </div>

      <!-- Drawings of the ID card (front and back) -->
      <div class="cert-row">
        <div class="cert-col">
          <div class="cert-label">Front of certificate</div>
          <div class="cert">
            <div class="photo"><span></span></div>
            <div class="fields">
              <div class="doc">{{ item().doc.toUpperCase() }}</div>
              <div class="strong14">{{ item().name }}</div>
              <div class="id-line">{{ item().num }}</div>
              <div class="bar" style="width:70%"></div>
              <div class="bar" style="width:50%"></div>
            </div>
          </div>
        </div>
        <div class="cert-col">
          <div class="cert-label">Back of certificate</div>
          <div class="cert back">
            <div class="stripe"></div>
            <div class="bars">
              <div class="bar" style="width:80%"></div>
              <div class="bar" style="width:60%"></div>
            </div>
            <div class="mrz">{{ mrz() }}</div>
          </div>
        </div>
      </div>

      <!-- Decision buttons -->
      <div class="actions-end">
        <button class="btn lg reject" (click)="decided.emit(false)">Reject</button>
        <button class="btn lg approve" (click)="decided.emit(true)">Approve</button>
      </div>
    </div>
  `,
})
export class KycModalComponent {
  item = input.required<KycItem>(); // the request being reviewed
  closed = output<void>(); // close without deciding
  decided = output<boolean>(); // true = approve, false = reject

  // e.g. "12 min ago"
  submittedAgo = computed(() => minutesAgo(this.item().submittedAt));
  // Machine-readable zone line drawn on the back of the ID card (same as the prototype).
  mrz = computed(() => `<<${this.item().num}<<${this.item().name.toUpperCase().replace(' ', '<')}<<<<`);
}
