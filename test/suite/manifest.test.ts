import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

type PackageManifest = {
  contributes: {
    languages: Array<{ id: string; extensions: string[] }>;
    commands: Array<{ command: string }>;
    configuration: { properties: Record<string, { default: unknown }> };
  };
};

const manifestPath = path.resolve(__dirname, "../../../package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;

const sdifLanguage = manifest.contributes.languages.find((language) => language.id === "sdif");
assert.ok(sdifLanguage, "manifest registers the sdif language");
assert.deepEqual(sdifLanguage.extensions, [".sdif", ".sdif.ai", ".sdif.canon"]);

const commands = manifest.contributes.commands.map((command) => command.command).sort();
assert.deepEqual(commands, ["sdif.restartServer", "sdif.showOutput"]);

const properties = manifest.contributes.configuration.properties;
assert.equal(properties["sdif.server.enabled"]?.default, true);
assert.equal(properties["sdif.server.command"]?.default, "sdif-lsp");
assert.deepEqual(properties["sdif.server.args"]?.default, []);
assert.equal(properties["sdif.trace.server"]?.default, "off");
