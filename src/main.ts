// Entry point of the Angular app.
// Starts RootComponent (which only holds the router outlet) with the providers from app.config.ts.
// The router then shows the user app at "/" or the admin panel at "/admin" (see app.routes.ts).
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { RootComponent } from './app/root.component';

bootstrapApplication(RootComponent, appConfig).catch((error) => console.error(error));
