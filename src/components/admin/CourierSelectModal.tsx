'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User as UserIcon, Truck, Loader2, MapPin, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface Driver {
  id: string;
  name: string | null;
  image: string | null;
  driverProfile: {
    isOnline: boolean;
    vehicleType: string;
    plateNumber: string;
    driverImageUrl: string | null;
  } | null;
  driverOrders: {
    id: string;
    address: string | null;
  }[];
}

interface CourierSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDriver: (driverId: string) => Promise<void>;
  orderId: string;
}

export function CourierSelectModal({ isOpen, onClose, onSelectDriver, orderId }: CourierSelectModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/admin/drivers')
        .then(res => res.json())
        .then(data => setDrivers(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to fetch drivers', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleAssign = async (driverId: string) => {
    setAssigning(driverId);
    try {
      await onSelectDriver(driverId);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal menugaskan kurir. Silakan coba lagi.');
    } finally {
      setAssigning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pilih Kurir</h2>
              <p className="text-sm text-gray-500">Tugaskan pesanan ini ke kurir yang tersedia.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E] mb-4" />
                <p className="text-gray-500 font-medium">Memuat data kurir...</p>
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Tidak ada kurir</h3>
                <p className="text-gray-500 text-sm">Belum ada kurir yang terdaftar di sistem.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drivers.map(driver => {
                  const isActive = driver.driverOrders.length > 0;
                  const isOnline = driver.driverProfile?.isOnline ?? false;
                  const profileImg = driver.driverProfile?.driverImageUrl || driver.image;

                  return (
                    <div
                      key={driver.id}
                      className={`border rounded-2xl p-4 flex flex-col gap-4 transition-all group ${
                        !isOnline ? 'bg-gray-50/50 border-gray-100 opacity-90' : 'bg-white border-gray-100 hover:border-[#B48A5E]/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border relative ${!isOnline ? 'bg-gray-200 border-gray-300' : 'bg-gray-100 border-gray-200'}`}>
                          {profileImg ? (
                            <Image src={profileImg} alt={driver.name || 'Kurir'} fill className={`object-cover ${!isOnline ? 'grayscale opacity-70' : ''}`} />
                          ) : (
                            <UserIcon className="w-6 h-6 text-gray-400 m-3" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{driver.name || 'Kurir Tanpa Nama'}</h3>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                            <Truck className="w-3.5 h-3.5" />
                            {driver.driverProfile?.vehicleType || 'Motor'} - {driver.driverProfile?.plateNumber || '-'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 text-right">
                          {!isOnline ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Offline
                            </div>
                          ) : (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isActive ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              {isActive ? 'Sibuk' : 'Tersedia'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Active Destinations Summary */}
                      {isActive && (
                        <div className="bg-gray-50 rounded-xl p-3 text-xs border border-gray-100">
                          <p className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            Tujuan Aktif:
                          </p>
                          <ul className="list-disc pl-5 text-gray-500 space-y-0.5">
                            {driver.driverOrders.map((order, idx) => (
                              <li key={order.id} className="truncate">
                                Order #{order.id.slice(-4).toUpperCase()} - {order.address ? order.address.split(',')[0] : 'Alamat tidak diketahui'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Assign Action */}
                      <button
                        onClick={() => handleAssign(driver.id)}
                        disabled={assigning === driver.id}
                        className="w-full mt-2 py-2.5 rounded-xl bg-[#B48A5E]/5 text-[#B48A5E] font-bold text-sm border border-[#B48A5E]/10 hover:bg-[#B48A5E] hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        {assigning === driver.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Menugaskan...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> Pilih Kurir Ini</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
