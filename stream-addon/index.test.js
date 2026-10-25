import test from "node:test";
import assert from "node:assert/strict";
import { manifest, isSupportedRequest } from "./index.js";

test("manifest exposes only the stream resource and no catalogs", () => {
  assert.deepEqual(manifest.resources, ["stream"]);
  assert.deepEqual(manifest.catalogs, []);
  assert.equal(manifest.types.includes("movie"), true);
  assert.equal(manifest.types.includes("series"), true);
});

test("accepts supported IMDb movie and episode IDs", () => {
  assert.equal(isSupportedRequest({ type: "movie", id: "tt0111161" }), true);
  assert.equal(isSupportedRequest({ type: "series", id: "tt0944947:1:1" }), true);
});

test("rejects unsupported types and malformed IDs", () => {
  assert.equal(isSupportedRequest({ type: "anime", id: "tt1234567" }), false);
  assert.equal(isSupportedRequest({ type: "movie", id: "tmdb:123" }), false);
  assert.equal(isSupportedRequest(null), false);
});
