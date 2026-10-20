const STORAGE_KEY = "planwise-theme";
export function getTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    }
    catch {
        /* storage can be blocked (private mode); the theme still applies for this visit */
    }
    syncToggles();
}
function syncToggles() {
    const isDark = getTheme() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(isDark));
        btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    });
}
export function initThemeToggle() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => applyTheme(getTheme() === "dark" ? "light" : "dark"));
    });
    syncToggles();
}
