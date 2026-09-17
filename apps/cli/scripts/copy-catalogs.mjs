import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../../catalogs", import.meta.url));
const target = fileURLToPath(new URL("../dist/catalogs", import.meta.url));

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
