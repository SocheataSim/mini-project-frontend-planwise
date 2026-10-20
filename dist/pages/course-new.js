import { updateData } from "../store.js";
import { uid } from "../utils.js";
const BAND = { indigo: "bg-navy-soft", coral: "bg-brand-soft", green: "bg-mint-soft" };
const CODE = { indigo: "text-navy", coral: "text-brand", green: "text-mint" };
const COLOR_NAME = { indigo: "Indigo", coral: "Coral", green: "Green" };
function isColor(value) {
    return value === "indigo" || value === "coral" || value === "green";
}
function read(form, name) {
    const entry = new FormData(form).get(name);
    return typeof entry === "string" ? entry.trim() : "";
}
function setText(id, text) {
    const el = document.getElementById(id);
    if (el)
        el.textContent = text;
}
function updatePreview(form) {
    const picked = read(form, "color");
    const color = isColor(picked) ? picked : "indigo";
    const cover = new FormData(form).get("cover") !== null;
    setText("pv-code", read(form, "code") || "CODE 101");
    setText("pv-name", read(form, "name") || "Your course name");
    setText("pv-instructor", read(form, "instructor") || "Instructor");
    setText("pv-subject", read(form, "subject"));
    setText("pv-semester", read(form, "semester"));
    setText("color-name", `${COLOR_NAME[color]} selected`);
    const band = document.getElementById("pv-band");
    const code = document.getElementById("pv-code");
    const image = document.getElementById("pv-cover");
    if (band)
        band.className = `flex h-32 items-center justify-between px-5 ${BAND[color]}`;
    if (code)
        code.className = `text-sm font-bold ${CODE[color]}`;
    if (image)
        image.classList.toggle("hidden", !cover);
}
export function initCourseNew() {
    const form = document.querySelector("#course-form");
    if (!form)
        return;
    updatePreview(form);
    form.addEventListener("input", () => updatePreview(form));
    form.addEventListener("change", () => updatePreview(form));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const picked = read(form, "color");
        const course = {
            id: `c-${uid()}`,
            code: read(form, "code"),
            name: read(form, "name"),
            instructor: read(form, "instructor"),
            semester: read(form, "semester"),
            subject: read(form, "subject"),
            color: isColor(picked) ? picked : "indigo",
            description: read(form, "description"),
            cover: new FormData(form).get("cover") !== null,
        };
        updateData((data) => {
            data.courses.unshift(course);
        });
        window.location.href = `course.html?id=${encodeURIComponent(course.id)}`;
    });
}
