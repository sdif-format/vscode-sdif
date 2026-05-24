import type { ServerOptions } from "vscode-languageclient/node";

export type SdifServerConfiguration = {
  enabled: boolean;
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

const DEFAULT_SERVER_ENABLED = true;
const DEFAULT_SERVER_COMMAND = "sdif-lsp";
const DEFAULT_SERVER_ARGS: string[] = [];

export function resolveServerConfiguration(configuration: ConfigurationReader): SdifServerConfiguration {
  return {
    enabled: configuration.get<boolean>("enabled", DEFAULT_SERVER_ENABLED),
    command: configuration.get<string>("command", DEFAULT_SERVER_COMMAND),
    args: configuration.get<string[]>("args", DEFAULT_SERVER_ARGS),
  };
}

export function buildServerOptions(configuration: SdifServerConfiguration): SdifServerOptions & ServerOptions {
  const commandOptions = {
    command: configuration.command,
    args: configuration.args,
  };
  return {
    run: commandOptions,
    debug: commandOptions,
  } as SdifServerOptions & ServerOptions;
}
