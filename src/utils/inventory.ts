import { CollectibleItem, RedeemableItem, BlackMarketNPC, Rarity, PawnedItemRecord } from '../types/inventory';
import { resetCareerStats } from './careerStats';

const STORAGE_KEYS = {
  REDEEMABLES: 'casino_redeemables_v1',
  COLLECTIBLES: 'casino_collectibles_v1',
  ACHIEVEMENTS: 'casino_achievements_v1',
  NPC: 'casino_current_npc_v1',
  PENDING_DELIVERIES: 'casino_pending_deliveries_v1',
  PAWNED_ITEMS: 'casino_pawned_items_v1',
  LUCKY_CHARMS: 'casino_lucky_charms_v1',
};

// All 42 Hidden Collectible Items across 7 Casino Games
export const ALL_COLLECTIBLES: CollectibleItem[] = [
  // 1. 歐式輪盤 (Roulette)
  {
    id: 'col-roulette-zero',
    name: '純金翡翠籌碼',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'rare',
    basePrice: 3000,
    icon: '🟢',
    flavorText: '刻有綠色數字 0 的神秘祖母綠鑲金籌碼，散發著優雅的貴族氣息。',
    unlockConditionText: '下注 0 號 >= $300 且精準命中開出 0 號',
  },
  {
    id: 'col-roulette-red-streak',
    name: '紅寶石骰盅',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'rare',
    basePrice: 2500,
    icon: '🍷',
    flavorText: '散發熾熱紅光的威尼斯手工紅寶石骰盅，據說能吸引紅色幸運數字。',
    unlockConditionText: '下注紅色區 >= $500 且連續 3 局開出紅色獲勝',
  },
  {
    id: 'col-roulette-black-streak',
    name: '黑曜石賭盤指針',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'rare',
    basePrice: 2500,
    icon: '🔮',
    flavorText: '漆黑深邃的黑曜石精雕指針，指引著輪盤上的神秘命運。',
    unlockConditionText: '下注黑色區 >= $500 且連續 3 局開出黑色獲勝',
  },
  {
    id: 'col-roulette-big-win',
    name: '夜行輪盤金冠',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'legendary',
    basePrice: 8000,
    icon: '👑',
    flavorText: '象徵大稻賭埕輪盤大帝的奢華純金王冠，無數賭客夢寐以求的至寶。',
    unlockConditionText: '單局下注 >= $5,000 且中獎總額 >= $20,000',
  },
  {
    id: 'col-roulette-36x',
    name: '黃金象限儀',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🧭',
    flavorText: '精密測量輪盤軌道角度的古代航海象限儀，凝聚了極致的幾何美學。',
    unlockConditionText: '單一號碼下注 >= $500 且精準命中 (1:35 賠率)',
  },
  {
    id: 'col-roulette-dozens',
    name: '威尼斯雙子銀幣',
    gameId: 'roulette',
    gameName: '歐式輪盤',
    rarity: 'common',
    basePrice: 2000,
    icon: '🪙',
    flavorText: '鐫刻著雙子星象的文藝復興古銀幣，見證過無數次經典對局。',
    unlockConditionText: '下注幾十(Dozen)/列(Column)區總額 >= $1,000 且命中 1:2 賠率獲勝',
  },

  // 2. 老虎機 (Slot Machine)
  {
    id: 'col-slot-777',
    name: '拉斯維加斯霓虹之星',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'legendary',
    basePrice: 10000,
    icon: '⭐',
    flavorText: '閃耀著 777 絢爛光芒的經典霓虹寶星，代表著老虎機界的最高殿堂。',
    unlockConditionText: '拉出 7-7-7 頂級 Jackpot 大獎',
  },
  {
    id: 'col-slot-bells',
    name: '神殿純金響鐘',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'epic',
    basePrice: 4000,
    icon: '🔔',
    flavorText: '每次敲響皆能引來滔天金幣的神殿金鐘，清脆悅耳的鐘聲久久不散。',
    unlockConditionText: '單次下注 >= $500 且拉出 🔔-🔔-🔔 金鐘',
  },
  {
    id: 'col-slot-cherries',
    name: '紅瑪瑙雙櫻桃',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'rare',
    basePrice: 2500,
    icon: '🍒',
    flavorText: '天然紅瑪瑙立體雕琢而成的雙生幸運櫻桃，色澤嬌豔欲滴。',
    unlockConditionText: '單次下注 >= $500 且拉出 🍒-🍒-🍒 三櫻桃連線',
  },
  {
    id: 'col-slot-spins',
    name: '永動發條齒輪',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'common',
    basePrice: 2000,
    icon: '⚙️',
    flavorText: '據說永不停歇運轉的老虎機精密發條核心，充滿了蒸氣龐克的魅力。',
    unlockConditionText: '累計旋轉達 50 次且單次下注 >= $200',
  },
  {
    id: 'col-slot-big-win',
    name: '賭王金拉桿',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'epic',
    basePrice: 6000,
    icon: '🕹️',
    flavorText: '鑲嵌頂級虎眼石的傳奇老虎機鍍金搖桿，一拉定乾坤。',
    unlockConditionText: '單局中獎金額達 $10,000 以上',
  },
  {
    id: 'col-slot-diamonds',
    name: '永恆之淚藍鑽',
    gameId: 'slot',
    gameName: '老虎機',
    rarity: 'legendary',
    basePrice: 7500,
    icon: '💎',
    flavorText: '璀璨奪目的極致無瑕深海藍鑽石，在燈光下折射出冰藍色的夢幻光暈。',
    unlockConditionText: '拉出 BAR-BAR-BAR 三連線大獎',
  },

  // 3. 彈珠台 (Plinko)
  {
    id: 'col-plinko-100x',
    name: '泰坦重力寶珠',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'legendary',
    basePrice: 10000,
    icon: '🪐',
    flavorText: '蘊含改變掉落軌跡引力場的古代宇宙奇物，能夠突破機率的極限。',
    unlockConditionText: '單顆彈珠命中 100x 邊緣槽位',
  },
  {
    id: 'col-plinko-multidrop',
    name: '超導磁浮發射器',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🚀',
    flavorText: '能瞬間將彈珠加速發射的高科技發射管，帶來暴風驟雨般的下落感。',
    unlockConditionText: '啟動連續投球模式且累計下注達 $5,000 以上',
  },
  {
    id: 'col-plinko-wing',
    name: '風暴羽翼胸針',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'epic',
    basePrice: 4000,
    icon: '🪶',
    flavorText: '劃破兩側風阻直擊極端高倍槽位的金屬羽飾，造型極具動態感。',
    unlockConditionText: '使用 >= $500 籌碼投球並命中兩翼 7x 高倍槽',
  },
  {
    id: 'col-plinko-jackpot',
    name: '彩虹水晶軌道',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'legendary',
    basePrice: 8500,
    icon: '🌈',
    flavorText: '在特定光線下能折射出七彩霓虹的晶瑩導軌，象徵著天降奇蹟。',
    unlockConditionText: '單次投球或連續投球總回收達 $10,000 以上',
  },
  {
    id: 'col-plinko-triple-hit',
    name: '精密水銀水平儀',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'rare',
    basePrice: 3000,
    icon: '🧪',
    flavorText: '保持釘板絕對平衡的特製黃銅水平儀，讓每顆彈珠的彈跳都無可挑剔。',
    unlockConditionText: '使用 >= $500 籌碼投球並精準落入 2.5x 穩定平衡槽',
  },
  {
    id: 'col-plinko-veteran',
    name: '黃金彈珠大師徽章',
    gameId: 'plinko',
    gameName: '彈珠台',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🎖️',
    flavorText: '唯有資深彈珠投擲手方能佩戴的榮譽徽章，鐫刻著百發百中的榮耀。',
    unlockConditionText: '累計投球次數達 50 顆以上',
  },

  // 4. 21點 (Blackjack)
  {
    id: 'col-blackjack-natural',
    name: '黑傑克純金王牌',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🃏',
    flavorText: '燙金黑桃 A 與 J 組成的完美 21 點黃金王牌，象徵著天命般的起手。',
    unlockConditionText: '底注 >= $500 且起手獲得 Natural 21 點 (Blackjack)',
  },
  {
    id: 'col-blackjack-charlie',
    name: '五龍戲珠古玉',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'legendary',
    basePrice: 8500,
    icon: '🐉',
    flavorText: '溫潤通透的傳世古玉，雕刻五條神龍護佑未爆牌者，締造過五關傳說。',
    unlockConditionText: '要牌達 5 張且未爆牌達成五龍過五關 (Charlie)',
  },
  {
    id: 'col-blackjack-double',
    name: '雙刃幸運金幣',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'rare',
    basePrice: 3500,
    icon: '⚔️',
    flavorText: '一面刻著勝利女神，一面刻著命運女神的雙倍加注幣，勝者通吃。',
    unlockConditionText: '底注 >= $500 執行【加倍下注 (Double)】並擊敗莊家',
  },
  {
    id: 'col-blackjack-split',
    name: '雙生天使羽飾',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🕊️',
    flavorText: '左右對稱、光澤無瑕的純白雙生羽毛胸針，象徵分牌並進、雙喜臨門。',
    unlockConditionText: '底注 >= $500，手牌起手為同點數對子且擊敗莊家獲勝',
  },
  {
    id: 'col-blackjack-dealer-bust',
    name: '荷官裁牌象牙尺',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'common',
    basePrice: 2500,
    icon: '📏',
    flavorText: '頂級賭場資深荷官專用、象徵精準與嚴謹的象牙戒尺。',
    unlockConditionText: '單局總下注 >= $500 且莊家要牌爆牌 (Dealer Bust)',
  },
  {
    id: 'col-blackjack-triple-seven',
    name: '三連幸運七符咒',
    gameId: 'blackjack',
    gameName: '21點',
    rarity: 'epic',
    basePrice: 6000,
    icon: '📜',
    flavorText: '由三張 7 點神秘凝聚而成的招財符令，散發古老而神秘的庇佑力量。',
    unlockConditionText: '手牌連續抽到 7-7-7 組成 21 點',
  },

  // 5. 德州撲克 (Texas Hold\'em)
  {
    id: 'col-poker-royal',
    name: '帝王至尊金戒指',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'legendary',
    basePrice: 10000,
    icon: '💍',
    flavorText: '唯有打出同花順或四條的頂級牌手方有資格配戴的帝王指環。',
    unlockConditionText: '德州撲克達成同花順或四條牌型',
  },
  {
    id: 'col-poker-fullhouse',
    name: '紫檀雕花酒壺',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'epic',
    basePrice: 4500,
    icon: '🍶',
    flavorText: '滿堂紅 (Full House) 名局慶功時所飲用的百年陳釀紫檀雕花壺。',
    unlockConditionText: '達成葫蘆 (Full House 滿堂紅) 且贏得彩池',
  },
  {
    id: 'col-poker-flush',
    name: '深海珍珠撲克牌',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🦪',
    flavorText: '以天然黑蝶貝與珍珠貝母精磨製成的奢華撲克牌，手感溫潤細膩。',
    unlockConditionText: '達成同花 (Flush) 且單局彩池超過 $3,000',
  },
  {
    id: 'col-poker-allin',
    name: '無畏者黃金籌碼',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'epic',
    basePrice: 6500,
    icon: '🛡️',
    flavorText: '重達半磅、刻著 ALL-IN 銘文的勇敢者金籌碼，勇氣與決斷的象徵。',
    unlockConditionText: '執行【全壓 All-in】(彩池 >= $5,000) 並在攤牌中獲勝',
  },
  {
    id: 'col-poker-bluff',
    name: '隱密者面具',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'rare',
    basePrice: 3000,
    icon: '🎭',
    flavorText: '能徹底隱藏心跳與微表情的特製撲克面具，讓對手永遠猜不透底牌。',
    unlockConditionText: '加注逼使電腦棄牌 (AI Fold) 且彩池超過 $2,000',
  },
  {
    id: 'col-poker-river',
    name: '命運之輪金幣',
    gameId: 'poker',
    gameName: '德州撲克',
    rarity: 'rare',
    basePrice: 4000,
    icon: '🎡',
    flavorText: '象徵在最後一張河牌驚險翻盤逆轉的幸運金幣，奇蹟降臨之證。',
    unlockConditionText: '戰至最後河牌圈 (River) 攤牌獲勝且彩池達 $5,000 以上',
  },

  // 6. 十八仔 (Si-Bō-Á)
  {
    id: 'col-siba-eighteen',
    name: '龍紋青花瓷碗',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'legendary',
    basePrice: 8000,
    icon: '🥣',
    flavorText: '擲出 18 點十八仔通殺時所用的宮廷御製青花碗，底款刻有大明宣德年製。',
    unlockConditionText: '總下注 >= $500 且擲出 18 點十八仔',
  },
  {
    id: 'col-siba-bg',
    name: '苦盡甘來老煙斗',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'common',
    basePrice: 2000,
    icon: '🪵',
    flavorText: '骰出 3 點逼機 (BG) 慘敗後抽一口的滄桑老煙斗，沉澱江湖百味。',
    unlockConditionText: '總下注 >= $300 且擲出 3 點逼機 (BG) 苦盡甘來',
  },
  {
    id: 'col-siba-four-same',
    name: '九龍至尊象牙骰',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'legendary',
    basePrice: 10000,
    icon: '🦣',
    flavorText: '四顆同色一色通吃的傳說級象牙骰子組，質地溫潤，敲擊聲清脆如磐。',
    unlockConditionText: '擲出四顆同點（一色 / 四喜通殺）',
  },
  {
    id: 'col-siba-reroll',
    name: '沉香木搖盅墊',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'rare',
    basePrice: 2500,
    icon: '🪵',
    flavorText: '無點重擲時散發寧神香氣的天然沉香木墊，平復焦躁的心神。',
    unlockConditionText: '總下注 >= $300 且經歷 2 次以上無點重擲後最終獲勝',
  },
  {
    id: 'col-siba-big-win',
    name: '廟會黃金令旗',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🚩',
    flavorText: '夜市廟會骰壇霸主所賞賜的刺繡金絲令旗，號令群雄。',
    unlockConditionText: '單局總下注 >= $1,000 且贏得超過 $5,000 籌碼',
  },
  {
    id: 'col-siba-two-pairs',
    name: '雙喜太師金鎖',
    gameId: 'siba',
    gameName: '十八仔',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🔒',
    flavorText: '兩對成雙、取大點贏得勝利的吉慶純金太師鎖，福氣滿門。',
    unlockConditionText: '總下注 >= $300 且擲出兩對 (Two Pairs) 獲勝',
  },

  // 7. 花旗骰 (Craps)
  {
    id: 'col-craps-natural',
    name: '火烈鳥幸運紅骰',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🦩',
    flavorText: '首擲開出 7 或 11 點 Natural 時的經典火烈鳥透明紅骰，鋒芒畢露。',
    unlockConditionText: 'Pass Line 下注 >= $500 且首擲開出 Natural 7 或 11',
  },
  {
    id: 'col-craps-point-hit',
    name: '黃金 ON/OFF 標記牌',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🔘',
    flavorText: '拉鋸戰命中目標點數時翻面的純金 Puck 標記，光耀全場。',
    unlockConditionText: '確立目標點數後成功命中且該局贏得獎金 >= $1,000',
  },
  {
    id: 'col-craps-field-double',
    name: '雷霆閃電金幣',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'rare',
    basePrice: 4000,
    icon: '⚡',
    flavorText: 'Field 現場開出 2 或 12 雙倍賠率時所頒發的雷霆金幣，速度與爆發的象徵。',
    unlockConditionText: 'Field 區下注 >= $500 且開出 2 或 12 點雙倍賠率',
  },
  {
    id: 'col-craps-no-seven',
    name: '不屈之盾銀章',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'epic',
    basePrice: 4500,
    icon: '🛡️',
    flavorText: '連續多次擲骰未遭遇 7-out 淘汰的堅固銀章，不屈意志的化身。',
    unlockConditionText: '連續擲骰 5 輪以上未出現 7-out 且累計獲利達 $3,000',
  },
  {
    id: 'col-craps-any-seven',
    name: '七星連珠隕石墜',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'rare',
    basePrice: 3500,
    icon: '☄️',
    flavorText: '單局命中 Any Seven 1:4 高額賠率的星塵隕石項鍊，充滿宇宙神秘感。',
    unlockConditionText: 'Any Seven 區下注 >= $500 且開出 7 點獲勝',
  },
  {
    id: 'col-craps-hardway',
    name: '硬派金剛石雙骰',
    gameId: 'craps',
    gameName: '花旗骰',
    rarity: 'legendary',
    basePrice: 6500,
    icon: '🧊',
    flavorText: '擲出 3+3 或 4+4 硬點對子時獎勵的天然金剛石骰，堅不可摧。',
    unlockConditionText: 'Hardway 區下注 >= $500 且擲出硬點對子獲勝',
  },

  // 8. 夜行大廳與酒館 (Lobby & Lounge)
  {
    id: 'col-lobby-token',
    name: '夜行特調純銀紀念幣',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'common',
    basePrice: 2000,
    icon: '🪙',
    flavorText: '老查理親手贈予的夜行酒館純銀特調幣，沈重冰涼，散發著微醺的波旁橡木香。',
    unlockConditionText: '在夜行吧台累計品嚐達 5 杯精選特調，成為酒館常客',
  },
  {
    id: 'col-lobby-cocktail',
    name: '威士忌黑曜冰酒石',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'rare',
    basePrice: 3200,
    icon: '🧊',
    flavorText: '天然黑曜石精磨而成的冰酒石，能鎖住威士忌的泥煤芬芳而不稀釋一絲酒精度。',
    unlockConditionText: '在吧台品嚐招牌特調「夜行迷霧」累計達 3 杯，並成功參透神秘私房線索',
  },
  {
    id: 'col-lobby-treat',
    name: '英倫皇家衛兵大泰迪',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'rare',
    basePrice: 3500,
    icon: '🧸',
    flavorText: '頭戴熊皮高帽、身著猩紅制服的手工刺繡泰迪熊，英氣挺拔且觸感絲滑溫暖。',
    unlockConditionText: '在酒吧請全場或向廊道貴賓請酒暢飲累計達 5 次',
  },
  {
    id: 'col-lobby-pawn',
    name: '地下黑金質押信物',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'epic',
    basePrice: 5500,
    icon: '🧧',
    flavorText: '琴姐親手遞出的地下當鋪最高信物，見證過無數次絕處逢生與東山再起。',
    unlockConditionText: '在地下當鋪全額支付贖金，成功贖回曾質押的心愛珍寶',
  },
  {
    id: 'col-lobby-intel',
    name: '黑市大掌櫃黃金算盤',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'legendary',
    basePrice: 8000,
    icon: '🧮',
    flavorText: '黑市情報商人代代相傳的微縮純金算盤，每一顆算珠皆能精準換算財富與命運。',
    unlockConditionText: '在黑市成功向情報商人轉讓出售累計達 5 件珍品',
  },
  {
    id: 'col-lobby-vip-cat',
    name: '傳奇翡翠金樽招財貓',
    gameId: 'lobby',
    gameName: '大廳與酒館',
    rarity: 'legendary',
    basePrice: 9000,
    icon: '🐱',
    flavorText: '純金與緬甸翡翠雕琢的祥瑞金樽貓，據說唯有富甲一方的大亨方能珍藏於行囊。',
    unlockConditionText: '個人總籌碼餘額突破 $100,000 大關',
  },
  // 9. 夾娃娃機 (Claw Machine)
  {
    id: 'col-claw-gripper',
    name: '鍍金機械抓夾模型',
    gameId: 'claw',
    gameName: '夾娃娃機',
    rarity: 'epic',
    basePrice: 5000,
    icon: '🦾',
    flavorText: '以精準配重與黃金合金鍛造的微型三爪機械臂，象徵著對物理擺盪極致掌控的匠人精神。',
    unlockConditionText: '在夾娃娃機成功抓取至尊禮盒或特選黃金券',
  },
  {
    id: 'col-claw-egg',
    name: '神秘金蛋神諭鐘',
    gameId: 'claw',
    gameName: '夾娃娃機',
    rarity: 'rare',
    basePrice: 3200,
    icon: '🥚',
    flavorText: '夾娃娃機內極度少見的純金蛋雕，搖晃時隱約傳來神祕的微型齒輪轉動聲。',
    unlockConditionText: '在夾娃娃機累計成功抓取 3 次以上物品',
  },
  // 10. 夜市打彈珠 (Night Market Pinball)
  {
    id: 'col-pinball-soda',
    name: '夜市彈珠汽水瓶蓋',
    gameId: 'pinball',
    gameName: '夜市打彈珠',
    rarity: 'common',
    basePrice: 1500,
    icon: '🍾',
    flavorText: '童年夜市彈珠攤回憶的復古玻璃瓶金屬蓋，隱隱飄散著清爽的香蕉水汽水香氣。',
    unlockConditionText: '在夜市打彈珠擊中 50分 邊緣大獎槽或累計彈射 30 顆彈珠',
  },
  {
    id: 'col-pinball-spring',
    name: '黃金彈簧蓄力尺',
    gameId: 'pinball',
    gameName: '夜市打彈珠',
    rarity: 'rare',
    basePrice: 3800,
    icon: '📐',
    flavorText: '老工匠以純黃銅打造的彈簧蓄力校準尺，能將 55% 拱頂脫軌力道刻度化為絕對精準。',
    unlockConditionText: '在夜市打彈珠中使用 50%~60% 標準力道發射並順利到底得分',
  },
  {
    id: 'col-pinball-wood',
    name: '檜木手作彈珠導板',
    gameId: 'pinball',
    gameName: '夜市打彈珠',
    rarity: 'epic',
    basePrice: 5200,
    icon: '🪵',
    flavorText: '老街木匠嚴選手工拋光的百年檜木弧頂軌道片，讓鋼珠滾動聲如行雲流水般清脆。',
    unlockConditionText: '在夜市打彈珠累計獲取 $300 以上獎金',
  },
];

