import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { App } from './app/app';
import { Api } from './app/api';
import { Login } from './app/login';
import { Home } from './app/home';
import { Track } from './app/track';
import { Admin } from './app/admin';
const authed = () => inject(Api).token() ? true : inject(Router).parseUrl('/login');
const isAdmin = () => inject(Api).me()?.role === 'admin' ? true : inject(Router).parseUrl('/');
const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Home, canActivate: [authed] },
  { path: 'track', component: Track, canActivate: [authed] },
  { path: 'admin', component: Admin, canActivate: [authed, isAdmin] },
  { path: '**', redirectTo: '' }];
bootstrapApplication(App, { providers: [provideZonelessChangeDetection(), provideRouter(routes)] });
