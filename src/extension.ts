import * as vscode from "vscode";
import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";

import { buildServerOptions, resolveServerConfiguration } from "./config";

const OUTPUT_CHANNEL_NAME = "SDIF Language Server";
const LANGUAGE_CLIENT_ID = "sdifLanguageServer";
const LANGUAGE_CLIENT_NAME = "SDIF Language Server";

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand("sdif.restartServer", async () => restartLanguageClient()),
    vscode.commands.registerCommand("sdif.showOutput", () => outputChannel?.show()),
  );

  await startLanguageClient();
}

export async function deactivate(): Promise<void> {
  await stopLanguageClient();
}

async function restartLanguageClient(): Promise<void> {
  await stopLanguageClient();
  await startLanguageClient();
}

async function startLanguageClient(): Promise<void> {
  const configuration = resolveServerConfiguration(vscode.workspace.getConfiguration("sdif.server"));
  if (!configuration.enabled) {
    outputChannel?.appendLine("SDIF language server is disabled. Syntax highlighting remains active.");
    return;
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
      buildServerOptions(configuration),
      clientOptions,
    );
    await client.start();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    client = undefined;
    outputChannel?.appendLine(`Failed to start sdif-lsp: ${message}`);
    void vscode.window.showWarningMessage(
      `Could not start the SDIF language server (${configuration.command}). ` +
        "Syntax highlighting remains available. Configure sdif.server.command if sdif-lsp is not on PATH.",
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
