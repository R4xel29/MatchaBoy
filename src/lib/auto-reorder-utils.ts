/**
 * Tipe frekuensi pengulangan pesanan otomatis pelanggan.
 */
export type ReorderFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Menghitung jadwal waktu pemicu berikutnya (*next triggered at*) untuk fitur Auto-Reorder.
 *
 * Mendukung frekuensi harian (Daily), mingguan (Weekly dengan `dayOfWeek` 0=Minggu s/d 6=Sabtu),
 * dan bulanan (Monthly dengan `dayOfMonth` 1-31 serta penyesuaian otomatis batas hari dalam bulan).
 *
 * @param {ReorderFrequency | string} frequency - Jenis frekuensi jadwal ('DAILY', 'WEEKLY', atau 'MONTHLY')
 * @param {number | null} dayOfWeek - Hari dalam pekan (0 = Minggu, 6 = Sabtu) untuk tipe WEEKLY
 * @param {number | null} dayOfMonth - Tanggal dalam bulan (1 - 31) untuk tipe MONTHLY
 * @param {string} timeSlot - Waktu eksekusi harian dalam format string "HH:mm" (contoh: "08:30")
 * @param {Date} [referenceDate=new Date()] - Tanggal acuan perhitungan jadwal (default: waktu sekarang)
 * @returns {Date} Objek `Date` waktu jadwal pemicu berikutnya
 *
 * @example
 * ```typescript
 * const nextTime = calculateNextTriggeredAt('WEEKLY', 1, null, '09:00');
 * console.log('Jadwal Senin Depan:', nextTime.toISOString());
 * ```
 */
export function calculateNextTriggeredAt(
    frequency: ReorderFrequency | string,
    dayOfWeek: number | null,
    dayOfMonth: number | null,
    timeSlot: string,
    referenceDate = new Date()
): Date {
    const [hours, minutes] = timeSlot.split(":").map(Number);
    let nextDate = new Date(referenceDate);
    nextDate.setHours(hours, minutes, 0, 0);

    if (frequency === "DAILY") {
        if (nextDate <= referenceDate) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    } else if (frequency === "WEEKLY") {
        const targetDay = dayOfWeek !== null ? dayOfWeek : 0;
        const currentDay = nextDate.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && nextDate <= referenceDate) {
            daysToAdd = 7;
        }
        nextDate.setDate(nextDate.getDate() + daysToAdd);
    } else if (frequency === "MONTHLY") {
        const targetDayOfMonth = dayOfMonth !== null ? dayOfMonth : 1;
        
        // Find number of days in the month to clamp invalid days (like Feb 30)
        const year = nextDate.getFullYear();
        const month = nextDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const clampedDay = Math.min(targetDayOfMonth, daysInMonth);
        nextDate.setDate(clampedDay);

        if (nextDate <= referenceDate) {
            // Move to next month
            nextDate = new Date(referenceDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setHours(hours, minutes, 0, 0);
            
            const nextYear = nextDate.getFullYear();
            const nextMonth = nextDate.getMonth();
            const nextDaysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
            nextDate.setDate(Math.min(targetDayOfMonth, nextDaysInMonth));
        }
    }
    
    return nextDate;
}
