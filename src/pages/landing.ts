const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function revealOnScroll(): void {
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.remove("reveal-hidden");
        el.classList.add("reveal-in");
        observer.unobserve(el);
      }
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el, i) => {
    el.classList.add("reveal-hidden");
    el.style.animationDelay = `${(i % 3) * 90}ms`;
    observer.observe(el);
  });
}

function countUp(el: HTMLElement): void {
  const target = Number(el.dataset["count"]);
  const decimals = Number(el.dataset["decimals"] ?? 0);
  const suffix = el.dataset["suffix"] ?? "";
  const duration = 1200;
  const start = performance.now();

  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent =
      (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateStats(): void {
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        countUp(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => observer.observe(el));
}

export function initLanding(): void {
  revealOnScroll();
  animateStats();
}