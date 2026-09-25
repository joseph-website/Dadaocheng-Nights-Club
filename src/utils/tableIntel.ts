/**
 * Black Market Probability Analysis & Table Intel Utility
 * Provides mathematically grounded, atmospheric probability quotes and bet action broadcasting.
 */

export interface BetActionEventDetail {
  gameId: string;
  betType?: string;
  amount?: number;
  label?: string;
}

export const BLACK_MARKET_PROBABILITY_ANALYSES: Record<string, string[]> = {
  roulette: [
    '📊【黑市算盤】：單號直接注（Straight-Up）命中率為 2.70%（1/37），但 35:1 的高倍賠率正是黑市大戶以小博大的最愛！',
    '📊【機率透鏡】：紅黑／單雙／大小的勝率為 48.65%，稍微避開 0 號綠區，是雙倍籌碼穩健推進的利器。',
    '📊【地下速報】：十二門（Dozens）覆蓋 32.43% 盤面，2:1 賠率是構建防守型注碼鏈的黃金比例。',
    '📊【盤面密析】：法式跑道零號周圍（Voisins）覆蓋了 17 個號碼，佔據輪盤高達 45.9% 的落球區域！',
    '📊【黑市心法】：直行注（Columns）搭配相鄰外圍反打，收益波動最為平穩，適合長線作戰。',
    '📊【輪盤暗語】：輪盤無記憶，每局獨立 1/37；但連續 4 把同色後，旁觀籌碼往往會產生強烈偏好效應。',
    '📊【賠率解密】：下注 0 號綠區雖然難度較高，但爆冷時的 35:1 賠率常讓整個黑市沸騰！',
  ],
  blackjack: [
    '📊【黑市算盤】：莊家明牌 5 或 6 時爆牌率高達 42.9%，此時手握 12 點以上果斷停牌是數學最優解！',
    '📊【機率透鏡】：起手 11 點時，要到 10 點牌的機率高達 30.8%，雙倍下注（Double Down）勝算極高！',
    '📊【地下速報】：天牌 Blackjack (A+10) 出現率約 4.83%，3:2 的淨賠率是玩家唯一的結構性優勢！',
    '📊【盤面密析】：雙 8 分牌（Split）可將最爛的 16 點硬牌拆成兩副 18 點潛力牌，切忌猶豫！',
    '📊【黑市心法】：六副牌牌靴中剩餘大牌越多，莊家爆牌率與玩家 Blackjack 率雙雙飆升！',
    '📊【牌桌暗語】：買保險（Insurance）在未算牌情況下往往得不償失，除非你手握整靴大牌情報否則別碰！',
    '📊【算牌密令】：當牌靴剩餘牌中 10 點牌密度上升時，加倍下注與分牌的勝率優勢會呈指數放大。',
  ],
  poker: [
    '📊【黑市算盤】：德州撲克翻牌前手握口袋對子 AA，對抗任意雙牌的勝率高達 85.2%，是起手牌之皇！',
    '📊【底池賠率】：翻牌圈（Flop）兩頭順子聽牌到河牌成牌機率約 31.5%，算準底池賠率（Pot Odds）再跟注！',
    '📊【地下速報】：同花聽牌（4張同花）到河牌成牌率約 34.97%，隱含賠率充足時是逆襲利器！',
    '📊【盤面密析】：手握小對子翻牌擊中暗三條（Set）的機率約 11.8%（約 1/8.5），一旦擊中往往能清空對手！',
    '📊【黑市心法】：位置就是力量（Position is Power）！在按鈕位（Button）最後表態擁有全場最頂級的決策優勢。',
    '📊【同花密碼】：同花連張（Suited Connectors 如 9♠8♠）具備高隱含價值，深籌碼局最具翻盤威懾力。',
  ],
  slot: [
    '📊【黑市算盤】：老虎機全線下注可完全激活 Grand 累積彩池觸發條件，單線下注會錯失高倍彩金！',
    '📊【機率透鏡】：高波動機台通常在連續多輪無效旋轉後，進入免費旋轉（Free Spins）的爆發權重窗口！',
    '📊【地下速報】：黃金 777 三連圖標的理論命中率約 0.28%，但配合百搭 Wild 符號可顯著提高成線率！',
    '📊【黑市心法】：累積彩池（Jackpot）池底越厚，大獎累積爆發潛力越發驚人！',
    '📊【機台脈衝】：Scatter 圖標每次出現 2 個以上，代表獎池震盪頻率正處於活躍週期！',
  ],
  plinko: [
    '📊【黑市算盤】：中央落點符合高斯常態分佈（佔比 68% 以上），但兩側 100x 極限框正是黑市以小搏大的暴利來源！',
    '📊【機率透鏡】：連續密集投球時，物理反彈存在微小群聚效應，觀察落點趨勢能抓住偏角軌跡！',
    '📊【地下速報】：中央低倍率雖然穩健，但若要衝擊排行榜，側翼極限賠率才是翻身關鍵！',
    '📊【物理慣性】：釘板層級越多，彈珠偏離中心的二項式分佈越寬，極限高倍率爆發率越高。',
  ],
  siba: [
    '📊【黑市算盤】：擲出【豹子】（四顆同點）的機率為 1/216 (約 0.46%)，獲勝享 4 倍全額通殺賠率！',
    '📊【機率透鏡】：擲出【無點重新擲】的機率約 27.8%，不要氣餒，重新蓄力往往能搖出高點！',
    '📊【地下速報】：十八點（一對6 + 6,6）是頂級通殺點，壓倒一切莊家常規點數！',
    '📊【黑市心法】：大碗內骰子的碰撞反彈取決於投擲角度，心定手穩方能搖出吉兆！',
    '📊【點數機率】：常規點數中，3 點至 11 點的分佈呈鐘形，7~9 點是最高頻的對決區間。',
  ],
  craps: [
    '📊【黑市算盤】：Pass Line 結合 3-4-5 倍 Free Odds 是最受老手推崇的純數學公平投注！',
    '📊【機率透鏡】：兩顆骰子擲出 7 點的機率最高（6/36 = 16.67%），避開 7-Out 是獲利核心！',
    '📊【地下速報】：Place 6 和 Place 8 出現機率僅次於 7 點（各 5/36），7:6 賠率非常適合鋪場推進！',
    '📊【黑市心法】：Field 區雖然節奏快，但長期勝率略低於數字點數，適合作為短期衝刺。',
    '📊【硬號狂熱】：Hardways（硬 6、硬 8）雖然賠率高達 9:1，但出現機率僅 1/36，建議搭配防守注。',
  ],
  claw: [
    '📊【黑市算盤】：抓力週期在每 8~12 次投幣會出現一次強爪保夾慣性，算準次數能一擊必中！',
    '📊【地下速報】：夜行至尊兌幣券重心偏向卡角處，夾爪側傾 15 度抓取成功率提升 40%！',
    '📊【黑市秘訣】：瞄準獎品靠近出貨口的側壁，利用爪子甩幅慣性勾出可大幅節省代幣！',
  ],
  pinball: [
    '📊【黑市算盤】：蓄力 50%~60%（約 55%）為「黃金拱頂脫軌力道」，能順著弧頂衝至最高峰自然脫軌墜入中路釘板！',
    '📊【機率透鏡】：避開中盤 3 個 0x 槓龜落球孔是獲利關鍵，只要鋼珠順利穿透排釘抵達底部，8 大獎槽 100% 保證派彩！',
    '📊【地下速報】：外側兩翼 50 分獎槽享有 3.2x 高倍賠率（獎金 $160），微調 75%~98% 強力打法有機會沿邊緣滑入！',
    '📊【黑市心法】：全盤數學期望值（RTP）高達 97.6%，是全場最溫和厚道、兼具真實物理碰撞的懷舊機台。',
    '📊【力道秘訣】：若蓄力過輕未能翻過頂弧，彈珠會順管滑回底部並全數歸還；但微弱力道仍有機率碰巧掠過管口出管，考驗玩家微調手感！',
  ],
};

