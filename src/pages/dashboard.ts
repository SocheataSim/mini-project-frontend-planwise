import { getData, updateData } from "../store.js";
import type { Course, Priority, Task } from "../types.js";
import { escapeHtml, formatDue, isSameDay, startOfDay } from "../utils.js";

const CARD = "rounded-3xl bg-elevated p-5 sm:p-6";
const LINK = "inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline";

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-brand-soft text-brand",
  medium: "bg-surface text-muted",
  low: "bg-mint-soft text-mint",
};
const COURSE_STYLE: Record<Course["color"], string> = {
  indigo: "bg-navy-soft",
  coral: "bg-brand-soft",
  green: "bg-mint-soft",
};

const CHEVRON = `<svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const CHEVRON_LEFT = `<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>`;
const BOOK = `<svg viewBox="0 0 24 24" class="size-6 text-navy" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v13"/><path d="M3 5.5a1 1 0 0 1 1-1h4a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H4a1 1 0 0 1-1-1z"/><path d="M21 5.5a1 1 0 0 0-1-1h-4a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h5a1 1 0 0 0 1-1z"/></svg>`;
const PLAY = `<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M7 5v14l11-7z"/></svg>`;

const CHECK_SM = `<svg viewBox="0 0 24 24" class="mx-auto size-3.5 text-on-brand" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>`;

let selectedDate: Date | null = startOfDay(new Date());

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();

function sortedOpenTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

