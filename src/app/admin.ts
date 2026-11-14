import { Component, inject, signal } from '@angular/core';
import { Api } from './api';
@Component({ selector: 'app-admin', standalone: true, template: `
<main>
<div class="row"><button [class.g]="tab()!=='polls'" (click)="tab.set('polls')">Create poll</button><button [class.g]="tab()!=='controls'" (click)="tab.set('controls')">Controls</button></div>
@if (tab()==='polls') {
 <section class="card"><h3>New poll</h3>
  <div class="row"><input #n placeholder="Poll name (Poll 1)"><input #u placeholder="Username" autocapitalize="none"><input #p placeholder="Password">
   <button (click)="add(n,u,p)">Add poll</button></div>
  <p class="mut">Bulk upload: pick a CSV (name,username,password per line) or paste lines below.</p>
  <input type="file" accept=".csv,.txt" (change)="load($event,bulk)"><textarea #bulk rows="3" placeholder="Poll 1,bus1,pass1"></textarea>
  <button (click)="addBulk(bulk)">Upload polls</button></section>
 @for (p of api.polls(); track p.id) {
  <section class="card"><div class="row"><b class="sp">{{p.name}}</b><span class="mut">user: {{p.username}}</span>
   <button class="g s" (click)="editPoll(p)">Edit</button><button class="g s" (click)="toggle(p.id)">{{open()===p.id?'Hide':'Spots'}} ({{p.records.length}})</button><button class="d s" (click)="delPoll(p)">Delete</button></div>
   @if (open()===p.id) {
    <div class="row" style="margin-top:8px"><input #r placeholder="Add a spot, e.g. Right from next spot"><button (click)="addRec(p.id,r)">Add</button></div>
    <input type="file" accept=".csv,.txt" (change)="load($event,bl)"><textarea #bl rows="3" placeholder="One spot per line (bulk)"></textarea>
    <button class="g" (click)="addRecs(p.id,bl)">Upload spots</button>
    @for (r of p.records; track r.id) { <div class="row" style="padding:4px 0;border-top:1px solid var(--line)"><span class="sp">{{r.label}} @if (r.is_pickup) {<span class="chip active">Pickup</span>}</span>
     <button class="g s" (click)="act('PUT','/records/'+r.id,{is_pickup:!r.is_pickup})">{{r.is_pickup?'Remove pickup':'Mark as pickup'}}</button><button class="g s" (click)="editRec(r)">Edit</button><button class="d s" (click)="delRec(r)">×</button></div> }
   }</section> } @empty { <span class="mut">No polls yet. Create the first one above.</span> }
} @else {
 @for (p of api.polls(); track p.id) {
  <section class="card"><div class="row"><b class="sp">{{p.name}}</b>
   <label class="sw"><input type="checkbox" [checked]="p.active" (change)="act('PUT','/polls/'+p.id,{active:!p.active})"> {{p.active?'Active':'Inactive'}}</label></div>
  @for (j of p.journeys; track j.id) {
   <div style="padding:8px 0;border-top:1px solid var(--line)" class="row">
    <input type="date" style="flex:0 0 150px" [value]="j.date" (change)="act('PUT','/journeys/'+j.id,{date:$any($event.target).value})">
    <span class="sp">{{j.source}} to {{j.destination}} <span class="chip" [class]="'chip '+j.status">{{j.direction==='return'?'return · ':''}}{{j.status}}</span></span>
    @if (j.status==='planned') { <button class="s" (click)="act('PUT','/journeys/'+j.id,{status:'active'})">Start</button> }
    @if (j.status==='active') { <button class="s" (click)="act('PUT','/journeys/'+j.id,{status:'completed'})">Complete</button> }
    @if (j.status==='completed') { <button class="s" (click)="act('POST','/journeys/'+j.id+'/return',{date:today()})">Return journey</button> }
    <button class="g s" (click)="editJ(j)">Edit</button><button class="d s" (click)="act('DELETE','/journeys/'+j.id)">×</button></div> }
  <div class="row"><input #d type="date" [value]="today()" style="flex:0 0 150px"><input #s placeholder="Source"><input #t placeholder="Destination">
   <button (click)="addJ(p.id,d,s,t)">Add date</button></div></section> } @empty { <span class="mut">Create a poll first.</span> }
}</main>` })
export class Admin {
  api = inject(Api); tab = signal<'polls' | 'controls'>('polls'); open = signal(0);
  today() { return new Date().toISOString().slice(0, 10); }
  toggle(id: number) { this.open.set(this.open() === id ? 0 : id); }
  act(m: string, u: string, b?: any) { return this.api.act(() => this.api.call(m, u, b)); }
  load(e: Event, ta: HTMLTextAreaElement) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) f.text().then(t => ta.value = t); }
  async add(n: HTMLInputElement, u: HTMLInputElement, p: HTMLInputElement) {
    if (!n.value || !u.value || !p.value) return this.api.say('Fill name, username and password');
    await this.act('POST', '/polls', { name: n.value, username: u.value, password: p.value }); n.value = u.value = p.value = ''; }
  async addBulk(t: HTMLTextAreaElement) {
    const polls = t.value.split('\n').map(l => l.split(',').map(x => x.trim())).filter(c => c.length >= 3 && c[0].toLowerCase() !== 'name').map(([name, username, password]) => ({ name, username, password }));
    if (!polls.length) return this.api.say('No valid lines. Use: name,username,password');
    await this.act('POST', '/polls', { polls }); t.value = ''; this.api.say(polls.length + ' polls uploaded'); }
  editPoll(p: any) { const name = prompt('Poll name', p.name); if (!name) return; const username = prompt('Username', p.username); const password = prompt('New password (leave blank to keep)') || undefined; this.act('PUT', '/polls/' + p.id, { name, username, password }); }
  delPoll(p: any) { if (confirm(`Delete ${p.name} and all its spots and journeys?`)) this.act('DELETE', '/polls/' + p.id); }
  async addRec(id: number, i: HTMLInputElement) { if (!i.value.trim()) return; await this.act('POST', `/polls/${id}/records`, { labels: [i.value] }); i.value = ''; }
  async addRecs(id: number, t: HTMLTextAreaElement) { await this.act('POST', `/polls/${id}/records`, { labels: t.value.split('\n') }); t.value = ''; }
  editRec(r: any) { const label = prompt('Spot name', r.label); if (label?.trim()) this.act('PUT', '/records/' + r.id, { label }); }
  delRec(r: any) { this.act('DELETE', '/records/' + r.id); }
  addJ(id: number, d: HTMLInputElement, s: HTMLInputElement, t: HTMLInputElement) {
    if (!d.value || !s.value || !t.value) return this.api.say('Fill date, source and destination');
    this.act('POST', '/journeys', { poll_id: id, date: d.value, source: s.value, destination: t.value }); s.value = t.value = ''; }
  editJ(j: any) { const source = prompt('Source', j.source); const destination = prompt('Destination', j.destination); if (source && destination) this.act('PUT', '/journeys/' + j.id, { source, destination }); }
}
