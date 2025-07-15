import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MangaDetails from "./pages/MangaDetails";
import MangaByType from "./pages/MangaByType";
import MangaByGenre from "./pages/MangaByGenre";
import ChapterReader from "./pages/ChapterReader";
import NotFound from "./pages/NotFound";
import MangaRedirect from "./components/MangaRedirect";
import TestSlugs from "./pages/TestSlugs";
import AllManga from "./pages/AllManga";
import HealthCheck from "./pages/HealthCheck";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/manga/:slug" element={<MangaDetails />} />
          <Route path="/manga/id/:id" element={<MangaRedirect />} />
          <Route path="/type/:type" element={<MangaByType />} />
          <Route path="/genre/:genre" element={<MangaByGenre />} />
          <Route path="/read/:id" element={<ChapterReader />} />
          <Route path="/test-slugs" element={<TestSlugs />} />
          <Route path="/all-manga" element={<AllManga />} />
          <Route path="/health-check" element={<HealthCheck />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
