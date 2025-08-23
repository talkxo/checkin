import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  if (!isAdminAuthenticated()) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
