import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

// 1. Read compatibility contract
const compatibilityPath = path.resolve(__dirname, "../../../compatibility.json");
assert.ok(fs.existsSync(compatibilityPath), `compatibility.json should exist at ${compatibilityPath}`);

const compatibilityContent = fs.readFileSync(compatibilityPath, "utf8");
const compatibility = JSON.parse(compatibilityContent);

assert.ok(compatibility.sdifLspVersion, "compatibility.json must contain sdifLspVersion");
assert.ok(compatibility.sdifSpecVersion, "compatibility.json must contain sdifSpecVersion");
assert.ok(compatibility.sdifAiSpecVersion, "compatibility.json must contain sdifAiSpecVersion");
assert.ok(compatibility.lspProtocolVersion, "compatibility.json must contain lspProtocolVersion");

// 2. Read sdif-lsp Cargo.toml
const cargoPath = path.resolve(__dirname, "../../../../sdif-lsp/Cargo.toml");
assert.ok(fs.existsSync(cargoPath), `Cargo.toml should exist at ${cargoPath}`);

const cargoContent = fs.readFileSync(cargoPath, "utf8");
const packageMatch = cargoContent.match(/\[package\]([\s\S]*?)(?:\[|$)/);
assert.ok(packageMatch, "Cargo.toml should contain [package] section");

const packageContent = packageMatch[1]!;
const versionMatch = packageContent.match(/version\s*=\s*"([^"]+)"/);
assert.ok(versionMatch, "Cargo.toml [package] section should contain version");

const actualLspVersion = versionMatch[1];

// 3. Assert compatibility contract matches Cargo.toml version
assert.equal(
  compatibility.sdifLspVersion,
  actualLspVersion,
  `sdifLspVersion in compatibility.json (${compatibility.sdifLspVersion}) should match Cargo.toml version (${actualLspVersion})`
);

console.log(`✓ Compatibility contract version (${compatibility.sdifLspVersion}) matches sdif-lsp Cargo version (${actualLspVersion})`);
