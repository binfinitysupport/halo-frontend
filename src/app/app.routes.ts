// URL → page table for the router.
//   "/"       → UserAppComponent: the B-Infinity user app. "/?mode=login" opens it directly on the login form.
//   "/admin"  → AppComponent: the admin panel. adminAuthGuard only lets logged-in admins in.
//   anything else → back to "/".
// Admins log in from the user app's login form (Email tab); see UserAppComponent.tryAdminLogin().
import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { UserAppComponent } from './user/user-app.component';
import { adminAuthGuard } from './core/admin-auth.guard';

export const routes: Routes = [
  { path: '', component: UserAppComponent, pathMatch: 'full' },
  { path: 'admin', component: AppComponent, canActivate: [adminAuthGuard] },
  { path: '**', redirectTo: '' },
];
