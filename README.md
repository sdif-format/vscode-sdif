# SDIF for VS Code

VS Code language support for the Semantic Data Interchange Format (SDIF).

## Features

- Registers `.sdif`, `.sdif.ai`, and `.sdif.canon` files as SDIF documents.
- Starts the external Rust `sdif-lsp` language server over stdio when available.
- Uses LSP semantic tokens for structural/editorial highlighting.
- Keeps a minimal TextMate fallback for comments, directives, quoted strings, and narrative delimiters while the language server starts or is disabled.

## Highlighting architecture

`vscode-sdif` is not the source of truth for SDIF highlighting.

The highlighting chain is:

```text
sdif-spec
  -> tree-sitter-sdif/queries/highlights.scm
  -> sdif-lsp semantic tokens
  -> vscode-sdif client
```

`tree-sitter-sdif/queries/highlights.scm` is the single structural/editorial highlighting source. The bundled TextMate grammar is deliberately minimal and non-normative; it exists only as a startup/offline fallback and must not duplicate alias, relation, table, rule, or grouped-relation highlighting semantics.

The Rust `sdif-rs` parser remains the normative source for diagnostics and semantic parsing. `sdif-lsp` uses `sdif-rs` for diagnostics, hover, and completions where semantic parsing applies, and uses `tree-sitter-sdif` for editor highlighting tokens.

Editor highlighting verification is based on tree-sitter captures and decoded LSP semantic tokens. Screenshots are only manual diagnostics, not verification evidence.

## Language server

`vscode-sdif` is only the VS Code client. Diagnostics, hover, completions, and semantic tokens belong in the Rust `sdif-lsp` server.

By default the extension runs:

```bash
sdif-lsp
```

Configure a custom binary path if the command is not on `PATH`:

```json
{
  "sdif.server.command": "/path/to/sdif-lsp",
  "sdif.server.args": []
}
```

Disable the language server while keeping fallback highlighting:

```json
{
  "sdif.server.enabled": false
}
```

## Development

```bash
npm install
npm run compile
npm test
npm run package
```

## Boundaries

- No language server binary is bundled in this extension.
- No automatic language server download is performed.
- Formatting is intentionally out of scope for v1.0.
- VS Code does not load tree-sitter directly; tree-sitter integration is mediated by `sdif-lsp` semantic tokens.
