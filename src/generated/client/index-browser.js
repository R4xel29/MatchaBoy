
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  password: 'password',
  role: 'role',
  phone: 'phone',
  phoneVerified: 'phoneVerified',
  points: 'points',
  referralCode: 'referralCode',
  referredById: 'referredById',
  referralBonusPaid: 'referralBonusPaid',
  gender: 'gender',
  birthDate: 'birthDate',
  pin: 'pin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PushSubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  endpoint: 'endpoint',
  p256dh: 'p256dh',
  auth: 'auth',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuthenticatorScalarFieldEnum = {
  credentialID: 'credentialID',
  userId: 'userId',
  providerAccountId: 'providerAccountId',
  credentialPublicKey: 'credentialPublicKey',
  counter: 'counter',
  credentialDeviceType: 'credentialDeviceType',
  credentialBackedUp: 'credentialBackedUp',
  transports: 'transports'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  deviceType: 'deviceType',
  browser: 'browser',
  os: 'os',
  lastActive: 'lastActive',
  createdAt: 'createdAt'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.LocationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  address: 'address',
  lat: 'lat',
  lng: 'lng',
  isDefault: 'isDefault',
  name: 'name',
  recipient: 'recipient',
  phone: 'phone',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  price: 'price',
  image: 'image',
  badge: 'badge',
  modifiers: 'modifiers',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  cashierId: 'cashierId',
  driverId: 'driverId',
  orderType: 'orderType',
  source: 'source',
  customerName: 'customerName',
  customerPhone: 'customerPhone',
  address: 'address',
  distanceKm: 'distanceKm',
  tableNumber: 'tableNumber',
  pickupDate: 'pickupDate',
  pickupTime: 'pickupTime',
  pickupReminderSent: 'pickupReminderSent',
  notes: 'notes',
  cancelReason: 'cancelReason',
  paymentProofUrl: 'paymentProofUrl',
  paymentUrl: 'paymentUrl',
  paymentQrContent: 'paymentQrContent',
  paymentExpiredAt: 'paymentExpiredAt',
  voucherCode: 'voucherCode',
  subtotal: 'subtotal',
  deliveryFee: 'deliveryFee',
  total: 'total',
  paymentMethod: 'paymentMethod',
  status: 'status',
  hasTumbler: 'hasTumbler',
  pointsEarned: 'pointsEarned',
  pointsAwarded: 'pointsAwarded',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  qty: 'qty',
  price: 'price',
  modifiers: 'modifiers',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FavoriteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  cartJson: 'cartJson',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  isRead: 'isRead',
  linkUrl: 'linkUrl',
  senderId: 'senderId',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  details: 'details',
  createdAt: 'createdAt'
};

exports.Prisma.HeroBannerScalarFieldEnum = {
  id: 'id',
  image: 'image',
  alt: 'alt',
  headline: 'headline',
  subheadline: 'subheadline',
  isActive: 'isActive',
  isCover: 'isCover',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CashierShiftScalarFieldEnum = {
  id: 'id',
  cashierId: 'cashierId',
  openedAt: 'openedAt',
  closedAt: 'closedAt',
  openingCash: 'openingCash',
  closingCash: 'closingCash',
  totalOrders: 'totalOrders',
  totalRevenue: 'totalRevenue',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PointHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  amount: 'amount',
  type: 'type',
  description: 'description',
  orderId: 'orderId',
  createdAt: 'createdAt'
};

exports.Prisma.VoucherScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  code: 'code',
  type: 'type',
  description: 'description',
  discountAmount: 'discountAmount',
  isUsed: 'isUsed',
  usedAt: 'usedAt',
  expiresAt: 'expiresAt',
  templateId: 'templateId',
  fromReferralUserId: 'fromReferralUserId',
  createdAt: 'createdAt'
};

