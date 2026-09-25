import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../../utils/audio';
import {
  HelpCircle,
  X,
  BookOpen,
  Gamepad2,
  Trophy,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Flame,
  Zap,
} from 'lucide-react';

export type GameTableId =
  | 'roulette'
  | 'blackjack'
  | 'poker'
  | 'slot'
  | 'pinball'
  | 'plinko'
  | 'siba'
  | 'craps'
  | 'claw';

interface GameRuleData {
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  overview: string;
  uiFeatures: { title: string; desc: string }[];
  rules: { title: string; desc: string }[];
  payouts: { betType: string; ratio: string; note: string }[];
  easterEggs: { name: string; rarity: string }[];
  tips: string[];
}

const GAME_RULES_DATA: Record<GameTableId, GameRuleData> = {
  roulette: {
    title: '歐式輪盤 (European Roulette)',
    subtitle: '經典 37 格單零輪盤，物理真實彈跳模擬與四種專業下注台面',
    badge: '經典桌遊 • 賠率最高 1:35',
    icon: '🎡',
    overview:
      '歐式輪盤包含 0 至 36 共 37 個數字槽位。球會由外軌順暢加速旋轉，減速後沿錐形斜面落入輪盤槽內。開出號碼由球體最終停靠落點槽位決定。',
    uiFeatures: [
      {
        title: '四大視圖切換 (View Modes)',
        desc: '支援【標準毛氈台 (Felt)】、【法式跑道 (Racetrack)】、【直注網格 (Inside)】與【倍數快選 (Outside)】，可依下注習慣自由切換。',
      },
      {
        title: '跑道相鄰注 (Neighbor Bets)',
        desc: '在法式跑道點擊任一號碼，可自動連帶下注其左右兩側相鄰各 2 個數字（共 5 號），快速覆蓋輪盤區域。',
      },
      {
        title: '舒適模式與快捷籌碼 (Comfort Mode)',
        desc: '點擊右上方「舒適模式」可切換下注台縮放；提供 $10 至 $5,000 六檔籌碼面額與「撤銷」、「清除」、「雙倍」快捷按鈕。',
      },
      {
        title: '冷熱號與歷史路單 (Hot & Cold Stats)',
        desc: '即時統計近期最常出現的熱號（火熱）與許久未出的冷號，助您掌握輪盤動態。',
      },
    ],
    rules: [
      {
        title: '內圍下注 (Inside Bets)',
        desc: '包含單號直注（Straight Up 賠率 35:1）、分注（Split 17:1）、街注（Street 11:1）、角注（Corner 8:1）、線注（Six Line 5:1）。',
      },
      {
        title: '外圍下注 (Outside Bets)',
        desc: '包含紅/黑（Red/Black）、單/雙（Even/Odd）、高/低（1-18/19-36，賠率皆為 1:1）；以及打注（1st/2nd/3rd 12）與直行注（2:1 Column，賠率皆為 2:1）。',
      },
      {
        title: '零號規則 (Zero 0)',
        desc: '當開出綠色 0 號時，除直注 0 或包含 0 的組合注外，所有外圍下注（紅黑、單雙、高低、打、行）均判為莊家獲勝。',
      },
    ],
    payouts: [
      { betType: '單號直注 (Straight Up)', ratio: '1 : 35', note: '精準命中單一數字' },
      { betType: '分注 (Split Bet)', ratio: '1 : 17', note: '同時押注 2 個相鄰數字' },
      { betType: '街注 (Street Bet)', ratio: '1 : 11', note: '橫向一排 3 個數字' },
      { betType: '角注 (Corner Bet)', ratio: '1 : 8', note: '四個十字交會數字' },
      { betType: '打注 / 行注 (Dozen / Column)', ratio: '1 : 2', note: '每組 12 個數字' },
      { betType: '紅黑 / 單雙 / 大小 (Even Chances)', ratio: '1 : 1', note: '18 個號碼雙倍賠率' },
    ],
    easterEggs: [
      { name: '蒙地卡羅黃金懷錶', rarity: '傳奇' },
      { name: '夜行翡翠幸運籌碼', rarity: '稀有' },
    ],
    tips: [
      '新手建議先從外圍雙倍區（紅/黑、單/雙）起步，勝率接近 48.6%，資金最穩健。',
      '法式跑道的【零號旁角 (Voisins du Zero)】與【孤兒注 (Orphelins)】是覆蓋大面積冷門號碼的高階戰術。',
    ],
  },

  blackjack: [
    {
      title: '二十一點 (Blackjack 21)',
      subtitle: '經典維加斯規則，挑戰莊家算點對決，Blackjack 享 3:2 高額獎金',
      badge: '策略桌遊 • 經典二十一點',
      icon: '🃏',
      overview:
        '目標是使手中牌點數總和盡可能接近 21 點但不可超過（爆牌）。A 可計為 1 點或 11 點，J、Q、K 均計為 10 點，2-10 依牌面點數計算。',
      uiFeatures: [
        {
          title: '行動控制列',
          desc: '依當前手牌動態開啟【要牌 (Hit)】、【停牌 (Stand)】、【雙倍 (Double)】與【分牌 (Split)】。',
        },
        {
          title: '保險機制 (Insurance)',
          desc: '當莊家明牌為 A 時，系統會主動詢問是否購買保險（保費為原注額的一半，賠率 2:1）。',
        },
        {
          title: '牌靴剩餘計數',
          desc: '即時顯示當前牌靴剩餘張數，洗牌時會有沉浸式提示。',
        },
      ],
      rules: [
        {
          title: '莊家要牌規則',
          desc: '莊家點數小於 17 點必須強制要牌，達到或超過 17 點必須停牌（軟 17 停牌）。',
        },
        {
          title: '自然 Blackjack (天王21點)',
          desc: '首兩張牌為 A + 10/J/Q/K 稱為 Blackjack，直接以 3:2（1.5 倍）賠率賠付，莊家同為 Blackjack 則為平手（Push）。',
        },
        {
          title: '雙倍下注 (Double Down)',
          desc: '首兩張牌發完後，玩家可將注額加倍，但僅能再要最後一張牌。分牌後亦允許雙倍下注。',
        },
        {
          title: '分牌 (Split)',
          desc: '起手兩張點數或字面相同（如 8-8、A-A），可加等額注碼拆為兩手獨立手牌。分牌 Ace 每手僅補一張牌。',
        },
        {
          title: '早期/遲期投降 (Surrender)',
          desc: '起手兩張牌若局勢極為不利（如玩家 16 點面對莊家 9 或 10 點），可選擇投降認輸，退回 50% 本金。',
        },
      ],
      payouts: [
        { betType: 'Blackjack (天生21點)', ratio: '3 : 2', note: '起手 A + 10點牌' },
        { betType: '常規獲勝 (Regular Win)', ratio: '1 : 1', note: '點數大於莊家且未爆牌' },
        { betType: '保險賠付 (Insurance)', ratio: '2 : 1', note: '莊家底牌確為 10 點牌' },
        { betType: '投降退款 (Surrender)', ratio: '0.5 : 1', note: '認輸退回一半籌碼' },
        { betType: '平手 (Push)', ratio: '1 : 0', note: '與莊家點數相同退還本金' },
      ],
      easterEggs: [
        { name: '二十一點大師黑卡', rarity: '史詩' },
        { name: '鍍金分牌純銀頂針', rarity: '稀有' },
      ],
      tips: [
        '基本策略心法：莊家秀 4、5、6 點弱牌時，自己 12 點以上不要冒險要牌，等莊家爆牌。',
        '雙 8 和雙 A 永遠要分牌；雙 10 和雙 5 千萬不要分牌（雙 5 直接雙倍下注）。',
      ],
    },
  ][0],

  poker: {
    title: '德州撲克 (Texas Hold\'em)',
    subtitle: '無限注德州撲克，底牌搭配五張公用牌，多輪加注與心理博弈',
    badge: '技術博弈 • 1 副標準牌 (52張)',
    icon: '🃏',
    overview:
      '每位玩家獲得 2 張隱蔽底牌，牌桌中央陸續開出 5 張公用牌（翻牌、轉牌、河牌）。從 7 張牌中組成最強的 5 張牌組合，牌型最大者或成功使對手棄牌者贏得底池（Pot）。',
    uiFeatures: [
      {
        title: '多階段下注進程 (Betting Rounds)',
        desc: '依序歷經 翻牌前 (Pre-Flop)、翻牌圈 (Flop)、轉牌圈 (Turn)、河牌圈 (River) 及 攤牌 (Showdown)。',
      },
      {
        title: '多樣戰術操作指令',
        desc: '提供 過牌 (Check)、跟注 (Call)、加注 (Raise)、全壓 (All-In) 及 棄牌 (Fold)。',
      },
    ],
    rules: [
      {
        title: '牌副配置與洗牌規格',
        desc: '採用國際賭場標準單副撲克牌（共 52 張，不含鬼牌/大小王）。每一手新局開局均會自動全新隨機洗牌發牌，確保每一輪賽局發牌之獨立性與絕對公平。',
      },
      {
        title: '牌型大小層級',
        desc: '皇家同花順 > 同花順 > 四條 > 葫蘆 > 同花 > 順子 > 三條 > 兩對 > 一對 > 高牌。',
      },
      {
        title: '盲注與底池機制',
        desc: '小盲注與大盲注強制下注建立初始彩池，各輪加注籌碼即時累積至中央底池。',
      },
      {
        title: '攤牌定勝負 (Showdown)',
        desc: '戰至最後河牌圈若無人棄牌，雙方翻開底牌比拼最佳 5 張牌型，強者獨得全額底池；同牌型則平分底池。',
      },
    ],
    payouts: [
      { betType: '皇家同花順 / 同花順', ratio: '頂級天牌', note: '機率最低、威力最強' },
      { betType: '四條 (Quads) / 葫蘆 (Full House)', ratio: '超強成牌', note: '極高勝率堅果牌' },
      { betType: '同花 (Flush) / 順子 (Straight)', ratio: '主力強牌', note: '聽牌成型翻盤利器' },
      { betType: '三條 / 兩對 / 一對', ratio: '常規牌型', note: '攻守兼備基礎牌型' },
    ],
    easterEggs: [
      { name: '帝王至尊金戒指', rarity: '傳說' },
      { name: '紫檀雕花酒壺', rarity: '史詩' },
    ],
    tips: [
      '重視起手牌品質與位置優勢：後位（按鈕位 Button）擁有最後行動權，具備極大資訊優勢。',
      '計算底池賠率（Pot Odds）與聽牌勝率（Outs），切勿在缺乏勝算時盲目跟注深籌碼。',
    ],
  },

  slot: {
    title: '極限狂歡老虎機 (Mega Jackpot Slots)',
    subtitle: '多線多軸拉霸機，Wild 萬能符號、Scatter 免費旋轉與三大累積獎池',
    badge: '經典電玩 • 最高賠率 1000x',
    icon: '🎰',
    overview:
      '點擊旋轉轉動滾輪，連線相同圖案即可贏取豐厚倍數獎金。特殊符號可觸發 Free Spin 狂歡模式或引爆 Grand Jackpot！',
    uiFeatures: [
      {
        title: '單線注額與線數調整',
        desc: '自由調節線注（Line Bet），支援一鍵【最大下注 (Max Bet)】與【自動旋轉 (Auto Spin)】。',
      },
      {
        title: '三大彩池進度條 (Jackpot Meters)',
        desc: '即時累計 Mini、Major、Grand 三檔黃金大獎池，每次旋轉皆有機會觸發彩金噴發。',
      },
      {
        title: '動態中獎連線高亮',
        desc: '中獎時自動以霓虹光束標示所有獲勝線與倍數計算明細。',
      },
    ],
    rules: [
      {
        title: 'Wild 萬能符號 (🃏)',
        desc: '可替代除 Scatter 外的任意一般符號，幫助組成最高倍率獲勝連線。',
      },
      {
        title: 'Scatter 免費旋轉 (💎)',
        desc: '滾輪上出現 3 個或以上 Scatter 符號時，立即啟動 10 次免費旋轉 (Free Spins)，期間所有獎金翻倍！',
      },
      {
        title: '777 與 皇冠連線',
        desc: '湊齊 5 個金色 777 或 皇冠圖案，觸發最高 500x 至 1000x 頂級超級大獎！',
      },
    ],
    payouts: [
      { betType: '5 x 至尊金冠 (Crown)', ratio: '1 : 1000', note: '最高級常規圖標' },
      { betType: '5 x 幸運 777 (Lucky 7)', ratio: '1 : 500', note: '經典狂歡大獎' },
      { betType: '5 x 金磚 (Gold Bars)', ratio: '1 : 250', note: '高倍率圖案' },
      { betType: '3 x Scatter (鑽石)', ratio: '1 : 50 + 10FS', note: '進入免費旋轉模式' },
    ],
    easterEggs: [
      { name: '維加斯霓虹拉霸手把', rarity: '史詩' },
      { name: '金燦燦的四葉草胸針', rarity: '稀有' },
    ],
    tips: [
      '保持適當注碼開啟全線下注，能確保不會錯過任何分散各線的 Wild 與大獎連線。',
      '進入 Free Spin 模式時獎金乘數大幅提高，是累積獲利的黃金時刻。',
    ],
  },

  plinko: {
    title: '金字塔彈珠台 (Plinko Casino)',
    subtitle: '10層高精度物理彈射金字塔，自由下注籌碼、邊緣極限 100x 倍率與多球連發',
    badge: '街機遊戲 • 最高倍率 100x',
    icon: '🔮',
    overview:
      '直接以籌碼點數下注投球，彈珠從頂部中心落下，與 10 層錯落銷釘進行碰撞反彈，最終落入底部的 11 個倍率槽中。越靠近兩側邊緣倍率越高，最高享有 100 倍高額返獎！',
    uiFeatures: [
      {
        title: '物理彈珠金字塔',
        desc: '兩側極限邊框倍率高達 100x，中央安全槽提供平穩回饋。',
      },
      {
        title: '自由籌碼下注 (Chip Betting)',
        desc: '支援自訂單球投注額（10、50、100、500 等籌碼面額），隨時依照策略調整注碼。',
      },
      {
        title: '單發與多球連發 (Multi-Drop)',
        desc: '支援單次點擊投球，或開啟 10x、50x 或全部連發模式，體驗多球彈射的震撼視效。',
      },
      {
        title: '歷史落點跑馬燈',
        desc: '上方即時固定高度顯示近期彈珠落入的倍率記錄，方便觀察彈道分佈。',
      },
    ],
    rules: [
      {
        title: '直接籌碼投注機制',
        desc: '每次投擲 1 顆彈珠扣除所選之籌碼投注額。彈珠落入下方槽位時，立即獲得 (下注籌碼 × 該槽倍率) 之籌碼獎金！',
      },
      {
        title: '常態分佈與邊緣極限',
        desc: '由於二項式分佈物理原理，彈珠最容易落在中央槽位，越往兩側機率越低但倍數呈幾何級數暴增。',
      },
      {
        title: '獲獎獎金計算方式',
        desc: '落入倍率大於 1.0x 即為淨獲利。落入極限兩側 100x 槽位，立即爆發百倍鉅額彩金！',
      },
    ],
    payouts: [
      { betType: '極限左右邊框槽 (Slot 0 & 10)', ratio: '100x', note: '機率最低但回報最高（百倍大獎）' },
      { betType: '次邊緣高倍槽 (Slot 1 & 9)', ratio: '7x', note: '高額翻倍彩金' },
      { betType: '中層過渡槽 (Slot 2 & 8)', ratio: '2.5x', note: '翻倍獲利區' },
      { betType: '次內層槽 (Slot 3 & 7)', ratio: '1.0x', note: '全額保本回饋' },
      { betType: '中央偏向槽 (Slot 4 & 6)', ratio: '0.5x', note: '半數保本緩衝區' },
      { betType: '正中央安全槽 (Slot 5)', ratio: '0.2x', note: '最高落點機率' },
    ],
    easterEggs: [
      { name: '失落的鍍金彈珠之王', rarity: '傳奇' },
      { name: '幸運重力金屬陀螺', rarity: '稀有' },
    ],
    tips: [
      '彈珠台邊緣具有高達 100x 的爆發力，適合搭配適當籌碼與自動連發測試手氣。',
      '落入 1.0x 以上即可保本或獲利，合理分配籌碼才能穩定累積籌碼庫存。',
    ],
  },

  siba: {
    title: '台灣經典十八仔 (Siba Dice)',
    subtitle: '古早味海碗擲骰，尋找對子算點數，豹子通殺與十八點稱王',
    badge: '傳統民俗 • 氣勢比拚',
    icon: '🎲',
    overview:
      '四顆骰子在青花瓷碗中滾動碰撞。若有兩顆點數相同（稱為「對子」），則以另外兩顆骰子的點數相加作為最終點數。',
    uiFeatures: [
      {
        title: '3D 物理碗骰投擲',
        desc: '點擊【擲骰】觸發骰子在碗內碰撞翻滾音效與動畫，實時計算點數大小。',
      },
      {
        title: '自動辨識點數判定牌',
        desc: '系統自動標示出成對骰子與計算用點數，一眼看出是否為「十八」、「豹子」或「無點」。',
      },
    ],
    rules: [
      {
        title: '基本算點規則 (對子點)',
        desc: '四顆骰子中必須有兩顆點數相同，取其餘兩顆總和為點數（例如：3、3、5、6 算 11 點；4、4、1、2 算 3 點）。',
      },
      {
        title: '十八點與逼機 (特殊點數)',
        desc: '出現兩顆相同，其餘兩顆為 6+6（共12點），加上成對稱為【十八仔】最大！其餘兩顆為 1+1（共2點）稱為【逼機 (3點)】最小。',
      },
      {
        title: '豹子 (一色 / 四喜)',
        desc: '四顆骰子點數全部相同（例如 6-6-6-6），直接視為最高等級【豹子通殺】，享有 3 倍至 5 倍高額賠率！',
      },
      {
        title: '無點 (No Point) 重擲',
        desc: '若四顆骰子點數完全不同，或出現三顆相同而另一顆不同（無法成對），判為【無點】，需重新擲骰。',
      },
    ],
    payouts: [
      { betType: '豹子 (四顆相同)', ratio: '1 : 5', note: '通殺全場最高殊榮' },
      { betType: '十八點 (對子 + 6,6)', ratio: '1 : 3', note: '常規點數之王' },
      { betType: '大點數 (9~11點)', ratio: '1 : 1.5', note: '高勝率點數' },
      { betType: '一般獲勝 (點數勝過莊家)', ratio: '1 : 1', note: '常規比大小獲勝' },
    ],
    easterEggs: [
      { name: '阿公的傳家青花瓷碗', rarity: '傳奇' },
      { name: '紅檜木雕幸運骰盅', rarity: '稀有' },
    ],
    tips: [
      '十八仔是氣勢的對決！遇到無點不要急，保持節奏往往能擲出驚喜大點。',
    ],
  },

  craps: {
    title: '美式花旗骰 (Casino Craps)',
    subtitle: '拉斯維加斯最熱血的雙骰遊戲，Pass Line、Come Out 投擲與真實倍率',
    badge: '美式經典 • 賭場氛圍之最',
    icon: '🎯',
    overview:
      '擲出兩顆六面骰。在 Come Out 階段，擲出 7 或 11 點 Pass Line 直接獲勝；擲出 2、3、12 點（Craps）則直接落敗；其餘點數確立為【目標點 (Point)】並進入後續回合。',
    uiFeatures: [
      {
        title: '清晰台面佈局',
        desc: '完整支援 Pass Line、Don\'t Pass、Come、Field、Place Bets（4, 5, 6, 8, 9, 10）下注區。',
      },
      {
        title: 'ON / OFF 狀態指示標誌 (Puck)',
        desc: '顯著標示當前局勢處於 Come Out（OFF）或目標點已確立（ON）狀態。',
      },
    ],
    rules: [
      {
        title: 'Come Out 擲骰階段 (第一回合)',
        desc: '• 擲出 7 或 11：Pass Line 贏（Natural）\n• 擲出 2、3、12：Pass Line 輸（Craps）\n• 擲出 4、5、6、8、9、10：該點數成為目標點 (Point)，Puck 翻為 ON。',
      },
      {
        title: 'Point 確立階段 (後續回合)',
        desc: '繼續擲骰：若在擲出 7 之前再次擲出目標點 (Point)，Pass Line 獲勝！若先擲出 7 點（Seven Out），則該輪結束並重新開始。',
      },
    ],
    payouts: [
      { betType: 'Pass Line (過線注)', ratio: '1 : 1', note: 'Come Out 7/11 或先中 Point' },
      { betType: 'Don\'t Pass (不過線注)', ratio: '1 : 1', note: '反向押注 7 先開出 (12平手)' },
      { betType: 'Field 注 (2, 3, 4, 9, 10, 11, 12)', ratio: '1 : 1 ~ 3:1', note: '單回合快速判定 (2,12雙倍)' },
      { betType: 'Place 6 & 8', ratio: '7 : 6', note: '熱門高勝率下注選項' },
    ],
    easterEggs: [
      { name: '維加斯VIP象牙骰子', rarity: '史詩' },
    ],
    tips: [
      'Pass Line 搭配 Free Odds（免佣賠率）是整個賭場最受老手推崇的公平玩法之一。',
    ],
  },

  claw: {
    title: '大稻幸運夾娃娃機 (Casino Claw Machine)',
    subtitle: '真實物理夾爪擺盪模擬，抓取各面額兌幣券與神祕金蛋，考驗眼力與手感',
    badge: '技巧街機 • 100% 物理反饋',
    icon: '🕹️',
    overview:
      '操控搖桿調整夾爪 X/Y 軸水平位置，鎖定心儀的兌換券或禮盒後點擊下爪。抓取成功送入出物口即可直接兌換高額籌碼！',
    uiFeatures: [
      {
        title: '八向虛擬搖桿與精準微調',
        desc: '直覺拖曳搖桿移動夾爪吊車，具備邊界限制與平滑阻尼。',
      },
      {
        title: '一鍵下爪 (Drop Claw)',
        desc: '啟動機械爪垂直下降，到達底部後自動緊閉夾取並升起回航。',
      },
      {
        title: '爪力指示與即時兌換結算',
        desc: '抓到的獎券即時顯示面額並自動換算為賭場籌碼計入餘額。',
      },
    ],
    rules: [
      {
        title: '夾爪抓力與重心判定',
        desc: '夾爪閉合時會檢測物體幾何形狀與重心。精準覆蓋目標物中心部位能大幅提升抓取成功率。',
      },
      {
        title: '獎項面額級別',
        desc: '• 綠色青銅券：價值 50 ~ 100 點籌碼\n• 藍色白銀券：價值 200 ~ 400 點籌碼\n• 金色黃金券：價值 500 ~ 1,000 點籌碼\n• 紫色夜行至尊盒：價值 2,000 點籌碼 + 稀有道具！',
      },
    ],
    payouts: [
      { betType: '夜行至尊禮盒', ratio: '高達 2,000 點', note: '抓力要求最高' },
      { betType: '特選黃金券', ratio: '高達 1,000 點', note: '高面額籌碼券' },
      { betType: '精選白銀券', ratio: '高達 400 點', note: '超值籌碼' },
      { betType: '入門青銅券', ratio: '高達 100 點', note: '新手練習必抓' },
    ],
    easterEggs: [
      { name: '鍍金機械抓夾模型', rarity: '史詩' },
    ],
    tips: [
      '先從堆疊在頂層、未被其他物體壓住的獎券下手，抓力負擔最小、成功率最高！',
    ],
  },

  pinball: {
    title: '夜市打彈珠 (Night Market Pinball)',
    subtitle: '古早味木質弧軌釘板彈珠台，真實重力拱頂脫軌碰撞，中盤 0x 落球孔與底部 8 大獎槽',
    badge: '懷舊童玩 • 順利到底必有獎',
    icon: '🔴',
    overview:
      '購買彈珠套餐（與彈珠台庫存共用），長按發射鈕拉開彈簧蓄力。鋼珠沿右側專用通道射出，順著真實木製弧形軌道（拱頂）滾動，並於最高處自然脫軌墜入銅釘排陣！避開中盤 3 個 0x 槓龜落球孔，只要鋼珠順利抵達底部任一獎槽（50、30、20、10 分）皆有獎金！',
    uiFeatures: [
      {
        title: '真實木製弧形軌道與拱頂落球',
        desc: '鋼珠沿右側垂直木軌射出後順弧滑行，蓄力約 55% 可直衝拱頂最高處自然脫軌跌入中路排釘，重現夜市手感。',
      },
      {
        title: '放慢蓄力與醒目力道百分比儀表',
        desc: '蓄力速度適度放慢便於微調，搭配多段色階進度條、大型數值與四組直覺預設力道（35%、55%、75%、98%）。',
      },
      {
        title: '防連發連擊鎖定機制',
        desc: '具備發射狀態鎖定與防誤觸機制，杜絕一次擊出兩顆彈珠的異常問題。',
      },
      {
        title: '共用彈珠庫存與優惠套餐',
        desc: '與彈珠台共享鋼珠庫存，每顆鋼珠基本面額 $50 籌碼，隨買即打。',
      },
    ],
    rules: [
      {
        title: '中盤 0x 落球孔（槓龜陷阱）',
        desc: '盤面中段設有 3 個木製落球孔，鋼珠若不慎掉入將直接落入底層（0x，無籌碼返還）。',
      },
      {
        title: '底部 8 大得分槽（順利到底必有獎）',
        desc: '只要鋼珠成功避開落球孔抵達底部，8 個槽位（50、30、20、10、10、20、30、50 分）全面保證派彩！',
      },
      {
        title: '數學期望值（RTP）校準',
        desc: '整體數學期望值嚴格校準於 97.6%（介於 97%~98% 之間），提供公平且兼具博弈刺激感的古早味體驗。',
      },
    ],
    payouts: [
      { betType: '邊緣狂歡槽 (50分)', ratio: '3.2x', note: '獎金 $160 (最高大獎)' },
      { betType: '外圍高分槽 (30分)', ratio: '2.0x', note: '獎金 $100 翻倍' },
      { betType: '次優獎勵槽 (20分)', ratio: '1.4x', note: '獎金 $70 獲利' },
      { betType: '中路保底槽 (10分)', ratio: '0.9x', note: '獎金 $45 返還' },
      { betType: '中盤落球孔 (0x)', ratio: '0x', note: '槓龜無獎金' },
    ],
    easterEggs: [
      { name: '夜市彈珠汽水瓶蓋', rarity: '普通' },
    ],
    tips: [
      '蓄力控制在 55% 左右能將鋼珠送至拱頂最高峰並從中路垂直落下；避開中段落球孔，順利到到底部即可穩穩收下籌碼！',
    ],
  },
};

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGameId?: GameTableId;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  defaultGameId = 'roulette',
}) => {
  const [selectedGame, setSelectedGame] = useState<GameTableId>(defaultGameId);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'payouts' | 'easterEggs'>('overview');

  // Keep selectedGame synchronized when prop changes
  React.useEffect(() => {
    if (defaultGameId) {
      setSelectedGame(defaultGameId);
    }
  }, [defaultGameId]);

  // ESC key listener for instant close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const data = GAME_RULES_DATA[selectedGame] || GAME_RULES_DATA.roulette;

  const gameOptions: { id: GameTableId; name: string; icon: string }[] = [
    { id: 'roulette', name: '歐式輪盤', icon: '🎡' },
    { id: 'slot', name: '老虎機', icon: '🎰' },
    { id: 'blackjack', name: '二十一點', icon: '♠️' },
    { id: 'poker', name: '德州撲克', icon: '🃏' },
    { id: 'siba', name: '十八仔', icon: '🎲' },
    { id: 'craps', name: '花旗骰', icon: '🎯' },
    { id: 'pinball', name: '打彈珠', icon: '🔴' },
    { id: 'plinko', name: '彈珠台', icon: '🎯' },
    { id: 'claw', name: '夾娃娃機', icon: '🕹️' },
  ];

  return createPortal(
    <div
      id="game-rules-modal-overlay"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.playClick();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-[#141824] via-[#0f121d] to-[#090b12] border-2 border-amber-400/80 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_30px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden text-stone-100 animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800/80 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner">
              {data.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-amber-300 tracking-wide">
                  {data.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 font-mono text-[11px] font-bold">
                  {data.badge}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">{data.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-game-rules"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Selector Tab Bar (Quick jump between tables) */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border-b border-stone-800/60 overflow-x-auto custom-scrollbar shrink-0">
          {gameOptions.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedGame(g.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-800'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-stone-800/40 bg-stone-950/30 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('overview');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>頁面功能導覽</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('rules');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>規則與判定</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('payouts');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>賠率表一覽</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('easterEggs');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'easterEggs'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>專屬隱藏道具</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* TAB 1: OVERVIEW & UI FEATURES */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* General Summary Card */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs sm:text-sm leading-relaxed">
                <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>玩法總覽</span>
                </div>
                {data.overview}
              </div>

              {/* UI Controls Guide */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>當前頁面主要控制與視圖功能</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.uiFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col gap-1 shadow-sm"
                    >
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {feat.title}
                      </span>
                      <p className="text-xs text-stone-400 leading-relaxed mt-0.5">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tips Box */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 text-xs text-blue-200 space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>職業老手實戰技巧</span>
                </div>
                {data.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-stone-300">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {data.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col gap-1.5 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-mono">
                      {idx + 1}
                    </span>
                    <span>{rule.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pl-7 whitespace-pre-line">
                    {rule.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-stone-800 overflow-hidden bg-stone-950/80">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-800">
                    <tr>
                      <th className="p-3">下注類型 / 牌型</th>
                      <th className="p-3 text-amber-400 font-mono">賠率 (Payout)</th>
                      <th className="p-3 text-stone-400">達成條件說明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {data.payouts.map((pay, idx) => (
                      <tr key={idx} className="hover:bg-stone-900/50 transition-colors">
                        <td className="p-3 font-bold text-stone-200">{pay.betType}</td>
                        <td className="p-3 font-mono font-black text-amber-300 text-sm">
                          {pay.ratio}
                        </td>
                        <td className="p-3 text-stone-400 text-xs">{pay.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EASTER EGGS & COLLECTIBLES */}
          {activeTab === 'easterEggs' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-xs text-purple-200 leading-relaxed">
                <span>
                  在賭桌進行遊戲時，荷官與幸運女神隨時可能驚喜贈予專屬紀念珍寶！收集到的各類珍寶可在【大廳黑市】向特約貴賓與商人高價出讓兌換海量籌碼！
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.easterEggs.map((egg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/20 via-stone-900 to-stone-950 border border-purple-500/40 flex flex-col justify-between gap-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        【{egg.name}】
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          egg.rarity === '傳奇'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-400/60'
                        }`}
                      >
                        {egg.rarity}珍品
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/60">
                      <span>本桌專屬稀有珍寶</span>
                      <span className="text-amber-300/90 font-mono">大廳黑市特約收購</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800/80 bg-stone-950/90 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-1.5 text-amber-400/80">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>提示：隨時可在頂部導覽列點擊【說明】按鈕查看各桌詳細攻略。</span>
          </div>
          <button
            type="button"
            id="btn-understand-rules"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs shadow-lg active:scale-95 cursor-pointer transition-all"
          >
            我瞭解了
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