/**
 * Character-specific casual banter & table cheering quotes for each NPC
 */
export const NPC_CASUAL_BANTER: Record<string, string[]> = {
  'npc-zhang': [
    '「小友這注氣度沉穩，頗有老夫當年闖蕩上海灘的風骨！」',
    '「下得好！老夫瞧這盤面紫氣縈繞，這手注碼暗合八卦生門。」',
    '「莫急莫躁，籌碼一落就是定數，老夫陪你靜觀其變！」',
    '「這手注碼落點極正！若能再出件古董老件，老夫定出天價收購！」',
    '「賭道如茶道，慢工出細活，你這份沉著老夫很欣賞。」',
  ],
  'npc-wang': [
    '「哈哈哈哈！籌碼就是拿來砸的！王董我就欣賞你這股狠勁！」',
    '「這注下得有排面！待會贏了大彩池，王董我請你喝頂級路易十三！」',
    '「小兄弟大氣！在我的貴賓席上玩，就是要這種翻天覆地的氣勢！」',
    '「這才叫頂級玩家！只要你贏得過癮，要多少籌碼王董都有！」',
    '「加碼！再加碼！大戶人家的手筆，就是要讓荷官手抖！」',
  ],
  'npc-jack': [
    '「系統反饋正常！我剛才截獲的物理隨機數波動，這注訊噪比非常優異！」',
    '「你的下注延遲低於 12ms，這種神經反應速度簡直比我的光纖還快！」',
    '「後台熵池正在激化，這組參數有 80% 機率擊穿莊家防禦協議！」',
    '「酷！我就喜歡這種乾淨俐落的下注模式，繼續保持連線頻寬！」',
    '「晶片哈希值正在對齊，我預感下一秒伺服器就要給你吐金幣了！」',
  ],
  'npc-phantom': [
    '「呵呵～下得真果斷呢，姐姐最喜歡有膽識的男人了～」',
    '「這道注碼下的優雅從容，連荷官的眼神都多看了你兩眼呢。」',
    '「夜總會的冰鎮香檳已經替你備好了，這把可要贏得漂亮點喔～」',
    '「這盤面的氣息透著一股不安分的誘惑…我看好你這手！」',
    '「籌碼落下的聲音真悅耳，就像深夜裡的爵士樂一樣醉人～」',
  ],
  'npc-gear': [
    '「齒輪高速咬合中！力矩平衡運算顯示，你的下注動能相當充沛！」',
    '「根據我的精準發條模型，本次落點的慣性偏移率小於 2.3%！」',
    '「喀嗒！完美的發條節奏！物理機械從不說謊，好兆頭！」',
    '「發條上緊了！蒸氣指針正在劇烈擺動，準備迎接超臨界動能吧！」',
    '「嚴絲合縫的下注時機，這簡直是鐘錶大師級的精準操作！」',
  ],
  'npc-ahqiang': [
    '「水啦！兄弟這把穩的！氣勢出來了，跟著你下準沒錯！」',
    '「幹得好！莊家手都在抖了啦！今天不把賭場吃垮我們不走！」',
    '「這注夠殺！我賭徒阿強在夜市混了二十年，就佩服你這種狠角色！」',
    '「衝衝衝！氣運正旺，趁勝追擊，下把直接翻倍帶走！」',
    '「哈哈！爽快！我就愛看籌碼堆成小山的感覺，兄弟加油啊！」',
  ],
  'npc-oracle': [
    '「（閉目掐指）乾坤運轉，吉星高照，這道注碼隱隱透出財帛宮吉象！」',
    '「我看見了…盤面正在為你鋪路，順應這股天時必有所獲！」',
    '「心定則路通。小友這一下注，正應了《易經》的飛龍在天之卦！」',
    '「命中有時終須有，這把籌碼帶著紫氣，且看天命如何顯現。」',
    '「冥冥之中自有定數，你今日手氣帶煞，正好破了莊家的局！」',
  ],
  'npc-shadow': [
    '「情報顯示，這張桌子剛才進了一批好水，你的嗅覺非常靈敏。」',
    '「明智的注碼分配。黑市的龐大金流，正是靠這種冷靜的眼光滾大的。」',
    '「我已經替你盯緊了盤口，這筆籌碼投下去勝算很大，放手一搏吧。」',
    '「在黑市裡，敢於在關鍵時刻壓注的人，往往才能活到最後。」',
    '「漂亮。這是一筆教科書級別的資金佈局，我們坐等收成。」',
  ],
};

