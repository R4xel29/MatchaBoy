# 🔒 SECURITY AUDIT: Voucher, Referral, dan Poin System

## 📋 Executive Summary

Audit keamanan menyeluruh pada sistem voucher, referral, dan poin untuk mengidentifikasi potensi bug dan celah keamanan yang bisa disalahgunakan oleh user.

**Tanggal Audit**: 30 Mei 2026  
**Scope**: User-facing API endpoints untuk voucher, referral, dan loyalty points  
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🚨 CRITICAL VULNERABILITIES (Harus Diperbaiki Segera!)

### 🔴 **1. Race Condition pada Voucher Claim**
**File**: `src/app/api/user/vouchers/claim/route.ts`  
**Severity**: 🔴 **CRITICAL**

**Masalah**:
```typescript
// Line 54-58: Check quota SEBELUM transaction
if (template.usageLimit > 0 && template.usageCount >= template.usageLimit) {
  return NextResponse.json({ error: 'Kuota penukaran voucher ini sudah habis' }, { status: 400 })
}

// Line 73-78: Check lagi DALAM transaction tapi tidak ada lock
const t = await tx.voucherTemplate.findUnique({
  where: { id: template.id }
})
```

**Exploit Scenario**:
1. User A dan User B claim voucher yang sama secara bersamaan (race condition)
2. Kedua request melewati check quota di line 54 (karena masih ada quota)
3. Kedua request masuk ke transaction secara bersamaan
4. Kedua request berhasil claim, melebihi quota yang seharusnya

**Impact**: 
- User bisa claim voucher melebihi quota yang ditentukan
- Kerugian finansial jika voucher bernilai tinggi
- Abuse oleh bot/script untuk claim voucher dalam jumlah besar

**Solusi**:
```typescript
// Gunakan SELECT FOR UPDATE untuk lock row
const voucher = await prisma.$transaction(async (tx) => {
  // Lock template row untuk mencegah race condition
  const t = await tx.$queryRaw`
    SELECT * FROM "VoucherTemplate" 
    WHERE id = ${template.id} 
    FOR UPDATE
  `
  
  // Re-check quota setelah lock
  if (t.usageLimit > 0 && t.usageCount >= t.usageLimit) {
    throw new Error('Kuota penukaran voucher ini sudah habis')
  }
  
  // ... rest of transaction
})
```

---

### 🔴 **2. Race Condition pada Easter Egg Claim**
**File**: `src/app/api/user/loyalty/claim-easter-egg/route.ts`  
**Severity**: 🔴 **CRITICAL**

**Masalah**:
```typescript
// Line 38-45: Check quota TANPA transaction lock
const claimCount = await prisma.voucher.count({
  where: {
    code: {
      startsWith: `${codeBase}-`
    }
  }
})

if (claimCount >= quota) {
  return NextResponse.json({ error: 'Yah, kuota voucher rahasia ini sudah habis' }, { status: 400 })
}

// Line 48-58: Create voucher TANPA re-check
await prisma.voucher.create({ ... })
```

**Exploit Scenario**:
1. Quota easter egg = 10
2. Saat ini sudah 9 yang claim
3. User A, B, C claim bersamaan
4. Ketiga request melewati check (karena count masih 9)
5. Ketiga request berhasil create voucher
6. Total jadi 12, melebihi quota 10

**Impact**:
- Easter egg voucher bisa di-claim melebihi quota
- Kerugian finansial signifikan (diskon Rp 15.000 per voucher)

**Solusi**:
```typescript
// Gunakan transaction dengan lock
const result = await prisma.$transaction(async (tx) => {
  // Lock settings row
  const settings = await tx.loyaltySettings.findFirst({
    // Add lock if possible or use optimistic locking
  })
  
  // Count dengan lock
  const claimCount = await tx.voucher.count({
    where: { code: { startsWith: `${codeBase}-` } }
  })
  
  if (claimCount >= quota) {
    throw new Error('Kuota sudah habis')
  }
  
  // Create voucher
  return tx.voucher.create({ ... })
})
```

---

