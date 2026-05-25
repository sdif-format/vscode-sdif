import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_ROOT = path.resolve(__dirname, "..");
const BIN_DIR = path.resolve(EXTENSION_ROOT, "bin");
const DIST_BIN_DIR = path.resolve(EXTENSION_ROOT, "dist", "lsp-binaries");
const SIBLING_LSP_ROOT = path.resolve(EXTENSION_ROOT, "..", "sdif-lsp");

const RELEASE_TARGETS = [
  { platformArch: "linux-x64", name: "sdif-lsp", isUnix: true },
  { platformArch: "darwin-arm64", name: "sdif-lsp", isUnix: true },
  { platformArch: "win32-x64", name: "sdif-lsp.exe", isUnix: false },
];

async function main() {
  const isRelease = process.argv.includes("--release") || process.env.SDIF_RELEASE_BUILD === "1";
  console.log(`--- Preparing SDIF LSP Binaries (Mode: ${isRelease ? "Release" : "Development"}) ---`);

  // 1. Clean bin directory
  if (fs.existsSync(BIN_DIR)) {
    console.log(`Cleaning existing bin directory: ${BIN_DIR}`);
    fs.rmSync(BIN_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BIN_DIR, { recursive: true });

  if (isRelease) {
    console.log(`Assembling release binaries from: ${DIST_BIN_DIR}`);
    for (const target of RELEASE_TARGETS) {
      const sourcePath = path.join(DIST_BIN_DIR, target.platformArch, target.name);
      if (!fs.existsSync(sourcePath)) {
        console.error(`Error: Missing required release binary for ${target.platformArch} at: ${sourcePath}`);
        process.exit(1);
      }

      const targetDir = path.join(BIN_DIR, target.platformArch);
      fs.mkdirSync(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, target.name);
      console.log(`Copying ${target.platformArch} binary to: ${targetPath}`);
      fs.copyFileSync(sourcePath, targetPath);

      if (target.isUnix) {
        console.log(`Setting executable permissions for ${target.platformArch}...`);
        fs.chmodSync(targetPath, 0o755);
      }
    }
    console.log("Release LSP binaries prepared successfully!");
  } else {
    const winExe = process.platform === "win32" ? ".exe" : "";
    const executableName = `sdif-lsp${winExe}`;
    const currentPlatformArch = `${process.platform}-${process.arch}`;

    const searchPaths = [
      path.join(SIBLING_LSP_ROOT, "target", "release", executableName),
      path.join(SIBLING_LSP_ROOT, "target", "debug", executableName),
    ];

    let sourceBinaryPath = null;
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        sourceBinaryPath = p;
        break;
      }
    }

    if (!sourceBinaryPath) {
      console.error("Error: Could not locate sdif-lsp binary to bundle.");
      console.error("Please run 'cargo build --release' or 'cargo build' inside the sdif-lsp directory first.");
      process.exit(1);
    }

    console.log(`Found source binary at: ${sourceBinaryPath}`);
    const targetDir = path.join(BIN_DIR, currentPlatformArch);
    fs.mkdirSync(targetDir, { recursive: true });

    const targetBinaryPath = path.join(targetDir, executableName);
    console.log(`Copying binary to: ${targetBinaryPath}`);
    fs.copyFileSync(sourceBinaryPath, targetBinaryPath);

    if (process.platform !== "win32") {
      console.log("Setting executable permissions...");
      fs.chmodSync(targetBinaryPath, 0o755);
    }
    console.log("Development LSP binary prepared successfully!");
  }
}

main().catch(err => {
  console.error("Unhandled error preparing binaries:", err);
  process.exit(1);
});
