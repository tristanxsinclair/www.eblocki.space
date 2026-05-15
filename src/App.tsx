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
import Onboarding from "./pages/Onboarding.tsx";
import StartToday from "./pages/StartToday.tsx";

const queryClient = new QueryClient();

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
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
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/coach" element={<Protected><Coach /></Protected>} />
            <Route path="/sheet" element={<Protected><Sheet /></Protected>} />
            <Route path="/start" element={<Protected><StartToday /></Protected>} />
            <Route path="/proof" element={<Protected><Proof /></Protected>} />
            <Route path="/modes" element={<Protected><Modes /></Protected>} />
            <Route path="/modes/:modeId" element={<Protected><ModeDetail /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
