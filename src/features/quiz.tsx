import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { assessments, errorMessage } from "../services/api";
import { activeAssessment, remainingSeconds } from "../services/domain";
import { questionSets, topics, horizon } from "../services/mock";
import { useDemo } from "../services/store";
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
export function Practice() {
  const navigate = useNavigate();
  const section = useDemo((s) => s.section);
  const attempts = useDemo((s) => s.attempts).filter((a) =>
    a.id.startsWith("practice-"),
  );
  const start = (name: string, index?: number) => {
    const id = "practice-" + crypto.randomUUID();
    const questions =
      index === undefined
        ? questionSets.flat().slice(0, name === "Daily challenge" ? 5 : 10)
        : questionSets[index];
    assessments.save({
      id,
      title: name,
      minutes: 10,
      section,
      opens: horizon(-1),
      closes: horizon(30),
      instructions:
        "Select one answer per question. Explanations appear after submission.",
      published: true,
      questions,
    });
    navigate("/student/quiz/" + id);
  };
  const solved = attempts.reduce((n, a) => n + a.total, 0);
  const correct = attempts.reduce((n, a) => n + a.score, 0);
  return (
    <>
      <Head
        title="Practice"
        subtitle="Build speed and accuracy with focused question sets."
      />
      <Stats
        items={[
          ["Questions solved", 428 + solved, "Lifetime demo activity"],
          [
            "Accuracy",
            Math.round(((325 + correct) / (428 + solved)) * 100) + "%",
            "Across practice sets",
          ],
          ["Time per question", "52 sec", "Baseline average"],
          ["Current streak", "6 days", "Keep it going"],
        ]}
      />
      <div className="split">
        <Card
          title="Choose a practice category"
          subtitle="Pick a topic to start a focused set"
        >
          <Bars
            rows={[0, 1, 2, 4].map((index, i) => ({
              label: i === 3 ? "Technical MCQs" : topics[index],
              note: [
                "Percentages, ratios, time & work",
                "Series, puzzles, arrangements",
                "Grammar, vocabulary, comprehension",
                "DBMS, OS, networks, OOP",
              ][i],
              value: [78, 64, 81, 58][i],
              end: (
                <button onClick={() => start(topics[index], index)}>
                  Practise
                </button>
              ),
            }))}
          />
        </Card>
        <Card title="Quick practice">
          <div className="stack">
            {["10 mixed questions", "Weak topics", "Daily challenge"].map(
              (name, i) => (
                <button
                  className="secondary align-left"
                  key={name}
                  onClick={() => start(name, i === 1 ? 3 : undefined)}
                >
                  {name}
                  <small>
                    {["10 min", "Coding fundamentals", "5 questions"][i]}
                  </small>
                </button>
              ),
            )}
          </div>
        </Card>
      </div>
      <Card title="Recent practice history">
        <Table
          headers={["Topic", "Attempted", "Accuracy", "Date", "Action"]}
          rows={attempts.map((a, i) => [
            a.title,
            a.total,
            Math.round((100 * a.score) / a.total) + "%",
            date(a.completed),
            <Link key={i} to={"/student/quiz/" + a.id}>
              Review
            </Link>,
          ])}
        />
      </Card>
    </>
  );
}
export function Assessments() {
  const section = useDemo((s) => s.section);
  const [detail, setDetail] = useState<string>();
  const all = useDemo((s) => s.assessments);
  const attempts = useDemo((s) => s.attempts).filter(
    (a) => !a.id.startsWith("practice-"),
  );
  const items = all.filter(
    (a) =>
      a.section === section &&
      a.published &&
      !a.id.startsWith("practice-") &&
      !attempts.some((r) => r.id === a.id),
  );
  const selected = items.find((a) => a.id === detail);
  const results = attempts.map((a) => Math.round((100 * a.score) / a.total));
  return (
    <>
      <Head
        title="Assessments"
        subtitle="Manage mock tests, upcoming exams, and your result history."
      />
      <Stats
        items={[
          ["Upcoming tests", items.length, "Published for Section " + section],
          ["Completed", attempts.length, "This semester"],
          [
            "Average score",
            results.length
              ? Math.round(results.reduce((a, b) => a + b) / results.length) +
                "%"
              : "—",
            "Completed assessments",
          ],
          [
            "Best score",
            results.length ? Math.max(...results) + "%" : "—",
            "Across attempts",
          ],
        ]}
      />
      <Card
        title="Upcoming assessments"
        subtitle="Read the instructions before you begin."
      >
        <Table
          headers={["Assessment", "Duration", "Questions", "Opens", "Status"]}
          rows={items.map((a) => [
            a.title,
            a.minutes + " min",
            a.questions.length,
            date(a.opens),
            <button
              key={a.id}
              className="secondary"
              onClick={() => setDetail(a.id)}
            >
              {activeAssessment(a)
                ? "Ready"
                : a.closes < new Date().toISOString()
                  ? "Closed"
                  : "Scheduled"}
            </button>,
          ])}
        />
      </Card>
      <Card title="Past results">
        <Table
          headers={["Test", "Score", "Accuracy", "Date", "Action"]}
          rows={attempts.map((a) => [
            a.title,
            a.score + " / " + a.total,
            Math.round((100 * a.score) / a.total) + "%",
            date(a.completed),
            <Link key={a.id} to={"/student/quiz/" + a.id}>
              View review
            </Link>,
          ])}
        />
      </Card>
      {selected && (
        <Modal title={selected.title} close={() => setDetail(undefined)}>
          <p>{selected.instructions}</p>
          <p>
            {selected.minutes} minutes · {selected.questions.length} questions ·
            Closes {date(selected.closes)}
          </p>
          {activeAssessment(selected) && (
            <Link className="button" to={"/student/quiz/" + selected.id}>
              Begin assessment
            </Link>
          )}
        </Modal>
      )}
    </>
  );
}
export function Quiz() {
  const section = useDemo((s) => s.section);
  const { id = "" } = useParams();
  const item = useDemo((s) => s.assessments.find((a) => a.id === id));
  const result = useDemo((s) => s.attempts.find((a) => a.id === id));
  const session = useDemo((s) => s.sessions[id]);
  const update = useDemo((s) => s.update);
  const [now, setNow] = useState(Date.now);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (
      !item ||
      result ||
      session ||
      !item.published ||
      item.section !== section ||
      !activeAssessment(item)
    )
      return;
    update((s) => ({
      sessions: {
        ...s.sessions,
        [id]: {
          id,
          deadline: Math.min(
            Date.now() + item.minutes * 60000,
            Date.parse(item.closes),
          ),
          answers: {},
          flagged: [],
          index: 0,
        },
      },
    }));
  }, [id, item, result, section, session, update]);
  const remaining = session ? remainingSeconds(session.deadline, now) : 0;
  useEffect(() => {
    if (!session || result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [session, result]);
  useEffect(() => {
    if (session && !result && remaining === 0) {
      try {
        assessments.complete(id, session.answers);
      } catch (e) {
        setError(errorMessage(e));
      }
    }
  }, [id, remaining, result, session]);
  const patch = (change: Partial<NonNullable<typeof session>>) =>
    update((s) => ({
      sessions: s.sessions[id]
        ? { ...s.sessions, [id]: { ...s.sessions[id], ...change } }
        : s.sessions,
    }));
  if (
    !item ||
    (!session &&
      !result &&
      (!item.published || item.section !== section || !activeAssessment(item)))
  )
    return (
      <Card title="Assessment unavailable">
        <Link to="/student/assessments">Return to assessments</Link>
      </Card>
    );
  if (result)
    return (
      <>
        <Head title={item.title} subtitle="Result summary and answer review" />
        <Stats
          items={[
            ["Score", result.score + " / " + result.total, "Correct answers"],
            [
              "Accuracy",
              Math.round((100 * result.score) / result.total) + "%",
              "Final result",
            ],
          ]}
        />
        {item.questions.map((q, i) => (
          <Card key={i} title={q.prompt}>
            <p>Your answer: {q.options[result.answers[i]] ?? "Unanswered"}</p>
            <p>Correct answer: {q.options[q.correct]}</p>
            <p>{q.explanation}</p>
          </Card>
        ))}
        <Link
          to={
            id.startsWith("practice-")
              ? "/student/practice"
              : "/student/assessments"
          }
        >
          Return to {id.startsWith("practice-") ? "practice" : "assessments"}
        </Link>
      </>
    );
  if (!session) return <p role="status">Starting assessment…</p>;
  const q = item.questions[session.index];
  return (
    <>
      <Head title={item.title} subtitle={item.instructions} />
      <div className="split">
        <Card
          title={q.prompt}
          subtitle={
            "Question " + (session.index + 1) + " of " + item.questions.length
          }
        >
          <fieldset className="stack">
            <legend className="sr-only">Choose one answer</legend>
            {q.options.map((o, i) => (
              <label className="option" key={i}>
                <input
                  type="radio"
                  name={"q" + session.index}
                  checked={session.answers[session.index] === i}
                  onChange={() =>
                    patch({
                      answers: { ...session.answers, [session.index]: i },
                    })
                  }
                />
                {o}
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button
              className="secondary"
              disabled={!session.index}
              onClick={() => patch({ index: session.index - 1 })}
            >
              Previous
            </button>
            <button
              className="secondary"
              onClick={() =>
                patch({
                  flagged: session.flagged.includes(session.index)
                    ? session.flagged.filter((i) => i !== session.index)
                    : [...session.flagged, session.index],
                })
              }
            >
              {session.flagged.includes(session.index)
                ? "Remove review flag"
                : "Mark for review"}
            </button>
            <button
              disabled={session.index === item.questions.length - 1}
              onClick={() => patch({ index: session.index + 1 })}
            >
              Next
            </button>
          </div>
        </Card>
        <Card title="Question navigation">
          <Badge>
            Time left {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </Badge>
          <div className="actions">
            {item.questions.map((_, i) => (
              <button
                key={i}
                className={i === session.index ? "" : "secondary"}
                aria-current={i === session.index ? "step" : undefined}
                aria-label={
                  "Question " +
                  (i + 1) +
                  (session.flagged.includes(i) ? ", flagged" : "") +
                  (i in session.answers ? ", answered" : "")
                }
                onClick={() => patch({ index: i })}
              >
                {i + 1}
                {session.flagged.includes(i)
                  ? " ★"
                  : i in session.answers
                    ? " ✓"
                    : ""}
              </button>
            ))}
          </div>
          <button onClick={() => setConfirm(true)}>Submit answers</button>
        </Card>
      </div>
      {error && <p role="alert">{error}</p>}
      {confirm && (
        <Modal title="Submit answers?" close={() => setConfirm(false)}>
          <p>
            {Object.keys(session.answers).length} of {item.questions.length}{" "}
            questions answered.
          </p>
          <button
            onClick={() => {
              try {
                assessments.complete(id, session.answers);
                setConfirm(false);
              } catch (e) {
                setError(errorMessage(e));
                setConfirm(false);
              }
            }}
          >
            Confirm submission
          </button>
        </Modal>
      )}
    </>
  );
}
