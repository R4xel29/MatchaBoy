'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DeliveryAddress } from '@/types';

interface LocationState {
    address: DeliveryAddress | null;
    setAddress: (address: DeliveryAddress) => void;
    clearAddress: () => void;
}

export const useLocationStore = create<LocationState>()(
    persist(
        (set) => ({
            address: null,
            setAddress: (address) => set({ address }),
            clearAddress: () => set({ address: null }),
        }),
        {
            name: 'mattchaboy-location-v1',
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);
