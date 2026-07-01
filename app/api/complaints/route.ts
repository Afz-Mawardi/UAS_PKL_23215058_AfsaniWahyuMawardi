import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper to delete local file if the complaint is deleted
import fs from 'fs';
import path from 'path';

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
      console.error(`Error deleting file: ${absolutePath}`, error);
    }
  }
}

// GET: Retrieve all complaints for Admin Panel
export async function GET() {
  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, complaints });
  } catch (error: any) {
    console.error('Failed to get complaints:', error);
    return NextResponse.json({ error: 'Failed to retrieve complaints data.' }, { status: 500 });
  }
}

// POST: Public submission of a new complaint
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, imageUrl, contact } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul pengaduan wajib diisi.' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Isi pengaduan wajib diisi.' }, { status: 400 });
    }

    const newComplaint = await prisma.complaint.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl ? imageUrl.trim() : '',
        contact: contact ? contact.trim() : '',
        status: 'Baru',
        notes: ''
      }
    });

    return NextResponse.json({ success: true, complaint: newComplaint });
  } catch (error: any) {
    console.error('Failed to create complaint:', error);
    return NextResponse.json({ error: 'Gagal mengirim pengaduan.' }, { status: 500 });
  }
}

// PATCH: Update complaint status and admin notes (Admin)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengaduan tidak ditemukan.' }, { status: 400 });
    }

    const existing = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data pengaduan tidak ditemukan.' }, { status: 444 });
    }

    await prisma.complaint.update({
      where: { id },
      data: {
        status: status || existing.status,
        notes: notes !== undefined ? notes.trim() : existing.notes
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update complaint:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status pengaduan.' }, { status: 500 });
  }
}

// DELETE: Delete complaint(s) and uploaded attachment image(s) (Admin)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let ids: string[] = [];

    if (id) {
      ids = id.split(',');
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.ids && Array.isArray(body.ids)) {
        ids = body.ids;
      } else if (body.id) {
        ids = [body.id];
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ID pengaduan tidak valid.' }, { status: 400 });
    }

    const complaints = await prisma.complaint.findMany({
      where: { id: { in: ids } }
    });

    if (complaints.length === 0) {
      return NextResponse.json({ error: 'Data pengaduan tidak ditemukan.' }, { status: 404 });
    }

    // Delete attachment if exists
    for (const complaint of complaints) {
      if (complaint.imageUrl) {
        deleteLocalFile(complaint.imageUrl);
      }
    }

    await prisma.complaint.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete complaints:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengaduan.' }, { status: 500 });
  }
}
