const KEY = "planwise-session";
export function isSignedIn() {
    try {
        return localStorage.getItem(KEY) === "1";
    }
    catch {
        return false;
    }
}
export function signIn() {
    try {
        localStorage.setItem(KEY, "1");
    }
    catch {
    }
}
export function signOut() {
    try {
        localStorage.removeItem(KEY);
    }
    catch {
    }
}
