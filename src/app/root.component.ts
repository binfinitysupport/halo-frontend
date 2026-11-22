// Top-level shell of the whole app. It contains only <router-outlet />, where the router
// puts the page for the current URL: "/" is the B-Infinity user app, "/admin" is the admin panel.
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class RootComponent {}
