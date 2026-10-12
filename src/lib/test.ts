import { stripHtmlTags } from "./textUtils";

// Test cases
const testCases = [
  { input: "<p><strong>Great job</strong></p>", expected: "Great job" },
  { input: "<p><strong>Great</strong> <em>job</em> <br>indeed</p>", expected: "Great job indeed" },
  { input: "<p>Great &amp; wonderful job</p>", expected: "Great & wonderful job" },
  { input: "<p>Great    job</p>", expected: "Great job" },
  { input: "", expected: "" },
];

console.log("Testing stripHtmlTags function:\n");

testCases.forEach((testCase, index) => {
  const result = stripHtmlTags(testCase.input);
  const passed = result === testCase.expected;
  console.log(`Test ${index + 1}: ${passed ? "PASS" : "FAIL"}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log();
});