export interface AppConfig {
  port: number;
  host: string;
  debug?: boolean;
}

export type StatusResponse = {
  status: "ok" | "error";
  message?: string;
};

export enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
