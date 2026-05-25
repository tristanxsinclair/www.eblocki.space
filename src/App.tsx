import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Coach from "./pages/Coach.tsx";
import Sheet from "./pages/Sheet.tsx";
import Proof from "./pages/Proof.tsx";
import Modes from "./pages/Modes.tsx";
import ModeDetail from "./pages/ModeDetail.tsx";
import Settings from "./pages/Settings.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useTimezoneSync } from "@/hooks/useTimezoneSync";
import Onboarding from "./pages/Onboarding.tsx";
import StartToday from "./pages/StartToday.tsx";
import Install from "./pages/Install.tsx";
import EngineDebug from "./pages/EngineDebug.tsx";
import BetaAdmin from "./pages/BetaAdmin.tsx";
import Operator from "./pages/Operator.tsx";
import GameForge from "./pages/GameForge.tsx";
import Welcome from "./pages/Welcome.tsx";
import Why from "./pages/Why.tsx";
import Privacy from "./pages/legal/Privacy.tsx";
import Terms from "./pages/legal/Terms.tsx";
import DataHandling from "./pages/legal/DataHandling.tsx";
import AIDisclosure from "./pages/legal/AIDisclosure.tsx";

const queryClient = new QueryClient();

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  useTimezoneSync();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-xs">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/data-handling" element={<DataHandling />} />
            <Route path="/legal/ai-disclosure" element={<AIDisclosure />} />
            <Route path="/why" element={<Why />} />
            <Route path="/welcome" element={<Protected><Welcome /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/operator" element={<Protected><Operator /></Protected>} />
            <Route path="/gameforge" element={<Protected><GameForge /></Protected>} />
            <Route path="/coach" element={<Protected><Coach /></Protected>} />
            <Route path="/sheet" element={<Protected><Sheet /></Protected>} />
            <Route path="/start" element={<Protected><StartToday /></Protected>} />
            <Route path="/proof" element={<Protected><Proof /></Protected>} />
            <Route path="/modes" element={<Protected><Modes /></Protected>} />
            <Route path="/modes/:modeId" element={<Protected><ModeDetail /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/dev/engine" element={<Protected><EngineDebug /></Protected>} />
            <Route path="/dev/beta" element={<Protected><BetaAdmin /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
