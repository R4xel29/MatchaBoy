import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientId } from '@/lib/rate-limit-redis'
import { calculateDeliveryFee } from '@/lib/delivery-utils'
import { getActivePromo } from '@/lib/utils'
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors'


const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()

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

        // Validate pickup fields
        const orderType = body.orderType || 'PICKUP'
        if (orderType === 'PICKUP' && (!body.pickupDate || !body.pickupTime)) {
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
                // Securely calculate size price
                let secureSizePrice = 0
                if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                    const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                    if (validSize) {
                        secureSizePrice = validSize.price
                    }
                }

                // Calculate Add-Ons total
                let addOnsTotal = 0
                if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                    for (const addOnId of item.addOnIds) {
                        const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                        if (validAddOn) {
                            addOnsTotal += validAddOn.price
                        }
                    }
                }
                secureItemPrice += secureSizePrice + addOnsTotal;
            }

            const secureItemTotal = secureItemPrice * item.quantity
            secureSubtotal += secureItemTotal

            orderItemsToCreate.push({
                productId: dbProduct.id,
                qty: item.quantity,
                price: secureItemPrice,
                modifiers: dbModifiers.isBundle 
                    ? JSON.stringify({ isBundle: true, bundleSelections: item.bundleSelections }) 
                    : (item.modsString || null)
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
            deliveryFee = calculateDeliveryFee(distanceKm, perKmFee)
        }

        // Fetch loyalty settings
        const loyaltySettings = await prisma.loyaltySettings.findFirst()

        // Tumbler discount
        const hasTumbler = body.hasTumbler === true
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
                                // Add-ons adjustment if applicable
                                const activePromo = getActivePromo(dbProduct)
                                let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price
                                let dbModifiers: any = {}
                                if (dbProduct.modifiers) {
                                    try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                }
                                if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
                                    let secureBundleAdjustments = 0
                                    for (const sel of item.bundleSelections) {
                                        const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId)
                                        if (group) {
                                            const option = group.options?.find((o: any) => o.productId === sel.productId)
                                            if (option) secureBundleAdjustments += option.priceAdjustment || 0
                                        }
                                    }
                                    secureItemPrice += secureBundleAdjustments
                                } else {
                                    let addOnsTotal = 0
                                    if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                        for (const addOnId of item.addOnIds) {
                                            const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                            if (validAddOn) addOnsTotal += validAddOn.price
                                        }
                                    }
                                    secureItemPrice += addOnsTotal
                                }
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
                                    const activePromo = getActivePromo(dbProduct)
                                    let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price
                                    let dbModifiers: any = {}
                                    if (dbProduct.modifiers) {
                                        try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                    }
                                    if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
                                        let secureBundleAdjustments = 0
                                        for (const sel of item.bundleSelections) {
                                            const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId)
                                            if (group) {
                                                const option = group.options?.find((o: any) => o.productId === sel.productId)
                                                if (option) secureBundleAdjustments += option.priceAdjustment || 0
                                            }
                                        }
                                        secureItemPrice += secureBundleAdjustments
                                    } else {
                                        let secureSizePrice = 0
                                        if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                                            const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                                            if (validSize) {
                                                secureSizePrice = validSize.price
                                            }
                                        }
                                        let addOnsTotal = 0
                                        if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                            for (const addOnId of item.addOnIds) {
                                                const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                                if (validAddOn) addOnsTotal += validAddOn.price
                                            }
                                        }
                                        secureItemPrice += secureSizePrice + addOnsTotal
                                    }
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
                                const activePromo = getActivePromo(dbProduct)
                                let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price
                                let dbModifiers: any = {}
                                if (dbProduct.modifiers) {
                                    try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                }
                                if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
                                    let secureBundleAdjustments = 0
                                    for (const sel of item.bundleSelections) {
                                        const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId)
                                        if (group) {
                                            const option = group.options?.find((o: any) => o.productId === sel.productId)
                                            if (option) secureBundleAdjustments += option.priceAdjustment || 0
                                        }
                                    }
                                    secureItemPrice += secureBundleAdjustments
                                } else {
                                    let secureSizePrice = 0
                                    if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                                        const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                                        if (validSize) {
                                            secureSizePrice = validSize.price
                                        }
                                    }
                                    let addOnsTotal = 0
                                    if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                        for (const addOnId of item.addOnIds) {
                                            const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                            if (validAddOn) addOnsTotal += validAddOn.price
                                        }
                                    }
                                    secureItemPrice += secureSizePrice + addOnsTotal
                                }
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
                                const activePromo = getActivePromo(dbProduct)
                                let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price
                                let dbModifiers: any = {}
                                if (dbProduct.modifiers) {
                                    try { dbModifiers = JSON.parse(dbProduct.modifiers) } catch {}
                                }
                                if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
                                    let secureBundleAdjustments = 0
                                    for (const sel of item.bundleSelections) {
                                        const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId)
                                        if (group) {
                                            const option = group.options?.find((o: any) => o.productId === sel.productId)
                                            if (option) secureBundleAdjustments += option.priceAdjustment || 0
                                        }
                                    }
                                    secureItemPrice += secureBundleAdjustments
                                } else {
                                    let secureSizePrice = 0
                                    if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                                        const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size)
                                        if (validSize) {
                                            secureSizePrice = validSize.price
                                        }
                                    }
                                    let addOnsTotal = 0
                                    if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                                        for (const addOnId of item.addOnIds) {
                                            const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                                            if (validAddOn) addOnsTotal += validAddOn.price
                                        }
                                    }
                                    secureItemPrice += secureSizePrice + addOnsTotal
                                }
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
        const isDoku = body.paymentMethod?.toUpperCase() === 'DOKU'
        if (isDoku) {
            // DOKU sementara dinonaktifkan — izin belum beres
            return NextResponse.json({ error: 'Metode pembayaran DOKU sedang tidak aktif sementara. Silakan gunakan QRIS atau metode lain.' }, { status: 400 })
        }

        // Build address string
        const address = orderType === 'PICKUP'
            ? 'Ambil di toko'
            : `${body.address?.label || ''} - ${body.address?.detail || ''} | Detail: ${body.address?.streetDetail || ''} (${body.address?.lat || 0}, ${body.address?.lng || 0})`

        // Wrap database operations in a single interactive transaction to ensure data atomicity
        // ✅ BUG FIX #4 & #5: Added row-level locking and atomic operations
        const order = await prisma.$transaction(async (tx) => {
            // Acquire a transaction-level advisory lock to serialize queue number generation and other concurrent checkout writes
            await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(424242);');
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
            const startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)
            const countToday = await tx.order.count({
                where: {
                    createdAt: { gte: startOfDay }
                }
            })
            const nextSeq = String(countToday + 1).padStart(3, '0')
            const prefix = orderType === 'PICKUP' ? 'PKP' : 'DLV'
            const queueNumber = `${prefix}-${nextSeq}`

            const newOrder = await tx.order.create({
                data: {
                    userId: session.user.id,
                    orderType,
                    customerName: body.name,
                    customerPhone: body.phone,
                    address,
                    distanceKm,
                    pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
                    pickupTime: body.pickupTime || null,
                    paymentProofUrl: body.paymentProofUrl || null,
                    subtotal: secureSubtotal,
                    deliveryFee,
                    total: secureTotal,
                    paymentMethod: body.paymentMethod?.toUpperCase() || 'TRANSFER',
                    status: (isDoku || body.paymentMethod?.toUpperCase() === 'TRANSFER' || body.paymentMethod?.toUpperCase() === 'QRIS') ? 'PENDING_PAYMENT' : 'PENDING',
                    hasTumbler,
                    notes: body.notes || null,
                    voucherCode: voucherCode || null,
                    paymentExpiredAt: (isDoku || body.paymentMethod?.toUpperCase() === 'QRIS' || body.paymentMethod?.toUpperCase() === 'TRANSFER') ? new Date(Date.now() + 15 * 60 * 1000) : null,
                    queueNumber,
                    items: {
                        create: orderItemsToCreate
                    }
                }
            })

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
        }, {
            // ✅ FIX: Set transaction isolation level for better consistency
            isolationLevel: 'Serializable',
            timeout: 10000, // 10 second timeout
        })

        // Generate QRIS string for QRIS payment method
        let paymentUrl: string | undefined
        const isQris = body.paymentMethod?.toUpperCase() === 'QRIS'
        if (isQris) {
            try {
                // If paymentSettings exists and has qrisAutoGenerate = false, do not generate QR string
                if (paymentSettings && !paymentSettings.qrisAutoGenerate) {
                    console.log('[QRIS] Auto generate is disabled. Skipping...')
                } else {
                    const { generateQrisString } = await import('@/lib/doku')
                    const customNmid = paymentSettings?.qrisNmid || undefined
                    const paymentQrContent = generateQrisString(secureTotal, order.id, customNmid)

                    // Save QRIS content to the order
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { paymentQrContent }
                    })
                }
            } catch (qrisError: any) {
                console.error('[QRIS GENERATION ERROR]', qrisError)
                // Non-fatal: order tetap dibuat, user bisa hubungi admin
            }
        }

        // Call DOKU Hosted Checkout API outside the database transaction (currently disabled)
        if (isDoku && paymentSettings) {
            try {
                const { createDokuCheckoutSession, generateQrisString } = await import('@/lib/doku')
                const callbackUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/orders/${order.id}`
                
                const dokuResult = await createDokuCheckoutSession({
                    clientId: paymentSettings.dokuClientId,
                    sharedKey: paymentSettings.dokuSharedKey,
                    isSandbox: paymentSettings.dokuSandbox,
                }, {
                    invoiceNumber: order.id,
                    amount: secureTotal,
                    customerName: body.name,
                    customerPhone: body.phone,
                    customerEmail: session.user.email || 'customer@matchaboy.com',
                    callbackUrl,
                })

                if (dokuResult.error) {
                    throw new Error(`DOKU Error: ${dokuResult.error}`)
                }

                paymentUrl = dokuResult.url
                const paymentQrContent = generateQrisString(secureTotal, order.id)

                // Save both payment URL and QRIS content back to the order
                await prisma.order.update({
                    where: { id: order.id },
                    data: { 
                        paymentUrl,
                        paymentQrContent
                    }
                })
            } catch (dokuError: any) {
                console.error('[DOKU INITIALIZATION ERROR]', dokuError)
                // Set order status to CANCELLED since DOKU generation failed
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED', notes: `DOKU Failure: ${dokuError.message}` }
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

        return NextResponse.json({ success: true, orderId: order.id, total: secureTotal, paymentUrl })
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
