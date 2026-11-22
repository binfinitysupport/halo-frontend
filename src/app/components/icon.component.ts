// <app-icon name="users" /> draws one of the line icons below as an SVG.
// To add an icon, add its SVG path data (24×24 viewBox) to ICON under a new name.
import { Component, computed, input } from '@angular/core';

// SVG path data for each icon name (same paths as the admin prototype).
export const ICON: Record<string, string> = {
  dash: 'M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  kyc: 'M4 5h16v14H4zM8 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM6 16a4 4 0 0 1 8 0M15 9h3M15 13h3',
  dep: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  wd: 'M12 21V9M7 14l5-5 5 5M5 3h14',
  content: 'M4 5h16v11H4zM8 20h8M12 16v4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  shield: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  reload: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  logout: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         [attr.stroke]="stroke()" [attr.stroke-width]="width()" stroke-linecap="round"
         stroke-linejoin="round" style="flex:none">
      <path [attr.d]="path()"></path>
    </svg>`,
})
export class IconComponent {
  name = input.required<string>(); // a key of ICON
  size = input(18); // width and height in px
  stroke = input('#fff'); // line colour
  width = input(1.9); // line thickness
  path = computed(() => ICON[this.name()] ?? ''); // unknown names draw nothing
}
