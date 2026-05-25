import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const EXTENSION_ROOT = path.resolve(__dirname, "../../..");
const VSIX_PATH = path.resolve(EXTENSION_ROOT, "test-package-test.vsix");

console.log("--- Starting Packaging Smoke Test ---");

try {
  // 1. Package vsix
  console.log("Packaging extension via vsce...");
  execSync(`npx vsce package --no-git-tag-version --out "${VSIX_PATH}"`, {
    cwd: EXTENSION_ROOT,
    stdio: "pipe",
  });
  console.log("VSIX packaged successfully.");

  // 2. Verify file presence inside VSIX using unzip
  console.log("Listing VSIX contents...");
  const filesList = execSync(`unzip -l "${VSIX_PATH}"`, { stdio: "pipe" }).toString();

  // Assert compatibility.json is packaged
  assert.ok(
    filesList.includes("extension/compatibility.json"),
    "VSIX must include compatibility.json"
  );
  console.log("✓ VSIX includes compatibility.json");

  // Verify that the host's platform binary is bundled
  const winExe = process.platform === "win32" ? ".exe" : "";
  const executableName = `sdif-lsp${winExe}`;
  const currentPlatformArch = `${process.platform}-${process.arch}`;
  const binaryInPackage = `extension/bin/${currentPlatformArch}/${executableName}`;

  assert.ok(
    filesList.includes(binaryInPackage),
    `VSIX must include the bundled binary for current host platform: ${binaryInPackage}`
  );
  console.log(`✓ VSIX includes bundled binary: ${binaryInPackage}`);

} finally {
  // 3. Clean up VSIX file
  if (fs.existsSync(VSIX_PATH)) {
    console.log("Cleaning up temporary VSIX...");
    fs.unlinkSync(VSIX_PATH);
  }
}

console.log("--- Packaging Smoke Test Complete ---");
