import { prisma } from '@/lib/prisma';
import { Activity } from 'lucide-react';
import { UrlPagination } from '@/components/ui/UrlPagination';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 20;

  const [totalLogs, logs] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalLogs / pageSize) || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track admin and system activities</p>
      </div>

      <div className="bg-white border border-border/40 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground/50">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" /> 
                    <p className="mt-2">No activity logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="group hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-[12px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-[13px]">{log.user?.name || 'Unknown'}</span>
                        <span className="text-[11px] text-muted-foreground">{log.user?.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${
                          log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      `}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-foreground/80 bg-muted/80 px-2 py-1 rounded-md border border-border/50">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground min-w-[200px]">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-border/30 bg-gray-50/50">
          <UrlPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalLogs}
            pageSize={pageSize}
          />
        </div>
      </div>
    </div>
  );
}
