import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Top-level shell. "/" is the user app, "/admin" is the admin panel.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class RootComponent {}
