import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientId, getNextQueueSequence } from '@/lib/rate-limit-redis'
import { calculateDeliveryFee } from '@/lib/delivery-utils'
import { getActivePromo } from '@/lib/utils'
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors'


const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`

function calculateSecureItemPrice(item: any, dbProduct: any) {
    let dbModifiers: any = {}
    if (dbProduct.modifiers) {
        try {
            dbModifiers = JSON.parse(dbProduct.modifiers)
        } catch {}
    }
    const activePromo = getActivePromo(dbProduct);
    let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price;

    if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
        let secureBundleAdjustments = 0;
        for (const sel of item.bundleSelections) {
            const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId);
            if (group) {
                const option = group.options?.find((o: any) => o.productId === sel.productId);
                if (option) {
                    secureBundleAdjustments += option.priceAdjustment || 0;
                }
            }
        }
        secureItemPrice += secureBundleAdjustments;
    } else {
        let secureSizePrice = 0
        if (item.size && item.size !== 'Normal' && item.size !== 'Regular') {
            if (dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                if (validSize) {
                    secureSizePrice = validSize.price
                }
            } else if (item.size === 'Large') {
                secureSizePrice = 3000
            }
        }

        let addOnsTotal = 0
        if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
            for (const addOnId of item.addOnIds) {
                const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                if (validAddOn) {
                    addOnsTotal += validAddOn.price
                }
            }
        }

        // Shot adjustment for Americano / Coffee
        let shotAdjustment = 0
        if (item.shot === 'Double Shot' || item.shot === 'Double') {
            shotAdjustment = 5000
        }

        // Matcha level customization is FREE (+Rp 0)
        const matchaLevelAdjustment = 0

        secureItemPrice += secureSizePrice + addOnsTotal + shotAdjustment + matchaLevelAdjustment;
    }
    return secureItemPrice;
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()
        const requestHeaders = new Headers(req.headers);
        const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
        const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
        const appUrl = `${protocol}://${host}`;

        // Must be logged in
        if (!session?.user?.id) {
            throw new ValidationError('Login diperlukan untuk memesan', 'UNAUTHORIZED');
        }

        // Rate limit: 10 requests per minute per user
        const clientId = getClientId(req, session.user.id)
        const { success, remaining } = await rateLimit(`checkout:${clientId}`, { maxRequests: 10, windowMs: 60_000 })
        if (!success) {
            throw new ValidationError('Terlalu banyak percobaan. Coba lagi dalam 1 menit.', 'RATE_LIMIT');
        }

        // If checkout is for a Group Cart, pull the items directly and securely from PostgreSQL
        const groupCartId = body.groupCartId || null;
        if (groupCartId) {
            const groupCart = await prisma.groupCart.findUnique({
                where: { id: groupCartId },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!groupCart) {
                throw new ValidationError('Group Cart tidak ditemukan');
            }

            if (groupCart.creatorId !== session.user.id) {
                throw new ValidationError('Hanya pembuat Group Cart yang dapat melakukan checkout');
            }

            if (groupCart.status !== 'ACTIVE') {
                throw new ValidationError('Group Cart ini sudah dicheckout atau tidak aktif');
            }

            if (groupCart.items.length === 0) {
                throw new ValidationError('Keranjang Group Cart masih kosong');
            }

            // Securely override client-sent items with server-verified items from DB
            body.items = groupCart.items.map(item => {
                let parsedMods: any = {};
                try {
                    if (item.modifiers) {
                        parsedMods = JSON.parse(item.modifiers);
                    }
                } catch {}

                const baseModsString = parsedMods.modsString || '';
                const modsStringWithMember = `[${item.memberName}] ${baseModsString}`.trim();

                return {
                    productId: item.productId,
                    name: item.product.name,
                    quantity: item.qty,
                    size: parsedMods.size || 'Normal',
                    addOnIds: parsedMods.addOnIds || [],
                    modsString: modsStringWithMember,
                    bundleSelections: parsedMods.bundleSelections || undefined
                };
            });
        }

        // ✅ BUG FIX #5: Enhanced server-side validation
        if (!body.items || body.items.length === 0) {
            throw new ValidationError('Keranjang kosong');
        }

        if (!body.name || !body.phone) {
            throw new ValidationError('Nama dan nomor HP wajib diisi');
        }

        // Validate phone format
        const phoneRegex = /^(\+62|62|0)8[0-9]{8,12}$/;
        if (!phoneRegex.test(body.phone)) {
            throw new ValidationError('Format nomor HP tidak valid');
        }

        // Fetch store settings early
        const storeSettings = await prisma.storeSettings.findFirst()

        // Validate pickup / dine-in fields
        const orderType = body.orderType || 'PICKUP'
        if (orderType === 'DINE_IN') {
            if (!body.tableNumber) {
                return NextResponse.json({ error: 'Nomor meja wajib diisi untuk Dine-In' }, { status: 400 })
            }
            const table = await prisma.diningTable.findUnique({
                where: { number: body.tableNumber }
            })
            if (!table) {
                return NextResponse.json({ error: `Meja ${body.tableNumber} tidak ditemukan` }, { status: 400 })
            }
        } else if (orderType === 'PICKUP' && (!body.pickupDate || !body.pickupTime)) {
            return NextResponse.json({ error: 'Tanggal dan jam pengambilan wajib diisi' }, { status: 400 })
        }

        // Validate pickup/delivery date and time against store settings
        if (storeSettings) {
            // Function to check store hours for a specific date
            const getStoreHoursForDate = (dateStr: string) => {
                let openT = storeSettings.openTime;
                let closeT = storeSettings.closeTime;
                try {
                    const custom = typeof storeSettings.customHours === 'string'
                        ? JSON.parse(storeSettings.customHours || '{}')
                        : storeSettings.customHours || {};

                    if (custom?.dates?.[dateStr]) {
                        openT = custom.dates[dateStr].openTime;
                        closeT = custom.dates[dateStr].closeTime;
                    } else {
                        const dayIdx = String(new Date(dateStr).getDay());
                        if (custom?.weekdays?.[dayIdx]) {
                            openT = custom.weekdays[dayIdx].openTime;
                            closeT = custom.weekdays[dayIdx].closeTime;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing customHours:", e);
                }
                return { openTime: openT, closeTime: closeT };
            };

            const now = new Date();
            // Get current date/time in Jakarta timezone (store local time)
            const getJakartaDateString = (date: Date) => {
                return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
            };
            const getJakartaTimeString = (date: Date) => {
                return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(date);
            };

            const todayStr = getJakartaDateString(now);
            const targetDateStr = body.pickupDate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(body.pickupDate)) : todayStr;
            
            // 1. Check operational days
            let openDays: number[] = [0,1,2,3,4,5,6];
            try {
                openDays = JSON.parse(storeSettings.operationalDays || '[0,1,2,3,4,5,6]');
            } catch {}
            
            // Safely parse date components to avoid timezone shift on new Date(targetDateStr)
            const [yr, mo, dy] = targetDateStr.split('-').map(Number);
            const targetDayOfWeek = new Date(yr, mo - 1, dy).getDay();
            
            if (!openDays.includes(targetDayOfWeek)) {
                return NextResponse.json({ error: 'Toko tutup pada hari yang dipilih' }, { status: 400 });
            }

            // 2. Check disabled dates/holidays
            let closedDates: string[] = [];
            try {
                closedDates = JSON.parse(storeSettings.disabledDates || '[]');
            } catch {}
            if (closedDates.includes(targetDateStr)) {
                return NextResponse.json({ error: 'Toko tutup pada tanggal yang dipilih (hari libur/khusus)' }, { status: 400 });
            }

            const { openTime, closeTime } = getStoreHoursForDate(targetDateStr);
            const [openH, openM] = openTime.split(':').map(Number);
            const [closeH, closeM] = closeTime.split(':').map(Number);
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;

            if (body.pickupTime === 'Sekarang') {
                if (targetDateStr !== todayStr) {
                    return NextResponse.json({ error: 'Pengambilan "Sekarang" hanya berlaku untuk hari ini' }, { status: 400 });
                }
                const currentJakartaTime = getJakartaTimeString(now);
                const [curH, curM] = currentJakartaTime.split(':').map(Number);
                const currentMinutes = curH * 60 + curM;

                if (currentMinutes < openMinutes || currentMinutes >= closeMinutes - 15) {
                    return NextResponse.json({ error: 'Toko saat ini sedang tutup. Silakan jadwalkan waktu pengambilan lain.' }, { status: 400 });
                }
            } else if (body.pickupTime) {
                const [pickH, pickM] = body.pickupTime.split(':').map(Number);
                const pickMinutes = pickH * 60 + pickM;

                // Validate scheduled delivery/pickup time
                const deliveryMinMinutes = orderType === 'DELIVERY' ? openMinutes + 30 : openMinutes;
                
                if (pickMinutes < deliveryMinMinutes || pickMinutes >= closeMinutes) {
                    return NextResponse.json({ 
                        error: `Jam pengambilan di luar jam operasional toko untuk ${orderType === 'DELIVERY' ? 'pengiriman' : 'pengambilan'} (${orderType === 'DELIVERY' ? 'mulai ' + String(Math.floor(deliveryMinMinutes/60)).padStart(2, '0') + ':' + String(deliveryMinMinutes%60).padStart(2, '0') : openTime} - ${closeTime})` 
                    }, { status: 400 });
                }

                // If scheduled for today, it must be in the future (at least 15 min buffer)
                if (targetDateStr === todayStr) {
                    const currentJakartaTime = getJakartaTimeString(now);
                    const [curH, curM] = currentJakartaTime.split(':').map(Number);
                    const currentMinutes = curH * 60 + curM;
                    if (pickMinutes < currentMinutes + 15) {
                        return NextResponse.json({ error: 'Jam pengambilan harus minimal 15 menit dari sekarang' }, { status: 400 });
                    }
                }
            }
        }

        // --- SECURE SERVER-SIDE PRICE CALCULATION ---
        const productIds = body.items.map((item: any) => item.productId)
        const dbProducts = await prisma.product.findMany({
            where: { id: { in: productIds } }
        })

        let secureSubtotal = 0
        let hasFreeShippingBundle = false
        const orderItemsToCreate: Array<{
            productId: string;
            qty: number;
            price: number;
            modifiers: string | null;
        }> = []

        for (const item of body.items) {
            const dbProduct = dbProducts.find(p => p.id === item.productId)
            if (!dbProduct) {
                return NextResponse.json({ error: `Produk tidak ditemukan: ${item.name}` }, { status: 400 })
            }

            // Parse DB modifiers
            let dbModifiers: any = {}
            if (dbProduct.modifiers) {
                try {
                    dbModifiers = JSON.parse(dbProduct.modifiers)
                } catch {
                    // Ignore schema parse error
                }
            }

            if (dbModifiers.isBundle && dbModifiers.freeShipping === true) {
                hasFreeShippingBundle = true
            }

            const secureItemPrice = calculateSecureItemPrice(item, dbProduct);
            const secureItemTotal = secureItemPrice * item.quantity
            secureSubtotal += secureItemTotal

            let selectedAddOns = []
            if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                for (const addOnId of item.addOnIds) {
                    const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                    if (validAddOn) {
                        selectedAddOns.push(validAddOn)
                    }
                }
            }

            const modifierData = dbModifiers.isBundle 
                ? { isBundle: true, bundleSelections: item.bundleSelections }
                : { 
                    size: item.size,
                    addOns: selectedAddOns,
                    modsString: item.modsString || null,
                    matchaLevel: item.matchaLevel
                  };

            orderItemsToCreate.push({
                productId: dbProduct.id,
                qty: item.quantity,
                price: secureItemPrice,
                modifiers: JSON.stringify(modifierData)
            })
        }

        // Re-use store settings fetched above for delivery fee
        const perKmFee = storeSettings?.deliveryFeePerKm ?? 2000
        const maxDist = storeSettings?.maxDeliveryDistance ?? 10
        
        let distanceKm = 0
        let deliveryFee = 0
        
        if (orderType === 'DELIVERY') {
            distanceKm = body.address?.distance || 0
            if (distanceKm > maxDist) {
                 return NextResponse.json({ error: `Jarak pengiriman melebihi batas maksimal (${maxDist} km)` }, { status: 400 })
            }
            if (!body.address?.streetDetail || !body.address.streetDetail.trim()) {
                 return NextResponse.json({ error: `Detail alamat tambahan (No. Rumah / Komplek) wajib diisi untuk Delivery` }, { status: 400 })
            }
            
            // Check if user has an active subscription for free delivery (MATCHA_LATTE or GOLDEN_MATCHA)
            const userSubscription = await prisma.memberSubscription.findUnique({
                where: { userId: session.user.id }
            });
            const hasFreeDelivery = userSubscription && 
                userSubscription.status === 'ACTIVE' && 
                userSubscription.expiresAt > new Date() && 
                (userSubscription.tier === 'MATCHA_LATTE' || userSubscription.tier === 'GOLDEN_MATCHA');
                
            if (hasFreeDelivery) {
                deliveryFee = 0;
            } else {
                deliveryFee = calculateDeliveryFee(distanceKm, perKmFee);
            }
        }

        // Fetch loyalty settings
        const loyaltySettings = await prisma.loyaltySettings.findFirst()

        // Tumbler discount
        const hasTumbler = body.hasTumbler === true
        if (hasTumbler && orderType !== 'PICKUP') {
            return NextResponse.json({ error: 'Bonus/Diskon tumbler hanya diperbolehkan untuk pesanan Ambil Sendiri (PICKUP).' }, { status: 400 })
        }
        let tumblerDiscount = 0
        if (hasTumbler) {
            if (loyaltySettings?.tumblerBonusEnabled && loyaltySettings.tumblerDiscountPct > 0) {
                tumblerDiscount = Math.round(secureSubtotal * loyaltySettings.tumblerDiscountPct / 100)
            }
        }

        // Helper to check product validity for a voucher template
        const isProductValidForVoucher = (productId: string, validProductIdsJson: string | null): boolean => {
            if (!validProductIdsJson) return true; // Null means valid for all products
            try {
                const validIds = JSON.parse(validProductIdsJson);
                if (!Array.isArray(validIds) || validIds.length === 0) return true;
                return validIds.includes(productId);
            } catch {
                return true;
            }
        }

        // Handle voucher
        const voucherCode = body.voucherCode
        let voucherDiscount = 0
        let ongkirDiscount = hasFreeShippingBundle ? deliveryFee : 0
        let validVoucherId = null
        if (voucherCode) {
            const voucher = await prisma.voucher.findUnique({
                where: { code: voucherCode },
                include: { template: true }
            })
            if (voucher && voucher.userId === session.user.id && !voucher.isUsed && (!voucher.expiresAt || voucher.expiresAt >= new Date())) {
                validVoucherId = voucher.id
                
                // If this voucher has an associated template, apply the new dynamic rules
                if (voucher.template) {
                    const template = voucher.template
                    
                    // Validate minimum purchase threshold (on total subtotal of cart)
                    if (secureSubtotal < template.minPurchase) {
                        return NextResponse.json({ error: `Total belanja belum memenuhi syarat minimum pembelian voucher (${formatCurrency(template.minPurchase)})` }, { status: 400 })
                    }

                    // Calculate subtotal of valid products
                    let validProductsSubtotal = 0
                    for (const item of body.items) {
                        if (isProductValidForVoucher(item.productId, template.validProductIds)) {
                            // Find the product price securely
                            const dbProduct = dbProducts.find(p => p.id === item.productId)
                            if (dbProduct) {
                                const secureItemPrice = calculateSecureItemPrice(item, dbProduct);
                                validProductsSubtotal += secureItemPrice * item.quantity
                            }
                        }
                    }

                    // Apply discount based on template rules
                    if (template.type === 'DISCOUNT_PCT') {
                        let pctDiscount = Math.round((validProductsSubtotal * template.discountValue) / 100)
                        if (template.maxDiscount) {
                            pctDiscount = Math.min(pctDiscount, template.maxDiscount)
                        }
                        voucherDiscount = pctDiscount
                    } else if (template.type === 'DISCOUNT_RP') {
                        voucherDiscount = Math.min(template.discountValue, validProductsSubtotal)
                    } else if (template.type === 'FREE_DRINK') {
                        let maxSingleUnitEligiblePrice = 0
                        for (const item of body.items) {
                            if (isProductValidForVoucher(item.productId, template.validProductIds)) {
                                const dbProduct = dbProducts.find(p => p.id === item.productId)
                                if (dbProduct) {
                                    const secureItemPrice = calculateSecureItemPrice(item, dbProduct);
                                    if (secureItemPrice > maxSingleUnitEligiblePrice) {
                                        maxSingleUnitEligiblePrice = secureItemPrice
                                    }
                                }
                            }
                        }
                        voucherDiscount = Math.min(template.discountValue || 25000, maxSingleUnitEligiblePrice)
                    } else if (template.type === 'FREE_TOPPING') {
                        let maxToppingPrice = 0
                        for (const item of body.items) {
                            if (isProductValidForVoucher(item.productId, template.validProductIds)) {
                                const dbProduct = dbProducts.find(p => p.id === item.productId)
                                let dbModifiers: any = {}
                                if (dbProduct?.modifiers) {
                                    try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                }
                                if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                    for (const addOnId of item.addOnIds) {
                                        const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                        if (validAddOn && validAddOn.price > maxToppingPrice) {
                                            maxToppingPrice = validAddOn.price
                                        }
                                    }
                                }
                            }
                        }
                        voucherDiscount = maxToppingPrice
                    } else if (template.type === 'UPGRADE_SIZE') {
                        let maxSizePrice = 0
                        for (const item of body.items) {
                            if (isProductValidForVoucher(item.productId, template.validProductIds)) {
                                const dbProduct = dbProducts.find(p => p.id === item.productId)
                                let dbModifiers: any = {}
                                if (dbProduct?.modifiers) {
                                    try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                }
                                if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                                    const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                                    if (validSize && validSize.price > maxSizePrice) {
                                        maxSizePrice = validSize.price
                                    }
                                }
                            }
                        }
                        voucherDiscount = maxSizePrice
                    } else if (template.type === 'GRATIS_ONGKIR') {
                        if (!hasFreeShippingBundle) ongkirDiscount = deliveryFee
                    } else {
                        voucherDiscount = template.discountValue || 10000
                    }
                } else {
                    if (voucher.type === 'FREE_DRINK') {
                        let maxSingleUnitEligiblePrice = 0
                        for (const item of body.items) {
                            const dbProduct = dbProducts.find(p => p.id === item.productId)
                            if (dbProduct) {
                                const secureItemPrice = calculateSecureItemPrice(item, dbProduct);
                                if (secureItemPrice > maxSingleUnitEligiblePrice) {
                                    maxSingleUnitEligiblePrice = secureItemPrice
                                }
                            }
                        }
                        voucherDiscount = Math.min(25000, maxSingleUnitEligiblePrice)
                    }
                    else if (voucher.type === 'FREE_TOPPING') {
                        let maxToppingPrice = 0
                        for (const item of body.items) {
                            const dbProduct = dbProducts.find(p => p.id === item.productId)
                            let dbModifiers: any = {}
                            if (dbProduct?.modifiers) {
                                try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                            }
                            if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                for (const addOnId of item.addOnIds) {
                                    const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                    if (validAddOn && validAddOn.price > maxToppingPrice) {
                                        maxToppingPrice = validAddOn.price
                                    }
                                }
                            }
                        }
                        voucherDiscount = maxToppingPrice
                    }
                    else if (voucher.type === 'UPGRADE_SIZE') {
                        let maxSizePrice = 0
                        for (const item of body.items) {
                            const dbProduct = dbProducts.find(p => p.id === item.productId)
                            let dbModifiers: any = {}
                            if (dbProduct?.modifiers) {
                                try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                            }
                            if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                                const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                                if (validSize && validSize.price > maxSizePrice) {
                                    maxSizePrice = validSize.price
                                }
                            }
                        }
                        voucherDiscount = maxSizePrice
                    }
                    else if (voucher.type === 'REFERRAL_REWARD') {
                        let maxSingleUnitEligiblePrice = 0
                        for (const item of body.items) {
                            const dbProduct = dbProducts.find(p => p.id === item.productId)
                            if (dbProduct) {
                                const secureItemPrice = calculateSecureItemPrice(item, dbProduct);
                                if (secureItemPrice > maxSingleUnitEligiblePrice) {
                                    maxSingleUnitEligiblePrice = secureItemPrice
                                }
                            }
                        }
                        voucherDiscount = Math.min(25000, maxSingleUnitEligiblePrice)
                    }
                    else if (voucher.type === 'GRATIS_ONGKIR') {
                        if (!hasFreeShippingBundle) ongkirDiscount = deliveryFee
                    }
                    else if (voucher.type === 'DISKON_ONGKIR') {
                        if (!hasFreeShippingBundle) ongkirDiscount = Math.min(deliveryFee, 10000)
                    }
                    else voucherDiscount = voucher.discountAmount || 10000
                }
            } else {
                return NextResponse.json({ error: 'Voucher tidak valid' }, { status: 400 })
            }
        }

        // Handle points
        const pointsUsed = parseInt(body.pointsUsed || '0')
        let pointsDiscount = 0
        if (pointsUsed > 0) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } })
            if (!user || user.points < pointsUsed) {
                return NextResponse.json({ error: 'Poin tidak mencukupi' }, { status: 400 })
            }
            const pointValue = loyaltySettings?.pointValue ?? 1000
            pointsDiscount = pointsUsed * pointValue // 1 point = Rp<pointValue>
        }

        const secureTotal = Math.max(0, secureSubtotal - tumblerDiscount - voucherDiscount - pointsDiscount) + Math.max(0, deliveryFee - ongkirDiscount)

        const paymentSettings = await prisma.paymentSettings.findFirst()
        if (!paymentSettings) {
            return NextResponse.json({ error: 'Pengaturan pembayaran tidak ditemukan.' }, { status: 500 })
        }

        const requestedMethod = body.paymentMethod?.toUpperCase()
        if (requestedMethod !== 'COD' && requestedMethod !== 'QRIS' && requestedMethod !== 'WALLET' && requestedMethod !== 'DOKU') {
            return NextResponse.json({ error: 'Metode pembayaran ini sedang tidak aktif. Silakan pilih metode lain.' }, { status: 400 })
        }
        if (requestedMethod === 'COD' && !paymentSettings.codEnabled) {
            return NextResponse.json({ error: 'Metode pembayaran COD sedang tidak aktif. Silakan pilih metode lain.' }, { status: 400 })
        }
        if (requestedMethod === 'QRIS' && !paymentSettings.qrisEnabled) {
            return NextResponse.json({ error: 'Metode pembayaran QRIS sedang tidak aktif. Silakan pilih metode lain.' }, { status: 400 })
        }

        const isDoku = requestedMethod === 'DOKU'

        // Build address string
        const address = orderType === 'PICKUP'
            ? 'Ambil di toko'
            : orderType === 'DINE_IN'
            ? `Dine In - Meja ${body.tableNumber}`
            : `${body.address?.label || ''} - ${body.address?.detail || ''} | Detail: ${body.address?.streetDetail || ''} (${body.address?.lat || 0}, ${body.address?.lng || 0})`

        const isWallet = requestedMethod === 'WALLET';

        const prefix = orderType === 'PICKUP' ? 'PKP' : (orderType === 'DINE_IN' ? 'DIN' : 'DLV')
        const queueNumber = `${prefix}-${await getNextQueueSequence(prefix)}`

        // Wrap database operations in a single interactive transaction to ensure data atomicity
        // ✅ BUG FIX #4 & #5: Added row-level locking and atomic operations
        const order = await prisma.$transaction(async (tx) => {
            // 0. Process Wallet Deduction
            if (isWallet) {
                // Atomic decrement with condition check to prevent race conditions
                const walletUpdateResult = await tx.user.updateMany({
                    where: {
                        id: session.user.id,
                        walletBalance: { gte: secureTotal } // Only update if balance is sufficient
                    },
                    data: {
                        walletBalance: { decrement: secureTotal }
                    }
                });

                if (walletUpdateResult.count === 0) {
                    // Either user not found or balance insufficient
                    const user = await tx.user.findUnique({
                        where: { id: session.user.id },
                        select: { walletBalance: true }
                    });
                    
                    if (!user) {
                        throw new Error('User tidak ditemukan');
                    }
                    throw new Error(`Saldo wallet tidak mencukupi. Saldo Anda: ${formatCurrency(user.walletBalance)}, Total Tagihan: ${formatCurrency(secureTotal)}`);
                }
            }

            // 1. ✅ FIX: Use atomic update with WHERE condition for points
            if (pointsUsed > 0) {
                // Atomic decrement with condition check
                const updateResult = await tx.user.updateMany({
                    where: { 
                        id: session.user.id,
                        points: { gte: pointsUsed } // Only update if points sufficient
                    },
                    data: { points: { decrement: pointsUsed } }
                });

                if (updateResult.count === 0) {
                    // Either user not found or insufficient points
                    const user = await tx.user.findUnique({ 
                        where: { id: session.user.id },
                        select: { points: true }
                    });
                    
                    if (!user) {
                        throw new Error('User tidak ditemukan');
                    }
                    throw new Error(`Poin tidak mencukupi. Anda memiliki ${user.points} poin, membutuhkan ${pointsUsed} poin.`);
                }
            }

            // 2. ✅ FIX: Use atomic update with WHERE condition for voucher
            if (validVoucherId) {
                // Atomic update: only mark as used if currently not used
                const voucherUpdateResult = await tx.voucher.updateMany({
                    where: { 
                        id: validVoucherId,
                        isUsed: false, // Only update if not used
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gte: new Date() } }
                        ]
                    },
                    data: { 
                        isUsed: true,
                        usedAt: new Date()
                    }
                });

                if (voucherUpdateResult.count === 0) {
                    // Voucher either already used or expired
                    const voucher = await tx.voucher.findUnique({
                        where: { id: validVoucherId },
                        select: { isUsed: true, expiresAt: true }
                    });
                    
                    if (!voucher) {
                        throw new Error('Voucher tidak ditemukan');
                    }
                    if (voucher.isUsed) {
                        throw new Error('Voucher sudah digunakan oleh transaksi lain');
                    }
                    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
                        throw new Error('Voucher sudah kedaluwarsa');
                    }
                    throw new Error('Voucher tidak valid');
                }
            }

            // 3. Create the order

            const newOrder = await tx.order.create({
                data: {
                    userId: session.user.id,
                    orderType,
                    customerName: body.name,
                    customerPhone: body.phone,
                    address,
                    distanceKm,
                    tableNumber: orderType === 'DINE_IN' ? body.tableNumber : null,
                    pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
                    pickupTime: body.pickupTime || null,
                    paymentProofUrl: isWallet ? '/verified-wallet.svg' : (body.paymentProofUrl || null),
                    subtotal: secureSubtotal,
                    deliveryFee,
                    total: secureTotal,
                    paymentMethod: body.paymentMethod?.toUpperCase() || 'TRANSFER',
                    status: isWallet ? 'PENDING' : ((isDoku || body.paymentMethod?.toUpperCase() === 'TRANSFER' || body.paymentMethod?.toUpperCase() === 'QRIS') ? 'PENDING_PAYMENT' : 'PENDING'),
                    hasTumbler,
                    notes: body.paymentChannel 
                        ? `${body.notes || ''}\n[CHANNEL: ${body.paymentChannel}]`.trim() 
                        : (body.notes || null),
                    voucherCode: voucherCode || null,
                    paymentExpiredAt: isWallet ? null : ((isDoku || body.paymentMethod?.toUpperCase() === 'QRIS' || body.paymentMethod?.toUpperCase() === 'TRANSFER') ? new Date(Date.now() + 15 * 60 * 1000) : null),
                    queueNumber,
                    items: {
                        create: orderItemsToCreate
                    }
                }
            })

            if (orderType === 'DINE_IN' && body.tableNumber) {
                const tbl = await tx.diningTable.findUnique({
                    where: { number: body.tableNumber }
                });
                if (tbl) {
                    const addedSeats = body.peopleCount ? parseInt(body.peopleCount) : 1;
                    const newOccupied = Math.min(tbl.capacity, tbl.occupiedSeats + addedSeats);
                    await tx.diningTable.update({
                        where: { number: body.tableNumber },
                        data: { status: 'OCCUPIED', occupiedSeats: newOccupied }
                    });
                }
            }

            // If a Group Cart was checked out, mark it as CHECKED_OUT within the transaction
            if (body.groupCartId) {
                await tx.groupCart.update({
                    where: { id: body.groupCartId },
                    data: { status: 'CHECKED_OUT' }
                });
            }

            // 3.1 Create Wallet payment transaction if using WALLET
            if (isWallet) {
                await tx.walletTransaction.create({
                    data: {
                        userId: session.user.id,
                        amount: -secureTotal,
                        type: 'PAYMENT',
                        description: `Pembayaran pesanan #${queueNumber}`,
                        referenceId: newOrder.id
                    }
                })
            }

            // 4. Write point history (points already deducted above)
            if (pointsUsed > 0) {
                await tx.pointHistory.create({
                    data: {
                        userId: session.user.id,
                        amount: -pointsUsed,
                        type: 'REDEEM_ORDER',
                        description: `Tukar ${pointsUsed} poin untuk diskon ${formatCurrency(pointsDiscount)}`,
                        orderId: newOrder.id
                    }
                })
            }

            return newOrder
        })

        // Generate QRIS via Doku MCP Server or Doku Hosted Checkout V1 session for QRIS payment method
        const isQris = body.paymentMethod?.toUpperCase() === 'QRIS'
        if (isQris && paymentSettings) {
            try {
                if (!paymentSettings.dokuEnabled) {
                    throw new Error('Metode pembayaran Doku sedang tidak aktif.')
                }

                const { createDokuMcpQrisPayment, createDokuCheckoutSession } = await import('@/lib/doku')
                
                // Try to generate QRIS dinamis directly via DOKU MCP Server first
                console.log('[QRIS] Attempting to generate QRIS via DOKU MCP Server...')
                const mcpResult = await createDokuMcpQrisPayment({
                    clientId: paymentSettings.dokuClientId,
                    sharedKey: paymentSettings.dokuSharedKey,
                    isSandbox: paymentSettings.dokuSandbox,
                }, {
                    invoiceNumber: order.id,
                    amount: secureTotal,
                    postalCode: '67215' // Default store postal code
                })

                if (mcpResult.qrContent) {
                    // Save the QRIS content to the order and keep paymentUrl null
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            paymentQrContent: mcpResult.qrContent,
                            paymentUrl: null
                        }
                    })
                    console.log('[QRIS] Dynamic QRIS generated successfully via DOKU MCP.')
                } else {
                    console.warn('[QRIS] DOKU MCP generation failed/returned no QR content. Error:', mcpResult.error)
                    console.log('[QRIS] Falling back to Doku Hosted Checkout V1 session...')
                    
                    const callbackUrl = `${appUrl}/orders/${order.id}`
                    const notificationUrl = `${appUrl}/api/payment/doku-webhook`
                    
                    const dokuResult = await createDokuCheckoutSession({
                        clientId: paymentSettings.dokuClientId,
                        sharedKey: paymentSettings.dokuSharedKey,
                        isSandbox: paymentSettings.dokuSandbox,
                    }, {
                        invoiceNumber: order.id,
                        amount: secureTotal,
                        customerName: order.customerName,
                        customerPhone: order.customerPhone,
                        customerEmail: session.user.email || 'arumseduh@gmail.com',
                        callbackUrl,
                        notificationUrl,
                        paymentChannel: undefined // Show all channels including QRIS on Doku page
                    })

                    if (dokuResult.error) {
                        throw new Error(`Doku Hosted Checkout fallback failed: ${dokuResult.error}`)
                    }

                    // Save DOKU payment URL to the order and keep paymentQrContent null
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { 
                            paymentUrl: dokuResult.url,
                            paymentQrContent: null,
                        }
                    })
                    console.log('[QRIS] Doku Hosted Checkout URL generated successfully for QRIS (Fallback).')
                }
            } catch (qrisError: any) {
                console.error('[QRIS DOKU CHECKOUT ERROR]', qrisError)
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED', notes: `DOKU Checkout QRIS Failure: ${qrisError.message}` }
                })
                return NextResponse.json({ error: `Gagal membuat sesi pembayaran DOKU: ${qrisError.message}` }, { status: 500 })
            }
        }

        // Call DOKU Hosted Checkout V1 API or SNAP QRIS outside the database transaction
        if (isDoku && paymentSettings) {
            try {
                const channel = body.paymentChannel?.toUpperCase()
                
                if (channel === 'QRIS') {
                    const { createDokuMcpQrisPayment, createDokuCheckoutSession } = await import('@/lib/doku')
                    
                    console.log('[QRIS Instan] Attempting to generate QRIS via DOKU MCP Server...')
                    let qrContent: string | null = null
                    let mcpError: string | null = null
                    try {
                        const mcpResult = await createDokuMcpQrisPayment({
                            clientId: paymentSettings.dokuClientId,
                            sharedKey: paymentSettings.dokuSharedKey,
                            isSandbox: paymentSettings.dokuSandbox,
                        }, {
                            invoiceNumber: order.id,
                            amount: secureTotal,
                            postalCode: '67215'
                        })
                        if (mcpResult.qrContent) {
                            qrContent = mcpResult.qrContent
                        } else {
                            mcpError = mcpResult.error || 'Empty QR content'
                            console.warn('[QRIS Instan] DOKU MCP generation failed/returned no QR content. Error:', mcpResult.error)
                        }
                    } catch (mcpErr: any) {
                        mcpError = mcpErr.message || String(mcpErr)
                        console.error('[QRIS Instan] DOKU MCP request threw exception:', mcpErr)
                    }

                    if (!qrContent) {
                        throw new Error(`Gagal menghasilkan QRIS otomatis dari Doku API: ${mcpError || 'Unknown error'}`)
                    }

                    // Generate backup hosted checkout session URL
                    let paymentUrl: string | null = null
                    try {
                        const callbackUrl = `${appUrl}/orders/${order.id}`
                        const notificationUrl = `${appUrl}/api/payment/doku-webhook`
                        const dokuResult = await createDokuCheckoutSession({
                            clientId: paymentSettings.dokuClientId,
                            sharedKey: paymentSettings.dokuSharedKey,
                            isSandbox: paymentSettings.dokuSandbox,
                        }, {
                            invoiceNumber: order.id,
                            amount: secureTotal,
                            customerName: order.customerName,
                            customerPhone: order.customerPhone,
                            customerEmail: session.user.email || 'arumseduh@gmail.com',
                            callbackUrl,
                            notificationUrl,
                            paymentChannel: undefined
                        })
                        if (dokuResult && dokuResult.url) {
                            paymentUrl = dokuResult.url
                        }
                    } catch (sessionErr) {
                        console.error('[QRIS Instan] Failed to generate backup hosted session:', sessionErr)
                    }

                    // Save both to the order record (keep paymentUrl for portal redirect option)
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { 
                            paymentQrContent: qrContent,
                            paymentUrl: paymentUrl
                        }
                    })
                    console.log('[QRIS Instan] Dynamic QRIS successfully populated.')
                } else {
                    const { createDokuCheckoutSession } = await import('@/lib/doku')
                    
                    // Map frontend channel to Doku V1 channel
                    let dokuChannel: string | undefined = undefined
                    if (channel === 'OVO') dokuChannel = 'EMONEY_OVO'
                    else if (channel === 'DANA') dokuChannel = 'EMONEY_DANA'
                    else if (channel === 'SHOPEEPAY') dokuChannel = 'EMONEY_SHOPEE_PAY'
                    else if (channel === 'BCA_VA') dokuChannel = 'VIRTUAL_ACCOUNT_BCA'
                    
                    const callbackUrl = `${appUrl}/orders/${order.id}`
                    const notificationUrl = `${appUrl}/api/payment/doku-webhook`
                    const dokuResult = await createDokuCheckoutSession({
                        clientId: paymentSettings.dokuClientId,
                        sharedKey: paymentSettings.dokuSharedKey,
                        isSandbox: paymentSettings.dokuSandbox,
                    }, {
                        invoiceNumber: order.id,
                        amount: secureTotal,
                        customerName: order.customerName,
                        customerPhone: order.customerPhone,
                        customerEmail: session.user.email || 'arumseduh@gmail.com',
                        callbackUrl,
                        notificationUrl,
                        paymentChannel: dokuChannel
                    })

                    if (dokuResult.error) {
                        throw new Error(dokuResult.error)
                    }

                    // Save DOKU payment URL to the order
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { 
                            paymentUrl: dokuResult.url,
                        }
                    })
                }
            } catch (dokuError: any) {
                console.error('[DOKU INITIALIZATION ERROR]', dokuError)
                // Set order status to CANCELLED since DOKU session generation failed
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED', notes: `DOKU Session Failure: ${dokuError.message}` }
                })
                return NextResponse.json({ error: `Gagal memproses pembayaran DOKU: ${dokuError.message}` }, { status: 500 })
            }
        }

        // Send order notification to user
        try {
            const { sendNotification } = await import('@/lib/notification-service')
            await sendNotification({
                userId: session.user.id,
                type: 'order',
                title: 'Pesanan Diterima! 🍵',
                message: `Pesanan ${order.id.slice(0, 8).toUpperCase()} berhasil dibuat. ${orderType === 'PICKUP' ? `Ambil pada ${body.pickupTime} tanggal ${body.pickupDate}` : 'Akan segera diproses.'}`,
                linkUrl: `/orders/${order.id}`,
                data: { orderId: order.id },
            })
        } catch (e) {
            console.error('[CHECKOUT] Notification error:', e)
        }

        // Send admin & kitchen notification
        try {
            const { sendAdminNewOrderNotification, sendKitchenNotification } = await import('@/lib/whatsapp-service')
            await sendAdminNewOrderNotification(order.id)
            await sendKitchenNotification(order.id)
        } catch (e) {
            console.error('[CHECKOUT] Admin/Kitchen notification error:', e)
        }

        // Read paymentUrl from the order record (set by DOKU block above)
        const finalOrder = await prisma.order.findUnique({ where: { id: order.id }, select: { paymentUrl: true } })
        return NextResponse.json({ success: true, orderId: order.id, total: secureTotal, paymentUrl: finalOrder?.paymentUrl || undefined })
    } catch (error) {
        // ✅ BUG FIX #7: Proper error handling with safe responses
        logError(error, {
            route: 'checkout',
            userId: (await auth())?.user?.id,
            timestamp: new Date().toISOString(),
        });

        const safeError = getSafeErrorResponse(error);
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        );
    }
}
