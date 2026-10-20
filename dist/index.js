import { initHeader } from "./header.js";
import { renderNav } from "./nav.js";
import { isSignedIn } from "./session.js";
import { getData } from "./store.js";
import { initThemeToggle } from "./theme.js";
// Pages that need you to be signed in
const PROTECTED = new Set(["dashboard", "course", "course-new", "task", "study"]);
function boot() {
    const page = document.body.dataset.page ?? "dashboard";
    if (PROTECTED.has(page) && !isSignedIn()) {
        window.location.replace("login.html");
        return;
    }
    if (page !== "landing")
        document.getElementById("main")?.classList.add("page-in");
    // Sub-pages (like "create course") can highlight their parent item with data-nav
    renderNav(document.body.dataset.nav ?? page);
    initThemeToggle();
    // Header date, e.g. "Wed, 14 Oct 2026"
    const todayEl = document.getElementById("today");
    if (todayEl) {
        const now = new Date();
        todayEl.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
        todayEl.setAttribute("datetime", now.toISOString().slice(0, 10));
    }
    // Name and initials (set after register; "Genius" / "AK" until then)
    const { user } = getData();
    if (user) {
        const words = user.name.trim().split(/\s+/);
        const nameEl = document.getElementById("user-name");
        const initialsEl = document.getElementById("user-initials");
        if (nameEl)
            nameEl.textContent = words[0] ?? "Genius";
        if (initialsEl)
            initialsEl.textContent = words.map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    }
    initHeader(); // search, notifications and the profile menu (only on pages that have them)
    // Load only the code the current page needs
    if (page === "dashboard")
        void import("./pages/dashboard.js").then((m) => m.initDashboard());
    if (page === "course")
        void import("./pages/course.js").then((m) => m.initCourse());
    if (page === "course-new")
        void import("./pages/course-new.js").then((m) => m.initCourseNew());
    if (page === "task")
        void import("./pages/task.js").then((m) => m.initTask());
    if (page === "study")
        void import("./pages/study.js").then((m) => m.initStudy());
    if (page === "login" || page === "register")
        void import("./pages/auth.js").then((m) => m.initAuth(page));
    if (page === "landing")
        void import("./pages/landing.js").then((m) => m.initLanding());
}
boot();
