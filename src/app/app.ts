import { Component, inject, OnInit, ElementRef, viewChild, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Api } from './api';
@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive], template: `
@if (api.token()) {
<header><b>🚌 Bus Tracker</b><span class="sp"></span>
  @if (api.me()?.role!=='admin') { <button routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">My bus</button> }
  <button routerLink="/track" routerLinkActive="on">Track others</button>
  @if (api.me()?.role==='admin') { <button routerLink="/admin" routerLinkActive="on">Admin</button> }
  <button (click)="api.logout()">Sign out</button></header>
<button class="fab" aria-label="Messages" (click)="open()">💬@if (api.unread()) {<i>{{api.unread()}}</i>}</button>
@if (api.chatOpen()) {
<section class="chat"><div class="row"><h3 class="sp">Messages</h3>@if (api.me().role==='admin') { <button class="d s" (click)="clear()">Delete all</button> }<button class="g s" (click)="api.chatOpen.set(false)">Close</button></div>
 <div class="msgs" #box>
  @for (m of api.msgs(); track m.id) {
   <div class="m" [class.me]="m.sender_key===api.me().key"><small>{{m.sender}} · {{time(m.created_at)}}{{m.edited?' · edited':''}}</small>{{m.body}}
    @if (m.sender_key===api.me().key) { <div class="row"><button class="g s" (click)="edit(m)">Edit</button><button class="g s" (click)="del(m)">Delete</button></div> }
    @else if (api.me().role==='admin') { <div class="row"><button class="g s" (click)="del(m)">Delete</button></div> }
   </div>
  } @empty { <span class="mut">No messages yet. Say hello to the other polls.</span> }
 </div>
 <form class="row" (submit)="send($event,t)"><input #t placeholder="Write a message" maxlength="1000"><button>Send</button></form></section>}
@if (api.toast()) { <div class="toast" role="status" (click)="tapToast()">{{api.toast()}}@if (api.toastChat()) {<small> · tap to open</small>}</div> }
}
<router-outlet />` })
export class App implements OnInit {
  api = inject(Api); box = viewChild<ElementRef>('box');
  constructor() { effect(() => { this.api.msgs(); this.api.chatOpen(); setTimeout(() => { const b = this.box()?.nativeElement; if (b) b.scrollTop = b.scrollHeight; }, 30); }); }
  ngOnInit() { this.api.connect(); }
  tapToast() { this.api.toastChat() ? this.open() : this.api.toast.set(''); }
  clear() { if (confirm('Delete ALL messages for everyone?')) this.api.act(() => this.api.call('DELETE', '/messages')); }
  open() { this.api.openChat(); if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); }
  time(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  send(e: Event, t: HTMLInputElement) { e.preventDefault(); const b = t.value.trim(); if (!b) return; t.value = ''; this.api.act(() => this.api.call('POST', '/messages', { body: b })); }
  edit(m: any) { const b = prompt('Edit message', m.body); if (b?.trim()) this.api.act(() => this.api.call('PUT', '/messages/' + m.id, { body: b })); }
  del(m: any) { if (confirm('Delete this message?')) this.api.act(() => this.api.call('DELETE', '/messages/' + m.id)); }
}
