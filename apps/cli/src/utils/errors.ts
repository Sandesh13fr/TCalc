export class CliError extends Error {
  public readonly exitCode: number;

  constructor(message: string, exitCode: number = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function handleError(err: unknown, debug: boolean): void {
  if (err instanceof CliError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  if (err instanceof Error) {
    if (debug) {
      console.error(err.stack ?? err.message);
    } else {
      console.error(err.message);
    }
    process.exit(2);
  }
  console.error(String(err));
  process.exit(2);
}
