import assert from "node:assert/strict";

import { buildServerOptions, resolveServerConfiguration, resolveServerPath } from "../../src/config";

const disabled = resolveServerConfiguration({
  get: <T>(key: string, fallback: T): T => (key === "enabled" ? (false as T) : fallback),
});
assert.equal(disabled.enabled, false);
assert.equal(disabled.command, "sdif-lsp");

const configured = resolveServerConfiguration({
  get: <T>(key: string, fallback: T): T => {
    const values: Record<string, unknown> = {
      enabled: true,
      path: "/custom/path/sdif-lsp",
      command: "/tmp/sdif-lsp",
      args: ["--stdio"],
    };
    return (values[key] as T | undefined) ?? fallback;
  },
});
assert.deepEqual(configured, {
  enabled: true,
  path: "/custom/path/sdif-lsp",
  command: "/tmp/sdif-lsp",
  args: ["--stdio"],
});

const serverOptions = buildServerOptions(configured.command, configured.args);
assert.deepEqual(serverOptions.run, { command: "/tmp/sdif-lsp", args: ["--stdio"] });
assert.deepEqual(serverOptions.debug, { command: "/tmp/sdif-lsp", args: ["--stdio"] });

// Test resolveServerPath with explicit configuration path (even if not executable, returns it as configured)
const resolved = resolveServerPath(configured, __dirname);
assert.ok(resolved && resolved.path.includes("sdif-lsp"), `Resolved path should be resolved, got ${resolved.path}`);
assert.equal(resolved.source, "custom");

