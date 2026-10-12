import { generateSlug } from "./utils";

// Test cases
const testCases = [
  { title: "Software Engineer", company: null, expected: "software-engineer" },
  { title: "Senior Software Engineer (Remote)", company: null, expected: "senior-software-engineer-remote" },
  { title: "Product   Manager", company: null, expected: "product-manager" },
  { title: "Front-end Developer", company: null, expected: "front-end-developer" },
  { title: "Data_Scientist", company: null, expected: "data-scientist" },
  { title: "Marketing Manager", company: "Google", expected: "marketing-manager-google" },
  { title: "", company: null, expected: "" },
  { title: "Product Manager", company: "ABC Company", expected: "product-manager-abc" },
];

console.log("Testing generateSlug function:\n");

testCases.forEach((testCase, index) => {
  const result = generateSlug(testCase.title, testCase.company);
  const passed = result === testCase.expected;
  console.log(`Test ${index + 1}: ${passed ? "PASS" : "FAIL"}`);
  console.log(`  Title: "${testCase.title}"`);
  console.log(`  Company: "${testCase.company}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log();
});