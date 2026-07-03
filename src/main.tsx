import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
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
