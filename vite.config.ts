import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const portFromEnv = Number.parseInt(env.PORT ?? "", 10);
  const port = Number.isFinite(portFromEnv) ? portFromEnv : 8080;
  const allowedHostsRaw = env.ALLOWED_HOSTS?.trim();
  const allowedHosts =
    !allowedHostsRaw
      ? undefined
      : allowedHostsRaw === "*" || allowedHostsRaw.toLowerCase() === "true"
        ? true
        : allowedHostsRaw
            .split(",")
            .map((host) => host.trim())
            .filter(Boolean);

  return {
    server: {
      host: "::",
      port,
      ...(allowedHosts !== undefined &&
      (allowedHosts === true || allowedHosts.length > 0)
        ? { allowedHosts }
        : {}),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
