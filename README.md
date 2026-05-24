# SDIF for VS Code

VS Code language support for the Semantic Data Interchange Format (SDIF).

## Features

- Registers `.sdif`, `.sdif.ai`, and `.sdif.canon` files as SDIF documents.
- Provides syntax highlighting for directives, blocks, relations, aliases, strings, comments, and narrative sections.
- Starts the external Rust `sdif-lsp` language server over stdio when available.
- Keeps syntax highlighting available even when the language server is disabled or missing.

## Language server

`vscode-sdif` is only the VS Code client. Diagnostics, hover, completions, and formatting belong in the Rust `sdif-lsp` server.

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

Disable the language server while keeping highlighting:

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

## Boundary

The Python `sdif` parser remains the normative format implementation. The `tree-sitter-sdif` grammar informs editor highlighting. This extension should not duplicate SDIF parser semantics; it should delegate language intelligence to `sdif-lsp`.