### 🔴 **3. Duplicate Referral Code Vulnerability**
**File**: `src/app/api/user/apply-referral/route.ts`  
**Severity**: 🔴 **CRITICAL**

**Masalah**:
```typescript
// Line 48-55: Case-insensitive search tapi tidak ada unique constraint
const referrer = await prisma.user.findFirst({
  where: {
    referralCode: {
      equals: cleanedCode,
      mode: 'insensitive',
    },
  },
  select: { id: true },
});
```

**Exploit Scenario**:
1. User A punya referral code: `MATCHA123`
2. User B buat akun dengan referral code: `matcha123` (lowercase)
3. Sistem tidak mencegah duplicate karena hanya ada unique constraint case-sensitive
4. User C bisa apply referral code `matcha123` dan dapat welcome voucher
5. User C bisa apply lagi dengan `MATCHA123` dan dapat welcome voucher lagi

**Impact**:
- User bisa dapat multiple welcome voucher
- Abuse sistem referral

**Solusi**:
```typescript
// 1. Tambah unique constraint case-insensitive di Prisma schema
model User {
  referralCode String @unique @default(cuid())
  
  @@index([referralCode(ops: raw("varchar_pattern_ops"))])
}

// 2. Normalize referral code saat create user
referralCode: generateReferralCode().toUpperCase()

// 3. Normalize saat apply
const cleanedCode = referralCode.trim().toUpperCase()
```

---

## 🟠 HIGH SEVERITY VULNERABILITIES

### 🟠 **4. No Rate Limiting pada Claim Endpoints**
**Files**: 
- `src/app/api/user/vouchers/claim/route.ts`
- `src/app/api/user/loyalty/claim-easter-egg/route.ts`
- `src/app/api/user/referrals/route.ts` (POST)

**Severity**: 🟠 **HIGH**

**Masalah**:
Tidak ada rate limiting khusus untuk endpoint claim. User bisa spam request untuk:
1. Brute force voucher codes
2. Exploit race condition dengan banyak request bersamaan
3. DDoS attack

**Impact**:
- Server overload
- Memudahkan exploit race condition
- Brute force attack

**Solusi**:
```typescript
import { rateLimit } from '@/lib/rate-limit-redis'

export async function POST(req: Request) {
  // Add aggressive rate limiting untuk claim endpoints
  const rateLimitResult = await rateLimit(req, 'VOUCHER_CLAIM', {
    maxRequests: 3,  // Hanya 3 claim per menit
    windowMs: 60_000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
      { status: 429 }
    )
  }
  
  // ... rest of code
}
```

---

### 🟠 **5. Referral Bonus Bisa Diklaim Berkali-kali**
**File**: `src/app/api/user/referrals/route.ts`  
**Severity**: 🟠 **HIGH**

**Masalah**:
```typescript
// Line 67-70: Check referralBonusPaid tapi tidak ada transaction lock
if (referee.referralBonusPaid) {
  return NextResponse.json({ error: 'Voucher untuk referral ini sudah diklaim sebelumnya' }, { status: 400 });
}

// Line 77: Update referralBonusPaid DALAM processReferralBonus
const rewardResult = await processReferralBonus(refereeId);
```

**Exploit Scenario**:
1. User A mengajak User B
2. User B selesai order pertama
3. User A klik "Klaim Bonus" 2x dengan cepat (race condition)
4. Kedua request melewati check `referralBonusPaid = false`
5. User A dapat 2x voucher/poin

**Impact**:
- User bisa dapat multiple referral bonus
- Kerugian finansial

**Solusi**:
```typescript
// Gunakan transaction dengan lock
const result = await prisma.$transaction(async (tx) => {
  // Lock referee row
  const referee = await tx.user.findUnique({
    where: { id: refereeId },
    // Add FOR UPDATE lock
  })
  
  if (referee.referralBonusPaid) {
    throw new Error('Sudah diklaim')
  }
  
  // Update DULU sebelum proses bonus
  await tx.user.update({
    where: { id: refereeId },
    data: { referralBonusPaid: true }
  })
  
  // Baru proses bonus
  // ... create voucher/add points
})
```

---

