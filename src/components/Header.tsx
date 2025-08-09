import { Search, User, Menu, LogOut, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              مانجا لو
            </h1>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-foreground hover:text-primary transition-colors"
            >
              الرئيسية
            </Link>
            <Link
              to="/type/manga"
              className="text-foreground hover:text-primary transition-colors"
            >
              مانجا
            </Link>
            <Link
              to="/type/manhwa"
              className="text-foreground hover:text-primary transition-colors"
            >
              مانهوا
            </Link>
            <Link
              to="/type/manhua"
              className="text-foreground hover:text-primary transition-colors"
            >
              مانها
            </Link>
            <Link
              to="/support"
              className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Heart className="h-4 w-4" />
              دعم الموقع
            </Link>
            <Link
              to="/ads"
              className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <span className="h-4 w-4 text-green-500">📢</span>
              مشاهدة إعلان
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مانجا..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  {user.email}
                  {isAdmin && (
                    <span className="mr-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      أدمن
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="h-4 w-4 ml-2" />
                    الملف الشخصي
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
