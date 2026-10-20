import { getData, updateData } from "../store.js";
import type { Note } from "../types.js";
import { escapeHtml, formatDate, formatDateTime, plainToHtml, sanitizeHtml, stripHtml, uid } from "../utils.js";

const svg = (paths: string, cls = "size-5", stroke = 1.6): string =>
  `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const PLUS = svg('<path d="M12 5v14M5 12h14"/>', "size-4", 2);
const SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
const PIN = svg('<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>', "size-4");
const MORE = `<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>`;
const BOLD = svg('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', "size-4", 2);
const ITALIC = svg('<path d="M10 5h8M6 19h8M14 5l-4 14"/>', "size-4", 2);
const UL = svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', "size-4");
const OL = svg('<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v4M4 14h3l-3 3.5h3"/>', "size-4");
const LINK = svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', "size-4");
const X = svg('<path d="M6 6l12 12M18 6 6 18"/>', "size-5", 1.8);

const PRIMARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95";
const INPUT =
  "w-full rounded-xl bg-surface px-4 text-base outline-none transition placeholder:text-muted/70 focus:ring-2 focus:ring-brand";
const LABEL = "mb-2 block text-sm font-semibold";
const TOOL_BTN = "grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink";
const BODY_STYLE =
  "[&_p]:mb-3 [&_div]:mb-2 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-brand [&_a]:underline [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-md [&_h3]:font-bold [&_blockquote]:my-4 [&_blockquote]:rounded-2xl [&_blockquote]:bg-navy-soft [&_blockquote]:p-4";

let courseId = "";
let activeId: string | null = null;
let query = "";
let saveTimer: number | undefined;

/* ---------- Data helpers ---------- */

function notesForCourse(): Note[] {
  return getData()
    .notes.filter((n) => n.courseId === courseId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function activeNote(): Note | undefined {
  return getData().notes.find((n) => n.id === activeId);
}

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/* ---------- List ---------- */

function cardHtml(n: Note): string {
  const active = n.id === activeId;
  const subtitle = n.description || stripHtml(n.body).slice(0, 80);
  return `
    <li>
      <button type="button" data-note="${escapeHtml(n.id)}" ${active ? 'aria-current="true"' : ""} class="block w-full rounded-2xl border p-4 text-left transition-colors ${active ? "border-brand bg-brand-soft" : "border-transparent bg-surface hover:border-line"}">
        <span class="flex items-start justify-between gap-2">
          <span class="text-base font-bold ${active ? "text-brand" : ""}">${escapeHtml(n.title)}</span>
          ${n.pinned ? `<span class="shrink-0 text-brand" title="Pinned"><span class="sr-only">Pinned</span>${PIN}</span>` : ""}
        </span>
        <span class="mt-1 block text-sm text-muted">${escapeHtml(subtitle)}</span>
        <span class="mt-3 block text-xs text-muted">Updated ${formatDate(n.updatedAt)}</span>
      </button>
    </li>`;
}

function renderList(): void {
  const el = document.getElementById("note-list");
  if (!el) return;
  const all = notesForCourse();
  const q = query.trim().toLowerCase();
  const shown = all.filter((n) => !q || [n.title, n.description, stripHtml(n.body)].some((v) => v.toLowerCase().includes(q)));

  el.innerHTML = `
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold">Your notes</h2>
      <span class="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">${all.length} ${all.length === 1 ? "note" : "notes"}</span>
    </div>
    ${
      shown.length
        ? `<ul class="mt-4 space-y-3">${shown.map(cardHtml).join("")}</ul>`
        : `<p class="mt-4 rounded-2xl bg-surface p-6 text-center text-sm text-muted">${all.length ? "No notes match your search." : "No notes yet. Make your first one."}</p>`
    }`;
}

/* ---------- Editor ---------- */

function editorHtml(n: Note): string {
  return `
    <div class="flex items-start justify-between gap-3">
      <span class="rounded-full bg-navy-soft px-3 py-1 text-xs font-bold text-navy">Personal note</span>
      <div class="relative flex items-center gap-1">
        <button type="button" data-note-action="pin" aria-pressed="${n.pinned}" aria-label="${n.pinned ? "Unpin note" : "Pin note"}" class="${TOOL_BTN} ${n.pinned ? "text-brand" : ""}">${PIN}</button>
        <button type="button" data-note-action="menu" aria-label="More options" aria-haspopup="true" class="${TOOL_BTN}">${MORE}</button>
        <div id="note-menu" class="absolute right-0 top-11 z-10 hidden min-w-40 rounded-xl border border-line bg-elevated p-1 shadow-[var(--shadow-md)]">
          <button type="button" data-note-action="delete" class="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">Delete note</button>
        </div>
      </div>
    </div>

    <input id="note-title" type="text" value="${escapeHtml(n.title)}" maxlength="100" aria-label="Note title" class="mt-4 w-full bg-transparent font-display text-xl font-extrabold tracking-tight outline-none" />
    <p id="note-meta" class="mt-2 text-sm text-muted"></p>

    <div role="toolbar" aria-label="Text formatting" class="mt-5 flex flex-wrap items-center gap-1 border-y border-line py-2">
      <button type="button" data-cmd="bold" aria-label="Bold" class="${TOOL_BTN}">${BOLD}</button>
      <button type="button" data-cmd="italic" aria-label="Italic" class="${TOOL_BTN}">${ITALIC}</button>
      <button type="button" data-cmd="insertUnorderedList" aria-label="Bulleted list" class="${TOOL_BTN}">${UL}</button>
      <button type="button" data-cmd="insertOrderedList" aria-label="Numbered list" class="${TOOL_BTN}">${OL}</button>
      <button type="button" data-cmd="link" aria-label="Add link" class="${TOOL_BTN}">${LINK}</button>
      <label class="ml-2 flex items-center">
        <span class="sr-only">Text style</span>
        <select id="note-block" class="rounded-lg bg-transparent px-2 py-1.5 text-sm text-muted outline-none hover:bg-surface">
          <option value="p">Text</option>
          <option value="h3">Heading</option>
          <option value="blockquote">Callout</option>
        </select>
      </label>
    </div>

    <div id="note-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note content" class="mt-5 min-h-56 text-base leading-relaxed outline-none ${BODY_STYLE}">${sanitizeHtml(n.body)}</div>

    <div class="mt-6 flex items-center justify-between text-sm">
      <span id="note-status" class="text-mint" aria-live="polite">All changes saved</span>
      <span id="note-words" class="text-muted"></span>
    </div>`;
}

function updateMeta(): void {
  const n = activeNote();
  const meta = document.getElementById("note-meta");
  const words = document.getElementById("note-words");
  const body = document.getElementById("note-body");
  if (meta && n) meta.textContent = `${n.description ? `${n.description} · ` : ""}Updated ${formatDateTime(n.updatedAt)} · Only you`;
  if (words && body) {
    const count = wordCount(body.textContent ?? "");
    words.textContent = `${count} ${count === 1 ? "word" : "words"}`;
  }
}

function renderEditor(): void {
  const el = document.getElementById("note-editor");
  if (!el) return;
  const n = activeNote();
  el.innerHTML = n
    ? editorHtml(n)
    : `<div class="grid min-h-64 place-items-center text-center"><p class="max-w-xs text-base text-muted">Pick a note from the list, or make a new one to start writing.</p></div>`;
  updateMeta();
}

function setStatus(text: string): void {
  const el = document.getElementById("note-status");
  if (el) el.textContent = text;
}

function flushSave(): void {
  window.clearTimeout(saveTimer);
  const id = activeId;
  const titleEl = document.getElementById("note-title");
  const bodyEl = document.getElementById("note-body");
  if (!id || !(titleEl instanceof HTMLInputElement) || !bodyEl) return;

  const body = sanitizeHtml(bodyEl.innerHTML);
  const title = titleEl.value.trim() || "Untitled note";
  updateData((data) => {
    const note = data.notes.find((x) => x.id === id);
    if (!note || (note.title === title && note.body === body)) return;
    note.title = title;
    note.body = body;
    note.updatedAt = new Date().toISOString();
  });
  setStatus("All changes saved");
  renderList();
  updateMeta();
}

function scheduleSave(): void {
  setStatus("Saving…");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, 500);
}

function select(id: string | null): void {
  flushSave();
  activeId = id;
  renderList();
  renderEditor();
}

function runCommand(cmd: string): void {
  const body = document.getElementById("note-body");
  if (!body) return;
  body.focus();
  if (cmd === "link") {
    const url = window.prompt("Link address (starting with https://)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Please enter a link that starts with http:// or https://");
      return;
    }
    document.execCommand("createLink", false, url);
  } else {
    document.execCommand(cmd);
  }
  scheduleSave();
}

/* ---------- Dialog ---------- */

function dialogHtml(): string {
  return `
    <dialog id="note-dialog" aria-labelledby="note-dialog-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl bg-elevated p-0 text-ink shadow-[var(--shadow-md)] backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <form id="note-form" novalidate class="p-6 sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="note-dialog-title" class="font-display text-xl font-extrabold tracking-tight">Make a Note.</h2>
            <p class="mt-2 text-sm text-muted">Capture an idea and keep it with this course.</p>
          </div>
          <button type="button" data-close aria-label="Close" class="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink">${X}</button>
        </div>
        <div class="mt-6 space-y-5">
          <div><label for="nf-title" class="${LABEL}">Note title</label><input id="nf-title" name="title" type="text" required maxlength="100" placeholder="Memory &amp; cognition essay" class="${INPUT} h-12" /></div>
          <div><label for="nf-desc" class="${LABEL}">Note description (optional)</label><input id="nf-desc" name="description" type="text" maxlength="120" placeholder="This note is for learning about essay" class="${INPUT} h-12" /></div>
          <div><label for="nf-body" class="${LABEL}">Notes</label><textarea id="nf-body" name="body" rows="4" placeholder="Compare working memory and long-term memory." class="${INPUT} py-3"></textarea></div>
        </div>
        <div class="mt-8 flex justify-end gap-3 border-t border-line pt-6">
          <button type="button" data-close class="rounded-xl border border-line bg-elevated px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface">Cancel</button>
          <button type="submit" class="${PRIMARY_BTN}">${PLUS} Create note</button>
        </div>
      </form>
    </dialog>`;
}

function openDialog(): void {
  const dialog = document.getElementById("note-dialog");
  const form = document.getElementById("note-form");
  if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement)) return;
  form.reset();
  dialog.showModal();
  form.querySelector<HTMLInputElement>("#nf-title")?.focus();
}

function bindDialog(): void {
  const dialog = document.getElementById("note-dialog");
  const form = document.getElementById("note-form");
  if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement)) return;

  dialog.onclick = (event) => {
    const target = event.target;
    if (target === dialog || (target instanceof Element && target.closest("[data-close]"))) dialog.close();
  };

  form.onsubmit = (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const f = new FormData(form);
    const text = (key: string): string => {
      const v = f.get(key);
      return typeof v === "string" ? v.trim() : "";
    };
    const now = new Date().toISOString();
    const note: Note = {
      id: `n-${uid()}`,
      courseId,
      title: text("title"),
      description: text("description"),
      body: plainToHtml(text("body")) || "<p></p>",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    flushSave();
    updateData((data) => {
      data.notes.unshift(note);
    });
    dialog.close();
    query = "";
    const search = document.getElementById("note-search");
    if (search instanceof HTMLInputElement) search.value = "";
    activeId = note.id;
    renderList();
    renderEditor();
    document.getElementById("note-body")?.focus();
  };
}

/* ---------- Entry point ---------- */

export function renderNotes(container: HTMLElement, id: string): void {
  courseId = id;
  query = "";
  activeId = notesForCourse()[0]?.id ?? null;

  container.innerHTML = `
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">${SEARCH}</span>
        <input id="note-search" type="search" placeholder="Search your notes" aria-label="Search your notes" class="h-12 w-full rounded-xl bg-elevated pl-11 pr-4 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-brand" />
      </div>
      <button type="button" data-note-action="new" class="${PRIMARY_BTN}">${PLUS} New note</button>
    </div>
    <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <section id="note-list" aria-label="Your notes" class="rounded-3xl bg-elevated p-5 sm:p-6"></section>
      <section id="note-editor" aria-label="Note editor" class="rounded-3xl bg-elevated p-5 sm:p-8"></section>
    </div>
    ${dialogHtml()}`;

  renderList();
  renderEditor();
  bindDialog();

  // Using on... properties (not addEventListener) so re-opening the tab never stacks handlers
  container.onmousedown = (event) => {
    if (event.target instanceof Element && event.target.closest("[data-cmd]")) event.preventDefault(); // keep the text selection
  };

  container.oninput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === "note-search" && target instanceof HTMLInputElement) {
      query = target.value;
      renderList();
    } else if (target.id === "note-title" || target.id === "note-body") {
      scheduleSave();
      updateMeta();
    }
  };

  container.onchange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "note-block") return;
    document.getElementById("note-body")?.focus();
    document.execCommand("formatBlock", false, `<${target.value}>`);
    scheduleSave();
  };

  container.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const menu = document.getElementById("note-menu");
    if (menu && !target.closest('[data-note-action="menu"]')) menu.classList.add("hidden");

    const card = target.closest<HTMLElement>("[data-note]");
    if (card) return select(card.dataset["note"] ?? null);

    const cmd = target.closest<HTMLElement>("[data-cmd]")?.dataset["cmd"];
    if (cmd) return runCommand(cmd);

    const action = target.closest<HTMLElement>("[data-note-action]")?.dataset["noteAction"];
    if (action === "new") openDialog();
    else if (action === "menu") menu?.classList.toggle("hidden");
    else if (action === "pin") {
      flushSave();
      const noteId = activeId;
      updateData((data) => {
        const note = data.notes.find((x) => x.id === noteId);
        if (note) note.pinned = !note.pinned;
      });
      renderList();
      renderEditor();
    } else if (action === "delete") {
      menu?.classList.add("hidden");
      if (!window.confirm("Delete this note? This can’t be undone.")) return;
      window.clearTimeout(saveTimer);
      const noteId = activeId;
      updateData((data) => {
        data.notes = data.notes.filter((x) => x.id !== noteId);
      });
      activeId = notesForCourse()[0]?.id ?? null;
      renderList();
      renderEditor();
    }
  };
}