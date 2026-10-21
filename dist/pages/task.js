import { getData, updateData } from "../store.js";
import { escapeHtml, formatDue, isSameDay, uid } from "../utils.js";
const svg = (paths, cls = "size-5", stroke = 1.6) => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const PLUS = svg('<path d="M12 5v14M5 12h14"/>', "size-4", 2);
const SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
const CHECK = svg('<path d="m5 12 4.5 4.5L19 7"/>', "size-3.5", 2.6);
const SPARK = svg('<path d="M11 4c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 3v4M17 5h4"/>', "size-4");
const PRIMARY_BTN = "inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95 sm:px-6";
const SECONDARY_BTN = "rounded-xl border border-line bg-elevated px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40";
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_STYLE = {
    high: "bg-brand-soft text-brand",
    medium: "bg-surface text-muted",
    low: "bg-mint-soft text-mint",
};
let filter = "all";
let query = "";
let selecting = false;
const selected = new Set();
/* ---------- Helpers ---------- */
const isOverdue = (t) => !t.done && new Date(t.due).getTime() < Date.now();
const isToday = (t) => !t.done && isSameDay(new Date(t.due), new Date());
function matches(t, courseName) {
    if (filter === "today" && !isToday(t))
        return false;
    if (filter === "overdue" && !isOverdue(t))
        return false;
    if (filter === "done" && !t.done)
        return false;
    const q = query.trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || courseName.toLowerCase().includes(q);
}
function sorted(tasks) {
    return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.due).getTime() - new Date(b.due).getTime());
}
/* ---------- Pieces of HTML ---------- */
function statsHtml(tasks) {
    const open = tasks.filter((t) => !t.done).length;
    const card = (value, label, bg) => `<div class="rounded-2xl p-5 ${bg}"><p class="font-display text-xl font-extrabold">${value}</p><p class="mt-2 text-sm text-muted">${label}</p></div>`;
    return (card(open, "Open tasks", "bg-elevated") +
        card(tasks.filter(isToday).length, "Due today", "bg-brand-soft") +
        card(tasks.filter(isOverdue).length, "Overdue", "bg-navy-soft"));
}
function tabsHtml(tasks) {
    const tabs = [
        ["all", "All", tasks.length],
        ["today", "Today", tasks.filter(isToday).length],
        ["overdue", "Overdue", tasks.filter(isOverdue).length],
        ["done", "Done", tasks.filter((t) => t.done).length],
    ];
    return tabs
        .map(([id, label, count]) => {
        const active = id === filter;
        return `<button type="button" data-filter="${id}" aria-pressed="${active}" class="rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}">${label} · ${count}</button>`;
    })
        .join("");
}
function box(checked, tone) {
    const on = tone === "mint" ? "border-mint bg-mint" : "border-brand bg-brand";
    return `<span class="grid size-5 place-items-center rounded-md border-2 text-on-brand transition-colors ${checked ? on : "border-line"}">${checked ? CHECK : ""}</span>`;
}
function rowHtml(t, courseName) {
    const picked = selected.has(t.id);
    const checked = selecting ? picked : t.done;
    const label = selecting
        ? `Select “${escapeHtml(t.title)}”`
        : `Mark “${escapeHtml(t.title)}” as ${t.done ? "not done" : "done"}`;
    const status = t.done
        ? `<span class="rounded-full bg-mint-soft px-3 py-1.5 text-sm font-semibold text-mint">Done</span>`
        : isOverdue(t)
            ? `<span class="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">Overdue</span>`
            : "";
    return `
    <li class="flex items-start gap-3 border-b border-line py-4 last:border-b-0">
      <button type="button" role="checkbox" aria-checked="${checked}" aria-label="${label}" data-task="${escapeHtml(t.id)}" class="mt-0.5 shrink-0 rounded-md">${box(checked, selecting ? "brand" : "mint")}</button>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold">${escapeHtml(t.title)}</p>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          ${courseName ? `<span class="rounded-full bg-navy-soft px-3 py-1 text-sm font-semibold text-navy">${escapeHtml(courseName)}</span>` : `<span class="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">Other</span>`}
          <span class="text-sm ${isOverdue(t) ? "text-brand" : "text-muted"}">${formatDue(t.due)}</span>
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-2">${status}<span class="rounded-full px-3 py-1.5 text-sm font-semibold ${PRIORITY_STYLE[t.priority]}">${PRIORITY_LABEL[t.priority]}</span></div>
    </li>`;
}
function cardHtml() {
    const data = getData();
    const names = new Map(data.courses.map((c) => [c.id, c.name]));
    const shown = sorted(data.tasks).filter((t) => matches(t, names.get(t.courseId) ?? ""));
    const n = selected.size;
    const toolbar = selecting
        ? `<div class="flex flex-wrap items-center gap-2">
         <span class="text-sm text-muted" aria-live="polite">${n} selected</span>
         <button type="button" data-action="bulk-done" class="${SECONDARY_BTN}" ${n === 0 ? "disabled" : ""}>Mark done</button>
         <button type="button" data-action="bulk-delete" class="${SECONDARY_BTN} text-brand" ${n === 0 ? "disabled" : ""}>Delete</button>
         <button type="button" data-action="select" class="${SECONDARY_BTN}">Cancel</button>
       </div>`
        : `<button type="button" data-action="select" class="${SECONDARY_BTN}">Select</button>`;
    const list = shown.length
        ? `<ul class="mt-2">${shown.map((t) => rowHtml(t, names.get(t.courseId) ?? "")).join("")}</ul>`
        : data.tasks.length === 0
            ? `<div class="mt-6 rounded-2xl bg-surface p-8 text-center"><p class="font-display text-md font-bold">No tasks yet</p><p class="mt-2 text-base text-muted">Create your first task and give your next step a home.</p><button type="button" data-action="new" class="${PRIMARY_BTN} mt-5">${PLUS} Add your first task</button></div>`
            : `<p class="mt-6 rounded-2xl bg-surface p-8 text-center text-base text-muted">No tasks match this filter or search.</p>`;
    return `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-display text-md font-bold">All your tasks</h2>
      ${toolbar}
    </div>
    ${list}`;
}
/* ---------- Page ---------- */
function refresh() {
    const { tasks } = getData();
    const stats = document.getElementById("task-stats");
    const tabs = document.getElementById("task-tabs");
    const card = document.getElementById("task-card");
    if (stats)
        stats.innerHTML = statsHtml(tasks);
    if (tabs)
        tabs.innerHTML = tabsHtml(tasks);
    if (card)
        card.innerHTML = cardHtml();
}
function skeleton(root) {
    const user = getData().user;
    const name = user?.name.trim().split(/\s+/)[0] ?? "Genius";
    root.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-xl font-extrabold tracking-tight sm:text-2xl">Your tasks</h1>
        <p class="mt-1 text-base text-muted">A clear plan makes room for great work.</p>
      </div>
      <button type="button" data-action="new" class="${PRIMARY_BTN}">${PLUS} New task</button>
    </div>
    <div id="task-stats" class="mt-6 grid gap-4 sm:grid-cols-3"></div>
    <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div id="task-tabs" role="group" aria-label="Filter tasks" class="flex flex-wrap gap-1"></div>
      <div class="relative flex-1">
        <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">${SEARCH}</span>
        <input id="task-search" type="search" placeholder="Search tasks" aria-label="Search tasks" class="h-12 w-full rounded-xl bg-elevated pl-11 pr-4 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-brand" />
      </div>
    </div>
    <section id="task-card" aria-label="All your tasks" class="mt-6 rounded-3xl bg-elevated p-5 sm:p-6"></section>
    <p class="mt-6 flex items-center gap-2 text-sm text-muted"><span class="text-brand">${SPARK}</span>One finished task is one step closer. Keep going, ${escapeHtml(name)}.</p>`;
}
function setDone(ids, done) {
    updateData((data) => {
        for (const t of data.tasks) {
            if (!ids.includes(t.id))
                continue;
            t.done = done;
            t.completedAt = done ? new Date().toISOString() : null;
        }
    });
}
function confirmDialog({ title, message, confirmLabel = "Confirm" }) {
    const dialog = document.getElementById("confirm-dialog");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    if (!(dialog instanceof HTMLDialogElement) || !titleEl || !messageEl || !okBtn) {
        return Promise.resolve(window.confirm(message));
    }
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmLabel;
    return new Promise((resolve) => {
        const onClick = (event) => {
            const t = event.target;
            if (t === dialog || (t instanceof Element && t.closest("[data-confirm-cancel]"))) {
                dialog.close("cancel");
            }
            else if (t instanceof Element && t.closest("[data-confirm-ok]")) {
                dialog.close("ok");
            }
        };
        dialog.addEventListener("click", onClick);
        dialog.addEventListener("close", () => {
            dialog.removeEventListener("click", onClick);
            resolve(dialog.returnValue === "ok");
        }, { once: true });
        dialog.returnValue = "";
        dialog.showModal();
    });
}
/* ---------- New task dialog ---------- */
function openDialog() {
    const dialog = document.getElementById("task-dialog");
    const form = document.getElementById("task-form");
    if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement))
        return;
    const { courses } = getData();
    const select = form.elements.namedItem("courseId");
    if (select instanceof HTMLSelectElement) {
        select.innerHTML =
            courses.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("") +
                `<option value="">Other</option>`;
    }
    form.reset();
    if (select instanceof HTMLSelectElement) {
        const wrapper = select.parentElement?.parentElement;
        let hint = document.getElementById("task-course-hint");
        if (!hint && wrapper) {
            hint = document.createElement("p");
            hint.id = "task-course-hint";
            hint.className = "mt-2 text-xs text-muted";
            wrapper.appendChild(hint);
        }
        if (hint) {
            hint.innerHTML = `No courses yet. <a href="course-new.html" class="font-semibold text-brand hover:underline">Add a course</a> to link tasks to it.`;
            hint.classList.toggle("hidden", courses.length > 0);
        }
    }
    const date = form.elements.namedItem("date");
    const time = form.elements.namedItem("time");
    if (date instanceof HTMLInputElement)
        date.value = new Date().toLocaleDateString("en-CA");
    if (time instanceof HTMLInputElement)
        time.value = "17:00";
    dialog.showModal();
    form.querySelector("#task-title")?.focus();
}
function initDialog() {
    const dialog = document.getElementById("task-dialog");
    const form = document.getElementById("task-form");
    if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement))
        return;
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog || (event.target instanceof Element && event.target.closest("[data-close]"))) {
            dialog.close();
        }
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const f = new FormData(form);
        const text = (k) => {
            const v = f.get(k);
            return typeof v === "string" ? v.trim() : "";
        };
        const due = new Date(`${text("date")}T${text("time") || "17:00"}`);
        if (Number.isNaN(due.getTime()))
            return;
        const rawPriority = text("priority");
        const priority = rawPriority === "medium" || rawPriority === "low" ? rawPriority : "high";
        const task = {
            id: `t-${uid()}`,
            title: text("title"),
            courseId: text("courseId"),
            due: due.toISOString(),
            priority,
            done: false,
            completedAt: null,
            notes: text("notes"),
            remind: f.get("remind") !== null,
        };
        updateData((data) => {
            data.tasks.unshift(task);
        });
        dialog.close();
        filter = "all";
        query = "";
        const search = document.getElementById("task-search");
        if (search instanceof HTMLInputElement)
            search.value = "";
        refresh();
    });
}
/* ---------- Entry point ---------- */
export function initTask() {
    const root = document.getElementById("task-content");
    if (!root)
        return;
    skeleton(root);
    refresh();
    initDialog();
    const search = document.getElementById("task-search");
    if (search instanceof HTMLInputElement) {
        search.addEventListener("input", () => {
            query = search.value;
            refresh();
        });
    }
    root.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const row = target.closest("[data-task]");
        if (row) {
            const id = row.dataset["task"] ?? "";
            if (selecting) {
                if (selected.has(id))
                    selected.delete(id);
                else
                    selected.add(id);
            }
            else {
                const task = getData().tasks.find((t) => t.id === id);
                if (task)
                    setDone([id], !task.done);
            }
            refresh();
            return;
        }
        const tab = target.closest("[data-filter]");
        if (tab) {
            filter = tab.dataset["filter"] ?? "all";
            refresh();
            return;
        }
        const action = target.closest("[data-action]")?.dataset["action"];
        if (action === "new") {
            openDialog();
        }
        else if (action === "select") {
            selecting = !selecting;
            selected.clear();
            refresh();
        }
        else if (action === "bulk-done") {
            setDone([...selected], true);
            selecting = false;
            selected.clear();
            refresh();
        }
        else if (action === "bulk-delete") {
            const count = selected.size;
            if (count === 0)
                return;
            const ok = await confirmDialog({
                title: count === 1 ? "Delete this task?" : `Delete ${count} tasks?`,
                message: "This can't be undone.",
                confirmLabel: "Delete",
            });
            if (!ok)
                return;
            updateData((data) => {
                data.tasks = data.tasks.filter((t) => !selected.has(t.id));
            });
            selecting = false;
            selected.clear();
            refresh();
        }
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
        openDialog();
        window.history.replaceState(null, "", "task.html");
    }
}
