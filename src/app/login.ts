import { Component, inject, signal } from '@angular/core';
import { Api } from './api';
@Component({ selector: 'app-login', standalone: true, template: `
<div class="login"><form class="card" (submit)="go($event,u.value,p.value)">
  <h2>Bus Tracker</h2><span class="mut">Sign in with the username and password you were given.</span>
  <input #u placeholder="Username" autocomplete="username" autocapitalize="none" required>
  <input #p type="password" placeholder="Password" autocomplete="current-password" required>
  @if (err()) { <span style="color:var(--bad)">{{err()}}</span> }
  <button [disabled]="busy()">{{busy() ? 'Signing in…' : 'Sign in'}}</button></form></div>` })
export class Login {
  api = inject(Api); err = signal(''); busy = signal(false);
  async go(e: Event, u: string, p: string) { e.preventDefault(); this.busy.set(true); this.err.set('');
    try { await this.api.login(u, p); } catch (x: any) { this.err.set(x.message); } this.busy.set(false); }
}
