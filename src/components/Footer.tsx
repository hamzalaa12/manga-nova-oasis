import { BookOpen, Heart, Mail, MessageCircle } from 'lucide-react';

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
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">الرئيسية</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">مانجا يابانية</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">مانهوا كورية</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">مانها صينية</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">الأكثر شعبية</a></li>
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