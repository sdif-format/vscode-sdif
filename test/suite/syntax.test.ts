import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type TextMateGrammar = {
  scopeName: string;
  repository: Record<string, unknown>;
};

const repoRoot = path.resolve(__dirname, "../../..");
const grammar = JSON.parse(
  readFileSync(path.join(repoRoot, "syntaxes/sdif.tmLanguage.json"), "utf8"),
) as TextMateGrammar;

assert.equal(grammar.scopeName, "source.sdif");
for (const key of [
  "directives",
  "aliasHeader",
  "groupedRelation",
  "relationBlock",
  "rulesBlock",
  "tripleQuotedNarrative",
]) {
  assert.ok(grammar.repository[key], `grammar includes ${key}`);
}

for (const fixture of ["example.sdif", "example.sdif.ai", "example.sdif.canon"]) {
  assert.ok(existsSync(path.join(repoRoot, "test/fixtures", fixture)), `fixture exists: ${fixture}`);
}
