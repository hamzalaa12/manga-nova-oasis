import MangaCard from './MangaCard';
import mangaCover1 from '@/assets/manga-cover-1.jpg';
import manhwaCover1 from '@/assets/manhwa-cover-1.jpg';
import manhuaCover1 from '@/assets/manhua-cover-1.jpg';

const mangaData = [
  {
    id: 1,
    title: 'Attack on Titan الموسم الأخير',
    cover: mangaCover1,
    rating: 9.2,
    views: '2.5M',
    status: 'مكتمل',
    genre: 'أكشن',
    lastUpdate: 'منذ يومين'
  },
  {
    id: 2,
    title: 'Solo Leveling - الصعود الوحيد',
    cover: manhwaCover1,
    rating: 9.5,
    views: '3.2M',
    status: 'مستمر',
    genre: 'خيال',
    lastUpdate: 'منذ ساعة'
  },
  {
    id: 3,
    title: 'Tales of Demons and Gods',
    cover: manhuaCover1,
    rating: 8.8,
    views: '1.8M',
    status: 'مستمر',
    genre: 'مغامرة',
    lastUpdate: 'منذ 3 ساعات'
  },
  {
    id: 4,
    title: 'Demon Slayer - قاتل الشياطين',
    cover: mangaCover1,
    rating: 9.1,
    views: '2.1M',
    status: 'مكتمل',
    genre: 'أكشن',
    lastUpdate: 'منذ يوم'
  },
  {
    id: 5,
    title: 'True Beauty - الجمال الحقيقي',
    cover: manhwaCover1,
    rating: 8.6,
    views: '1.5M',
    status: 'مستمر',
    genre: 'رومانسي',
    lastUpdate: 'منذ 5 ساعات'
  },
  {
    id: 6,
    title: 'Battle Through The Heavens',
    cover: manhuaCover1,
    rating: 8.9,
    views: '2.0M',
    status: 'مستمر',
    genre: 'خيال',
    lastUpdate: 'منذ 4 ساعات'
  }
];

interface MangaGridProps {
  title?: string;
  showAll?: boolean;
}

const MangaGrid = ({ title = 'الأحدث والأكثر شعبية', showAll = false }: MangaGridProps) => {
  const displayData = showAll ? mangaData : mangaData.slice(0, 6);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">{title}</h2>
          {!showAll && (
            <button className="text-primary hover:text-primary-glow transition-colors">
              عرض الكل ←
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {displayData.map((manga) => (
            <MangaCard
              key={manga.id}
              title={manga.title}
              cover={manga.cover}
              rating={manga.rating}
              views={manga.views}
              status={manga.status}
              genre={manga.genre}
              lastUpdate={manga.lastUpdate}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MangaGrid;