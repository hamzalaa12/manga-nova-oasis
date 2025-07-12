import { BookOpen, Heart, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                مانجا بلس
              </span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              منصتك المفضلة لقراءة المانجا والمانهوا والمانها مجاناً. نوفر آلاف القصص المصورة بجودة عالية وترجمة احترافية.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-red-400 mr-2" />
                صنع بحب للقراء العرب
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">الرئيسية</Link></li>
              <li><Link to="/type/manga" className="text-muted-foreground hover:text-primary transition-colors">مانجا يابانية</Link></li>
              <li><Link to="/type/manhwa" className="text-muted-foreground hover:text-primary transition-colors">مانهوا كورية</Link></li>
              <li><Link to="/type/manhua" className="text-muted-foreground hover:text-primary transition-colors">مانها صينية</Link></li>
              <li><Link to="/type/all" className="text-muted-foreground hover:text-primary transition-colors">جميع القصص</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">التصنيفات</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/genre/action" className="text-muted-foreground hover:text-primary transition-colors">أكشن</Link></li>
              <li><Link to="/genre/romance" className="text-muted-foreground hover:text-primary transition-colors">رومانسية</Link></li>
              <li><Link to="/genre/comedy" className="text-muted-foreground hover:text-primary transition-colors">كوميديا</Link></li>
              <li><Link to="/genre/adventure" className="text-muted-foreground hover:text-primary transition-colors">مغامرات</Link></li>
              <li><Link to="/genre/fantasy" className="text-muted-foreground hover:text-primary transition-colors">فانتازيا</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">تواصل معنا</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                info@mangaplus.com
              </li>
              <li className="flex items-center text-muted-foreground">
                <MessageCircle className="h-4 w-4 mr-2" />
                دعم فني 24/7
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© 2024 مانجا بلس. جميع الحقوق محفوظة.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary transition-colors">الخصوصية</a>
            <a href="#" className="hover:text-primary transition-colors">الشروط</a>
            <a href="#" className="hover:text-primary transition-colors">اتصل بنا</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;