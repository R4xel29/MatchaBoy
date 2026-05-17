import { prisma } from '@/lib/prisma';
import { 
  UserX, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import UnbanButton from './unban-button';

export const revalidate = 0;

export default async function BlacklistPage() {
  const bannedContacts = await prisma.bannedContact.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Blacklist Akun</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daftar email dan nomor HP yang diblokir dari sistem
          </p>
        </div>
      </div>

      <div className="bg-white border border-border/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tipe</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Identitas (Email/HP)</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Alasan</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Diblokir Pada</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {bannedContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <ShieldAlert className="w-12 h-12" />
                      <p className="text-sm font-medium">Tidak ada data blacklist</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bannedContacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        contact.type === 'EMAIL' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {contact.type === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {contact.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {contact.value}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground italic text-xs">
                      {contact.reason || 'Banned by administrator'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(contact.createdAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UnbanButton id={contact.id} value={contact.value} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden divide-y divide-border/30">
          {bannedContacts.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="flex flex-col items-center gap-3 opacity-30">
                <ShieldAlert className="w-12 h-12" />
                <p className="text-sm font-medium">Tidak ada data blacklist</p>
              </div>
            </div>
          ) : (
            bannedContacts.map((contact) => (
              <div key={contact.id} className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    contact.type === 'EMAIL' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {contact.type === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                    {contact.type}
                  </div>
                  <UnbanButton id={contact.id} value={contact.value} />
                </div>
                <div>
                  <p className="font-bold text-foreground break-all">{contact.value}</p>
                  <p className="text-[11px] text-muted-foreground italic mt-1">{contact.reason || 'Banned by administrator'}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border/10">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(contact.createdAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
