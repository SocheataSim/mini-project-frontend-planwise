import { getData } from "../store.js";
import { escapeHtml, formatDue, formatHours } from "../utils.js";
import { renderNotes } from "./notes.js";
const svg = (paths, cls = "size-5", stroke = 1.6) => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const PLUS = svg('<path d="M12 5v14M5 12h14"/>', "size-4", 2);
const USER = svg('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>', "size-4");
const SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
const CHECK = svg('<path d="m5 12 4.5 4.5L19 7"/>', "size-4", 2.4);
const BACK = svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', "size-4", 2);
const PRIMARY_BTN = "inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95 sm:px-6";
const CARD = "rounded-3xl bg-elevated p-5 sm:p-6";
const H1 = "font-display text-xl font-extrabold tracking-tight sm:text-2xl";
const BAND = { indigo: "bg-navy-soft", coral: "bg-brand-soft", green: "bg-mint-soft" };
const CODE = { indigo: "text-navy", coral: "text-brand", green: "text-mint" };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_STYLE = {
    high: "bg-brand-soft text-brand",
    medium: "bg-surface text-muted",
    low: "bg-mint-soft text-mint",
};
/* ---------- List ---------- */
function cardHtml(c) {
    return `
    <a href="course.html?id=${encodeURIComponent(c.id)}" class="block overflow-hidden rounded-3xl bg-elevated transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div class="flex h-28 items-center justify-between px-5 ${BAND[c.color]}">
        <span class="text-sm font-bold ${CODE[c.color]}">${escapeHtml(c.code)}</span>
        ${c.cover ? `<img src="../assets/logo-elements.png" alt="" width="240" height="160" class="h-20 w-auto" />` : ""}
      </div>
      <div class="p-5">
        <h3 class="font-display text-md font-bold">${escapeHtml(c.name)}</h3>
        <p class="mt-3 flex items-center gap-2 text-sm text-muted">${USER}${escapeHtml(c.instructor)}</p>
        <span class="mt-4 inline-block rounded-full bg-surface px-3 py-1 text-sm font-medium text-muted">${escapeHtml(c.semester)}</span>
      </div>
    </a>`;
}
function renderList(root) {
    const { courses, tasks, sessions } = getData();
    let query = "";
    const tasksFinished = tasks.filter((t) => t.done).length;
    const focusHours = sessions.reduce((sum, s) => sum + s.minutes, 0) / 60;
    const stat = (value, label) => `<div class="rounded-2xl bg-elevated p-5"><p class="font-display text-xl font-extrabold">${value}</p><p class="mt-2 text-sm text-muted">${label}</p></div>`;
    root.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="${H1}">Your courses</h1>
        <p class="mt-1 text-base text-muted">Your next discovery starts here.</p>
      </div>
      <a href="course-new.html" class="${PRIMARY_BTN}">${PLUS} Add courses</a>
    </div>
    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      ${stat(String(courses.length), "Enrolled")}${stat(String(tasksFinished), "Tasks finished")}${stat(formatHours(focusHours), "Learning time")}
    </div>
    <div class="relative mt-6">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">${SEARCH}</span>
      <input id="course-search" type="search" placeholder="Search your courses" aria-label="Search your courses" class="h-12 w-full rounded-xl bg-elevated pl-11 pr-4 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-brand" />
    </div>
    <div id="course-grid" class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"></div>`;
    const grid = root.querySelector("#course-grid");
    const search = root.querySelector("#course-search");
    if (!grid || !search)
        return;
    const update = () => {
        if (courses.length === 0) {
            grid.innerHTML = `
        <div class="col-span-full rounded-3xl bg-elevated p-10 text-center">
          <p class="font-display text-lg font-bold">No courses yet</p>
          <p class="mt-2 text-base text-muted">Add your first course to start planning tasks and notes.</p>
          <a href="course-new.html" class="${PRIMARY_BTN} mt-6">${PLUS} Add your first course</a>
        </div>`;
            return;
        }
        const q = query.trim().toLowerCase();
        const shown = courses.filter((c) => !q || [c.name, c.code, c.instructor, c.subject].some((v) => v.toLowerCase().includes(q)));
        grid.innerHTML = shown.length
            ? shown.map(cardHtml).join("")
            : `<p class="col-span-full rounded-2xl bg-elevated p-8 text-center text-base text-muted">No courses match. Try a different search or <a href="course-new.html" class="font-semibold text-brand hover:underline">add a new course</a>.</p>`;
    };
    search.addEventListener("input", () => {
        query = search.value;
        update();
    });
    update();
}
/* ---------- Detail ---------- */
function taskRow(t) {
    const overdue = !t.done && new Date(t.due).getTime() < Date.now();
    return `
    <li class="flex items-center gap-3 border-b border-line py-4 last:border-b-0">
      <span class="grid size-6 shrink-0 place-items-center rounded-full ${t.done ? "bg-mint text-on-brand" : "border-2 border-line"}">${t.done ? CHECK : ""}</span>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold ${t.done ? "text-muted line-through" : ""}">${escapeHtml(t.title)}</p>
        <p class="mt-1 text-sm ${overdue ? "text-brand" : "text-muted"}">${formatDue(t.due)}</p>
      </div>
      <span class="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${PRIORITY_STYLE[t.priority]}">${PRIORITY_LABEL[t.priority]}</span>
    </li>`;
}
function overviewHtml(tasks, next) {
    const assignment = next
        ? `<h3 class="mt-5 font-display text-md font-bold">${escapeHtml(next.title)}</h3>
       <p class="mt-3 text-base text-muted">${formatDue(next.due)}</p>
       <p class="mt-4 text-sm font-semibold text-brand">${PRIORITY_LABEL[next.priority]} priority</p>`
        : `<p class="mt-5 text-base text-muted">No open assignments for this course. Nice work.</p>`;
    return `
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <section aria-labelledby="tasks-title" class="${CARD}">
        <div class="flex items-center justify-between">
          <h2 id="tasks-title" class="font-display text-lg font-bold">Tasks</h2>
          <a href="task.html" class="text-sm font-semibold text-brand hover:underline">View all tasks</a>
        </div>
        ${tasks.length
        ? `<ul class="mt-2">${tasks.map(taskRow).join("")}</ul>`
        : `<p class="mt-5 text-base text-muted">No tasks for this course yet. <a href="task.html?new=1" class="font-semibold text-brand hover:underline">Add one</a> to start tracking progress.</p>`}
      </section>

      <section aria-labelledby="assignment-title" class="self-start rounded-3xl bg-brand-soft p-5 sm:p-6">
        <h2 id="assignment-title" class="font-display text-lg font-bold">Your next assignment</h2>
        ${assignment}
        <a href="task.html" class="mt-6 inline-flex rounded-xl border border-line bg-elevated px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface">${next ? "View task" : "View all tasks"}</a>
      </section>
    </div>`;
}
function renderDetail(root, id) {
    const data = getData();
    const c = data.courses.find((x) => x.id === id);
    if (!c)
        return renderMissing(root);
    const mine = data.tasks
        .filter((t) => t.courseId === c.id)
        .sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.due).getTime() - new Date(b.due).getTime());
    const doneCount = mine.filter((t) => t.done).length;
    const next = mine.find((t) => !t.done);
    const progressText = mine.length ? `${doneCount} of ${mine.length} tasks done` : "No tasks yet";
    root.innerHTML = `
    <a href="course.html" class="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">${BACK} Back to courses</a>
    <h1 class="mt-4 ${H1}">${escapeHtml(c.name)}</h1>
    <p class="mt-1 text-base text-muted">Your next discovery starts here.</p>

    <section aria-label="Course summary" class="mt-6 flex items-center justify-between gap-6 rounded-3xl p-6 sm:p-8 ${BAND[c.color]}">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-bold ${CODE[c.color]}">${escapeHtml(c.code)}</span>
          <span class="rounded-full bg-elevated/70 px-3 py-1 text-sm font-semibold text-muted">${escapeHtml(c.semester)}</span>
        </div>
        <h2 class="mt-4 font-display text-lg font-bold leading-snug text-ink">${escapeHtml(c.description || c.name)}</h2>
        <p class="mt-2 text-base text-ink/80">Taught by ${escapeHtml(c.instructor)}</p>
        <p class="mt-4 text-sm text-ink/80">${progressText}</p>
      </div>
      ${c.cover ? `<img src="../assets/logo-elements.png" alt="" width="240" height="160" class="hidden h-24 w-auto shrink-0 sm:block lg:h-28" />` : ""}
    </section>

    <div role="tablist" aria-label="Course sections" class="mt-6 flex gap-6 border-b border-line">
      <button type="button" role="tab" id="tab-overview" data-tab="overview" aria-controls="course-panel" class="-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors">Overview</button>
      <button type="button" role="tab" id="tab-notes" data-tab="notes" aria-controls="course-panel" class="-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors">Notes</button>
    </div>
    <div id="course-panel" role="tabpanel" class="mt-6"></div>`;
    const panel = root.querySelector("#course-panel");
    const tabs = root.querySelectorAll("[data-tab]");
    if (!panel)
        return;
    const show = (tab) => {
        tabs.forEach((b) => {
            const active = b.dataset["tab"] === tab;
            b.setAttribute("aria-selected", String(active));
            b.setAttribute("tabindex", active ? "0" : "-1");
            b.className = `-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`;
        });
        panel.setAttribute("aria-labelledby", `tab-${tab}`);
        if (tab === "notes")
            renderNotes(panel, c.id);
        else
            panel.innerHTML = overviewHtml(mine, next);
    };
    tabs.forEach((b) => b.addEventListener("click", () => {
        const tab = b.dataset["tab"] === "notes" ? "notes" : "overview";
        show(tab);
        window.history.replaceState(null, "", `course.html?id=${encodeURIComponent(c.id)}${tab === "notes" ? "&tab=notes" : ""}`);
    }));
    show(new URLSearchParams(window.location.search).get("tab") === "notes" ? "notes" : "overview");
}
function renderMissing(root) {
    root.innerHTML = `
    <h1 class="${H1}">We couldn’t find that course</h1>
    <p class="mt-2 text-base text-muted">It may have been removed. <a href="course.html" class="font-semibold text-brand hover:underline">Back to your courses</a></p>`;
}
export function initCourse() {
    const root = document.getElementById("course-content");
    if (!root)
        return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (id)
        renderDetail(root, id);
    else
        renderList(root);
}
