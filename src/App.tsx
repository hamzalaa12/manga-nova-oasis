import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminPanel from "./pages/AdminPanel";
import MangaDetails from "./pages/MangaDetails";
import MangaByType from "./pages/MangaByType";
import MangaByGenre from "./pages/MangaByGenre";
import ChapterReader from "./pages/ChapterReader";
import Profile from "./pages/Profile";
import SiteSupport from "./pages/SiteSupport";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import ScrollToTop from "./components/ScrollToTop";
import { PERFORMANCE_CONFIG } from "./utils/performance";

// إعدادات QueryClient محسنة للأداء
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: PERFORMANCE_CONFIG.CACHE_TIMES.MANGA,
      gcTime: PERFORMANCE_CONFIG.CACHE_TIMES.MANGA * 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: PERFORMANCE_CONFIG.NETWORK.RETRY_COUNT,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/support" element={<SiteSupport />} />
            <Route path="/manga/:slug" element={<MangaDetails />} />
            <Route path="/type/:type" element={<MangaByType />} />
            <Route path="/genre/:genre" element={<MangaByGenre />} />
            <Route path="/read/:slug/:chapter" element={<ChapterReader />} />
            <Route path="/read/:id" element={<ChapterReader />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
