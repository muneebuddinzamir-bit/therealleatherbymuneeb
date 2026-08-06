import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist");
const client = resolve(output, "client");
const server = resolve(output, "server");
const metadata = resolve(output, ".openai");

await rm(output, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(metadata, { recursive: true });

await Promise.all([
  cp(resolve(root, "index.html"), resolve(client, "index.html")),
  cp(resolve(root, "style.css"), resolve(client, "style.css")),
  cp(resolve(root, "img"), resolve(client, "img"), { recursive: true }),
  cp(resolve(root, ".openai", "hosting.json"), resolve(metadata, "hosting.json")),
]);

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
`;

await writeFile(resolve(server, "index.js"), worker);

const html = await readFile(resolve(client, "index.html"), "utf8");
if (!html.includes('<link rel="stylesheet" href="style.css">')) {
  throw new Error("The built page is missing its stylesheet reference.");
}

console.log("Static site build complete.");
