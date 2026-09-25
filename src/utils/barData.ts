import { ALL_COLLECTIBLES } from './inventory';
import { BLACK_MARKET_PROBABILITY_ANALYSES } from './tableIntel';

export interface CocktailItem {
  id: string;
  name: string;
  enName: string;
  price: number;
  icon: string;
  description: string;
  clueChance: number; // 3% - 15% for classics, 40% for signature
  isSignature?: boolean;
}

// Fixed 2000 chips Signature Cocktail
export const SIGNATURE_COCKTAIL: CocktailItem = {
  id: 'cocktail-signature-aurora',
  name: '夜行極光・首席特調',
  enName: 'Nocturne Aurora Special',
  price: 2000,
  icon: '✨🍸',
  description: '老查理親手調製的鎮店之寶，使用藍色橙皮酒與陳年干邑，杯口抹有金箔結晶。蘊含極高情報價值！若未探得線索，老查理會致歉並退還 $500 籌碼。',
  clueChance: 40,
  isSignature: true,
};

// Rich classic cocktail pool with prices strictly between $100 and $1,000
export const CLASSIC_COCKTAILS_POOL: Omit<CocktailItem, 'clueChance'>[] = [
  {
    id: 'cocktail-cuba-libre',
    name: '自由古巴',
    enName: 'Cuba Libre',
    price: 120,
    icon: '🥃',
    description: '深色蘭姆酒、可樂與現壓萊姆汁，夜行碼頭水手們的日常解渴之選。',
  },
  {
    id: 'cocktail-vodka-lime',
    name: '伏特加萊姆',
    enName: 'Vodka Lime',
    price: 180,
    icon: '🍸',
    description: '純淨烈冽的波蘭伏特加搭配濃縮青檸角，清爽俐落，最適合醒腦再戰。',
  },
  {
    id: 'cocktail-mojito',
    name: '莫希托',
    enName: 'Classic Mojito',
    price: 240,
    icon: '🍹',
    description: '新鮮綠薄荷葉、古巴白蘭姆酒與細砂糖，滿杯碎冰散發著清涼海風氣息。',
  },
  {
    id: 'cocktail-gin-fizz',
    name: '琴費士',
    enName: 'Gin Fizz',
    price: 300,
    icon: '🥂',
    description: '杜松子香氣濃郁的倫敦琴酒與氣泡蘇打水，綿密氣泡如同一連串勝場。',
  },
  {
    id: 'cocktail-whiskey-sour',
    name: '威士忌酸酒',
    enName: 'Whiskey Sour',
    price: 360,
    icon: '🥃',
    description: '波旁威士忌融合檸檬汁與糖漿，頂層點綴細緻蛋白泡沫與安格氏苦精。',
  },
  {
    id: 'cocktail-old-fashioned',
    name: '古典調酒',
    enName: 'Old Fashioned',
    price: 450,
    icon: '🥃',
    description: '方糖、苦精與陳年黑麥威士忌，橙皮油脂輕拂杯緣，永不退流行的老紳士風味。',
  },
  {
    id: 'cocktail-negroni',
    name: '內格羅尼',
    enName: 'Negroni',
    price: 520,
    icon: '🍷',
    description: '琴酒、金巴利苦酒與紅香甜酒等比例調製，微苦回甘的深沉義大利血統。',
  },
  {
    id: 'cocktail-manhattan',
    name: '曼哈頓',
    enName: 'Manhattan',
    price: 600,
    icon: '🍸',
    description: '被譽為「調酒女王」，黑麥威士忌與甜苦艾酒的交織，杯底沉睡著浸漬酒漬櫻桃。',
  },
  {
    id: 'cocktail-singapore-sling',
    name: '新加坡司令',
    enName: 'Singapore Sling',
    price: 680,
    icon: '🍹',
    description: '熱帶櫻桃白蘭地、鳳梨汁與琴酒調和，如同萊佛士酒店露台的醉人夕陽。',
  },
  {
    id: 'cocktail-dry-martini',
    name: '乾馬丁尼',
    enName: 'Dry Martini',
    price: 750,
    icon: '🍸',
    description: '「調酒之王」，冰冽入骨的英式琴酒與極乾苦艾酒，橄欖的鹹香勾勒出頂級殺氣。',
  },
  {
    id: 'cocktail-sidecar',
    name: '邊車',
    enName: 'Sidecar',
    price: 840,
    icon: '🥂',
    description: '干邑白蘭地、君度橙酒與檸檬汁，杯口一圈雪白糖圈，一戰時期的奢華記憶。',
  },
  {
    id: 'cocktail-aviation',
    name: '飛行',
    enName: 'Aviation',
    price: 920,
    icon: '🌌',
    description: '黑櫻桃利口酒加上紫羅蘭香甜酒，呈現出破曉高空的迷人天鵝絨淡紫。',
  },
  {
    id: 'cocktail-last-word',
    name: '遺言',
    enName: 'Last Word',
    price: 980,
    icon: '🧪',
    description: '綠夏翠絲修道院藥草酒與黑櫻桃酒的等比碰撞，香氣繁複而神聖，老手最愛。',
  },
];

