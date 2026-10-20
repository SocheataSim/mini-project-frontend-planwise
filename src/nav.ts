interface NavItem {
  id: string;
  label: string; // desktop sidebar
  short: string; // mobile bottom bar
  href: string;
  icon: string;
}

const svg = (paths: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-6 shrink-0">${paths}</svg>`;

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    short: "Dashboard",
    href: "dashboard.html",
    icon: svg(
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
    ),
  },
  {
    id: "course",
    label: "Course",
    short: "Course",
    href: "course.html",
    icon: svg(
      '<path d="M12 7v13"/><path d="M3 5.5a1 1 0 0 1 1-1h4a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H4a1 1 0 0 1-1-1z"/><path d="M21 5.5a1 1 0 0 0-1-1h-4a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h5a1 1 0 0 0 1-1z"/>'
    ),
  },
  {
    id: "task",
    label: "Task",
    short: "Task",
    href: "task.html",
    icon: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  },
  {
    id: "study",
    label: "Study Session",
    short: "Study",
    href: "study.html",
    icon: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5 15 10.5"/><path d="M10 2.5h4"/>'),
  },
];

function sidebarLink(item: NavItem, active: boolean): string {
  const state = active
    ? "bg-brand-soft text-brand font-semibold"
    : "text-muted hover:bg-surface hover:text-ink font-medium";
  return `
    <a href="${item.href}" ${active ? 'aria-current="page"' : ""}
       class="flex items-center justify-center gap-3 rounded-xl py-3 text-base transition-colors lg:justify-start lg:px-4 ${state}">
      ${item.icon}
      <span class="md:sr-only lg:not-sr-only">${item.label}</span>
    </a>`;
}

function bottomLink(item: NavItem, active: boolean): string {
  const state = active ? "text-brand font-semibold" : "text-muted font-medium";
  return `
    <a href="${item.href}" ${active ? 'aria-current="page"' : ""}
       class="flex flex-col items-center gap-1 py-2.5 text-sm transition-colors ${state}">
      ${item.icon}
      <span>${item.short}</span>
    </a>`;
}

export function renderNav(activeId: string): void {
  const side = document.getElementById("sidebar-nav");
  const bottom = document.getElementById("bottom-nav");
  if (side) side.innerHTML = NAV_ITEMS.map((i) => sidebarLink(i, i.id === activeId)).join("");
  if (bottom) bottom.innerHTML = NAV_ITEMS.map((i) => bottomLink(i, i.id === activeId)).join("");
}