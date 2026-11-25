import { useState } from "react";
import { Badge, Card, Head, Stats, Table } from "../components/ui";
import { auth } from "../services/api";
import type { Role } from "../services/domain";
import { students, subjects } from "../services/mock";
import { useDemo } from "../services/store";
const roles: Role[] = ["student", "faculty", "administrator"];
const label = (role: Role) => role[0].toUpperCase() + role.slice(1);
export function AuthControls({ compact = false }: { compact?: boolean }) {
  const accountId = useDemo((s) => s.accountId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The server could not complete the request.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (compact)
    return (
      <>
        <small className="signed-in-id">{accountId}</small>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void submit(() => auth.signOut())}
        >
          Sign out
        </button>
        {error && <div role="alert">{error}</div>}
      </>
    );
  return (
    <main className="login">
      <Card>
        <div className="login-brand">
          {import.meta.env.VITE_BRAND_LOGO_URL && (
            <img src={import.meta.env.VITE_BRAND_LOGO_URL} alt="" />
          )}
          <strong>VidyaNova</strong>
        </div>
        <h1>Sign in</h1>
        <p>AIML academic and placement workspace</p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void submit(() =>
              auth.signIn(String(form.get("id")), String(form.get("password"))),
            );
          }}
        >
          <label>
            USN or staff ID
            <input
              name="id"
              autoComplete="username"
              required
              maxLength={24}
              spellCheck={false}
            />
          </label>
          <label>
            Date of birth
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="YYYY-MM-DD"
              required
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
              aria-describedby="dob-format"
            />
          </label>
          <small id="dob-format">Use YYYY-MM-DD.</small>
          {error && <p role="alert">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </Card>
    </main>
  );
}
export function Admin() {
  return (
    <>
      <Head
        title="Administration"
        subtitle="Review academic configuration and demonstration access."
        role="Administrator workspace"
      />
      <Stats
        items={[
          ["Department", "AIML", "Demo configuration"],
          ["Students", students.length, "Demo roster"],
          ["Academic subjects", subjects.length, "Configured"],
        ]}
      />
      <Card title="Role access">
        <Table
          headers={["Role", "Workspace", "Access"]}
          rows={roles.map((r) => [
            label(r),
            r === "student"
              ? "Learning and career"
              : r === "faculty"
                ? "Academic management"
                : "Configuration overview",
            <Badge key={r}>Demo</Badge>,
          ])}
        />
      </Card>
      <Card title="Academic configuration">
        <Table
          headers={["Subject", "Department"]}
          rows={subjects.map((s) => [s, "AIML"])}
        />
        <p>
          User management, department editing and production access controls are
          future functionality.
        </p>
      </Card>
    </>
  );
}
