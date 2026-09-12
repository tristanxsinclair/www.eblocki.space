// https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

function readCommitSha(): string | null {
  const suppliedSha = [
    process.env.EBLOCKI_BUILD_SHA,
    process.env.VITE_BUILD_SHA,
    process.env.GITHUB_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.COMMIT_REF,
  ].find((value) => value && SHA_PATTERN.test(value.trim()));

  if (suppliedSha) return suppliedSha.trim().toLowerCase();

  try {
    const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return SHA_PATTERN.test(gitSha) ? gitSha.toLowerCase() : null;
  } catch {
    return null;
  }
}

function readAppVersion(): string | null {
  try {
    const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));
    return typeof packageJson.version === "string" && packageJson.version.trim()
      ? packageJson.version.trim()
      : null;
  } catch {
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const commitSha = readCommitSha();
  const buildTimestamp = new Date().toISOString();
  const suppliedBuildId = process.env.EBLOCKI_BUILD_ID?.trim() || process.env.VITE_BUILD_ID?.trim();
  const buildId = suppliedBuildId || (commitSha ? `${commitSha.slice(0, 12)}-${buildTimestamp.replace(/[-:.TZ]/g, "").slice(0, 14)}` : null);
  const environment = process.env.EBLOCKI_BUILD_ENV?.trim() || process.env.VITE_APP_ENV?.trim() || mode;
  // @lovable.dev/mcp-js 0.20.x externalises Windows drive-letter entry paths
  // as package imports, then replaces the committed Supabase function with an
  // unresolved wrapper during a normal Vite build. Keep the generated,
  // reviewed function stable on Windows. Linux CI/Lovable still regenerates it;
  // Windows maintainers can opt in explicitly when validating an upstream fix.
  const generateMcpFunction =
    process.platform !== "win32" || process.env.EBLOCKI_FORCE_MCP_GENERATION === "true";

  return {
  define: {
    __EBLOCKI_BUILD_INFO__: JSON.stringify({
      commitSha,
      buildTimestamp,
      buildId,
      environment,
      appVersion: readAppVersion(),
    }),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), ...(generateMcpFunction ? [mcpPlugin()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: [
            "lucide-react",
            "sonner",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-toast",
          ],
          vendor: ["@tanstack/react-query"],
        },
      },
    },
  },
  };
});
