export type Role = "student" | "faculty" | "administrator";
export type Question = {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  points?: number;
};
export type Assessment = {
  id: string;
  title: string;
  minutes: number;
  opens: string;
  closes: string;
  section: string;
  instructions: string;
  published: boolean;
  questions: Question[];
};
export type Assignment = {
  id: string;
  title: string;
  subject: string;
  section: string;
  deadline: string;
  max: number;
  instructions: string;
  published: boolean;
  reference?: string;
  submission?: string;
  mark?: number;
  feedback?: string;
};
export type Attempt = {
  id: string;
  title: string;
  answers: Record<number, number>;
  score: number;
  total: number;
  completed: string;
};
export type Profile = {
  name: string;
  usn: string;
  email: string;
  cgpa: number;
  backlogs: number;
  skills: string;
  roles: string;
  github: string;
  linkedin: string;
  portfolio: string;
  resume: string;
  photo?: string;
};
export type Mark = {
  student: string;
  semester: number;
  section: string;
  subject: string;
  internal: number;
  quiz: number;
  assignment: number;
  lab: number;
  published: boolean;
};
export type Opportunity = {
  id: string;
  company: string;
  role: string;
  pay: string;
  deadline: string;
  cgpa: number;
  skills: string;
  mode: string;
  duration: string;
  kind: "placement" | "internship";
};
export const stageNames = [
  "Applied",
  "Under Review",
  "Online Assessment",
  "Technical Interview",
  "HR Interview",
  "Selected",
  "Rejected",
] as const;
export type Application = {
  studentId?: string;
  studentName?: string;
  opportunity: string;
  date: string;
  stage: (typeof stageNames)[number];
  interview?: string;
};
export const canApply = (
  profile: Pick<Profile, "cgpa" | "backlogs">,
  opportunity: Pick<Opportunity, "cgpa">,
) => profile.cgpa >= opportunity.cgpa && profile.backlogs === 0;
export const scoreQuiz = (
  questions: Question[],
  answers: Record<number, number>,
) =>
  questions.reduce(
    (score, question, index) =>
      score +
      (answers[index] === question.correct ? (question.points ?? 1) : 0),
    0,
  );
export const quizTotal = (questions: Question[]) =>
  questions.reduce((total, question) => total + (question.points ?? 1), 0);
export const remainingSeconds = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));
export const validUpload = (file: { name: string; size: number }) =>
  file.size > 0 &&
  file.size <= 10 * 1024 ** 2 &&
  /\.(pdf|docx|zip|txt|py)$/i.test(file.name);
export const markTotal = (mark: Mark) =>
  mark.internal + mark.quiz + mark.assignment + mark.lab;
export const activeAssessment = (
  assessment: Assessment,
  now = new Date().toISOString(),
) => assessment.opens <= now && assessment.closes >= now;
