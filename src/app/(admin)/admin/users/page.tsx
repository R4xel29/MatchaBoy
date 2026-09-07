import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShieldAlert, Pencil } from 'lucide-react';
import RoleSelect from './role-select';
import ImpersonateButton from './impersonate-button';
import CreateStaffModal from './CreateStaffModal';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: { not: 'CUSTOMER' } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Pengelolaan Admin & Staf</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} staf & admin terdaftar di sistem Arum Seduh</p>
        </div>
        <CreateStaffModal />
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role Access</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground/50">
                <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" /> No users found
              </td></tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group/user">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden shrink-0">
                        {user.image ? (
                          <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                        ) : (
                          (user.name || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground text-[13px] group-hover/user:text-orange-600 transition-colors">
                          {user.name || 'Unknown'}
                        </span>
                        <p className="text-[10px] text-muted-foreground group-hover/user:text-orange-500 transition-colors">
                          Lihat Detail & Edit →
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{user.email || '-'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{user.phone || '-'}</td>
                  <td className="px-5 py-3.5">
                    <RoleSelect userId={user.id} currentRole={user.role} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity items-center">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                        title="Edit Profil & Password"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Detail & Edit</span>
                      </Link>
                      <ImpersonateButton userId={user.id} userName={user.name || 'User'} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[12px] text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50 bg-white rounded-2xl border border-border/40">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" /> <p className="text-sm">No users found</p>
          </div>
        ) : (
          users.map((user: any) => (
            <div key={user.id} className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 mb-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0">
                  {user.image ? (
                    <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    (user.name || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[13px] truncate group-hover:text-orange-600 transition-colors">
                    {user.name || 'Unknown'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email || '-'}</p>
                  <p className="text-[10px] text-orange-500 font-medium">Lihat Detail & Edit Profil →</p>
                </div>
              </Link>
              
              <div className="pt-2 border-t border-border/30 mb-2 flex items-center justify-between gap-2">
                <RoleSelect userId={user.id} currentRole={user.role} />
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200"
                    title="Detail & Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <ImpersonateButton userId={user.id} userName={user.name || 'User'} />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30 bg-gray-50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                <span>{user.phone || 'No phone'}</span>
                <span>{new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
