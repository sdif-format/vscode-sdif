import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

type PackageManifest = {
  version: string;
  scripts: Record<string, string>;
  contributes: {
    languages: Array<{ id: string; extensions: string[] }>;
    grammars: Array<{ language: string; scopeName: string; path: string }>;
    commands: Array<{ command: string }>;
    configuration: { properties: Record<string, { default: unknown }> };
  };
};

const manifestPath = path.resolve(__dirname, "../../../package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;

assert.equal(manifest.version, "1.0.0");
assert.equal(manifest.scripts.package, "vsce package");

const sdifLanguage = manifest.contributes.languages.find((language) => language.id === "sdif");
assert.ok(sdifLanguage, "manifest registers the sdif language");
assert.deepEqual(sdifLanguage.extensions, [".sdif", ".sdif.ai", ".sdif.canon"]);

const grammar = manifest.contributes.grammars.find((entry) => entry.language === "sdif");
assert.ok(grammar, "manifest registers an SDIF TextMate fallback grammar");
assert.equal(grammar.scopeName, "source.sdif");
assert.equal(grammar.path, "./syntaxes/sdif.tmLanguage.json");

const commands = manifest.contributes.commands.map((command) => command.command).sort();
assert.deepEqual(commands, ["sdif.restartServer", "sdif.showOutput"]);

const properties = manifest.contributes.configuration.properties;
assert.equal(properties["sdif.server.enabled"]?.default, true);
assert.equal(properties["sdif.server.path"]?.default, "");
assert.equal(properties["sdif.server.command"]?.default, "sdif-lsp");
assert.deepEqual(properties["sdif.server.args"]?.default, []);
assert.equal(properties["sdif.trace.server"]?.default, "off");
