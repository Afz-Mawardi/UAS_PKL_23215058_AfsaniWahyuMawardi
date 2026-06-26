const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const userCount = await prisma.user.count();
    const newsCount = await prisma.news.count();
    const eventCount = await prisma.event.count();
    const galleryCount = await prisma.galleryPhoto.count();
    const serviceCount = await prisma.publicService.count();
    const kepemudaanCount = await prisma.kepemudaanCard.count();
    const olahragaCount = await prisma.olahragaCard.count();
    const pariwisataCount = await prisma.pariwisataCard.count();
    const bottomCardsCount = await prisma.bidangBottomCard.count();

    console.log("Database connection successful!");
    console.log({
      userCount,
      newsCount,
      eventCount,
      galleryCount,
      serviceCount,
      kepemudaanCount,
      olahragaCount,
      pariwisataCount,
      bottomCardsCount
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
