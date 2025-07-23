import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MangaGrid from "@/components/MangaGrid";
import ChaptersGrid from "@/components/ChaptersGrid";
import Footer from "@/components/Footer";
import AdminPanel from "@/components/AdminPanel";
import SEO from "@/components/SEO";
import { generatePageMeta, generateStructuredData } from "@/utils/seo";

const Index = () => {
  const pageMeta = generatePageMeta('home');
  const structuredData = generateStructuredData('home');

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageMeta?.title}
        description={pageMeta?.description}
        keywords={pageMeta?.keywords}
        url={pageMeta?.url}
        canonical={pageMeta?.canonical}
        type={pageMeta?.type}
        structuredData={structuredData}
      />
      <Header />
      <Hero />
      <ChaptersGrid />
      <MangaGrid />
      <Footer />
      <AdminPanel />
    </div>
  );
};

export default Index;
