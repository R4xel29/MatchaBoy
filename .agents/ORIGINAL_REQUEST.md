# Original User Request

## 2026-08-31T03:33:27Z

Execute full-system performance optimization, intelligent Redis & SWR caching, bandwidth/payload reduction, code modularization, and warm Amber/Orange shimmer skeleton loading across the entire Arum Seduh platform.

Working directory: c:/UBIG/Matchaboy/matchaboy
Integrity mode: development

## Requirements

### R1. Multi-Tier Intelligent Caching & Query Acceleration
- Integrate Upstash Redis caching for high-traffic read operations (product catalog, active categories, hero banners, active flash sales, and weather recommendations) with a 15-minute TTL.
- Implement automated on-demand cache busting/invalidation whenever Admin performs mutations (creating, updating, deleting, or archiving products, categories, or banners).
- Integrate SWR (`swr`) on client components for automatic request deduplication, instant cache rendering (stale-while-revalidate), and background refresh on focus/reconnect (wallet balance, loyalty points/tier, active queue orders, weather, and featured reviews).

### R2. Bandwidth & Client Bundle Reduction
- Modularize oversized monolithic components (notably the 3,300+ line `StorefrontClient.tsx`) by code-splitting non-critical modals and overlays (GachaOverlay, Leaderboard, AutoReorder, TopUpModal, PointsHistory, WalletHistory, StoryBar) via `next/dynamic` lazy loading.
- Audit and optimize `next/image` usage across product cards, hero banners, and story reels with explicit responsive `sizes`, WebP/AVIF formats, and placeholder handling to eliminate layout shifts (CLS).
- Trim server-to-client payload serialization by selecting only needed fields in Prisma queries.

### R3. Arum Seduh Branded Shimmer Skeleton Loading
- Design and implement a reusable `ShimmerSkeleton` component featuring the signature Arum Seduh warm amber/orange subtle shimmer aesthetic (`from-amber-100/60 via-orange-100/40 to-amber-100/60` with smooth light wave sweep).
- Replace blank states, layout jumping, and plain spinner loaders with tailored skeleton layouts for:
  1. Storefront: Weather recommendation widget, AI picks, Featured reviews, and Wallet/Loyalty overview.
  2. Search Overlay: Instant search result placeholders.
  3. Checkout & Antrian: Order summary items, live queue ticket cards, and status banners.
  4. Admin POS & Orders: Cashier catalog grid and active orders table.

### R4. Strict Brand & UI Integrity
- Preserve the official brand name "Arum Seduh" across all interfaces and generated code.
- Use only Lucide React vector icons and warm Orange/Amber styling; strictly avoid default green matcha themes and OS emojis.

## Acceptance Criteria

### Caching & Database Performance
- [ ] Redis caching helper (`src/lib/redis-cache.ts` or equivalent) securely reads and writes cached queries with error fallback.
- [ ] Mutations on products, categories, and banners immediately invalidate relevant Redis cache tags/keys.
- [ ] SWR hooks handle client-side data fetching for loyalty, wallet, weather, and orders without redundant duplicate network requests on re-renders.

### Bundle & Bandwidth
- [ ] Non-critical modals and secondary widgets in Storefront load asynchronously via dynamic imports.
- [ ] Product and banner images specify responsive `sizes` and prevent Cumulative Layout Shift (CLS).
- [ ] Next.js build succeeds with clean compilation (`npm run build` or `next build`).

### Visual Polish & Skeleton UX
- [ ] Skeleton loaders display smooth warm amber/orange shimmer animations during initial load without jarring layout shifts.
- [ ] All customer and admin views maintain responsive layout and flawless visual consistency with the Arum Seduh design system.
