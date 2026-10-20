import type { AppData, Course, Note } from "./types.js";
import { at } from "./utils.js";

const KEY = "planwise-data-v1";
let cache: AppData | null = null;

type CourseInput = Omit<Course, "cover"> & Partial<Pick<Course, "cover">>;

/** Keeps only the fields a course needs (this also drops the old lesson fields from saved data). */
function normalize(c: CourseInput): Course {
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

const COURSES: CourseInput[] = [
  { id: "c-psy201", code: "PSY 201", name: "Cognitive Psychology", instructor: "Dr. Sarah Chen", semester: "Fall semester", subject: "Psychology", color: "indigo", description: "Explore how we think, remember and make sense of the world." },
  { id: "c-des104", code: "DES 104", name: "Visual Communication", instructor: "Prof. James Wilson", semester: "Fall semester", subject: "Design", color: "coral", description: "Learn how type, colour and layout carry meaning." },
  { id: "c-mat202", code: "MAT 202", name: "Statistics & Probability", instructor: "Dr. Maya Patel", semester: "Fall semester", subject: "Mathematics", color: "green", description: "Make sense of data, chance and uncertainty." },
  { id: "c-lit110", code: "LIT 110", name: "World Literature", instructor: "Prof. Emma Brooks", semester: "Fall semester", subject: "Literature", color: "coral", description: "Read stories from many places and times." },
  { id: "c-sci102", code: "SCI 102", name: "Environmental Science", instructor: "Dr. Oliver Reed", semester: "Fall semester", subject: "Science", color: "green", description: "Understand the systems that keep our planet running." },
  { id: "c-phi101", code: "PHI 101", name: "Introduction to Philosophy", instructor: "Prof. Sofia Martin", semester: "Fall semester", subject: "Philosophy", color: "indigo", description: "Ask big questions and practise answering them well." },
];


const NOTES: Note[] = [
  {
    id: "n-1", courseId: "c-psy201", title: "Working memory", pinned: true,
    description: "A mental workspace, not just short-term storage.",
    body: "<p>Working memory holds information briefly while we use it. It helps us reason, follow instructions and solve problems.</p><p><b>The working memory model</b></p><ul><li>Central executive: directs attention.</li><li>Phonological loop: rehearses words and sounds.</li><li>Visuospatial sketchpad: holds images and locations.</li><li>Episodic buffer: connects these with long-term memory.</li></ul><blockquote><b>Make it stick</b><br>Chunk information into meaningful groups. Rehearse it, then explain it in your own words.</blockquote><p>Review question: How is working memory different from simply remembering a phone number?</p>",
    createdAt: at(-3, 9), updatedAt: at(0, 10, 24),
  },
  {
    id: "n-2", courseId: "c-psy201", title: "Retrieval cues & practice", pinned: false,
    description: "Why testing helps us remember more.",
    body: "<p>Recalling information strengthens memory more than rereading it. Cues such as context, place and mood make retrieval easier.</p><ul><li>Practise with short self-tests.</li><li>Space your reviews over several days.</li></ul>",
    createdAt: at(-4, 9), updatedAt: at(-1, 14),
  },
  {
    id: "n-3", courseId: "c-psy201", title: "Attention is selective", pinned: false,
    description: "What we notice depends on our focus.",
    body: "<p>We cannot process everything at once. Attention filters what reaches awareness, which is why a quiet, single-task setting helps study sessions.</p>",
    createdAt: at(-5, 9), updatedAt: at(-2, 11),
  },
];

function seed(): AppData {
  return {
    user: null,
    dailyGoalMin: 90,
    courses: COURSES.map(normalize),
    tasks: [
      { id: "t-1", title: "Memory & cognition essay", courseId: "c-psy201", due: at(0, 17), priority: "high", done: false, completedAt: null, notes: "", remind: true },
      { id: "t-2", title: "Typography exploration", courseId: "c-des104", due: at(0, 20), priority: "medium", done: false, completedAt: null, notes: "", remind: false },
      { id: "t-3", title: "Probability problem set", courseId: "c-mat202", due: at(1, 12), priority: "high", done: false, completedAt: null, notes: "", remind: true },
      { id: "t-4", title: "Read The Great Gatsby", courseId: "c-lit110", due: at(2, 9), priority: "low", done: false, completedAt: null, notes: "", remind: false },
      { id: "t-5", title: "Research methods quiz", courseId: "c-psy201", due: at(-1, 17), priority: "high", done: false, completedAt: null, notes: "", remind: false },
      { id: "t-6", title: "Color theory notes", courseId: "c-des104", due: at(-2, 15), priority: "low", done: true, completedAt: at(-2, 16), notes: "", remind: false },
    ],
    notes: NOTES,
    plans: [
      { id: "p-1", title: "Memory & cognition essay", minutes: 25, notes: "", scheduledAt: at(0, 9), done: false },
      { id: "p-2", title: "Typography exploration", minutes: 45, notes: "", scheduledAt: at(-1, 15, 15), done: false },
    ],
    sessions: [
      { id: "s-1", title: "Working memory review", minutes: 25, endedAt: at(0, 10, 30) },
      { id: "s-2", title: "Memory & cognition essay", minutes: 25, endedAt: at(0, 9) },
      { id: "s-3", title: "Typography exploration", minutes: 45, endedAt: at(-1, 15, 15) },
      { id: "s-4", title: "Statistics review", minutes: 60, endedAt: at(-8, 11) },
      { id: "s-5", title: "World Literature reading", minutes: 45, endedAt: at(-9, 15) },
    ],
  };
}

export function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: data still works for this visit */
  }
}

export function getData(): AppData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as AppData;
      saved.courses = saved.courses.map(normalize); // upgrade older saved data
      saved.notes ??= [];
      saved.plans ??= [];
      cache = saved;
      persist();
      return cache;
    }
  } catch {
    /* fall through to sample data */
  }
  cache = seed();
  persist();
  return cache;
}

/** Change the data inside `change`, then save it. */
export function updateData(change: (data: AppData) => void): void {
  change(getData());
  persist();
}