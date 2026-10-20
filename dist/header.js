import { signOut } from "./session.js";
import { getData } from "./store.js";
import { escapeHtml, formatWhen, isSameDay } from "./utils.js";
const PANEL_CLASS = "absolute right-0 top-12 z-40 hidden w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-elevated p-3 shadow-[var(--shadow-md)]";
/** Puts a header button inside a positioned wrapper so a panel can open under it. */
function withPanel(button, id, html) {
    const wrapper = document.createElement("div");
    wrapper.className = "relative";
    button.replaceWith(wrapper);
    wrapper.append(button);
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = PANEL_CLASS;
    panel.innerHTML = html;
    wrapper.append(panel);
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    const close = () => {
        panel.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
    };
    button.addEventListener("click", () => {
        const open = panel.classList.contains("hidden");
        document.querySelectorAll("[data-header-panel]").forEach((p) => p.classList.add("hidden"));
        panel.classList.toggle("hidden", !open);
        button.setAttribute("aria-expanded", String(open));
    });
    panel.dataset["headerPanel"] = "";
    document.addEventListener("click", (event) => {
        if (event.target instanceof Node && !wrapper.contains(event.target))
            close();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.classList.contains("hidden")) {
            close();
            button.focus();
        }
    });
    return panel;
}
/* ---------- Notifications: tasks that are overdue or due today ---------- */
function initBell() {
    const bell = document.querySelector('button[aria-label="Notifications"]');
    if (!bell)
        return;
    const now = new Date();
    const items = getData()
        .tasks.filter((t) => !t.done && (new Date(t.due).getTime() < now.getTime() || isSameDay(new Date(t.due), now)))
        .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    const rows = items
        .slice(0, 5)
        .map((t) => {
        const overdue = new Date(t.due).getTime() < now.getTime();
        return `<li><a href="task.html" class="block rounded-xl px-3 py-3 transition-colors hover:bg-surface">
        <span class="block text-sm font-semibold">${escapeHtml(t.title)}</span>
        <span class="block text-xs ${overdue ? "text-brand" : "text-muted"}">${overdue ? "Overdue" : "Due"} · ${formatWhen(t.due)}</span>
      </a></li>`;
    })
        .join("");
    withPanel(bell, "notifications-panel", `<p class="px-3 pb-2 pt-1 font-display text-md font-bold">Notifications</p>
     ${rows ? `<ul>${rows}</ul>` : `<p class="px-3 py-4 text-sm text-muted">You’re all caught up.</p>`}
     <a href="task.html" class="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">View all tasks</a>`);
    if (items.length) {
        bell.classList.add("relative");
        bell.insertAdjacentHTML("beforeend", `<span class="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand ring-2 ring-surface"></span><span class="sr-only">${items.length} items need attention</span>`);
    }
}
/* ---------- Profile menu ---------- */
function initProfile() {
    const button = document.querySelector('button[aria-label="Open profile"]');
    if (!button)
        return;
    const { user } = getData();
    const panel = withPanel(button, "profile-panel", `<div class="px-3 pb-2 pt-1">
       <p class="font-semibold">${escapeHtml(user?.name ?? "Guest")}</p>
       <p class="truncate text-sm text-muted">${escapeHtml(user?.email ?? "")}</p>
     </div>
     <button type="button" data-signout class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">Sign out</button>`);
    panel.querySelector("[data-signout]")?.addEventListener("click", () => {
        signOut();
        window.location.href = "../index.html";
    });
}
function findHits(query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return [];
    const data = getData();
    const has = (...values) => values.some((v) => v.toLowerCase().includes(q));
    const courseName = new Map(data.courses.map((c) => [c.id, c.name]));
    return [
        ...data.courses.filter((c) => has(c.name, c.code, c.instructor)).map((c) => ({ kind: "Course", label: c.name, sub: `${c.code} · ${c.instructor}`, href: `course.html?id=${encodeURIComponent(c.id)}` })),
        ...data.tasks.filter((t) => has(t.title)).map((t) => ({ kind: "Task", label: t.title, sub: formatWhen(t.due), href: "task.html" })),
        ...data.notes.filter((n) => has(n.title, n.description)).map((n) => ({ kind: "Note", label: n.title, sub: courseName.get(n.courseId) ?? "", href: `course.html?id=${encodeURIComponent(n.courseId)}&tab=notes` })),
    ].slice(0, 8);
}
function initSearch() {
    const trigger = document.querySelector('button[aria-label="Search"]');
    if (!trigger)
        return;
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Search Planwise");
    dialog.className =
        "mx-auto mb-auto mt-[10vh] w-[min(36rem,calc(100vw-2rem))] rounded-3xl bg-elevated p-4 text-ink shadow-[var(--shadow-md)] backdrop:bg-black/50 backdrop:backdrop-blur-sm";
    dialog.innerHTML = `
    <input type="search" placeholder="Search courses, tasks and notes" aria-label="Search courses, tasks and notes" class="h-12 w-full rounded-xl bg-surface px-4 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-brand" />
    <ul class="mt-3 max-h-80 overflow-y-auto" aria-live="polite"></ul>
    <p class="mt-2 px-1 text-xs text-muted">Press Esc to close</p>`;
    document.body.append(dialog);
    const input = dialog.querySelector("input");
    const list = dialog.querySelector("ul");
    if (!input || !list)
        return;
    const update = () => {
        const hits = findHits(input.value);
        list.innerHTML = hits.length
            ? hits
                .map((h) => `<li><a href="${h.href}" class="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface focus:bg-surface">
              <span class="min-w-0"><span class="block truncate text-sm font-semibold">${escapeHtml(h.label)}</span><span class="block truncate text-xs text-muted">${escapeHtml(h.sub)}</span></span>
              <span class="shrink-0 rounded-full bg-navy-soft px-2.5 py-1 text-xs font-bold text-navy">${h.kind}</span>
            </a></li>`)
                .join("")
            : input.value.trim()
                ? `<li class="px-3 py-4 text-sm text-muted">Nothing found for “${escapeHtml(input.value.trim())}”.</li>`
                : "";
    };
    const open = () => {
        input.value = "";
        update();
        if (!dialog.open)
            dialog.showModal();
        input.focus();
    };
    trigger.addEventListener("click", open);
    input.addEventListener("input", update);
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog)
            dialog.close();
    });
    dialog.addEventListener("keydown", (event) => {
        const links = Array.from(list.querySelectorAll("a"));
        const index = links.indexOf(document.activeElement);
        if (event.key === "ArrowDown") {
            event.preventDefault();
            links[index + 1]?.focus();
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (index <= 0)
                input.focus();
            else
                links[index - 1]?.focus();
        }
        else if (event.key === "Enter" && document.activeElement === input) {
            links[0]?.click();
        }
    });
    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            open();
        }
    });
}
export function initHeader() {
    initSearch();
    initBell();
    initProfile();
}
