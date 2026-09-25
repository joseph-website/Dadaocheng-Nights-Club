export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RedeemableItem {
  id: string;
  name: string;
  value: number; // Face value in chips (1:1 exchange rate at lobby counter)
  icon: string;
  description: string;
  timestamp: number;
  source: string;
}

export interface CollectibleItem {
  id: string;
  name: string;
  gameId: 'roulette' | 'slot' | 'plinko' | 'blackjack' | 'poker' | 'siba' | 'craps' | 'lobby' | 'claw' | 'pinball';
  gameName: string;
  rarity: Rarity;
  basePrice: number;
  icon: string;
  flavorText: string;
  unlockConditionText?: string;
  unlockedAt?: number;
}

export interface NPCForSaleItem {
  collectible: CollectibleItem;
  price: number; // basePrice * markup (2.0x ~ 4.0x)
  markupMultiplier: number; // e.g. 2.2x ~ 4.0x
  isSoldOut: boolean;
  flavorQuote: string;
}

export interface PawnedItemRecord {
  item: CollectibleItem;
  pawnAmount: number; // 80% of basePrice (rounded up to hundreds)
  redeemCost: number; // 100% of basePrice (original price)
  pawnedAt: number; // timestamp
}

export interface BlackMarketNPC {
  id: string;
  name: string;
  title: string;
  avatar: string;
  greeting: string;
  favoriteGame: string;
  multiplier: number; // 1.3 ~ 3.0x (General multiplier)
  targetCollectibleId: string; // Specific desired collectible item ID
  targetMultiplier: number; // Extra high multiplier for target item (1.5 ~ 3.0x / 150% ~ 300%)
  wantedDialogue: string; // NPC's custom treasure hunt dialogue
  requestedCategoryText: string;
  preferredRarity?: Rarity;
  allItemAcceptor?: boolean; // When true, buys any collectible at guaranteed rate
  tableGreeting: string;
  winReactions: string[];
  loseReactions: string[];
  idleReactions: string[];
  instantBuyoutDialogue: string;
  themeColor: string; // Tailwind color accent
  expiresAt: number;
  forSaleItem?: NPCForSaleItem; // Rare collectible offered for sale by NPC (with 2x-4x markup)
}
