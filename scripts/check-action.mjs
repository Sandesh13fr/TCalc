import { readFileSync } from "node:fs";

const action = readFileSync(new URL("../action.yml", import.meta.url), "utf8");
for (const required of ["name:", "description:", "runs:", "using: composite", "report:", "repo-map:"]) {
  if (!action.includes(required)) throw new Error(`action.yml is missing ${required}`);
}
console.log("GitHub Action metadata OK.");
