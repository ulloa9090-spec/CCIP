// Phase 12 — pure-logic correctness test for the CSV export formatter
// (lib/utils/csv.ts). No I/O — run via: npx tsx tests/csv-format.ts
import { toCsv } from "../lib/utils/csv";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const basic = toCsv(
  [{ title: "Call trucking school", status: "done" }],
  [
    { key: "title", header: "Title" },
    { key: "status", header: "Status" },
  ],
);
assert(basic === "Title,Status\r\nCall trucking school,done", "basic rows format with a header row and CRLF");

const withComma = toCsv([{ title: "Buy milk, eggs, bread" }], [{ key: "title", header: "Title" }]);
assert(withComma === 'Title\r\n"Buy milk, eggs, bread"', "a field containing a comma is quoted");

const withQuote = toCsv([{ title: 'Say "hello"' }], [{ key: "title", header: "Title" }]);
assert(withQuote === 'Title\r\n"Say ""hello"""', "embedded quotes are doubled and the field is quoted");

const withNewline = toCsv([{ body: "line one\nline two" }], [{ key: "body", header: "Body" }]);
assert(withNewline === 'Body\r\n"line one\nline two"', "a field containing a newline is quoted");

const withNullish = toCsv([{ due_date: null }, { due_date: undefined }], [{ key: "due_date", header: "Due Date" }]);
assert(withNullish === "Due Date\r\n\r\n", "null and undefined both render as an empty field, not the literal string");

const empty = toCsv([], [{ key: "title", header: "Title" }]);
assert(empty === "Title", "zero rows still produces just the header line");

console.log("\nAll CSV formatting tests passed.");
