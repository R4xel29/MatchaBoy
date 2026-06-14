import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const latStr = req.nextUrl.searchParams.get('lat') || req.headers.get('x-vercel-ip-latitude')
        const lonStr = req.nextUrl.searchParams.get('lon') || req.headers.get('x-vercel-ip-longitude')
        const clientHourStr = req.nextUrl.searchParams.get('hour')

        // Extract city name from Vercel Geolocation headers if available
        const ipCity = req.headers.get('x-vercel-ip-city')
        const defaultCity = ipCity ? decodeURIComponent(ipCity) : 'Probolinggo'

        let lat = latStr ? parseFloat(latStr) : -7.78125
        let lon = lonStr ? parseFloat(lonStr) : 113.21226

        // Compute local hour with fallback to Asia/Jakarta (WIB, UTC+7) if not provided by client
        const serverDate = new Date()
        const utc = serverDate.getTime() + (serverDate.getTimezoneOffset() * 60000)
        const wibDate = new Date(utc + (3600000 * 7))
        const hour = clientHourStr ? parseInt(clientHourStr) : wibDate.getHours()

        let weatherData = {
            temp: 29.8,
            condition: 'Sunny',
            description: 'Cerah Berawan',
            city: defaultCity,
            icon: '01d'
        }

        const apiKey = process.env.OPENWEATHERMAP_API_KEY
        let isSimulated = true

        if (apiKey) {
            try {
                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=id`,
                    { next: { revalidate: 600 } } // Cache weather for 10 minutes
                )
                if (res.ok) {
                    const data = await res.json()
                    weatherData = {
                        temp: data.main?.temp ?? 29.8,
                        condition: data.weather?.[0]?.main ?? 'Sunny',
                        description: data.weather?.[0]?.description ?? 'Cerah',
                        city: data.name ?? defaultCity,
                        icon: data.weather?.[0]?.icon ?? '01d'
                    }
                    isSimulated = false
                }
            } catch (err) {
                console.warn('OpenWeatherMap API failed, falling back to simulation:', err)
            }
        }

        // If simulated, adjust based on time of day with realistic defaults
        if (isSimulated) {
            const isSimulatedNight = hour >= 18 || hour < 6
            if (isSimulatedNight) {
                weatherData.temp = 24.5
                weatherData.condition = 'Cloudy'
                weatherData.description = 'Berawan Malam'
                weatherData.icon = '04n'
            } else {
                // Daytime - default to sunny/clear, not rain
                const isAfternoon = hour >= 12 && hour <= 15
                const isMorning = hour >= 6 && hour < 10
                weatherData.temp = isAfternoon ? 31.5 : isMorning ? 26.5 : 28.8
                weatherData.condition = 'Sunny'
                weatherData.description = isAfternoon ? 'Cerah Panas' : isMorning ? 'Cerah Berawan' : 'Cerah'
                weatherData.icon = isAfternoon ? '01d' : '02d'
            }
        }

        const targetIds = [
            'hot-matcha', 'brand-croissant', 'dirty-matcha',
            'brand-strawberry', 'yuzu-matcha', 'brand-signature',
            'brand-biscoff', 'brand-tiramisu', 'brand-cookie'
        ];
        const allProducts = await prisma.product.findMany({
            where: { id: { in: targetIds } }
        });

        // Determine if it is night time (either via client hour or weather icon ending in 'n')
        const isNight = hour >= 18 || hour < 6 || (weatherData.icon && weatherData.icon.endsWith('n'))

        // Hot weather represents terik/sunny daytime conditions, so it shouldn't apply at night
        const isHotWeather = weatherData.temp >= 27.0 && !isNight
        const conditionLower = weatherData.condition.toLowerCase()
        const isRainy = conditionLower.includes('rain') || conditionLower.includes('drizzle') || conditionLower.includes('storm')

        let tagline = ""
        let recommendedProducts: any[] = []

        if (isRainy) {
            tagline = `Cuaca sedang hujan dingin 🌧️ di ${weatherData.city}. Yuk hangatkan harimu dengan Hot Matcha murni atau croissant panggang hangat kami!`
            const hotMatcha = allProducts.find(p => p.id === 'hot-matcha')
            const croissant = allProducts.find(p => p.id === 'brand-croissant')
            const dirty = allProducts.find(p => p.id === 'dirty-matcha')

            if (hotMatcha) recommendedProducts.push(hotMatcha)
            if (croissant) recommendedProducts.push(croissant)
            if (dirty) recommendedProducts.push(dirty)
        } else if (isHotWeather) {
            tagline = `Cuaca hari ini cukup terik ☀️ (${weatherData.temp.toFixed(1)}°C) di ${weatherData.city}. Segarkan dirimu dengan Iced Matcha Strawberry atau Yuzu Matcha Sparkle yang dingin segar!`
            const strawberry = allProducts.find(p => p.id === 'brand-strawberry')
            const yuzu = allProducts.find(p => p.id === 'yuzu-matcha')
            const signature = allProducts.find(p => p.id === 'brand-signature')
            const biscoff = allProducts.find(p => p.id === 'brand-biscoff')

            if (strawberry) recommendedProducts.push(strawberry)
            if (yuzu) recommendedProducts.push(yuzu)
            if (signature) recommendedProducts.push(signature)
            if (biscoff) recommendedProducts.push(biscoff)
        } else {
            // Cool/night weather - matches when temp < 27.0 or when it is night
            const weatherDesc = isNight ? 'Suasana malam/sejuk' : `Udara sejuk`;
            tagline = `${weatherDesc} 🍃 (${weatherData.temp.toFixed(1)}°C) di ${weatherData.city}. Nikmati santai malam dengan Matcha Signature creamy atau Matcha Tiramisu manis lembut.`
            const signature = allProducts.find(p => p.id === 'brand-signature')
            const tiramisu = allProducts.find(p => p.id === 'brand-tiramisu')
            const cookies = allProducts.find(p => p.id === 'brand-cookie')

            if (signature) recommendedProducts.push(signature)
            if (tiramisu) recommendedProducts.push(tiramisu)
            if (cookies) recommendedProducts.push(cookies)
        }

        // Fallback if no specific products matched
        if (recommendedProducts.length === 0) {
            recommendedProducts = allProducts.slice(0, 3)
        }

        return NextResponse.json({
            success: true,
            weather: weatherData,
            tagline,
            recommendations: recommendedProducts
        })
    } catch (error) {
        console.error('Weather recommendations API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
