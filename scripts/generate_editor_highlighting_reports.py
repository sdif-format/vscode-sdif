"""Generate editor highlighting reports from tree-sitter captures and sdif-lsp.

This script parses highlights using tree-sitter query captures and queries the
sdif-lsp language server to obtain absolute decoded semantic tokens, saving them
to the _ai-agents/reports/editor/ directory.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

FIXTURE_SDIF_NAME = "highlighting.sdif"
FIXTURE_SDIF_AI_NAME = "highlighting.sdif.ai"
TREE_SITTER_REPORTS = (
    (FIXTURE_SDIF_NAME, "highlighting.sdif.tree-sitter-captures.json"),
    (FIXTURE_SDIF_AI_NAME, "highlighting.sdif-ai.tree-sitter-captures.json"),
)
SEMANTIC_TOKEN_REPORTS = (
    (FIXTURE_SDIF_NAME, "highlighting.sdif.semantic-tokens.json"),
    (FIXTURE_SDIF_AI_NAME, "highlighting.sdif-ai.semantic-tokens.json"),
)
MAPPING_REPORTS = (
    (FIXTURE_SDIF_NAME, "highlighting.sdif.capture-semantic-map.json"),
    (FIXTURE_SDIF_AI_NAME, "highlighting.sdif-ai.capture-semantic-map.json"),
)
CAPTURE_TO_SEMANTIC_TYPE = {
    "keyword": "keyword",
    "type": "type",
    "property": "property",
    "variable": "variable",
    "constant": "enum",
    "comment": "comment",
    "string": "string",
    "atom": "string",
    "punctuation": "operator",
}


def main() -> int:
    """Main command line entry point."""
    parser = argparse.ArgumentParser(
        description="Generate highlighting verification reports."
    )
    parser.add_argument(
        "--spec-dir",
        help="Path to the sdif-spec repository directory",
        default=os.environ.get("SDIF_SPEC_DIR"),
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parents[1]

    spec_dir_val = args.spec_dir or str(workspace_root / "sdif-spec")
    spec_dir = Path(spec_dir_val).resolve()
    if not spec_dir.is_dir():
        print(
            f"Error: Spec directory not found at: {spec_dir}\n"
            "Set SDIF_SPEC_DIR env var or pass --spec-dir.",
            file=sys.stderr,
        )
        return 1

    fixture_dir = spec_dir / "fixtures" / "editor"
    fixture_sdif = fixture_dir / FIXTURE_SDIF_NAME
    fixture_sdif_ai = fixture_dir / FIXTURE_SDIF_AI_NAME

    for fixture in (fixture_sdif, fixture_sdif_ai):
        if not fixture.is_file():
            print(f"Error: Highlighting fixture not found: {fixture}", file=sys.stderr)
            return 1

    reports_dir = workspace_root / "_ai-agents" / "reports" / "editor"
    reports_dir.mkdir(parents=True, exist_ok=True)

    try:
        lsp_binary = _find_sdif_lsp_binary(workspace_root)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    try:
        _generate_tree_sitter_reports(
            workspace_root, fixture_sdif, fixture_sdif_ai, reports_dir
        )
        _generate_lsp_semantic_reports(
            lsp_binary, fixture_sdif, fixture_sdif_ai, reports_dir
        )
        _generate_mapping_reports(fixture_sdif, fixture_sdif_ai, reports_dir)
    except (OSError, RuntimeError) as exc:
        print(f"Error generating reports: {exc}", file=sys.stderr)
        return 1

    print("Editor highlighting verification reports generated successfully:")
    print(f"  - {reports_dir}/highlighting.sdif.tree-sitter-captures.json")
    print(f"  - {reports_dir}/highlighting.sdif.semantic-tokens.json")
    print(f"  - {reports_dir}/highlighting.sdif-ai.tree-sitter-captures.json")
    print(f"  - {reports_dir}/highlighting.sdif-ai.semantic-tokens.json")
    print(f"  - {reports_dir}/highlighting.sdif.capture-semantic-map.json")
    print(f"  - {reports_dir}/highlighting.sdif-ai.capture-semantic-map.json")
    return 0


def _find_sdif_lsp_binary(workspace_root: Path) -> Path:
    """Find the compiled sdif-lsp binary in target directories or PATH."""
    debug_path = workspace_root / "sdif-lsp" / "target" / "debug" / "sdif-lsp"
    if debug_path.is_file():
        return debug_path

    release_path = workspace_root / "sdif-lsp" / "target" / "release" / "sdif-lsp"
    if release_path.is_file():
        return release_path

    path_bin = shutil.which("sdif-lsp")
    if path_bin:
        return Path(path_bin)

    raise FileNotFoundError(
        "Could not find sdif-lsp binary in target/debug/, target/release/ or PATH.\n"
        "Please compile it first: cd sdif-lsp && cargo build"
    )


def _generate_tree_sitter_reports(
    workspace_root: Path,
    fixture_sdif: Path,
    fixture_sdif_ai: Path,
    reports_dir: Path,
) -> None:
    """Run tree-sitter query and write parsed JSON reports."""
    fixtures = {FIXTURE_SDIF_NAME: fixture_sdif, FIXTURE_SDIF_AI_NAME: fixture_sdif_ai}
    for fixture_name, output_name in TREE_SITTER_REPORTS:
        fixture = fixtures[fixture_name]
        raw_output = _run_tree_sitter_query(workspace_root, fixture)
        captures = _parse_tree_sitter_captures(raw_output, fixture.read_text(encoding="utf-8"))
        output_file = reports_dir / output_name
        output_file.write_text(json.dumps(captures, indent=2) + "\n", encoding="utf-8")


def _run_tree_sitter_query(workspace_root: Path, fixture_path: Path) -> str:
    """Run tree-sitter CLI query subcommand and capture output."""
    tree_sitter_dir = workspace_root / "tree-sitter-sdif"
    query_file = "queries/highlights.scm"

    result = subprocess.run(
        ["npx", "tree-sitter", "query", query_file, str(fixture_path.resolve())],
        cwd=tree_sitter_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 and not result.stdout:
        raise RuntimeError(
            f"tree-sitter query failed (exit {result.returncode}): {result.stderr}"
        )
    return result.stdout


def _parse_tree_sitter_captures(
    query_output: str, source_text: str
) -> list[dict[str, object]]:
    """Parse tree-sitter query output, including captures without printed text."""
    pattern = re.compile(
        r"capture:(?:\s*\d+\s*-)?\s*(?P<name>[a-zA-Z0-9_.-]+),"
        r"\s*start:\s*\((?P<s_row>\d+),\s*(?P<s_col>\d+)\),"
        r"\s*end:\s*\((?P<e_row>\d+),\s*(?P<e_col>\d+)\)"
        r"(?:,\s*text:\s*`(?P<text>.*?)`)?"
        r"(?=\s*(?:\n\s*capture:|\n\s*pattern:|\Z))",
        re.DOTALL,
    )

    captures: list[dict[str, object]] = []
    for m in pattern.finditer(query_output):
        start = {"line": int(m.group("s_row")), "column": int(m.group("s_col"))}
        end = {"line": int(m.group("e_row")), "column": int(m.group("e_col"))}
        text = m.group("text")
        if text is None:
            text = _slice_text_by_position(source_text, start, end)
        captures.append(
            {
                "capture": m.group("name"),
                "start": start,
                "end": end,
                "text": text,
            }
        )
    return captures


def _slice_text_by_position(
    source_text: str, start: dict[str, int], end: dict[str, int]
) -> str:
    """Slice source text using tree-sitter row/column positions for report text."""
    lines = source_text.splitlines(keepends=True)
    start_line = start["line"]
    end_line = end["line"]
    if start_line >= len(lines):
        return ""
    if start_line == end_line:
        return lines[start_line][start["column"] : end["column"]]

    chunks = [lines[start_line][start["column"] :]]
    chunks.extend(lines[start_line + 1 : min(end_line, len(lines))])
    if end_line < len(lines):
        chunks.append(lines[end_line][: end["column"]])
    return "".join(chunks)


def _generate_mapping_reports(
    fixture_sdif: Path,
    fixture_sdif_ai: Path,
    reports_dir: Path,
) -> None:
    """Write traceability reports from tree-sitter captures to LSP token types."""
    fixtures = {FIXTURE_SDIF_NAME: fixture_sdif, FIXTURE_SDIF_AI_NAME: fixture_sdif_ai}
    tree_sitter_outputs = {
        "highlighting.sdif": "highlighting.sdif.tree-sitter-captures.json",
        "highlighting.sdif.ai": "highlighting.sdif-ai.tree-sitter-captures.json",
    }
    semantic_outputs = {
        "highlighting.sdif": "highlighting.sdif.semantic-tokens.json",
        "highlighting.sdif.ai": "highlighting.sdif-ai.semantic-tokens.json",
    }
    for fixture_name, output_name in MAPPING_REPORTS:
        captures = json.loads((reports_dir / tree_sitter_outputs[fixture_name]).read_text())
        semantic_tokens = json.loads((reports_dir / semantic_outputs[fixture_name]).read_text())
        source_text = fixtures[fixture_name].read_text(encoding="utf-8")
        report = _build_mapping_report(fixture_name, source_text, captures, semantic_tokens)
        (reports_dir / output_name).write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
        if not report["all_mappings_matched"]:
            raise RuntimeError(f"Capture-to-semantic mapping mismatch: {output_name}")


def _build_mapping_report(
    fixture_name: str,
    source_text: str,
    captures: list[dict[str, object]],
    semantic_tokens: list[dict[str, object]],
) -> dict[str, object]:
    """Build traceability evidence from capture names to final semantic tokens."""
    mappings = []
    for capture in captures:
        capture_name = str(capture["capture"])
        expected_type = _semantic_type_for_capture(capture_name)
        if expected_type is None:
            continue
        expected_tokens = _expected_semantic_tokens_for_capture(capture, source_text)
        matched_tokens = [
            token
            for token in expected_tokens
            if _has_semantic_token(semantic_tokens, token, expected_type)
        ]
        mappings.append(
            {
                "capture": capture_name,
                "text": capture["text"],
                "capture_range": {
                    "start": capture["start"],
                    "end": capture["end"],
                },
                "semantic_token_type": expected_type,
                "expected_semantic_tokens": expected_tokens,
                "matched_semantic_tokens": matched_tokens,
                "matched": len(matched_tokens) == len(expected_tokens),
            }
        )
    return {
        "fixture": fixture_name,
        "contract": (
            "sdif-lsp semantic tokens are derived from tree-sitter-sdif "
            "highlights.scm captures. Multi-line captures such as table rows and "
            "narrative bodies may be split into one semantic token per source line."
        ),
        "capture_to_semantic_type": CAPTURE_TO_SEMANTIC_TYPE,
        "mappings": mappings,
        "all_mappings_matched": all(item["matched"] for item in mappings),
    }


def _semantic_type_for_capture(capture_name: str) -> str | None:
    base_name = capture_name.split(".", maxsplit=1)[0]
    return CAPTURE_TO_SEMANTIC_TYPE.get(base_name)


def _expected_semantic_tokens_for_capture(
    capture: dict[str, object], source_text: str
) -> list[dict[str, int]]:
    start = capture["start"]
    end = capture["end"]
    if not isinstance(start, dict) or not isinstance(end, dict):
        raise RuntimeError(f"Invalid capture range: {capture}")
    start_line = int(start["line"])
    start_column = int(start["column"])
    end_line = int(end["line"])
    end_column = int(end["column"])
    lines = source_text.splitlines(keepends=True)
    expected = []
    last_line = min(end_line, len(lines) - 1)
    for line_number in range(start_line, last_line + 1):
        line = lines[line_number]
        line_without_newline = line.rstrip("\r\n")
        token_start = start_column if line_number == start_line else 0
        token_end = end_column if line_number == end_line else len(line_without_newline)
        if token_end > token_start:
            expected.append(
                {
                    "line": line_number,
                    "character": token_start,
                    "length": token_end - token_start,
                }
            )
    return expected


def _has_semantic_token(
    semantic_tokens: list[dict[str, object]], expected: dict[str, int], token_type: str
) -> bool:
    return any(
        token.get("line") == expected["line"]
        and token.get("character") == expected["character"]
        and token.get("length") == expected["length"]
        and token.get("token_type") == token_type
        for token in semantic_tokens
    )


def _generate_lsp_semantic_reports(
    lsp_binary: Path,
    fixture_sdif: Path,
    fixture_sdif_ai: Path,
    reports_dir: Path,
) -> None:
    """Run sdif-lsp token dump and save results to report files."""
    fixtures = {FIXTURE_SDIF_NAME: fixture_sdif, FIXTURE_SDIF_AI_NAME: fixture_sdif_ai}
    for fixture_name, output_name in SEMANTIC_TOKEN_REPORTS:
        result = subprocess.run(
            [
                str(lsp_binary),
                "--dump-semantic-tokens",
                str(fixtures[fixture_name].resolve()),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"sdif-lsp token dump failed (exit {result.returncode}): {result.stderr}"
            )
        output_file = reports_dir / output_name
        output_file.write_text(result.stdout, encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
