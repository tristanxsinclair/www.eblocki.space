import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import { bootstrapNative } from "./lib/mobile/native";
import { initAnalytics, track, EVENTS } from "./lib/analytics";

initAnalytics();
void track(EVENTS.app_opened);
void bootstrapNative({
  onResume: () => track(EVENTS.app_resumed),
  onPause: () => track(EVENTS.app_paused),
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
