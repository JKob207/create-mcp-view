import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * The host renders this app by injecting the resource body into a sandboxed
 * iframe, which has no origin to resolve `<script src>` or `<link href>`
 * against. So the whole bundle — JS, CSS, assets — has to be inlined into a
 * single `index.html`, which is what `viteSingleFile` does.
 *
 * The Python server reads the result from `ui/dist/index.html`.
 */
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    // Relative URLs for anything not inlined. viteSingleFile inlines the JS
    // and CSS, so this changes nothing today — but a file dropped in
    // `public/` would otherwise be referenced as `/asset.png`, an absolute
    // path the sandboxed iframe has no origin to resolve.
    base: "./",
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Inline sourcemaps only in dev builds; they would otherwise bloat the
      // resource body the host has to transfer on every render.
      sourcemap: isDevelopment ? "inline" : false,
      minify: !isDevelopment,
      cssMinify: !isDevelopment,
      // A single-file bundle is one big chunk by construction.
      chunkSizeWarningLimit: 10_000,
    },
  };
});
