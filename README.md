<p align="center">
  <img src="https://raw.githubusercontent.com/sdif-format/.github/main/profile/assets/sdif-logo-t.png" alt="vscode-sdif" width="320">
</p>

<p align="center">
  <strong>SDIF for VS Code</strong>
</p>

<p align="center">
  VS Code extension client providing rich language support for the<br>
  Semantic Data Interchange Format (SDIF).
</p>

<p align="center">
  <a href="#features">Features</a>
  ·
  <a href="#highlighting-architecture">Highlighting Architecture</a>
  ·
  <a href="#language-server">Language Server</a>
  ·
  <a href="#development">Development</a>
  ·
  <a href="#ecosystem">Ecosystem</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/extension-VS%20Code-2563eb?style=flat-square" alt="VS Code Extension">
  <img src="https://img.shields.io/badge/covers-.sdif%20%2B%20.sdif.ai-0f766e?style=flat-square" alt="Covers .sdif and .sdif.ai">
  <img src="https://img.shields.io/badge/license-MIT-374151?style=flat-square" alt="MIT">
</p>

<br>

<div align="center">

<table>
  <tr>
    <td align="center" width="25%">
      <strong>Compact</strong>
      <br><br>
      Less repeated structure.<br>
      Fewer wasted tokens.
    </td>
    <td align="center" width="25%">
      <strong>Semantic</strong>
      <br><br>
      Tables, relations,<br>
      metadata and intent.
    </td>
    <td align="center" width="25%">
      <strong>Canonical</strong>
      <br><br>
      Stable output for hashing,<br>
      signing and comparison.
    </td>
    <td align="center" width="25%">
      <strong>Auditable</strong>
      <br><br>
      Designed to be read,<br>
      reviewed and trusted.
    </td>
  </tr>
</table>

</div>

<br>

---

## Features

- Registers `.sdif`, `.sdif.ai`, and `.sdif.canon` files as SDIF documents.
- Automatically launches the external Rust `sdif-lsp` language server over stdio when available.
- Uses LSP semantic tokens for structural and editorial highlighting.
- Provides a minimal TextMate fallback for comments, directives, quoted strings, and narrative delimiters while the language server starts or when it is disabled.

<br>

---

## Highlighting Architecture

`vscode-sdif` is not the direct source of truth for SDIF highlighting.

The highlighting chain resolves as follows:

```text
sdif-spec
  -> tree-sitter-sdif/queries/highlights.scm
  -> sdif-lsp semantic tokens
  -> vscode-sdif client
```

`tree-sitter-sdif/queries/highlights.scm` is the single structural highlighting source. The bundled TextMate grammar in this extension is deliberately minimal and non-normative; it exists only as a startup/offline fallback and does not duplicate alias, relation, table, rule, or grouped-relation highlighting.

The Rust `sdif-rs` parser remains the normative source for diagnostics and semantic parsing. `sdif-lsp` uses `sdif-rs` for diagnostics, hover, and completions, and uses `tree-sitter-sdif` captures to produce editor highlighting semantic tokens.

<br>

---

## Language Server

`vscode-sdif` acts only as the VS Code client. Diagnostics, hover, completions, and semantic tokens belong to the Rust `sdif-lsp` server.

By default, the extension invokes the server command:

```bash
sdif-lsp
```

If the command is not on your system `PATH`, you can configure a custom binary path:

```json
{
  "sdif.server.command": "/path/to/sdif-lsp",
  "sdif.server.args": []
}
```

To disable the language server while keeping fallback TextMate highlighting:

```json
{
  "sdif.server.enabled": false
}
```

<br>

---

## Development

Set up a local development workspace, compile the extension, and run testing:

```bash
npm install
npm run compile
npm test
npm run package
```

<br>

---

## Boundaries

- No language server binary is bundled in this extension.
- No automatic language server download is performed.
- Formatting is intentionally out of scope for v1.0.
- VS Code does not load tree-sitter directly; highlighting integration is mediated by `sdif-lsp` semantic tokens.

<br>

---

## Ecosystem

