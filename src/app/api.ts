import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
@Injectable({ providedIn: 'root' })
export class Api {
  router = inject(Router);
  token = signal(localStorage.getItem('t') || '');
  me = signal<any>(JSON.parse(localStorage.getItem('u') || 'null'));
  polls = signal<any[]>([]); msgs = signal<any[]>([]); unread = signal(0); toast = signal(''); toastChat = signal(false); chatOpen = signal(false); private busy = false; private again = false;
  private es?: EventSource;
  async call(method: string, url: string, body?: any) {
    const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token() }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && this.token()) { this.logout(); throw new Error('Session expired'); }
    if (!r.ok) throw new Error(d.error || 'Something went wrong');
    return d;
  }
  async act(f: () => Promise<any>) { try { await f(); } catch (e: any) { this.say(e.message); } }
  say(t: string, chat = false) { this.toast.set(t); this.toastChat.set(chat); setTimeout(() => this.toast() === t && this.toast.set(''), 5000); }
  openChat() { this.chatOpen.set(true); this.unread.set(0); this.toast.set(''); }
  async login(username: string, password: string) {
    const d = await this.call('POST', '/login', { username, password });
    localStorage.setItem('t', d.token); localStorage.setItem('u', JSON.stringify(d.user));
    this.token.set(d.token); this.me.set(d.user); this.connect(); this.router.navigateByUrl(d.user.role === 'admin' ? '/admin' : '/');
  }
  logout() { this.es?.close(); localStorage.clear(); this.token.set(''); this.me.set(null); this.polls.set([]); this.router.navigateByUrl('/login'); }
  async loadState() {
    if (this.busy) { this.again = true; return; } this.busy = true;
    try { this.polls.set((await this.call('GET', '/state')).polls); } finally { this.busy = false; }
    if (this.again) { this.again = false; return this.loadState(); }
  }
  async loadMsgs() { this.msgs.set(await this.call('GET', '/messages')); }
  connect() {
    if (!this.token()) return; this.es?.close();
    this.loadState().catch(() => 0); this.loadMsgs().catch(() => 0);
    this.es = new EventSource('/api/stream?token=' + this.token());
    this.es.addEventListener('state', () => this.loadState());
    this.es.addEventListener('msg', (e: any) => {
      const d = JSON.parse(e.data); this.loadMsgs();
      const mine = d.sender === this.me()?.name;
      if (d.sender && (d.reached || (!mine && !this.chatOpen()))) {
        if (!mine && !this.chatOpen()) this.unread.update(n => n + 1);
        this.say(`${d.reached ? '🚌 ' : '💬 '}${d.sender} · ${d.body}`, true);
        if (!mine && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(d.sender, { body: d.body });
      }
    });
  }
  at(p: any) { const j = this.journey(p); return j?.current_record_id ? this.recs(p).findIndex((r: any) => r.id === j.current_record_id) : -1; }
  // helpers shared by views
  journey(p: any) { return p.journeys.find((j: any) => j.status === 'active') || p.journeys.find((j: any) => j.status === 'planned'); }
  recs(p: any) { const j = this.journey(p); return j?.direction === 'return' ? [...p.records].reverse() : p.records; }
}
