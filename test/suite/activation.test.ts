import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const compiledExtensionPath = path.resolve(__dirname, "../../src/extension.js");
const compiledExtension = readFileSync(compiledExtensionPath, "utf8");

const registrationIndex = compiledExtension.indexOf('registerCommand("sdif.restartServer"');
const languageClientImportIndex = compiledExtension.indexOf('require("vscode-languageclient/node")');

assert.ok(registrationIndex >= 0, "extension registers the restart command");
assert.ok(languageClientImportIndex >= 0, "extension can load vscode-languageclient");
assert.ok(
  registrationIndex < languageClientImportIndex,
  "extension registers commands before loading vscode-languageclient",
);
