import type {
  Application,
  Assessment,
  Assignment,
  Attempt,
  Mark,
  Opportunity,
} from "./domain";
import { activeAssessment, canApply, quizTotal, scoreQuiz } from "./domain";
import { opportunities } from "./mock";
import { accountRequest, flushUpdates, useDemo, type Data } from "./store";
export const apiConfig = { baseUrl: import.meta.env.VITE_API_URL || "/api" };
export interface AuthService {
  signIn(id: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  restore(): Promise<void>;
}
export interface AcademicService {
  list(): Mark[];
  save(records: Mark[]): void;
}
export interface AssignmentService {
  list(): Assignment[];
  save(record: Assignment): void;
}
export interface AssessmentService {
  list(): Assessment[];
  save(record: Assessment): void;
  complete(id: string, answers: Record<number, number>): Attempt;
}
export interface OpportunityService {
  list(kind: Opportunity["kind"]): Opportunity[];
  apply(id: string): void;
}
export interface CodeExecutionService {
  evaluate(request: {
    problemId: string;
    language: string;
    code: string;
    submit: boolean;
  }): Promise<{ passed: number; total: number; output: string }>;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
const store = useDemo.getState;
export const auth: AuthService = {
  async signIn(id, password) {
    store().load(
      await accountRequest<Partial<Data>>("login", "POST", { id, password }),
    );
  },
  async signOut() {
    await flushUpdates();
    await accountRequest("logout", "POST");
    store().load({});
  },
  async restore() {
    try {
      store().load(await accountRequest<Partial<Data>>("session"));
    } catch {
      store().load({});
    }
  },
};
export const academics: AcademicService = {
  list: () => store().marks,
  save: (marks) => store().update(() => ({ marks })),
};
export const assignments: AssignmentService = {
  list: () => store().assignments,
  save: (record) =>
    store().update((s) => ({
      assignments: [record, ...s.assignments.filter((a) => a.id !== record.id)],
    })),
};
export const assessments: AssessmentService = {
  list: () => store().assessments,
  save: (record) =>
    store().update((s) => ({
      assessments: [record, ...s.assessments.filter((a) => a.id !== record.id)],
    })),
  complete(id, answers) {
    const state = store();
    const old = state.attempts.find((a) => a.id === id);
    if (old && !id.startsWith("practice-")) return old;
    const item = state.assessments.find((a) => a.id === id);
    if (!item || (!state.sessions[id] && !activeAssessment(item)))
      throw new Error("Assessment unavailable.");
    const result = {
      id,
      title: item.title,
      score: scoreQuiz(item.questions, answers),
      total: quizTotal(item.questions),
      answers,
      completed: new Date().toISOString(),
    };
    state.update((s) => {
      const sessions = { ...s.sessions };
      delete sessions[id];
      return { sessions, attempts: [result, ...s.attempts] };
    });
    return result;
  },
};
export const careers: OpportunityService = {
  list: (kind) => opportunities.filter((o) => o.kind === kind),
  apply(id) {
    const state = store();
    const target = opportunities.find((o) => o.id === id);
    if (
      !target ||
      !canApply(state.profile, target) ||
      target.deadline < new Date().toISOString()
    )
      throw new Error("This opportunity is unavailable for your profile.");
    if (state.applications.some((a) => a.opportunity === id)) return;
    const application: Application = {
      opportunity: id,
      date: new Date().toISOString(),
      stage: "Applied",
    };
    state.update((s) => ({ applications: [...s.applications, application] }));
  },
};
export const judge: CodeExecutionService = {
  async evaluate({ code, submit }) {
    if (!code.trim()) throw new Error("Enter some code before running.");
    await new Promise((resolve) => setTimeout(resolve, 450));
    const passed = /\b(pass|TODO)\b/.test(code)
      ? 0
      : Math.min(5, Math.max(1, Math.floor(code.trim().length / 25)));
    return {
      passed,
      total: 5,
      output: `Simulated ${submit ? "submission" : "run"}: ${passed} of 5 demo cases passed. This result is based on the draft text, with no code execution.`,
    };
  },
};