### 🟠 **6. No Validation pada Voucher Template ID**
**File**: `src/app/api/user/vouchers/claim/route.ts`  
**Severity**: 🟠 **HIGH**

**Masalah**:
```typescript
// Line 24-29: Hanya validate code, tidak validate template ID
const template = await prisma.voucherTemplate.findUnique({
  where: { code: cleanCode }
})

if (!template) {
  return NextResponse.json({ error: 'Kode voucher tidak valid' }, { status: 404 })
}

// Tidak ada check apakah template ini memang boleh di-claim oleh user
// Tidak ada check apakah template ini hidden/internal
```

**Exploit Scenario**:
1. Admin buat template voucher internal dengan code `ADMIN_ONLY`
2. Admin set `hideFromVoucherPack: true`
3. User bisa tetap claim dengan POST ke `/api/user/vouchers/claim` dengan code `ADMIN_ONLY`
4. User dapat voucher yang seharusnya tidak bisa di-claim

**Impact**:
- User bisa claim voucher internal/hidden
- Bypass business logic

**Solusi**:
```typescript
// Tambah validation
const template = await prisma.voucherTemplate.findUnique({
  where: { code: cleanCode }
})

if (!template) {
  return NextResponse.json({ error: 'Kode voucher tidak valid' }, { status: 404 })
}

// TAMBAHKAN: Check apakah template ini boleh di-claim
if (template.hideFromVoucherPack) {
  return NextResponse.json({ error: 'Voucher ini tidak tersedia untuk diklaim' }, { status: 403 })
}

// TAMBAHKAN: Check apakah ini system voucher (WELCOME, REFERRAL_REWARD, dll)
const systemCodes = ['WELCOME', 'REFERRAL_REWARD', 'TUMBLER_REWARD', 'EASTERSTELLAR']
if (systemCodes.includes(template.code)) {
  return NextResponse.json({ error: 'Voucher sistem tidak bisa diklaim manual' }, { status: 403 })
}
```

---

## 🟡 MEDIUM SEVERITY VULNERABILITIES

### 🟡 **7. Milestone Calculation Logic Error**
**File**: `src/lib/loyalty-utils.ts`  
**Severity**: 🟡 **MEDIUM**

**Masalah**:
```typescript
// Line 115-120: Logic milestone dengan modulo bisa salah
const isHit = settings.milestone3ResetPoints 
  ? currentP === settings.milestone1Points
  : (currentP % settings.milestone3Points) === settings.milestone1Points;
```

**Exploit Scenario**:
1. Milestone 1 = 5 poin
2. Milestone 3 = 10 poin (dengan reset)
3. User punya 4 poin
4. User dapat 2 poin sekaligus (total jadi 6)
5. Loop iterasi:
   - i=1: currentP=5 → milestone 1 hit ✅
   - i=2: currentP=6 → tidak hit
6. User dapat voucher milestone 1

Tapi jika:
1. User punya 4 poin
2. User dapat 6 poin sekaligus (total jadi 10)
3. Loop iterasi:
   - i=1: currentP=5 → milestone 1 hit ✅
   - i=2: currentP=6 → tidak hit
   - i=3: currentP=7 → tidak hit
   - i=4: currentP=8 → tidak hit
   - i=5: currentP=9 → tidak hit
   - i=6: currentP=10 → milestone 3 hit ✅, reset ke 0
4. User dapat voucher milestone 1 dan 3

**Tapi milestone 2 (misal 7 poin) TIDAK hit karena setelah reset!**

**Impact**:
- User bisa skip milestone jika dapat banyak poin sekaligus
- Inconsistent reward distribution

**Solusi**:
```typescript
// Cek semua milestone SEBELUM reset
const milestones = [
  { points: settings.milestone1Points, reward: settings.milestone1Reward, enabled: settings.milestone1Enabled },
  { points: settings.milestone2Points, reward: settings.milestone2Reward, enabled: settings.milestone2Enabled },
  { points: settings.milestone3Points, reward: settings.milestone3Reward, enabled: settings.milestone3Enabled },
].sort((a, b) => a.points - b.points) // Sort ascending

for (const milestone of milestones) {
  if (!milestone.enabled) continue
  
  if (oldPoints < milestone.points && newPoints >= milestone.points) {
    // User melewati milestone ini
    const v = await createVoucherForUser(userId, milestone.reward, milestone.desc)
    vouchersCreated.push({ type: v.type, description: v.description })
  }
}

// Baru reset jika milestone 3 tercapai
if (settings.milestone3ResetPoints && newPoints >= settings.milestone3Points) {
  const resetAmount = Math.floor(newPoints / settings.milestone3Points) * settings.milestone3Points
  // ... reset logic
}
```

