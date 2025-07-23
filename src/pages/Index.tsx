import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MangaGrid from "@/components/MangaGrid";
import ChaptersGrid from "@/components/ChaptersGrid";
import Footer from "@/components/Footer";
import AdminPanel from "@/components/AdminPanel";
import SEO from "@/components/SEO";
import { generatePageMeta, generateStructuredData } from "@/utils/seo";

const Index = () => {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": currentUrl,
    name: "مانجا العرب",
    description:
      "أفضل موقع لقراءة المانجا والمانهوا والمانها مترجمة بجودة عالية مجاناً",
    url: currentUrl,
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${typeof window !== "undefined" ? window.location.origin : ""}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "مانجا العرب",
      url: currentUrl,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="مانجا العرب - اقرأ المانجا والمانهوا مترجمة مجاناً"
        description="أفضل موقع لقراءة المانجا والمانهوا والمانها مترجمة بجودة عالية. آلاف الفصول المترجمة من أشهر المانجا مثل ون بيس، ناروتو، أتاك أون تايتان وغيرها الكثير."
        url={currentUrl}
        type="website"
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
