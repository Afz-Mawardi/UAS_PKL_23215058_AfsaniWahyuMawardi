import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import ProfilPageClient from './page.client';
import dbData from '@/lib/db.json';

<<<<<<< HEAD
export const revalidate = 20;
=======
export const dynamic = 'force-dynamic';
>>>>>>> 3b8443e7e394f95a2e225c3748e84582c01e2568

export default async function Page() {
  let welcomeMessage: any = undefined;
  
  if (await checkDatabaseConnection()) {
    try {
      const welcomeMessageDb = await prisma.welcomeMessage.findUnique({
        where: { id: 'default' }
      });
      welcomeMessage = welcomeMessageDb || undefined;
    } catch (error) {
      console.warn("Database connection failed, falling back to local json storage:", error);
      welcomeMessage = dbData.welcomeMessage || undefined;
    }
  } else {
    welcomeMessage = dbData.welcomeMessage || undefined;
  }

  return (
    <ProfilPageClient
      initialWelcomeMessage={welcomeMessage}
    />
  );
}
