import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

interface ScriptMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface Script {
  slug: string;
  title: string;
  description: string;
  content: string;
  metadata: ScriptMetadata;
  source: string;
}

function parseUserscriptMetadata(content: string): ScriptMetadata {
  const metadataRegex = /\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/;
  const match = content.match(metadataRegex);

  if (!match) {
    throw new Error("No userscript metadata found");
  }

  const metadata = match[1].split("\n").reduce((acc, line) => {
    const match = line.match(/\/\/ @(\w+)\s+(.+)/);
    if (match) {
      const [, key, value] = match;
      acc[key] = value.trim();
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    name: metadata.name || "Unnamed Script",
    version: metadata.version || "0.0.0",
    description: metadata.description || "No description provided",
    author: metadata.author || "Unknown",
  };
}

export async function getAllScripts(): Promise<Script[]> {
  const scriptsDir = path.join(process.cwd(), "..", "scripts");
  const scriptFolders = await fs.readdir(scriptsDir);

  const scripts = await Promise.all(
    scriptFolders.map(async (folder) => {
      const folderPath = path.join(scriptsDir, folder);
      const stat = await fs.stat(folderPath);

      if (!stat.isDirectory()) return null;

      try {
        // Read README.md
        const readmePath = path.join(folderPath, "README.md");
        const readmeContent = await fs.readFile(readmePath, "utf-8");
        const { content, data } = matter(readmeContent);

        // Read userscript file
        const scriptFiles = await fs.readdir(folderPath);
        const userscriptFile = scriptFiles.find((file) =>
          file.endsWith(".user.js")
        );
        if (!userscriptFile) throw new Error("No userscript found");

        const scriptPath = path.join(folderPath, userscriptFile);
        const scriptContent = await fs.readFile(scriptPath, "utf-8");
        const metadata = parseUserscriptMetadata(scriptContent);

        return {
          slug: folder,
          title: data.title || metadata.name,
          description:
            data.description || content.split("\n")[0] || metadata.description,
          content: content,
          metadata,
          source: scriptContent,
        };
      } catch (error) {
        console.error(`Error processing script ${folder}:`, error);
        return null;
      }
    })
  );

  return scripts.filter((script): script is Script => script !== null);
}

export async function getScriptBySlug(slug: string): Promise<Script | null> {
  const scripts = await getAllScripts();
  return scripts.find((script) => script.slug === slug) || null;
}
