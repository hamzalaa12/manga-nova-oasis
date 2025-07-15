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
          <Route path="/manga/id/:id" element={<MangaDetails />} />
          <Route path="/type/:type" element={<MangaByType />} />
          <Route path="/genre/:genre" element={<MangaByGenre />} />
          <Route path="/read/:id" element={<ChapterReader />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
