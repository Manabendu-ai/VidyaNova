import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Badge,
  Bars,
  Card,
  Head,
  Modal,
  Stats,
  Table,
  date,
} from "../components/ui";
import { assignments, careers, errorMessage } from "../services/api";
import { canApply, markTotal, validUpload } from "../services/domain";
import type { Assignment, Opportunity } from "../services/domain";
import { opportunities, subjects, topics } from "../services/mock";
import { useDemo } from "../services/store";
const totals = [8, 7, 6, 10, 5];
const baseline = [72, 64, 81, 55, 58];
const summary = (state: ReturnType<typeof useDemo.getState>) => {
  const practice = state.attempts.filter((a) => a.id.startsWith("practice-"));
  const tests = state.attempts.filter((a) => !a.id.startsWith("practice-"));
  const score = tests.length
    ? Math.round(
        (72 + tests.reduce((acc, t) => acc + (100 * t.score) / t.total, 0)) /
          (tests.length + 1),
      )
    : 72;
  return {
    practice,
    tests,
    score,
    solved: 428 + practice.reduce((acc, t) => acc + t.total, 0),
  };
};
export function Dashboard() {
  const s = useDemo();
  const { score, solved } = summary(s);
  const pending = s.assignments.filter(
    (a) => a.published && a.section === s.section && !a.submission,
  );
  const upcoming = s.assessments.filter(
    (a) =>
      a.published &&
      a.section === s.section &&
      !a.id.startsWith("practice-") &&
      a.closes > new Date().toISOString() &&
      !s.attempts.some((r) => r.id === a.id),
  );
  const marks = s.marks.filter((m) => m.published && m.semester === 5);
  return (
    <>
      <Head
        title={"Welcome, " + s.profile.name.split(" ")[0]}
        subtitle="Keep track of your academics, learning and career preparation."
      />
      <Stats
        items={[
          ["Current semester", "Semester 5", "AIML · Year 3"],
          ["CGPA", s.profile.cgpa.toFixed(2), "Academic profile"],
          [
            "Placement readiness",
            score + " / 100",
            solved + " practice questions solved",
          ],
          [
            "Learning progress",
            s.learning.reduce((a, b) => a + b) + " topics",
            "Completed",
          ],
        ]}
      />
      <div className="split">
        <Card title="Recent marks">
          <Table
            headers={["Subject", "Marks"]}
            rows={marks
              .slice(0, 4)
              .map((m) => [m.subject, markTotal(m) + " / 100"])}
          />
          <Link to="/student/academics">View academic marks</Link>
        </Card>
        <Card title="Student profile">
          <h3>{s.profile.name}</h3>
          <p>
            {s.profile.usn} · Section {s.section}
          </p>
          <p>{s.profile.email}</p>
          <Link to="/student/profile">View profile</Link>
        </Card>
      </div>
      <div className="equal">
        <Card title="Assignment deadlines">
          <Table
            headers={["Assignment", "Due"]}
            rows={pending.map((a) => [a.title, date(a.deadline)])}
          />
          <Link to="/student/assignments">Open assignments</Link>
        </Card>
        <Card title="Upcoming assessments">
          <Table
            headers={["Assessment", "Opens"]}
            rows={upcoming.map((a) => [a.title, date(a.opens)])}
          />
          <Link to="/student/assessments">Open assessments</Link>
        </Card>
      </div>
      <Card title="Career announcements">
        <Table
          headers={["Company", "Opportunity", "Deadline"]}
          rows={opportunities.slice(0, 5).map((o) => [
            o.company,
            <Link
              key={o.id}
              to={
                "/student/" +
                (o.kind === "internship" ? "internships" : "placement")
              }
            >
              {o.role}
            </Link>,
            date(o.deadline),
          ])}
        />
      </Card>
      <Card title="Recent activity">
        <Table
          headers={["Activity", "Result", "Date"]}
          rows={s.attempts
            .slice(0, 4)
            .map((a) => [
              a.title,
              a.score + " / " + a.total,
              date(a.completed),
            ])}
        />
        <div className="actions">
          <Link className="button" to="/student/learning">
            Continue learning
          </Link>
          <Link className="button secondary" to="/student/coding">
            Open coding lab
          </Link>
        </div>
      </Card>
    </>
  );
}
export function Learning() {
  const [selected, setSelected] = useState<number>();
  const learning = useDemo((s) => s.learning);
  const recommendations = useDemo((s) => s.recommendations);
  const update = useDemo((s) => s.update);
  const next = learning.findIndex((n, i) => n < totals[i]);
  const complete = learning.reduce((a, b) => a + b);
  return (
    <>
      <Head
        title="My learning path"
        subtitle="Follow a structured preparation plan, one milestone at a time."
      />
      <Stats
        items={[
          [
            "Overall completion",
            Math.round((100 * complete) / totals.reduce((a, b) => a + b)) + "%",
            complete + " topics completed",
          ],
          ["Current week", "Week 4", "Reasoning & coding"],
          ["Study streak", "6 days", "Keep it going"],
        ]}
      />
      <div className="split">
        <Card
          title="Your learning roadmap"
          subtitle="Recommended order based on your baseline assessment"
        >
          <Bars
            rows={topics.map((label, i) => ({
              label,
              value: (100 * learning[i]) / totals[i],
              note: totals[i] + " lessons · " + learning[i] + " completed",
              end: (
                <button
                  className="pill"
                  onClick={() => setSelected(i)}
                  disabled={learning[i] >= totals[i]}
                >
                  {learning[i] === totals[i]
                    ? "Complete"
                    : learning[i]
                      ? "In progress"
                      : "Upcoming"}
                </button>
              ),
            }))}
          />
        </Card>
        <Card title="Next milestone">
          <p>Recommended next activity</p>
          <div className="callout">
            <h3>
              {next === 0
                ? "Time & Work"
                : (topics[next] ?? "Roadmap complete")}
            </h3>
            <small>
              {next >= 0
                ? "Lesson + practice questions"
                : "All topics completed"}
            </small>
            {next >= 0 && (
              <button onClick={() => setSelected(next)}>Continue</button>
            )}
          </div>
          <h3>This week’s targets</h3>
          <ul>
            <li>Complete 2 learning modules</li>
            <li>Practise 30 aptitude questions</li>
            <li>Finish 1 checkpoint quiz</li>
          </ul>
        </Card>
      </div>
      <Card title="Upcoming milestones">
        <Table
          headers={["Milestone", "Schedule", "Status"]}
          rows={[
            "Aptitude checkpoint",
            "Reasoning module review",
            "Coding basics pathway",
            ...recommendations,
          ].map((n, i) => [
            n,
            ["Friday", "Monday", "Wednesday"][i] ?? "Faculty assigned",
            <Badge key={n}>Upcoming</Badge>,
          ])}
        />
      </Card>
      {selected !== undefined && (
        <Modal title={topics[selected]} close={() => setSelected(undefined)}>
          <p>
            Lesson {learning[selected] + 1} of {totals[selected]}
          </p>
          <p>
            {
              [
                "Convert work durations to rates. Add the rates for people working together, then take their reciprocal to find the combined duration.",
                "Identify how adjacent terms change before predicting the next term in a sequence.",
                "Find the subject and check that its verb agrees in number.",
                "Choose a data structure that matches the operations you use most often.",
                "Compare database normalization rules and practice identifying partial dependencies.",
              ][selected]
            }
          </p>
          <button
            onClick={() => {
              update((s) => ({
                learning: s.learning.map((n, i) =>
                  i === selected ? Math.min(totals[i], n + 1) : n,
                ),
              }));
              setSelected(undefined);
            }}
          >
            Mark lesson complete
          </button>
        </Modal>
      )}
    </>
  );
}
export function Progress() {
  const s = useDemo();
  const { score, practice, tests, solved } = summary(s);
  const [period, setPeriod] = useState("Weekly");
  const rows = s.attempts
    .slice(0, period === "Weekly" ? 7 : 30)
    .reverse()
    .map((a, i) => ({
      name: "Attempt " + (i + 1),
      accuracy: Math.round((100 * a.score) / a.total),
    }));
  return (
    <>
      <Head
        title="My progress"
        subtitle="Understand your growth over time and identify the skills to improve next."
      />
      <Stats
        items={[
          ["Readiness score", score + " / 100", "Based on assessment results"],
          [
            "Practice hours",
            (
              24.5 +
              practice.reduce((n, a) => n + a.total * 52, 0) / 3600
            ).toFixed(1) + " h",
            "Estimated this term",
          ],
          ["Questions solved", solved, "Across practice sessions"],
          ["Assessments", tests.length, "Completed"],
        ]}
      />
      <div className="split">
        <Card
          title="Skill-wise performance"
          subtitle="Current accuracy by category"
        >
          <Bars
            rows={[2, 0, 1, 3].map((i) => {
              const recent = practice.filter((a) => a.title === topics[i]);
              return {
                label: topics[i],
                value: recent.length
                  ? Math.round(
                      (100 * recent.reduce((n, a) => n + a.score, 0)) /
                        recent.reduce((n, a) => n + a.total, 0),
                    )
                  : baseline[i],
              };
            })}
          />
        </Card>
        <Card title="Your next focus">
          <div className="callout">
            <h3>Coding fundamentals</h3>
            <small>Practice data structures and algorithmic reasoning</small>
            <Link className="button" to="/student/practice">
              Start practice
            </Link>
          </div>
          <h3>Suggested actions</h3>
          <ul>
            <li>Complete 2 coding exercises</li>
            <li>Review your most recent assessment</li>
            <li>Retake a reasoning mini-test</li>
          </ul>
        </Card>
      </div>
      <Card title="Recent activity">
        <Table
          headers={["Activity", "Result", "Date"]}
          rows={s.attempts.map((a) => [
            a.title,
            a.score + " / " + a.total,
            date(a.completed),
          ])}
        />
      </Card>
      <Card title="Accuracy trends">
        <label className="inline">
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </label>
        {rows.length ? (
          <div
            className="chart"
            role="img"
            aria-label={rows
              .map((r) => r.name + ": " + r.accuracy + " percent")
              .join(", ")}
          >
            <ResponsiveContainer>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line dataKey="accuracy" stroke="#7357e8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>Complete a practice session or assessment to see your trend.</p>
        )}
      </Card>
    </>
  );
}
export function Academics() {
  const [semester, setSemester] = useState(5);
  const profile = useDemo((s) => s.profile);
  const marks = useDemo((s) => s.marks).filter(
    (m) => m.published && m.semester === semester,
  );
  const grade = (n: number) =>
    n >= 90
      ? "O"
      : n >= 80
        ? "A+"
        : n >= 70
          ? "A"
          : n >= 60
            ? "B+"
            : n >= 50
              ? "B"
              : n >= 40
                ? "C"
                : "F";
  const gpa = marks.length
    ? (
        marks.reduce(
          (n, m) =>
            n +
            ({ O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, F: 0 }[
              grade(markTotal(m))
            ] ?? 0),
          0,
        ) / marks.length
      ).toFixed(2)
    : "—";
  return (
    <>
      <Head
        title="Academic marks"
        subtitle="View your AIML semester records and subject performance."
      />
      <Stats
        items={[
          ["SGPA", gpa, "Equal-credit demo calculation"],
          ["CGPA", profile.cgpa.toFixed(2), "Academic profile"],
          ["Published subjects", marks.length, "Semester " + semester],
        ]}
      />
      <Card title="Subject-wise marks">
        <label className="inline">
          Semester
          <select
            value={semester}
            onChange={(e) => setSemester(+e.target.value)}
          >
            {[5, 4, 3].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <Table
          headers={[
            "Subject",
            "Internal / 40",
            "Quiz / 20",
            "Assignment / 20",
            "Lab / 20",
            "Total / 100",
            "Grade",
          ]}
          rows={marks.map((m) => [
            m.subject,
            m.internal,
            m.quiz,
            m.assignment,
            m.lab,
            markTotal(m),
            grade(markTotal(m)),
          ])}
        />
      </Card>
      <Card title="Subject performance">
        <div
          className="chart"
          role="img"
          aria-label={marks
            .map((m) => m.subject + ": " + markTotal(m) + " of 100")
            .join(", ")}
        >
          <ResponsiveContainer>
            <BarChart
              data={marks.map((m) => ({
                subject: m.subject,
                marks: markTotal(m),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="marks" fill="#7357e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
export const assignmentStatus = (a: Assignment) =>
  a.mark !== undefined
    ? "Evaluated"
    : a.submission
      ? "Submitted"
      : a.deadline < new Date().toISOString()
        ? "Overdue"
        : "Pending";
export function StudentAssignments() {
  const [subject, setSubject] = useState("All subjects");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<string>();
  const [file, setFile] = useState<File>();
  const [notice, setNotice] = useState("");
  const section = useDemo((s) => s.section);
  const all = useDemo((s) => s.assignments).filter(
    (a) => a.published && a.section === section,
  );
  const active = all.find((a) => a.id === selected);
  return (
    <>
      <Head
        title="Assignments"
        subtitle="Review instructions, submit your work and view faculty feedback."
      />
      <Card title="Published assignments">
        <div className="actions">
          <label>
            Subject
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {["All subjects", ...subjects].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {[
                "All statuses",
                "Pending",
                "Submitted",
                "Evaluated",
                "Overdue",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>
        <p role="status">{notice}</p>
        <Table
          headers={["Assignment", "Subject", "Deadline", "Status", "Action"]}
          rows={all
            .filter(
              (a) =>
                (subject === "All subjects" || subject === a.subject) &&
                (status === "All statuses" || status === assignmentStatus(a)),
            )
            .map((a) => [
              a.title,
              a.subject,
              date(a.deadline),
              <Badge
                key={a.id}
                tone={
                  assignmentStatus(a) === "Overdue"
                    ? "orange"
                    : a.submission
                      ? "green"
                      : "purple"
                }
              >
                {assignmentStatus(a)}
              </Badge>,
              <button
                className="secondary"
                key={a.id}
                onClick={() => {
                  setFile(undefined);
                  setNotice("");
                  setSelected(a.id);
                }}
              >
                View assignment
              </button>,
            ])}
        />
      </Card>
      {active && (
        <Modal title={active.title} close={() => setSelected(undefined)}>
          <p>{active.instructions}</p>
          <p>
            Due {date(active.deadline)} · {active.max} marks
          </p>
          {active.reference && <p>Reference file: {active.reference}</p>}
          {active.submission && <p>Submitted file: {active.submission}</p>}
          {active.mark !== undefined && (
            <p>
              Marks: {active.mark} / {active.max}. {active.feedback}
            </p>
          )}
          {assignmentStatus(active) === "Pending" && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!file || !validUpload(file)) {
                  setNotice(
                    "Choose a PDF, DOCX, ZIP, TXT or PY file up to 10 MB.",
                  );
                  return;
                }
                if (new Date().toISOString() > active.deadline) {
                  setNotice("The submission deadline has passed.");
                  return;
                }
                assignments.save({ ...active, submission: file.name });
                setNotice("Submission recorded.");
                setSelected(undefined);
              }}
            >
              <label>
                Submission file
                <input
                  required
                  type="file"
                  accept=".pdf,.docx,.zip,.txt,.py"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </label>
              <small>The demo stores the filename only.</small>
              <p role="status">{notice}</p>
              <button>Confirm submission</button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
export function Careers({ kind }: { kind: Opportunity["kind"] }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("All modes");
  const [onlySaved, setOnlySaved] = useState(false);
  const [detail, setDetail] = useState<string>();
  const [notice, setNotice] = useState("");
  const s = useDemo();
  const list = careers.list(kind);
  const item = list.find((o) => o.id === detail);
  const tracked = s.applications.filter((a) =>
    list.some((o) => o.id === a.opportunity),
  );
  const selectedApplication = tracked.find((a) => a.opportunity === item?.id);
  return (
    <>
      <Head
        title={kind === "placement" ? "Placement" : "Internships"}
        subtitle={
          kind === "placement"
            ? "Explore company drives, check eligibility, and track your application journey."
            : "Find and track internship opportunities for AIML students."
        }
      />
      <Stats
        items={[
          [
            kind === "placement" ? "Open drives" : "Open internships",
            list.filter((o) => o.deadline > new Date().toISOString()).length,
            "Applications open",
          ],
          [
            "Eligible roles",
            list.filter((o) => canApply(s.profile, o)).length,
            "Based on your profile",
          ],
          ["Applications", tracked.length, "This semester"],
          [
            kind === "placement" ? "Interview stages" : "Saved opportunities",
            kind === "placement"
              ? tracked.filter((a) => a.interview).length
              : list.filter((o) => s.saved.includes(o.id)).length,
            "In your workspace",
          ],
        ]}
      />
      <Card
        title={
          kind === "placement"
            ? "Recommended company drives"
            : "Available internships"
        }
        subtitle="Check the published eligibility criteria before applying."
      >
        {kind === "internship" && (
          <div className="actions">
            <label>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Work mode
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {["All modes", "Remote", "Hybrid", "On-site"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="option">
              <input
                type="checkbox"
                checked={onlySaved}
                onChange={(e) => setOnlySaved(e.target.checked)}
              />
              Saved only
            </label>
          </div>
        )}
        <Table
          headers={[
            "Company / role",
            "Eligibility",
            "Deadline",
            kind === "placement" ? "Package" : "Stipend",
            "Action",
          ]}
          rows={list
            .filter(
              (o) =>
                (!onlySaved || s.saved.includes(o.id)) &&
                (mode === "All modes" || o.mode === mode) &&
                (o.company + " " + o.role + " " + o.skills)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((o) => [
              <strong key={o.id}>
                {o.company} · {o.role}
              </strong>,
              <Badge
                key={o.id}
                tone={canApply(s.profile, o) ? "green" : "orange"}
              >
                {canApply(s.profile, o) ? "Eligible" : "Check profile"}
              </Badge>,
              date(o.deadline),
              o.pay,
              <button
                key={o.id}
                onClick={() => {
                  setNotice("");
                  setDetail(o.id);
                }}
              >
                {kind === "placement" ? "View drive" : "View internship"}
              </button>,
            ])}
        />
      </Card>
      <Card title="My application tracker">
        <Table
          headers={["Company", "Applied on", "Current stage", "Interview"]}
          rows={tracked.map((a) => [
            list.find((o) => o.id === a.opportunity)?.company,
            date(a.date),
            a.stage,
            a.interview ? date(a.interview) : "—",
          ])}
        />
      </Card>
      {item && (
        <Modal
          title={item.company + " · " + item.role}
          close={() => setDetail(undefined)}
        >
          <p>
            {item.duration} · {item.mode} · {item.pay}
          </p>
          <p>Required skills: {item.skills}</p>
          <p>
            Eligibility: CGPA {item.cgpa} or higher with zero active backlogs.
          </p>
          <p>Applications close {date(item.deadline)}.</p>
          <div className="actions">
            <button
              disabled={
                !!selectedApplication ||
                !canApply(s.profile, item) ||
                item.deadline < new Date().toISOString()
              }
              onClick={() => {
                try {
                  careers.apply(item.id);
                  setNotice("Application recorded.");
                } catch (e) {
                  setNotice(errorMessage(e));
                }
              }}
            >
              {selectedApplication
                ? "Application recorded"
                : "Submit application"}
            </button>
            {kind === "internship" && (
              <button
                className="secondary"
                onClick={() =>
                  s.update((d) => ({
                    saved: d.saved.includes(item.id)
                      ? d.saved.filter((id) => id !== item.id)
                      : [...d.saved, item.id],
                  }))
                }
              >
                {s.saved.includes(item.id)
                  ? "Remove saved opportunity"
                  : "Save opportunity"}
              </button>
            )}
          </div>
          <p role="status">{notice}</p>
        </Modal>
      )}
    </>
  );
}
const url = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS URL.")
  .or(z.literal(""));
const profileSchema = z.object({
  name: z.string().trim().min(2),
  usn: z.string().trim().min(4),
  email: z.string().email(),
  cgpa: z.number().min(0).max(10),
  backlogs: z.number().int().min(0),
  skills: z.string(),
  roles: z.string(),
  github: url,
  linkedin: url,
  portfolio: url,
  resume: z.string(),
});
export function Profile() {
  const s = useDemo();
  const [edit, setEdit] = useState(false);
  const [notice, setNotice] = useState("");
  const p = s.profile;
  const completeness = Math.round(
    (Object.values(p).filter((v) => v !== "" && v !== undefined).length /
      (Object.keys(p).filter((key) => key !== "photo").length + 1)) *
      100,
  );
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: p });
  return (
    <>
      <Head
        title="My profile"
        subtitle="Keep your academic details, skills, resume, and placement preferences up to date."
      />
      <Card>
        <div className="row">
          <div className="row">
            {p.photo ? (
              <img className="avatar" src={p.photo} alt={p.name} />
            ) : (
              <span className="avatar" aria-hidden="true">
                {p.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            )}
            <div>
              <h2>{p.name}</h2>
              <p>AIML · Year 3 · Semester 5 · Section {s.section}</p>
              <p>
                {p.usn} · {p.email}
              </p>
            </div>
          </div>
          <div className="stack">
            <Badge>Profile {completeness}%</Badge>
            <label>
              Demo profile photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    ) ||
                    !file.size ||
                    file.size > 350 * 1024
                  ) {
                    setNotice(
                      "Choose a PNG, JPEG, or WebP image up to 350 KB.",
                    );
                    return;
                  }
                  const reader = new FileReader();
                  reader.onerror = () =>
                    setNotice("Could not read that image.");
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      const photo = reader.result;
                      s.update((d) => ({ profile: { ...d.profile, photo } }));
                      setNotice("Demo photo saved locally.");
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {p.photo && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  s.update((d) => ({
                    profile: { ...d.profile, photo: undefined },
                  }))
                }
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </Card>
      <div className="split">
        <Card title="Academic information">
          <Table
            headers={["Department", "Academic year", "CGPA", "Backlogs"]}
            rows={[
              [
                "Artificial Intelligence and Machine Learning",
                "3rd Year",
                p.cgpa,
                p.backlogs,
              ],
            ]}
          />
        </Card>
        <Card title="Profile completeness">
          <progress
            value={completeness}
            max={100}
            aria-label="Profile completeness"
          />
          <div className="actions">
            <button
              onClick={() => {
                reset(p);
                setEdit(true);
              }}
            >
              Edit profile
            </button>
          </div>
        </Card>
      </div>
      <Card title="Skills & placement preferences">
        <div className="tags">
          {p.skills
            .split(",")
            .filter(Boolean)
            .map((x) => (
              <Badge key={x}>{x.trim()}</Badge>
            ))}
        </div>
        <h3>Preferred roles</h3>
        <p>{p.roles || "No roles selected."}</p>
        <div className="actions">
          {(["github", "linkedin", "portfolio"] as const).map(
            (k) =>
              p[k] && (
                <a key={k} href={p[k]} target="_blank" rel="noreferrer">
                  {k}
                </a>
              ),
          )}
        </div>
        <h3>Resume</h3>
        <p>{p.resume || "No resume uploaded."}</p>
        <label className="inline">
          Upload resume
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!validUpload(file) || !/\.(pdf|docx)$/i.test(file.name)) {
                setNotice("Choose a PDF or DOCX file up to 10 MB.");
                return;
              }
              s.update((d) => ({
                profile: { ...d.profile, resume: file.name },
              }));
              setNotice("Resume metadata saved.");
            }}
          />
        </label>
        <p role="status">{notice}</p>
      </Card>
      {edit && (
        <Modal title="Edit profile" close={() => setEdit(false)}>
          <form
            className="form-grid"
            onSubmit={handleSubmit((values) => {
              s.update((d) => ({ profile: { ...d.profile, ...values } }));
              setNotice("Profile saved.");
              setEdit(false);
            })}
          >
            {(
              [
                "name",
                "email",
                "skills",
                "roles",
                "github",
                "linkedin",
                "portfolio",
              ] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    name: "Name",
                    email: "Email",
                    skills: "Technical skills",
                    roles: "Preferred roles",
                    github: "GitHub URL",
                    linkedin: "LinkedIn URL",
                    portfolio: "Portfolio URL",
                  }[k]
                }
                <input
                  type={k === "email" ? "email" : "text"}

                  {...register(k)}
                />
                {errors[k] && <small role="alert">{errors[k]?.message}</small>}
              </label>
            ))}
            <button>Save profile</button>
          </form>
        </Modal>
      )}
    </>
  );
}
