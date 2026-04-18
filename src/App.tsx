import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VisaGuide from "./pages/VisaGuide";
import CountryGuide from "./pages/CountryGuide";
import ProfessorFinder from "./pages/ProfessorFinder";
import SavedProfessors from "./pages/SavedProfessors";
import PaperAnalysis from "./pages/PaperAnalysis";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/evaluate" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/~oauth" element={<Auth />} />
              <Route path="/visa" element={<VisaGuide />} />
              <Route path="/country-guide" element={<CountryGuide />} />
              <Route path="/professors" element={<ProfessorFinder />} />
              <Route path="/saved-professors" element={<SavedProfessors />} />
              <Route path="/paper-analysis" element={<PaperAnalysis />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
