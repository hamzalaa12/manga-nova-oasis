import { Sword, Heart, Zap, Crown, Shield, Sparkles } from 'lucide-react';

const categories = [
  { name: 'أكشن', icon: Sword, color: 'text-red-400', bgColor: 'bg-red-400/10' },
  { name: 'رومانسي', icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
  { name: 'خيال', icon: Sparkles, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  { name: 'مغامرة', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  { name: 'تاريخي', icon: Crown, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  { name: 'دراما', icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
];

const Categories = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          تصفح حسب التصنيف
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div 
                key={category.name}
                className="group cursor-pointer"
              >
                <div className={`${category.bgColor} rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <Icon className={`h-8 w-8 ${category.color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
                  <span className="font-medium text-foreground">{category.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;