import { getAllScripts, getScriptBySlug } from "../../utils/scripts";

export async function getStaticPaths() {
  const scripts = await getAllScripts();
  return scripts.map((script) => ({
    params: { script: script.slug },
  }));
}

export async function GET({ params }: { params: { script: string } }) {
  const script = await getScriptBySlug(params.script);

  if (!script) {
    return new Response("Script not found", { status: 404 });
  }

  return new Response(script.source, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}
