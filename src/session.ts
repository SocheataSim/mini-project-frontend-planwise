const KEY = "planwise-session";

export function isSignedIn(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function signIn(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
  }
}

export function signOut(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
  }
}