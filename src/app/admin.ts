import { Component, inject, signal, computed } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { readSheet } from "read-excel-file/browser";
import { Api } from "./api";
@Component({
  selector: "app-admin",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: ` <main>
      <div class="row">
        <button [class.g]="tab() !== 'polls'" (click)="tab.set('polls')">
          Create poll</button
        ><button [class.g]="tab() !== 'controls'" (click)="tab.set('controls')">
          Controls
        </button>
      </div>
      @if (tab() === "polls") {
        <section class="card">
          <h3>Add spots</h3>
          <p class="mut">
            One shared list of spots. Every bus gets it, including buses you
            create later.
          </p>
          <button (click)="bulkOpen.set(!bulkOpen())">
            {{ bulkOpen() ? "Close" : "Add spots in bulk" }}
          </button>
          @if (bulkOpen()) {
            <p class="mut" style="margin-bottom:4px">
              Which journey are these spots for?
            </p>
            <div class="row">
              <button
                [class.g]="dir() !== 'onward'"
                (click)="dir.set('onward')"
              >
                Onward journey</button
              ><button
                [class.g]="dir() !== 'return'"
                (click)="dir.set('return')"
              >
                Return journey
              </button>
            </div>
            <p class="mut">
              Upload an Excel (.xlsx) or text/CSV file, or paste one spot per
              line in travel order.
            </p>
            <input
              type="file"
              accept=".xlsx,.csv,.txt"
              (change)="loadSpots($event, ta)"
            /><textarea
              #ta
              rows="5"
              placeholder="Gate&#10;Mall&#10;Airport"
            ></textarea>
            <div class="row">
              <button (click)="saveTpl(ta, true)">Save (replace list)</button
              ><button class="g" (click)="saveTpl(ta, false)">
                Add to end
              </button>
            </div>
            <h3 style="margin-top:14px">
              {{ dir() === "onward" ? "Onward" : "Return" }} spots ({{
                tpl().length
              }})
            </h3>
            @for (t of tpl(); track t.id; let i = $index) {
              <div
                class="row"
                style="padding:5px 0;border-top:1px solid var(--line)"
              >
                <span class="mut">{{ i + 1 }}</span
                ><span class="sp"
                  >{{ t.label }}
                  @if (t.is_pickup) {
                    <span class="chip active">{{ tagC(dir()) }}</span>
                  }
                </span>
                <button
                  class="g s"
                  (click)="
                    act('PUT', '/templates/' + t.id, {
                      is_pickup: !t.is_pickup,
                    })
                  "
                >
                  {{
                    t.is_pickup
                      ? "Remove " + tag(dir())
                      : "Mark as " + tag(dir())
                  }}
                </button>
                <button class="g s" (click)="move('/templates/', t)">
                  Move</button
                ><button class="g s" (click)="rename('/templates/', t)">
                  Edit</button
                ><button
                  class="d s"
                  (click)="act('DELETE', '/templates/' + t.id)"
                >
                  ×
                </button>
              </div>
            } @empty {
              <span class="mut">No {{ dir() }} spots yet.</span>
            }
            @if (tpl().length) {
              <button class="g" style="margin-top:8px" (click)="applyAll()">
                Apply to all buses (replace their list)
              </button>
              <p class="mut">
                New buses and buses with no spots get this automatically. Use
                Apply to overwrite buses that already have spots.
              </p>
            }
          }
        </section>
        <section class="card">
          <h3>New poll</h3>
          <div class="row">
            <input #n placeholder="Poll name (Poll 1)" /><input
              #u
              placeholder="Username"
              autocapitalize="none"
            /><input #p placeholder="Password" />
            <button (click)="add(n, u, p)">Add poll</button>
          </div>
          <p class="mut">
            Bulk upload polls: pick a CSV (name,username,password per line) or
            paste lines below.
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            (change)="load($event, bulk)"
          /><textarea #bulk rows="3" placeholder="Poll 1,bus1,pass1"></textarea>
          <button (click)="addBulk(bulk)">Upload polls</button>
        </section>
        @for (p of api.polls(); track p.id) {
          <section class="card">
            <div class="row">
              <b class="sp">{{ p.name }}</b
              ><span class="mut">user: {{ p.username }}</span>
              <button class="g s" (click)="editPoll(p)">Edit</button
              ><button class="g s" (click)="toggle(p.id)">
                {{ open() === p.id ? "Hide" : "Spots" }} ({{
                  p.records.length
                }})</button
              ><button class="d s" (click)="delPoll(p)">Delete</button>
            </div>
            @if (open() === p.id) {
              <div class="row" style="margin-top:8px">
                <button
                  class="s"
                  [class.g]="pdir() !== 'onward'"
                  (click)="pdir.set('onward')"
                >
                  Onward</button
                ><button
                  class="s"
                  [class.g]="pdir() !== 'return'"
                  (click)="pdir.set('return')"
                >
                  Return
                </button>
              </div>
              <div class="row" style="margin-top:8px">
                <input #r placeholder="New spot name" /><input
                  #pos
                  type="number"
                  min="1"
                  placeholder="Position (e.g. 3)"
                  style="flex:0 0 140px"
                /><button (click)="addRec(p.id, r, pos)">Add spot</button>
              </div>
              @for (r of spotsOf(p); track r.id; let i = $index) {
                <div
                  class="row"
                  style="padding:5px 0;border-top:1px solid var(--line)"
                >
                  <span class="mut">{{ i + 1 }}</span
                  ><span class="sp"
                    >{{ r.label }}
                    @if (r.is_pickup) {
                      <span class="chip active">{{ tagC(pdir()) }}</span>
                    }
                  </span>
                  <button
                    class="g s"
                    (click)="
                      act('PUT', '/records/' + r.id, {
                        is_pickup: !r.is_pickup,
                      })
                    "
                  >
                    {{
                      r.is_pickup
                        ? "Remove " + tag(pdir())
                        : "Mark as " + tag(pdir())
                    }}
                  </button>
                  <button class="g s" (click)="move('/records/', r)">
                    Move</button
                  ><button class="g s" (click)="rename('/records/', r)">
                    Edit</button
                  ><button
                    class="d s"
                    (click)="act('DELETE', '/records/' + r.id)"
                  >
                    ×
                  </button>
                </div>
              } @empty {
                <span class="mut">{{
                  pdir() === "return"
                    ? "No return spots. Return trips use the onward spots in reverse."
                    : "No spots yet. Add them in the Add spots card or here."
                }}</span>
              }
            }
          </section>
        } @empty {
          <span class="mut">No polls yet. Create the first one above.</span>
        }
      } @else {
        <section class="card">
          <h3>Earlier dates ({{ history().length }})</h3>
          <p class="mut">
            Every date that has journeys, newest first. Tap a date to see the
            data, restart a journey, or use it as the working date below.
          </p>
          @for (d of history(); track d.date) {
            <div style="border-top:1px solid var(--line);padding:6px 0">
              <div class="row">
                <button
                  class="g s sp"
                  style="text-align:left"
                  (click)="hist.set(hist() === d.date ? '' : d.date)"
                >
                  {{ hist() === d.date ? "▾" : "▸" }} {{ d.date }} ·
                  {{ d.rows.length }} journey(s)
                </button>
                <button class="g s" (click)="date.set(d.date)">
                  Use this date
                </button>
              </div>
              @if (hist() === d.date) {
                @for (x of d.rows; track x.j.id) {
                  <ng-container
                    [ngTemplateOutlet]="jrow"
                    [ngTemplateOutletContext]="{ $implicit: x }"
                  />
                }
              }
            </div>
          } @empty {
            <span class="mut">No journeys created yet.</span>
          }
        </section>
        <section class="card">
          <h3>1 · Pick the date</h3>
          <input
            type="date"
            [value]="date()"
            (click)="$any($event.target).showPicker?.()"
            (change)="date.set($any($event.target).value)"
          />
          @if (!date()) {
            <p class="mut">Choose the journey date to continue.</p>
          }
        </section>
        @if (date()) {
          <section class="card">
            <h3>2 · Source and destination</h3>
            <p class="mut">Written once and used for every bus you select.</p>
            <div class="row">
              <input
                placeholder="Source"
                [value]="src()"
                (input)="src.set($any($event.target).value)"
              /><input
                placeholder="Destination"
                [value]="dst()"
                (input)="dst.set($any($event.target).value)"
              />
            </div>
          </section>
          <section class="card">
            <div class="row">
              <h3 class="sp">3 · Select buses</h3>
              <button class="g s" (click)="selAll()">
                {{
                  sel().size === api.polls().length && sel().size
                    ? "Clear"
                    : "Select all"
                }}
              </button>
            </div>
            @for (p of api.polls(); track p.id) {
              <div
                class="row"
                style="padding:7px 0;border-top:1px solid var(--line)"
              >
                <label class="sw sp"
                  ><input
                    type="checkbox"
                    [checked]="sel().has(p.id)"
                    (change)="pickBus(p.id)"
                  />{{ p.name }}</label
                >
                <span [class]="p.active_onward ? 'chip active' : 'chip'"
                  >Onward · {{ p.active_onward ? "Active" : "Inactive" }}</span
                ><span [class]="p.active_return ? 'chip active' : 'chip'"
                  >Return · {{ p.active_return ? "Active" : "Inactive" }}</span
                >
              </div>
            } @empty {
              <span class="mut">Create polls first.</span>
            }
          </section>
          <section class="card">
            <h3>4 · Create journeys</h3>
            <div class="row">
              <button
                [class.g]="jdir() !== 'onward'"
                (click)="jdir.set('onward')"
              >
                Onward journey</button
              ><button
                [class.g]="jdir() !== 'return'"
                (click)="jdir.set('return')"
              >
                Return journey
              </button>
            </div>
            <button style="width:100%;margin-top:10px" (click)="createJ()">
              Create {{ jdir() }} journey for {{ sel().size }} bus(es)
            </button>
          </section>
          @for (d of drawers; track d.dir) {
            @let rows = rowsOf(d.dir);
            <section class="card">
              <div class="row">
                <button
                  class="g sp"
                  style="text-align:left"
                  (click)="toggleDr(d.dir)"
                >
                  {{ dr()[d.dir] ? "▾" : "▸" }} <b>{{ d.title }} journeys</b> ·
                  {{ date() }}
                </button>
              </div>
              <div class="mut" style="margin-top:4px">{{ sum(d.dir) }}</div>
              @if (dr()[d.dir]) {
                <div class="row" style="margin:10px 0 4px">
                  <button class="g s" (click)="setAll(true, d.dir)">
                    Activate all buses for {{ d.dir }}</button
                  ><button class="g s" (click)="setAll(false, d.dir)">
                    Deactivate all buses for {{ d.dir }}
                  </button>
                </div>
                <p class="mut">
                  Activation is separate for each journey type: switching a bus
                  on or off here affects only its {{ d.dir }} journey. A bus
                  that is deactivated for this journey type is hidden from the
                  live map and its user cannot start or update that journey. "+
                  Add" uses the source and destination from step 2.
                </p>
                @for (r of rows; track r.p.id) {
                  <div style="padding:9px 0;border-top:1px solid var(--line)">
                    <div class="row">
                      <b class="sp">{{ r.p.name }}</b
                      ><span
                        [class]="api.on(r.p, d.dir) ? 'chip active' : 'chip'"
                        >{{ api.on(r.p, d.dir) ? "Active" : "Inactive" }}</span
                      >
                      <button
                        class="g s"
                        (click)="setBus(r.p, !api.on(r.p, d.dir), d.dir)"
                      >
                        {{ api.on(r.p, d.dir) ? "Deactivate" : "Activate" }}
                        {{ d.dir }}
                      </button>
                      @if (!r.blocked) {
                        <button class="s" (click)="addJ(r.p, d.dir)">
                          + Add {{ d.dir }} journey
                        </button>
                      }
                    </div>
                    @for (j of r.js; track j.id) {
                      <ng-container
                        [ngTemplateOutlet]="jrow"
                        [ngTemplateOutletContext]="{
                          $implicit: { p: r.p, j: j },
                          hide: true,
                        }"
                      />
                    } @empty {
                      <div class="mut">
                        No {{ d.dir }} journey on this date.
                      </div>
                    }
                  </div>
                } @empty {
                  <span class="mut">Create polls first.</span>
                }
              }
            </section>
          }
        }
      }
    </main>
    <ng-template #jrow let-x let-hide="hide">
      <div style="padding:8px 0;border-top:1px solid var(--line)">
        <div class="row">
          @if (!hide) {
            <b>{{ x.p.name }}</b>
          }
          <span class="sp"
            >{{ x.j.source }} to {{ x.j.destination }}
            <span class="chip" [class]="'chip ' + x.j.status"
              >{{ x.j.direction === "return" ? "return · " : ""
              }}{{ x.j.status }}</span
            ></span
          >
          @if (x.j.status === "planned") {
            <button
              class="s"
              [disabled]="!api.on(x.p, x.j.direction || 'onward')"
              [title]="
                api.on(x.p, x.j.direction || 'onward')
                  ? ''
                  : 'Activate the bus for this journey type first'
              "
              (click)="act('PUT', '/journeys/' + x.j.id, { status: 'active' })"
            >
              Start
            </button>
          }
          @if (x.j.status === "active") {
            <button
              class="s"
              (click)="
                act('PUT', '/journeys/' + x.j.id, { status: 'completed' })
              "
            >
              Complete
            </button>
          }
          @if (x.j.status === "completed") {
            <button
              class="g s"
              [disabled]="!api.on(x.p, x.j.direction || 'onward')"
              [title]="
                api.on(x.p, x.j.direction || 'onward')
                  ? ''
                  : 'Activate the bus for this journey type first'
              "
              (click)="act('PUT', '/journeys/' + x.j.id, { status: 'active' })"
            >
              Reopen
            </button>
          }
          @if (x.j.status !== "planned") {
            <button class="g s" (click)="restart(x)">↺ Restart</button>
          }
          <button class="g s" (click)="editJ(x.j)">Edit</button
          ><button class="d s" (click)="act('DELETE', '/journeys/' + x.j.id)">
            ×
          </button>
        </div>
        <div class="mut">{{ detail(x) }}</div>
      </div>
    </ng-template>`,
})
export class Admin {
  api = inject(Api);
  tab = signal<"polls" | "controls">("polls");
  open = signal(0);
  bulkOpen = signal(false);
  dir = signal<"onward" | "return">("onward");
  pdir = signal<"onward" | "return">("onward");
  tpl = computed(() => this.api.templates()[this.dir()] || []);
  spotsOf(p: any) {
    return p.records.filter(
      (r: any) => (r.direction || "onward") === this.pdir(),
    );
  }
  date = signal("");
  src = signal("");
  dst = signal("");
  sel = signal<Set<number>>(new Set());
  jdir = signal<"onward" | "return">("onward");
  dayJ = computed(() =>
    this.api
      .polls()
      .flatMap((p) =>
        p.journeys
          .filter((j: any) => j.date === this.date())
          .map((j: any) => ({ p, j })),
      ),
  );
  hist = signal("");
  history = computed(() => {
    const m = new Map<string, any[]>();
    for (const p of this.api.polls())
      for (const j of p.journeys)
        (m.get(j.date) || m.set(j.date, []).get(j.date)!).push({ p, j });
    return [...m]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => ({ date, rows }));
  });
  detail(x: any) {
    const r = x.p.records.find((r: any) => r.id === x.j.current_record_id),
      t = x.j.reached_at
        ? new Date(x.j.reached_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
    return x.j.status === "planned"
      ? "Not started yet"
      : (r ? "Last spot: " + r.label : "Started, no spot reached yet") +
          (t ? " · " + t : "");
  }
  async restart(x: any) {
    if (
      !confirm(
        `Restart ${x.p.name}'s journey from the start? Its progress is cleared and the bus user must press Start again.`,
      )
    )
      return;
    await this.act("POST", `/journeys/${x.j.id}/restart`);
    this.api.say(
      `${x.p.name} journey restarted. Waiting for the user to start.`,
    );
  }
  tag(d: string) {
    return d === "return" ? "drop" : "pickup";
  }
  tagC(d: string) {
    return d === "return" ? "Drop" : "Pickup";
  }
  pickBus(id: number) {
    const s = new Set(this.sel());
    s.has(id) ? s.delete(id) : s.add(id);
    this.sel.set(s);
  }
  selAll() {
    this.sel.set(
      this.sel().size === this.api.polls().length
        ? new Set()
        : new Set(this.api.polls().map((p) => p.id)),
    );
  }
  async createJ() {
    if (!this.src().trim() || !this.dst().trim())
      return this.api.say("Write the source and destination");
    if (!this.sel().size) return this.api.say("Select at least one bus");
    try {
      const d = await this.api.call("POST", "/journeys", {
        poll_ids: [...this.sel()],
        date: this.date(),
        source: this.src(),
        destination: this.dst(),
        direction: this.jdir(),
      });
      this.api.say(
        `${d.added} journey(s) created` +
          (d.skipped ? `, ${d.skipped} already scheduled` : ""),
      );
    } catch (e: any) {
      this.api.say(e.message);
    }
  }
  drawers = [
    { dir: "onward" as const, title: "Onward" },
    { dir: "return" as const, title: "Return" },
  ];
  dr = signal<Record<string, boolean>>({ onward: true, return: true });
  toggleDr(d: string) {
    this.dr.update((v) => ({ ...v, [d]: !v[d] }));
  }
  // every bus, with its journeys for the chosen date and direction
  rowsOf(dir: string) {
    return this.api.polls().map((p) => {
      const js = p.journeys.filter(
        (j: any) => j.date === this.date() && (j.direction || "onward") === dir,
      );
      return {
        p,
        js,
        blocked: js.some(
          (j: any) => j.status === "planned" || j.status === "active",
        ),
      };
    });
  }
  sum(dir: string) {
    const r = this.rowsOf(dir),
      all = r.flatMap((x) => x.js),
      n = (s: string) => all.filter((j: any) => j.status === s).length;
    return `${r.filter((x) => x.js.length).length} of ${r.length} buses scheduled · ${n("planned")} planned · ${n("active")} running · ${n("completed")} completed · ${r.filter((x) => this.api.on(x.p, dir)).length} bus(es) active for ${dir}`;
  }
  async setBus(p: any, active: boolean, direction: "onward" | "return") {
    await this.act("POST", "/polls/activate", {
      ids: [p.id],
      active,
      direction,
    });
    this.api.say(
      `${p.name} ${active ? "activated" : "deactivated"} for ${direction} journey`,
    );
  }
  async setAll(active: boolean, direction: "onward" | "return") {
    const ids = this.api.polls().map((p) => p.id);
    if (!ids.length) return;
    await this.act("POST", "/polls/activate", { ids, active, direction });
    this.api.say(
      `All buses ${active ? "activated" : "deactivated"} for ${direction} journey`,
    );
  }
  async addJ(p: any, direction: string) {
    if (!this.src().trim() || !this.dst().trim())
      return this.api.say("Write the source and destination in step 2 first");
    try {
      await this.api.call("POST", "/journeys", {
        poll_ids: [p.id],
        date: this.date(),
        source: this.src(),
        destination: this.dst(),
        direction,
      });
      this.api.say(`${p.name}: ${direction} journey added`);
    } catch (e: any) {
      this.api.say(e.message);
    }
  }
  today() {
    return new Date().toISOString().slice(0, 10);
  }
  toggle(id: number) {
    this.open.set(this.open() === id ? 0 : id);
  }
  act(m: string, u: string, b?: any) {
    return this.api.act(() => this.api.call(m, u, b));
  }
  load(e: Event, ta: HTMLTextAreaElement) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) f.text().then((t) => (ta.value = t));
  }
  // spots from Excel (.xlsx, first column) or CSV/text
  async loadSpots(e: Event, ta: HTMLTextAreaElement) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const lines = /\.xlsx$/i.test(f.name)
        ? ((await readSheet(f)) as any[][]).map((r) =>
            String(r[0] ?? "").trim(),
          )
        : (await f.text())
            .split(/\r?\n/)
            .map((l) => (/\.csv$/i.test(f.name) ? l.split(",")[0] : l).trim());
      ta.value = lines
        .filter(Boolean)
        .filter(
          (l, i) =>
            !(i === 0 && /^(spots?|spot name|stops?|name|names)$/i.test(l)),
        )
        .join("\n");
      this.api.say(
        `${ta.value.split("\n").length} spots read. Check the list, then Save.`,
      );
    } catch {
      this.api.say("Could not read that file. Use .xlsx, .csv or .txt");
    }
  }
  async saveTpl(ta: HTMLTextAreaElement, replace: boolean) {
    const labels = ta.value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!labels.length) return this.api.say("Add some spots first");
    await this.act("POST", "/templates", {
      direction: this.dir(),
      labels,
      replace,
    });
    ta.value = "";
    this.api.say(`${labels.length} ${this.dir()} spots saved`);
  }
  async applyAll() {
    if (
      !confirm(
        `Replace the ${this.dir()} spots of EVERY bus with this list? Buses with a journey in progress are skipped.`,
      )
    )
      return;
    try {
      const d = await this.api.call("POST", "/templates/apply", {
        direction: this.dir(),
      });
      this.api.say(
        d.skipped
          ? `Applied. ${d.skipped} bus(es) skipped (journey in progress).`
          : "Applied to all buses",
      );
    } catch (e: any) {
      this.api.say(e.message);
    }
  }
  move(base: string, r: any) {
    const n = +(prompt("Move to position (1 = first)") || 0);
    if (n > 0) this.act("PUT", base + r.id, { position: n });
  }
  rename(base: string, r: any) {
    const label = prompt("Spot name", r.label);
    if (label?.trim()) this.act("PUT", base + r.id, { label });
  }
  async add(n: HTMLInputElement, u: HTMLInputElement, p: HTMLInputElement) {
    if (!n.value || !u.value || !p.value)
      return this.api.say("Fill name, username and password");
    await this.act("POST", "/polls", {
      name: n.value,
      username: u.value,
      password: p.value,
    });
    n.value = u.value = p.value = "";
  }
  async addBulk(t: HTMLTextAreaElement) {
    const polls = t.value
      .split("\n")
      .map((l) => l.split(",").map((x) => x.trim()))
      .filter((c) => c.length >= 3 && c[0].toLowerCase() !== "name")
      .map(([name, username, password]) => ({ name, username, password }));
    if (!polls.length)
      return this.api.say("No valid lines. Use: name,username,password");
    await this.act("POST", "/polls", { polls });
    t.value = "";
    this.api.say(polls.length + " polls uploaded");
  }
  editPoll(p: any) {
    const name = prompt("Poll name", p.name);
    if (!name) return;
    const username = prompt("Username", p.username);
    const password = prompt("New password (leave blank to keep)") || undefined;
    this.act("PUT", "/polls/" + p.id, { name, username, password });
  }
  delPoll(p: any) {
    if (confirm(`Delete ${p.name} and all its spots and journeys?`))
      this.act("DELETE", "/polls/" + p.id);
  }
  async addRec(id: number, i: HTMLInputElement, pos: HTMLInputElement) {
    if (!i.value.trim()) return;
    await this.act("POST", `/polls/${id}/records`, {
      labels: [i.value],
      position: +pos.value || 0,
      direction: this.pdir(),
    });
    i.value = pos.value = "";
  }
  editJ(j: any) {
    const source = prompt("Source", j.source);
    const destination = prompt("Destination", j.destination);
    if (source && destination)
      this.act("PUT", "/journeys/" + j.id, { source, destination });
  }
}
