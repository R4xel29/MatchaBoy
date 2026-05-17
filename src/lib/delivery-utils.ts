import { DELIVERY_CONFIG, STORE } from './constants';

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Calculate delivery fee based on distance
 * Base fee + per-km fee
 */
export function calculateDeliveryFee(distanceKm: number, perKmFee: number = 2000): number {
    return Math.round(distanceKm * perKmFee);
}

/**
 * Check if location is within delivery range
 */
export function isWithinDeliveryRange(distanceKm: number, maxDistanceKm: number = 10): boolean {
    return distanceKm <= maxDistanceKm;
}

/**
 * Calculate distance from store to a given coordinate
 */
export function getDistanceFromStore(lat: number, lng: number): number {
    return calculateDistance(STORE.lat, STORE.lng, lat, lng);
}
