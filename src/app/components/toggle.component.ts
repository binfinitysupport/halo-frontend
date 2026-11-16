import { Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [NgStyle],
  template: `
    <button type="button" role="switch" class="toggle" [class.lg]="large()"
            [attr.aria-checked]="on()" (click)="changed.emit()"
            [ngStyle]="{ background: on() ? onColor() : '#2A2B30', justifyContent: on() ? 'flex-end' : 'flex-start' }">
      <span class="knob"></span>
    </button>`,
})
export class ToggleComponent {
  on = input(false);
  large = input(false);
  onColor = input('#0A63F1');
  changed = output<void>();
}
