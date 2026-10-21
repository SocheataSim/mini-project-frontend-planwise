import { getData, updateData } from "../store.js";
import { escapeHtml, formatDuration, formatWhen, startOfDay, uid } from "../utils.js";
const svg = (paths, cls = "size-5", stroke = 1.6) => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const PLUS = svg('<path d="M12 5v14M5 12h14"/>', "size-4", 2);
const PLAY = svg('<path d="M7 5v14l11-7z"/>', "size-4", 2);
const CHECK = svg('<path d="m5 12 4.5 4.5L19 7"/>', "size-3.5", 2.6);
const CHECK_LG = svg('<path d="m5 12 4.5 4.5L19 7"/>', "size-5", 2);
const LEAF = svg('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-5 5-8 9-10"/>', "size-4");
const PRIMARY_BTN = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-40";
const SECONDARY_BTN = "inline-flex items-center justify-center rounded-xl border border-line bg-elevated px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40";
const CARD = "rounded-3xl bg-elevated p-5 sm:p-6";
const BIG = (classes) => classes.replace("px-5 py-3 text-sm", "px-6 py-3 text-sm");
const LINK = "text-sm font-semibold text-brand hover:underline";
const BREAK_MINUTES = 5;
const DEFAULT_FOCUS_MINUTES = 25;
const RING_RADIUS = 44;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
let mode = "focus";
let status = "idle";
let selectedPlanId = null;
let totalSec = DEFAULT_FOCUS_MINUTES * 60;
let remainingMs = totalSec * 1000;
let endAt = 0;
let interval;
let flash = null;
let showAllHistory = false;
let showAllPlans = false;
function selectedPlan() {
    return getData().plans.find((p) => p.id === selectedPlanId);
}
const focusMinutes = () => selectedPlan()?.minutes ?? DEFAULT_FOCUS_MINUTES;
const currentTitle = () => selectedPlan()?.title ?? "Focus session";
const remaining = () => (status === "running" ? Math.max(0, endAt - Date.now()) : remainingMs);
function resetTimer() {
    window.clearInterval(interval);
    status = "idle";
    totalSec = (mode === "focus" ? focusMinutes() : BREAK_MINUTES) * 60;
    remainingMs = totalSec * 1000;
    document.title = "Study Session | Planwise";
}
function message() {
    if (flash)
        return flash;
    if (mode === "break")
        return status === "running" ? "Rest well. Your next focus session is waiting." : "Break time. Stretch, sip some water, rest your eyes.";
    if (status === "running")
        return "Stay with it. One task at a time.";
    if (status === "paused")
        return "Paused. Take a breath, then pick it back up.";
    return "Put your phone aside. Take a breath. Let’s begin.";
}
/* ---------- Data helpers ---------- */
function logSession(title, minutes) {
    updateData((data) => {
        data.sessions.unshift({ id: `s-${uid()}`, title, minutes, endedAt: new Date().toISOString() });
    });
}
function weekStart(date) {
    const start = startOfDay(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    return start;
}
function minutesBetween(from, to) {
    return getData()
        .sessions.filter((s) => {
        const t = new Date(s.endedAt).getTime();
        return t >= from.getTime() && t < to.getTime();
    })
        .reduce((sum, s) => sum + s.minutes, 0);
}
function perDay(start) {
    return Array.from({ length: 7 }, (_, i) => {
        const from = new Date(start);
        from.setDate(from.getDate() + i);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);
        return minutesBetween(from, to);
    });
}
/* ---------- Timer actions ---------- */
function beep() {
    try {
        const ctx = new AudioContext();
        [660, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.value = 0.06;
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.25);
            osc.stop(ctx.currentTime + i * 0.25 + 0.2);
        });
    }
    catch {
    }
}
function start(root) {
    if (status === "running")
        return;
    flash = null;
    endAt = Date.now() + remainingMs;
    status = "running";
    window.clearInterval(interval);
    interval = window.setInterval(() => tick(root), 250);
    render(root);
}
function pause(root) {
    if (status !== "running")
        return;
    remainingMs = Math.max(0, endAt - Date.now());
    window.clearInterval(interval);
    status = "paused";
    document.title = "Paused | Planwise";
    render(root);
}
function end(root) {
    if (status === "idle")
        return;
    const elapsedMin = Math.round((totalSec * 1000 - remaining()) / 60_000);
    if (mode === "focus" && elapsedMin >= 1) {
        logSession(currentTitle(), elapsedMin);
        flash = `Session saved: ${elapsedMin} min of focus. Well done.`;
    }
    else {
        flash = "Session ended. Start again whenever you’re ready.";
    }
    resetTimer();
    render(root);
}
function complete(root) {
    const wasFocus = mode === "focus";
    const minutes = Math.round(totalSec / 60);
    if (wasFocus) {
        logSession(currentTitle(), minutes);
        const id = selectedPlanId;
        if (id) {
            updateData((data) => {
                const plan = data.plans.find((p) => p.id === id);
                if (plan)
                    plan.done = true;
            });
        }
    }
    beep();
    mode = wasFocus ? "break" : "focus";
    resetTimer();
    flash = wasFocus ? "Nice work. Your session is saved. Enjoy a short break." : "Break over. Ready for another round?";
    render(root);
}
function paintTimer() {
    const ms = remaining();
    const seconds = Math.ceil(ms / 1000);
    const text = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    const timeEl = document.getElementById("timer-time");
    const ring = document.getElementById("timer-ring");
    if (timeEl)
        timeEl.textContent = text;
    if (ring)
        ring.setAttribute("stroke-dasharray", `${(ms / (totalSec * 1000)) * RING_LENGTH} ${RING_LENGTH}`);
    if (status === "running")
        document.title = `${text} · Planwise`;
}
function tick(root) {
    if (remaining() <= 0)
        complete(root);
    else
        paintTimer();
}
/* ---------- HTML pieces ---------- */
function timerHtml() {
    const focus = mode === "focus";
    const idle = status === "idle";
    const tab = (id, label) => `<button type="button" data-mode="${id}" aria-pressed="${mode === id}" ${idle ? "" : "disabled"} class="rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-default ${mode === id ? "bg-brand-soft text-brand" : "bg-surface text-muted hover:text-ink"}">${label}</button>`;
    return `
    <section aria-labelledby="timer-title" class="flex flex-1 flex-col justify-between gap-6 rounded-3xl bg-elevated px-5 py-6 sm:px-6 sm:py-8">
      <div class="flex justify-center gap-2" role="group" aria-label="Timer mode">
        ${tab("focus", `Focus · ${focusMinutes()} min`)}${tab("break", `Break · ${BREAK_MINUTES} min`)}
      </div>

      <div class="relative mx-auto size-48 sm:size-56 lg:size-60">
        <svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="${RING_RADIUS}" fill="none" stroke="var(--border)" stroke-width="5" />
          <circle id="timer-ring" class="transition-[stroke-dasharray] duration-300 ease-linear" cx="50" cy="50" r="${RING_RADIUS}" fill="none" stroke="${focus ? "var(--brand)" : "var(--accent)"}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${RING_LENGTH} ${RING_LENGTH}" />
        </svg>
        <div class="absolute inset-0 grid place-content-center text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted">${focus ? "Focus time" : "Break time"}</p>
          <p id="timer-time" role="timer" aria-label="Time remaining" class="mt-1 font-mono text-3xl font-medium sm:text-5xl sm:leading-none"></p>
          <p class="mt-2 text-sm text-muted">${status === "idle" ? "Ready when you are" : status === "paused" ? "Paused" : "In progress"}</p>
        </div>
      </div>

      <div>
        <h2 id="timer-title" class="font-display text-lg font-bold sm:text-xl">${selectedPlan() && focus ? escapeHtml(currentTitle()) : "Pomodoro Timer"}</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <button type="button" data-study="start" class="${BIG(PRIMARY_BTN)}" ${status === "running" ? "disabled" : ""}>${PLAY} ${status === "paused" ? "Resume" : "Start"}</button>
          <button type="button" data-study="pause" class="${BIG(SECONDARY_BTN)}" ${status === "running" ? "" : "disabled"}>Pause</button>
          <button type="button" data-study="end" class="${BIG(SECONDARY_BTN)}" ${idle ? "disabled" : ""}>End</button>
        </div>
      </div>

      <p class="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand" aria-live="polite"><span class="shrink-0">${LEAF}</span>${escapeHtml(message())}</p>
    </section>`;
}
function weekHtml() {
    const start = weekStart(new Date());
    const days = perDay(start);
    const total = days.reduce((a, b) => a + b, 0);
    const lastStart = new Date(start);
    lastStart.setDate(lastStart.getDate() - 7);
    const last = minutesBetween(lastStart, start);
    const max = Math.max(...days, 1);
    const todayIndex = (new Date().getDay() + 6) % 7;
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let change = "";
    if (last > 0) {
        const pct = Math.round(((total - last) / last) * 100);
        change = `<span class="text-xs font-semibold ${pct >= 0 ? "text-mint" : "text-brand"}">${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% from last week</span>`;
    }
    const bars = days
        .map((m, i) => {
        const today = i === todayIndex;
        const bar = m > 0
            ? `<div class="w-full rounded-lg ${today ? "bg-brand" : "bg-navy-soft"}" style="height:${Math.max(12, Math.round((m / max) * 100))}%"></div>`
            : `<div class="h-1 w-full rounded-full bg-surface"></div>`;
        return `
        <li class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span class="sr-only">${names[i]}: ${m} minutes</span>
          <span aria-hidden="true" class="text-xs text-muted">${m > 0 ? `${m}m` : "—"}</span>
          ${bar}
          <span aria-hidden="true" class="text-xs ${today ? "font-bold text-brand" : "text-muted"}">${names[i]?.charAt(0)}</span>
        </li>`;
    })
        .join("");
    return `
    <section aria-labelledby="week-title" class="${CARD}">
      <div class="flex items-center justify-between">
        <h2 id="week-title" class="font-display text-lg font-bold">Your week in focus</h2>
        <span class="text-sm font-semibold text-brand">This week</span>
      </div>
      <div class="mt-5 flex flex-wrap items-baseline gap-3">
        <p class="font-display text-2xl font-extrabold">${formatDuration(total)}</p>${change}
      </div>
      <ul class="mt-6 flex h-44 items-end gap-2 sm:gap-3">${bars}</ul>
    </section>`;
}
function historyHtml() {
    const all = [...getData().sessions].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
    const shown = showAllHistory ? all : all.slice(0, 3);
    const rows = shown
        .map((s) => `
      <li class="flex items-center gap-3 py-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-mint-soft text-mint">${CHECK_LG}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-semibold">${escapeHtml(s.title)}</p>
          <p class="text-sm text-muted">${formatWhen(s.endedAt)}</p>
        </div>
        <p class="shrink-0 text-sm font-bold text-mint">${s.minutes} min</p>
      </li>`)
        .join("");
    return `
    <section aria-labelledby="history-title" class="${CARD} flex-1">
      <div class="flex items-center justify-between">
        <h2 id="history-title" class="font-display text-lg font-bold">Session history</h2>
        ${all.length > 3 ? `<button type="button" data-study="toggle-history" class="${LINK}">${showAllHistory ? "Show less" : "View all"}</button>` : ""}
      </div>
      ${rows ? `<ul class="mt-3">${rows}</ul>` : `<p class="mt-4 text-base text-muted">Finished focus sessions show up here.</p>`}
    </section>`;
}
function plansHtml() {
    const all = [...getData().plans].sort((a, b) => Number(a.done) - Number(b.done) || new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    const shown = showAllPlans ? all : all.slice(0, 4);
    const locked = status !== "idle";
    const rows = shown
        .map((p) => {
        const picked = p.id === selectedPlanId;
        return `
      <li class="flex items-center gap-3 border-b border-line py-4 last:border-b-0">
        <button type="button" role="checkbox" aria-checked="${p.done}" aria-label="Mark “${escapeHtml(p.title)}” as ${p.done ? "not done" : "done"}" data-plan-done="${escapeHtml(p.id)}" class="shrink-0 rounded-md">
          <span class="grid size-5 place-items-center rounded-md border-2 text-on-brand transition-colors ${p.done ? "border-mint bg-mint" : "border-line"}">${p.done ? CHECK : ""}</span>
        </button>
        <button type="button" data-plan="${escapeHtml(p.id)}" aria-pressed="${picked}" ${locked ? "disabled" : ""} class="min-w-0 flex-1 rounded-lg text-left disabled:cursor-default">
          <span class="block truncate text-base font-semibold ${p.done ? "text-muted line-through" : picked ? "text-brand" : ""}">${escapeHtml(p.title)}</span>
          <span class="block text-sm text-muted">${formatWhen(p.scheduledAt)}${picked ? " · In the timer" : ""}</span>
        </button>
        <p class="shrink-0 text-sm font-bold text-mint">${p.minutes} min</p>
      </li>`;
    })
        .join("");
    return `
    <section aria-labelledby="plans-title" class="${CARD}">
      <div class="flex items-center justify-between">
        <h2 id="plans-title" class="font-display text-lg font-bold">Sessions</h2>
        ${all.length > 4 ? `<button type="button" data-study="toggle-plans" class="${LINK}">${showAllPlans ? "Show less" : "View all"}</button>` : ""}
      </div>
      ${rows ? `<p class="mt-1 text-sm text-muted">Tap a session to load it into the timer.</p><ul class="mt-2">${rows}</ul>` : `<p class="mt-4 text-base text-muted">No planned sessions yet. <button type="button" data-study="new" class="font-semibold text-brand hover:underline">Make a focus space</button> to plan one.</p>`}
    </section>`;
}
/* ---------- Page ---------- */
function render(root) {
    root.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-xl font-extrabold tracking-tight sm:text-2xl">A little focus. A lot of progress.</h1>
        <p class="mt-1 text-base text-muted">One task at a time. You’ve got this.</p>
      </div>
      <button type="button" data-study="new" class="${PRIMARY_BTN} shrink-0">${PLUS} Create Session</button>
    </div>
    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div class="flex flex-col">${timerHtml()}</div>
      <div class="flex flex-col gap-6">${weekHtml()}${historyHtml()}</div>
    </div>
    <div class="mt-6">${plansHtml()}</div>`;
    paintTimer();
}
function openDialog() {
    const dialog = document.getElementById("study-dialog");
    const form = document.getElementById("study-form");
    if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement))
        return;
    form.reset();
    const minutes = form.elements.namedItem("minutes");
    if (minutes instanceof HTMLInputElement)
        minutes.value = String(DEFAULT_FOCUS_MINUTES);
    dialog.showModal();
    form.querySelector("#study-title")?.focus();
}
function initDialog(root) {
    const dialog = document.getElementById("study-dialog");
    const form = document.getElementById("study-form");
    if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement))
        return;
    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (target === dialog || (target instanceof Element && target.closest("[data-close]")))
            dialog.close();
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const f = new FormData(form);
        const text = (key) => {
            const v = f.get(key);
            return typeof v === "string" ? v.trim() : "";
        };
        const minutes = Math.min(180, Math.max(5, Math.round(Number(text("minutes")) || DEFAULT_FOCUS_MINUTES)));
        const plan = {
            id: `p-${uid()}`,
            title: text("title"),
            minutes,
            notes: text("notes"),
            scheduledAt: new Date().toISOString(),
            done: false,
        };
        updateData((data) => {
            data.plans.unshift(plan);
        });
        dialog.close();
        if (status === "idle") {
            selectedPlanId = plan.id;
            mode = "focus";
            flash = null;
            resetTimer();
        }
        render(root);
    });
}
export function initStudy() {
    const root = document.getElementById("study-content");
    if (!root)
        return;
    resetTimer();
    render(root);
    initDialog(root);
    window.addEventListener("beforeunload", (event) => {
        if (status === "running") {
            event.preventDefault(); // asks before leaving while a session is running
        }
    });
    root.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const modeBtn = target.closest("[data-mode]");
        if (modeBtn) {
            if (status !== "idle")
                return;
            mode = modeBtn.dataset["mode"] === "break" ? "break" : "focus";
            flash = null;
            resetTimer();
            render(root);
            return;
        }
        const planBtn = target.closest("[data-plan]");
        if (planBtn) {
            if (status !== "idle")
                return;
            const id = planBtn.dataset["plan"] ?? null;
            selectedPlanId = selectedPlanId === id ? null : id;
            mode = "focus";
            flash = null;
            resetTimer();
            render(root);
            return;
        }
        const doneBtn = target.closest("[data-plan-done]");
        if (doneBtn) {
            const id = doneBtn.dataset["planDone"];
            updateData((data) => {
                const plan = data.plans.find((p) => p.id === id);
                if (plan)
                    plan.done = !plan.done;
            });
            render(root);
            return;
        }
        const action = target.closest("[data-study]")?.dataset["study"];
        if (action === "start")
            start(root);
        else if (action === "pause")
            pause(root);
        else if (action === "end")
            end(root);
        else if (action === "new")
            openDialog();
        else if (action === "toggle-history") {
            showAllHistory = !showAllHistory;
            render(root);
        }
        else if (action === "toggle-plans") {
            showAllPlans = !showAllPlans;
            render(root);
        }
    });
}
