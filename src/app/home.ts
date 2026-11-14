import { Component, inject, computed } from '@angular/core';
import { Api } from './api';
@Component({ selector: 'app-home', standalone: true, template: `
<main>
@if (mine(); as p) {
 <section class="card"><h2>{{p.name}}</h2>
  @if (api.journey(p); as j) {
   @let rs = api.recs(p); @let at = api.at(p);
   <div class="mut">{{j.date}} · {{j.source}} to {{j.destination}} · <span class="chip" [class]="'chip '+j.status">{{j.status}}</span></div>
   @if (j.status==='active') {
    <p class="mut">Tick each spot as your bus reaches it, in order. Everyone gets a "Reached" alert.</p>
    @for (r of rs; track r.id; let i = $index) {
     <label class="opt" [class.off]="i>at+1">
      <input type="checkbox" [checked]="i<=at" [disabled]="i>at+1 || i<at" (change)="pick(p, r, $any($event.target).checked)"><span class="sp">{{r.label}}</span>@if (r.is_pickup) {<span class="chip active">Pickup</span>}</label>
    } @empty { <span class="mut">The admin has not added spots yet.</span> }
    <p class="mut">Ticked by mistake? Untick the latest spot to step back.</p>
   } @else { <p class="mut">Waiting for the admin to start this journey.</p> }
  } @else { <p class="mut">No journey scheduled yet.</p> }
 </section>
} @else { <section class="card"><h3>No bus on this account</h3><span class="mut">Open Track others to watch every bus live.</span></section> }
</main>` })
export class Home {
  api = inject(Api);
  mine = computed(() => this.api.polls().find(p => p.id === this.api.me()?.pollId));
  async pick(p: any, r: any, on: boolean) {
    await this.api.act(() => this.api.call('POST', `/polls/${p.id}/position`, on ? { record_id: r.id } : { undo: true, from: r.id }));
    this.api.loadState();
  }
}
