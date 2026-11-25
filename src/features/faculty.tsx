import { studentDirectory } from "../services/accounts";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
import { academics, assessments, assignments } from "../services/api";
import { markTotal, stageNames, validUpload } from "../services/domain";
import type { Assignment, Mark, Question } from "../services/domain";
import { opportunities, subjects, topics } from "../services/mock";
import { useDemo } from "../services/store";
const faculty = "Faculty Profile";
const fields = [
  ["internal", 40],
  ["quiz", 20],
  ["assignment", 20],
  ["lab", 20],
] as const;
export function FacultyDashboard() {
  const s = useDemo();
  const published = s.assessments.filter(
    (a) => a.published && !a.id.startsWith("practice-"),
  );
  const results = s.attempts.filter((a) => !a.id.startsWith("practice-"));
  const mean = results.length
    ? Math.round(
        (100 * results.reduce((n, a) => n + a.score / a.total, 0)) /
          results.length,
      ) + "%"
    : "74%";
  return (
    <>
      <Head
        title="Placement readiness"
        subtitle="Track placement readiness, assessment performance and student progress."
        role={faculty}
      />
      <Stats
        items={[
          ["Placement cohort", 486, "Demo cohort"],
          ["Placement tests", published.length, "Published"],
          [
            "Avg. score",
            mean,
            results.length ? "Student results" : "Baseline cohort",
          ],
          [
            "Completion",
            results.length
              ? Math.round(
                  (100 * new Set(results.map((r) => r.id)).size) /
                    Math.max(published.length, 1),
                ) + "%"
              : "86%",
            "Across active tests",
          ],
        ]}
      />
      <div className="split">
        <Card title="Class skill performance">
          <Bars
            rows={topics
              .slice(0, 4)
              .map((label, i) => ({ label, value: [78, 66, 82, 58][i] }))}
          />
        </Card>
        <Card title="Recommended actions">
          <ol className="recommendations">
            <li>
              <Link to="/faculty/insights">Review coding gaps at 58%</Link>
            </li>
            <li>
              <Link to="/faculty/preparation">
                Assign loops and arrays drills
              </Link>
            </li>
            <li>
              <Link to="/faculty/quizzes">Schedule an aptitude mock</Link>
            </li>
          </ol>
        </Card>
      </div>
      <Card title="Recent activity">
        <Table
          headers={["Activity", "Group", "Status"]}
          rows={published.slice(0, 5).map((a) => [
            a.title,
            "AIML · Section " + a.section,
            <Badge key={a.id} tone="green">
              Published
            </Badge>,
          ])}
        />
      </Card>
    </>
  );
}
export function FacultyMarks() {
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState(subjects[0]);
  const [draft, setDraft] = useState<Record<string, Mark>>({});
  const [notice, setNotice] = useState("");
  const marks = useDemo((s) => s.marks);
  const roster = studentDirectory
    .filter((student) => student.section === section)
    .map((student) => student.name);
  const rows = roster.map(
    (student) =>
      draft[student] ??
      marks.find(
        (m) =>
          m.semester === semester &&
          m.section === section &&
          m.subject === subject &&
          m.student === student,
      ) ?? {
        student,
        semester,
        section,
        subject,
        internal: 0,
        quiz: 0,
        assignment: 0,
        lab: 0,
        published: false,
      },
  );
  const save = (publish: boolean) => {
    if (
      rows.some((row) =>
        fields.some(
          ([k, max]) => !Number.isInteger(row[k]) || row[k] < 0 || row[k] > max,
        ),
      )
    ) {
      setNotice("Enter whole numbers within the listed limits.");
      return;
    }
    const isMatch = (m: Mark) =>
      m.semester === semester && m.section === section && m.subject === subject;
    if (publish) {
      academics.save([
        ...marks.filter((m) => !isMatch(m)),
        ...rows.map((r) => ({ ...r, published: true })),
      ]);
      localStorage.removeItem("marks:" + semester + section + subject);
    } else
      localStorage.setItem(
        "marks:" + semester + section + subject,
        JSON.stringify(Object.fromEntries(rows.map((r) => [r.student, r]))),
      );
    setNotice(
      publish
        ? "Marks published to the student portal."
        : "Draft saved locally.",
    );
  };
  const load = (sem: number, group: string, sub: string) => {
    setSemester(sem);
    setSection(group);
    setSubject(sub);
    try {
      setDraft(
        JSON.parse(localStorage.getItem("marks:" + sem + group + sub) ?? "{}"),
      );
    } catch {
      setDraft({});
    }
    setNotice("");
  };
  return (
    <>
      <Head
        title="Academic marks management"
        subtitle="Review, update and publish subject marks by semester and section."
        role={faculty}
      />
      <Card title="Marks register">
        <div className="actions">
          <label>
            Semester
            <select
              value={semester}
              onChange={(e) => load(+e.target.value, section, subject)}
            >
              {[3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              value={section}
              onChange={(e) => load(semester, e.target.value, subject)}
            >
              <option>A</option>
              <option>B</option>
            </select>
          </label>
          <label>
            Subject
            <select
              value={subject}
              onChange={(e) => load(semester, section, e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="secondary"
            onClick={() => load(semester, section, subject)}
          >
            Reload saved draft
          </button>
        </div>
        <Table
          headers={[
            "Student",
            ...fields.map(([name, max]) => name + " / " + max),
            "Total / 100",
          ]}
          rows={rows.map((r) => [
            r.student,
            ...fields.map(([k, max]) => (
              <input
                key={k}
                className="mark-input"
                aria-label={r.student + " " + k}
                type="number"
                min={0}
                max={max}
                value={Number.isNaN(r[k]) ? "" : r[k]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [r.student]: { ...r, [k]: e.target.valueAsNumber },
                  }))
                }
              />
            )),
            markTotal(r),
          ])}
        />
        <div className="actions">
          <button className="secondary" onClick={() => save(false)}>
            Save draft
          </button>
          <button onClick={() => save(true)}>Publish marks</button>
        </div>
        <p role="status">{notice}</p>
      </Card>
      <Card title="Subject performance">
        <Bars
          rows={rows.map((r) => ({
            label: r.student,
            value: markTotal(r) || 0,
          }))}
        />
      </Card>
    </>
  );
}
export function FacultyAssignments() {
  const all = useDemo((s) => s.assignments);
  const submissions = useDemo((s) => s.studentSubmissions);
  const update = useDemo((s) => s.update);
  const [selected, setSelected] = useState<{
    assignment: string;
    student: string;
  }>();
  const [notice, setNotice] = useState("");
  const active = submissions.find(
    (a) => a.id === selected?.assignment && a.studentId === selected.student,
  );
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const value = (k: string) => String(d.get(k) ?? "").trim();
    const file = d.get("reference");
    if (file instanceof File && file.size && !validUpload(file)) {
      setNotice("Choose a supported reference file up to 10 MB.");
      return;
    }
    if (!value("title") || !value("instructions")) {
      setNotice("Enter a title and instructions.");
      return;
    }
    const deadline = new Date(value("deadline"));
    if (!(deadline.getTime() > Date.now())) {
      setNotice("Enter a future deadline.");
      return;
    }
    const record: Assignment = {
      id: crypto.randomUUID(),
      title: value("title"),
      subject: value("subject"),
      section: value("section"),
      max: Number(value("max")),
      deadline: deadline.toISOString(),
      instructions: value("instructions"),
      reference: file instanceof File && file.size ? file.name : undefined,
      published: true,
    };
    assignments.save(record);
    form.reset();
    setNotice("Assignment published.");
  };
  return (
    <>
      <Head
        title="Assignment management"
        subtitle="Publish coursework and evaluate submitted work."
        role={faculty}
      />
      <Card title="Create assignment">
        <form className="form-grid" onSubmit={save}>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Subject
            <select name="subject">
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select name="section">
              <option>A</option>
              <option>B</option>
            </select>
          </label>
          <label>
            Deadline
            <input name="deadline" type="datetime-local" required />
          </label>
          <label>
            Maximum marks
            <input
              name="max"
              type="number"
              required
              min="1"
              max="100"
              defaultValue="20"
            />
          </label>
          <label>
            Reference material
            <input
              name="reference"
              type="file"
              accept=".pdf,.docx,.zip,.txt,.py"
            />
          </label>
          <label className="wide">
            Instructions
            <textarea name="instructions" required />
          </label>
          <button>Publish assignment</button>
        </form>
        <p role="status">{notice}</p>
      </Card>
      <Card title="Published assignments">
        <Table
          headers={["Assignment", "Subject", "Group", "Deadline", "Submission"]}
          rows={all.map((a) => [
            a.title,
            a.subject,
            a.section,
            date(a.deadline),
            submissions.filter((row) => row.id === a.id).length,
          ])}
        />
      </Card>
      <Card title="Student submissions">
        <Table
          headers={["Student", "Assignment", "File", "Action"]}
          rows={submissions.map((row) => [
            row.studentName + " · " + row.studentId,
            row.title,
            row.submission,
            <button
              key={row.id + row.studentId}
              className="secondary"
              onClick={() =>
                setSelected({ assignment: row.id, student: row.studentId })
              }
            >
              {row.mark === undefined ? "Evaluate" : "Edit evaluation"}
            </button>,
          ])}
        />
      </Card>
      {active && (
        <Modal title={active.title} close={() => setSelected(undefined)}>
          <p>
            {active.studentName} · {active.submission}
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              update((state) => ({
                studentSubmissions: state.studentSubmissions.map((row) =>
                  row.id === active.id && row.studentId === active.studentId
                    ? {
                        ...row,
                        mark: Number(data.get("mark")),
                        feedback: String(data.get("feedback")).trim(),
                      }
                    : row,
                ),
              }));
              setSelected(undefined);
              setNotice("Evaluation saved.");
            }}
          >
            <label>
              Marks out of {active.max}
              <input
                name="mark"
                type="number"
                defaultValue={active.mark}
                required
                min="0"
                max={active.max}
              />
            </label>
            <label>
              Feedback
              <textarea
                name="feedback"
                required
                defaultValue={active.feedback}
              />
            </label>
            <button>Save evaluation</button>
          </form>
        </Modal>
      )}
    </>
  );
}
const emptyQuestion = (): Question => ({
  prompt: "",
  options: ["", "", "", ""],
  correct: 0,
  explanation: "",
  points: 1,
});
export function FacultyQuizzes() {
  const all = useDemo((s) => s.assessments).filter(
    (a) => !a.id.startsWith("practice-"),
  );
  const results = useDemo((s) => s.attempts).filter(
    (a) => !a.id.startsWith("practice-"),
  );
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [notice, setNotice] = useState("");
  const patch = (i: number, change: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...change } : q)));
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const get = (k: string) => String(d.get(k) ?? "").trim();
    const opens = new Date(get("opens"));
    const closes = new Date(get("closes"));
    if (!(opens < closes) || closes.getTime() <= Date.now()) {
      setNotice("Set a closing time in the future and after the opening time.");
      return;
    }
    if (
      !get("title") ||
      !get("instructions") ||
      questions.some(
        (q) =>
          !q.prompt.trim() ||
          !q.explanation.trim() ||
          q.options.some((o) => !o.trim()) ||
          new Set(q.options.map((o) => o.trim())).size !== q.options.length,
      )
    ) {
      setNotice(
        "Provide a title, instructions, and unique answer options and explanations.",
      );
      return;
    }
    const published =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "publish";
    assessments.save({
      id: crypto.randomUUID(),
      title: get("title"),
      instructions: get("instructions"),
      opens: opens.toISOString(),
      closes: closes.toISOString(),
      minutes: Number(get("minutes")),
      section: get("section"),
      questions,
      published,
    });
    form.reset();
    setQuestions([emptyQuestion()]);
    setNotice(
      published ? "Assessment published." : "Assessment saved as a draft.",
    );
  };
  return (
    <>
      <Head
        title="Quiz & assessment management"
        subtitle="Build, schedule and publish academic quizzes and placement mock tests."
        role={faculty}
      />
      <Card title="New assessment">
        <form className="form-grid" onSubmit={save}>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Duration in minutes
            <input
              name="minutes"
              required
              type="number"
              min="1"
              max="180"
              defaultValue="10"
            />
          </label>
          <label>
            Eligible section
            <select name="section">
              <option>A</option>
              <option>B</option>
            </select>
          </label>
          <label>
            Opens
            <input type="datetime-local" name="opens" required />
          </label>
          <label>
            Closes
            <input type="datetime-local" name="closes" required />
          </label>
          <label className="wide">
            Instructions
            <textarea name="instructions" required />
          </label>
          {questions.map((q, i) => (
            <fieldset key={i} className="question-builder wide form-grid">
              <legend>Question {i + 1}</legend>
              <label className="wide">
                Prompt
                <input
                  value={q.prompt}
                  onChange={(e) => patch(i, { prompt: e.target.value })}
                  required
                />
              </label>
              {q.options.map((o, j) => (
                <label key={j}>
                  Option {j + 1}
                  <input
                    value={o}
                    onChange={(e) =>
                      patch(i, {
                        options: q.options.map((x, k) =>
                          k === j ? e.target.value : x,
                        ),
                      })
                    }
                    required
                  />
                </label>
              ))}
              <label>
                Correct option
                <select
                  value={q.correct}
                  onChange={(e) => patch(i, { correct: +e.target.value })}
                >
                  {q.options.map((_, j) => (
                    <option value={j} key={j}>
                      {j + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Explanation
                <input
                  value={q.explanation}
                  onChange={(e) => patch(i, { explanation: e.target.value })}
                  required
                />
              </label>
              <label>
                Marks
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={q.points ?? 1}
                  onChange={(e) =>
                    patch(i, { points: e.target.valueAsNumber || undefined })
                  }
                />
              </label>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setQuestions((qs) => qs.filter((_, j) => i !== j))
                  }
                >
                  Remove question
                </button>
              )}
            </fieldset>
          ))}
          <div className="actions wide">
            <button
              type="button"
              className="secondary"
              onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
            >
              Add question
            </button>
            <button className="secondary" value="draft">
              Save draft
            </button>
            <button value="publish">Publish assessment</button>
          </div>
        </form>
        <p role="status">{notice}</p>
      </Card>
      <Card title="Assessment register">
        <Table
          headers={[
            "Assessment",
            "Section",
            "Opens",
            "Status",
            "Results",
            "Action",
          ]}
          rows={all.map((a) => [
            a.title,
            a.section,
            date(a.opens),
            a.published ? "Published" : "Draft",
            results
              .filter((r) => r.id === a.id)
              .map((r) => r.score + " / " + r.total)
              .join(", ") || "—",
            !a.published ? (
              <button
                key={a.id}
                disabled={a.closes < new Date().toISOString()}
                onClick={() => {
                  assessments.save({ ...a, published: true });
                  setNotice("Assessment published.");
                }}
              >
                Publish draft
              </button>
            ) : (
              "—"
            ),
          ])}
        />
      </Card>
    </>
  );
}
export function Preparation() {
  const s = useDemo();
  const [notice, setNotice] = useState("");
  return (
    <>
      <Head
        title="Placement preparation"
        subtitle="Assign activities, schedule mock tests and monitor recruitment stages."
        role={faculty}
      />
      <div className="equal">
        <Card title="Recommend an activity">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const title = String(data.get("activity")).trim();
              if (!title) return;
              s.update((d) => ({
                recommendations: [
                  ...new Set([
                    ...d.recommendations,
                    String(data.get("category")) + ": " + title,
                  ]),
                ],
              }));
              form.reset();
              setNotice("Activity added to the student learning path.");
            }}
          >
            <label>
              Activity type
              <select name="category">
                <option>Aptitude practice</option>
                <option>Coding drill</option>
                <option>Learning activity</option>
              </select>
            </label>
            <label>
              Activity
              <input name="activity" required />
            </label>
            <button>Assign to Section A</button>
          </form>
          <p role="status">{notice}</p>
          <Link to="/faculty/quizzes">Schedule a mock test</Link>
        </Card>
        <Card title="Cohort skill performance">
          <Bars
            rows={topics
              .slice(0, 4)
              .map((label, i) => ({ label, value: [78, 66, 82, 58][i] }))}
          />
        </Card>
      </div>
      <Card title="Assigned preparation">
        <Table
          headers={["Activity", "Group"]}
          rows={s.recommendations.map((n) => [n, "AIML · Section A"])}
        />
      </Card>
      <Card title="Recruitment stages">
        <Table
          headers={["Student", "Company", "Role", "Stage", "Interview date"]}
          rows={s.applications.map((a) => {
            const o = opportunities.find((o) => o.id === a.opportunity);
            return [
              a.studentName,
              o?.company,
              o?.role,
              <select
                key={a.studentId + a.opportunity}
                aria-label={o?.company + " stage"}
                value={a.stage}
                onChange={(e) => {
                  const stage = stageNames.find((x) => x === e.target.value);
                  if (stage)
                    s.update((d) => ({
                      applications: d.applications.map((x) =>
                        x.opportunity === a.opportunity &&
                        x.studentId === a.studentId
                          ? { ...x, stage }
                          : x,
                      ),
                    }));
                }}
              >
                {stageNames.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>,
              <input
                key={"date" + a.studentId + a.opportunity}
                aria-label={o?.company + " interview date"}
                type="date"
                value={a.interview?.slice(0, 10) ?? ""}
                onChange={(e) => {
                  const interview = e.target.value
                    ? new Date(e.target.value + "T12:00:00").toISOString()
                    : undefined;
                  s.update((d) => ({
                    applications: d.applications.map((x) =>
                      x.opportunity === a.opportunity &&
                      x.studentId === a.studentId
                        ? { ...x, interview }
                        : x,
                    ),
                  }));
                }}
              />,
            ];
          })}
        />
      </Card>
    </>
  );
}
export function Insights() {
  const s = useDemo();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");
  const [semester, setSemester] = useState(5);
  const rows = s.marks.filter(
    (m) =>
      m.published &&
      m.semester === semester &&
      (section === "All" || m.section === section) &&
      m.student.toLowerCase().includes(query.toLowerCase()),
  );
  const names = [...new Set(rows.map((m) => m.student))];
  const studentAssignments = s.studentSubmissions.filter((a) =>
    names.includes(a.studentName),
  );
  return (
    <>
      <Head
        title="Student insights"
        subtitle="Review individual and class performance by semester and section."
        role={faculty}
      />
      <Card title="Academic overview">
        <div className="actions">
          <label>
            Search student
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label>
            Section
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option>All</option>
              <option>A</option>
              <option>B</option>
            </select>
          </label>
          <label>
            Semester
            <select
              value={semester}
              onChange={(e) => setSemester(+e.target.value)}
            >
              {[3, 4, 5].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <Table
          headers={["Student", "Section", "Subjects", "Average marks"]}
          rows={names.map((name) => {
            const student = rows.filter((m) => m.student === name);
            return [
              name,
              student[0].section,
              student.length,
              Math.round(
                student.reduce((n, m) => n + markTotal(m), 0) / student.length,
              ) + "%",
            ];
          })}
        />
      </Card>
      <div className="equal">
        <Card title="Subject averages">
          <Bars
            rows={subjects.flatMap((label) => {
              const subject = rows.filter((m) => m.subject === label);
              return subject.length
                ? [
                    {
                      label,
                      value: Math.round(
                        subject.reduce((n, m) => n + markTotal(m), 0) /
                          subject.length,
                      ),
                    },
                  ]
                : [];
            })}
          />
        </Card>
        <Card title="Assessments and assignments">
          <p>
            {studentAssignments.length} assignment submissions for this roster.
          </p>
          <Table
            headers={["Assessment", "Result"]}
            rows={s.attempts
              .filter((a) => !a.id.startsWith("practice-"))
              .map((a) => [a.title, a.score + " / " + a.total])}
          />
        </Card>
      </div>
    </>
  );
}
