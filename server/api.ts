import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { studentDirectory } from "../src/services/accounts";
import {
  initialProfile,
  initialAssignments,
  initialAssessments,
  initialMarks,
  opportunities,
} from "../src/services/mock";
import { canApply, stageNames } from "../src/services/domain";
import type { Role, Assignment } from "../src/services/domain";
import type { Data } from "../src/services/store";

const fixtures = [
  ...studentDirectory.map((student, i) => ({
    ...student,
    role: "student" as const,
    dob: ["2006-02-14", "2006-04-23", "2005-11-09", "2006-07-31", "2006-09-18"][
      i
    ],
  })),
  {
    id: "FAC-AIML01",
    name: "Dr. Nisha Rao",
    section: "A",
    role: "faculty" as const,
    cgpa: 0,
    dob: "1985-06-12",
  },
  {
    id: "ADM-AIML01",
    name: "VidyaNova Administrator",
    section: "A",
    role: "administrator" as const,
    cgpa: 0,
    dob: "1981-03-25",
  },
];
const accounts = fixtures.map(({ dob, ...account }) => {
  const salt = randomBytes(16);
  return { ...account, salt, digest: scryptSync(dob, salt, 32) };
});
type Account = (typeof accounts)[number];
type Shared = Pick<
  Data,
  "assignments" | "assessments" | "marks" | "recommendations"
