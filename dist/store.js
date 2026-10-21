const KEY = "planwise-data-v2";
const LEGACY_KEY = "planwise-data-v1";
const DEFAULT_DAILY_GOAL_MIN = 90;
let cache = null;
function normalize(c) {
    return {
        id: c.id,
        code: c.code,
        name: c.name,
        instructor: c.instructor,
        semester: c.semester,
        subject: c.subject,
        color: c.color,
        description: c.description,
        cover: c.cover ?? true,
    };
}
function empty() {
    return {
        user: null,
        dailyGoalMin: DEFAULT_DAILY_GOAL_MIN,
        courses: [],
        tasks: [],
        notes: [],
        plans: [],
        sessions: [],
    };
}
export function persist() {
    try {
        localStorage.setItem(KEY, JSON.stringify(cache));
    }
    catch {
    }
}
function fromLegacy() {
    const data = empty();
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) {
            const old = JSON.parse(raw);
            data.user = old.user ?? null;
            localStorage.removeItem(LEGACY_KEY);
        }
    }
    catch {
    }
    return data;
}
export function getData() {
    if (cache)
        return cache;
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            cache = {
                user: saved.user ?? null,
                dailyGoalMin: saved.dailyGoalMin ?? DEFAULT_DAILY_GOAL_MIN,
                courses: (saved.courses ?? []).map(normalize),
                tasks: saved.tasks ?? [],
                notes: saved.notes ?? [],
                plans: saved.plans ?? [],
                sessions: saved.sessions ?? [],
            };
            return cache;
        }
    }
    catch {
    }
    cache = fromLegacy();
    persist();
    return cache;
}
export function updateData(change) {
    change(getData());
    persist();
}