/**
 * Fallback casual banter for any guest without custom lines
 */
const GENERIC_CASUAL_BANTER = [
  '「這注下得乾脆俐落！我看這把很有希望！」',
  '「氣勢不錯！賭桌上就是要有一股敢衝的魄力！」',
  '「籌碼落定，靜候佳音！祝你這把大獲全勝！」',
  '「手風看起來正順，這把且看荷官如何應對！」',
  '「好眼力！這注下的時機剛好在關鍵節奏點上！」',
];

export interface TableSpeechResult {
  text: string;
  kind: 'banter' | 'analysis';
  tag: string;
}

/**
 * Get randomized table comment: alternates smoothly between personal banter and math intel
 */
export function getRandomTableSpeech(gameId: string, npcId?: string, npcName?: string): TableSpeechResult {
  const name = npcName || '貴賓';
  const isBanter = Math.random() < 0.55; // 55% chance of character banter

  if (isBanter && npcId && NPC_CASUAL_BANTER[npcId]) {
    const pool = NPC_CASUAL_BANTER[npcId];
    const quote = pool[Math.floor(Math.random() * pool.length)];
    return {
      text: quote,
      kind: 'banter',
      tag: `💬【${name} • 觀戰閒聊】`,
    };
  }

  // Generic banter or mathematical probability analysis
  if (isBanter) {
    const quote = GENERIC_CASUAL_BANTER[Math.floor(Math.random() * GENERIC_CASUAL_BANTER.length)];
    return {
      text: quote,
      kind: 'banter',
      tag: `💬【${name} • 觀戰閒聊】`,
    };
  }

  // Mathematical analysis
  const list = BLACK_MARKET_PROBABILITY_ANALYSES[gameId] || BLACK_MARKET_PROBABILITY_ANALYSES.roulette;
  const rawQuote = list[Math.floor(Math.random() * list.length)];
  const cleanQuote = rawQuote.replace(/^[^\s]+【[^】]+】：/, '');
  return {
    text: cleanQuote,
    kind: 'analysis',
    tag: `⚡【${name} • 機率分析】`,
  };
}

