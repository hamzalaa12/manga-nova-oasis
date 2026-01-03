import { Play, Star, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-manga.jpg';
const Hero = () => {
  return <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="Hero Manga" className="w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient opacity-90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">mangafas</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            اكتشف آلاف القصص المصورة من اليابان وكوريا والصين. اقرأ أحدث الفصول مجاناً
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="btn-glow text-lg px-8 py-6">
              <Play className="mr-2 h-5 w-5" />
              ابدأ القراءة
            </Button>
            
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary/50 hover:bg-primary/10">
              <Star className="mr-2 h-5 w-5" />
              الأكثر شعبية
            </Button>
          </div>
        </div>

        {/* Stats */}
        
      </div>
    </section>;
};
export default Hero;