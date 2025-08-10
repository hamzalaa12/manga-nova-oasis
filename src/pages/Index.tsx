import { Suspense, lazy } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import AdminPanel from "@/components/AdminPanel";
import SEO from "@/components/SEO";
import SEOLinks from "@/components/SEOLinks";
import { generatePageMeta, generateStructuredData } from "@/utils/seo";
import { Skeleton } from "@/components/ui/skeleton";

// تحميل كسول للمكونات الثقيلة
const MangaGrid = lazy(() => import("@/components/MangaGrid"));
const ChaptersGrid = lazy(() => import("@/components/ChaptersGrid"));

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
      
      <Suspense fallback={
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48 mb-12 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </section>
      }>
        <ChaptersGrid />
      </Suspense>
      
      <Suspense fallback={
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48 mb-12 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </section>
      }>
        <MangaGrid />
      </Suspense>
      
      <Footer />
      <AdminPanel />
    </div>
  );
};

export default Index;
