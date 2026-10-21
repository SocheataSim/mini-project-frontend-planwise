import { signIn } from "../session.js";
import { getData, updateData } from "../store.js";
function showError(message) {
    const el = document.getElementById("form-error");
    if (!el)
        return;
    el.textContent = message;
    el.classList.toggle("hidden", message === "");
}
function value(form, name) {
    const entry = new FormData(form).get(name);
    return typeof entry === "string" ? entry.trim() : "";
}
function setupPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset["togglePassword"] ?? "");
            if (!(input instanceof HTMLInputElement))
                return;
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
            btn.setAttribute("aria-pressed", String(show));
        });
    });
}
function register(form) {
    const name = value(form, "name");
    const email = value(form, "email").toLowerCase();
    const university = value(form, "university");
    const field = value(form, "field");
    
    updateData((data) => {
        data.user = { name, email, university, field };
    });
    signIn();
    window.location.href = "dashboard.html";
}
function login(form) {
    const email = value(form, "email").toLowerCase();
    const { user } = getData();
    if (!user || user.email !== email) {
        showError("We couldn’t find an account with that email on this device. Create one to get started.");
        return;
    }
    signIn();
    window.location.href = "dashboard.html";
}
export function initAuth(page) {
    setupPasswordToggles();
    const form = document.querySelector("#auth-form");
    if (!form)
        return;
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        showError("");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        if (page === "register")
            register(form);
        else
            login(form);
    });
}
