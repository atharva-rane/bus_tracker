import { Component, inject, computed } from "@angular/core";
import { Api } from "./api";
@Component({
  selector: "app-home",
  standalone: true,
  template: ` <main>
    @if (mine(); as p) {
      @let j = api.journey(p);
      @let on =
        j
          ? api.on(p, j.direction || "onward")
          : api.on(p, "onward") || api.on(p, "return");
      @let rs = api.recs(p); @let at = api.at(p);
      <section class="card">
        <div class="row">
          <h2 class="sp">{{ p.name }}</h2>
          @if (j) {
            <span class="chip" [class]="'chip ' + j.status">{{
              j.status
            }}</span>
          }
        </div>
        @if (j) {
          <div class="mut">
            {{ j.date }} · {{ j.source }} to {{ j.destination
            }}{{ j.direction === "return" ? " · return trip" : "" }}
          </div>
        }
        @if (!on) {
          <div class="banner off">
            ⛔ This bus is deactivated by the admin{{
              j
                ? " for the " +
                  (j.direction === "return" ? "return" : "onward") +
                  " journey"
                : ""
            }}. You cannot start or update the journey until it is activated.
          </div>
        }
        @if (!j) {
          <p class="mut">
            No journey scheduled yet. Ask the admin to add a date, source and
            destination in Controls.
          </p>
        }
        @if (j?.status === "planned") {
          <button
            style="width:100%;margin-top:14px"
            [disabled]="!on"
            (click)="start(p)"
          >
            ▶ Start journey
          </button>
          <p class="mut" style="text-align:center">
            Start the journey first. The spots below unlock after you start.
          </p>
        }
        @if (j?.status === "active") {
          <div class="banner ok">
            <span class="live"></span>
            Journey started{{
              j.started_at ? " at " + time(j.started_at) : ""
            }}. Tick each spot in order.
          </div>
        }
        @if (j?.status === "completed") {
          <div class="banner ok">
            ✅ Journey completed{{ rs[at] ? " at " + rs[at].label : "" }}. The
            admin can schedule the return trip.
          </div>
        }
        <div style="margin-top:10px">
          @for (r of rs; track r.id; let i = $index) {
            <label
              class="opt"
              [class.off]="!on || j?.status !== 'active' || i > at + 1"
            >
              <input
                type="checkbox"
                [checked]="i <= at"
                [disabled]="
                  !on || j?.status !== 'active' || i > at + 1 || i < at
                "
                (change)="pick(p, r, $any($event.target).checked)"
              /><span class="sp">{{ r.label }}</span>
              @if (r.is_pickup) {
                <span class="chip active">{{
                  r.direction === "return" ? "Drop" : "Pickup"
                }}</span>
              }
            </label>
          } @empty {
            <span class="mut">The admin has not added spots yet.</span>
          }
        </div>
        @if (j?.status === "active") {
          <p class="mut">
            Ticked by mistake? Untick the latest spot to step back.
          </p>
        }
        <button
          style="width:100%;margin-top:10px"
          [disabled]="
            !on || j?.status !== 'active' || !rs.length || at !== rs.length - 1
          "
          (click)="end(p)"
        >
          ✔ Complete journey
        </button>
        <p class="mut" style="text-align:center">
          {{
            j?.status === "active"
              ? rs.length && at === rs.length - 1
                ? "All spots reached. You can complete the journey."
                : at +
                  1 +
                  " of " +
                  rs.length +
                  " spots reached. Reach the last spot to complete."
              : j?.status === "completed"
                ? "Journey completed."
                : "Available after you start and reach the last spot."
          }}
        </p>
      </section>
    } @else {
      <section class="card">
        <h3>No bus on this account</h3>
        <span class="mut">Open Track others to watch every bus live.</span>
      </section>
    }
  </main>`,
})
export class Home {
  api = inject(Api);
  mine = computed(() =>
    this.api.polls().find((p) => p.id === this.api.me()?.pollId),
  );
  time(d: string) {
    return new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  async start(p: any) {
    await this.api.act(() => this.api.call("POST", `/polls/${p.id}/start`));
    this.api.loadState();
  }
  async end(p: any) {
    if (!confirm("Complete this journey?")) return;
    await this.api.act(() => this.api.call("POST", `/polls/${p.id}/end`));
    this.api.loadState();
  }
  async pick(p: any, r: any, on: boolean) {
    await this.api.act(() =>
      this.api.call(
        "POST",
        `/polls/${p.id}/position`,
        on ? { record_id: r.id } : { undo: true, from: r.id },
      ),
    );
    this.api.loadState();
  }
}
