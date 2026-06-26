import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing records in correct order to avoid foreign key issues
  await prisma.user.deleteMany();
  await prisma.news.deleteMany();
  await prisma.event.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.publicService.deleteMany();
  await prisma.officeInfo.deleteMany();
  await prisma.welcomeMessage.deleteMany();
  await prisma.heroSlide.deleteMany();
  await prisma.category.deleteMany();
  await prisma.homepageSetting.deleteMany();
  await prisma.priorityProgram.deleteMany();


  // 2. Hash admin password with MD5 and insert Users
  const md5Password = crypto.createHash('md5').update('admin123').digest('hex');
  await prisma.user.create({
    data: {
      username: 'admin123',
      password: md5Password
    }
  });
  await prisma.user.create({
    data: {
      username: 'admin',
      password: md5Password
    }
  });
  console.log('Admin users seeded with MD5 (admin and admin123).');

  // 3. Read db.json
  const dbPath = path.join(process.cwd(), 'lib', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('db.json not found, seeding only admin user.');
    return;
  }

  const fileContent = fs.readFileSync(dbPath, 'utf-8');
  const dbData = JSON.parse(fileContent);

  // 4. Seed News
  if (dbData.news && Array.isArray(dbData.news)) {
    for (const item of dbData.news) {
      await prisma.news.create({
        data: {
          id: item.id,
          title: item.title || '',
          excerpt: item.excerpt || '',
          content: item.content || '',
          category: item.category || '',
          date: item.date || '',
          imageUrl: item.imageUrl || '',
          author: item.author || '',
          featured: item.featured ?? false,
          showOnHomepage: item.showOnHomepage ?? true
        }
      });
    }
    console.log(`Seeded ${dbData.news.length} news items.`);
  }

  // 5. Seed Events
  if (dbData.events && Array.isArray(dbData.events)) {
    for (const item of dbData.events) {
      await prisma.event.create({
        data: {
          id: item.id,
          title: item.title || '',
          date: item.date || '',
          time: item.time || '',
          location: item.location || '',
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          showOnHomepage: item.showOnHomepage ?? true
        }
      });
    }
    console.log(`Seeded ${dbData.events.length} events.`);
  }

  // 6. Seed Gallery Photos
  if (dbData.gallery && Array.isArray(dbData.gallery)) {
    for (const item of dbData.gallery) {
      await prisma.galleryPhoto.create({
        data: {
          id: item.id,
          title: item.title || '',
          category: item.category || '',
          imageUrl: item.imageUrl || '',
          showOnHomepage: item.showOnHomepage ?? true
        }
      });
    }
    console.log(`Seeded ${dbData.gallery.length} gallery photos.`);
  }

  // 7. Seed Public Services (Berkas Layanan)
  if (dbData.services && Array.isArray(dbData.services)) {
    for (const item of dbData.services) {
      await prisma.publicService.create({
        data: {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          category: item.category || '',
          downloadUrl: item.downloadUrl || '#',
          fileSize: item.fileSize || '0 KB',
          showOnHomepage: item.showOnHomepage ?? true
        }
      });
    }
    console.log(`Seeded ${dbData.services.length} public services.`);
  }

  // 8. Seed Office Info
  if (dbData.officeInfo) {
    const info = dbData.officeInfo;
    await prisma.officeInfo.create({
      data: {
        id: 'default',
        address: info.address || '',
        phone: info.phone || '',
        email: info.email || '',
        operationalHours: info.operationalHours || '',
        instagramResmi: info.socialMedia?.instagramResmi || '',
        instagramTourism: info.socialMedia?.instagramTourism || '',
        instagramPemuda: info.socialMedia?.instagramPemuda || '',
        youtube: info.socialMedia?.youtube || '',
        gmapsEmbedUrl: info.gmapsEmbedUrl || ''
      }
    });
    console.log('Seeded office info.');
  }

  // 9. Seed Welcome Message
  if (dbData.welcomeMessage) {
    const wm = dbData.welcomeMessage;
    await prisma.welcomeMessage.create({
      data: {
        id: 'default',
        name: wm.name || '',
        nip: wm.nip || '',
        content: wm.content || '',
        imageUrl: wm.imageUrl || ''
      }
    });
    console.log('Seeded welcome message.');
  }

  // 10. Seed Hero Slides
  if (dbData.heroSlides && Array.isArray(dbData.heroSlides)) {
    for (const item of dbData.heroSlides) {
      await prisma.heroSlide.create({
        data: {
          id: item.id,
          image: item.image || '',
          tagline: item.tagline || '',
          title: item.title || '',
          cta: item.cta || '',
          href: item.href || ''
        }
      });
    }
    console.log(`Seeded ${dbData.heroSlides.length} hero slides.`);
  }

  // 11. Seed Categories
  if (dbData.categories) {
    const cats = dbData.categories;
    const toInsert = [];
    if (Array.isArray(cats.news)) {
      for (const cat of cats.news) toInsert.push({ module: 'news', name: cat });
    }
    if (Array.isArray(cats.gallery)) {
      for (const cat of cats.gallery) toInsert.push({ module: 'gallery', name: cat });
    }
    if (Array.isArray(cats.services)) {
      for (const cat of cats.services) toInsert.push({ module: 'services', name: cat });
    }

    for (const item of toInsert) {
      await prisma.category.create({
        data: item
      });
    }
    console.log(`Seeded ${toInsert.length} categories.`);
  }

  // 12. Seed Homepage Settings
  if (dbData.homepageSettings) {
    await prisma.homepageSetting.create({
      data: {
        id: 'default',
        data: dbData.homepageSettings
      }
    });
    console.log('Seeded homepage settings.');
  }

  // 13. Seed Priority Programs
  if (dbData.priorityPrograms && Array.isArray(dbData.priorityPrograms)) {
    for (const item of dbData.priorityPrograms) {
      await prisma.priorityProgram.create({
        data: {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          points: item.points || []
        }
      });
    }
    console.log(`Seeded ${dbData.priorityPrograms.length} priority programs.`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
