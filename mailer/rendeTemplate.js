import fs from "fs";
import path from "path";

export function renderTemplate(content) {
  const base = fs.readFileSync(
    path.resolve("mailer/templates/base.html"),
    "utf8"
  );

  return base
    .replace("{{CONTENT}}", content)
    .replace("{{YEAR}}", new Date().getFullYear());
}
