import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vidyanovaApi } from "./server/api";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "vidyanova-local-api",
      configureServer(server) {
        server.middlewares.use(vidyanovaApi);
      },
      configurePreviewServer(server) {
        server.middlewares.use(vidyanovaApi);
      },
    },
  ],
});
