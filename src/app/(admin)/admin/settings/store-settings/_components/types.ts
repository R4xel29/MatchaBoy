export type StoreSettingsTab = 'profile' | 'hours' | 'delivery' | 'alarm';

export interface CustomHoursConfig {
  weekdays?: Record<string, { openTime: string; closeTime: string }>;
  dates?: Record<string, { openTime: string; closeTime: string }>;
}

export interface StoreSettingsData {
  openTime: string;
  closeTime: string;
  operationalDays: number[];
  disabledDates: string[];
  customHours: CustomHoursConfig;
  storeName: string;
  storeAddress: string;
  storeLat: number;
  storeLng: number;
  whatsappNumber: string;
  whatsappMessage: string;
  deliveryFeePerKm: number;
  maxDeliveryDistance: number;
  pickupSlotInterval: number;
  cancellationTimeLimit: number;
  pickupAlarmLeadTime: number;
  alarmSoundUrl: string;
  alarmVolumeBoost: number;
  adminWaNumbers: string;
}

export type CalendarDateOption = 'NORMAL' | 'CLOSED' | 'CUSTOM';

export interface CalendarDayItem {
  date: Date;
  isCurrentMonth: boolean;
  dateString: string;
}
