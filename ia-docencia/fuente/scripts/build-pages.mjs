// Compila la página y la deja en ia-docencia/, la carpeta que sirve GitHub Pages.
// Dirección pública: https://onemoreint.github.io/apps/ia-docencia/
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";

execSync("npx vite build", { stdio: "inherit" });
for (const item of ["assets", "index.html", "favicon.svg", "og-image.png", "robots.txt"]) {
  rmSync(`../${item}`, { recursive: true, force: true });
}
cpSync("dist", "..", { recursive: true });
