import assert from "node:assert/strict";

import { buildServerOptions, resolveServerConfiguration } from "../../src/config";

const disabled = resolveServerConfiguration({
  get: <T>(key: string, fallback: T): T => (key === "enabled" ? (false as T) : fallback),
});
assert.equal(disabled.enabled, false);
assert.equal(disabled.command, "sdif-lsp");

const configured = resolveServerConfiguration({
  get: <T>(key: string, fallback: T): T => {
    const values: Record<string, unknown> = {
      enabled: true,
      command: "/tmp/sdif-lsp",
      args: ["--stdio"],
    };
    return (values[key] as T | undefined) ?? fallback;
  },
});
assert.deepEqual(configured, {
  enabled: true,
  command: "/tmp/sdif-lsp",
  args: ["--stdio"],
});

const serverOptions = buildServerOptions(configured);
assert.deepEqual(serverOptions.run, { command: "/tmp/sdif-lsp", args: ["--stdio"] });
assert.deepEqual(serverOptions.debug, { command: "/tmp/sdif-lsp", args: ["--stdio"] });
