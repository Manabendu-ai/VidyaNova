import { auth } from "./services/api";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Code2,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthControls, Admin } from "./features/auth";
import {
  Dashboard,
  Academics,
  Careers,
  Learning,
  Profile,
  Progress,
  StudentAssignments,
} from "./features/student";
import { Assessments, Practice, Quiz } from "./features/quiz";
import {
  FacultyDashboard,
  FacultyMarks,
  FacultyAssignments,
  FacultyQuizzes,
  Preparation,
  Insights,
} from "./features/faculty";
import { useDemo } from "./services/store";
import type { Role } from "./services/domain";
import "./style.css";
const Coding = lazy(() =>
  import("./features/coding").then((module) => ({ default: module.Coding })),
);
const names: Record<Role, [string, string, LucideIcon][]> = {
  student: [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["learning", "My learning path", BookOpen],
    ["practice", "Practice", Target],
    ["assessments", "Assessments", ClipboardList],
    ["coding", "Coding lab", Code2],
    ["progress", "My progress", TrendingUp],
    ["placement", "Placement", BriefcaseBusiness],
    ["profile", "Profile", UserRound],
    ["academics", "Academic marks", GraduationCap],
    ["assignments", "Assignments", FileCheck],
    ["internships", "Internships", Building2],
  ],
  faculty: [
    ["dashboard", "Overview", LayoutDashboard],
    ["preparation", "Placement prep", Target],
    ["quizzes", "Mock tests", ListChecks],
    ["marks", "Academic marks", GraduationCap],
    ["assignments", "Assignments", FileCheck],
    ["insights", "Student insights", Users],
  ],
  administrator: [["dashboard", "Overview", Settings]],
};
const entry = (role: Role) =>
  "/" + role + "/" + (role === "student" ? "learning" : "dashboard");
function Entry() {
  const role = useDemo((s) => s.role);
  return role ? <Navigate to={entry(role)} replace /> : <AuthControls />;
}
function Shell({ role }: { role: Role }) {
  const active = useDemo((s) => s.role);
  const saveError = useDemo((s) => s.saveError);
  const [collapsed, setCollapsed] = useState(false);
  const [opened, setOpened] = useState(false);
  const { pathname } = useLocation();
  if (!active) return <Navigate to="/" replace />;
  if (active !== role) return <Navigate to={entry(active)} replace />;
  return (
    <div
      className={
        "shell " + (collapsed ? "collapsed " : "") + (opened ? "opened" : "")
      }
    >
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside>
        <div className="brand">
          {import.meta.env.VITE_BRAND_LOGO_URL && (
            <img src={import.meta.env.VITE_BRAND_LOGO_URL} alt="" />
          )}
          <strong>VidyaNova</strong>
          <button
            className="icon-button desktop-menu"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        </div>
        <nav aria-label={role + " navigation"}>
          {names[role].map(([id, name, Icon]) => (
            <NavLink
              key={id}
              to={"/" + role + "/" + id}
              title={name}
              onClick={() => setOpened(false)}
            >
              {role === "student" ? (
                <span className="nav-dot" />
              ) : (
                <Icon size={15} />
              )}
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <AuthControls compact />
        </div>
      </aside>
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        aria-expanded={opened}
        onClick={() => setOpened(!opened)}
      >
        <Menu size={20} />
      </button>
      <main key={pathname} id="content" tabIndex={-1}>
        {saveError && <p role="alert">Save failed. {saveError}</p>}
        <Suspense
          fallback={
            <div className="skeleton" role="status">
              Loading workspace…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function App() {
  const ready = useDemo((s) => s.ready);
  useEffect(() => {
    void auth.restore();
  }, []);
  if (!ready)
    return (
      <main>
        <p role="status">Checking session…</p>
      </main>
    );
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="student" element={<Shell role="student" />}>
            <Route index element={<Navigate to="learning" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="learning" element={<Learning />} />
            <Route path="practice" element={<Practice />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="quiz/:id" element={<Quiz />} />
            <Route path="coding" element={<Coding />} />
            <Route path="progress" element={<Progress />} />
            <Route path="placement" element={<Careers kind="placement" />} />
            <Route path="internships" element={<Careers kind="internship" />} />
            <Route path="profile" element={<Profile />} />
            <Route path="academics" element={<Academics />} />
            <Route path="assignments" element={<StudentAssignments />} />
          </Route>
          <Route path="faculty" element={<Shell role="faculty" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="preparation" element={<Preparation />} />
            <Route path="quizzes" element={<FacultyQuizzes />} />
            <Route path="marks" element={<FacultyMarks />} />
            <Route path="assignments" element={<FacultyAssignments />} />
            <Route path="insights" element={<Insights />} />
          </Route>
          <Route path="administrator" element={<Shell role="administrator" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
