const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Fade sections in as they scroll into view. Nothing is hidden if JS fails or motion is reduced. */
function revealOnScroll() {
    if (reduceMotion || !("IntersectionObserver" in window))
        return;
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            const el = entry.target;
            el.classList.remove("reveal-hidden");
            el.classList.add("reveal-in");
            observer.unobserve(el);
        }
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach((el, i) => {
        el.classList.add("reveal-hidden");
        el.style.animationDelay = `${(i % 3) * 90}ms`;
        observer.observe(el);
    });
}
function countUp(el) {
    const target = Number(el.dataset["count"]);
    const decimals = Number(el.dataset["decimals"] ?? 0);
    const suffix = el.dataset["suffix"] ?? "";
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent =
            (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (t < 1)
            requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
/** Count the stat numbers up once, when they become visible. */
function animateStats() {
    if (reduceMotion || !("IntersectionObserver" in window))
        return;
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            countUp(entry.target);
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach((el) => observer.observe(el));
}
export function initLanding() {
    revealOnScroll();
    animateStats();
}
