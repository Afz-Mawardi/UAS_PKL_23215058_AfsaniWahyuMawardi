import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import HomePageClient from './page.client';
import dbData from '@/lib/db.json';

<<<<<<< HEAD
export const revalidate = 20;

const getFallbackData = () => ({
  news: (dbData.news || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  })),
  events: (dbData.events || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  })),
  gallery: (dbData.gallery || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  })),
  services: (dbData.services || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  })),
  welcomeMessage: dbData.welcomeMessage || null,
  heroSlides: (dbData.heroSlides || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  })),
  priorityPrograms: (dbData.priorityPrograms || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
    points: item.points || []
  }))
});

export default async function Page() {
  const homepageSettings = dbData.homepageSettings || null;
  let data;

  if (await checkDatabaseConnection()) {
    try {
      const [
        newsDb,
        eventsDb,
        galleryDb,
        servicesDb,
        welcomeMessageDb,
        heroSlidesDb,
        priorityProgramsDb
      ] = await Promise.all([
        prisma.news.findMany({
          where: { showOnHomepage: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, title: true, excerpt: true, category: true, date: true, imageUrl: true, author: true, featured: true, showOnHomepage: true, createdAt: true }
        }),
        prisma.event.findMany({
          where: { showOnHomepage: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, title: true, date: true, time: true, location: true, description: true, imageUrl: true, showOnHomepage: true, createdAt: true }
        }),
        prisma.galleryPhoto.findMany({
          where: { showOnHomepage: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, category: true, imageUrl: true, date: true, showOnHomepage: true, createdAt: true }
        }),
        prisma.publicService.findMany({
          where: { showOnHomepage: true },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, title: true, description: true, category: true, downloadUrl: true, fileSize: true, showOnHomepage: true, createdAt: true }
        }),
        prisma.welcomeMessage.findUnique({
          where: { id: 'default' }
        }),
        prisma.heroSlide.findMany({
          orderBy: { createdAt: 'asc' }
        }),
        prisma.priorityProgram.findMany({
          orderBy: { createdAt: 'asc' }
        })
      ]);

      data = {
        news: newsDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
        events: eventsDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
        gallery: galleryDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
        services: servicesDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
        welcomeMessage: welcomeMessageDb ? {
          name: welcomeMessageDb.name,
          nip: welcomeMessageDb.nip,
          content: welcomeMessageDb.content,
          imageUrl: welcomeMessageDb.imageUrl
        } : null,
        heroSlides: heroSlidesDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
        priorityPrograms: priorityProgramsDb.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), points: item.points as any }))
      };
    } catch (error) {
      console.warn("Database connection failed, falling back to local json storage:", error);
      data = getFallbackData();
    }
  } else {
    data = getFallbackData();
=======
export const dynamic = 'force-dynamic';

export default async function Page() {
  let news: any[] = [];
  let events: any[] = [];
  let gallery: any[] = [];
  let services: any[] = [];
  let welcomeMessage: any = null;
  let heroSlides: any[] = [];
  let priorityPrograms: any[] = [];
  const homepageSettings = dbData.homepageSettings || null;

  if (await checkDatabaseConnection()) {
    try {
      // 1. Fetch News
      const newsDb = await prisma.news.findMany({
        orderBy: { createdAt: 'desc' }
      });
      news = newsDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // 2. Fetch Events
      const eventsDb = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' }
      });
      events = eventsDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // 3. Fetch Gallery Photos
      const galleryDb = await prisma.galleryPhoto.findMany({
        orderBy: { createdAt: 'desc' }
      });
      gallery = galleryDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // 4. Fetch Public Services
      const servicesDb = await prisma.publicService.findMany({
        orderBy: { createdAt: 'desc' }
      });
      services = servicesDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // 6. Fetch Welcome Message
      const welcomeMessageDb = await prisma.welcomeMessage.findUnique({
        where: { id: 'default' }
      });
      welcomeMessage = welcomeMessageDb ? {
        name: welcomeMessageDb.name,
        nip: welcomeMessageDb.nip,
        content: welcomeMessageDb.content,
        imageUrl: welcomeMessageDb.imageUrl
      } : null;

      // 7. Fetch Hero Slides
      const heroSlidesDb = await prisma.heroSlide.findMany({
        orderBy: { createdAt: 'asc' }
      });
      heroSlides = heroSlidesDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // 9. Fetch Priority Programs
      const priorityProgramsDb = await prisma.priorityProgram.findMany({
        orderBy: { createdAt: 'asc' }
      });
      priorityPrograms = priorityProgramsDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        points: item.points as any
      }));
    } catch (error) {
      console.warn("Database connection failed, falling back to local json storage:", error);
      
      // Fallback values from dbData (db.json)
      news = (dbData.news || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));

      events = (dbData.events || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));

      gallery = (dbData.gallery || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));

      services = (dbData.services || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));

      welcomeMessage = dbData.welcomeMessage || null;

      heroSlides = (dbData.heroSlides || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));

      priorityPrograms = (dbData.priorityPrograms || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        points: item.points || []
      }));
    }
  } else {
    // Fallback values from dbData (db.json)
    news = (dbData.news || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    events = (dbData.events || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    gallery = (dbData.gallery || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    services = (dbData.services || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    welcomeMessage = dbData.welcomeMessage || null;

    heroSlides = (dbData.heroSlides || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    priorityPrograms = (dbData.priorityPrograms || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      points: item.points || []
    }));
>>>>>>> 3b8443e7e394f95a2e225c3748e84582c01e2568
  }

  return (
    <HomePageClient
<<<<<<< HEAD
      initialNews={data.news}
      initialEvents={data.events}
      initialGallery={data.gallery}
      initialServices={data.services}
      initialHeroSlides={data.heroSlides}
      initialHomepageSettings={homepageSettings || undefined}
      initialPriorityPrograms={data.priorityPrograms}
=======
      initialNews={news}
      initialEvents={events}
      initialGallery={gallery}
      initialServices={services}
      initialHeroSlides={heroSlides}
      initialHomepageSettings={homepageSettings || undefined}
      initialPriorityPrograms={priorityPrograms}
>>>>>>> 3b8443e7e394f95a2e225c3748e84582c01e2568
    />
  );
}
