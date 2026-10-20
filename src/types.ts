export type Priority = "high" | "medium" | "low";
export type CourseColor = "indigo" | "coral" | "green";

export interface User {
  name: string;
  email: string;
  university: string;
  field: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  semester: string;
  subject: string;
  color: CourseColor;
  description: string;
  cover: boolean; // show the illustration on cards
}

export interface Task {
  id: string;
  title: string;
  courseId: string;
  due: string; // ISO date-time
  priority: Priority;
  done: boolean;
  completedAt: string | null;
  notes: string;
  remind: boolean;
}

export interface Note {
  id: string;
  courseId: string;
  title: string;
  description: string;
  body: string; // limited HTML (see sanitizeHtml)
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  minutes: number;
  notes: string;
  scheduledAt: string;
  done: boolean;
}

export interface FocusSession {
  id: string;
  title: string;
  minutes: number;
  endedAt: string; // ISO date-time
}

export interface AppData {
  user: User | null;
  courses: Course[];
  tasks: Task[];
  notes: Note[];
  plans: StudyPlan[];
  sessions: FocusSession[];
  dailyGoalMin: number;
}