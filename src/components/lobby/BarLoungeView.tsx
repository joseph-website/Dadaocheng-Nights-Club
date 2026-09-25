import React, { useState, useEffect, useCallback } from 'react';
import { BlackMarketNPC, CollectibleItem } from '../../types/inventory';
import {
  CocktailItem,
  SIGNATURE_COCKTAIL,
  getRandomClassicCocktails,
  getRandomItemClue,
  getRandomGamblingTip,
  getDiscoveredClueIds,
  BARTENDER_IDLE_QUOTES,
} from '../../utils/barData';
import { getAuraRemainingTime, addAuraDuration } from '../../utils/aura';
import {
  getPlayerCollectibles,
  ALL_COLLECTIBLES,
  unlockHiddenCollectible,
  getPlayerLuckyCharms,
  consumePlayerLuckyCharms,
} from '../../utils/inventory';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import {
  Wine,
  Sparkles,
  RefreshCw,
  Gift,
  HelpCircle,
  MessageSquare,
  Flame,
  Award,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Info,
  CheckCircle2,
  X,
  Coins,
} from 'lucide-react';

interface BarLoungeViewProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  activeNPCs: BlackMarketNPC[];
  onSelectGame?: (
    game: 'roulette' | 'slot' | 'plinko' | 'blackjack' | 'poker' | 'siba' | 'craps' | 'claw'
  ) => void;
}

