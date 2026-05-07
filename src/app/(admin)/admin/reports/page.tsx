import { prisma } from '@/lib/prisma';
import SalesReportClient from './SalesReportClient';

export const revalidate = 0;

export default async function ReportsPage() {
  // Fetch report settings
  let reportSettings = await prisma.reportSettings.findFirst();
  if (!reportSettings) {
    reportSettings = await prisma.reportSettings.create({ data: {} });
  }

  return (
    <SalesReportClient
      reportSettings={{
        storeName: reportSettings.storeName,
        storeLogo: reportSettings.storeLogo,
        storeAddress: reportSettings.storeAddress,
        storePhone: reportSettings.storePhone,
        footerText: reportSettings.footerText,
      }}
    />
  );
}
