// On/off switch: <app-toggle [on]="isLive" (changed)="toggle()" />.
// It does not change itself: clicking only emits `changed`; the parent saves the new value and passes
// the updated `on` back in. That keeps the switch in sync with what is really saved.
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
  large = input(false); // bigger size, used for maintenance mode
  onColor = input('#0A63F1'); // background colour when on
  changed = output<void>();
}
