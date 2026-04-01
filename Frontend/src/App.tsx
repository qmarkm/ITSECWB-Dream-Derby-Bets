import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminPanel from "./pages/AdminPanel";
import RaceDetail from "./pages/RaceDetail";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import CreateUmamusume from "./pages/CreateUmamusume";
import EditUmamusume from "./pages/EditUmamusume";
import ViewUmamusume from "./pages/ViewUmamusume";
import Umas from "./pages/Umas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/adminpanel" element={<AdminPanel />} />
              <Route path="/race/:id" element={<RaceDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:username" element={<UserProfile />} />
              <Route path="/umamusume/create" element={<CreateUmamusume />} />
              <Route path="/umamusume/:id" element={<ViewUmamusume />} />
              <Route path="/umamusume/:id/edit" element={<EditUmamusume />} />
              <Route path="/umas" element={<Umas />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