exports.Prisma.VoucherTemplateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  title: 'title',
  description: 'description',
  bannerImage: 'bannerImage',
  type: 'type',
  discountValue: 'discountValue',
  minPurchase: 'minPurchase',
  maxDiscount: 'maxDiscount',
  validProductIds: 'validProductIds',
  terms: 'terms',
  expiresAt: 'expiresAt',
  usageLimit: 'usageLimit',
  usageCount: 'usageCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoyaltySettingsScalarFieldEnum = {
  id: 'id',
  milestone1Points: 'milestone1Points',
  milestone1Reward: 'milestone1Reward',
  milestone1Desc: 'milestone1Desc',
  milestone1Enabled: 'milestone1Enabled',
  milestone2Points: 'milestone2Points',
  milestone2Reward: 'milestone2Reward',
  milestone2Desc: 'milestone2Desc',
  milestone2Enabled: 'milestone2Enabled',
  milestone3Points: 'milestone3Points',
  milestone3Reward: 'milestone3Reward',
  milestone3Desc: 'milestone3Desc',
  milestone3Enabled: 'milestone3Enabled',
  milestone3ResetPoints: 'milestone3ResetPoints',
  tumblerBonusEnabled: 'tumblerBonusEnabled',
  tumblerBonusPoints: 'tumblerBonusPoints',
  tumblerDiscountPct: 'tumblerDiscountPct',
  tumblerVoucherEnabled: 'tumblerVoucherEnabled',
  tumblerVoucherType: 'tumblerVoucherType',
  tumblerVoucherDesc: 'tumblerVoucherDesc',
  referralEnabled: 'referralEnabled',
  referralRewardType: 'referralRewardType',
  referralRewardPoints: 'referralRewardPoints',
  referralRewardVoucher: 'referralRewardVoucher',
  pointMode: 'pointMode',
  pointPerTransaction: 'pointPerTransaction',
  pointPerAmount: 'pointPerAmount',
  pointValue: 'pointValue',
  referralRewardDesc: 'referralRewardDesc',
  easterEggEnabled: 'easterEggEnabled',
  easterEggVoucherCode: 'easterEggVoucherCode',
  easterEggDiscount: 'easterEggDiscount',
  easterEggQuota: 'easterEggQuota',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  trigger: 'trigger',
  title: 'title',
  message: 'message',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreSettingsScalarFieldEnum = {
  id: 'id',
  openTime: 'openTime',
  closeTime: 'closeTime',
  pickupSlotInterval: 'pickupSlotInterval',
  cancellationTimeLimit: 'cancellationTimeLimit',
  deliveryFeePerKm: 'deliveryFeePerKm',
  maxDeliveryDistance: 'maxDeliveryDistance',
  storeName: 'storeName',
  storeAddress: 'storeAddress',
  storeLat: 'storeLat',
  storeLng: 'storeLng',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentSettingsScalarFieldEnum = {
  id: 'id',
  codEnabled: 'codEnabled',
  codWhatsApp: 'codWhatsApp',
  qrisEnabled: 'qrisEnabled',
  qrisImage: 'qrisImage',
  qrisLogo: 'qrisLogo',
  qrisLabel: 'qrisLabel',
  qrisAutoGenerate: 'qrisAutoGenerate',
  qrisNmid: 'qrisNmid',
  transferEnabled: 'transferEnabled',
  dokuEnabled: 'dokuEnabled',
  dokuClientId: 'dokuClientId',
  dokuSharedKey: 'dokuSharedKey',
  dokuSandbox: 'dokuSandbox',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BankAccountScalarFieldEnum = {
  id: 'id',
  bankName: 'bankName',
  bankLogo: 'bankLogo',
  accountNumber: 'accountNumber',
  accountName: 'accountName',
  isActive: 'isActive',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReferralTierScalarFieldEnum = {
  id: 'id',
  tierNumber: 'tierNumber',
  targetInvites: 'targetInvites',
  rewardType: 'rewardType',
  rewardValue: 'rewardValue',
  rewardDesc: 'rewardDesc',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReferralEventScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  rewardType: 'rewardType',
  rewardValue: 'rewardValue',
  rewardDesc: 'rewardDesc',
  refereeReward: 'refereeReward',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportSettingsScalarFieldEnum = {
  id: 'id',
  storeName: 'storeName',
  storeLogo: 'storeLogo',
  storeAddress: 'storeAddress',
  storePhone: 'storePhone',
  footerText: 'footerText',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DriverProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  vehicleType: 'vehicleType',
  plateNumber: 'plateNumber',
  driverImageUrl: 'driverImageUrl',
  isOnline: 'isOnline',
  shiftStart: 'shiftStart',
  shiftEnd: 'shiftEnd',
  lastLat: 'lastLat',
  lastLng: 'lastLng',
  lastLocationUpdate: 'lastLocationUpdate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BannedContactScalarFieldEnum = {
  id: 'id',
  type: 'type',
  value: 'value',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.IngredientScalarFieldEnum = {
  id: 'id',
  name: 'name',
  unit: 'unit',
  stock: 'stock',
  costPerUnit: 'costPerUnit',
  isPackaging: 'isPackaging',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductIngredientScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  ingredientId: 'ingredientId',
  quantity: 'quantity'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  ingredientId: 'ingredientId',
  quantity: 'quantity',
  type: 'type',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  name: 'name',
  amount: 'amount',
  category: 'category',
  date: 'date',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  PushSubscription: 'PushSubscription',
  Authenticator: 'Authenticator',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Location: 'Location',
  Category: 'Category',
  Product: 'Product',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Favorite: 'Favorite',
  Notification: 'Notification',
  ActivityLog: 'ActivityLog',
  HeroBanner: 'HeroBanner',
  CashierShift: 'CashierShift',
  PointHistory: 'PointHistory',
  Voucher: 'Voucher',
  VoucherTemplate: 'VoucherTemplate',
  LoyaltySettings: 'LoyaltySettings',
  NotificationTemplate: 'NotificationTemplate',
  StoreSettings: 'StoreSettings',
  PaymentSettings: 'PaymentSettings',
  BankAccount: 'BankAccount',
  ReferralTier: 'ReferralTier',
  ReferralEvent: 'ReferralEvent',
  ReportSettings: 'ReportSettings',
  DriverProfile: 'DriverProfile',
  BannedContact: 'BannedContact',
  Ingredient: 'Ingredient',
  ProductIngredient: 'ProductIngredient',
  StockMovement: 'StockMovement',
  Expense: 'Expense'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
