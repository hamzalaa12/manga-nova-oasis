import { Search, Menu, BookOpen, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Header = () => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              مانجا بلس
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="nav-link text-foreground hover:text-primary transition-colors">
              الرئيسية
            </a>
            <a href="#" className="nav-link text-foreground hover:text-primary transition-colors">
              مانجا
            </a>
            <a href="#" className="nav-link text-foreground hover:text-primary transition-colors">
              مانهوا
            </a>
            <a href="#" className="nav-link text-foreground hover:text-primary transition-colors">
              مانها
            </a>
            <a href="#" className="nav-link text-foreground hover:text-primary transition-colors">
              الأكثر شعبية
            </a>
          </nav>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن مانجا..."
                className="pl-10 w-64 search-glow bg-input border-border focus:border-primary"
              />
            </div>
            
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;