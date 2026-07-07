import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import AgendaPageClient from './page.client';
import dbData from '@/lib/db.json';

<<<<<<< HEAD
export const revalidate = 20;
=======
export const dynamic = 'force-dynamic';
>>>>>>> 3b8443e7e394f95a2e225c3748e84582c01e2568

export default async function Page() {
  let events: any[] = [];
  if (await checkDatabaseConnection()) {
    try {
      const eventsDb = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' }
      });

      events = eventsDb.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));
    } catch (error) {
      console.warn("Database connection failed, falling back to local json storage:", error);
      events = (dbData.events || []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      }));
    }
  } else {
    events = (dbData.events || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));
  }

  return (
    <AgendaPageClient
      initialEvents={events}
    />
  );
}
