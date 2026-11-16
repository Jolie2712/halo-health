import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Standalone build: one self-contained HTML file in dist-standalone/.
const shell = {
  name: "standalone-shell",
  transformIndexHtml: {
    order: "pre" as const,
    handler: (html: string) =>
      html
        .replace("<!-- figma:lang -->", "en")
        .replace("<!-- figma:title -->", "Halo Health")
        .replace(/<!-- figma:[a-z-]+ -->/g, ""),
  },
};

export default defineConfig({
  plugins: [shell, react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { outDir: "dist-standalone", chunkSizeWarningLimit: 4000 },
});
