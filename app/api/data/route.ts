import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

import {
  OFFICE_INFO,
  WELCOME_MESSAGE,
  INITIAL_HOMEPAGE_SETTINGS
} from '@/lib/data';

export const dynamic = 'force-dynamic';

// Helper function to delete local files in public/uploads/
function deleteLocalFile(fileUrl: string) {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  if (fileUrl.startsWith('/uploads/')) {
    const absolutePath = path.join(process.cwd(), 'public', fileUrl);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`Successfully deleted unused file: ${absolutePath}`);
      }
    } catch (error) {
      console.error(`Error deleting unused file: ${absolutePath}`, error);
    }
  }
}

// GET: Fetch all website contents from MySQL
export async function GET() {
  try {
    // 1. Fetch News (No fallback to mock data so deleting all items works)
    const newsDb = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const news = newsDb;

    // 2. Fetch Events (No fallback to mock data)
    const eventsDb = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const events = eventsDb;

    // 3. Fetch Gallery Photos (No fallback to mock data)
    const galleryDb = await prisma.galleryPhoto.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const gallery = galleryDb;

    // 4. Fetch Public Services (No fallback to mock data)
    const servicesDb = await prisma.publicService.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const services = servicesDb;

    // 5. Fetch Office Info
    const officeInfoDb = await prisma.officeInfo.findUnique({
      where: { id: 'default' }
    });

    let socialMediaList: any[] = [];
    if (officeInfoDb && officeInfoDb.instagramResmi && officeInfoDb.instagramResmi.startsWith('[')) {
      try {
        socialMediaList = JSON.parse(officeInfoDb.instagramResmi);
      } catch (e) {
        console.error('Failed to parse socialMediaList JSON', e);
      }
    }

    if (socialMediaList.length === 0) {
      socialMediaList = [
        { platform: 'instagram', label: 'Resmi', url: (officeInfoDb && officeInfoDb.instagramResmi && !officeInfoDb.instagramResmi.startsWith('[')) ? officeInfoDb.instagramResmi : (OFFICE_INFO.socialMedia?.instagramResmi || '') },
        { platform: 'instagram', label: 'Wisata', url: officeInfoDb?.instagramTourism || (OFFICE_INFO.socialMedia?.instagramTourism || '') },
        { platform: 'instagram', label: 'Pemuda', url: officeInfoDb?.instagramPemuda || (OFFICE_INFO.socialMedia?.instagramPemuda || '') },
        { platform: 'youtube', label: 'YouTube', url: officeInfoDb?.youtube || (OFFICE_INFO.socialMedia?.youtube || '') }
      ].filter(item => item.url !== '');

      if (socialMediaList.length === 0 && OFFICE_INFO.socialMediaList) {
        socialMediaList = OFFICE_INFO.socialMediaList;
      }
    }

    const officeInfo = officeInfoDb ? {
      address: officeInfoDb.address,
      phone: officeInfoDb.phone,
      email: officeInfoDb.email,
      operationalHours: officeInfoDb.operationalHours,
      socialMedia: {
        instagramResmi: (officeInfoDb.instagramResmi && !officeInfoDb.instagramResmi.startsWith('[')) ? officeInfoDb.instagramResmi : (socialMediaList.find(s => s.platform === 'instagram' && s.label === 'Resmi')?.url || ''),
        instagramTourism: officeInfoDb.instagramTourism,
        instagramPemuda: officeInfoDb.instagramPemuda,
        youtube: officeInfoDb.youtube
      },
      gmapsEmbedUrl: officeInfoDb.gmapsEmbedUrl,
      socialMediaList: socialMediaList
    } : OFFICE_INFO;

    // 6. Fetch Welcome Message
    const welcomeMessageDb = await prisma.welcomeMessage.findUnique({
      where: { id: 'default' }
    });
    const welcomeMessage = welcomeMessageDb ? {
      name: welcomeMessageDb.name,
      nip: welcomeMessageDb.nip,
      content: welcomeMessageDb.content,
      imageUrl: welcomeMessageDb.imageUrl
    } : WELCOME_MESSAGE;

    // 7. Fetch Hero Slides (No fallback to mock data)
    const heroSlidesDb = await prisma.heroSlide.findMany({
      orderBy: { createdAt: 'asc' }
    });
    const heroSlides = heroSlidesDb;

    // 8. Fetch Categories
    const categoriesDb = await prisma.category.findMany();
    const categories = categoriesDb.length > 0 ? {
      news: categoriesDb.filter((c: { module: string; name: string }) => c.module === 'news').map((c: { module: string; name: string }) => c.name),
      gallery: categoriesDb.filter((c: { module: string; name: string }) => c.module === 'gallery').map((c: { module: string; name: string }) => c.name),
      services: categoriesDb.filter((c: { module: string; name: string }) => c.module === 'services').map((c: { module: string; name: string }) => c.name)
    } : {
      news: ['Pariwisata', 'Olahraga', 'Kepemudaan', 'Pengumuman', 'Event'],
      gallery: ['Pariwisata', 'Olahraga', 'Kepemudaan'],
      services: ['SOP', 'Formulir', 'Berkas Layanan']
    };

    // 9. Fetch Homepage Settings
    const homepageSettingsDb = await prisma.homepageSetting.findUnique({
      where: { id: 'default' }
    });
    const homepageSettings = homepageSettingsDb ? homepageSettingsDb.data : INITIAL_HOMEPAGE_SETTINGS;

    // 10. Fetch Priority Programs (No fallback to mock data)
    const priorityProgramsDb = await prisma.priorityProgram.findMany({
      orderBy: { createdAt: 'asc' }
    });
    const priorityPrograms = priorityProgramsDb;

    // 11. Fetch Admin Users (excluding password for security)
    const usersDb = await prisma.user.findMany({
      select: { id: true, username: true }
    });
    const users = usersDb.length > 0 ? usersDb : [
      { id: 'slide-admin-1', username: 'admin123' },
      { id: 'slide-admin-2', username: 'admin' }
    ];

    return NextResponse.json({
      news,
      events,
      gallery,
      services,
      officeInfo,
      welcomeMessage,
      heroSlides,
      categories,
      homepageSettings,
      priorityPrograms,
      users
    });
  } catch (error) {
    console.error('Failed to read database', error);
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

// POST: Sync frontend changes to MySQL and delete unused files
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;
    
    if (type === 'news') {
      const newsArray = data.map((item: any) => ({
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
      }));

      // Delete orphaned local files/images
      const existingNews = await prisma.news.findMany();
      const newImageUrls = new Set(newsArray.map((n: any) => n.imageUrl).filter(Boolean));
      for (const item of existingNews) {
        if (item.imageUrl && !newImageUrls.has(item.imageUrl)) {
          deleteLocalFile(item.imageUrl);
        }
      }

      await prisma.$transaction([
        prisma.news.deleteMany(),
        prisma.news.createMany({ data: newsArray })
      ]);
    } else if (type === 'events') {
      const eventsArray = data.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        date: item.date || '',
        time: item.time || '',
        location: item.location || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        showOnHomepage: item.showOnHomepage ?? true
      }));

      // Delete orphaned local files/images
      const existingEvents = await prisma.event.findMany();
      const newImageUrls = new Set(eventsArray.map((e: any) => e.imageUrl).filter(Boolean));
      for (const item of existingEvents) {
        if (item.imageUrl && !newImageUrls.has(item.imageUrl)) {
          deleteLocalFile(item.imageUrl);
        }
      }

      await prisma.$transaction([
        prisma.event.deleteMany(),
        prisma.event.createMany({ data: eventsArray })
      ]);
    } else if (type === 'gallery') {
      const galleryArray = data.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        category: item.category || '',
        imageUrl: item.imageUrl || '',
        showOnHomepage: item.showOnHomepage ?? true
      }));

      // Delete orphaned local files/images
      const existingGallery = await prisma.galleryPhoto.findMany();
      const newImageUrls = new Set(galleryArray.map((g: any) => g.imageUrl).filter(Boolean));
      for (const item of existingGallery) {
        if (item.imageUrl && !newImageUrls.has(item.imageUrl)) {
          deleteLocalFile(item.imageUrl);
        }
      }

      await prisma.$transaction([
        prisma.galleryPhoto.deleteMany(),
        prisma.galleryPhoto.createMany({ data: galleryArray })
      ]);
    } else if (type === 'services') {
      const servicesArray = data.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        downloadUrl: item.downloadUrl || '#',
        fileSize: item.fileSize || '0 KB',
        showOnHomepage: item.showOnHomepage ?? true
      }));

      // Delete orphaned local files/documents
      const existingServices = await prisma.publicService.findMany();
      const newDownloadUrls = new Set(servicesArray.map((s: any) => s.downloadUrl).filter(Boolean));
      for (const item of existingServices) {
        if (item.downloadUrl && !newDownloadUrls.has(item.downloadUrl)) {
          deleteLocalFile(item.downloadUrl);
        }
      }

      await prisma.$transaction([
        prisma.publicService.deleteMany(),
        prisma.publicService.createMany({ data: servicesArray })
      ]);
    } else if (type === 'officeInfo') {
      const listStr = JSON.stringify(data.socialMediaList || []);
      await prisma.officeInfo.upsert({
        where: { id: 'default' },
        update: {
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          operationalHours: data.operationalHours || '',
          instagramResmi: listStr,
          instagramTourism: data.socialMedia?.instagramTourism || '',
          instagramPemuda: data.socialMedia?.instagramPemuda || '',
          youtube: data.socialMedia?.youtube || '',
          gmapsEmbedUrl: data.gmapsEmbedUrl || ''
        },
        create: {
          id: 'default',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          operationalHours: data.operationalHours || '',
          instagramResmi: listStr,
          instagramTourism: data.socialMedia?.instagramTourism || '',
          instagramPemuda: data.socialMedia?.instagramPemuda || '',
          youtube: data.socialMedia?.youtube || '',
          gmapsEmbedUrl: data.gmapsEmbedUrl || ''
        }
      });
    } else if (type === 'categories') {
      const categoriesToInsert: { module: string; name: string }[] = [];
      if (data.news && Array.isArray(data.news)) {
        for (const cat of data.news) categoriesToInsert.push({ module: 'news', name: cat });
      }
      if (data.gallery && Array.isArray(data.gallery)) {
        for (const cat of data.gallery) categoriesToInsert.push({ module: 'gallery', name: cat });
      }
      if (data.services && Array.isArray(data.services)) {
        for (const cat of data.services) categoriesToInsert.push({ module: 'services', name: cat });
      }

      await prisma.$transaction([
        prisma.category.deleteMany(),
        prisma.category.createMany({ data: categoriesToInsert })
      ]);
    } else if (type === 'welcomeMessage') {
      const existingWelcome = await prisma.welcomeMessage.findUnique({
        where: { id: 'default' }
      });
      const newImageUrl = data.imageUrl || '';
      if (existingWelcome && existingWelcome.imageUrl && existingWelcome.imageUrl !== newImageUrl) {
        deleteLocalFile(existingWelcome.imageUrl);
      }

      await prisma.welcomeMessage.upsert({
        where: { id: 'default' },
        update: {
          name: data.name || '',
          nip: data.nip || '',
          content: data.content || '',
          imageUrl: newImageUrl
        },
        create: {
          id: 'default',
          name: data.name || '',
          nip: data.nip || '',
          content: data.content || '',
          imageUrl: newImageUrl
        }
      });
    } else if (type === 'heroSlides') {
      const slidesArray = data.map((item: any) => ({
        id: item.id,
        image: item.image || '',
        tagline: item.tagline || '',
        title: item.title || '',
        cta: item.cta || '',
        href: item.href || ''
      }));

      // Delete orphaned local files/images
      const existingSlides = await prisma.heroSlide.findMany();
      const newImageUrls = new Set(slidesArray.map((s: any) => s.image).filter(Boolean));
      for (const item of existingSlides) {
        if (item.image && !newImageUrls.has(item.image)) {
          deleteLocalFile(item.image);
        }
      }

      await prisma.$transaction([
        prisma.heroSlide.deleteMany(),
        prisma.heroSlide.createMany({ data: slidesArray })
      ]);
    } else if (type === 'priorityPrograms') {
      const programsArray = data.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        points: item.points || []
      }));

      await prisma.$transaction([
        prisma.priorityProgram.deleteMany(),
        prisma.priorityProgram.createMany({ data: programsArray })
      ]);
    } else if (type === 'homepageSettings') {
      await prisma.homepageSetting.upsert({
        where: { id: 'default' },
        update: { data: data },
        create: { id: 'default', data: data }
      });
    } else if (type === 'adminAccount') {
      const { username: oldUsername, newUsername, newPassword } = data;
      const user = await prisma.user.findUnique({
        where: { username: oldUsername }
      });
      if (!user) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }

      const updateData: any = {};
      if (newUsername) {
        if (newUsername !== oldUsername) {
          const existing = await prisma.user.findUnique({
            where: { username: newUsername }
          });
          if (existing) {
            return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
          }
        }
        updateData.username = newUsername;
      }
      if (newPassword) {
        const crypto = require('crypto');
        const md5Password = crypto.createHash('md5').update(newPassword).digest('hex');
        updateData.password = md5Password;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    } else if (type === 'createAdmin') {
      const { username, password } = data;
      if (!username || !password) {
        return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({
        where: { username }
      });
      if (existing) {
        return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
      }
      const crypto = require('crypto');
      const md5Password = crypto.createHash('md5').update(password).digest('hex');
      await prisma.user.create({
        data: {
          username,
          password: md5Password
        }
      });
    } else if (type === 'deleteAdmin') {
      const { id } = data;
      const count = await prisma.user.count();
      if (count <= 1) {
        return NextResponse.json({ error: 'Tidak dapat menghapus admin terakhir' }, { status: 400 });
      }
      await prisma.user.delete({
        where: { id }
      });
    } else {
      return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update database', error);
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
