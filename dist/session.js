const KEY = "planwise-session";
/** Front-end demo sign-in: a flag in the browser, not real authentication. */
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
        /* storage unavailable */
    }
}
export function signOut() {
    try {
        localStorage.removeItem(KEY);
    }
    catch {
        /* storage unavailable */
    }
}
