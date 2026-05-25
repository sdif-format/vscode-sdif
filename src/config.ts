import type { ServerOptions } from "vscode-languageclient/node";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

export type SdifServerConfiguration = {
  enabled: boolean;
  path: string;
  command: string;
  args: string[];
};

type ConfigurationReader = {
  get<T>(section: string, defaultValue: T): T;
};

export type SdifServerOptions = {
  run: { command: string; args: string[] };
  debug: { command: string; args: string[] };
};

export type VersionCheckStatus = "compatible" | "incompatible" | "unverifiable" | "unavailable";

export type VersionCheckResult = {
  status: VersionCheckStatus;
  actualVersion?: string;
  error?: string;
};

const DEFAULT_SERVER_ENABLED = true;
const DEFAULT_SERVER_PATH = "";
const DEFAULT_SERVER_COMMAND = "sdif-lsp";
const DEFAULT_SERVER_ARGS: string[] = [];

export function resolveServerConfiguration(configuration: ConfigurationReader): SdifServerConfiguration {
  return {
    enabled: configuration.get<boolean>("enabled", DEFAULT_SERVER_ENABLED),
    path: configuration.get<string>("path", DEFAULT_SERVER_PATH),
    command: configuration.get<string>("command", DEFAULT_SERVER_COMMAND),
    args: configuration.get<string[]>("args", DEFAULT_SERVER_ARGS),
  };
}

function isExecutable(filePath: string): boolean {
  try {
    if (process.platform === "win32") {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    }
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function findInPath(command: string): string | undefined {
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(process.platform === "win32" ? ";" : ":");
  for (const dir of pathDirs) {
    if (!dir) {
      continue;
    }
    const fullPath = path.join(dir, command + (process.platform === "win32" ? ".exe" : ""));
    if (isExecutable(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

export type ResolvedServer = {
  path: string;
  source: "custom" | "bundled" | "workspace" | "path" | "fallback";
};

export function resolveServerPath(configuration: SdifServerConfiguration, extensionPath: string): ResolvedServer {
  // 1. Explicit path configuration override
  if (configuration.path && configuration.path.trim() !== "") {
    const resolvedPath = path.resolve(configuration.path);
    if (isExecutable(resolvedPath)) {
      return { path: resolvedPath, source: "custom" };
    }
    if (!path.isAbsolute(configuration.path)) {
      const extensionRelative = path.resolve(extensionPath, configuration.path);
      if (isExecutable(extensionRelative)) {
        return { path: extensionRelative, source: "custom" };
      }
    }
    return { path: resolvedPath, source: "custom" };
  }

  // 2. Bundled binaries
  const winExe = process.platform === "win32" ? ".exe" : "";
  const platformArchDir = `${process.platform}-${process.arch}`;
  const executableName = winExe ? `sdif-lsp${winExe}` : "sdif-lsp";

  const bundledSearchPaths = [
    path.join(extensionPath, "bin", platformArchDir, executableName),
    path.join(extensionPath, "bin", executableName),
    path.join(extensionPath, "server", platformArchDir, executableName),
    path.join(extensionPath, "server", executableName),
    path.join(extensionPath, executableName),
  ];

  for (const p of bundledSearchPaths) {
    if (isExecutable(p)) {
      return { path: p, source: "bundled" };
    }
  }

  // 3. Sibling workspace builds (development/testing support)
  const siblingBuildPaths = [
    path.resolve(extensionPath, "..", "sdif-lsp", "target", "release", executableName),
    path.resolve(extensionPath, "..", "sdif-lsp", "target", "debug", executableName),
  ];

  for (const p of siblingBuildPaths) {
    if (isExecutable(p)) {
      return { path: p, source: "workspace" };
    }
  }

  // 4. System PATH check
  const commandName = configuration.command || "sdif-lsp";
  if (path.isAbsolute(commandName) && isExecutable(commandName)) {
    return { path: commandName, source: "custom" };
  }
  const inPath = findInPath(commandName);
  if (inPath) {
    return { path: inPath, source: "path" };
  }

  return { path: commandName, source: "fallback" };
}

const VERSION_CHECK_TIMEOUT_MS = 2000;

export async function verifyLspVersion(serverPath: string, expectedVersion: string): Promise<VersionCheckResult> {
  try {
    const { stdout } = await execFilePromise(serverPath, ["--version"], { timeout: VERSION_CHECK_TIMEOUT_MS });
    const match = stdout.match(/sdif-lsp\s+(\d+\.\d+\.\d+)/) || stdout.match(/(\d+\.\d+\.\d+)/);
    if (!match) {
      return {
        status: "unverifiable",
        error: `Could not parse version from output: "${stdout.trim()}"`
      };
    }
    const actualVersion = match[1];
    if (actualVersion !== expectedVersion) {
      return {
        status: "incompatible",
        actualVersion
      };
    }
    return {
      status: "compatible",
      actualVersion
    };
  } catch (error: any) {
    const isMissing = error?.code === "ENOENT" || 
                      (error?.message && (error.message.includes("ENOENT") || error.message.includes("not found")));
    if (isMissing) {
      return {
        status: "unavailable",
        error: error?.message || String(error)
      };
    }
    return {
      status: "unverifiable",
      error: error?.message || String(error)
    };
  }
}

export function buildServerOptions(command: string, args: string[]): SdifServerOptions & ServerOptions {
  const commandOptions = {
    command,
    args,
  };
  return {
    run: commandOptions,
    debug: commandOptions,
  } as SdifServerOptions & ServerOptions;
}