This GitHub organization hosts the official SDIF ecosystem: the core format, reference tooling, benchmarks, examples, libraries, and editor extensions.

<div align="center">

<table>
  <tr>
    <td width="33%" valign="top">
      <p><sub>PYTHON CLIENT & CLI</sub></p>
      <h3>sdif-py</h3>
      <p>
        Specification, parser, canonicalizer, and CLI.<br>
        The normative reference implementation.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-py"><strong>Explore sdif-py →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>SPECIFICATION (SSOT)</sub></p>
      <h3>sdif-spec</h3>
      <p>
        Official format specification, canonicalization rules,<br>
        and portable conformance test suite.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-spec"><strong>View specification →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>BENCHMARKS</sub></p>
      <h3>sdif-benchmarks</h3>
      <p>
        Reproducible benchmark datasets and reports comparing SDIF with JSON, YAML, XML, and CSV.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-benchmarks"><strong>View benchmarks →</strong></a></p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <p><sub>RUST IMPLEMENTATION</sub></p>
      <h3>sdif-rs</h3>
      <p>
        Pure Rust parser implementation with a span-annotated AST designed for editor tooling.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-rs"><strong>Explore sdif-rs →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>LANGUAGE SERVER (LSP)</sub></p>
      <h3>sdif-lsp</h3>
      <p>
        LSP language server binary (tower-lsp) providing real-time diagnostics and IDE features.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-lsp"><strong>View sdif-lsp →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>EDITOR INTEGRATION</sub></p>
      <h3>vscode-sdif</h3>
      <p>
        VS Code extension client providing syntax highlighting, diagnostics, and LSP configuration.
      </p>
      <p><a href="https://github.com/sdif-format/vscode-sdif"><strong>Open extension →</strong></a></p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <p><sub>GRAMMAR FOUNDATION</sub></p>
      <h3>tree-sitter-sdif</h3>
      <p>
        Tree-sitter grammar foundation for syntax highlighting and incremental parsing.
      </p>
      <p><a href="https://github.com/sdif-format/tree-sitter-sdif"><strong>Open grammar →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>DOCUMENTATION</sub></p>
      <h3>sdif-format.github.io</h3>
      <p>
        Official documentation website containing specification guides, tutorials, and examples.
      </p>
      <p><a href="https://github.com/sdif-format/sdif-format.github.io"><strong>Read docs →</strong></a></p>
    </td>
    <td width="33%" valign="top">
      <p><sub>ORGANIZATION META</sub></p>
      <h3>.github</h3>
      <p>
        Organization profile, assets, and shared community configuration files.
      </p>
      <p><a href="https://github.com/sdif-format/.github"><strong>View profile →</strong></a></p>
    </td>
  </tr>
</table>

</div>

<br>

<details>
  <summary><strong>Repository map</strong></summary>

<br>

| Repository | Purpose |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`sdif-py`](https://github.com/sdif-format/sdif-py)                   | Core Python parser, validator, canonicalizer, and CLI |
| [`sdif-spec`](https://github.com/sdif-format/sdif-spec)               | Official format specification and conformance test suite (SSOT) |
| [`sdif-benchmarks`](https://github.com/sdif-format/sdif-benchmarks)   | Benchmark datasets, reports, and comparison tooling |
| [`sdif-rs`](https://github.com/sdif-format/sdif-rs)                   | Rust parser crate with span-annotated AST |
| [`sdif-lsp`](https://github.com/sdif-format/sdif-lsp)                 | LSP language server binary |
| [`tree-sitter-sdif`](https://github.com/sdif-format/tree-sitter-sdif) | Tree-sitter grammar foundation for syntax highlighting |
| [`vscode-sdif`](https://github.com/sdif-format/vscode-sdif)           | VS Code extension client for SDIF |
| [`sdif-format.github.io`](https://github.com/sdif-format/sdif-format.github.io) | Public documentation website (Docusaurus) |
| [`.github`](https://github.com/sdif-format/.github)                   | Organization profile, assets, and shared GitHub community files |

</details>

<br>

## License

MIT. See [LICENSE](LICENSE).
