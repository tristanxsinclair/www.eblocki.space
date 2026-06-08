const routes = [
  "/",
  "/dashboard",
  "/start-today",
  "/proof",
  "/coach",
  "/gameforge",
  "/operator",
  "/install",
  "/why",
];

const baseUrl = process.env.ROUTE_SMOKE_BASE_URL ?? "http://127.0.0.1:4173";
const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRoute(route) {
  const url = new URL(route.replace(/^\//, ""), base);
  let lastError;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      const text = await response.text();

      if (response.status >= 400) {
        throw new Error(`${route} returned HTTP ${response.status}`);
      }

      if (!text.includes("<div id=\"root\"") && !text.includes("/assets/")) {
        throw new Error(`${route} did not look like the built SPA shell`);
      }

      return { route, status: response.status };
    } catch (error) {
      lastError = error;
      await wait(500);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${route} failed route smoke check`);
}

const results = [];
for (const route of routes) {
  results.push(await fetchRoute(route));
}

for (const result of results) {
  console.log(`${result.route} -> ${result.status}`);
}
