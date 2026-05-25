import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const EXTENSION_ROOT = path.resolve(__dirname, "../../..");
const DIST_BIN_DIR = path.resolve(EXTENSION_ROOT, "dist", "lsp-binaries");
const VSIX_PATH = path.resolve(EXTENSION_ROOT, "test-package-release.vsix");

const REQUIRED_RELEASE_BINARIES = [
  path.join(DIST_BIN_DIR, "linux-x64", "sdif-lsp"),
  path.join(DIST_BIN_DIR, "darwin-arm64", "sdif-lsp"),
  path.join(DIST_BIN_DIR, "win32-x64", "sdif-lsp.exe"),
];

console.log("--- Starting Release Packaging Smoke Test ---");

const hasAllBinaries = REQUIRED_RELEASE_BINARIES.every((p) => fs.existsSync(p));

if (!hasAllBinaries) {
  console.log("Skipping release packaging test: dist/lsp-binaries/ does not contain all release targets.");
  console.log("This is expected during local development.");
} else {
  try {
    // 1. Prepare binaries in release mode
    console.log("Running release binary preparation...");
    execSync("npm run package:prepare -- --release", {
      cwd: EXTENSION_ROOT,
      stdio: "pipe",
    });

    // 2. Package vsix
    console.log("Packaging release extension via vsce...");
    execSync(`npx vsce package --no-git-tag-version --out "${VSIX_PATH}"`, {
      cwd: EXTENSION_ROOT,
      env: { ...process.env, SDIF_RELEASE_BUILD: "1" },
      stdio: "pipe",
    });
    console.log("VSIX packaged successfully.");

    // 3. Verify file presence inside VSIX using unzip
    console.log("Listing VSIX contents...");
    const filesList = execSync(`unzip -l "${VSIX_PATH}"`, { stdio: "pipe" }).toString();

    // Assert compatibility.json is packaged
    assert.ok(
      filesList.includes("extension/compatibility.json"),
      "VSIX must include compatibility.json"
    );
    console.log("✓ VSIX includes compatibility.json");

    // Assert all target binaries are packaged
    const expectedBinaries = [
      "extension/bin/linux-x64/sdif-lsp",
      "extension/bin/darwin-arm64/sdif-lsp",
      "extension/bin/win32-x64/sdif-lsp.exe",
    ];

    for (const bin of expectedBinaries) {
      assert.ok(
        filesList.includes(bin),
        `VSIX must include the bundled binary for: ${bin}`
      );
      console.log(`✓ VSIX includes bundled binary: ${bin}`);
    }

  } finally {
    // 4. Clean up VSIX file
    if (fs.existsSync(VSIX_PATH)) {
      console.log("Cleaning up temporary release VSIX...");
      fs.unlinkSync(VSIX_PATH);
    }
    // 5. Restore developer local environment binary
    console.log("Restoring host platform binary for development environment...");
    try {
      execSync("npm run package:prepare", {
        cwd: EXTENSION_ROOT,
        stdio: "pipe",
      });
    } catch (e) {
      console.warn("Warning: Could not restore host platform binary:", e);
    }
  }
}

console.log("--- Release Packaging Smoke Test Complete ---");
