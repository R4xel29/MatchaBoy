/**
 * Store Hours Utility for Arum Seduh
 * Provides unified store operational status checks for Storefront, SPMB, and API routes.
 */

export interface StoreHoursConfig {
  openTime?: string | null;
  closeTime?: string | null;
  spmbStartTime?: string | null;
  spmbEndTime?: string | null;
  spmbCloseTime?: string | null;
  operationalDays?: string | null;
  disabledDates?: string | null;
  customHours?: string | null;
}

export type StoreClosedReason = 'DAY_OFF' | 'HOLIDAY' | 'OUTSIDE_HOURS';

export interface StoreOperationalStatus {
  isOpen: boolean;
  reason: StoreClosedReason | null;
  message: string;
  openTime: string;
  closeTime: string;
  currentJakartaTime: string;
  todayDateStr: string;
  dayOfWeek: number;
}

/**
 * Parses HH:mm string to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Gets current date (YYYY-MM-DD) and time (HH:mm) in Asia/Jakarta (WIB)
 */
export function getJakartaNow(): { dateStr: string; timeStr: string; currentMinutes: number; dayOfWeek: number } {
  const now = new Date();
  
  let dateStr = '';
  try {
    dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  } catch {
    dateStr = now.toISOString().split('T')[0];
  }

  let timeStr = '';
  try {
    timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
  } catch {
    timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(yr, mo - 1, dy).getDay();
  const currentMinutes = timeStringToMinutes(timeStr);

  return { dateStr, timeStr, currentMinutes, dayOfWeek };
}

/**
 * Resolves effective open and close times for a specific date considering customHours overrides
 */
export function getEffectiveStoreHours(
  config: StoreHoursConfig,
  dateStr: string,
  dayOfWeek: number,
  options: { isSpmb?: boolean } = { isSpmb: true }
): { openTime: string; closeTime: string } {
  // Base hours
  let baseOpen = config.openTime || (options.isSpmb ? config.spmbStartTime : null) || '08:00';
  let baseClose = config.closeTime || (options.isSpmb ? config.spmbCloseTime : null) || '21:00';

  // If SPMB has a specific closing cutoff that is earlier, respect it
  if (options.isSpmb && config.spmbCloseTime) {
    const spmbCloseMinutes = timeStringToMinutes(config.spmbCloseTime);
    const baseCloseMinutes = timeStringToMinutes(baseClose);
    if (spmbCloseMinutes > 0 && spmbCloseMinutes < baseCloseMinutes) {
      baseClose = config.spmbCloseTime;
    }
  }

  // Check customHours overrides
  try {
    const custom = typeof config.customHours === 'string'
      ? JSON.parse(config.customHours || '{}')
      : config.customHours || {};

    if (custom?.dates?.[dateStr]) {
      return {
        openTime: custom.dates[dateStr].openTime || baseOpen,
        closeTime: custom.dates[dateStr].closeTime || baseClose
      };
    }

    const dayKey = String(dayOfWeek);
    if (custom?.weekdays?.[dayKey]) {
      return {
        openTime: custom.weekdays[dayKey].openTime || baseOpen,
        closeTime: custom.weekdays[dayKey].closeTime || baseClose
      };
    }
  } catch (e) {
    console.error('Error parsing customHours:', e);
  }

  return { openTime: baseOpen, closeTime: baseClose };
}

/**
 * Evaluates whether Arum Seduh is currently open for business.
 */
export function checkStoreOperationalStatus(
  config: StoreHoursConfig,
  options: { isSpmb?: boolean } = { isSpmb: true }
): StoreOperationalStatus {
  const { dateStr, timeStr, currentMinutes, dayOfWeek } = getJakartaNow();

  // 1. Check weekly operational days
  let openDays = [0, 1, 2, 3, 4, 5, 6];
  try {
    if (config.operationalDays) {
      openDays = JSON.parse(config.operationalDays);
    }
  } catch {}

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[dayOfWeek] || 'Hari ini';

  if (!openDays.includes(dayOfWeek)) {
    return {
      isOpen: false,
      reason: 'DAY_OFF',
      message: `Kedai Arum Seduh libur setiap hari ${todayName}.`,
      openTime: '',
      closeTime: '',
      currentJakartaTime: timeStr,
      todayDateStr: dateStr,
      dayOfWeek
    };
  }

  // 2. Check disabled dates / holiday closures
  let closedDates: string[] = [];
  try {
    if (config.disabledDates) {
      closedDates = JSON.parse(config.disabledDates);
    }
  } catch {}

  if (closedDates.includes(dateStr)) {
    return {
      isOpen: false,
      reason: 'HOLIDAY',
      message: 'Kedai Arum Seduh sedang tutup/libur khusus hari ini.',
      openTime: '',
      closeTime: '',
      currentJakartaTime: timeStr,
      todayDateStr: dateStr,
      dayOfWeek
    };
  }

  // 3. Check operational hours
  const { openTime, closeTime } = getEffectiveStoreHours(config, dateStr, dayOfWeek, options);
  const openMinutes = timeStringToMinutes(openTime);
  const closeMinutes = timeStringToMinutes(closeTime);

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      reason: 'OUTSIDE_HOURS',
      message: `Kedai Arum Seduh belum buka. Buka hari ini pukul ${openTime} WIB.`,
      openTime,
      closeTime,
      currentJakartaTime: timeStr,
      todayDateStr: dateStr,
      dayOfWeek
    };
  }

  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      reason: 'OUTSIDE_HOURS',
      message: `Kedai Arum Seduh sudah tutup untuk hari ini (tutup pukul ${closeTime} WIB).`,
      openTime,
      closeTime,
      currentJakartaTime: timeStr,
      todayDateStr: dateStr,
      dayOfWeek
    };
  }

  return {
    isOpen: true,
    reason: null,
    message: `Kedai Arum Seduh buka (operasional: ${openTime} - ${closeTime} WIB).`,
    openTime,
    closeTime,
    currentJakartaTime: timeStr,
    todayDateStr: dateStr,
    dayOfWeek
  };
}
