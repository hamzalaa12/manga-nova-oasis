import Header from '@/components/Header';
import Hero from '@/components/Hero';
import MangaGrid from '@/components/MangaGrid';
import Footer from '@/components/Footer';
import AdminPanel from '@/components/AdminPanel';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <MangaGrid />
      <Footer />
      <AdminPanel />
    </div>
  );
};

export default Index;