>;
type Personal = Partial<Data>;
const personalKeys = [
  "profile",
  "attempts",
  "sessions",
  "drafts",
  "learning",
  "saved",
  "codingRuns",
] as const;
const folder = resolve(process.env.VIDYANOVA_DATA_DIR || ".vidyanova-data");
const filename = resolve(folder, "records.json");
type Database = { shared: Shared; students: Record<string, Personal> };
function read(): Database {
  try {
    return JSON.parse(readFileSync(filename, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return {
    shared: {
      assignments: initialAssignments.map(
        ({
          submission: _file,
          mark: _mark,
          feedback: _feedback,
          ...assignment
        }) => assignment,
      ),
      assessments: initialAssessments,
      marks: initialMarks,
      recommendations: [],
    },
    students: {},
  };
}
function save(db: Database) {
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const temp = filename + ".tmp";
  writeFileSync(temp, JSON.stringify(db), { mode: 0o600 });
  renameSync(temp, filename);
}
const sessions = new Map<string, { account: Account; expires: number }>();
const cookieName = "vidyanova_session";
const ttl = 8 * 60 * 60 * 1000;
const dummySalt = randomBytes(16);
const dummyDigest = scryptSync("demo-invalid", dummySalt, 32);
const attempts = new Map<string, { count: number; until: number }>();
const assignmentOverlay = (row: Assignment) => ({
  submission: row.submission,
  mark: row.mark,
  feedback: row.feedback,
});
function snapshot(account: Account, db: Database): Partial<Data> {
  const identity = {
    role: account.role as Role,
    accountId: account.id,
    section: account.section,
    rosterName: account.name,
  };
  if (account.role === "administrator") return identity;
  if (account.role === "faculty") {
    return {
      ...db.shared,
      ...identity,
      studentSubmissions: studentDirectory.flatMap((student) =>
        (db.students[student.id]?.assignments ?? [])
          .filter((a) => a.submission)
          .map((a) => ({
            ...a,
            studentId: student.id,
            studentName: student.name,
          })),
      ),
      applications: studentDirectory.flatMap((student) =>
        (db.students[student.id]?.applications ?? []).map((row) => ({
          ...row,
          studentId: student.id,
          studentName: student.name,
        })),
      ),
      attempts: studentDirectory.flatMap(
        (student) => db.students[student.id]?.attempts ?? [],
      ),
    };
  }
  const stored = db.students[account.id] ?? {};
  const profile = {
    ...initialProfile,
    name: account.name,
    usn: account.id,
    email: account.name.toLowerCase().replaceAll(" ", ".") + "@example.edu",
    cgpa: account.cgpa,
    resume: "",
    ...stored.profile,
  };
  return {
    ...stored,
    ...identity,
    profile,
    marks: db.shared.marks.filter(
      (m) => m.student === account.name && m.published,
    ),
    assignments: db.shared.assignments
      .filter((a) => a.section === account.section && a.published)
      .map((a) => ({
        ...a,
        ...assignmentOverlay(
          stored.assignments?.find((r) => r.id === a.id) ?? a,
        ),
      })),
    assessments: [
      ...db.shared.assessments.filter(
        (a) => a.section === account.section && a.published,
      ),
      ...(stored.assessments ?? []),
    ],
    recommendations: account.section === "A" ? db.shared.recommendations : [],
  };
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error("Request too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function vidyanovaApi(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const path = req.url?.split("?")[0];
  if (!path?.startsWith("/api/account/")) return next();
  const send = (status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    const token = req.headers.cookie
      ?.split("; ")
      .find((c) => c.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    const session = token ? sessions.get(token) : undefined;
    const account =
      session && session.expires > Date.now() ? session.account : undefined;
    if (token && !account) sessions.delete(token);
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return send(403, { error: "Request origin is not allowed." });
    const cookieFlags =
      "; Path=/; HttpOnly; SameSite=Strict" +
      (process.env.VIDYANOVA_SECURE_COOKIE === "1" ? "; Secure" : "");
    if (path === "/api/account/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress ?? "local";
      const previous = attempts.get(ip);
      if (previous && previous.until > Date.now() && previous.count >= 12)
        return send(429, {
          error: "Too many sign-in attempts. Try again in one minute.",
        });
      const { id, password } = await body(req);
      const target =
        typeof id === "string"
          ? accounts.find((a) => a.id === id.trim().toUpperCase())
          : undefined;
      const validDate =
        typeof password === "string" && /^\d{4}-\d{2}-\d{2}$/.test(password);
      const digest = scryptSync(
        validDate ? password : "demo-invalid",
        target?.salt ?? dummySalt,
        32,
      );
      if (
        !timingSafeEqual(digest, target?.digest ?? dummyDigest) ||
        !target ||
        !validDate
      ) {
        attempts.set(
          ip,
          previous && previous.until > Date.now()
            ? { ...previous, count: previous.count + 1 }
            : { count: 1, until: Date.now() + 60000 },
        );
        return send(401, {
          error: "The account ID or date of birth is incorrect.",
        });
      }
      attempts.delete(ip);
      if (token) sessions.delete(token);
      const key = randomBytes(32).toString("hex");
      sessions.set(key, { account: target, expires: Date.now() + ttl });
      res.setHeader(
        "Set-Cookie",
        cookieName + "=" + key + cookieFlags + "; Max-Age=" + ttl / 1000,
      );
      return send(200, snapshot(target, read()));
    }
    if (path === "/api/account/logout" && req.method === "POST") {
      if (token) sessions.delete(token);
      res.setHeader(
        "Set-Cookie",
        cookieName + "=" + cookieFlags + "; Max-Age=0",
      );
      return send(200, {});
    }
    if (!account) return send(401, { error: "Sign in to continue." });
    if (path === "/api/account/session" && req.method === "GET")
      return send(200, snapshot(account, read()));
    if (path === "/api/account/state" && req.method === "PATCH") {
      const patch = (await body(req)) as Partial<Data>;
      if (!patch || typeof patch !== "object" || Array.isArray(patch))
        return send(400, { error: "Invalid update." });
      const db = read();
      if (account.role === "student") {
        const data = db.students[account.id] ?? {};
        for (const key of personalKeys) {
          if (key in patch) Object.assign(data, { [key]: patch[key] });
        }
        if (patch.profile)
          data.profile = {
            ...patch.profile,
            usn: account.id,
            cgpa: account.cgpa,
            backlogs: initialProfile.backlogs,
          };
        if (Array.isArray(patch.applications)) {
          const profile = { ...initialProfile, cgpa: account.cgpa };
          const applications = [...(data.applications ?? [])];
          for (const row of patch.applications) {
            const opportunity = opportunities.find(
              (item) => item.id === row?.opportunity,
            );
            if (
              opportunity &&
              opportunity.deadline > new Date().toISOString() &&
              canApply(profile, opportunity) &&
              !applications.some((a) => a.opportunity === opportunity.id)
            ) {
              applications.push({
                opportunity: opportunity.id,
                date: new Date().toISOString(),
                stage: "Applied",
              });
            }
          }
          data.applications = applications;
        }
        if (Array.isArray(patch.assignments)) {
          const previous = data.assignments ?? [];
          data.assignments = db.shared.assignments
            .filter((a) => a.section === account.section && a.published)
            .flatMap((a) => {
              const existing = previous.find((b) => b.id === a.id);
              if (existing) return [existing];
              const submission = patch.assignments?.find(
                (b) => b.id === a.id,
              )?.submission;
              return typeof submission === "string" &&
                submission.length <= 255 &&
                /\.(pdf|docx|zip|txt|py)$/i.test(submission) &&
                a.deadline > new Date().toISOString()
                ? [{ ...a, submission }]
                : [];
            });
        }
        if (Array.isArray(patch.assessments))
          data.assessments = patch.assessments.filter(
            (a) => typeof a.id === "string" && a.id.startsWith("practice-"),
          );
        db.students[account.id] = data;
      } else if (account.role === "faculty") {
        if (Array.isArray(patch.assignments))
          db.shared.assignments = patch.assignments;
        if (Array.isArray(patch.assessments))
          db.shared.assessments = patch.assessments;
        if (Array.isArray(patch.marks)) db.shared.marks = patch.marks;
        if (Array.isArray(patch.recommendations))
          db.shared.recommendations = patch.recommendations;
        if (Array.isArray(patch.applications)) {
          for (const update of patch.applications) {
            const application =
              update.studentId &&
              db.students[update.studentId]?.applications?.find(
                (a) => a.opportunity === update.opportunity,
              );
            if (application && stageNames.includes(update.stage)) {
              application.stage = update.stage;
              application.interview =
                typeof update.interview === "string" &&
                Number.isFinite(Date.parse(update.interview))
                  ? update.interview
                  : undefined;
            }
          }
        }
        if (Array.isArray(patch.studentSubmissions))
          for (const evaluation of patch.studentSubmissions) {
            const record = db.students[evaluation.studentId]?.assignments?.find(
              (a) => a.id === evaluation.id,
            );
            if (
              record &&
              record.submission &&
              typeof evaluation.mark === "number" &&
              Number.isInteger(evaluation.mark) &&
              evaluation.mark >= 0 &&
              evaluation.mark <= record.max &&
              typeof evaluation.feedback === "string"
            )
              Object.assign(record, {
                mark: evaluation.mark,
                feedback: evaluation.feedback,
              });
          }
      } else return send(403, { error: "This account has read-only access." });
      save(db);
      return send(200, {});
    }
    send(404, { error: "Endpoint not found." });
  } catch (error) {
    console.error(error);
    send(500, { error: "The local server could not complete the request." });
  }
}
