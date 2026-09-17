export interface GeneratedRulesFileSystem<TUri> {
  stat(uri: TUri): Promise<unknown>;
  writeFile(uri: TUri, content: Uint8Array): Promise<void>;
}

export interface WriteGeneratedRulesOptions<TUri> {
  uri: TUri;
  content: Uint8Array;
  fs: GeneratedRulesFileSystem<TUri>;
  confirmOverwrite: () => Promise<boolean>;
  isFileNotFound: (error: unknown) => boolean;
}

export async function writeGeneratedRules<TUri>(
  options: WriteGeneratedRulesOptions<TUri>,
): Promise<"written" | "cancelled"> {
  let exists = false;
  try {
    await options.fs.stat(options.uri);
    exists = true;
  } catch (error) {
    if (!options.isFileNotFound(error)) throw error;
  }

  if (exists && !(await options.confirmOverwrite())) return "cancelled";

  await options.fs.writeFile(options.uri, options.content);
  return "written";
}
