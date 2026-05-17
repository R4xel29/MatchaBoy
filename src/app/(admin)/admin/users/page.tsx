import { prisma } from '@/lib/prisma';
import { ShieldAlert } from 'lucide-react';
import RoleSelect from './role-select';
import ImpersonateButton from './impersonate-button';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: { not: 'CUSTOMER' } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Pengelolaan Admin & Staf</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users.length} admin/staf terdaftar</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {(user.name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground text-[13px]">{user.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{user.email || '-'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{user.phone || '-'}</td>
                  <td className="px-5 py-3.5">
                    <RoleSelect userId={user.id} currentRole={user.role} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[13px] truncate">{user.name || 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email || '-'}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border/30 mb-2 flex items-center justify-between">
                <RoleSelect userId={user.id} currentRole={user.role} />
                <ImpersonateButton userId={user.id} userName={user.name || 'User'} />
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
