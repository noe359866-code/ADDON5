import sdk from "stremio-addon-sdk";

const { addonBuilder, serveHTTP } = sdk;

export const manifest = {
  id: "org.addon5.streamsonly",
  version: "0.1.0",
  name: "ADDON5 Streams",
  description: "Addon de Stremio que entrega streams para títulos ya encontrados en Stremio.",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: []
};

export function isSupportedRequest(args) {
  if (!args || !["movie", "series"].includes(args.type)) return false;
  if (typeof args.id !== "string" || !args.id.startsWith("tt")) return false;
  return true;
}

/**
 * Adapter boundary for a source that you own or are authorized to access.
 * Return only direct, playable stream URLs that you have permission to distribute.
 * Keep source-specific parsing/resolution in a separate module.
 */
export async function resolveAuthorizedStreams(_args) {
  return [];
}

export function createAddon(resolveStreams = resolveAuthorizedStreams) {
  const builder = new addonBuilder(manifest);
  builder.defineStreamHandler(async (args) => {
    if (!isSupportedRequest(args)) return { streams: [] };

    try {
      const streams = await resolveStreams(args);
      return {
        streams: Array.isArray(streams)
          ? streams.filter((stream) => stream && typeof stream.url === "string" && /^https?:\/\//i.test(stream.url))
          : []
      };
    } catch (error) {
      console.error("Stream resolver failed:", error instanceof Error ? error.message : "unknown error");
      return { streams: [] };
    }
  });
  return builder;
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1].replaceAll("\\\\", "/");
if (isMain) {
  const port = Number.parseInt(process.env.PORT || "7000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }
  serveHTTP(createAddon().getInterface(), { port });
}
