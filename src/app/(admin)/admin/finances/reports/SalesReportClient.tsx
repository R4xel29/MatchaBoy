'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, FileText, BarChart3, RefreshCw
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderReport, ReportSettings, SalesSummary } from './_components/types';
import { SalesMetricCards } from './_components/SalesMetricCards';
import { SalesReportFilters } from './_components/SalesReportFilters';
import { SalesOrderTable } from './_components/SalesOrderTable';

interface Props {
  reportSettings: ReportSettings;
}

export default function SalesReportClient({ reportSettings }: Props) {
  const [orders, setOrders] = useState<OrderReport[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text('TOTAL OMSET', 20, 49);
    doc.text('TOTAL HPP BAHAN', 65, 49);
    doc.text('TOTAL LABA KOTOR', 115, 49);
    doc.text('MARGIN LABA', 165, 49);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(formatRupiah(summary.totalRevenue), 20, 58);
    doc.text(formatRupiah(summary.totalCogs), 65, 58);
    doc.setTextColor(234, 88, 12);
    doc.text(formatRupiah(summary.totalGrossProfit), 115, 58);
    doc.text(`${summary.grossProfitMargin}%`, 165, 58);

    // Table
    const tableData = filteredOrders.map(o => [
      '#' + o.id.slice(0, 8).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString('id-ID'),
      o.customerName,
      o.orderType,
      o.paymentMethod,
      o.items.map(i => `${i.qty}× ${i.productName}`).join(', '),
      formatRupiah(o.total),
      formatRupiah(o.cogs || 0),
      formatRupiah(o.grossProfit || 0),
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['ID', 'Tanggal', 'Pelanggan', 'Tipe', 'Bayar', 'Items', 'Omset', 'HPP', 'Laba Kotor']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 16 },
        2: { cellWidth: 24 },
        3: { cellWidth: 15 },
        4: { cellWidth: 16 },
        5: { cellWidth: 40 },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 16, halign: 'right' },
        8: { cellWidth: 17, halign: 'right' },
      },
      foot: [[
        'TOTAL', '', '', '', '', `${filteredOrders.length} transaksi`,
        formatRupiah(filteredOrders.reduce((s, o) => s + o.total, 0)),
        formatRupiah(filteredOrders.reduce((s, o) => s + (o.cogs || 0), 0)),
        formatRupiah(filteredOrders.reduce((s, o) => s + (o.grossProfit || 0), 0)),
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
    });

    // Footer note
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        reportSettings.footerText || 'Dicetak otomatis melalui Sistem POS Kasir & Keuangan Arum Seduh',
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`Laporan_Penjualan_Arum_Seduh_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-150/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
            Laporan Finansial & Profit
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            Laporan Penjualan & Laba Kotor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Analisis omset penjualan, estimasi modal bahan baku (HPP), dan margin laba kotor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Unduh PDF
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SalesMetricCards summary={summary} />

      {/* Filters */}
      <SalesReportFilters
        dateRange={dateRange}
        setDateRange={(r) => {
          setDateRange(r);
          setCurrentPage(1);
        }}
        startDate={startDate}
        setStartDate={(sd) => {
          setStartDate(sd);
          setCurrentPage(1);
        }}
        endDate={endDate}
        setEndDate={(ed) => {
          setEndDate(ed);
          setCurrentPage(1);
        }}
        search={search}
        setSearch={(s) => {
          setSearch(s);
          setCurrentPage(1);
        }}
        typeFilter={typeFilter}
        setTypeFilter={(tf) => {
          setTypeFilter(tf);
          setCurrentPage(1);
        }}
        sourceFilter={sourceFilter}
        setSourceFilter={(sf) => {
          setSourceFilter(sf);
          setCurrentPage(1);
        }}
      />

      {/* Table */}
      <SalesOrderTable
        orders={filteredOrders}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
