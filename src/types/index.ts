// ── Product & Menu Types ────────────────────────────────────

export interface BundleOption {
    productId: string;
    name: string;
    priceAdjustment: number;
}

export interface BundleGroup {
    id: string;
    name: string;
    selectCount: number;
    options: BundleOption[];
}

export interface ProductPromo {
    promoPrice: number;
    startDate: string; // ISO datetime string
    endDate: string; // ISO datetime string
    isActive: boolean;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    badge?: 'new' | 'best-seller' | 'sold-out';
    modifiers?: {
        iceLevel?: IceLevel[];
        sugarLevel?: SugarLevel[];
        addOns?: AddOn[];
        sizes?: { name: string; price: number }[];
        isBundle?: boolean;
        bundleGroups?: BundleGroup[];
        freeShipping?: boolean;
        discountType?: 'fixed' | 'nominal' | 'percent';
        discountValue?: number;
        originalPrice?: number;
        promo?: ProductPromo;
    };
}

export type IceLevel = 'Normal Ice' | 'Less Ice' | 'No Ice';
export type SugarLevel = 'Normal Sugar' | 'Less Sugar';

export interface AddOn {
    id: string;
    name: string;
    price: number;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
}

// ── Cart Types ──────────────────────────────────────────────

export interface SelectedBundleItem {
    groupId: string;
    groupName: string;
    productId: string;
    productName: string;
    priceAdjustment: number;
    iceLevel?: IceLevel;
    sugarLevel?: SugarLevel;
}

export interface CartItem {
    id: string;          // unique cart line ID
    productId: string;
    name: string;
    image: string;
    basePrice: number;
    quantity: number;
    iceLevel: IceLevel;
    sugarLevel: SugarLevel;
    size?: string;
    sizePrice?: number;
    addOns: AddOn[];
    totalPrice: number;  // (basePrice + sizePrice + addOns) * quantity
    isBundle?: boolean;
    bundleSelections?: SelectedBundleItem[];
}

// ── Location & Delivery Types ───────────────────────────────

export interface DeliveryAddress {
    label: string;           // "Jl. Sudirman No. 12"
    detail: string;          // apartment/building details
    lat: number;
    lng: number;
    distance?: number;       // km from store
    deliveryFee?: number;    // calculated fee
}

export interface StoreLocation {
    name: string;
    lat: number;
    lng: number;
    address: string;
}

// ── Order Types ─────────────────────────────────────────────

export type PaymentMethod = 'midtrans' | 'cod' | 'cash' | 'qris' | 'doku';
export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';
export type OrderStatus =
    | 'pending'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'assigned'
    | 'on-delivery'
    | 'delivered'
    | 'cancelled';

export interface Order {
    id: string;
    items: CartItem[];
    customerName: string;
    customerPhone: string;
    address: DeliveryAddress;
    paymentMethod: PaymentMethod;
    orderType: OrderType;
    status: OrderStatus;
    subtotal: number;
    deliveryFee: number;
    total: number;
    createdAt: string;
    tableNumber?: string;
    notes?: string;
    snapToken?: string;
    paymentUrl?: string;
}