/**
 * Structured Tactical & Mathematical Intel per Game for the Dialogue Modal Intel Tab
 */
export interface TableTacticalIntel {
  gameName: string;
  optimalStrategy: string;
  trapAlert: string;
  momentumNote: string;
  keyFormulas: string[];
}

export const TABLE_TACTICAL_INTEL: Record<string, TableTacticalIntel> = {
  roulette: {
    gameName: '歐式輪盤 (European Roulette)',
    optimalStrategy: '組合防守注法：以直行（Columns）或打（Dozens）搭配相鄰外圍紅黑雙倍區，既有 2:1 的爆發性，又能以 1:1 的外圍保本。',
    trapAlert: '切忌沉迷「賭徒謬誤」：連續出紅並不代表下一把出黑機率會提升，每一手落球在物理上皆為獨立 1/37。',
    momentumNote: '法式跑道零號周圍（Voisins）覆蓋了 17 個連號槽位，是追蹤落球區域偏差的利器。',
    keyFormulas: ['單號勝率: 1/37 (2.70%)', '外圍雙倍勝率: 18/37 (48.65%)', '十二門勝率: 12/37 (32.43%)'],
  },
  blackjack: {
    gameName: '經典 21 點 (Blackjack 6-Deck)',
    optimalStrategy: '嚴格執行標準牌表：雙 8 與雙 A 必分牌；自身 11 點面對莊家 10 以下必加倍（Double）；莊家明牌 4~6 弱牌時，自己 12 點以上果斷停牌。',
    trapAlert: '買保險（Insurance）在未算牌情況下往往得不償失，莊家拿到 Blackjack 的機率僅約 30.8%，屬於賭場高利潤陷阱，切勿盲目購買！',
    momentumNote: '當牌靴剩餘 10 點大牌密集時（Hi-Lo 正計數），莊家容易爆牌，此時分牌、雙倍下注勝算大幅飆升。',
    keyFormulas: ['天生 Blackjack 獲利率: 3:2 (1.5x)', '莊家 5/6 爆牌率: 42.9%', '保險賠率: 2:1'],
  },
  poker: {
    gameName: '德州撲克 (Texas Hold\'em 1-Deck / 52張標準牌)',
    optimalStrategy: '重視底池賠率（Pot Odds）與位置優勢（Position）：按鈕位（BTN）擁有最後表態權；翻牌圈聽牌時以「四二法則」快速估算勝率（Outs x 4%）。',
    trapAlert: '在翻牌前避免過度迷信邊緣同花或弱 K/弱 Q；缺乏位置且落後時，盲目跟注只會不斷蠶食深籌碼。',
    momentumNote: '翻牌擊中暗三條（Set）機率約 11.8%，擊中即具備清空對手全額籌碼的巨大隱含賠率。',
    keyFormulas: [
      '牌副規格: 1副標準撲克 (52張・無鬼牌・每局重洗)',
      '口袋 AA 翻前勝率: ~85.2%',
      '翻牌兩頭順子成牌率: ~31.5%',
      '同花聽牌到河牌成牌率: ~34.97%',
    ],
  },
  slot: {
    gameName: '狂熱水果老虎機 (Slots 5-Line)',
    optimalStrategy: '全線投注策略：務必啟動全額 5 條有效賠付線，才能完全解鎖 Grand 累積彩池與狂熱 Scatter 的全額翻倍權重。',
    trapAlert: '勿在資金不足時進行高額單線投注，高波動老虎機的數學優勢依賴長輪次旋轉激發免費旋轉（Free Spins）。',
    momentumNote: '當 Jackpot 累積獎池持續膨脹至高位時，該機台的大獎爆發潛力達到頂峰。',
    keyFormulas: ['全線啟動收益放大: 100%', 'Grand 彩池門檻: 5-Line 全開', '百搭 Wild 替代率: 98%'],
  },
  plinko: {
    gameName: '極限彈珠台 (Plinko Physics)',
    optimalStrategy: '槓桿金字塔打法：以穩健的中央密集落點（68% 常態分佈）維持籌碼血量，並利用邊緣 100x 極限倍率搏取倍增爆發。',
    trapAlert: '釘板反彈具有高度動態混沌特性，切勿將所有資金集中在單一極限邊緣注碼。',
    momentumNote: '連續投球時產生的輕微物理群聚碰撞，可能引導落點軌跡向兩翼偏折。',
    keyFormulas: ['中心常態分佈覆蓋: ~68.2%', '雙翼 100x 邊緣率: ~0.5%', '高斯分佈標準差: σ=1.42'],
  },
  siba: {
    gameName: '台灣正宗十八仔 (Si-Bō-Á)',
    optimalStrategy: '善用兩對取大點與十八點高賠：一對基底搭配雙 6 為最高 12 點十八；下注大/小點為 1:1 穩健主力，佐以逼機（BG 3點）的高倍防守。',
    trapAlert: '四顆皆不同（無點）的重擲率達 27.8%，重擲並不計入勝負，保持心態穩定最重要。',
    momentumNote: '擲出「四一色 / 豹子通殺」的機率為 1/216 (約 0.46%)，享有高達 15 倍天價彩金。',
    keyFormulas: ['無點重新擲骰率: 27.8%', '四一色豹子機率: 1/216 (0.46%)', '逼機 BG 機率: ~4.6%'],
  },
  craps: {
    gameName: '美式花旗骰 (Craps Vegas)',
    optimalStrategy: 'Pass Line + 3-4-5x Free Odds 是賭場中少見的純數學公平賠付；建立點數後再鋪設 Place 6 與 Place 8。',
    trapAlert: '遠離單注高賠區（如 Any 7、Hardways 波動極大），只在手風極順時少量點綴。',
    momentumNote: '兩顆骰子擲出 7 的組合多達 6 種（1/6 = 16.67%），是所有數字中出現率最高的王者之數。',
    keyFormulas: ['7 點出現機率: 6/36 (16.67%)', 'Pass Line 獲勝機率: 49.29%', 'Free Odds: 完全公平賠付'],
  },
  claw: {
    gameName: '黑市特調娃娃機 (Claw Crane)',
    optimalStrategy: '利用爪子二段甩幅慣性：瞄準靠近擋板與出貨口邊緣的兌幣券，以傾角勾取邊緣而非硬拔中央。',
    trapAlert: '勿在爪力疲軟的初始週期連續急躁下爪，留意抓力蓄能的強爪週期（每 8~12 幣）。',
    momentumNote: '最高等級的「夜行至尊兌幣券」價值高達 2,000 點籌碼，重心偏向右下卡角。',
    keyFormulas: ['至尊兌幣券面額: $2,000', '強爪週期頻率: 8~12 次', '出貨口甩爪增益: +40%'],
  },
  pinball: {
    gameName: '古早味夜市打彈珠 (Night Market Pinball)',
    optimalStrategy: '精控 55% 拱頂脫軌力道：利用右側專用發射管直衝最高弧頂，自然脫軌垂直落入釘板中央，避開中段 0x 落球孔；兩側 50分 獎槽則可嘗試 75% 或 98% 強力打法。',
    trapAlert: '中盤設有 3 個落球孔（0x 槓龜陷阱），彈珠若掉入將無籌碼返還；留意避開中路三角分流排釘。',
    momentumNote: '順利抵達底部的 8 大槽位（50、30、20、10、10、20、30、50）全面保證派彩，總 RTP 嚴格校準於 97.6%。',
    keyFormulas: [
      '數學期望值 (RTP): 97.6%',
      '拱頂最佳發射力道: 50% ~ 60%',
      '底部槽位保證派彩: 100% (避開 0x 孔即有獎)',
      '雙翼最高獎倍率: 3.2x ($160 籌碼)',
    ],
  },
};

/**
 * Dispatch a custom event when the player performs any betting area action
 */
export function dispatchBetAction(detail: BetActionEventDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('casino_bet_action', {
        detail,
      })
    );
  }
}

/**
 * Get a randomized black market probability analysis quote for a given game
 */
export function getRandomProbabilityAnalysis(gameId: string, npcName?: string): string {
  const list = BLACK_MARKET_PROBABILITY_ANALYSES[gameId] || BLACK_MARKET_PROBABILITY_ANALYSES.roulette;
  const quote = list[Math.floor(Math.random() * list.length)];
  if (npcName) {
    return quote.replace('【黑市', `【${npcName} • 黑市`);
  }
  return quote;
}

