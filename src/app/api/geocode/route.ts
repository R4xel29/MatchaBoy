import { NextResponse } from 'next/server'

// Server-side proxy for Nominatim (OSM), Google Maps, Mapbox, and HERE Search APIs
// Incorporates a local high-fidelity POI database for major Probolinggo landmarks

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

// Local POI Dictionary for Probolinggo landmarks missing from OSM
const LOCAL_POIS: { name: string; aliases: string[]; display_name: string; lat: string; lon: string; class: string; type: string }[] = [
  // ===== SEKOLAH MENENGAH ATAS & KEJURUAN =====
  { name:'SMK Negeri 1 Probolinggo', aliases:['smkn 1 probolinggo','smk 1 probolinggo','smkn1 probolinggo','smk negeri 1 probolinggo','smkn 1','smk 1'], display_name:'SMK Negeri 1 Probolinggo, Jl. Mastrip No.357, Jrebeng Wetan, Kec. Kedopok, Kota Probolinggo, Jawa Timur 67239', lat:'-7.766157', lon:'113.224850', class:'amenity', type:'school' },
  { name:'SMK Negeri 2 Probolinggo', aliases:['smkn 2 probolinggo','smk 2 probolinggo','smkn2 probolinggo','smk negeri 2 probolinggo','smkn 2','smk 2'], display_name:'SMK Negeri 2 Probolinggo, Jl. Mastrip No.25, Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur 67213', lat:'-7.762142', lon:'113.211910', class:'amenity', type:'school' },
  { name:'SMK Negeri 3 Probolinggo', aliases:['smkn 3 probolinggo','smk 3 probolinggo','smkn3 probolinggo','smk negeri 3 probolinggo','smkn 3'], display_name:'SMK Negeri 3 Probolinggo, Jl. Cokroaminoto No.35, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.752800', lon:'113.214300', class:'amenity', type:'school' },
  { name:'SMA Negeri 1 Probolinggo', aliases:['sman 1 probolinggo','sma 1 probolinggo','sman1 probolinggo','sma negeri 1 probolinggo','sman 1','sma 1'], display_name:'SMA Negeri 1 Probolinggo, Jl. Soekarno - Hatta No.137, Pilang, Kec. Kademangan, Kota Probolinggo, Jawa Timur 67221', lat:'-7.747192', lon:'113.197940', class:'amenity', type:'school' },
  { name:'SMA Negeri 2 Probolinggo', aliases:['sman 2 probolinggo','sma 2 probolinggo','sman2 probolinggo','sma negeri 2 probolinggo','sman 2','sma 2'], display_name:'SMA Negeri 2 Probolinggo, Jl. Ki Hajar Dewantara No.1, Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur 67213', lat:'-7.760105', lon:'113.215540', class:'amenity', type:'school' },
  { name:'SMA Negeri 3 Probolinggo', aliases:['sman 3 probolinggo','sma 3 probolinggo','sman3 probolinggo','sma negeri 3 probolinggo','sman 3'], display_name:'SMA Negeri 3 Probolinggo, Jl. Soekarno - Hatta, Pilang, Kec. Kademangan, Kota Probolinggo, Jawa Timur', lat:'-7.748500', lon:'113.196200', class:'amenity', type:'school' },
  { name:'SMA Negeri 4 Probolinggo', aliases:['sman 4 probolinggo','sma 4 probolinggo','sman4 probolinggo','sma negeri 4 probolinggo','sman 4'], display_name:'SMA Negeri 4 Probolinggo, Jl. Raya Bromo, Wonoasih, Kec. Wonoasih, Kota Probolinggo, Jawa Timur', lat:'-7.766800', lon:'113.205500', class:'amenity', type:'school' },
  // ===== SEKOLAH MENENGAH PERTAMA =====
  { name:'SMP Negeri 1 Probolinggo', aliases:['smpn 1 probolinggo','smp 1 probolinggo','smpn1 probolinggo','smp negeri 1 probolinggo','smpn 1'], display_name:'SMP Negeri 1 Probolinggo, Jl. Suroyo No.35, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.751700', lon:'113.215100', class:'amenity', type:'school' },
  { name:'SMP Negeri 2 Probolinggo', aliases:['smpn 2 probolinggo','smp 2 probolinggo','smpn2 probolinggo','smp negeri 2 probolinggo','smpn 2'], display_name:'SMP Negeri 2 Probolinggo, Jl. KH. Mansyur, Mayangan, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.744200', lon:'113.213500', class:'amenity', type:'school' },
  { name:'SMP Negeri 3 Probolinggo', aliases:['smpn 3 probolinggo','smp 3 probolinggo','smpn3 probolinggo','smp negeri 3 probolinggo','smpn 3'], display_name:'SMP Negeri 3 Probolinggo, Jl. Basuki Rahmat, Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.755800', lon:'113.212300', class:'amenity', type:'school' },
  { name:'SMP Negeri 5 Probolinggo', aliases:['smpn 5 probolinggo','smp 5 probolinggo','smpn5 probolinggo','smp negeri 5 probolinggo','smpn 5'], display_name:'SMP Negeri 5 Probolinggo, Jl. Mastrip, Wonoasih, Kec. Wonoasih, Kota Probolinggo, Jawa Timur', lat:'-7.764500', lon:'113.210200', class:'amenity', type:'school' },
  // ===== SEKOLAH DASAR =====
  { name:'SD Katolik Mater Dei Probolinggo', aliases:['sd mater dei','sd katolik mater dei','mater dei probolinggo','mater dei','sd mater dei probolinggo'], display_name:'SD Katolik Mater Dei, Jl. Suroyo, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.752100', lon:'113.215600', class:'amenity', type:'school' },
  { name:'SD Negeri 1 Sukabumi Probolinggo', aliases:['sdn 1 sukabumi','sd 1 sukabumi','sd negeri 1 sukabumi'], display_name:'SD Negeri 1 Sukabumi, Sukabumi, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.746200', lon:'113.216800', class:'amenity', type:'school' },
  // ===== UNIVERSITAS & PERGURUAN TINGGI =====
  { name:'Universitas Panca Marga Probolinggo', aliases:['upm probolinggo','universitas panca marga','panca marga','upm'], display_name:'Universitas Panca Marga, Jl. Yos Sudarso No.107, Pabean, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.741800', lon:'113.219500', class:'amenity', type:'university' },
  { name:'Universitas Nurul Jadid Probolinggo', aliases:['unuja','universitas nurul jadid','nurul jadid'], display_name:'Universitas Nurul Jadid, Karanganyar, Paiton, Kab. Probolinggo, Jawa Timur', lat:'-7.714200', lon:'113.519800', class:'amenity', type:'university' },
  // ===== RUMAH SAKIT & KESEHATAN =====
  { name:'RSUD dr. Mohamad Saleh', aliases:['rsud probolinggo','rsud dr mohamad saleh','rsud moh saleh','rumah sakit probolinggo','rsud saleh','rs probolinggo'], display_name:'RSUD dr. Mohamad Saleh, Jl. Mayjen Panjaitan No.65, Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur 67213', lat:'-7.754200', lon:'113.218700', class:'amenity', type:'hospital' },
  { name:'RS Dharma Husada Probolinggo', aliases:['rs dharma husada','dharma husada probolinggo','rumah sakit dharma husada'], display_name:'RS Dharma Husada, Jl. Panglima Sudirman No.80, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.751400', lon:'113.212700', class:'amenity', type:'hospital' },
  { name:'RS Wonolangan', aliases:['rs wonolangan','rumah sakit wonolangan','wonolangan'], display_name:'RS Wonolangan, Wonolangan, Kec. Maron, Kab. Probolinggo, Jawa Timur', lat:'-7.768600', lon:'113.173100', class:'amenity', type:'hospital' },
  // ===== TEMPAT IBADAH =====
  { name:'Masjid Agung Probolinggo', aliases:['masjid agung probolinggo','masjid agung','masjid besar probolinggo'], display_name:'Masjid Agung Kota Probolinggo, Jl. Panglima Sudirman, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.749800', lon:'113.211500', class:'amenity', type:'place_of_worship' },
  { name:'Masjid At-Taqwa Probolinggo', aliases:['masjid at taqwa','masjid attaqwa','at taqwa probolinggo'], display_name:'Masjid At-Taqwa, Mayangan, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.746300', lon:'113.213200', class:'amenity', type:'place_of_worship' },
  { name:'Gereja Katolik Hati Kudus Probolinggo', aliases:['gereja hati kudus','gereja katolik probolinggo','hati kudus probolinggo'], display_name:'Gereja Katolik Hati Kudus, Jl. Panglima Sudirman, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.751100', lon:'113.212200', class:'amenity', type:'place_of_worship' },
  // ===== PASAR & PUSAT PERBELANJAAN =====
  { name:'Pasar Baru Probolinggo', aliases:['pasar baru probolinggo','pasar baru','pasar probolinggo'], display_name:'Pasar Baru Probolinggo, Mangunharjo, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.748600', lon:'113.213100', class:'shop', type:'marketplace' },
  { name:'Pasar Gotong Royong', aliases:['pasar gotong royong','gotong royong probolinggo','pasar goro'], display_name:'Pasar Gotong Royong, Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.755300', lon:'113.213600', class:'shop', type:'marketplace' },
  { name:'Pasar Wonoasih', aliases:['pasar wonoasih','wonoasih pasar'], display_name:'Pasar Wonoasih, Wonoasih, Kec. Wonoasih, Kota Probolinggo, Jawa Timur', lat:'-7.763400', lon:'113.207800', class:'shop', type:'marketplace' },
  { name:'Bromo Junction Mall', aliases:['bromo junction','bromo junction mall','bjm probolinggo','mall probolinggo','bjm'], display_name:'Bromo Junction Mall, Jl. Soekarno Hatta, Kota Probolinggo, Jawa Timur', lat:'-7.748100', lon:'113.198200', class:'shop', type:'mall' },
  // ===== PEMERINTAHAN =====
  { name:'Kantor Walikota Probolinggo', aliases:['kantor walikota','pemkot probolinggo','balai kota probolinggo','walikota probolinggo','pemkot'], display_name:'Kantor Walikota Probolinggo, Jl. Panglima Sudirman, Tisnonegaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.750600', lon:'113.213100', class:'office', type:'government' },
  { name:'Kantor Bupati Probolinggo', aliases:['kantor bupati probolinggo','pemkab probolinggo','bupati probolinggo','pemkab'], display_name:'Kantor Bupati Kabupaten Probolinggo, Jl. Panglima Sudirman No.134, Kota Probolinggo, Jawa Timur', lat:'-7.750100', lon:'113.213800', class:'office', type:'government' },
  { name:'Kantor DPRD Kota Probolinggo', aliases:['dprd probolinggo','dprd kota probolinggo','dewan probolinggo'], display_name:'Kantor DPRD Kota Probolinggo, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.751200', lon:'113.213500', class:'office', type:'government' },
  { name:'Kantor Kecamatan Mayangan', aliases:['kecamatan mayangan','kelurahan mayangan','kantor mayangan'], display_name:'Kantor Kecamatan Mayangan, Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.745100', lon:'113.213800', class:'office', type:'government' },
  { name:'Kantor Kecamatan Kanigaran', aliases:['kecamatan kanigaran','kelurahan kanigaran','kantor kanigaran'], display_name:'Kantor Kecamatan Kanigaran, Kanigaran, Kota Probolinggo, Jawa Timur', lat:'-7.755700', lon:'113.215200', class:'office', type:'government' },
  // ===== LANDMARK & WISATA =====
  { name:'Alun-Alun Kota Probolinggo', aliases:['alun alun probolinggo','alun-alun probolinggo','alun alun kota probolinggo','alun alun','alun-alun'], display_name:'Alun-Alun Kota Probolinggo, Mangunharjo, Kec. Mayangan, Kota Probolinggo, Jawa Timur 67211', lat:'-7.749321', lon:'113.211754', class:'leisure', type:'park' },
  { name:'Taman Wisata Studi Lingkungan (TWSL)', aliases:['twsl probolinggo','taman wisata studi lingkungan','twsl','taman mangrove probolinggo'], display_name:'TWSL Probolinggo, Jl. Raya Pelabuhan, Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.734500', lon:'113.218900', class:'tourism', type:'attraction' },
  { name:'Pelabuhan Tanjung Tembaga', aliases:['pelabuhan probolinggo','tanjung tembaga','pelabuhan tanjung tembaga'], display_name:'Pelabuhan Tanjung Tembaga, Mayangan, Kec. Mayangan, Kota Probolinggo, Jawa Timur', lat:'-7.733100', lon:'113.220300', class:'amenity', type:'ferry_terminal' },
  { name:'GOR Mastrip Probolinggo', aliases:['gor mastrip','gor probolinggo','gelanggang olahraga probolinggo'], display_name:'GOR Mastrip, Jl. Mastrip, Kedopok, Kota Probolinggo, Jawa Timur', lat:'-7.759400', lon:'113.208600', class:'leisure', type:'sports_centre' },
  { name:'Taman Wisata Sumber Tujuh', aliases:['sumber tujuh','taman sumber tujuh','wisata sumber tujuh'], display_name:'Taman Wisata Sumber Tujuh, Wonoasih, Kota Probolinggo, Jawa Timur', lat:'-7.771200', lon:'113.199100', class:'tourism', type:'attraction' },
  // ===== TRANSPORTASI =====
  { name:'Stasiun Probolinggo', aliases:['stasiun probolinggo','stasiun kereta probolinggo','stasiun kereta'], display_name:'Stasiun Probolinggo, Jl. KH. Mansyur, Mayangan, Kec. Mayangan, Kota Probolinggo, Jawa Timur 67211', lat:'-7.743120', lon:'113.213320', class:'amenity', type:'station' },
  { name:'Terminal Bayuangga Probolinggo', aliases:['terminal probolinggo','terminal bayuangga','bayuangga','terminal bus probolinggo'], display_name:'Terminal Bayuangga, Jl. Raya Bromo, Wonoasih, Kec. Wonoasih, Kota Probolinggo, Jawa Timur', lat:'-7.769500', lon:'113.204200', class:'amenity', type:'bus_station' },
  // ===== PERBANKAN =====
  { name:'Bank BRI Cabang Probolinggo', aliases:['bri probolinggo','bank bri probolinggo','bank bri'], display_name:'Bank BRI Cabang Probolinggo, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.750400', lon:'113.212500', class:'amenity', type:'bank' },
  { name:'Bank BCA Probolinggo', aliases:['bca probolinggo','bank bca probolinggo','bank bca'], display_name:'Bank BCA Cabang Probolinggo, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.750800', lon:'113.211900', class:'amenity', type:'bank' },
  { name:'Bank Mandiri Probolinggo', aliases:['mandiri probolinggo','bank mandiri probolinggo','bank mandiri'], display_name:'Bank Mandiri Cabang Probolinggo, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.750300', lon:'113.213100', class:'amenity', type:'bank' },
  { name:'Bank BNI Probolinggo', aliases:['bni probolinggo','bank bni probolinggo','bank bni'], display_name:'Bank BNI Cabang Probolinggo, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.750700', lon:'113.212800', class:'amenity', type:'bank' },
  // ===== KULINER & CAFE =====
  { name:'Café De Bromo', aliases:['cafe de bromo','de bromo','cafe de bromo probolinggo'], display_name:'Café De Bromo, Jl. Panglima Sudirman, Tisnonegaran, Kota Probolinggo, Jawa Timur', lat:'-7.750900', lon:'113.212400', class:'amenity', type:'cafe' },
  { name:'Warung Rawon Nguling', aliases:['rawon nguling','warung rawon nguling','rawon probolinggo'], display_name:'Warung Rawon Nguling, Jl. Soekarno Hatta, Kota Probolinggo, Jawa Timur', lat:'-7.747600', lon:'113.199400', class:'amenity', type:'restaurant' },
  // ===== PENGINAPAN =====
  { name:'Hotel Bromo View Probolinggo', aliases:['hotel bromo view','bromo view','bromo view hotel'], display_name:'Hotel Bromo View, Jl. Panglima Sudirman No.237, Kota Probolinggo, Jawa Timur', lat:'-7.751800', lon:'113.210800', class:'tourism', type:'hotel' },
  { name:'Hotel Ratna Probolinggo', aliases:['hotel ratna','ratna hotel','hotel ratna probolinggo'], display_name:'Hotel Ratna, Jl. Panglima Sudirman, Kota Probolinggo, Jawa Timur', lat:'-7.751300', lon:'113.211600', class:'tourism', type:'hotel' },
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'forward'
    const query = searchParams.get('q')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    const baseLat = lat ? parseFloat(lat) : -7.756928
    const baseLng = lng ? parseFloat(lng) : 113.211502

    // API keys from environment
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const mapboxKey = process.env.MAPBOX_ACCESS_TOKEN
    const hereKey = process.env.HERE_API_KEY

    const isGoogleActive = googleKey && googleKey !== 'YOUR_WAKTU_INI_KEY' && googleKey.trim() !== ''
    const isMapboxActive = mapboxKey && mapboxKey.trim() !== ''
    const isHereActive = hereKey && hereKey.trim() !== ''
    const isAnyApiActive = isGoogleActive || isMapboxActive || isHereActive

    // 1. Perform Local POI matching to bypass key requirements for local Probolinggo tests
    let localMatches: any[] = []
    if (!isAnyApiActive && mode === 'forward' && query) {
      const normQuery = query.toLowerCase().trim()
      localMatches = LOCAL_POIS.filter(poi => {
        return poi.aliases.some(alias => normQuery.includes(alias) || alias.includes(normQuery))
      })
    }

    // ==========================================
    // ENGINE 1: GOOGLE MAPS PLATFORM
    // ==========================================
    if (isGoogleActive) {
      if (mode === 'reverse' && lat && lng) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}&language=id`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            const firstResult = data.results[0]
            let road = ''
            let houseNumber = ''
            for (const component of firstResult.address_components) {
              if (component.types.includes('route')) road = component.long_name
              if (component.types.includes('street_number')) houseNumber = component.long_name
            }
            return NextResponse.json({
              display_name: firstResult.formatted_address,
              address: {
                road: road || firstResult.formatted_address.split(',')[0],
                house_number: houseNumber
              }
            })
          }
        }
      } else if (query) {
        const url = 'https://places.googleapis.com/v1/places:searchText'
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types'
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: 'id',
            locationBias: {
              circle: {
                center: {
                  latitude: baseLat,
                  longitude: baseLng
                },
                radius: 30000.0
              }
            }
          })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.places && Array.isArray(data.places) && data.places.length > 0) {
            const mapped = data.places.map((place: any) => {
              const primaryType = place.types?.[0] || 'establishment'
              let osmClass = 'place'
              let osmType = primaryType

              if (['school', 'kindergarten', 'university'].includes(primaryType)) {
                osmClass = 'amenity'; osmType = 'school'
              } else if (['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'].includes(primaryType)) {
                osmClass = 'amenity'; osmType = 'restaurant'
              } else if (['hospital', 'pharmacy', 'doctor'].includes(primaryType)) {
                osmClass = 'amenity'; osmType = 'hospital'
              } else if (['church', 'mosque', 'place_of_worship'].includes(primaryType)) {
                osmClass = 'amenity'; osmType = 'place_of_worship'
              } else if (['bank', 'atm'].includes(primaryType)) {
                osmClass = 'amenity'; osmType = 'bank'
              } else if (['store', 'shopping_mall', 'supermarket'].includes(primaryType)) {
                osmClass = 'shop'; osmType = primaryType
              } else if (['lodging'].includes(primaryType)) {
                osmClass = 'tourism'; osmType = 'hotel'
              }

              const name = place.displayName?.text || ''
              const formattedAddress = place.formattedAddress || ''

              return {
                display_name: name && formattedAddress ? `${name}, ${formattedAddress}` : (name || formattedAddress),
                lat: place.location?.latitude?.toString() || '0',
                lon: place.location?.longitude?.toString() || '0',
                class: osmClass,
                type: osmType
              }
            })
            
            // Prepend local matches and remove duplicates
            const combined = [...localMatches]
            mapped.forEach((item: any) => {
              if (!combined.some(c => c.lat === item.lat && c.lon === item.lon)) {
                combined.push(item)
              }
            })
            return NextResponse.json(combined)
          }
        }
      }
    }

    // ==========================================
    // ENGINE 2: MAPBOX SEARCH API
    // ==========================================
    if (isMapboxActive) {
      if (mode === 'reverse' && lat && lng) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${mapboxKey}&language=id`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.features && data.features.length > 0) {
            const first = data.features[0]
            return NextResponse.json({
              display_name: first.place_name,
              address: {
                road: first.text || first.place_name.split(',')[0],
                house_number: first.address || ''
              }
            })
          }
        }
      } else if (query) {
        const d = 0.27
        const minLng = baseLng - d
        const minLat = baseLat - d
        const maxLng = baseLng + d
        const maxLat = baseLat + d
        
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?proximity=${baseLng},${baseLat}&bbox=${minLng},${minLat},${maxLng},${maxLat}&limit=8&access_token=${mapboxKey}&language=id`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.features && Array.isArray(data.features)) {
            const mapped = data.features.map((feat: any) => {
              const category = feat.properties?.category?.toLowerCase() || ''
              let osmClass = 'place'
              let osmType = 'establishment'

              if (category.includes('school') || category.includes('education')) {
                osmClass = 'amenity'; osmType = 'school'
              } else if (category.includes('restaurant') || category.includes('cafe')) {
                osmClass = 'amenity'; osmType = 'restaurant'
              } else if (category.includes('hospital')) {
                osmClass = 'amenity'; osmType = 'hospital'
              } else if (category.includes('worship')) {
                osmClass = 'amenity'; osmType = 'place_of_worship'
              } else if (category.includes('bank')) {
                osmClass = 'amenity'; osmType = 'bank'
              }

              return {
                display_name: feat.place_name,
                lat: feat.geometry?.coordinates?.[1]?.toString() || '0',
                lon: feat.geometry?.coordinates?.[0]?.toString() || '0',
                class: osmClass,
                type: osmType
              }
            })

            const combined = [...localMatches]
            mapped.forEach((item: any) => {
              if (!combined.some(c => c.lat === item.lat && c.lon === item.lon)) {
                combined.push(item)
              }
            })
            return NextResponse.json(combined)
          }
        }
      }
    }

    // ==========================================
    // ENGINE 3: HERE WEGO API
    // ==========================================
    if (isHereActive) {
      if (mode === 'reverse' && lat && lng) {
        const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apiKey=${hereKey}&lang=id`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.items && data.items.length > 0) {
            const first = data.items[0]
            return NextResponse.json({
              display_name: first.address.label,
              address: {
                road: first.address.street || first.address.label.split(',')[0],
                house_number: first.address.houseNumber || ''
              }
            })
          }
        }
      } else if (query) {
        const url = `https://discover.search.hereapi.com/v1/discover?q=${encodeURIComponent(query)}&at=${baseLat},${baseLng}&in=circle:${baseLat},${baseLng};r=30000&limit=8&apiKey=${hereKey}&lang=id`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.items && Array.isArray(data.items)) {
            const mapped = data.items.map((item: any) => {
              const categoryName = item.categories?.[0]?.name?.toLowerCase() || ''
              let osmClass = 'place'
              let osmType = 'establishment'

              if (categoryName.includes('school') || categoryName.includes('education')) {
                osmClass = 'amenity'; osmType = 'school'
              } else if (categoryName.includes('restaurant') || categoryName.includes('eat')) {
                osmClass = 'amenity'; osmType = 'restaurant'
              }

              return {
                display_name: item.address.label,
                lat: item.position?.lat?.toString() || '0',
                lon: item.position?.lng?.toString() || '0',
                class: osmClass,
                type: osmType
              }
            })

            const combined = [...localMatches]
            mapped.forEach((item: any) => {
              if (!combined.some(c => c.lat === item.lat && c.lon === item.lon)) {
                combined.push(item)
              }
            })
            return NextResponse.json(combined)
          }
        }
      }
    }

    // ==========================================
    // ENGINE 4: OPENSTREETMAP NOMINATIM FALLBACK
    // ==========================================
    let url: string

    if (mode === 'reverse' && lat && lng) {
      url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=id`
    } else if (query) {
      // For fallback Nominatim, we restrict results with bounded=1 to ensure geocoding
      // strictly returns local matches within the regional viewbox centered on Probolinggo
      const delta = 0.5 // generous bias box covering the entire Probolinggo city, kabupaten, and surroundings
      const left = baseLng - delta
      const right = baseLng + delta
      const top = baseLat + delta
      const bottom = baseLat - delta

      url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&namedetails=1&limit=8&accept-language=id&countrycodes=id&viewbox=${left},${top},${right},${bottom}&bounded=1`
    } else {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ArusApp/1.0 (arus-delivery-app)',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      // If OSM fails, at least return our local POI matches if we have them
      if (localMatches.length > 0) {
        return NextResponse.json(localMatches)
      }
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }

    const data = await res.json()
    const mapped = Array.isArray(data) ? data : []
    
    // Combine and deduplicate
    const combined = [...localMatches]
    mapped.forEach((item: any) => {
      if (!combined.some(c => c.lat === item.lat && c.lon === item.lon)) {
        combined.push(item)
      }
    })

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Geocode API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
