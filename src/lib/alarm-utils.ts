/**
 * Utilities for incoming order alarm audio in Arum Seduh.
 */

export const DEFAULT_ALARM_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Returns the effective alarm sound URL.
 * If customUrl is provided and non-empty, returns customUrl.
 * Otherwise falls back to DEFAULT_ALARM_SOUND_URL.
 */
export function getAlarmSoundUrl(customUrl?: string | null): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return DEFAULT_ALARM_SOUND_URL;
}
