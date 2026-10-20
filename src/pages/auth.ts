import { signIn } from "../session.js";
import { getData, updateData } from "../store.js";

function showError(message: string): void {
  const el = document.getElementById("form-error");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("hidden", message === "");
}

function value(form: HTMLFormElement, name: string): string {
  const entry = new FormData(form).get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function setupPasswordToggles(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset["togglePassword"] ?? "");
      if (!(input instanceof HTMLInputElement)) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

function register(form: HTMLFormElement): void {
  const name = value(form, "name");
  const email = value(form, "email").toLowerCase();
  const university = value(form, "university");
  const field = value(form, "field");

  // The password is never stored: this is a front-end demo, not real authentication.
  updateData((data) => {
    data.user = { name, email, university, field };
  });
  signIn();
  window.location.href = "dashboard.html";
}

function login(form: HTMLFormElement): void {
  const email = value(form, "email").toLowerCase();
  const { user } = getData();

  if (!user || user.email !== email) {
    showError("We couldn’t find an account with that email on this device. Create one to get started.");
    return;
  }
  signIn();
  window.location.href = "dashboard.html";
}

export function initAuth(page: string): void {
  setupPasswordToggles();

  const form = document.querySelector<HTMLFormElement>("#auth-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showError("");

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (page === "register") register(form);
    else login(form);
  });
}