import * as vscode from "vscode";
import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";
import * as fs from "node:fs";
import * as path from "node:path";

import { buildServerOptions, resolveServerConfiguration, resolveServerPath, verifyLspVersion } from "./config";

const OUTPUT_CHANNEL_NAME = "SDIF Language Server";
const LANGUAGE_CLIENT_ID = "sdifLanguageServer";
const LANGUAGE_CLIENT_NAME = "SDIF Language Server";

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand("sdif.restartServer", async () => restartLanguageClient(context)),
    vscode.commands.registerCommand("sdif.showOutput", () => outputChannel?.show()),
  );

  await startLanguageClient(context);
}

export async function deactivate(): Promise<void> {
  await stopLanguageClient();
}

async function restartLanguageClient(context: vscode.ExtensionContext): Promise<void> {
  await stopLanguageClient();
  await startLanguageClient(context);
}

async function startLanguageClient(context: vscode.ExtensionContext): Promise<void> {
  const configuration = resolveServerConfiguration(vscode.workspace.getConfiguration("sdif.server"));
  if (!configuration.enabled) {
    outputChannel?.appendLine("SDIF language server is disabled. Syntax highlighting remains active.");
    return;
  }

  const resolved = resolveServerPath(configuration, context.extensionPath);
  const serverPath = resolved.path;

  if (resolved.source === "bundled") {
    outputChannel?.appendLine(`SDIF language server resolved from bundled binary: ${serverPath}`);
  } else if (resolved.source === "workspace") {
    outputChannel?.appendLine(`SDIF language server resolved from workspace build: ${serverPath}`);
  } else if (resolved.source === "custom") {
    outputChannel?.appendLine(`SDIF language server resolved from custom setting: ${serverPath}`);
  } else if (resolved.source === "path") {
    outputChannel?.appendLine(`SDIF language server resolved from system PATH: ${serverPath}`);
  } else {
    outputChannel?.appendLine(`SDIF language server resolved from fallback command: ${serverPath}`);
  }

  // Read expected version from compatibility.json
  const compatibilityPath = path.join(context.extensionPath, "compatibility.json");
  let expectedVersion = "1.0.0";
  try {
    if (fs.existsSync(compatibilityPath)) {
      const content = fs.readFileSync(compatibilityPath, "utf8");
      const parsed = JSON.parse(content);
      if (parsed.sdifLspVersion) {
        expectedVersion = parsed.sdifLspVersion;
      }
    }
  } catch (e) {
    outputChannel?.appendLine(`Could not read compatibility.json: ${e}`);
  }

  // Verify LSP binary version compatibility
  const check = await verifyLspVersion(serverPath, expectedVersion);
  if (check.status === "unavailable") {
    outputChannel?.appendLine(`Could not execute the language server at: ${serverPath}. Error: ${check.error}`);
    void vscode.window.showErrorMessage(
      `Could not start the SDIF language server at "${serverPath}". The binary was not found or is not executable. Please set "sdif.server.path" or install "sdif-lsp".`
    );
    return;
  } else if (check.status === "incompatible") {
    outputChannel?.appendLine(`Warning: SDIF language server version mismatch. Expected: ${expectedVersion}, got: ${check.actualVersion}`);
    void vscode.window.showWarningMessage(
      `SDIF language server version mismatch. Expected version ${expectedVersion}, but found ${check.actualVersion}. Features might not work as expected.`
    );
  } else if (check.status === "unverifiable") {
    outputChannel?.appendLine(`Warning: Could not verify SDIF language server version: ${check.error}`);
    void vscode.window.showWarningMessage(
      `Could not verify SDIF language server version compatibility. Features might not work as expected.`
    );
  } else {
    outputChannel?.appendLine(`SDIF language server version verified: ${check.actualVersion}`);
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "sdif" },
      { scheme: "untitled", language: "sdif" },
    ],
    outputChannel,
    traceOutputChannel: outputChannel,
  };

  try {
    const { LanguageClient } = await import("vscode-languageclient/node");
    client = new LanguageClient(
      LANGUAGE_CLIENT_ID,
      LANGUAGE_CLIENT_NAME,
      buildServerOptions(serverPath, configuration.args),
      clientOptions,
    );
    await client.start();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    client = undefined;
    outputChannel?.appendLine(`Failed to start sdif-lsp: ${message}`);
    void vscode.window.showWarningMessage(
      `Could not start the SDIF language server (${serverPath}). ` +
        "Syntax highlighting remains available. Configure sdif.server.path if sdif-lsp is not on PATH.",
    );
  }
}

async function stopLanguageClient(): Promise<void> {
  if (!client) {
    return;
  }

  const activeClient = client;
  client = undefined;
  await activeClient.stop();
}

