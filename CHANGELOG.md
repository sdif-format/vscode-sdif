# Changelog

## 1.0.0

- Defines the v1.0 extension contract: VS Code client plus minimal TextMate fallback.
- Documents `tree-sitter-sdif/queries/highlights.scm` as the structural/editorial highlighting source.
- Relies on `sdif-lsp` semantic tokens for full SDIF, SDIF AI, and canonical SDIF highlighting.
- Keeps server bundling, automatic downloads, direct tree-sitter loading in VS Code, and formatting out of scope.

## 0.1.0

- Initial VS Code extension scaffold for SDIF.
- Registers `.sdif`, `.sdif.ai`, and `.sdif.canon` files.
- Adds TextMate syntax highlighting fallback.
- Adds configurable client launcher for the Rust `sdif-lsp` language server.
