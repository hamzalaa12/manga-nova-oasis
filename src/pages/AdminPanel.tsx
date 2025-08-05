import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminDashboard from '@/components/AdminDashboard';
import SEO from '@/components/SEO';

const AdminPanel = () => {
  const { userRole } = useAuth();
  const isAdmin = ['tribe_leader', 'admin', 'site_admin'].includes(userRole as string);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="لوحة الإدارة - غير مخول"
          description="ليس لديك صلاحية للوصول لهذه ��لصفحة"
          url="/admin"
          type="website"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">غير مخول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="لوحة الإدارة - مانجا العرب"
        description="إدارة المستخدمين والمحتوى والإبلاغات"
        url="/admin"
        type="website"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">لوحة الإدارة</h1>
          <p className="text-muted-foreground">إدارة شاملة للمستخدمين والمحتوى والإبلاغات</p>
        </div>

        <AdminDashboard />
      </div>

      <Footer />
    </div>
  );
};

export default AdminPanel;
