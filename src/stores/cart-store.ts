'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, IceLevel, SugarLevel, AddOn } from '@/types';

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
    editItem: (oldId: string, item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
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
    addOns: AddOn[],
    isBundle?: boolean,
    bundleSelections?: any[],
    size?: string
): string {
    if (isBundle && bundleSelections) {
        const selectionSignature = bundleSelections
            .map((s) => `${s.groupId}_${s.productId}_${s.iceLevel || ''}_${s.sugarLevel || ''}`)
            .sort()
            .join(';');
        return `${productId}__bundle__${selectionSignature}`;
    }
    const addOnIds = addOns.map((a) => a.id).sort().join(',');
    return `${productId}__${iceLevel}__${sugarLevel}__${size || 'Normal'}__${addOnIds}`;
}

function calcItemTotal(item: { 
    basePrice: number; 
    addOns: AddOn[]; 
    quantity: number;
    isBundle?: boolean;
    bundleSelections?: any[];
    sizePrice?: number;
}): number {
    if (item.isBundle && item.bundleSelections) {
        const adjustments = item.bundleSelections.reduce((sum, a) => sum + (a.priceAdjustment || 0), 0);
        return (item.basePrice + adjustments) * item.quantity;
    }
    const addOnTotal = item.addOns.reduce((sum, a) => sum + a.price, 0);
    const sizeAdj = item.sizePrice || 0;
    return (item.basePrice + sizeAdj + addOnTotal) * item.quantity;
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
                    item.addOns,
                    item.isBundle,
                    item.bundleSelections,
                    item.size
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

            editItem: (oldId, item) => {
                const newId = generateCartItemId(
                    item.productId,
                    item.iceLevel,
                    item.sugarLevel,
                    item.addOns,
                    item.isBundle,
                    item.bundleSelections,
                    item.size
                );

                set((state) => {
                    // Check if an item with the new ID already exists
                    const existingNewId = state.items.find((i) => i.id === newId && i.id !== oldId);
                    
                    if (existingNewId) {
                        // If it exists, remove the old one and merge quantity into the new one
                        return {
                            items: state.items
                                .filter((i) => i.id !== oldId)
                                .map((i) =>
                                    i.id === newId
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

                    // Otherwise, just replace the old item with the new one
                    const newItem: CartItem = {
                        ...item,
                        id: newId,
                        totalPrice: calcItemTotal(item),
                    };

                    return {
                        items: state.items.map((i) => (i.id === oldId ? newItem : i)),
                    };
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
            name: 'Arus-cart-v1',
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);
