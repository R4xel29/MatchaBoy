import { DELIVERY_CONFIG, STORE } from './constants';

/**
 * Menghitung jarak garis lurus antara dua titik koordinat GPS di permukaan bumi
 * menggunakan rumus Haversine.
 *
 * @param {number} lat1 - Latitude titik awal (derajat desimal)
 * @param {number} lng1 - Longitude titik awal (derajat desimal)
 * @param {number} lat2 - Latitude titik tujuan (derajat desimal)
 * @param {number} lng2 - Longitude titik tujuan (derajat desimal)
 * @returns {number} Jarak kedua titik dalam satuan kilometer (km)
 *
 * @example
 * ```typescript
 * const km = calculateDistance(-7.7812, 113.2122, -7.7900, 113.2200);
 * console.log(`Jarak: ${km.toFixed(2)} km`);
 * ```
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Jari-jari bumi dalam kilometer
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

/**
 * Mengonversi sudut dari derajat ke radian.
 *
 * @param {number} deg - Nilai sudut dalam derajat
 * @returns {number} Nilai sudut dalam radian
 */
function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Menghitung ongkos kirim (delivery fee) berdasarkan jarak pengantaran.
 *
 * Aturan kalkulasi:
 * - Jarak minimum dihitung 1.0 km (floor limit).
 * - Biaya dihitung per kilometer (`effectiveDistance * perKmFee`).
 * - Hasil akhir dibulatkan ke kelipatan Rp 500 terdekat.
 *
 * @param {number} distanceKm - Jarak pengiriman dalam kilometer
 * @param {number} [perKmFee=2000] - Biaya per kilometer (default: Rp 2.000)
 * @returns {number} Biaya pengiriman terformat dalam Rupiah
 *
 * @example
 * ```typescript
 * const fee = calculateDeliveryFee(3.2); // Jarak 3.2 km -> Rp 6.500
 * ```
 */
export function calculateDeliveryFee(distanceKm: number, perKmFee: number = 2000): number {
    const effectiveDistance = Math.max(1.0, distanceKm);
    const rawFee = effectiveDistance * perKmFee;
    
    // Pembulatan ke kelipatan Rp 500 terdekat
    return Math.round(rawFee / 500) * 500;
}

/**
 * Memeriksa apakah lokasi tujuan masih berada dalam batas jangkauan pengantaran kurir Arum Seduh.
 *
 * @param {number} distanceKm - Jarak ke lokasi tujuan dalam kilometer
 * @param {number} [maxDistanceKm=10] - Batas jarak maksimal yang diperbolehkan (default: 10 km)
 * @returns {boolean} `true` jika jarak berada dalam jangkauan
 *
 * @example
 * ```typescript
 * if (!isWithinDeliveryRange(distance)) {
 *   throw new Error('Alamat pengiriman di luar jangkauan kurir');
 * }
 * ```
 */
export function isWithinDeliveryRange(distanceKm: number, maxDistanceKm: number = 10): boolean {
    return distanceKm <= maxDistanceKm;
}

/**
 * Menghitung jarak dari koordinat gerai utama Arum Seduh ke koordinat lokasi tertentu.
 *
 * @param {number} lat - Latitude lokasi tujuan
 * @param {number} lng - Longitude lokasi tujuan
 * @returns {number} Jarak dari gerai dalam kilometer
 *
 * @example
 * ```typescript
 * const distance = getDistanceFromStore(-7.7850, 113.2150);
 * ```
 */
export function getDistanceFromStore(lat: number, lng: number): number {
    return calculateDistance(STORE.lat, STORE.lng, lat, lng);
}

/**
 * Menghasilkan 4-digit nomor PIN verifikasi serah terima pesanan pengiriman secara deterministik
 * berdasarkan ID pesanan untuk keamanan kurir dan pelanggan.
 *
 * @param {string} orderId - ID pesanan unik
 * @returns {string} 4-digit nomor PIN string (contoh: "0482")
 *
 * @example
 * ```typescript
 * const pin = getDeliveryPin('order-abc-123');
 * ```
 */
export function getDeliveryPin(orderId: string): string {
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
        hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pinVal = Math.abs(hash) % 10000;
    return pinVal.toString().padStart(4, '0');
}

