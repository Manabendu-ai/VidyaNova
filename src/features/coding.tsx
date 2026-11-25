import { useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { Badge, Card, Head } from "../components/ui";
import { errorMessage, judge } from "../services/api";
import { problems } from "../services/mock";
import { useDemo } from "../services/store";
Object.assign(globalThis, {
  MonacoEnvironment: { getWorker: () => new EditorWorker() },
});
loader.config({ monaco });
const languages = [
  { name: "Python", mode: "python", file: "main.py" },
  { name: "C", mode: "c", file: "main.c" },
  { name: "C++", mode: "cpp", file: "main.cpp" },
  { name: "Java", mode: "java", file: "Main.java" },
  { name: "JavaScript", mode: "javascript", file: "main.js" },
];
function starter(fn: string, lang: string, args: string) {
  switch (lang) {
    case "Python":
      return `def ${fn}(${args}):\n    # Write your solution here\n    pass\n`;
    case "JavaScript":
      return `function ${fn}(${args}) {\n  // TODO: Write your solution here\n}\n`;
    case "Java":
      return "class Main {\n    // TODO: Write your solution here\n}\n";
    default:
      return "// TODO: Write your solution here\n";
  }
}
export function Coding() {
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    passed: number;
    total: number;
    output: string;
    submit: boolean;
  }>();
  const [error, setError] = useState("");
  const update = useDemo((s) => s.update);
  const problem = problems[index];
  const lang = languages[language];
  const key = problem.id + ":" + lang.name;
  const draft = useDemo((s) => s.drafts[key]);
  const code =
    draft ??
    starter(
      problem.fn,
      lang.name,
      index === 0 ? "nums, target" : index === 1 ? "nums" : "text",
    );
  const run = async (submit: boolean) => {
    setBusy(true);
    setError("");
    try {
      const result = await judge.evaluate({
        problemId: problem.id,
        language: lang.name,
        code,
        submit,
      });
      setResult({ ...result, submit });
      if (submit) update((s) => ({ codingRuns: s.codingRuns + 1 }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Head
        title="Coding lab"
        subtitle="Practise programming problems, run test cases, and track submissions."
      />
      <Card>
        <div className="row">
          <div>
            <h2>
              Problem {String(index + 1).padStart(2, "0")} · {problem.topic}
            </h2>
            <p>
              {problem.title} · {problem.difficulty} · 20 points
            </p>
          </div>
          <label className="inline">
            Problem
            <select
              disabled={busy}
              aria-label="Problem"
              value={index}
              onChange={(e) => {
                setIndex(+e.target.value);
                setResult(undefined);
                setError("");
              }}
            >
              {problems.map((p, i) => (
                <option value={i} key={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="coding">
          <section className="problem">
            <h3>Problem statement</h3>
            <p>{problem.description}</p>
            <h3>Example</h3>
            <pre>
              Input: {problem.input}
              {"\n"}Output: {problem.output}
            </pre>
            <h3>Constraints</h3>
            <p>{problem.constraints}</p>
          </section>
          <div>
            <label className="inline">
              Language
              <select
                disabled={busy}
                aria-label="Language"
                value={language}
                onChange={(e) => {
                  setLanguage(+e.target.value);
                  setResult(undefined);
                  setError("");
                }}
              >
                {languages.map((l, i) => (
                  <option value={i} key={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="editor">
              <div>
                {lang.file} | {lang.name}
              </div>
              <Editor
                height="235px"
                theme="vs-dark"
                path={key + "/" + lang.file}
                language={lang.mode}
                value={code}
                onChange={(value) =>
                  update((s) => ({
                    drafts: { ...s.drafts, [key]: value ?? "" },
                  }))
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  ariaLabel: "Solution editor",
                  automaticLayout: true,
                }}
              />
            </div>
            <div className="row">
              <small>
                {draft === undefined
                  ? "Starter code"
                  : "Autosaved · Draft solution"}
              </small>
              <div className="actions">
                <button disabled={busy} onClick={() => void run(false)}>
                  Run code
                </button>
                <button disabled={busy} onClick={() => void run(true)}>
                  Submit
                </button>
              </div>
            </div>
            <section className="test-panel">
              <div className="row">
                <h3>Test cases</h3>
                <Badge tone={result?.passed === 5 ? "green" : "orange"}>
                  {result?.passed ?? 0} / 5 passed
                </Badge>
              </div>
              <small>Simulated evaluation</small>
              {error && <p role="alert">{error}</p>}
              <p role="status">
                {busy
                  ? "Evaluating…"
                  : (result?.output ??
                    "Run your solution to see demo test-case feedback.")}
              </p>
              {result && (
                <div className="actions">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Badge
                      key={i}
                      tone={i < result.passed ? "green" : "orange"}
                    >
                      Case {i + 1} {i < result.passed ? "passed" : "failed"}
                    </Badge>
                  ))}
                </div>
              )}
              {result?.submit && <strong>Submission recorded</strong>}
            </section>
          </div>
        </div>
      </Card>
    </>
  );
}
