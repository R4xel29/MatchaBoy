/**
 * Helper to calculate the next trigger time for an Auto-Reorder schedule.
 * 
 * @param frequency - 'DAILY', 'WEEKLY', or 'MONTHLY'
 * @param dayOfWeek - 0-6 (Sunday-Saturday), used for 'WEEKLY'
 * @param dayOfMonth - 1-31, used for 'MONTHLY'
 * @param timeSlot - time of day in format 'HH:mm'
 * @param referenceDate - the starting date/time to calculate from (defaults to now)
 */
export function calculateNextTriggeredAt(
    frequency: string,
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
