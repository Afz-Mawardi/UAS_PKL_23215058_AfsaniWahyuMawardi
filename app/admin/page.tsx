import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import AdminClientPage from './AdminClientPage';

export default async function Page() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;
  const username = session?.user?.name || '';

  return <AdminClientPage initialIsLoggedIn={isLoggedIn} initialUsername={username} />;
}
