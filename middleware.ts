import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Blokir halaman login bawaan NextAuth
  if (pathname === '/api/auth/signin') {
    return NextResponse.redirect(new URL('/login.admin', req.url));
  }

  // Proteksi rute admin: jika belum login, tampilkan halaman 404 bawaan Next.js dengan redirect
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admins')) {
    if (!token) {
      return NextResponse.redirect(new URL('/404', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admins/:path*',
    '/admin/:path*',
    '/api/auth/signin'
  ]
};
