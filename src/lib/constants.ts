import type { Category, Product, StoreLocation, AddOn } from '@/types';

// ── Store Configuration ─────────────────────────────────────

export const STORE: StoreLocation = {
    name: 'Arus HQ',
    lat: -6.2088,    // Jakarta
    lng: 106.8456,
    address: 'Jl. Arum No. 1, Jakarta Selatan',
};

export const DELIVERY_CONFIG = {
    maxDistanceKm: 10,
    baseFee: 5000,      // Rp 5.000
    perKmFee: 2000,     // Rp 2.000 / km
} as const;

// ── Categories ──────────────────────────────────────────────

export const CATEGORIES: Category[] = [
    { id: 'all', name: 'All', slug: 'all' },
    { id: 'signature', name: 'Signature', slug: 'signature' },
    { id: 'hidden-menu', name: 'Hidden Menu', slug: 'hidden-menu' },
    { id: 'classic', name: 'Classic', slug: 'classic' },
    { id: 'pastries', name: 'Pastries', slug: 'pastries' },
    { id: 'seasonal', name: 'Seasonal', slug: 'seasonal' },
];

// ── Add-Ons ─────────────────────────────────────────────────

export const ADD_ONS: AddOn[] = [
    { id: 'espresso', name: 'Espresso Shot', price: 5000 },
    { id: 'biscoff', name: 'Biscoff Crumble', price: 8000 },
    { id: 'extra-cream', name: 'Extra Cream', price: 3000 },
    { id: 'oat-milk', name: 'Oat Milk', price: 7000 },
    { id: 'brown-sugar', name: 'Brown Sugar Jelly', price: 5000 },
];

// ── Product Catalog ─────────────────────────────────────────

const DRINK_SIZES = [
    { name: 'Normal', price: 0 },
    { name: 'Large', price: 3000 },
    { name: 'Jumbo', price: 5000 },
];

export const PRODUCTS: Product[] = [
    {
        id: 'brand-signature',
        name: 'Matcha Signature',
        description: 'Premium ceremonial-grade matcha latte, hand-whisked with silky oat milk. Our best seller.',
        price: 35000,
        image: '/products/brand-signature.png',
        category: 'signature',
        badge: 'best-seller',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'brand-latte',
        name: 'Iced Matcha Latte',
        description: 'Smooth and creamy matcha blended with fresh milk, served over ice.',
        price: 28000,
        image: '/products/brand-latte.png',
        category: 'classic',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'dirty-matcha',
        name: 'Dirty Matcha',
        description: 'Matcha meets espresso. A bold, earthy fusion for the daring palate.',
        price: 38000,
        image: '/products/dirty-matcha.png',
        category: 'signature',
        badge: 'new',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'brand-biscoff',
        name: 'Matcha Biscoff',
        description: 'Creamy matcha topped with crushed Biscoff cookies and caramel drizzle.',
        price: 42000,
        image: '/products/brand-biscoff.png',
        category: 'hidden-menu',
        badge: 'best-seller',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'brand-strawberry',
        name: 'Matcha Strawberry',
        description: 'Sweet strawberry puree swirled into our signature matcha. A visual masterpiece.',
        price: 36000,
        image: '/products/brand-strawberry.png',
        category: 'seasonal',
        badge: 'new',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'hot-matcha',
        name: 'Hot Matcha',
        description: 'Pure ceremonial-grade matcha whisked to perfection. Warm, earthy, meditative.',
        price: 30000,
        image: '/products/hot-matcha.png',
        category: 'classic',
        modifiers: {
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'brand-affogato',
        name: 'Matcha Affogato',
        description: 'Vanilla gelato drowned in a shot of concentrated matcha. Decadent.',
        price: 45000,
        image: '/products/brand-affogato.png',
        category: 'hidden-menu',
        modifiers: {
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
    {
        id: 'brand-croissant',
        name: 'Matcha Croissant',
        description: 'Buttery, flaky croissant infused with matcha cream filling.',
        price: 25000,
        image: '/products/brand-croissant.png',
        category: 'pastries',
        badge: 'new',
    },
    {
        id: 'brand-cookie',
        name: 'Matcha White Choc Cookie',
        description: 'Thick, chewy matcha cookie loaded with white chocolate chunks.',
        price: 18000,
        image: '/products/brand-cookie.png',
        category: 'pastries',
        badge: 'best-seller',
    },
    {
        id: 'brand-tiramisu',
        name: 'Matcha Tiramisu',
        description: 'Japanese-Italian fusion. Layers of mascarpone and brand-soaked ladyfingers.',
        price: 35000,
        image: '/products/brand-tiramisu.png',
        category: 'pastries',
    },
    {
        id: 'yuzu-matcha',
        name: 'Yuzu Matcha Sparkle',
        description: 'Sparkling yuzu citrus meets matcha. Refreshingly unusual.',
        price: 38000,
        image: '/products/yuzu-matcha.png',
        category: 'seasonal',
        badge: 'new',
        modifiers: {
            sizes: DRINK_SIZES,
        }
    },
    {
        id: 'brand-mochi',
        name: 'Matcha Mochi Latte',
        description: 'Chewy mochi pearls swimming in a rich matcha latte. Textural heaven.',
        price: 40000,
        image: '/products/brand-mochi.png',
        category: 'hidden-menu',
        badge: 'sold-out',
        modifiers: {
            iceLevel: ['Normal Ice', 'Less Ice', 'No Ice'],
            sugarLevel: ['Normal Sugar', 'Less Sugar'],
            addOns: ADD_ONS,
            sizes: DRINK_SIZES,
        },
    },
];