export const BarLoungeView: React.FC<BarLoungeViewProps> = ({
  balance,
  onUpdateBalance,
  activeNPCs,
  onSelectGame,
}) => {
  // Current active cocktails menu (3~5 classics + 1 signature)
  const [classics, setClassics] = useState<CocktailItem[]>(() => getRandomClassicCocktails());
  const [signature] = useState<CocktailItem>(SIGNATURE_COCKTAIL);

  // Bartender dialogue & emotion state
  const [bartenderSpeech, setBartenderSpeech] = useState<string>(
    '「歡迎光臨夜行吧台。我是老查理。今晚想喝點什麼？高價調酒有時能探聽到意想不到的珍寶情報，或者花 $300 請廊道上的貴賓喝一杯，結個善緣。」'
  );
  const [isPouring, setIsPouring] = useState<boolean>(false);

  // Toast Aura state in seconds
  const [auraSeconds, setAuraSeconds] = useState<number>(getAuraRemainingTime);

  // Active clue reveal popup
  const [revealedClue, setRevealedClue] = useState<{
    item: CollectibleItem;
    clueText: string;
    source: 'cocktail' | 'npc';
    isSignatureRefund?: boolean;
  } | null>(null);

  // Active gambling tip popup
  const [revealedTip, setRevealedTip] = useState<{
    npcName: string;
    tipText: string;
  } | null>(null);

  // Clues notebook drawer/modal
  const [showClueNotebook, setShowClueNotebook] = useState<boolean>(false);
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>(getDiscoveredClueIds);

  // Aura info modal
  const [showAuraInfo, setShowAuraInfo] = useState<boolean>(false);

  // Lucky Charm Exchange state
  const [luckyCharms, setLuckyCharms] = useState<number>(() => getPlayerLuckyCharms());

  // Keep lucky charms in sync
  useEffect(() => {
    const handleSync = () => setLuckyCharms(getPlayerLuckyCharms());
    window.addEventListener('casino_inventory_changed', handleSync);
    return () => window.removeEventListener('casino_inventory_changed', handleSync);
  }, []);

  // Sync Aura timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setAuraSeconds(getAuraRemainingTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to global aura update events
  useEffect(() => {
    const handleAuraChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ remaining: number }>;
      if (customEvent.detail?.remaining !== undefined) {
        setAuraSeconds(customEvent.detail.remaining);
      }
    };
    window.addEventListener('casino_aura_updated', handleAuraChange);
    return () => window.removeEventListener('casino_aura_updated', handleAuraChange);
  }, []);

  // Refresh classic cocktails list
  const handleRefreshMenu = useCallback(() => {
    sound.playClick();
    setClassics(getRandomClassicCocktails());
    toastService.info('酒保老查理已更換今日私房經典酒單！');
  }, []);

  // Player orders a cocktail to drink
  const handleOrderCocktail = (cocktail: CocktailItem) => {
    if (isPouring) return;

    if (balance < cocktail.price) {
      sound.playLoss();
      toastService.warn(`籌碼不足！點購【${cocktail.name}】需要 $${cocktail.price.toLocaleString()} 籌碼。`);
      return;
    }

    sound.playChip();
    setIsPouring(true);

    // Initial deduction
    const balanceAfterPay = balance - cocktail.price;
    onUpdateBalance(balanceAfterPay);

    setBartenderSpeech(`「好品味！一杯【${cocktail.name}】，冰塊手工精切中……請稍候。」`);

    setTimeout(() => {
      setIsPouring(false);
      sound.playWin();

      // Determine clue hit by percentage
      const roll = Math.random() * 100;
      const hitClue = roll < cocktail.clueChance;

      // Track drink count for Lobby collectibles (Reasonable threshold: 5 drinks for token, 3 signature + clue for ice stone)
      try {
        const drinks = Number(localStorage.getItem('casino_bar_drink_count') || '0') + 1;
        localStorage.setItem('casino_bar_drink_count', String(drinks));
        if (drinks >= 5) {
          unlockHiddenCollectible('col-lobby-token');
        }

        if (cocktail.isSignature) {
          const sigDrinks = Number(localStorage.getItem('casino_bar_sig_drink_count') || '0') + 1;
          localStorage.setItem('casino_bar_sig_drink_count', String(sigDrinks));
          if (sigDrinks >= 3 && hitClue) {
            unlockHiddenCollectible('col-lobby-cocktail');
          }
        }
      } catch {
        // ignore
      }

      if (hitClue) {
        // Player hit an item clue!
        const playerItems = getPlayerCollectibles().map((c) => c.id);
        const clue = getRandomItemClue(playerItems);
        setDiscoveredClueIds(getDiscoveredClueIds());

        sound.playBigWin();
        setBartenderSpeech(
          `「（壓低聲音）客人，剛才擦杯子時我聽見隔壁桌的小道消息……這條關於【${clue.item.name}】的情報您可收好了！」`
        );
        setRevealedClue({
          item: clue.item,
          clueText: clue.clueText,
          source: 'cocktail',
        });
        toastService.success(`🍸 品嚐【${cocktail.name}】時探聽到了珍寶情報！`);
      } else {
        // Did not hit clue
        if (cocktail.isSignature) {
          // Signature Cocktail guarantee apology refund of 500 chips!
          const refundAmount = 500;
          const finalBalance = balanceAfterPay + refundAmount;
          onUpdateBalance(finalBalance);

          sound.playChip();
          setBartenderSpeech(
            `「抱歉客官，今晚這杯【夜行極光特調】沒能替您探聽到動靜……這 $500 籌碼您收著當作酒水折讓，老查理絕不讓熟客吃虧！」`
          );
          toastService.info(`🍸 特調未探得線索，老查理致歉並退還 $${refundAmount} 點籌碼！`);
        } else {
          // Classic cocktail normal sip
          const quotes = [
            `「一口入魂！這杯【${cocktail.name}】口感醇厚，可惜今晚酒客們嘴巴都很緊，沒探到特別動靜。」`,
            `「甘醇微苦，正是放鬆身心的佳品！雖然沒打聽到黑市風聲，但心情暢快無比！」`,
            `「好酒！酒精在血管中燃燒，感覺下把賭局手氣要來了！」`,
          ];
          setBartenderSpeech(quotes[Math.floor(Math.random() * quotes.length)]);
          toastService.success(`享受了一杯美味的【${cocktail.name}】！`);
        }
      }
    }, 1100);
  };

  // Treat an active VIP NPC to a drink at the Bar (Fixed $300)
  const handleTreatVIPAtBar = (npc: BlackMarketNPC) => {
    if (isPouring) return;
    const TREAT_PRICE = 300;

    if (balance < TREAT_PRICE) {
      sound.playLoss();
      toastService.warn(`籌碼不足！請【${npc.name}】喝一杯需要 $${TREAT_PRICE} 籌碼。`);
      return;
    }

    sound.playChip();
    setIsPouring(true);
    onUpdateBalance(balance - TREAT_PRICE);

    // Grant Toast Aura (+90 seconds)
    const newAura = addAuraDuration(90);
    setAuraSeconds(newAura);

    setBartenderSpeech(`「好的，正在為廊道貴賓【${npc.name}】送上招牌威士忌……」`);

    setTimeout(() => {
      setIsPouring(false);
      sound.playWin();

      // Track treat count for Lobby collectible (Threshold: 5 treats)
      try {
        const treats = Number(localStorage.getItem('casino_bar_treat_count') || '0') + 1;
        localStorage.setItem('casino_bar_treat_count', String(treats));
        if (treats >= 5) {
          unlockHiddenCollectible('col-lobby-treat');
        }
      } catch {
        // ignore
      }

      // Roll rewards:
      // 5% -> Item clue
      // 15% -> Gambling tactical tip (game intel)
      // 80% -> Casual friendly chat
      const roll = Math.random() * 100;

      if (roll < 5) {
        // 5% Item Clue
        const playerItems = getPlayerCollectibles().map((c) => c.id);
        const clue = getRandomItemClue(playerItems);
        setDiscoveredClueIds(getDiscoveredClueIds());

        sound.playBigWin();
        const speech = `「【${npc.name}】面露欣喜，與你痛飲一杯後附耳說道：『好兄弟！既然你這麼夠意思，我就透露一件天大的秘密給你——${clue.clueText}』」`;
        setBartenderSpeech(speech);
        setRevealedClue({
          item: clue.item,
          clueText: clue.clueText,
          source: 'npc',
        });
        toastService.success(`🎉 【${npc.name}】酒後吐真言！透露了絕密道具線索！同時獲得敬酒光環 (+90s)！`);
      } else if (roll < 20) {
        // 15% Gambling Tactical Tip
        const tip = getRandomGamblingTip();
        sound.playWin();
        const speech = `「【${npc.name}】微醺地拍了拍你的肩膀：『好酒！兄弟，看你順眼，我教你一手我在賭桌混跡多年的實戰心法：${tip}』」`;
        setBartenderSpeech(speech);
        setRevealedTip({
          npcName: npc.name,
          tipText: tip,
        });
        toastService.success(`💡 【${npc.name}】傳授了獨門賭博實戰心法！同時獲得敬酒光環 (+90s)！`);
      } else {
        // 80% Casual banter
        const banterPool = [
          `「【${npc.name}】爽朗大笑，舉起酒杯一飲而盡：『痛快！今天這杯酒我記下了，下把賭桌見，祝你大贏特贏！』」`,
          `「【${npc.name}】向你微笑致意：『好酒！大稻賭埕裡就屬你最識大體，這份人情我心領了！』」`,
          `「【${npc.name}】碰杯道：『乾了！有你這杯美酒相伴，今晚在黑市逛得更舒坦了！』」`,
        ];
        const speech = banterPool[Math.floor(Math.random() * banterPool.length)];
        setBartenderSpeech(speech);
        toastService.success(`已請【${npc.name}】喝一杯！獲得 90 秒敬酒幸運光環！`);
      }
    }, 1000);
  };

  // Bartender casual chat
  const handleChatWithBartender = () => {
    sound.playClick();
    const quote = BARTENDER_IDLE_QUOTES[Math.floor(Math.random() * BARTENDER_IDLE_QUOTES.length)];
    setBartenderSpeech(quote);
  };

  // Redeem Lucky Charm from Claw Machine: Mysterious Surprise (FREE Signature Cocktail with 50% Clue chance, no refund)
  const handleExchangeCharm = () => {
    if (isPouring) return;
    if (luckyCharms <= 0) {
      sound.playLoss();
      toastService.warn('背包內尚未持有【夜行幸運符】！請自行前往夾娃娃機挑戰夾取。');
      return;
    }

    const success = consumePlayerLuckyCharms(1);
    if (!success) {
      sound.playLoss();
      toastService.error('幸運符扣除失敗，請重新嘗試！');
      return;
    }

    setLuckyCharms(getPlayerLuckyCharms());
    sound.playChip();
    setIsPouring(true);

    // Grant Signature Toast Aura (+300 seconds)
    const newAura = addAuraDuration(300);
    setAuraSeconds(newAura);

    setBartenderSpeech(
      `「（接過幸運符，眼神閃過一抹深意）……這枚夜行幸運符！今晚為你破例調製一杯特別的，看看命運會為你揭曉什麼驚喜。」`
    );

    setTimeout(() => {
      setIsPouring(false);

      // Clue calculation with heightened 50% chance for Lucky Charm!
      const hitClue = Math.random() < 0.50;

      // Track signature count for achievement
      try {
        const count = Number(localStorage.getItem('casino_bar_signature_count') || '0') + 1;
        localStorage.setItem('casino_bar_signature_count', String(count));
      } catch {
        // ignore
      }

      if (hitClue) {
        // Player hit an item clue!
        const playerItems = getPlayerCollectibles().map((c) => c.id);
        const clue = getRandomItemClue(playerItems);
        setDiscoveredClueIds(getDiscoveredClueIds());

        sound.playBigWin();
        setBartenderSpeech(
          `「（壓低聲音）看來幸運之神今晚站在你這邊……隔壁桌剛傳來關於【${clue.item.name}】的黑市情報，收好了！」`
        );
        setRevealedClue({
          item: clue.item,
          clueText: clue.clueText,
          source: 'cocktail',
        });
        toastService.success(`🪬 神秘驚喜揭曉！觸發老查理特調並探聽到了珍寶情報！`);
      } else {
        // Did not hit clue
        sound.playClick();
        setBartenderSpeech(
          `「酒意正濃，但今晚吧台並未傳出風聲……這杯特調的加持光環已融入體內，去試試手氣吧。」`
        );
        toastService.info(`🪬 神秘驚喜揭曉！獲得老查理特調與好運光環加持。`);
      }
    }, 1100);
  };

  // Discovered items count
  const allCollectiblesList = ALL_COLLECTIBLES;
  const discoveredItems = allCollectiblesList.filter((c) => discoveredClueIds.includes(c.id));

  return (
    <div id="lobby-bar-lounge" className="w-full h-full flex flex-col gap-3 overflow-hidden select-none">
      {/* 1. TOP STATUS BAR: Bartender Showcase & Toast Aura Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-stone-950 via-[#181116] to-stone-950 border border-amber-500/30 shadow-lg shrink-0">
        {/* Bartender Avatar & Speech */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[65%]">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-stone-900 to-amber-700 p-0.5 shadow shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center text-xl">
              🍸
            </div>
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] border border-stone-950 shadow">
              酒保
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-amber-200">
                夜行首席調酒師・老查理
              </span>
              <button
                type="button"
                onClick={handleChatWithBartender}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[10px] font-bold border border-stone-700 transition flex items-center gap-1 cursor-pointer"
                title="與老查理隨性閒聊"
              >
                <MessageSquare className="w-2.5 h-2.5 text-amber-400" />
                <span>閒聊打聽</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-300 italic truncate mt-0.5 font-sans">
              {bartenderSpeech}
            </p>
          </div>
        </div>

        {/* Right Action Widgets: Lucky Charms Badge + Clues Notebook + Toast Aura Badge */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Lucky Charm Badge */}
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
              luckyCharms > 0
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-stone-900/80 border-stone-800 text-stone-400'
            }`}
          >
            <span className="text-sm">🪬</span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[9px] uppercase font-bold text-stone-400">夜行幸運符</span>
              <span className="font-mono text-[11px] font-black text-amber-300">
                {luckyCharms > 0 ? `${luckyCharms} 枚` : '0 枚'}
              </span>
            </div>
          </div>

          {/* Toast Aura Badge */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowAuraInfo(true);
            }}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
              auraSeconds > 0
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse'
                : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
            title="查看敬酒幸運光環功能詳情"
          >
            <div className="relative">
              <Wine className={`w-3.5 h-3.5 ${auraSeconds > 0 ? 'text-amber-400' : 'text-stone-500'}`} />
              {auraSeconds > 0 && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[9px] uppercase font-bold text-stone-400">幸運光環</span>
              <span className="font-mono text-[11px] font-black text-amber-300">
                {auraSeconds > 0 ? `${auraSeconds}s` : '未啟動'}
              </span>
            </div>
            <Info className="w-3 h-3 text-stone-500 hover:text-stone-300 ml-0.5" />
          </button>

          {/* Clues Notebook Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setDiscoveredClueIds(getDiscoveredClueIds());
              setShowClueNotebook(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 font-bold text-xs transition cursor-pointer flex items-center gap-1"
            title="查看所有打聽到的道具線索"
          >
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>情報冊 ({discoveredItems.length})</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT STAGE: 2 Columns (Left: Cocktail Menu, Right: Treat VIPs Lounge) */}
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: BARTENDER'S MENU (CLASSICS & SIGNATURE) */}
        {/* ========================================================================= */}
        <div className="flex-1 h-full rounded-2xl bg-[#0e1017] border border-amber-500/20 shadow-xl p-3.5 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-sm text-stone-100 flex items-center gap-2">
                <span>老查理私房酒單 (今日特選)</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRefreshMenu}
              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="隨機更換今日經典調酒款式"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>換一批經典款</span>
            </button>
          </div>

          {/* Cocktails Scrollable List */}
          <div className="flex-1 overflow-y-auto pr-1 my-2 flex flex-col gap-2.5 custom-scrollbar">
            
            {/* --- 0. LUCKY CHARM SPECIAL EXCHANGE (MYSTERIOUS SURPRISE) --- */}
            <div className="relative p-2.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-[#1c121e] to-stone-950 border border-amber-500/70 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-purple-600 to-amber-700 p-0.5 shadow shrink-0 flex items-center justify-center text-2xl">
                  <div className="w-full h-full bg-stone-950 rounded-[9px] flex items-center justify-center">
                    🪬
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-amber-200">老查理的神秘驚喜</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40">
                      需夜行幸運符
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black border border-purple-500/40">
                      神秘驚喜加持
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                      luckyCharms > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}>
                      持有: {luckyCharms} 枚
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5 leading-snug font-sans">
                    奉上幸運符換取酒保特調，觸發專屬光環與命運際遇。
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 sm:self-center">
                {luckyCharms > 0 ? (
                  <button
                    type="button"
                    disabled={isPouring}
                    onClick={() => handleExchangeCharm()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-stone-950 font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.35)] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                    <span>奉上幸運符 (神秘驚喜)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={true}
                    aria-disabled="true"
                    className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-800 text-stone-500 font-bold text-xs flex items-center gap-1 cursor-not-allowed opacity-60 select-none"
                    title="暫無幸運符，請自行至夾娃娃機夾取（不提供快速傳送）"
                  >
                    <span>🕹️ 前往夾娃娃機夾取幸運符</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-400 font-mono">
                      請自行前往
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* --- 1. SIGNATURE COCKTAIL (OLD CHARLIE'S SPECIAL) --- */}
            <div className="relative p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-stone-950 border border-amber-400/50 shadow hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-purple-700 p-0.5 shadow shrink-0 flex items-center justify-center text-2xl">
                  <div className="w-full h-full bg-stone-950 rounded-[9px] flex items-center justify-center">
                    {signature.icon}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-amber-200">{signature.name}</span>
                    <span className="text-[10px] font-bold text-stone-400">{signature.enName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40">
                      鎮店特調
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black border border-purple-500/40">
                      🎯 密訊情報
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5 line-clamp-1 font-sans">
                    {signature.description}
                  </p>
                </div>
              </div>

              {/* Order Button */}
              <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 shrink-0">
                <div className="text-right leading-none">
                  <span className="text-[9px] text-stone-400">品嚐定價</span>
                  <div className="font-mono text-sm font-black text-amber-300">
                    ${signature.price.toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPouring || balance < signature.price}
                  onClick={() => handleOrderCocktail(signature)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow flex items-center gap-1.5 ${
                    balance >= signature.price
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 hover:scale-102 active:scale-98'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  <Wine className="w-3.5 h-3.5" />
                  <span>品嚐特調</span>
                </button>
              </div>
            </div>

            {/* --- 2. CLASSIC COCKTAILS (3~5 ITEMS, $100 ~ $1,000) --- */}
            <div className="text-[11px] font-bold text-stone-400 mt-0.5 px-1 flex items-center justify-between">
              <span>經典調酒系列</span>
              <span className="text-[10px] text-stone-500 font-mono">共 {classics.length} 款隨選</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {classics.map((cocktail) => {
                const canAfford = balance >= cocktail.price;
                return (
                  <div
                    key={cocktail.id}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-950/80 border border-stone-800 hover:border-stone-700 transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-lg shrink-0">
                        {cocktail.icon}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-stone-200">{cocktail.name}</span>
                          <span className="text-[9px] text-stone-500">{cocktail.enName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300/90 text-[9px] font-bold border border-amber-500/20">
                            風聲打聽
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 truncate">
                          {cocktail.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-mono text-xs font-black text-amber-300 text-right">
                        ${cocktail.price}
                      </div>
                      <button
                        type="button"
                        disabled={isPouring || !canAfford}
                        onClick={() => handleOrderCocktail(cocktail)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          canAfford
                            ? 'bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700 hover:border-amber-400'
                            : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                        }`}
                      >
                        <span>點酒</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Note */}
          <div className="border-t border-stone-800 pt-1.5 shrink-0 flex items-center justify-between text-[10px] text-stone-500">
            <span>※ 調酒僅供店內品嚐，酒保會暗中打聽黑市情報。</span>
            <span className="font-mono text-stone-400">持有籌碼: ${balance.toLocaleString()}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: TREAT VIP GUESTS AT THE BAR (FIXED $300) */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[40%] h-full rounded-2xl bg-[#0e1017] border border-amber-500/20 shadow-xl p-3 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          {/* Treat VIP Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-400" />
              <div>
                <h3 className="font-black text-xs sm:text-sm text-stone-100 flex items-center gap-2">
                  <span>吧台請客名單 (現正貴賓)</span>
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px] font-black border border-rose-500/30">
              固定 $300 / 杯
            </span>
          </div>

          {/* Reward Rates Infobar - Polished atmospheric guide */}
          <div className="my-1.5 p-1.5 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-around text-center text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🍸</span>
              <span className="text-[10px] text-stone-300">必得好運光環加持</span>
            </div>
            <div className="w-px h-4 bg-stone-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎲</span>
              <span className="text-[10px] text-amber-300/90">貴賓交流有機會探得黑市線索與心得</span>
            </div>
          </div>

          {/* VIPs List */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
            {activeNPCs.map((npc) => {
              const canAfford = balance >= 300;
              return (
                <div
                  key={npc.id}
                  className="p-2 rounded-lg bg-stone-950/90 border border-stone-800/80 hover:border-amber-500/40 transition flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-stone-900 to-purple-900 p-0.5 shadow flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full bg-stone-950 rounded-[7px] flex items-center justify-center">
                        {npc.avatar}
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-amber-200 truncate">{npc.name}</span>
                        <span className="text-[9px] text-stone-400 truncate">{npc.title}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 truncate">
                        {npc.personality}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPouring || !canAfford}
                    onClick={() => handleTreatVIPAtBar(npc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow ${
                      canAfford
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white active:scale-98'
                        : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                    }`}
                  >
                    <Wine className="w-3 h-3" />
                    <span>請客 ($300)</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Explanation: General Table Treat vs Bar Treat */}
          <div className="border-t border-stone-800 pt-1.5 shrink-0 flex items-center justify-between text-[10px] text-stone-500">
            <span>💡 賭桌請客 $100 獲敬酒光環；酒吧請客 $300 享線索/心得。</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP 1: REVEALED ITEM CLUE MODAL */}
      {/* ========================================================================= */}
      {revealedClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] p-5 flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setRevealedClue(null);
              }}
              className="absolute top-3 right-3 p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-purple-800 p-0.5 shadow-2xl flex items-center justify-center text-4xl mb-3">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center">
                {revealedClue.item.icon}
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black mb-1">
              ✨ 探聽到稀有道具情報！
            </span>

            <h4 className="text-lg font-black text-amber-100">
              【{revealedClue.item.name}】
            </h4>
            <span className="text-xs text-stone-400">
              出沒賭桌：{revealedClue.item.gameName} · 稀有度：{revealedClue.item.rarity.toUpperCase()}
            </span>

            <div className="w-full p-3.5 my-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 leading-relaxed font-sans text-left">
              {revealedClue.clueText}
            </div>

            <p className="text-[11px] text-stone-400 mb-4">
              此線索已永久收錄至您的「線索情報冊」，隨時可在大廳查閱！
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRevealedClue(null);
                  if (onSelectGame) {
                    onSelectGame(revealedClue.item.gameId as any);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition shadow cursor-pointer"
              >
                前往【{revealedClue.item.gameName}】挑戰
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRevealedClue(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition cursor-pointer"
              >
                留在酒吧
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 2: REVEALED GAMBLING TIP MODAL */}
      {/* ========================================================================= */}
      {revealedTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] p-5 flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setRevealedTip(null);
              }}
              className="absolute top-3 right-3 p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-3xl flex items-center justify-center mb-3">
              💡
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-black mb-1">
              貴賓實戰心得傳授
            </span>

            <h4 className="text-base font-black text-blue-100">
              來自【{revealedTip.npcName}】的獨門心法
            </h4>

            <div className="w-full p-4 my-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 leading-relaxed font-sans text-left">
              {revealedTip.tipText}
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setRevealedTip(null);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition shadow cursor-pointer"
            >
              銘記心法，謝過貴賓
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 3: AURA INFO EXPLAINER MODAL */}
      {/* ========================================================================= */}
      {showAuraInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/50 shadow-2xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Wine className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-stone-100">
                  敬酒幸運光環 (Toast Aura) 功能說明
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuraInfo(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-stone-300 leading-relaxed font-sans">
              <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-start gap-3">
                <div className="text-xl">🎰</div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-0.5">1. 莊家幸運加碼 (House Bonus)</h4>
                  <p className="text-stone-400">
                    在敬酒幸運光環加持期間內於賭桌獲勝時，莊家有機會慷慨加碼賞金！若當局下注氣魄驚人，更能贏得莊家由衷敬佩的頂額彩金。
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    ※ 提醒：黑市珍品蒐藏品之取得條件維持原樣，必須滿足各賭桌專屬之隱藏解鎖規則。
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-start gap-3">
                <div className="text-xl">👑</div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-0.5">2. VIP 貴賓喝采與全場光輝氣場</h4>
                  <p className="text-stone-400">
                    賭桌旁邊的黑市 VIP 貴賓會對您的發揮更加關注，積極為您的神手歡呼喝采；頂欄與頭像浮現專屬金色流動氣場，沉浸感大幅倍增。
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-start gap-3">
                <div className="text-xl">⏳</div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-0.5">3. 時間持續疊加累積機制</h4>
                  <p className="text-stone-400">
                    在酒吧請客每次增加 <strong>+90 秒</strong>，在賭桌請客每次增加 <strong>+60 秒</strong>。光環時間可跨賭桌通用並向上疊加，上限最高可累積至 300 秒（5 分鐘）！
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
              <span className="font-mono text-xs text-amber-300">
                目前光環剩餘：{auraSeconds > 0 ? `${auraSeconds} 秒` : '尚未啟動'}
              </span>
              <button
                type="button"
                onClick={() => setShowAuraInfo(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 4: CLUES NOTEBOOK DRAWER / MODAL */}
      {/* ========================================================================= */}
      {showClueNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-purple-500/50 shadow-2xl p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-black text-sm text-stone-100">
                    酒保老查理・線索情報手札
                  </h3>
                  <span className="text-xs text-stone-400">
                    已記錄 {discoveredItems.length} / {allCollectiblesList.length} 件珍品秘聞
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClueNotebook(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clues List */}
            <div className="flex-1 overflow-y-auto pr-1 my-3 flex flex-col gap-2.5 custom-scrollbar">
              {discoveredItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-stone-500">
                  <Award className="w-12 h-12 text-stone-700 mb-2" />
                  <p className="text-sm font-bold text-stone-400">手札目前空空如也</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm">
                    在酒吧點購經典調酒、首席特調，或花 $300 請在場 VIP 貴賓喝一杯，即可打聽到珍貴的道具線索！
                  </p>
                </div>
              ) : (
                discoveredItems.map((item) => {
                  const playerHasIt = getPlayerCollectibles().some((c) => c.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-purple-500/40 transition flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-2xl shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-stone-100">{item.name}</span>
                            <span className="text-[10px] text-purple-300 px-1.5 py-0.2 rounded bg-purple-950/50 border border-purple-800">
                              {item.gameName}
                            </span>
                            {playerHasIt ? (
                              <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/50 border border-emerald-800 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>已收藏入庫</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-amber-950/50 border border-amber-800">
                                尚未獲得 · 秘訣已解鎖
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-300 mt-1 font-sans">
                            🎯 解鎖條件：{item.unlockConditionText}
                          </p>
                          <span className="text-[11px] text-stone-500 italic mt-0.5">
                            「{item.flavorText}」
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-stone-400">黑市基礎估值</span>
                        <span className="font-mono text-xs font-black text-amber-300">
                          ${item.basePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-stone-800 pt-2.5 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowClueNotebook(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition cursor-pointer"
              >
                關閉手札
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
