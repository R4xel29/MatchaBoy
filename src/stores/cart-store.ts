'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, IceLevel, SugarLevel, AddOn } from '@/types';

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: () => number;
    totalPrice: () => number;
}

function generateCartItemId(
    productId: string,
    iceLevel: IceLevel,
    sugarLevel: SugarLevel,
    addOns: AddOn[]
): string {
    const addOnIds = addOns.map((a) => a.id).sort().join(',');
    return `${productId}__${iceLevel}__${sugarLevel}__${addOnIds}`;
}

function calcItemTotal(item: { basePrice: number; addOns: AddOn[]; quantity: number }): number {
    const addOnTotal = item.addOns.reduce((sum, a) => sum + a.price, 0);
    return (item.basePrice + addOnTotal) * item.quantity;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                const id = generateCartItemId(
                    item.productId,
                    item.iceLevel,
                    item.sugarLevel,
                    item.addOns
                );

                set((state) => {
                    const existing = state.items.find((i) => i.id === id);
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === id
                                    ? {
                                        ...i,
                                        quantity: i.quantity + item.quantity,
                                        totalPrice: calcItemTotal({
                                            ...i,
                                            quantity: i.quantity + item.quantity,
                                        }),
                                    }
                                    : i
                            ),
                        };
                    }
                    const newItem: CartItem = {
                        ...item,
                        id,
                        totalPrice: calcItemTotal(item),
                    };
                    return { items: [...state.items, newItem] };
                });
            },

            removeItem: (id) =>
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                })),

            updateQuantity: (id, quantity) =>
                set((state) => ({
                    items:
                        quantity <= 0
                            ? state.items.filter((i) => i.id !== id)
                            : state.items.map((i) =>
                                i.id === id
                                    ? { ...i, quantity, totalPrice: calcItemTotal({ ...i, quantity }) }
                                    : i
                            ),
                })),

            clearCart: () => set({ items: [] }),

            totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

            totalPrice: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),
        }),
        {
            name: 'mattchaboy-cart-v1',
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);
