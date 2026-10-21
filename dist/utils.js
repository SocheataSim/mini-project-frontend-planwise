const ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
export function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}
export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
export function isSameDay(a, b) {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}
/** ISO string */
export function at(dayOffset, hours, minutes = 0) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
}
export function formatDue(iso) {
    const d = new Date(iso);
    const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (diff === 0)
        return `Today, ${time}`;
    if (diff === 1)
        return `Tomorrow, ${time}`;
    const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${day}, ${time}`;
}
export function formatHours(hours) {
    return `${Number(hours.toFixed(1))} h`;
}
export function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
const ALLOWED_TAGS = new Set(["P", "BR", "DIV", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A", "BLOCKQUOTE", "H3"]);
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "TEMPLATE"]);
export function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    const clean = (node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE)
                continue;
            if (child.nodeType !== Node.ELEMENT_NODE) {
                child.remove();
                continue;
            }
            const el = child;
            if (DROPPED_TAGS.has(el.tagName)) {
                el.remove();
                continue;
            }
            clean(el);
            if (!ALLOWED_TAGS.has(el.tagName)) {
                el.replaceWith(...Array.from(el.childNodes));
                continue;
            }
            for (const attr of Array.from(el.attributes)) {
                if (!(el.tagName === "A" && attr.name === "href"))
                    el.removeAttribute(attr.name);
            }
            if (el.tagName === "A") {
                const href = el.getAttribute("href") ?? "";
                if (/^(https?:|mailto:)/i.test(href)) {
                    el.setAttribute("rel", "noopener noreferrer");
                    el.setAttribute("target", "_blank");
                }
                else {
                    el.removeAttribute("href");
                }
            }
        }
    };
    clean(doc.body);
    return doc.body.innerHTML;
}
export function stripHtml(html) {
    return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}
export function plainToHtml(text) {
    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");
}
export function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function formatDateTime(iso) {
    const time = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${formatDate(iso)}, ${time}`;
}
export function formatWhen(iso) {
    const d = new Date(iso);
    const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (diff === 0)
        return `Today, ${time}`;
    if (diff === -1)
        return `Yesterday, ${time}`;
    if (diff === 1)
        return `Tomorrow, ${time}`;
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}
export function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
