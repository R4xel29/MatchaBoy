'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, IceLevel, SugarLevel, AddOn } from '@/types';

interface CartState {
    items: CartItem[];
    appliedVoucher: any | null;
    addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
    editItem: (oldId: string, item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    setAppliedVoucher: (voucher: any | null) => void;
    totalItems: () => number;
    totalPrice: () => number;
    getVoucherDiscount: () => number;
}

function generateCartItemId(
    productId: string,
    iceLevel: IceLevel,
    sugarLevel: SugarLevel,
    addOns: AddOn[],
    isBundle?: boolean,
    bundleSelections?: any[],
    size?: string,
    matchaLevel?: number
): string {
    if (isBundle && bundleSelections) {
        const selectionSignature = bundleSelections
            .map((s) => `${s.groupId}_${s.productId}_${s.iceLevel || ''}_${s.sugarLevel || ''}`)
            .sort()
            .join(';');
        return `${productId}__bundle__${selectionSignature}`;
    }
    const addOnIds = addOns.map((a) => a.id).sort().join(',');
    const mLevel = matchaLevel !== undefined ? `__m${matchaLevel}` : '';
    return `${productId}__${iceLevel}__${sugarLevel}__${size || 'Normal'}__${addOnIds}${mLevel}`;
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
            appliedVoucher: null,

            addItem: (item) => {
                const id = generateCartItemId(
                    item.productId,
                    item.iceLevel,
                    item.sugarLevel,
                    item.addOns,
                    item.isBundle,
                    item.bundleSelections,
                    item.size,
                    (item as any).matchaLevel
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
                    item.size,
                    (item as any).matchaLevel
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

            clearCart: () => set({ items: [], appliedVoucher: null }),

            setAppliedVoucher: (voucher) => set({ appliedVoucher: voucher }),

            totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

            totalPrice: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),

            getVoucherDiscount: () => {
                const appliedVoucher = get().appliedVoucher;
                if (!appliedVoucher) return 0;
                if (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') return 0;

                const items = get().items;
                const subtotal = get().totalPrice();

                let validProductIds: string[] | null = null;
                const rawProductIds = appliedVoucher.validProductIds || (appliedVoucher as any).template?.validProductIds || null;
                if (rawProductIds) {
                    if (Array.isArray(rawProductIds)) {
                        validProductIds = rawProductIds;
                    } else {
                        try {
                            const parsed = JSON.parse(rawProductIds);
                            if (Array.isArray(parsed)) {
                                validProductIds = parsed;
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }

                const eligibleItems = validProductIds && validProductIds.length > 0
                    ? items.filter(item => validProductIds.includes(item.productId))
                    : items;

                const eligibleSubtotal = validProductIds && validProductIds.length > 0
                    ? eligibleItems.reduce((sum, item) => sum + item.totalPrice, 0)
                    : subtotal;

                // Check min purchase constraint
                const minPurchase = appliedVoucher.template?.minPurchase || appliedVoucher.minPurchase || 0;
                if (eligibleSubtotal < minPurchase) return 0;

                const maxSingleUnitEligiblePrice = eligibleItems.length > 0
                    ? Math.max(...eligibleItems.map(item => {
                        const singleUnit = item.isBundle && item.bundleSelections
                            ? (item.basePrice + item.bundleSelections.reduce((sum, a: any) => sum + (a.priceAdjustment || 0), 0))
                            : (item.basePrice + (item.sizePrice || 0) + (item.addOns ? item.addOns.reduce((s, a) => s + a.price, 0) : 0));
                        return singleUnit;
                    }))
                    : 0;

                if (appliedVoucher.type === 'FREE_TOPPING') {
                    const allAddOns = eligibleItems.flatMap(item => item.addOns || []);
                    if (allAddOns.length === 0) return 0;
                    const highestToppingPrice = Math.max(...allAddOns.map(a => a.price));
                    return highestToppingPrice > 0 ? highestToppingPrice : 0;
                }

                if (appliedVoucher.type === 'UPGRADE_SIZE') {
                    const maxSizeUpgrade = eligibleItems.reduce((max, item) => {
                        const itemSizePrice = item.sizePrice || 0;
                        return itemSizePrice > max ? itemSizePrice : max;
                    }, 0);
                    return maxSizeUpgrade;
                }

                const discountVal = (appliedVoucher.discountAmount !== undefined && appliedVoucher.discountAmount !== null && appliedVoucher.discountAmount > 0)
                    ? appliedVoucher.discountAmount
                    : (appliedVoucher as any).template?.discountValue || (appliedVoucher as any).discountValue || 0;

                if (discountVal > 0) {
                    if (appliedVoucher.type === 'DISCOUNT_PCT') {
                        const rawDiscount = Math.round((eligibleSubtotal * discountVal) / 100);
                        const maxDiscount = appliedVoucher.maxDiscount ?? (appliedVoucher as any).template?.maxDiscount;
                        if (maxDiscount && maxDiscount > 0) {
                            return Math.min(rawDiscount, maxDiscount);
                        }
                        return rawDiscount;
                    }
                    if (appliedVoucher.type === 'FREE_DRINK' || appliedVoucher.type === 'REFERRAL_REWARD') {
                        return Math.min(maxSingleUnitEligiblePrice, discountVal);
                    }
                    return Math.min(eligibleSubtotal, discountVal);
                }
                switch (appliedVoucher.type) {
                    case 'FREE_DRINK': return Math.min(maxSingleUnitEligiblePrice, 25000);
                    case 'REFERRAL_REWARD': return Math.min(maxSingleUnitEligiblePrice, 25000);
                    case 'DISCOUNT_RP': return Math.min(eligibleSubtotal, 10000);
                    default: return Math.min(eligibleSubtotal, 10000);
                }
            },
        }),
        {
            name: 'Arus-cart-v1',
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);
