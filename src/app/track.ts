import { Component, inject, computed } from '@angular/core';
import { Api } from './api';
@Component({ selector: 'app-track', standalone: true, template: `
<main>
<h2><span class="live"></span>Live bus tracker</h2>
@if (!api.polls().length) { <section class="card mut">No buses yet. The admin creates them in Admin.</section> }
@else {
 @let m = map();
 <section class="card">
  <div class="mut">One map for every bus. A numbered circle sits on the spot where that bus is now. Amber spots are pickup points.</div>
  <svg class="map" [attr.viewBox]="'0 0 360 '+m.h" role="img" aria-label="Live map of all buses">
   <path [attr.d]="m.all" class="trk"/><path [attr.d]="m.all" class="trk2"/>
   @for (q of m.pts; track q.k) {
    <g [attr.transform]="'translate('+q.x+' '+q.y+')'">
     <circle r="7" [attr.class]="'nd ' + (q.buses.length ? 'done ' : '') + (q.pick ? 'pick' : '')"/>
     @for (b of q.buses; track b.p.id; let k = $index) { @let o = off(q.buses.length, k);
      <g [attr.transform]="'translate('+o.x+' '+o.y+')'"><circle r="15" class="busc" [attr.fill]="b.c"/><text y="5.5" class="bn">{{b.n}}</text></g> }
     <text y="34" text-anchor="middle" [attr.class]="q.buses.length ? 'lb cur' : 'lb'">@for (t of wrap(q.label); track $index) {<tspan x="0" [attr.dy]="$index ? 13 : 0">{{t}}</tspan>}</text>
    </g>
   }
  </svg>
  @if (!m.pts.length) { <p class="mut">No spots added yet.</p> }
 </section>
 <section class="card"><h3>Buses</h3>
  @for (p of api.polls(); track p.id) { @let n = api.recs(p).length; @let a = api.at(p); @let j = api.journey(p);
   <div class="mini"><b class="n" [style.background]="col(p)">{{num(p)}}</b>
    <div><div class="row"><b>{{p.name}}</b><span class="sp"></span>
      @if (p.active && j) { <span class="chip" [class]="'chip '+j.status">{{j.status}}</span> } @else { <span class="chip">Not running</span> }</div>
     <div class="mut">{{ a>=0 ? 'At ' + api.recs(p)[a].label : (p.active && j ? 'Waiting to leave' : 'Not active') }}@if (j) { · {{j.source}} to {{j.destination}}}@if (j?.reached_at) { · {{time(j.reached_at)}}}</div>
     <div class="bar" style="margin:6px 0 0"><i [style.width.%]="n ? (a+1)*100/n : 0"></i></div></div></div> }
 </section>
}
</main>` })
export class Track {
  api = inject(Api);
  colors = ['#1f4fd8', '#0f9d74', '#e8590c', '#9333ea', '#d6336c', '#0ea5e9', '#ca8a04', '#475569'];
  key = (s: string) => s.trim().toLowerCase();
  col(p: any) { return this.colors[Math.max(0, this.api.polls().findIndex(x => x.id === p.id)) % this.colors.length]; }
  num(p: any) { return (p.name.match(/\d+/) || [p.id])[0]; }
  time(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  // one shared list of spots: merge every bus's spots by name, keeping each bus's order
  spots = computed(() => {
    const keys: string[] = [], names = new Map<string, string>(), picks = new Set<string>();
    for (const p of this.api.polls()) { let prev = -1;
      for (const r of p.records) { const k = this.key(r.label); let i = keys.indexOf(k);
        if (r.is_pickup) picks.add(k);
        if (i < 0) { i = prev >= 0 ? prev + 1 : keys.length; keys.splice(i, 0, k); names.set(k, r.label); } prev = i; } }
    return { keys, names, picks };
  });
  map() {
    const { keys, names, picks } = this.spots(), cols = 3, gx = [52, 180, 308], gy = 104;
    const pts = keys.map((k, i) => ({ k, i, label: names.get(k)!, pick: picks.has(k), buses: [] as any[],
      x: gx[Math.floor(i / cols) % 2 ? cols - 1 - i % cols : i % cols], y: 56 + Math.floor(i / cols) * gy }));
    for (const p of this.api.polls()) { const a = this.api.at(p); if (!this.api.journey(p) || a < 0) continue;
      pts[keys.indexOf(this.key(this.api.recs(p)[a].label))]?.buses.push({ p, n: this.num(p), c: this.col(p) }); }
    return { pts, all: pts.length ? 'M' + pts.map(q => q.x + ' ' + q.y).join(' L') : '', h: pts.length ? 56 + Math.floor((pts.length - 1) / cols) * gy + 66 : 100 };
  }
  off(n: number, k: number) {
    if (n < 2) return { x: 0, y: 0 };
    const a = Math.PI * (1.1 + 0.8 * k / (n - 1)), r = n <= 4 ? 25 : 33; return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }
  wrap(s: string) {
    const L = ['']; for (const w of s.split(' ')) { const l = L[L.length - 1], t = (l + ' ' + w).trim(); if (!l || t.length <= 13) L[L.length - 1] = t; else L.push(w); }
    if (L.length > 2) { L.length = 2; L[1] += '…'; }
    return L.map(t => t.length > 14 ? t.slice(0, 13) + '…' : t);
  }
}
