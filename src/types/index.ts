// ── Product & Menu Types ────────────────────────────────────

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

export interface CartItem {
    id: string;          // unique cart line ID
    productId: string;
    name: string;
    image: string;
    basePrice: number;
    quantity: number;
    iceLevel: IceLevel;
    sugarLevel: SugarLevel;
    addOns: AddOn[];
    totalPrice: number;  // (basePrice + addOns) * quantity
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

export type PaymentMethod = 'midtrans' | 'cod';
export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'preparing'
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
    status: OrderStatus;
    subtotal: number;
    deliveryFee: number;
    total: number;
    createdAt: string;
    snapToken?: string;
    proofOfDelivery?: string;
}