// Potential Claw Machine Redeemable Items Pool (Tickets)
export const CLAW_REDEEMABLE_POOL = [
  { value: 100, name: '100 點幸運兌幣券', icon: '🎟️', description: '可在櫃台 1:1 兌換 100 點籌碼' },
  { value: 200, name: '200 點銀級兌幣券', icon: '🎫', description: '可在櫃台 1:1 兌換 200 點籌碼' },
  { value: 500, name: '500 點金級兌幣券', icon: '🏷️', description: '可在櫃台 1:1 兌換 500 點籌碼' },
  { value: 1000, name: '1,000 點翡翠兌幣券', icon: '💎', description: '可在櫃台 1:1 兌換 1,000 點籌碼' },
  { value: 2000, name: '2,000 點夜行至尊兌幣券', icon: '👑', description: '可在櫃台 1:1 兌換 2,000 點籌碼' },
];

/**
 * Get random redeemable voucher based on strict probability:
 * $100 (50%), $200 (30%), $500 (12%), $1,000 (6%), $2,000 (2%)
 */
export function getRandomClawVoucher(): typeof CLAW_REDEEMABLE_POOL[0] {
  const rand = Math.random() * 100;
  if (rand < 50) {
    return CLAW_REDEEMABLE_POOL[0]; // $100 (50%)
  } else if (rand < 80) {
    return CLAW_REDEEMABLE_POOL[1]; // $200 (30%)
  } else if (rand < 92) {
    return CLAW_REDEEMABLE_POOL[2]; // $500 (12%)
  } else if (rand < 98) {
    return CLAW_REDEEMABLE_POOL[3]; // $1,000 (6%)
  } else {
    return CLAW_REDEEMABLE_POOL[4]; // $2,000 (2%)
  }
}

