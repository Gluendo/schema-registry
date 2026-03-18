import { codeToHtml } from "shiki";

export async function highlightJson(code: string): Promise<string> {
  return codeToHtml(code, {
    lang: "json",
    theme: "github-dark",
  });
}