---

### 🟡 **8. No Validation pada Referral Min Purchase**
**File**: `src/lib/loyalty-utils.ts`  
**Severity**: 🟡 **MEDIUM**

**Masalah**:
```typescript
// Line 207-211: Check minimal belanja tapi tidak ada validation order status
const minPurchaseNeeded = (settings as any).referralMinPurchase ?? 0;
if (firstCompletedOrder.total < minPurchaseNeeded) {
  return { error: `Pesanan pertama teman Anda (Rp${firstCompletedOrder.total.toLocaleString('id-ID')}) belum memenuhi syarat minimal belanja` };
}
```

**Exploit Scenario**:
1. User A mengajak User B
2. User B buat order Rp 50.000 (di atas minimal Rp 30.000)
3. User B bayar dan order jadi COMPLETED
4. User A klaim bonus referral → berhasil
5. User B cancel/refund order
6. User A tetap punya voucher referral

**Impact**:
- User bisa abuse dengan refund setelah referrer klaim bonus
- Kerugian finansial

**Solusi**:
```typescript
// Tambah check apakah order sudah di-refund
const firstCompletedOrder = await prisma.order.findFirst({
  where: { 
    userId: refereeUserId, 
    status: 'COMPLETED',
    // TAMBAHKAN: Check tidak ada refund
    refundStatus: null // atau { not: 'REFUNDED' }
  },
  orderBy: { createdAt: 'asc' },
});

// Atau tambah field isRefunded di Order model
if (firstCompletedOrder.isRefunded) {
  return { error: 'Order teman Anda sudah di-refund' }
}
```

---

### 🟡 **9. Welcome Voucher Bisa Diklaim Multiple Times**
**File**: `src/app/api/user/apply-referral/route.ts`  
**Severity**: 🟡 **MEDIUM**

**Masalah**:
```typescript
// Line 36-39: Check apakah user sudah punya referrer
if (currentUser.referredById) {
  return NextResponse.json({ error: 'Akun Anda sudah terhubung dengan kode referral sebelumnya' }, { status: 400 });
}

// Tapi tidak ada check apakah user sudah pernah dapat welcome voucher
```

**Exploit Scenario**:
1. User A apply referral code → dapat welcome voucher
2. Admin reset `referredById` user A ke NULL (misal karena error)
3. User A apply referral code lagi → dapat welcome voucher lagi

**Impact**:
- User bisa dapat multiple welcome voucher
- Abuse sistem

**Solusi**:
```typescript
// Tambah check apakah user sudah pernah dapat welcome voucher
const existingWelcomeVoucher = await prisma.voucher.findFirst({
  where: {
    userId,
    code: { startsWith: welcomeCode }
  }
})

if (existingWelcomeVoucher) {
  return NextResponse.json({ error: 'Anda sudah pernah mendapat voucher selamat datang' }, { status: 400 })
}
```

---

## 🟢 LOW SEVERITY ISSUES

### 🟢 **10. No Logging untuk Suspicious Activities**
**Severity**: 🟢 **LOW**

**Masalah**:
Tidak ada logging untuk aktivitas mencurigakan seperti:
- Multiple failed claim attempts
- Rapid claim requests
- Unusual voucher usage patterns

**Impact**:
- Sulit detect abuse
- Sulit investigate fraud

**Solusi**:
```typescript
// Tambah logging service
import { logSuspiciousActivity } from '@/lib/security-logger'

// Log failed attempts
if (alreadyClaimed) {
  await logSuspiciousActivity({
    userId: session.user.id,
    action: 'DUPLICATE_VOUCHER_CLAIM',
    details: { templateId: template.id, code: cleanCode }
  })
  return NextResponse.json({ error: 'Anda sudah pernah mengklaim voucher ini' }, { status: 400 })
}
```

