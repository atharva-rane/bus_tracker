import { Component, inject, computed } from "@angular/core";
import { Api } from "./api";
@Component({
  selector: "app-track",
  standalone: true,
  template: ` <main>
    <h2><span class="live"></span>Live bus tracker</h2>
    @if (!api.polls().length) {
      <section class="card mut">
        No buses yet. The admin creates them in Admin.
      </section>
    } @else {
      @for (m of maps(); track m.dir) {
        <section class="card">
          <h3>{{ m.title }} journey</h3>
          <svg
            class="map"
            [attr.viewBox]="'0 0 360 ' + m.h"
            role="img"
            [attr.aria-label]="m.title + ' journey map'"
          >
            <path [attr.d]="m.all" class="trk" />
            <path [attr.d]="m.all" class="trk2" />
            @for (q of m.pts; track q.k) {
              <g [attr.transform]="'translate(' + q.x + ' ' + q.y + ')'">
                @if (q.ep) {
                  <circle r="14" [attr.class]="'ep ep-' + q.ep" />
                  <text y="6" class="epi">
                    {{ q.ep === "s" ? "📍" : "🏁" }}
                  </text>
                } @else {
                  <circle
                    r="7"
                    [attr.class]="
                      'nd ' +
                      (q.buses.length ? 'done ' : '') +
                      (q.pick ? 'pick' : '') +
                      (q.drop ? ' drop' : '')
                    "
                  />
                }
                @for (b of q.buses; track b.p.id; let k = $index) {
                  @let o = off(q.buses.length, k);
                  <g [attr.transform]="'translate(' + o.x + ' ' + o.y + ')'">
                    <circle r="15" class="busc" [style.fill]="b.c" />
                    <text y="5.5" class="bn">{{ b.n }}</text>
                  </g>
                }
                <text
                  y="34"
                  text-anchor="middle"
                  [attr.class]="q.buses.length ? 'lb cur' : 'lb'"
                >
                  @for (t of wrap(q.label); track $index) {
                    <tspan x="0" [attr.dy]="$index ? 13 : 0">{{ t }}</tspan>
                  }
                </text>
              </g>
            }
          </svg>
        </section>
      } @empty {
        <section class="card mut">
          No active bus is running or scheduled. Activate buses and add journeys
          in Admin.
        </section>
      }
      <section class="card">
        <h3>Buses</h3>
        @for (p of api.polls(); track p.id) {
          @let n = api.recs(p).length; @let a = api.at(p);
          @let j = api.journey(p);
          <div class="mini">
            <b class="n" [style.background]="col(p)">{{ num(p) }}</b>
            <div>
              <div class="row">
                <b>{{ p.name }}</b
                ><span class="sp"></span>
                @if (p.active && j) {
                  <span class="chip" [class]="'chip ' + j.status">{{
                    j.status
                  }}</span>
                } @else {
                  <span class="chip">Not running</span>
                }
              </div>
              <div class="mut">
                {{
                  a >= 0
                    ? "At " + api.recs(p)[a].label
                    : p.active && j
                      ? "Waiting to leave"
                      : "Not active"
                }}
                @if (j) {
                  · {{ j.source }} to {{ j.destination }}
                }
                @if (j?.reached_at) {
                  · {{ time(j.reached_at) }}
                }
              </div>
              <div class="bar" style="margin:6px 0 0">
                <i [style.width.%]="n ? ((a + 1) * 100) / n : 0"></i>
              </div>
            </div>
          </div>
        }
      </section>
    }
  </main>`,
})
export class Track {
  api = inject(Api);
  colors = [
    "#1f4fd8",
    "#0f9d74",
    "#e8590c",
    "#9333ea",
    "#d6336c",
    "#0ea5e9",
    "#ca8a04",
    "#475569",
  ];
  key = (s: string) => s.trim().toLowerCase();
  col(p: any) {
    return this.colors[
      Math.max(
        0,
        this.api.polls().findIndex((x) => x.id === p.id),
      ) % this.colors.length
    ];
  }
  num(p: any) {
    return (p.name.match(/\d+/) || [p.id])[0];
  }
  time(d: string) {
    return new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  // One map per journey direction, each in that direction's own travel order: source, its spots, destination.
  // Only directions in action are drawn: running buses first; if none, planned ones; if none, completed ones.
  maps() {
    const dirOf = (p: any) => this.api.journey(p).direction || "onward";
    const live = this.api
      .polls()
      .filter((p) => p.active && this.api.journey(p));
    const lvl = (st: string) =>
      live.filter((p) => this.api.journey(p).status === st);
    const shown =
      [lvl("active"), lvl("planned"), lvl("completed")].find((l) => l.length) ||
      [];
    return (["onward", "return"] as const)
      .filter((d) => shown.some((p) => dirOf(p) === d))
      .map((D) => {
        const bs = live.filter((p) => dirOf(p) === D),
          cols = 3,
          gx = [52, 180, 308],
          gy = 104;
        const keys: string[] = [],
          names = new Map<string, string>(),
          picks = new Set<string>();
        for (const p of bs) {
          let prev = -1;
          for (const r of this.api.recs(p)) {
            const k = this.key(r.label);
            let i = keys.indexOf(k);
            if (r.is_pickup) picks.add(k);
            if (i < 0) {
              i = prev >= 0 ? prev + 1 : keys.length;
              keys.splice(i, 0, k);
              names.set(k, r.label);
            }
            prev = i;
          }
        }
        const c = new Map<string, { n: number; j: any }>(); // most common source/destination among these buses
        for (const p of bs) {
          const j = this.api.journey(p),
            k = j.source + "|" + j.destination,
            e = c.get(k) || { n: 0, j };
          e.n++;
          c.set(k, e);
        }
        const r = [...c.values()].sort((x, y) => y.n - x.n)[0].j;
        const items: any[] = [
          { k: "#s", label: r.source, ep: "s" },
          ...keys.map((k) => ({
            k,
            label: names.get(k)!,
            pick: D === "onward" && picks.has(k),
            drop: D === "return" && picks.has(k),
          })),
          { k: "#d", label: r.destination, ep: "d" },
        ];
        const pts = items.map((it, i) => ({
          ...it,
          i,
          buses: [] as any[],
          x: gx[Math.floor(i / cols) % 2 ? cols - 1 - (i % cols) : i % cols],
          y: 56 + Math.floor(i / cols) * gy,
        }));
        for (const p of bs) {
          const j = this.api.journey(p),
            a = this.api.at(p);
          let k = "";
          if (j.status === "completed")
            k = "#d"; // finished: around the destination
          else if (j.status === "active" && a < 0)
            k = "#s"; // just started: around the source
          else if (j.status === "active")
            k = this.key(this.api.recs(p)[a].label);
          pts
            .find((q) => q.k === k)
            ?.buses.push({ p, n: this.num(p), c: this.col(p) });
        }
        return {
          dir: D,
          title: D === "return" ? "Return" : "Onward",
          pts,
          all: "M" + pts.map((q) => q.x + " " + q.y).join(" L"),
          h: 56 + Math.floor((pts.length - 1) / cols) * gy + 66,
        };
      });
  }
  off(n: number, k: number) {
    if (n < 2) return { x: 0, y: 0 };
    const a = Math.PI * (1.1 + (0.8 * k) / (n - 1)),
      r = n <= 4 ? 25 : 33;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }
  wrap(s: string) {
    const L = [""];
    for (const w of s.split(" ")) {
      const l = L[L.length - 1],
        t = (l + " " + w).trim();
      if (!l || t.length <= 13) L[L.length - 1] = t;
      else L.push(w);
    }
    if (L.length > 2) {
      L.length = 2;
      L[1] += "…";
    }
    return L.map((t) => (t.length > 14 ? t.slice(0, 13) + "…" : t));
  }
}
