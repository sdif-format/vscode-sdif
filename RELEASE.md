# Release Engineering — vscode-sdif

This document outlines the architecture, pipeline, and processes for packaging and distributing the standalone `vscode-sdif` extension with bundled Rust `sdif-lsp` binaries.

---

## Distribution Strategy

We distribute `vscode-sdif` as a **Universal VSIX package** that bundles pre-compiled, optimized binaries for the key target platforms:

- **`linux-x64`**: Linux 64-bit systems
- **`darwin-arm64`**: Apple Silicon macOS systems
- **`win32-x64`**: Windows 64-bit systems

This approach provides a single, zero-dependency download for end-users, ensuring that syntax highlighting, diagnostics, completions, and semantic tokens work natively out-of-the-box.

---

## Packaging Directory Structure

The bundled binaries are structured as follows inside the packaged extension:

```text
extension/
  ├─ compatibility.json
  ├─ package.json
  ├─ out/
  │   └─ ...
  └─ bin/
      ├─ linux-x64/
      │   └─ sdif-lsp
      ├─ darwin-arm64/
      │   └─ sdif-lsp
      └─ win32-x64/
          └─ sdif-lsp.exe
```

---

## Local Verification & Mock Testing

The assembly script handles copying binaries and configuring appropriate executable bits:

```bash
# Development (Host platform binary only, resolved from target/ builds)
npm run package:prepare

# Release (Copies from dist/lsp-binaries/ for all three targets)
npm run package:prepare -- --release
```

### Smoke Testing the Release Package Locally

To test the universal packaging process locally:

1. Create a `dist/lsp-binaries` directory under `vscode-sdif/`:
   ```bash
   mkdir -p dist/lsp-binaries/linux-x64 dist/lsp-binaries/darwin-arm64 dist/lsp-binaries/win32-x64
   ```
2. Copy or touch dummy/mock binaries in those directories:
   ```bash
   touch dist/lsp-binaries/linux-x64/sdif-lsp
   touch dist/lsp-binaries/darwin-arm64/sdif-lsp
   touch dist/lsp-binaries/win32-x64/sdif-lsp.exe
   ```
3. Run the unit and packaging verification tests:
   ```bash
   npm test
   ```
   If all three binaries exist, `package-release.test.ts` executes automatically, builds the VSIX, and asserts that all three platform binaries are present.

---

## CI/CD Release Automation

We automate release builds via GitHub Actions in [.github/workflows/vscode-sdif-release.yml](https://github.com/sdif-format/blob/main/.github/workflows/vscode-sdif-release.yml).

The workflow pipeline operates as follows:

1. **Compilation Matrix**: Runs jobs in parallel on `ubuntu-latest`, `macos-latest`, and `windows-latest` to build `sdif-lsp` in release mode (`cargo build --release`).
2. **Artifact Collection**: Uploads the compiled binaries as workflow artifacts.
3. **Release Packaging**: Runs an assembly job on `ubuntu-latest` that:
   - Downloads the three platform artifacts.
   - Places them in `vscode-sdif/dist/lsp-binaries/`.
   - Runs `npm run package:prepare -- --release` to copy them into the extension structure and apply permissions.
   - Runs the test suite to verify packaging contents.
   - Invokes `vsce package` to produce the universal `vscode-sdif-universal.vsix` package.
   - Uploads/publishes the final VSIX.
