export type NotificationTab = 'send' | 'templates';

export type NotificationTarget = 'all' | 'specific';

export interface NotificationTemplate {
  id: string;
  trigger: string;
  title: string;
  message: string;
  isActive: boolean;
}

export interface TriggerOption {
  value: string;
  label: string;
}

export const TRIGGER_OPTIONS: TriggerOption[] = [
  { value: 'ORDER_COMPLETED', label: 'Order Selesai' },
  { value: 'POINTS_EARNED', label: 'Poin Bertambah' },
  { value: 'WELCOME', label: 'Welcome (User Baru)' },
  { value: 'PICKUP_REMINDER', label: 'Pengingat Pickup' },
  { value: 'CUSTOM', label: 'Custom' },
];