function completedThisWeek(tasks: Task[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return tasks.filter((t) => t.done && t.completedAt !== null && new Date(t.completedAt).getTime() >= weekAgo).length;
}

/* ---------- Sections ---------- */

function bannerHtml(): string {
  const n = completedThisWeek(getData().tasks);
  const text =
    n === 0
      ? "Finish one small task today and the week gets lighter."
      : `You’ve completed ${n} ${n === 1 ? "task" : "tasks"} this week. Keep your momentum going.`;
  return `
    <section aria-labelledby="journey-title" class="flex items-center justify-between gap-6 rounded-3xl bg-navy-soft p-6 sm:p-8">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-navy">Your learning journey</p>
        <h2 id="journey-title" class="mt-3 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">Great things start with a little focus.</h2>
        <p class="mt-3 text-base text-ink/80">${text}</p>
      </div>
      <img src="../assets/logo-elements.png" alt="" width="240" height="160" class="hidden h-24 w-auto shrink-0 sm:block lg:h-28" />
    </section>`;
}

function taskRow(task: Task, courses: Map<string, Course>): string {
  const course = courses.get(task.courseId);
  const overdue = new Date(task.due).getTime() < Date.now();
  return `
    <li class="flex items-start gap-3 border-b border-line py-4 last:border-b-0">
      <button type="button" role="checkbox" aria-checked="false" data-task-id="${escapeHtml(task.id)}"
        aria-label="Mark “${escapeHtml(task.title)}” as done"
        class="mt-0.5 size-5 shrink-0 rounded-md border-2 border-line transition-colors hover:border-brand"></button>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold">${escapeHtml(task.title)}</p>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          ${course ? `<span class="rounded-full bg-navy-soft px-3 py-1 text-sm font-semibold text-navy">${escapeHtml(course.name)}</span>` : `<span class="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">Other</span>`}
          <span class="text-sm ${overdue ? "text-brand" : "text-muted"}">${formatDue(task.due)}</span>
        </div>
      </div>
      <span class="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${PRIORITY_STYLE[task.priority]}">${PRIORITY_LABEL[task.priority]}</span>
    </li>`;
}

function tasksHtml(): string {
  const data = getData();
  const courses = new Map(data.courses.map((c) => [c.id, c]));
  const open = sortedOpenTasks(data.tasks).slice(0, 3);
  const body = open.length
    ? `<ul class="mt-2">${open.map((t) => taskRow(t, courses)).join("")}</ul>`
    : data.tasks.length === 0
      ? `<p class="mt-6 text-base text-muted">No tasks yet. <a href="task.html?new=1" class="font-semibold text-brand hover:underline">Add your first task</a> to plan your next step.</p>`
      : `<p class="mt-6 text-base text-muted">All clear. Add a task to plan your next step.</p>`;
  return `
    <section aria-labelledby="tasks-title" class="${CARD}">
      <div class="flex items-center justify-between">
        <h2 id="tasks-title" class="font-display text-lg font-bold">Priority tasks</h2>
        <a href="task.html" class="${LINK}">View all ${CHEVRON}</a>
      </div>
      ${body}
    </section>`;
}

function taskSummary(courseId: string, tasks: Task[]): string {
  const mine = tasks.filter((t) => t.courseId === courseId);
  const open = mine.filter((t) => !t.done).length;
  if (mine.length === 0) return "No tasks yet";
  return open === 0 ? "All tasks done" : `${open} open ${open === 1 ? "task" : "tasks"}`;
}

function coursesHtml(): string {
  const { courses, tasks } = getData();
  const cards = courses
    .slice(0, 4)
    .map(
      (c) => `
      <a href="course.html?id=${encodeURIComponent(c.id)}" class="block rounded-2xl p-5 transition hover:brightness-95 ${COURSE_STYLE[c.color]}">
        ${BOOK}
        <p class="mt-4 text-md font-bold text-ink">${escapeHtml(c.name)}</p>
        <p class="mt-3 text-sm text-ink/70">${taskSummary(c.id, tasks)}</p>
      </a>`
    )
    .join("");
  return `
    <section aria-labelledby="courses-title" class="${CARD}">
      <div class="flex items-center justify-between">
        <h2 id="courses-title" class="font-display text-lg font-bold">Courses</h2>
        <a href="course.html" class="${LINK}">All courses ${CHEVRON}</a>
      </div>
      <div class="@container mt-5"><div class="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-2">${cards || `<p class="text-base text-muted">No courses yet. <a href="course-new.html" class="font-semibold text-brand hover:underline">Add your first course</a>.</p>`}</div></div>
    </section>`;
}

function dayListHtml(): string {
  if (!selectedDate) {
    return `<p class="mt-4 border-t border-line pt-4 text-sm text-muted">Select a day to see its tasks.</p>`;
  }
  const picked = selectedDate;
  const { tasks, courses } = getData();
  const names = new Map(courses.map((c) => [c.id, c.name]));
  const list = tasks
    .filter((t) => isSameDay(new Date(t.due), picked))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const title = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long" }).format(picked);

  const rows = list
    .map(
      (t) => `
      <li class="flex items-start gap-3 py-2">
        <button type="button" role="checkbox" aria-checked="${t.done}" data-task-id="${escapeHtml(t.id)}"
          aria-label="Mark “${escapeHtml(t.title)}” as ${t.done ? "not done" : "done"}"
          class="mt-0.5 size-5 shrink-0 rounded-md border-2 transition-colors ${t.done ? "border-mint bg-mint" : "border-line hover:border-brand"}">${t.done ? CHECK_SM : ""}</button>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold ${t.done ? "text-muted line-through" : ""}">${escapeHtml(t.title)}</p>
          <p class="truncate text-xs text-muted">${new Date(t.due).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${escapeHtml(names.get(t.courseId) ?? "Other")}</p>
        </div>
      </li>`
    )
    .join("");

  return `
    <div class="mt-4 border-t border-line pt-4" aria-live="polite">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">${title}</h3>
        <span class="text-xs text-muted">${list.length} ${list.length === 1 ? "task" : "tasks"}</span>
      </div>
      ${rows ? `<ul class="mt-2">${rows}</ul>` : `<p class="mt-3 text-sm text-muted">No tasks due this day.</p>`}
      <a href="task.html" class="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Open all tasks</a>
    </div>`;
}

function calendarHtml(): string {
  const { tasks } = getData();
  const today = new Date();
  const first = new Date(viewYear, viewMonth, 1);
  const offset = (first.getDay() + 6) % 7; // week starts on Monday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const open = tasks.filter((t) => !t.done);
  const deadlineDays = new Set<number>();
  for (const t of open) {
    const d = new Date(t.due);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) deadlineDays.add(d.getDate());
  }
  const upcoming = open.filter((t) => new Date(t.due).getTime() >= startOfDay(today).getTime()).length;

  const cells: string[] = [];
  for (let i = 0; i < offset; i++) cells.push(`<div></div>`);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const isToday = isSameDay(date, today);
    const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
    const hasDeadline = deadlineDays.has(day);
    const look = isToday
      ? `bg-brand font-semibold text-on-brand ${isSelected ? "ring-2 ring-brand ring-offset-2 ring-offset-elevated" : ""}`
      : isSelected
        ? "text-ink ring-2 ring-brand"
        : "text-ink hover:bg-surface";
    const label = `${new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date)}${hasDeadline ? ", has a deadline" : ""}`;
    cells.push(`
      <div class="grid h-9 place-items-center">
        <button type="button" data-cal-day="${day}" aria-pressed="${isSelected}" aria-label="${label}"
          class="relative grid size-8 place-items-center rounded-full text-sm transition-colors ${look}">
          ${day}${hasDeadline ? `<span class="absolute bottom-0.5 size-1 rounded-full ${isToday ? "bg-on-brand" : "bg-brand"}"></span>` : ""}
        </button>
      </div>`);
  }

  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(first);
  const navBtn = "grid size-8 place-items-center rounded-full text-brand transition-colors hover:bg-brand-soft";
  return `
    <section aria-labelledby="calendar-title" class="${CARD}">
      <div class="flex items-center justify-between">
        <h2 id="calendar-title" class="font-display text-lg font-bold">${title}</h2>
        <div class="flex gap-1">
          <button type="button" data-cal-nav="-1" class="${navBtn}" aria-label="Previous month">${CHEVRON_LEFT}</button>
          <button type="button" data-cal-nav="1" class="${navBtn}" aria-label="Next month">${CHEVRON}</button>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-7 text-center text-xs text-muted" aria-hidden="true">
        ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="py-2">${d}</span>`).join("")}
      </div>
      <div class="grid grid-cols-7 text-center">${cells.join("")}</div>
      <p class="mt-4 flex items-center gap-2 text-sm text-muted">
        <span class="size-1.5 rounded-full bg-brand" aria-hidden="true"></span>
        ${upcoming} upcoming ${upcoming === 1 ? "deadline" : "deadlines"}
      </p>
      ${dayListHtml()}
    </section>`;
}

function studyHtml(): string {
  const { sessions, dailyGoalMin } = getData();
  const now = new Date();
  const todays = sessions.filter((s) => isSameDay(new Date(s.endedAt), now));
  const minutes = todays.reduce((sum, s) => sum + s.minutes, 0);
  const percent = Math.min(100, Math.round((minutes / dailyGoalMin) * 100));
  return `
    <section aria-labelledby="study-title" class="rounded-3xl bg-mint-soft p-5 sm:p-6">
      <h2 id="study-title" class="font-display text-lg font-bold">Today’s Study Session</h2>
      <div class="mt-6 flex items-start gap-8">
        <div>
          <p class="font-display text-2xl font-extrabold text-mint">${minutes} min</p>
          <p class="mt-1 text-sm text-muted">of your ${dailyGoalMin} min goal</p>
        </div>
        <div>
          <p class="font-display text-2xl font-extrabold text-ink">${todays.length}</p>
          <p class="mt-1 text-sm text-muted">${todays.length === 1 ? "session" : "sessions"}</p>
        </div>
      </div>
      <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-elevated/70" role="progressbar" aria-label="Daily study goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <div class="h-full rounded-full bg-mint" style="width:${percent}%"></div>
      </div>
      <a href="study.html" class="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95">${PLAY} Start a focus session</a>
    </section>`;
}


function render(root: HTMLElement): void {
  root.innerHTML = `
    ${bannerHtml()}
    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div class="space-y-6">${tasksHtml()}${coursesHtml()}</div>
      <div class="space-y-6">${calendarHtml()}${studyHtml()}</div>
    </div>`;
}

function toggleTask(id: string): void {
  updateData((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
  });
}

function shiftMonth(step: number): void {
  const d = new Date(viewYear, viewMonth + step, 1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
}

export function initDashboard(): void {
  const root = document.getElementById("dashboard-content");
  if (!root) return;
  render(root);

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const taskBtn = target.closest<HTMLElement>("[data-task-id]");
    if (taskBtn) {
      toggleTask(taskBtn.dataset["taskId"] ?? "");
      render(root);
      return;
    }

    const dayBtn = target.closest<HTMLElement>("[data-cal-day]");
    if (dayBtn) {
      const dayNumber = dayBtn.dataset["calDay"] ?? "1";
      const picked = new Date(viewYear, viewMonth, Number(dayNumber));
      selectedDate = selectedDate && isSameDay(selectedDate, picked) ? null : picked;
      render(root);
      root.querySelector<HTMLElement>(`[data-cal-day="${dayNumber}"]`)?.focus();
      return;
    }

    const navBtn = target.closest<HTMLElement>("[data-cal-nav]");
    if (navBtn) {
      shiftMonth(Number(navBtn.dataset["calNav"]));
      render(root);
    }
  });
}