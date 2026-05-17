import ProfitClient from './ProfitClient';

export default function ProfitReportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analyze your revenue, COGS, and net profit</p>
      </div>
      <ProfitClient />
    </div>
  );
}
