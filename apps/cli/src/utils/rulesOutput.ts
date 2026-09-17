import { writeFile } from "node:fs/promises";
import { CliError } from "./errors.js";

export interface RulesOutputOptions {
  content: string;
  outputPath: string;
  stdout: boolean;
  yes: boolean;
  force: boolean;
  log?: (message: string) => void;
  write?: typeof writeFile;
}

export async function handleRulesOutput(options: RulesOutputOptions): Promise<"stdout" | "preview" | "written"> {
  const log = options.log ?? console.log;
  if (options.stdout) {
    log(options.content);
    return "stdout";
  }

  if (!options.yes) {
    log(`Would write to: ${options.outputPath}`);
    log("");
    log(options.content);
    return "preview";
  }

  const write = options.write ?? writeFile;
  try {
    await write(options.outputPath, options.content, {
      encoding: "utf-8",
      flag: options.force ? "w" : "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new CliError(
        `Agent rules file already exists: ${options.outputPath}. Use --force to overwrite it.`,
      );
    }
    throw error;
  }

  log(`Agent rules written to ${options.outputPath}`);
  return "written";
}