/**
 * Lucky Charm (老查理的黑市幸運符) - Only dropped from Claw Machine!
 * Used exclusively at Bar Lounge to trade with Bartender Old Charlie.
 */
export function getPlayerLuckyCharms(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.LUCKY_CHARMS);
    return Math.max(0, parseInt(val || '0', 10) || 0);
  } catch {
    return 0;
  }
}

export function addPlayerLuckyCharms(count: number = 1): number {
  try {
    const current = getPlayerLuckyCharms();
    const next = current + count;
    localStorage.setItem(STORAGE_KEYS.LUCKY_CHARMS, String(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
    }
    return next;
  } catch {
    return 0;
  }
}

export function consumePlayerLuckyCharms(count: number = 1): boolean {
  try {
    const current = getPlayerLuckyCharms();
    if (current < count) return false;
    const next = current - count;
    localStorage.setItem(STORAGE_KEYS.LUCKY_CHARMS, String(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
    }
    return true;
  } catch {
    return false;
  }
}

// NPCs list for Black Market Random Buyer & Table Spectators (14 Distinct Characters)
export const BLACK_MARKET_NPCS: Omit<BlackMarketNPC, 'expiresAt' | 'targetCollectibleId' | 'targetMultiplier' | 'wantedDialogue'>[] = [
  {
    id: 'npc-zhang',
    name: '古董商老張',
    title: '東方古玩資深藏家',
    avatar: '👴',
    greeting: '「老夫專門收購東方古玩與稀有賭具，只要品相好，價錢好談！」',
    favoriteGame: '十八仔 / 花旗骰',
    multiplier: 1.5,
    requestedCategoryText: '偏好古董骰具與古典珍品，提供 150% ~ 180% 高額收購！',
    preferredRarity: 'rare' as const,
    tableGreeting: '「老夫正好路過此桌，小友且讓我見識一下你的擲骰手氣！」',
    winReactions: [
      '「好！好一招紫氣東來，這等手氣真是不減當年老夫風采！」',
      '「妙極！此局大開大合，氣度非凡！」',
      '「哈哈！這點數真是正中下懷，痛快！」',
    ],
    loseReactions: [
      '「莫急莫躁，賭道講究定力，下一手氣運定會回轉。」',
      '「水至清則無魚，這把權當探路，沉住氣。」',
    ],
    idleReactions: [
      '「老夫這雙眼睛看過五十年賭海沉浮，小友根骨奇佳啊。」',
      '「若能尋得文玩骰盅或古董瓷碗，老夫願以重金收購。」',
    ],
    instantBuyoutDialogue: '「好手氣！這件珍品老夫尋覓多時，願意現場出重金轉讓給老夫嗎？」',
    themeColor: 'amber',
  },
  {
    id: 'npc-wang',
    name: '暴發戶王董',
    title: '頂級奢華投資客',
    avatar: '🎩',
    greeting: '「這點小錢對我來說不算什麼，我只在乎最具排面的奢華金冠與鑽石！」',
    favoriteGame: '輪盤 / 老虎機 / 德州撲克',
    multiplier: 3.0,
    requestedCategoryText: '豪擲千金！指定奢華頂級珍品開出 300% (3倍) 天價！',
    preferredRarity: 'legendary' as const,
    tableGreeting: '「王董我今天包下這桌貴賓席，小兄弟好好玩，贏了我重重有賞！」',
    winReactions: [
      '「哈哈哈哈！漂亮！這才叫豪氣干雲，本董看得過癮！」',
      '「開香檳！今晚全場消費王董我買單！」',
      '「這把贏得有排面！這才是大戶人家的風範！」',
    ],
    loseReactions: [
      '「碎銀幾兩罷了，王董我一秒鐘幾十萬上下，繼續壓！」',
      '「小輸不算輸，心態要穩，格局要大！」',
    ],
    idleReactions: [
      '「只要是金冠、鑽石或者皇家同花順紀念品，我直接開最高價收！」',
      '「錢不是問題，問題是你的東西夠不夠尊貴奢華！」',
    ],
    instantBuyoutDialogue: '「哎呀！這東西閃瞎我的眼，太有排面了！王董我出三倍天價，立馬賣給我！」',
    themeColor: 'yellow',
  },
  {
    id: 'npc-jack',
    name: '駭客阿傑',
    title: '賽博地下情報商',
    avatar: '💻',
    greeting: '「0101...只要是精密的機關、彈珠台晶片或老虎機主板，我都高價買斷。」',
    favoriteGame: '彈珠台 / 老虎機',
    multiplier: 2.0,
    requestedCategoryText: '賽博專線！科技機關、齒輪與電子核心提供 200% (2倍) 收購！',
    preferredRarity: 'epic' as const,
    tableGreeting: '「正在接入本桌物理碰撞與機率演算法...小隊友，祝你爆發暴擊機率。」',
    winReactions: [
      '「System Alert: 檢測到超額獲利回傳！機率矩陣被你完美擊穿！」',
      '「Nice Run! 這一波手氣簡直勢不可擋，數據曲線全面飆升！」',
      '「代碼運行順暢，籌碼充值到帳，漂亮的操作！」',
    ],
    loseReactions: [
      '「波動性常態分佈罷了，別慌，演算法即將向均值回歸。」',
      '「防禦阻斷觸發，冷靜調整參數，下一波即將連本帶利！」',
    ],
    idleReactions: [
      '「彈珠台的重力偏轉器和老虎機發條，內部構造充滿了美學。」',
      '「有弄到特別的精密零件記得找我，保證給你走加密通道高價收購。」',
    ],
    instantBuyoutDialogue: '「等等！這件精密硬體數據極罕見！我出雙倍 200% 溢價，直接現場賣給我如何？」',
    themeColor: 'cyan',
  },
  {
    id: 'npc-madam-l',
    name: '占卜師 Madam L',
    title: '命運秘境占星師',
    avatar: '🔮',
    greeting: '「星辰指引著命運的輪轉...你手中的神秘符石，正呼喚著宿命的歸宿。」',
    favoriteGame: '21點 / 歐式輪盤',
    multiplier: 1.8,
    requestedCategoryText: '星象感應！神秘符石、黑曜石指針與命運藏品 180% 收購！',
    preferredRarity: 'rare' as const,
    tableGreeting: '「水晶球預示著這張賭桌上空盤旋著幸運的星芒，我前來見證奇蹟。」',
    winReactions: [
      '「命運的齒輪果然為你而轉動，星光灑在了你的手牌之上！」',
      '「塔羅牌中的【命運之輪】正位顯現，神蹟般的手氣！」',
      '「看見了嗎？那是宿命賜予勇敢者的回報。」',
    ],
    loseReactions: [
      '「暫時的月相陰影罷了，潮起潮落皆是星象考驗。」',
      '「深呼吸，凝視內心，幸運的星辰很快會再度連成一線。」',
    ],
    idleReactions: [
      '「黑曜石與綠翡翠中蘊藏著神秘能量，若有獲得請務必讓我品鑑。」',
      '「21點的五小龍與過五關，是命運最強烈的共鳴。」',
    ],
    instantBuyoutDialogue: '「天哪！水晶球發出共鳴了！這件寶物與我靈魂相通，願以 180% 秘術天價與你結緣！」',
    themeColor: 'purple',
  },
  {
    id: 'npc-qin',
    name: '當鋪琴姐',
    title: '市井通達當鋪主理人',
    avatar: '🧧',
    greeting: '「不管什麼金銀銅鐵、賭具紀念品，到琴姐這全品項通收！現場點現錢！」',
    favoriteGame: '全部賭桌 (全品項無條件收購)',
    multiplier: 1.3,
    allItemAcceptor: true,
    requestedCategoryText: '全品項通通收！不限品類無條件 130% 換現，特選品 150%！',
    preferredRarity: 'common' as const,
    tableGreeting: '「琴姐我來巡視巡視，老弟老妹放膽押，有什麼好貨琴姐現場替你兜底！」',
    winReactions: [
      '「哎喲喂！這手氣太旺啦！等會兒贏大錢可得請姐喝茶！」',
      '「爽快！這才是江湖兒女的膽魄，籌碼堆成小山了！」',
      '「紅紅火火！琴姐看著都替你高興！」',
    ],
    loseReactions: [
      '「沒事沒事，牌桌上哪有常勝將軍，喝口水緩緩，下把翻倍贏！」',
      '「琴姐的當鋪金庫開著呢，隨時拿東西來換籌碼翻本！」',
    ],
    idleReactions: [
      '「只要你背包裡有任何賭桌掉落物，來找琴姐，姐一律 130% 現金籌碼收！」',
      '「做生意講究爽快誠信，琴姐的當鋪童叟無欺。」',
    ],
    instantBuyoutDialogue: '「老弟手氣真好！這好東西琴姐當場收了，溢價直接打進你帳戶，賣不賣？」',
    themeColor: 'rose',
  },
  {
    id: 'npc-mia',
    name: '調酒師 Mia',
    title: '夜幕酒吧金牌調酒師',
    avatar: '🍸',
    greeting: '「調一杯勝利的馬丁尼～如果你有有趣的狂歡紀念品，我願意用好價錢收藏！」',
    favoriteGame: '德州撲克 / 輪盤 / 夾娃娃機',
    multiplier: 1.7,
    requestedCategoryText: '微醺收藏！狂歡酒吧珍品與奢華派對紀念物 170% 高價收購！',
    preferredRarity: 'epic' as const,
    tableGreeting: '「剛調好一杯特調特地端過來，坐在旁邊幫你加油打氣～」',
    winReactions: [
      '「Cheers! 乾杯！這局的精彩程度堪比一杯頂級夜行特調！」',
      '「太帥氣了！今晚為你的勝利乾杯！」',
      '「這手風簡直比香檳氣泡還要熱烈！」',
    ],
    loseReactions: [
      '「別灰心，喝口特調放鬆一下，勝負只是一時的遊戲嘛。」',
      '「換個心情深呼吸，幸運女神馬上回到你身邊～」',
    ],
    idleReactions: [
      '「夜幕酒吧裡有很多故事，每件賭桌掉落物背後都是一段傳奇。」',
      '「有收集到漂亮的玻璃杯或紀念金幣，記得帶給我看唷。」',
    ],
    instantBuyoutDialogue: '「哇！這件紀念物好有情調！我願意出 170% 專屬收購價放在吧台珍藏，賣給我吧？」',
    themeColor: 'pink',
  },
  {
    id: 'npc-afa',
    name: '隱世賭聖阿發',
    title: '江東傳奇賭聖',
    avatar: '🧐',
    greeting: '「後生可畏，這件賭具背後的賭道奧義非凡，老夫願意出頂格高價！」',
    favoriteGame: '全部賭桌遊戲',
    multiplier: 2.5,
    requestedCategoryText: '千載難逢！賭聖現身，全品類頂級珍品 250% ~ 280% 頂格收購！',
    preferredRarity: 'legendary' as const,
    tableGreeting: '「老夫雲遊至此，見你命格帶財，特來旁觀一局。」',
    winReactions: [
      '「好氣魄！心隨意動，籌碼隨風，深得賭道三味！」',
      '「後生可畏，這等運籌帷幄的手段，老夫甚是欣慰！」',
      '「哈哈！天地開泰，氣運大盛！」',
    ],
    loseReactions: [
      '「勝不驕，敗不餒，此乃賭聖修心第一課。」',
      '「靜觀其變，蓄勢待發，下局方顯英雄本色。」',
    ],
    idleReactions: [
      '「真正的至寶不在於金銀，而在於那份過五關斬六將的膽魄。」',
      '「老夫平生所好，唯有天下無雙的頂級賭道神物。」',
    ],
    instantBuyoutDialogue: '「善！此物蘊含非凡靈光，老夫出 250% 賭聖專屬天價，小友可願割愛？」',
    themeColor: 'emerald',
  },
  {
    id: 'npc-victoria',
    name: '名媛維多利亞',
    title: '夜行拍賣會特約顧問',
    avatar: '👑',
    greeting: '「真正的貴族只收集純粹的光芒，鑽石、金冠或頂級藍寶石，我絕不吝嗇價格。」',
    favoriteGame: '輪盤 / 老虎機 / 21點',
    multiplier: 2.4,
    requestedCategoryText: '夜行尊榮！指定頂級奢華冠冕與寶石開出 240% ~ 280% 拍賣級溢價！',
    preferredRarity: 'legendary' as const,
    tableGreeting: '「這桌的氣氛很合我心意，讓我看看今晚哪位貴客能戴上榮耀的金冠～」',
    winReactions: [
      '「Bravo! 如此從容優雅的勝利，簡直是宮廷級的演出！」',
      '「令人驚艷！這份光芒比我脖子上的粉鑽還要璀璨！」',
    ],
    loseReactions: [
      '「無妨，真正的貴族在風浪中依然優雅，下一局才是重頭戲。」',
    ],
    idleReactions: [
      '「若是尋得夜行輪盤金冠或藍鑽，請務必第一時間交給我的拍賣行。」',
    ],
    instantBuyoutDialogue: '「噢天啊！這件珠寶的光澤完美無瑕！我出 260% 夜行拍賣高價，請務必割愛給我！」',
    themeColor: 'yellow',
  },
  {
    id: 'npc-elon',
    name: '科技極客埃隆',
    title: '未來機械發明家',
    avatar: '⚡',
    greeting: '「加速！突破！所有的精密齒輪、磁浮發射器與重力導軌，都是未來的原型機零件！」',
    favoriteGame: '彈珠台 / 老虎機',
    multiplier: 2.2,
    requestedCategoryText: '未來科技！超導磁浮、水銀水平儀與永動齒輪 220% 收購！',
    preferredRarity: 'epic' as const,
    tableGreeting: '「這張機台的力學阻尼系數非常有意思，正在記錄即時動能軌跡...」',
    winReactions: [
      '「To the moon! 物理動能被你完美釋放，動力超載 300%！」',
      '「突破第一性原理！這手氣簡直如獵鷹火箭般升空！」',
    ],
    loseReactions: [
      '「只是迭代測試中的微小摩擦阻力，重新校準發射角度即可！」',
    ],
    idleReactions: [
      '「我在研發全自動反重力彈珠系統，急需各種高精密齒輪與導軌。」',
    ],
    instantBuyoutDialogue: '「重大發現！這個精密核心的做工令人驚嘆，我出 220% 溢價作為研發資金買下它！」',
    themeColor: 'cyan',
  },
  {
    id: 'npc-nine',
    name: '暗巷九哥',
    title: '九龍地下黑市大掌櫃',
    avatar: '🕶️',
    greeting: '「黑市有黑市的規矩，只要是罕見好貨，九哥我現提現金，絕不囉嗦一句！」',
    favoriteGame: '十八仔 / 花旗骰 / 德州撲克',
    multiplier: 1.9,
    requestedCategoryText: '暗巷黑金！老千骰盒、暗門令牌與地下藏品 190% 爽快結算！',
    preferredRarity: 'rare' as const,
    tableGreeting: '「九哥我抽根雪茄坐會兒，小老弟儘管放開手腳，有事我罩著。」',
    winReactions: [
      '「夠狠！夠準！九哥我就喜歡你這股敢打敢拼的江湖狠勁！」',
      '「把莊家打得落花流水，痛快！待會兒跟九哥去吃宵夜！」',
    ],
    loseReactions: [
      '「江湖風浪大，這點坑窪算什麼，把腰桿挺直了再來！」',
    ],
    idleReactions: [
      '「九龍城寨的地下賭坊三十年，九哥我什麼神仙骰子沒摸過。」',
    ],
    instantBuyoutDialogue: '「好傢伙！這東西夠地道！九哥我出 190% 黑市公道價，轉手現金立馬到你手！」',
    themeColor: 'stone',
  },
  {
    id: 'npc-buffett',
    name: '精算導師巴菲特',
    title: '華爾街博弈精算家',
    avatar: '📊',
    greeting: '「賭博是情緒，博弈是數學。只要具備頂級收藏價值與紀念價值的藏品，我樂於以溢價納入投資組合。」'
    ,
    favoriteGame: '德州撲克 / 21點',
    multiplier: 2.1,
    requestedCategoryText: '價值投資！精算籌碼、大師徽章與同花順 210% 穩健收購！',
    preferredRarity: 'epic' as const,
    tableGreeting: '「根據凱利公式與勝率回歸，這張桌子的玩家擁有出色的勝率與手風。」',
    winReactions: [
      '「複利的力量正在顯現！這是一場教科書級別的精彩勝利！」',
      '「價值投資典範！在別人貪婪時精準出手，漂亮！」',
    ],
    loseReactions: [
      '「短期的黑天鵝波動不必掛懷，保持理性策略，時間就是你的朋友。」',
    ],
    idleReactions: [
      '「撲克牌桌是商業談判的最佳縮影，每枚籌碼都是你的資本兵團。」',
    ],
    instantBuyoutDialogue: '「此項資產具備極高收藏護城河，我願意出 210% 溢價納入我的長期資產池！」',
    themeColor: 'blue',
  },
  {
    id: 'npc-boss-white',
    name: '千王白老大',
    title: '江湖千術傳奇至尊',
    avatar: '🎴',
    greeting: '「牌桌如戰場，勝負在指尖。老夫平生閱盡千術神器，識貨之人自懂其價值。」',
    favoriteGame: '全部賭桌遊戲',
    multiplier: 2.6,
    requestedCategoryText: '千王神技！通天豹子、裁牌象牙尺與心理戰面具 260% 重金求購！',
    preferredRarity: 'legendary' as const,
    tableGreeting: '「老夫坐在這裡，荷官發牌的手都要抖上三分，小友儘管放手施為。」',
    winReactions: [
      '「指尖生風，偷天換日！好一手深藏不露的神技！」',
      '「老夫後繼有人矣！這局殺得氣貫長虹！」',
    ],
    loseReactions: [
      '「莫露破綻，眼觀六路，千術之道貴在無形，下局定乾坤！」',
    ],
    idleReactions: [
      '「世人皆以為千術是假，不知真正的千術是算盡人心與天時。」',
    ],
    instantBuyoutDialogue: '「妙啊！這等至寶落在俗人手裡可惜了，老夫出 260% 千王天價，換你這件神物！」',
    themeColor: 'rose',
  },
  {
    id: 'npc-yukina',
    name: '和風藏家雪奈',
    title: '京都雅閣典雅茶師',
    avatar: '🌸',
    greeting: '「一期一會，世間珍品皆有其緣分...若您有雅緻精巧的手作古物，請務必與我分享。」',
    favoriteGame: '十八仔 / 輪盤 / 夾娃娃機',
    multiplier: 1.8,
    requestedCategoryText: '雅趣古風！古典骰盅、翡翠玉石與精緻手作 180% 溫潤收藏！',
    preferredRarity: 'rare' as const,
    tableGreeting: '「茶香已沸，願這縷清幽之氣，為您的賭桌帶來寧靜與好運～」',
    winReactions: [
      '「如同櫻花綻放般燦爛的勝利，令人心曠神怡～」',
      '「清風徐來，水波不興，這份從容正是大將之風。」',
    ],
    loseReactions: [
      '「落櫻紛飛亦是美景，靜待下一季花開，好運自會歸來。」',
    ],
    idleReactions: [
      '「在京都的古寺中，每一件手作器物都寄託著匠人的靈魂。」',
    ],
    instantBuyoutDialogue: '「啊...這件物品散發著溫潤的光輝，雪奈願以 180% 誠心之價迎回茶閣珍藏～」',
    themeColor: 'pink',
  },
  {
    id: 'npc-anderson',
    name: '特勤督導安德森',
    title: '拉斯維加斯首席巡場',
    avatar: '🛡️',
    greeting: '「例行安檢巡邏。如果你持有賭場特許認證道具或防偽紀念幣，本部門提供官方高額回收補貼。」',
    favoriteGame: '21點 / 花旗骰 / 輪盤',
    multiplier: 1.6,
    requestedCategoryText: '官方回收！安全徽章、局點推桿與黃金王牌 160% 官方補貼兌現！',
    preferredRarity: 'rare' as const,
    tableGreeting: '「安保系統已鎖定本桌公平機率，祝您在安全合規的環境下大獲全勝。」',
    winReactions: [
      '「檢測到合法合規的巨額彩池爆發！恭喜貴賓順利通關！」',
      '「數據完美記錄在案，這是一次無可爭議的精彩大勝！」',
    ],
    loseReactions: [
      '「保持冷靜理性，博弈守則第一條就是控制倉位。」',
    ],
    idleReactions: [
      '「賭場防偽標誌與特製象牙戒尺，都是我們安保部門的重點回收物資。」',
    ],
    instantBuyoutDialogue: '「經檢驗為合規珍品！本督導以官方特批 160% 補貼資金直接向您收購！」',
    themeColor: 'indigo',
  },
];

// Helper Functions for Local Storage Management

export function getRedeemableItems(): RedeemableItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REDEEMABLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRedeemableItems(items: RedeemableItem[]): void {
  localStorage.setItem(STORAGE_KEYS.REDEEMABLES, JSON.stringify(items));
}

export function addRedeemableItem(
  item: Omit<RedeemableItem, 'id' | 'timestamp'>
): RedeemableItem {
  const fullItem: RedeemableItem = {
    ...item,
    id: `red-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };
  const list = getRedeemableItems();
  const updated = [fullItem, ...list];
  saveRedeemableItems(updated);
  return fullItem;
}

export function redeemSingleItem(id: string): { amount: number; remaining: RedeemableItem[] } {
  const list = getRedeemableItems();
  const item = list.find((i) => i.id === id);
  if (!item) return { amount: 0, remaining: list };
  const remaining = list.filter((i) => i.id !== id);
  saveRedeemableItems(remaining);
  return { amount: item.value, remaining };
}

export function redeemAllItems(): { totalAmount: number; count: number } {
  const list = getRedeemableItems();
  const totalAmount = list.reduce((sum, item) => sum + item.value, 0);
  const count = list.length;
  saveRedeemableItems([]);
  return { totalAmount, count };
}

// Collectibles & Hidden Achievements
export function getUnlockedCollectibleIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnlockedCollectibleIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(ids));
}

export function getPlayerCollectibles(): CollectibleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIBLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlayerCollectibles(items: CollectibleItem[]): void {
  localStorage.setItem(STORAGE_KEYS.COLLECTIBLES, JSON.stringify(items));
}

// ==================== PENDING TABLE DELIVERIES (離桌道具暫存隊列) ====================

export function getPendingDeliveries(): CollectibleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_DELIVERIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingDeliveries(items: CollectibleItem[]): void {
  localStorage.setItem(STORAGE_KEYS.PENDING_DELIVERIES, JSON.stringify(items));
}

export function clearPendingDeliveries(): void {
  localStorage.removeItem(STORAGE_KEYS.PENDING_DELIVERIES);
}

/**
 * Claim all pending table deliveries into the player's permanent collection bag and mark achievements.
 */
export function claimPendingDeliveries(): CollectibleItem[] {
  const pending = getPendingDeliveries();
  if (pending.length === 0) return [];

  const unlockedIds = getUnlockedCollectibleIds();
  const currentItems = getPlayerCollectibles();

  const newIds: string[] = [];
  const itemsToAdd: CollectibleItem[] = [];

  for (const item of pending) {
    if (!currentItems.some((c) => c.id === item.id) && !itemsToAdd.some((i) => i.id === item.id)) {
      itemsToAdd.push(item);
    }
    if (!unlockedIds.includes(item.id) && !newIds.includes(item.id)) {
      newIds.push(item.id);
    }
  }

  saveUnlockedCollectibleIds([...unlockedIds, ...newIds]);
  savePlayerCollectibles([...itemsToAdd, ...currentItems]);
  clearPendingDeliveries();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }

  return itemsToAdd;
}

/**
 * Stages a hidden collectible into the pending delivery queue when triggered on a game table.
 * The item will be formally handed over via the Leave-Table NPC Delivery Modal when the player exits the table.
 * Rule: A player cannot receive duplicate copies if they currently hold it in their bag or pending queue.
 * Once sold to a Black Market NPC, the player can trigger and find this collectible again in games!
 */
export function unlockHiddenCollectible(collectibleId: string): CollectibleItem | null {
  const target = ALL_COLLECTIBLES.find((c) => c.id === collectibleId);
  if (!target) return null;

  const currentItems = getPlayerCollectibles();
  if (currentItems.some((c) => c.id === collectibleId)) {
    // Already holding this collectible in player bag, prevent duplicate
    return null;
  }

  const pending = getPendingDeliveries();
  if (pending.some((p) => p.id === collectibleId)) {
    // Already staged in pending leave-table queue
    return null;
  }

  const newInstance: CollectibleItem = {
    ...target,
    unlockedAt: Date.now(),
  };

  const updatedPending = [...pending, newInstance];
  savePendingDeliveries(updatedPending);

  // Dispatch custom events for toast notification, NPC table reactions, and inventory sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('casino_pending_item_staged', {
        detail: { item: newInstance },
      })
    );
    window.dispatchEvent(
      new CustomEvent('casino_collectible_unlocked', {
        detail: { item: newInstance, collectibleId: newInstance.id },
      })
    );
  }

  return newInstance;
}

// ==================== NPC DIFFERENTIAL VALUATION MATRIX (NPC 差異化收購價矩陣) ====================

export interface NPCItemValuation {
  multiplier: number;
  buyoutPrice: number;
  valuationType: 'super_high' | 'premium' | 'regular' | 'discount';
  label: string;
  badgeClass: string;
  priceClass: string;
  reasonText: string;
}

/**
 * Dedicated item multiplier matrix for each NPC.
 * If an item is not explicitly listed here, a smart dynamic valuation is computed based on NPC preferences.
 */
export const NPC_ITEM_PRICE_MATRIX: Record<string, Record<string, number>> = {
  // 1. 【古董商老張】(npc-zhang) — 專收骰子、古玉、傳統古幣，極度排斥現代電子/科技零件
  'npc-zhang': {
    'col-siba-bg': 3.0, // 逼機骰子 (鎮店級古董)
    'col-siba-eighteen': 2.8, // 豹子純金十八骰
    'col-siba-four-same': 2.8, // 一色四喜通天骰
    'col-siba-two-pairs': 2.5, // 雙喜臨門對骰
    'col-siba-reroll': 2.5, // 無效重擲紫檀令
    'col-siba-big-win': 2.6, // 莊家通吃老楠木盅
    'col-blackjack-charlie': 2.8, // 五龍戲珠古玉
    'col-blackjack-dealer-bust': 2.4, // 荷官裁牌象牙尺
    'col-craps-natural': 2.6, // 天生贏家象牙雙骰
    'col-craps-hardway': 2.5, // 硬派連擊金骰
    'col-craps-any-seven': 2.5, // 幸運七星青銅籌碼
    'col-craps-no-seven': 2.5, // 避煞黑檀木骰盒
    'col-roulette-dozens': 2.5, // 威尼斯雙子銀幣
    'col-roulette-36x': 2.4, // 黃金象限儀
    // 現代電子與老虎機卡帶折讓低收 (0.8x)
    'col-slot-spins': 0.8,
    'col-slot-bells': 0.8,
    'col-plinko-multidrop': 0.8,
    'col-plinko-triple-hit': 0.8,
    'col-plinko-wing': 0.8,
  },

  // 2. 【暴發戶王董】(npc-wang) — 專收奢華金冠、頂級 777、天價藍鑽，平庸道具嫌沒排面
  'npc-wang': {
    'col-slot-777': 3.0, // 拉斯維加斯霓虹之星
    'col-slot-diamonds': 3.0, // 永恆之淚藍鑽
    'col-roulette-big-win': 3.0, // 皇家輪盤金冠
    'col-poker-royal': 3.0, // 皇家同花順純金徽章
    'col-claw-lucky-cat': 3.0, // 黃金至尊招財貓
    'col-claw-master-license': 2.8, // 機廳出貨王金牌執照
    'col-poker-allin': 2.8, // 全押金山紀念盃
    'col-plinko-100x': 2.8, // 泰坦重力寶珠
    'col-plinko-jackpot': 2.7, // 彩虹水晶軌道
    'col-blackjack-triple-seven': 2.8, // 三七連珠幸運金幣
    'col-slot-big-win': 2.6, // 賭王金拉桿
    'col-roulette-zero': 2.5, // 純金翡翠籌碼
    'col-craps-point-hit': 2.5, // 貫穿局點鍍金推桿
    // 平凡小物件折讓低收
    'col-slot-spins': 0.8,
    'col-siba-reroll': 0.8,
    'col-roulette-dozens': 0.8,
  },

  // 3. 【駭客阿傑】(npc-jack) — 專收物理機關、彈珠台晶片或老虎機主板
  'npc-jack': {
    'col-plinko-100x': 2.8, // 泰坦重力寶珠
    'col-claw-titanium-arm': 2.8, // 鈦合金加固機械爪
    'col-claw-laser-sight': 2.7, // 精密紅外線瞄準鏡
    'col-plinko-multidrop': 2.6, // 超導磁浮發射器
    'col-plinko-triple-hit': 2.5, // 精密水銀水平儀
    'col-plinko-wing': 2.4, // 風暴羽翼胸針
    'col-slot-spins': 2.6, // 永動發條齒輪
    'col-slot-big-win': 2.5, // 賭王金拉桿
    'col-roulette-36x': 2.4, // 黃金象限儀
    'col-poker-river': 2.4, // 河牌逆轉水滴石
    // 傳統古玩折讓
    'col-siba-bg': 0.8,
    'col-blackjack-charlie': 0.8,
    'col-siba-four-same': 0.8,
  },

  // 4. 【占卜師 Madam L】(npc-madam-l) — 專收黑曜石、神秘符石、宿命王牌
  'npc-madam-l': {
    'col-roulette-black-streak': 2.8, // 黑曜石賭盤指針
    'col-roulette-red-streak': 2.7, // 紅寶石骰盅
    'col-blackjack-natural': 2.6, // 黑傑克純金王牌
    'col-blackjack-split': 2.5, // 雙生天使羽飾
    'col-blackjack-charlie': 2.6, // 五龍戲珠古玉
    'col-plinko-jackpot': 2.6, // 彩虹水晶軌道
    'col-craps-any-seven': 2.5, // 幸運七星青銅籌碼
    'col-poker-flush': 2.5, // 同花順流晶石
    // 機械零件折讓
    'col-slot-spins': 0.8,
    'col-plinko-multidrop': 0.8,
  },

  // 5. 【調酒師 Mia】(npc-mia) — 專收狂歡酒吧、櫻桃、金色響鐘、泰迪熊與機幣
  'npc-mia': {
    'col-slot-cherries': 2.8, // 紅瑪瑙雙櫻桃
    'col-lobby-treat': 2.8, // 英倫皇家衛兵大泰迪
    'col-lobby-token': 2.6, // 夜行特調純銀紀念幣
    'col-slot-bells': 2.6, // 神殿純金響鐘
    'col-poker-bluff': 2.7, // 心理戰神撲克面具
    'col-poker-allin': 2.6, // 全押金山紀念盃
    'col-roulette-red-streak': 2.5, // 紅寶石骰盅
    'col-blackjack-double': 2.4, // 雙刃幸運金幣
    // 沉重工業工具微折讓
    'col-plinko-triple-hit': 0.8,
    'col-roulette-36x': 0.8,
  },

  // 6. 【當鋪琴姐】(npc-qin) — 通收百物，全品項保底 1.3X，黃金古玉更高
  'npc-qin': {
    'col-slot-diamonds': 1.8,
    'col-roulette-zero': 1.7,
    'col-blackjack-charlie': 1.7,
    'col-poker-royal': 1.8,
    'col-siba-eighteen': 1.6,
  },

  // 7. 【隱世賭聖阿發】(npc-afa) — 賭道頂級至寶開出頂格天價
  'npc-afa': {
    'col-poker-royal': 3.0,
    'col-poker-bluff': 2.8,
    'col-blackjack-natural': 2.8,
    'col-craps-natural': 2.8,
    'col-siba-eighteen': 2.8,
    'col-roulette-big-win': 2.8,
    'col-blackjack-charlie': 2.7,
    'col-slot-777': 2.6,
  },

  // 8. 【名媛維多利亞】(npc-victoria) — 皇家拍賣會特約顧問，偏好頂級珠寶與冠冕
  'npc-victoria': {
    'col-roulette-big-win': 3.0, // 皇家輪盤金冠
    'col-slot-diamonds': 3.0, // 永恆之淚藍鑽
    'col-slot-777': 2.8, // 拉斯維加斯霓虹之星
    'col-roulette-zero': 2.7, // 純金翡翠籌碼
    'col-poker-royal': 2.8, // 皇家同花順純金徽章
    'col-blackjack-split': 2.6, // 雙生天使羽飾
    'col-slot-spins': 0.8,
    'col-plinko-multidrop': 0.8,
  },

  // 9. 【科技極客埃隆】(npc-elon) — 專收精密發條、齒輪與超導零件
  'npc-elon': {
    'col-plinko-multidrop': 3.0, // 超導磁浮發射器
    'col-plinko-triple-hit': 2.8, // 精密水銀水平儀
    'col-plinko-100x': 2.8, // 泰坦重力寶珠
    'col-slot-spins': 2.8, // 永動發條齒輪
    'col-roulette-36x': 2.6, // 黃金象限儀
    'col-siba-bg': 0.8,
    'col-siba-reroll': 0.8,
  },

  // 10. 【暗巷九哥】(npc-nine) — 專收各色骰具與老千黑市道具
  'npc-nine': {
    'col-siba-eighteen': 2.8,
    'col-siba-bg': 2.8,
    'col-siba-four-same': 2.6,
    'col-craps-hardway': 2.6,
    'col-craps-no-seven': 2.6,
    'col-poker-bluff': 2.5,
    'col-slot-spins': 0.9,
  },

  // 11. 【精算導師巴菲特】(npc-buffett) — 專收撲克、21點與數學徽章
  'npc-buffett': {
    'col-poker-royal': 3.0,
    'col-poker-allin': 2.8,
    'col-poker-river': 2.7,
    'col-blackjack-natural': 2.7,
    'col-blackjack-double': 2.6,
    'col-plinko-veteran': 2.5,
    'col-slot-cherries': 0.8,
  },

  // 12. 【千王白老大】(npc-boss-white) — 千術至尊，重金收購千門傳奇
  'npc-boss-white': {
    'col-siba-eighteen': 3.0,
    'col-blackjack-charlie': 3.0,
    'col-poker-bluff': 2.9,
    'col-blackjack-dealer-bust': 2.8,
    'col-craps-natural': 2.8,
    'col-siba-reroll': 2.7,
    'col-slot-spins': 0.8,
  },

  // 13. 【和風藏家雪奈】(npc-yukina) — 專收典雅茶道與古典工藝玉器
  'npc-yukina': {
    'col-blackjack-charlie': 2.8,
    'col-siba-two-pairs': 2.7,
    'col-roulette-dozens': 2.6,
    'col-siba-big-win': 2.6,
    'col-plinko-wing': 2.5,
    'col-slot-spins': 0.8,
  },

  // 14. 【特勤督導安德森】(npc-anderson) — 賭場安保特勤，官方回收特許證物
  'npc-anderson': {
    'col-blackjack-dealer-bust': 2.8,
    'col-craps-point-hit': 2.7,
    'col-roulette-zero': 2.6,
    'col-blackjack-natural': 2.5,
    'col-craps-any-seven': 2.5,
  },
};

/**
 * Calculates accurate item valuation and multiplier for any specific NPC.
 */
export function getNPCItemValuation(
  npc: BlackMarketNPC,
  item: CollectibleItem
): NPCItemValuation {
  let multiplier: number;
  let reasonText = '';

  // 1. NPC Dynamic Target Wanted Item (Peak Multiplier)
  if (npc.targetCollectibleId && item.id === npc.targetCollectibleId) {
    multiplier = npc.targetMultiplier || 3.0;
    reasonText = `★ ${npc.name} 專屬懸賞求購目標！享有全場最高倍率`;
  }
  // 2. Explicit Matrix Multiplier
  else if (NPC_ITEM_PRICE_MATRIX[npc.id] && NPC_ITEM_PRICE_MATRIX[npc.id][item.id] !== undefined) {
    multiplier = NPC_ITEM_PRICE_MATRIX[npc.id][item.id];
    reasonText = multiplier >= 2.0 ? `${npc.name} 專項鍾愛品類` : multiplier < 1.0 ? `${npc.name} 興趣偏低折讓收購` : `${npc.name} 常規收購價`;
  }
  // 3. Pawnshop Generalist (琴姐保底 1.3x)
  else if (npc.allItemAcceptor) {
    multiplier = npc.multiplier || 1.3;
    reasonText = '當鋪童叟無欺，全品項保底收購';
  }
  // 4. Gambling Master Afa (賭聖全場高倍)
  else if (npc.id === 'npc-afa') {
    multiplier = item.rarity === 'legendary' ? 2.5 : item.rarity === 'epic' ? 2.2 : 2.0;
    reasonText = '賭聖見寶心喜，特賜頂格出價';
  }
  // 5. Rarity matching fallback
  else if (npc.preferredRarity && npc.preferredRarity === item.rarity) {
    multiplier = Math.min(2.5, Math.round((npc.multiplier + 0.3) * 10) / 10);
    reasonText = `${npc.name} 偏好【${item.rarity === 'legendary' ? '傳奇' : item.rarity === 'epic' ? '史詩' : '稀有'}】品級珍藏`;
  }
  // 6. General fallback
  else {
    multiplier = npc.multiplier || 1.0;
    reasonText = `${npc.name} 常規標準收購價`;
  }

  const buyoutPrice = Math.round(item.basePrice * multiplier);

  let valuationType: NPCItemValuation['valuationType'];
  let label: string;
  let badgeClass: string;
  let priceClass: string;

  if (multiplier >= 2.0) {
    valuationType = 'super_high';
    label = `${multiplier.toFixed(1)}X 亮金超高價`;
    badgeClass =
      'bg-amber-400 text-stone-950 font-black border border-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse';
    priceClass = 'text-amber-300 font-black';
  } else if (multiplier >= 1.3) {
    valuationType = 'premium';
    label = `${multiplier.toFixed(1)}X 溢價收購`;
    badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold';
    priceClass = 'text-emerald-300 font-bold';
  } else if (multiplier >= 1.0) {
    valuationType = 'regular';
    label = `${multiplier.toFixed(1)}X 一般原價`;
    badgeClass = 'bg-stone-700/40 text-stone-300 border border-stone-600/40 font-medium';
    priceClass = 'text-stone-200';
  } else {
    valuationType = 'discount';
    label = `${multiplier.toFixed(1)}X 低價折讓`;
    badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold';
    priceClass = 'text-rose-300';
  }

  return {
    multiplier,
    buyoutPrice,
    valuationType,
    label,
    badgeClass,
    priceClass,
    reasonText,
  };
}

export function sellCollectibleToNPC(
  collectibleId: string,
  multiplierOrNPC: number | BlackMarketNPC
): { chipsEarned: number; remaining: CollectibleItem[] } {
  const playerItems = getPlayerCollectibles();
  const itemIndex = playerItems.findIndex((c) => c.id === collectibleId);
  if (itemIndex < 0) return { chipsEarned: 0, remaining: playerItems };

  const item = playerItems[itemIndex];
  let multiplier: number;

  if (typeof multiplierOrNPC === 'number') {
    multiplier = multiplierOrNPC;
  } else {
    multiplier = getNPCItemValuation(multiplierOrNPC, item).multiplier;
  }

  const chipsEarned = Math.round(item.basePrice * multiplier);

  const remaining = playerItems.filter((_, idx) => idx !== itemIndex);
  savePlayerCollectibles(remaining);

  // Synchronously delete collection achievement and info so item can be rediscovered in future
  const currentUnlocked = getUnlockedCollectibleIds();
  const updatedUnlocked = currentUnlocked.filter((id) => id !== item.id);
  saveUnlockedCollectibleIds(updatedUnlocked);

  // Dispatch change event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }

  return { chipsEarned, remaining };
}

export function sellAllCollectiblesToNPC(
  npc: BlackMarketNPC
): { totalChips: number; soldCount: number } {
  const playerItems = getPlayerCollectibles();
  if (playerItems.length === 0) return { totalChips: 0, soldCount: 0 };

  let totalChips = 0;
  for (const item of playerItems) {
    const valuation = getNPCItemValuation(npc, item);
    totalChips += valuation.buyoutPrice;
  }

  savePlayerCollectibles([]);
  saveUnlockedCollectibleIds([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }

  return { totalChips, soldCount: playerItems.length };
}

// Active Lobby Black Market NPCs Generator (180s cycle, 1~3 random NPCs with 2x~4x marked up private collectibles)
export function getLobbyActiveNPCs(): BlackMarketNPC[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NPC + '_list_v3');
    if (raw) {
      const npcs: BlackMarketNPC[] = JSON.parse(raw);
      if (Array.isArray(npcs) && npcs.length >= 1 && npcs.length <= 3 && npcs[0].expiresAt > Date.now()) {
        return npcs;
      }
    }
  } catch {
    // ignore
  }
  return refreshLobbyActiveNPCs();
}

export function refreshLobbyActiveNPCs(): BlackMarketNPC[] {
  const duration = 180 * 1000; // 180 seconds

  // Randomly select 1 to 3 distinct NPCs from the full 14 roster
  const count = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
  const shuffled = [...BLACK_MARKET_NPCS].sort(() => 0.5 - Math.random());
  const selectedTemplates = shuffled.slice(0, count);

  const npcs: BlackMarketNPC[] = selectedTemplates.map((template) => {
    // Pick an appropriate or favorite target item for each NPC
    const matchingCollectibles = ALL_COLLECTIBLES.filter(
      (c) =>
        template.favoriteGame.includes(c.gameName) ||
        template.allItemAcceptor ||
        (template.preferredRarity && c.rarity === template.preferredRarity)
    );

    const pool = matchingCollectibles.length > 0 ? matchingCollectibles : ALL_COLLECTIBLES;
    const randomTargetItem = pool[Math.floor(Math.random() * pool.length)];

    const targetMultiplier = Math.min(
      3.0,
      Math.round((template.multiplier + 0.3 + Math.random() * 0.4) * 10) / 10
    );

    const wantedDialogue = `「你有看到來自【${randomTargetItem.gameName}】的珍品【${randomTargetItem.name}】嗎？願出 ${(targetMultiplier * 100).toFixed(0)}% (${targetMultiplier} 倍) 專屬天價收購！」`;

    // Low probability (~18%) to offer a rare private collectible for sale at 2.0x ~ 4.0x markup
    let forSaleItem = undefined;
    const hasItemForSale = Math.random() < 0.18;
    if (hasItemForSale) {
      const rarePool = ALL_COLLECTIBLES.filter((c) => c.rarity !== 'common');
      const salePool = rarePool.length > 0 ? rarePool : ALL_COLLECTIBLES;
      const forSaleCollectible = salePool[Math.floor(Math.random() * salePool.length)];

      // Markup multiplier: 2.0x ~ 4.0x
      const markupMultiplier = Math.round((2.0 + Math.random() * 2.0) * 10) / 10;
      const price = Math.round(forSaleCollectible.basePrice * markupMultiplier);

      const quotes = [
        `「這是我從私人密庫帶來的【${forSaleCollectible.name}】，黑市現貨一口價，識貨的就帶走！」`,
        `「稀世珍品【${forSaleCollectible.name}】！雖說溢價不少，但平時在賭桌上可是可遇不可求的寶物。」`,
        `「壓箱底的好貨【${forSaleCollectible.name}】！誠意出讓給懂得欣賞的尊貴貴賓。」`,
      ];
      const flavorQuote = quotes[Math.floor(Math.random() * quotes.length)];

      forSaleItem = {
        collectible: forSaleCollectible,
        price,
        markupMultiplier,
        isSoldOut: false,
        flavorQuote,
      };
    }

    return {
      ...template,
      targetCollectibleId: randomTargetItem.id,
      targetMultiplier,
      wantedDialogue,
      expiresAt: Date.now() + duration,
      forSaleItem,
    };
  });

  localStorage.setItem(STORAGE_KEYS.NPC + '_list_v3', JSON.stringify(npcs));
  localStorage.setItem(STORAGE_KEYS.NPC, JSON.stringify(npcs[0])); // backwards compat
  return npcs;
}

/**
 * Buy a marked-up private collectible item from an active NPC in the lobby
 */
export function buyCollectibleFromNPC(
  npcId: string
): { success: boolean; cost: number; item?: CollectibleItem; message: string } {
  const npcs = getLobbyActiveNPCs();
  const npcIndex = npcs.findIndex((n) => n.id === npcId);
  if (npcIndex < 0) {
    return { success: false, cost: 0, message: '找不到該黑市貴賓' };
  }

  const npc = npcs[npcIndex];
  if (!npc.forSaleItem || npc.forSaleItem.isSoldOut) {
    return { success: false, cost: 0, message: '該珍品已售罄或該貴賓目前無特供私貨' };
  }

  const { collectible, price } = npc.forSaleItem;

  // Check if player already holds this collectible
  const currentItems = getPlayerCollectibles();
  if (currentItems.some((c) => c.id === collectible.id)) {
    return {
      success: false,
      cost: 0,
      message: `您的背包中已持有【${collectible.name}】，無需重複收購！`,
    };
  }

  // Add collectible to player inventory
  const unlockedIds = getUnlockedCollectibleIds();

  const itemInstance: CollectibleItem = {
    ...collectible,
    unlockedAt: Date.now(),
  };

  const updatedPlayerItems = [itemInstance, ...currentItems];
  savePlayerCollectibles(updatedPlayerItems);

  if (!unlockedIds.includes(collectible.id)) {
    saveUnlockedCollectibleIds([...unlockedIds, collectible.id]);
  }

  // Mark as sold out on this NPC
  npc.forSaleItem.isSoldOut = true;
  npcs[npcIndex] = npc;
  localStorage.setItem(STORAGE_KEYS.NPC + '_list_v3', JSON.stringify(npcs));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }

  return {
    success: true,
    cost: price,
    item: itemInstance,
    message: `成功以 $${price.toLocaleString()} 籌碼向【${npc.name}】購入了【${collectible.name}】！`,
  };
}

// Single NPC Generator & Refresh (for backwards compatibility)
export function getCurrentBlackMarketNPC(): BlackMarketNPC {
  const list = getLobbyActiveNPCs();
  return list[0] || refreshBlackMarketNPC();
}

export function refreshBlackMarketNPC(): BlackMarketNPC {
  const list = refreshLobbyActiveNPCs();
  return list[0];
}

/**
 * Generate a Spectator NPC for a game table (40% probability or specific assignment)
 */
export function getTableSpectatorCandidate(gameId: string): BlackMarketNPC {
  // Find NPCs that favor this game, or pick from full roster
  const matchingNPCs = BLACK_MARKET_NPCS.filter((npc) =>
    npc.favoriteGame.toLowerCase().includes(gameId.toLowerCase()) ||
    npc.allItemAcceptor ||
    npc.id === 'npc-afa'
  );
  const pool = matchingNPCs.length > 0 ? matchingNPCs : BLACK_MARKET_NPCS;
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Match target item from this specific game table to make table-buyout exciting
  const gameCollectibles = ALL_COLLECTIBLES.filter((c) => c.gameId === gameId);
  const targetItem =
    gameCollectibles[Math.floor(Math.random() * gameCollectibles.length)] ||
    ALL_COLLECTIBLES[0];

  const targetMultiplier = Math.min(
    3.0,
    Math.round((template.multiplier + 0.3 + Math.random() * 0.3) * 10) / 10
  );

  return {
    ...template,
    targetCollectibleId: targetItem.id,
    targetMultiplier,
    wantedDialogue: `「若能在此桌獲得【${targetItem.name}】，我願以 ${targetMultiplier} 倍直接收購！」`,
    expiresAt: Date.now() + 300000,
  };
}

// ==================== UNDERGROUND PAWN SHOP (地下當鋪機制) ====================

/**
 * Calculate pawn payout: 80% of basePrice, rounded UP to hundreds (無條件進位至百位數)
 * Example: 2500 -> 2000; 3500 -> 2800; 4500 -> 3600; 3120 -> 2500
 */
export function calculatePawnAmount(basePrice: number): number {
  return Math.ceil((basePrice * 0.8) / 100) * 100;
}

export function getPawnedItems(): PawnedItemRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAWNED_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePawnedItems(items: PawnedItemRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.PAWNED_ITEMS, JSON.stringify(items));
}

export function isItemPawned(collectibleId: string): boolean {
  const pawned = getPawnedItems();
  return pawned.some((p) => p.item.id === collectibleId);
}

/**
 * Pawn a collectible item:
 * 1. Gives player 80% of basePrice (rounded up to hundreds).
 * 2. Removes from active player bag.
 * 3. Keeps in pawn shop records for future redemption at original basePrice.
 * 4. Collection hall preserves info, but displays as dark/dimmed (like not acquired).
 */
export function pawnCollectibleItem(collectibleId: string): {
  success: boolean;
  pawnAmount: number;
  redeemCost: number;
  item: CollectibleItem | null;
  message: string;
} {
  const playerItems = getPlayerCollectibles();
  const itemIndex = playerItems.findIndex((c) => c.id === collectibleId);

  if (itemIndex < 0) {
    return {
      success: false,
      pawnAmount: 0,
      redeemCost: 0,
      item: null,
      message: '背包中未找到該珍品！',
    };
  }

  const targetItem = playerItems[itemIndex];
  const pawnAmount = calculatePawnAmount(targetItem.basePrice);
  const redeemCost = targetItem.basePrice;

  // Remove from bag
  const remainingBag = playerItems.filter((_, idx) => idx !== itemIndex);
  savePlayerCollectibles(remainingBag);

  // Add to pawned records
  const currentPawned = getPawnedItems();
  const record: PawnedItemRecord = {
    item: targetItem,
    pawnAmount,
    redeemCost,
    pawnedAt: Date.now(),
  };
  savePawnedItems([record, ...currentPawned]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }

  return {
    success: true,
    pawnAmount,
    redeemCost,
    item: targetItem,
    message: `成功將【${targetItem.name}】典當給地下當鋪，獲得應急金 $${pawnAmount.toLocaleString()} 籌碼！`,
  };
}

/**
 * Redeem a pawned collectible item:
 * Deducts original basePrice from balance, removes from pawn records, returns item to player bag.
 */
export function redeemPawnedItem(
  collectibleId: string,
  currentBalance: number
): {
  success: boolean;
  cost: number;
  item: CollectibleItem | null;
  message: string;
} {
  const pawnedList = getPawnedItems();
  const recordIndex = pawnedList.findIndex((p) => p.item.id === collectibleId);

  if (recordIndex < 0) {
    return {
      success: false,
      cost: 0,
      item: null,
      message: '當鋪存根中未找到該珍品！',
    };
  }

  const record = pawnedList[recordIndex];
  if (currentBalance < record.redeemCost) {
    return {
      success: false,
      cost: record.redeemCost,
      item: record.item,
      message: `籌碼不足！贖回【${record.item.name}】需要支付原價 $${record.redeemCost.toLocaleString()} 籌碼。`,
    };
  }

  // Remove from pawned list
  const remainingPawned = pawnedList.filter((_, idx) => idx !== recordIndex);
  savePawnedItems(remainingPawned);

  // Return to player bag
  const playerItems = getPlayerCollectibles();
  savePlayerCollectibles([record.item, ...playerItems]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
  }
  unlockHiddenCollectible('col-lobby-pawn');

  return {
    success: true,
    cost: record.redeemCost,
    item: record.item,
    message: `已支付原價 $${record.redeemCost.toLocaleString()} 贖回【${record.item.name}】，珍品已歸還背包！`,
  };
}

/**
 * Hard Reset: Completely clears all chips, redeemables, collectibles, pending deliveries, unlocked achievements,
 * pawned items, and ALL accumulated game statistics (Plinko drops, Slot spins, Blackjack stats & shoe, Craps stats & history,
 * Poker stats & history, Siba stats & history, Roulette history & bets).
 */
export function resetAllCasinoData(): void {
  // Clear inventory, collectibles, achievements, deliveries, NPCs, pawned items
  localStorage.removeItem(STORAGE_KEYS.REDEEMABLES);
  localStorage.removeItem(STORAGE_KEYS.COLLECTIBLES);
  localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
  localStorage.removeItem(STORAGE_KEYS.NPC);
  localStorage.removeItem(STORAGE_KEYS.NPC + '_list_v3');
  localStorage.removeItem(STORAGE_KEYS.PENDING_DELIVERIES);
  localStorage.removeItem(STORAGE_KEYS.PAWNED_ITEMS);
  localStorage.removeItem(STORAGE_KEYS.LUCKY_CHARMS);

  // Clear Global Career Stats
  resetCareerStats();

  // Clear Global Balance & Tab state
  localStorage.removeItem('nocturnal_club_balance_v1');
  localStorage.removeItem('european_roulette_balance_v1');
  localStorage.removeItem('european_roulette_history_v1');
  localStorage.removeItem('european_roulette_prev_bets_v1');
  localStorage.removeItem('casino_user_balance');
  localStorage.removeItem('roulette_history');
  localStorage.removeItem('roulette_prev_bets');
  localStorage.removeItem('casino_active_tab');
  localStorage.removeItem('casino_hub_active_tab_v1');

  // Clear Game-specific stats, history, shoe, bets
  localStorage.removeItem('plinko_stats_v2');
  localStorage.removeItem('plinko_history_v2');
  localStorage.removeItem('plinko_bet_v2');
  localStorage.removeItem('casino_slot_stats_v1');
  localStorage.removeItem('casino_slot_history_v1');
  localStorage.removeItem('blackjack_shoe_v1');
  localStorage.removeItem('blackjack_stats_v1');
  localStorage.removeItem('blackjack_prev_bet_v1');
  localStorage.removeItem('blackjack_history_v1');
  localStorage.removeItem('casino_blackjack_recent_hands_v1');
  localStorage.removeItem('casino_craps_stats_v1');
  localStorage.removeItem('casino_craps_history_v1');
  localStorage.removeItem('texas_holdem_stats_v1');
  localStorage.removeItem('texas_holdem_history_v1');
  localStorage.removeItem('casino_poker_history_v1');
  localStorage.removeItem('casino_siba_stats_v1');
  localStorage.removeItem('casino_siba_history_v1');
  localStorage.removeItem('casino_claw_stats_v1');
  localStorage.removeItem('casino_claw_history_v1');
  localStorage.removeItem('roulette_history_v1');
  localStorage.removeItem('roulette_bets_v1');
  localStorage.removeItem('casino_sicbo_stats_v1');
  localStorage.removeItem('casino_sicbo_history_v1');
  localStorage.removeItem('casino_bar_discovered_clues');
  localStorage.removeItem('casino_vip_aura_expire_time');
  localStorage.removeItem('casino_vip_last_manual_refresh');

  // Dispatch custom window events so all mounted game components reset their local state
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('casino_full_reset'));
    window.dispatchEvent(new CustomEvent('casino_inventory_changed'));
    window.dispatchEvent(new CustomEvent('casino_career_stats_updated'));
  }
}

export function resetAllInventoryAndAchievements(): void {
  resetAllCasinoData();
}

/**
 * Get count of all inventory items (redeemables + player unlocked collectibles)
 */
export function getTotalInventoryCount(): { total: number; redeemablesCount: number; collectiblesCount: number } {
  const redeemables = getRedeemableItems();
  const collectibles = getPlayerCollectibles();
  return {
    total: redeemables.length + collectibles.length,
    redeemablesCount: redeemables.length,
    collectiblesCount: collectibles.length,
  };
}