/**
 * Calculates clue probability linearly between 3% ($100) and 15% ($1,000)
 */
export function calculateClueChance(price: number): number {
  const clampedPrice = Math.max(100, Math.min(1000, price));
  // 100 -> 3%, 1000 -> 15%
  const ratio = (clampedPrice - 100) / 900;
  return Math.round(3 + ratio * 12);
}

/**
 * Randomly pick 3 to 5 classic cocktails from the pool, each annotated with its clue chance
 */
export function getRandomClassicCocktails(): CocktailItem[] {
  const count = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
  const shuffled = [...CLASSIC_COCKTAILS_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((c) => ({
    ...c,
    clueChance: calculateClueChance(c.price),
  }));
}

const STORAGE_KEY_DISCOVERED_CLUES = 'casino_bar_discovered_clues_v1';

export function getDiscoveredClueIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCOVERED_CLUES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDiscoveredClueId(id: string): void {
  try {
    const list = getDiscoveredClueIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(STORAGE_KEY_DISCOVERED_CLUES, JSON.stringify(list));
    }
  } catch {
    // Ignore error
  }
}

/**
 * Pick an item clue for the player.
 * Prioritizes items the player hasn't unlocked yet, or items they haven't discovered clues for.
 */
export function getRandomItemClue(playerOwnedItemIds: string[]) {
  const unowned = ALL_COLLECTIBLES.filter((item) => !playerOwnedItemIds.includes(item.id));
  const pool = unowned.length > 0 ? unowned : ALL_COLLECTIBLES;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  saveDiscoveredClueId(chosen.id);

  return {
    item: chosen,
    clueText: `「據可靠密報，在【${chosen.gameName}】中，${chosen.unlockConditionText}，即可贏得稀有珍品【${chosen.name}】！」`,
  };
}

/**
 * Pick a random gambling tactical tip / insight
 */
export function getRandomGamblingTip() {
  const gameKeys = Object.keys(BLACK_MARKET_PROBABILITY_ANALYSES);
  const randomGame = gameKeys[Math.floor(Math.random() * gameKeys.length)];
  const tips = BLACK_MARKET_PROBABILITY_ANALYSES[randomGame];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  return tip;
}

/**
 * Bartender casual idle quotes
 */
export const BARTENDER_IDLE_QUOTES = [
  '「夜色正濃，先生想來點什麼？我調的酒，不只提神，有時還能替您探聽點意想不到的風聲。」',
  '「吧台的規矩很簡單：酒越名貴，老查理能替您打聽到的黑市動靜就越精確。」',
  '「看見隔壁黑市貴賓廊的那幾位貴客了嗎？在吧台花 $300 請他們喝一杯，不僅能結個善緣，說不定還能套出壓箱底的秘密呢。」',
  '「如果手頭寬裕，不妨試試我的『首席特調 ($2,000)』。高達 40% 的情報機率；要是真沒打聽到，老查理當場退您 500 籌碼賠罪，絕不讓您空手而歸！」',
  '「酒精能讓牌桌上的神經放鬆，也能讓某些大嘴巴吐露真言。今晚你想先喝哪一杯？」',
];
