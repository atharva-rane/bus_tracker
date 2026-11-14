import { Injectable, signal, inject } from "@angular/core";
import { Router } from "@angular/router";
import { API_URL } from "./env";
@Injectable({ providedIn: "root" })
export class Api {
  router = inject(Router);
  token = signal(sessionStorage.getItem("t") || "");
  me = signal<any>(JSON.parse(sessionStorage.getItem("u") || "null"));
  polls = signal<any[]>([]);
  templates = signal<any>({ onward: [], return: [] });
  msgs = signal<any[]>([]);
  unread = signal(0);
  toast = signal("");
  toastChat = signal(false);
  chatOpen = signal(false);
  private busy = false;
  private again = false;
  alerts = signal<{ key: string; text: string; kind: string; stop: string }[]>(
    this.read("al", []),
  ); // sticky: only the user closes them
  private seen = new Set<string>(this.read("seen", []));
  net = signal(true);
  private ws?: WebSocket;
  private retry = 0;
  private hooked = false;
  private everOpen = false;
  private poll?: any;
  private lastMsg = 0;
  private read(k: string, d: any) {
    try {
      return JSON.parse(sessionStorage.getItem(k) || "") ?? d;
    } catch {
      return d;
    }
  }
  private saveAlerts() {
    sessionStorage.setItem("al", JSON.stringify(this.alerts()));
    sessionStorage.setItem("seen", JSON.stringify([...this.seen]));
  }
  closeAlert(key: string) {
    this.alerts.update((a) => a.filter((x) => x.key !== key));
    this.saveAlerts();
  }
  // Before every pickup/drop spot: when the bus is at the stop just before it (or has just started and the
  // first spot is a pickup), raise a notification. It stays on screen until the user closes it.
  private checkNext() {
    const p = this.polls().find((x) => x.id === this.me()?.pollId),
      j = p && this.journey(p);
    if (p && j && j.status === "planned") {
      // journey (re)set to the start: forget its old alerts so they fire again
      const pre = j.id + ":";
      let ch = false;
      for (const k of [...this.seen])
        if (k.startsWith(pre)) {
          this.seen.delete(k);
          ch = true;
        }
      if (this.alerts().some((x) => x.key.startsWith(pre))) {
        this.alerts.update((l) => l.filter((x) => !x.key.startsWith(pre)));
        ch = true;
      }
      if (ch) this.saveAlerts();
    }
    if (
      !p ||
      !j ||
      !this.on(p, j.direction || "onward") ||
      j.status !== "active"
    )
      return;
    const nxt = this.recs(p)[this.at(p) + 1];
    if (!nxt?.is_pickup) return;
    const key = j.id + ":" + nxt.id;
    if (this.seen.has(key)) return;
    const kind = (nxt.direction || "onward") === "return" ? "Drop" : "Pickup",
      text = `${kind} on the next stop`;
    this.seen.add(key);
    this.alerts.update((a) => [...a, { key, text, kind, stop: nxt.label }]);
    this.saveAlerts();
    navigator.vibrate?.([300, 150, 300]);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    )
      new Notification(`${kind} on the next stop`, {
        body: nxt.label,
        requireInteraction: true,
      });
  }
  async call(method: string, url: string, body?: any) {
    const r = await fetch(API_URL + "/api" + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + this.token(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && this.token()) {
      this.logout();
      throw new Error("Session expired");
    }
    if (!r.ok) throw new Error(d.error || "Something went wrong");
    return d;
  }
  async act(f: () => Promise<any>) {
    try {
      await f();
    } catch (e: any) {
      this.say(e.message);
    }
  }
  say(t: string, chat = false) {
    this.toast.set(t);
    this.toastChat.set(chat);
    setTimeout(() => this.toast() === t && this.toast.set(""), 5000);
  }
  openChat() {
    this.chatOpen.set(true);
    this.unread.set(0);
    this.toast.set("");
  }
  async login(username: string, password: string) {
    const d = await this.call("POST", "/login", { username, password });
    sessionStorage.setItem("t", d.token);
    sessionStorage.setItem("u", JSON.stringify(d.user));
    this.token.set(d.token);
    this.me.set(d.user);
    this.connect();
    this.router.navigateByUrl(d.user.role === "admin" ? "/admin" : "/");
  }
  logout() {
    const w = this.ws;
    this.ws = undefined;
    w?.close();
    sessionStorage.clear();
    this.stopPoll();
    this.everOpen = false;
    this.retry = 0;
    this.lastMsg = 0;
    this.alerts.set([]);
    this.seen.clear();
    this.token.set("");
    this.me.set(null);
    this.polls.set([]);
    this.router.navigateByUrl("/login");
  }
  async loadState() {
    if (this.busy) {
      this.again = true;
      return;
    }
    this.busy = true;
    try {
      const d = await this.call("GET", "/state");
      this.polls.set(d.polls);
      if (d.templates) this.templates.set(d.templates);
      this.checkNext();
    } finally {
      this.busy = false;
    }
    if (this.again) {
      this.again = false;
      return this.loadState();
    }
  }
  async loadMsgs() {
    const m = await this.call("GET", "/messages");
    this.msgs.set(m);
    const last = this.lastMsg;
    this.lastMsg = m.length ? m[m.length - 1].id : 0;
    if (this.poll && last)
      for (const x of m)
        if (x.id > last && x.sender_key !== this.me()?.key)
          // polling mode: toast new messages
          this.notify({
            sender: x.sender,
            body: x.body,
            reached:
              x.sender_key !== "admin" &&
              /^(Reached|Correction|Journey)/.test(x.body),
          });
  }
  // no WebSocket available (e.g. API hosted on Vercel): refresh state and messages every 3 seconds while the page is visible
  private startPoll() {
    if (this.poll) return;
    this.net.set(true);
    const tick = () => {
      if (document.visibilityState !== "visible" || !this.token()) return;
      Promise.all([this.loadState(), this.loadMsgs()])
        .then(() => this.net.set(true))
        .catch(() => this.net.set(false));
    };
    this.poll = setInterval(tick, 3000);
    tick();
  }
  private stopPoll() {
    clearInterval(this.poll);
    this.poll = undefined;
  }
  connect() {
    if (!this.token()) return;
    this.loadState().catch(() => 0);
    this.loadMsgs().catch(() => 0);
    this.open();
    if (!this.hooked) {
      this.hooked = true;
      document.addEventListener("visibilitychange", () => {
        // phone woke up: resync
        if (document.visibilityState !== "visible" || !this.token()) return;
        this.loadState().catch(() => 0);
        this.loadMsgs().catch(() => 0);
        if (!this.poll && this.ws?.readyState !== 1) this.open();
      });
    }
  }
  private open() {
    const t = this.token();
    if (!t) return;
    this.ws?.close();
    const ws = (this.ws = new WebSocket(
      `${API_URL ? API_URL.replace(/^http/, "ws") : (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host}/ws?token=${t}`,
    ));
    ws.onopen = () => {
      this.everOpen = true;
      if (this.retry) {
        this.loadState().catch(() => 0);
        this.loadMsgs().catch(() => 0);
      }
      this.retry = 0;
      this.net.set(true);
    };
    ws.onmessage = (e) => {
      const { ev, data } = JSON.parse(e.data);
      if (ev === "state") this.loadState().catch(() => 0);
      else if (ev === "msg") this.onMsg(data);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.net.set(false);
      if (!this.token() || e.code === 4401) return;
      if (!this.everOpen && this.retry >= 2) return this.startPoll();
      setTimeout(
        () => this.ws === ws && this.open(),
        Math.min(1000 * 2 ** this.retry++, 8000),
      );
    };
  }
  private onMsg(d: any) {
    this.loadMsgs().catch(() => 0);
    this.notify(d);
  }
  private notify(d: any) {
    const mine = d.sender === this.me()?.name;
    if (d.sender && (d.reached || (!mine && !this.chatOpen()))) {
      if (!mine && !this.chatOpen()) this.unread.update((n) => n + 1);
      this.say(`${d.reached ? "🚌 " : "💬 "}${d.sender} · ${d.body}`, true);
      if (
        !mine &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      )
        new Notification(d.sender, { body: d.body });
    }
  }
  at(p: any) {
    const j = this.journey(p);
    return j?.current_record_id
      ? this.recs(p).findIndex((r: any) => r.id === j.current_record_id)
      : -1;
  }
  // helpers shared by views
  // activation is per journey direction (onward / return)
  on(p: any, dir: string) {
    return !!(dir === "return" ? p.active_return : p.active_onward);
  }
  // true when the bus has a journey and is switched on for that journey's direction
  live(p: any) {
    const j = this.journey(p);
    return !!j && this.on(p, j.direction || "onward");
  }
  journey(p: any) {
    return (
      p.journeys.find((j: any) => j.status === "active") ||
      p.journeys.find((j: any) => j.status === "planned") ||
      p.journeys.filter((j: any) => j.status === "completed").pop()
    );
  }
  recs(p: any) {
    // spots for the journey direction; a return trip with no return spots uses onward reversed
    const dir = this.journey(p)?.direction || "onward",
      own = p.records.filter((r: any) => (r.direction || "onward") === dir);
    return dir === "return" && !own.length
      ? p.records
          .filter((r: any) => (r.direction || "onward") === "onward")
          .reverse()
      : own;
  }
}
