import test from "node:test";
import assert from "node:assert/strict";
import {
  activeAssessment,
  canApply,
  markTotal,
  remainingSeconds,
  scoreQuiz,
  quizTotal,
  validUpload,
} from "../src/services/domain.ts";

test("quiz scoring counts correct selections and treats skipped questions as incorrect", () => {
  const question = {
    prompt: "Pick B",
    options: ["A", "B"],
    correct: 1,
    explanation: "B is correct.",
  };
  assert.equal(scoreQuiz([question, question, question], { 0: 1, 1: 0 }), 1);
});
test("the countdown rounds positive fractions up and stops at zero", () => {
  assert.equal(remainingSeconds(1500, 0), 2);
  assert.equal(remainingSeconds(1500, 1500), 0);
  assert.equal(remainingSeconds(1500, 2500), 0);
});
test("assessment windows include the opening and closing instants", () => {
  const assessment = {
    id: "demo",
    title: "Demo",
    minutes: 10,
    section: "A",
    published: true,
    instructions: "",
    questions: [],
    opens: "2026-11-25T10:00:00.000Z",
    closes: "2026-11-25T10:30:00.000Z",
  };
  assert.equal(activeAssessment(assessment, assessment.opens), true);
  assert.equal(activeAssessment(assessment, assessment.closes), true);
  assert.equal(activeAssessment(assessment, "2026-11-25T10:30:01.000Z"), false);
});
test("eligibility requires the stated CGPA and zero backlogs", () => {
  assert.equal(canApply({ cgpa: 8, backlogs: 0 }, { cgpa: 8 }), true);
  assert.equal(canApply({ cgpa: 7.99, backlogs: 0 }, { cgpa: 8 }), false);
  assert.equal(canApply({ cgpa: 9, backlogs: 1 }, { cgpa: 8 }), false);
});
test("submissions enforce their file size and extension limits", () => {
  assert.equal(validUpload({ name: "report.PDF", size: 10 * 1024 ** 2 }), true);
  assert.equal(
    validUpload({ name: "report.pdf", size: 10 * 1024 ** 2 + 1 }),
    false,
  );
  assert.equal(validUpload({ name: "report.pdf", size: 0 }), false);
  assert.equal(validUpload({ name: "report.pdf.exe", size: 100 }), false);
});
test("academic totals include each marks category", () => {
  assert.equal(
    markTotal({
      student: "Demo",
      section: "A",
      semester: 5,
      subject: "ML",
      internal: 34,
      quiz: 19,
      assignment: 14,
      lab: 17,
      published: true,
    }),
    84,
  );
});

test("configured point values survive quiz scoring", () => {
  const base = {
    prompt: "Pick B",
    options: ["A", "B"],
    correct: 1,
    explanation: "B is correct.",
  };
  const questions = [base, { ...base, points: 4 }];
  assert.equal(scoreQuiz(questions, { 1: 1 }), 4);
  assert.equal(quizTotal(questions), 5);
});
