import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { UserAppComponent } from './user/user-app.component';

export const routes: Routes = [
  { path: '', component: UserAppComponent, pathMatch: 'full' },
  { path: 'admin', component: AppComponent },
  { path: '**', redirectTo: '' },
];