---

### 🟢 **11. No Expiry Check pada Voucher Usage**
**Severity**: 🟢 **LOW**

**Masalah**:
Endpoint claim voucher check expiry, tapi tidak ada check saat voucher digunakan di checkout.

**Impact**:
- User bisa pakai voucher yang sudah expired (jika tidak di-check di checkout)

**Solusi**:
```typescript
// Di checkout API, tambah check expiry
const voucher = await prisma.voucher.findUnique({
  where: { code: voucherCode }
})

if (voucher.expiresAt && voucher.expiresAt < new Date()) {
  return NextResponse.json({ error: 'Voucher sudah kadaluarsa' }, { status: 400 })
}
```

---

### 🟢 **12. No Audit Trail untuk Voucher/Points Changes**
**Severity**: 🟢 **LOW**

**Masalah**:
Tidak ada audit trail lengkap untuk:
- Siapa yang create voucher
- Kapan voucher di-claim
- Siapa yang update settings

**Impact**:
- Sulit investigate fraud
- Sulit track abuse

**Solusi**:
```typescript
// Tambah audit log model
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // VOUCHER_CLAIMED, POINTS_ADDED, SETTINGS_UPDATED
  entity    String   // VOUCHER, POINTS, SETTINGS
  entityId  String?
  oldValue  Json?
  newValue  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}

// Log setiap perubahan penting
await prisma.auditLog.create({
  data: {
    userId: session.user.id,
    action: 'VOUCHER_CLAIMED',
    entity: 'VOUCHER',
    entityId: voucher.id,
    newValue: { code: voucher.code, type: voucher.type }
  }
})
```

---

## 📊 Summary of Vulnerabilities

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Race conditions, duplicate referral codes |
| 🟠 High | 3 | No rate limiting, bonus claim exploit, no template validation |
| 🟡 Medium | 3 | Milestone logic error, no refund check, welcome voucher exploit |
| 🟢 Low | 3 | No logging, no expiry check, no audit trail |
| **TOTAL** | **12** | |

---

## 🛠️ Recommended Fixes Priority

### **Immediate (Week 1)**:
1. ✅ Fix race condition pada voucher claim (Critical #1)
2. ✅ Fix race condition pada easter egg (Critical #2)
3. ✅ Fix duplicate referral code (Critical #3)
4. ✅ Add rate limiting (High #4)

### **Short-term (Week 2-3)**:
5. ✅ Fix referral bonus exploit (High #5)
6. ✅ Add template validation (High #6)
7. ✅ Fix milestone calculation (Medium #7)
8. ✅ Add refund check (Medium #8)

### **Medium-term (Month 1)**:
9. ✅ Fix welcome voucher exploit (Medium #9)
10. ✅ Add suspicious activity logging (Low #10)
11. ✅ Add expiry check di checkout (Low #11)

### **Long-term (Month 2+)**:
12. ✅ Implement audit trail system (Low #12)

---

## 🧪 Testing Recommendations

### **Load Testing**:
```bash
# Test race condition dengan concurrent requests
ab -n 1000 -c 100 -p claim.json -T application/json \
  http://localhost:3000/api/user/vouchers/claim
```

### **Security Testing**:
```bash
# Test rate limiting
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/user/vouchers/claim \
    -H "Content-Type: application/json" \
    -d '{"code":"TEST123"}'
done
```

### **Penetration Testing**:
- Hire security expert untuk test exploit scenarios
- Use tools: OWASP ZAP, Burp Suite
- Test dengan bot/script untuk simulate abuse

---

## 📞 Contact

Jika ada pertanyaan atau butuh klarifikasi, hubungi tim security.

**Audited By**: AI Security Assistant  
**Date**: 30 Mei 2026  
**Version**: 1.0.0

---

## ⚠️ DISCLAIMER

Dokumen ini berisi informasi sensitif tentang celah keamanan. **JANGAN DIBAGIKAN** ke publik atau pihak yang tidak berwenang. Simpan di repository private dan restrict access.
