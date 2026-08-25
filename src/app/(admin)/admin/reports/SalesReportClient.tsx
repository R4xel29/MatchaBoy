'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, FileText, Download, Search, Calendar,
  TrendingUp, ShoppingCart, DollarSign, BarChart3,
  Filter, Loader2, Package, RefreshCw, PieChart, Coins
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  cogs?: number;
  grossProfit?: number;
  status: string;
  createdAt: string;
  items: { qty: number; price: number; cogs?: number; productName: string }[];
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
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalDeliveryFees: 0,
    totalCogs: 0,
    totalGrossProfit: 0,
    grossProfitMargin: 0,
    orderCount: 0,
    avgOrderValue: 0,
  });
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
      setSummary(data.summary || {
        totalRevenue: 0,
        totalDeliveryFees: 0,
        totalCogs: 0,
        totalGrossProfit: 0,
        grossProfitMargin: 0,
        orderCount: 0,
        avgOrderValue: 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateRange, typeFilter, sourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredOrders = orders.filter(o =>
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.customerPhone.includes(search) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  // Export to Excel
  const exportExcel = () => {
    const data = filteredOrders.map(o => ({
      'ID Pesanan': '#' + o.id.slice(0, 8).toUpperCase(),
      'Tanggal': new Date(o.createdAt).toLocaleString('id-ID'),
      'Pelanggan': o.customerName,
      'Telepon': o.customerPhone,
      'Tipe Pesanan': o.orderType,
      'Sumber': o.source,
      'Metode Bayar': o.paymentMethod,
      'Rincian Menu': o.items.map(i => `${i.qty}x ${i.productName}`).join(', '),
      'Omset (Rp)': o.total,
      'HPP Modal Bahan (Rp)': o.cogs || 0,
      'Laba Kotor (Rp)': o.grossProfit || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan & Laba Kotor');
    XLSX.writeFile(wb, `Laporan_Penjualan_Arum_Seduh_${startDate}_${endDate}.xlsx`);
  };

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.text(reportSettings.storeName || 'Arum Seduh', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(reportSettings.storeAddress, 14, 26);
    doc.text(`Telp: ${reportSettings.storePhone}`, 14, 31);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 36);

    // Summary Box
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 42, 182, 22, 3, 3, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(50);
    const summaryY = 49;
    doc.text(`Total Omset: ${formatRupiah(summary.totalRevenue)}`, 18, summaryY);
    doc.text(`HPP Bahan: ${formatRupiah(summary.totalCogs)}`, 70, summaryY);
    doc.text(`Laba Kotor: ${formatRupiah(summary.totalGrossProfit)} (${summary.grossProfitMargin}%)`, 120, summaryY);
    doc.text(`Transaksi: ${summary.orderCount} pesanan | Rata-rata: ${formatRupiah(summary.avgOrderValue)}`, 18, summaryY + 8);

    // Table
    const tableData = filteredOrders.map(o => [
      '#' + o.id.slice(0, 8).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString('id-ID'),
      o.customerName,
      o.orderType,
      o.paymentMethod,
      o.items.map(i => `${i.qty}x ${i.productName}`).join(', '),
      formatRupiah(o.total),
      formatRupiah(o.cogs || 0),
      formatRupiah(o.grossProfit || 0),
    ]);

    autoTable(doc, {
      startY: summaryY + 20,
      head: [['ID', 'Tanggal', 'Pelanggan', 'Tipe', 'Bayar', 'Items', 'Omset', 'HPP', 'Laba Kotor']],
      body: tableData,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255 }, // Orange Arum Seduh
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(reportSettings.footerText || 'Arum Seduh Official Report', 14, doc.internal.pageSize.height - 10);
      doc.text(`Halaman ${i}/${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    doc.save(`Laporan_Penjualan_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-150/80 shadow-sm">
        <div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
            Laporan Finansial & Profit
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Laporan Penjualan & Laba Kotor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Analisis omset penjualan, estimasi modal bahan baku (HPP), dan margin laba kotor
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" /> Unduh PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-slate-900">{formatRupiah(summary.totalRevenue)}</p>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Omset</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-slate-900">{formatRupiah(summary.totalCogs)}</p>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">HPP (Modal Bahan)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-base sm:text-lg font-black text-orange-600">{formatRupiah(summary.totalGrossProfit)}</p>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                  {summary.grossProfitMargin}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Laba Kotor (Gross)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-slate-900">{summary.orderCount} Transaksi</p>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                Avg: {formatRupiah(summary.avgOrderValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-slate-150/80 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Filter Periode & Sumber</p>
        </div>

        {/* Date range quick selectors */}
        <div className="flex gap-2 flex-wrap text-xs font-bold">
          {(['today', 'week', 'month', 'custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                dateRange === r
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'today' ? 'Hari Ini' : r === 'week' ? '7 Hari Terakhir' : r === 'month' ? 'Bulan Ini' : 'Kustom Tanggal'}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {dateRange === 'custom' && (
          <div className="flex gap-3 items-center pt-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pelanggan, no telp, atau ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl"
          >
            <option value="ALL">Semua Tipe Pesanan</option>
            <option value="PICKUP">Pickup</option>
            <option value="DINE_IN">Dine In</option>
            <option value="DELIVERY">Delivery</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl"
          >
            <option value="ALL">Semua Channel</option>
            <option value="POS">Kasir (POS)</option>
            <option value="APP">Aplikasi Pelanggan</option>
          </select>
          <button
            onClick={fetchData}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-150/80 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold">Tidak ada data pesanan untuk periode ini</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50/70">
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ID</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tanggal</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pelanggan</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tipe</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Bayar</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Omset</th>
                <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">HPP Bahan</th>
                <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Laba Kotor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-orange-700">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    <br />
                    <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-slate-900">{order.customerName}</p>
                    <p className="text-[10px] text-slate-400">{order.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      order.orderType === 'PICKUP' ? 'bg-purple-50 text-purple-700' :
                      order.orderType === 'DINE_IN' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {order.orderType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-semibold">{order.paymentMethod}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                    {order.items.map(i => `${i.qty}× ${i.productName}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-xs text-slate-900">{formatRupiah(order.total)}</td>
                  <td className="px-4 py-3 text-right font-bold text-xs text-slate-500">{formatRupiah(order.cogs || 0)}</td>
                  <td className="px-4 py-3 text-right font-black text-xs text-emerald-600">{formatRupiah(order.grossProfit || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={6} className="px-4 py-3 text-xs font-extrabold text-slate-600 uppercase">
                  TOTAL ({filteredOrders.length} transaksi)
                </td>
                <td className="px-4 py-3 text-right font-black text-sm text-slate-900">
                  {formatRupiah(filteredOrders.reduce((s, o) => s + o.total, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-xs text-slate-600">
                  {formatRupiah(filteredOrders.reduce((s, o) => s + (o.cogs || 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-black text-sm text-emerald-600">
                  {formatRupiah(filteredOrders.reduce((s, o) => s + (o.grossProfit || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
