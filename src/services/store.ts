import { create } from "zustand";
import type {
  Application,
  Assessment,
  Assignment,
  Attempt,
  Mark,
  Profile,
  Role,
} from "./domain";
import {
  initialProfile,
  initialAssignments,
  initialAssessments,
  initialMarks,
} from "./mock";
type Session = {
  id: string;
  deadline: number;
  answers: Record<number, number>;
  flagged: number[];
  index: number;
};
export type Data = {
  accountId: string;
  section: string;
  rosterName: string;
  studentSubmissions: (Assignment & {
    studentId: string;
    studentName: string;
  })[];
  role: Role | null;
  profile: Profile;
  assignments: Assignment[];
  assessments: Assessment[];
  marks: Mark[];
  attempts: Attempt[];
  sessions: Record<string, Session>;
  drafts: Record<string, string>;
  learning: number[];
  applications: Application[];
  saved: string[];
  recommendations: string[];
  codingRuns: number;
};
const seed = (): Data => ({
  role: null,
  accountId: "",
  section: "",
  rosterName: "",
  studentSubmissions: [],
  profile: initialProfile,
  assignments: initialAssignments,
  assessments: initialAssessments,
  marks: initialMarks,
  attempts: [],
  sessions: {},
  drafts: {},
  learning: [5, 4, 3, 0, 0],
  applications: [],
  saved: [],
  recommendations: [],
  codingRuns: 0,
});
type Store = Data & {
  ready: boolean;
  saveError: string;
  update: (change: (state: Data) => Partial<Data>) => void;
  load: (data: Partial<Data>) => void;
};
export async function accountRequest<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(
    (import.meta.env.VITE_API_URL || "/api") + "/account/" + path,
    {
      method,
      headers:
        data === undefined ? undefined : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error ?? "The server could not complete the request.",
    );
  return result;
}

let pending: Promise<unknown> = Promise.resolve();
export const flushUpdates = () => pending;
export const useDemo = create<Store>()((set, get) => ({
  ...seed(),
  ready: false,
  saveError: "",
  load: (data) => set({ ...seed(), ...data, ready: true, saveError: "" }),
  update: (change) => {
    const current = get();
    if (!current.accountId) return;
    const patch = change(current);
    set(patch);
    pending = pending
      .then(() => accountRequest("state", "PATCH", patch))
      .catch((error: unknown) => {
        set({
          saveError:
            error instanceof Error
              ? error.message
              : "The last change could not be saved.",
        });
      });
  },
}));
