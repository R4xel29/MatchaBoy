'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, FileText, Download, Search, Calendar,
  TrendingUp, ShoppingCart, DollarSign, BarChart3,
  Filter, Loader2, Package, RefreshCw
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface OrderReport {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  source: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
  items: { qty: number; price: number; productName: string }[];
}

interface ReportSettings {
  storeName: string;
  storeLogo: string | null;
  storeAddress: string;
  storePhone: string;
  footerText: string;
}

interface Props {
  reportSettings: ReportSettings;
}

export default function SalesReportClient({ reportSettings }: Props) {
  const [orders, setOrders] = useState<OrderReport[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalDeliveryFees: 0, orderCount: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filter state
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let sd = startDate, ed = endDate;
      const now = new Date();
      
      if (dateRange === 'today') {
        sd = ed = now.toISOString().slice(0, 10);
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        sd = weekAgo.toISOString().slice(0, 10);
        ed = now.toISOString().slice(0, 10);
      } else if (dateRange === 'month') {
        sd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        ed = now.toISOString().slice(0, 10);
      }
      
      const params = new URLSearchParams({ startDate: sd, endDate: ed, type: typeFilter, source: sourceFilter });
      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setSummary(data.summary || { totalRevenue: 0, totalDeliveryFees: 0, orderCount: 0, avgOrderValue: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateRange, typeFilter, sourceFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredOrders = orders.filter(o =>
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customerPhone.includes(search)
  );

  // Export to Excel
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredOrders.map(o => ({
      'ID': '#' + o.id.slice(0, 8).toUpperCase(),
      'Tanggal': new Date(o.createdAt).toLocaleDateString('id-ID'),
      'Waktu': new Date(o.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      'Pelanggan': o.customerName,
      'No. HP': o.customerPhone,
      'Tipe': o.orderType,
      'Sumber': o.source,
      'Pembayaran': o.paymentMethod,
      'Items': o.items.map(i => `${i.qty}x ${i.productName}`).join(', '),
      'Subtotal': o.subtotal,
      'Ongkir': o.deliveryFee,
      'Total': o.total,
      'Status': o.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
    
    // Add summary row
    XLSX.utils.sheet_add_aoa(ws, [
      [],
      ['RINGKASAN'],
      ['Total Pendapatan', summary.totalRevenue],
      ['Jumlah Transaksi', summary.orderCount],
      ['Rata-rata Order', summary.avgOrderValue],
    ], { origin: -1 });

    XLSX.writeFile(wb, `Laporan_Penjualan_${startDate}_${endDate}.xlsx`);
  };

  // Export to PDF
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(reportSettings.storeName, 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (reportSettings.storeAddress) doc.text(reportSettings.storeAddress, 14, 27);
    if (reportSettings.storePhone) doc.text(`Tel: ${reportSettings.storePhone}`, 14, 33);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Penjualan', 14, 45);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 52);
    
    // Summary boxes
    doc.setFontSize(9);
    const summaryY = 58;
    doc.text(`Total Pendapatan: ${formatRupiah(summary.totalRevenue)}`, 14, summaryY);
    doc.text(`Jumlah Transaksi: ${summary.orderCount}`, 100, summaryY);
    doc.text(`Rata-rata: ${formatRupiah(summary.avgOrderValue)}`, 180, summaryY);

    // Table
    const tableData = filteredOrders.map(o => [
      '#' + o.id.slice(0, 8).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString('id-ID'),
      o.customerName,
      o.orderType,
      o.source,
      o.paymentMethod,
      o.items.map(i => `${i.qty}x ${i.productName}`).join(', '),
      formatRupiah(o.total),
    ]);

    autoTable(doc, {
      startY: summaryY + 6,
      head: [['ID', 'Tanggal', 'Pelanggan', 'Tipe', 'Sumber', 'Bayar', 'Items', 'Total']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [24, 68, 45], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(reportSettings.footerText, 14, doc.internal.pageSize.height - 10);
      doc.text(`Halaman ${i}/${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`Laporan_Penjualan_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Laporan Penjualan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Riwayat semua transaksi yang sudah selesai
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Pendapatan', value: formatRupiah(summary.totalRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Jumlah Transaksi', value: summary.orderCount.toString(), icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
          { label: 'Rata-rata Order', value: formatRupiah(summary.avgOrderValue), icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
          { label: 'Ongkir Terkumpul', value: formatRupiah(summary.totalDeliveryFees), icon: Package, color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter</p>
        </div>
        
        {/* Date range quick selectors */}
        <div className="flex gap-2 flex-wrap">
          {(['today', 'week', 'month', 'custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateRange === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === 'today' ? 'Hari Ini' : r === 'week' ? '7 Hari' : r === 'month' ? 'Bulan Ini' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {dateRange === 'custom' && (
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <span className="text-sm text-muted-foreground">s/d</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input type="text" placeholder="Cari pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl">
            <option value="ALL">Semua Tipe</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl">
            <option value="ALL">Semua Sumber</option>
            <option value="POS">Kasir (POS)</option>
            <option value="APP">Aplikasi</option>
          </select>
          <button onClick={fetchData} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada data untuk periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pelanggan</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipe</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sumber</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bayar</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      <br />
                      <span className="text-[10px]">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-foreground">{order.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        order.orderType === 'PICKUP' ? 'bg-purple-50 text-purple-700' : 'bg-sky-50 text-sky-700'
                      }`}>{order.orderType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        order.source === 'POS' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                      }`}>{order.source}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.paymentMethod}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {order.items.map(i => `${i.qty}× ${i.productName}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[13px] text-foreground">{formatRupiah(order.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-border/40">
                  <td colSpan={7} className="px-4 py-3 text-xs font-bold text-muted-foreground">
                    TOTAL ({filteredOrders.length} transaksi)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-base text-foreground">
                    {formatRupiah(filteredOrders.reduce((s, o) => s + o.total, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
