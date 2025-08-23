import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if admin is authenticated
  if (!isAdminAuthenticated()) {
    // Redirect to login with current path as redirect parameter
    const currentPath = '/admin'; // You can make this dynamic if needed
    redirect(`/admin/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
