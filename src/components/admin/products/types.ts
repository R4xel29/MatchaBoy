export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface IngredientItem {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  isPackaging?: boolean;
}

export interface AddOnItem {
  id: string;
  name: string;
  price: number;
  ingredientId?: string;
  ingredientQty?: number;
}

export interface ToppingItem {
  id: string;
  name: string;
  defaultPrice: number;
  ingredientId?: string | null;
  ingredientQty?: number | null;
  isAvailable: boolean;
}

export interface ProductPromo {
  promoPrice: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

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

export interface ModifiersData {
  productType?: 'minuman' | 'makanan';
  iceLevel?: string[];
  sugarLevel?: string[];
  addOns?: AddOnItem[];
  isBundle?: boolean;
  bundleGroups?: BundleGroup[];
  freeShipping?: boolean;
  discountType?: 'fixed' | 'nominal' | 'percent';
  discountValue?: number;
  originalPrice?: number;
  promo?: ProductPromo;
  // Per-product customizer settings
  showMatcha?: boolean;
  showEspressoShot?: boolean;
  defaultMatcha?: number;
  showSweetness?: boolean;
  defaultSugar?: string;
  defaultIce?: string;
  sizes?: { name: string; price: number }[];
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  badge: string | null;
  categoryId: string;
  category: CategoryItem;
  modifiers: string | null;
  productIngredients?: {
    id?: string;
    ingredientId: string;
    quantity: number;
    ingredient?: IngredientItem;
  }[];
}
