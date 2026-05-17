'use client';

import { useState, useEffect } from 'react';
import { formatRupiah } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, DollarSign, Package, 
  Receipt, PieChart, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, Calendar
} from 'lucide-react';

interface ProfitData {
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  orderCount: number;
  expenseCount: number;
  range: string;
}

export default function ProfitClient() {
  const [range, setRange] = useState('today');
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/profit?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const stats = data ? [
    { 
      label: 'Total Revenue', 
      value: formatRupiah(data.totalRevenue), 
      sub: `${data.orderCount} Orders`,
      icon: DollarSign, 
      color: 'bg-blue-500',
      text: 'text-blue-600'
    },
    { 
      label: 'Total COGS (HPP)', 
      value: formatRupiah(data.totalCOGS), 
      sub: 'Material Costs',
      icon: Package, 
      color: 'bg-orange-500',
      text: 'text-orange-600'
    },
    { 
      label: 'Gross Profit', 
      value: formatRupiah(data.grossProfit), 
      sub: `${((data.grossProfit / (data.totalRevenue || 1)) * 100).toFixed(1)}% Margin`,
      icon: TrendingUp, 
      color: 'bg-emerald-500',
      text: 'text-emerald-600'
    },
    { 
      label: 'Operating Expenses', 
      value: formatRupiah(data.totalExpenses), 
      sub: `${data.expenseCount} Records`,
      icon: Receipt, 
      color: 'bg-rose-500',
      text: 'text-rose-600'
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex gap-2">
          {['today', 'week', 'month', 'all'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                ${range === r 
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-200' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          <p className="text-sm text-muted-foreground">Calculating profits...</p>
        </div>
      ) : data ? (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${s.color} text-white shadow-lg shadow-${s.color.split('-')[1]}-200`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-black text-foreground mb-1">{s.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Net Profit Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-white shadow-xl shadow-brand-200">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200 mb-2">Net Profit (Bottom Line)</p>
                <h2 className="text-4xl md:text-5xl font-black mb-2">{formatRupiah(data.netProfit)}</h2>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${data.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                    {data.netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {((data.netProfit / (data.totalRevenue || 1)) * 100).toFixed(1)}% Net Margin
                  </span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[120px]">
                  <p className="text-[10px] font-bold text-brand-200 uppercase mb-1">Revenue</p>
                  <p className="text-lg font-bold">{formatRupiah(data.totalRevenue)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[120px]">
                  <p className="text-[10px] font-bold text-brand-200 uppercase mb-1">Expenses</p>
                  <p className="text-lg font-bold">{formatRupiah(data.totalCOGS + data.totalExpenses)}</p>
                </div>
              </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-400/10 rounded-full blur-3xl"></div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                <PieChart className="w-4 h-4 text-brand-600" /> Expense Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground font-medium">COGS (Raw Materials)</span>
                  <span className="text-xs font-bold">{formatRupiah(data.totalCOGS)}</span>
                </div>
                <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full" style={{ width: `${(data.totalCOGS / (data.totalCOGS + data.totalExpenses || 1)) * 100}%` }}></div>
                </div>
                
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground font-medium">Operational Expenses</span>
                  <span className="text-xs font-bold">{formatRupiah(data.totalExpenses)}</span>
                </div>
                <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: `${(data.totalExpenses / (data.totalCOGS + data.totalExpenses || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Period Overview</h3>
                  <p className="text-xs text-muted-foreground capitalize">{range} Report</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your net profit is calculated by taking your total revenue from <strong>{data.orderCount} completed orders</strong> and subtracting the total cost of goods sold (COGS) and <strong>{data.expenseCount} manual expense records</strong>.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="py-24 text-center text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No data available for this range</p>
        </div>
      )}
    </div>
  );
}
