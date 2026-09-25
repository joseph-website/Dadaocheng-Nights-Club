import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BlackMarketNPC, CollectibleItem } from '../../types/inventory';
import {
  getTableSpectatorCandidate,
  BLACK_MARKET_NPCS,
  ALL_COLLECTIBLES,
  getPlayerCollectibles,
  sellCollectibleToNPC,
} from '../../utils/inventory';
import { getAuraRemainingTime, addAuraDuration } from '../../utils/aura';
import { sound } from '../../utils/audio';
import {
  getRandomTableSpeech,
  TABLE_TACTICAL_INTEL,
  TableSpeechResult,
  getRandomProbabilityAnalysis,
} from '../../utils/tableIntel';
import { toastService } from '../../utils/toast';
import {
  Sparkles,
  MessageCircle,
  X,
  Footprints,
  Calculator,
  ArrowRightLeft,
  Wine,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Info,
} from 'lucide-react';

interface TableNPCWidgetProps {
  gameId: string;
  gameName: string;
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  lastWinAmount?: number;
  lastLoss?: boolean;
}

// Departure lines when NPC randomly decides to walk to another area
const LEAVING_LINES = [
  '「哈哈，這桌我看差不多啦！我先去隔壁賭桌晃晃轉轉，你慢慢贏啊！」',
  '「我先去吧檯點杯冰鎮威士忌潤潤喉，換個朋友過來幫你加油助威！」',
  '「手突然好癢，我打算去別的機台下兩把，等會換別的貴賓來陪你！」',
  '「這桌氣場太旺了，我先去其他展區巡巡，回頭見，祝你下把大殺四方！」',
  '「我約了朋友在大廳碰面，先走一步啦！有新的貴賓已經過來囉～」',
  '「哈哈！看你連戰連捷，我也得去別處試試手氣了，先告辭，回頭聊！」',
];

// Approved Short Bystander Banter Quotes (圍觀老客短促起鬨語錄)
// Trigger 1: Win > 2000 points (大獲全勝)
const BIG_WIN_PHRASES = [
  '「嘖，這手剁得乾脆！」',
  '「贏破兩千？漂亮啊兄弟！」',
  '「手氣太硬了，這把吃得過癮！」',
  '「荷官臉都綠了，繼續殺！」',
  '「一口氣咬兩千，今晚酒錢有了！」',
];

// Trigger 2: 3-Win Streak (連勝起鬨)
const WIN_STREAK_PHRASES = [
  '「連殺三把？見鬼了！」',
  '「莊家被當兒子打，別停！」',
  '「連過三關！手氣正燙啊！」',
  '「氣勢來了，繼續頂別縮！」',
  '「三連莊！今晚是要通殺全場？」',
];

// Trigger 3: Balance < 1000 points (籌碼告急)
const LOW_CHIPS_PHRASES = [
  '「嘖，見底了啊，穩住！」',
  '「只剩這點了？別急著一把梭！」',
  '「別慌，一把翻盤的我看多了！」',
  '「手風有點背啊，喘口氣再來！」',
  '「要見底了老兄，先穩一把！」',
];

export const TableNPCWidget: React.FC<TableNPCWidgetProps> = ({
  gameId,
  gameName,
  balance,
  onUpdateBalance,
  lastWinAmount,
  lastLoss,
}) => {
  // Current Active Table Spectator NPC
  const [npc, setNpc] = useState<BlackMarketNPC | null>(() => getTableSpectatorCandidate(gameId));

  // Full Interactive Dialogue Modal / Panel
  const [isDialogueOpen, setIsDialogueOpen] = useState<boolean>(false);
  const [dialogueText, setDialogueText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'tactics' | 'bounty'>('chat');
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Live on-table floating speech bubble (Banter or Analysis)
  const [liveSpeech, setLiveSpeech] = useState<(TableSpeechResult & { id: number; isReaction?: boolean }) | null>(null);
  const lastBetSpeechTimeRef = useRef<number>(0);
  const bubbleTimerRef = useRef<any>(null);

  // Dynamic reaction tracking for bystander banter
  const winStreakRef = useRef<number>(0);
  const lastHandledWinAmountRef = useRef<number | null>(null);
  const lastHandledLossRef = useRef<boolean | null>(null);
  const lastLowChipsWarningTimeRef = useRef<number>(0);
  const prevBalanceRef = useRef<number>(balance);

  // Trigger dynamic reaction bubble (auto-dismiss in exactly 3 seconds)
  const triggerDynamicReaction = useCallback((type: 'big_win' | 'win_streak' | 'low_chips') => {
    let text = '';
    let tag = '👀 圍觀起鬨';
    if (type === 'big_win') {
      text = BIG_WIN_PHRASES[Math.floor(Math.random() * BIG_WIN_PHRASES.length)];
      tag = '🔥 大殺四方';
    } else if (type === 'win_streak') {
      text = WIN_STREAK_PHRASES[Math.floor(Math.random() * WIN_STREAK_PHRASES.length)];
      tag = '⚡ 三連破莊';
    } else if (type === 'low_chips') {
      text = LOW_CHIPS_PHRASES[Math.floor(Math.random() * LOW_CHIPS_PHRASES.length)];
      tag = '⚠️ 籌碼告急';
    }

    setDialogueText(text);
    setLiveSpeech({
      text,
      tag,
      kind: 'banter',
      isReaction: true,
      id: Date.now(),
    });

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    // Auto-dismiss in exactly 3 seconds as requested
    bubbleTimerRef.current = setTimeout(() => {
      setLiveSpeech(null);
    }, 3000);
  }, []);

  // Lucky drink aura duration in seconds (synchronized globally with Bar)
  const [drinkBuffRemaining, setDrinkBuffRemaining] = useState<number>(getAuraRemainingTime);

  // Player's current collectibles
  const [playerItems, setPlayerItems] = useState<CollectibleItem[]>(() => getPlayerCollectibles());

  const refreshPlayerItems = useCallback(() => {
    setPlayerItems(getPlayerCollectibles());
  }, []);

  // Sync global aura events
  useEffect(() => {
    const handleAuraChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ remaining: number }>;
      if (customEvent.detail?.remaining !== undefined) {
        setDrinkBuffRemaining(customEvent.detail.remaining);
      }
    };
    window.addEventListener('casino_aura_updated', handleAuraChange);
    return () => window.removeEventListener('casino_aura_updated', handleAuraChange);
  }, []);

  // Update candidate when table changes
  useEffect(() => {
    const candidate = getTableSpectatorCandidate(gameId);
    setNpc(candidate);
    setDialogueText(candidate.tableGreeting || `「這張【${gameName}】桌氣氛真不錯，我來坐坐看你發揮！」`);
    setLiveSpeech(null);
  }, [gameId, gameName]);

  // Clean bubble timer on unmount
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  // Drink aura countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDrinkBuffRemaining(getAuraRemainingTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update dialogue text on win/loss and trigger dynamic spectator banter
  useEffect(() => {
    if (npc && lastWinAmount && lastWinAmount > 0) {
      const reactions = npc.winReactions || [
        '「手風真順！這一把太漂亮了！」',
        '「大賺一筆！看來今天幸運女神站在你這邊！」',
      ];
      const text = reactions[Math.floor(Math.random() * reactions.length)];
      setDialogueText(text);

      if (lastWinAmount !== lastHandledWinAmountRef.current) {
        lastHandledWinAmountRef.current = lastWinAmount;
        winStreakRef.current += 1;

        if (lastWinAmount >= 2000) {
          triggerDynamicReaction('big_win');
        } else if (winStreakRef.current === 3) {
          triggerDynamicReaction('win_streak');
        }
      }
    }
  }, [lastWinAmount, npc, triggerDynamicReaction]);

  useEffect(() => {
    if (npc && lastLoss) {
      const reactions = npc.lossReactions || [
        '「這把惜敗，牌面瞬息萬變，稍作調整下把討回來！」',
        '「留得青山在，不怕沒柴燒，穩住心態最關鍵！」',
      ];
      const text = reactions[Math.floor(Math.random() * reactions.length)];
      setDialogueText(text);

      if (lastLoss !== lastHandledLossRef.current) {
        lastHandledLossRef.current = lastLoss;
        winStreakRef.current = 0;

        if (balance < 1000 && Date.now() - lastLowChipsWarningTimeRef.current > 12000) {
          lastLowChipsWarningTimeRef.current = Date.now();
          triggerDynamicReaction('low_chips');
        }
      }
    } else if (!lastLoss) {
      lastHandledLossRef.current = false;
    }
  }, [lastLoss, npc, balance, triggerDynamicReaction]);

  // Monitor balance dropping below 1000
  useEffect(() => {
    if (balance < 1000 && balance > 0 && prevBalanceRef.current >= 1000) {
      if (Date.now() - lastLowChipsWarningTimeRef.current > 12000) {
        lastLowChipsWarningTimeRef.current = Date.now();
        triggerDynamicReaction('low_chips');
      }
    }
    prevBalanceRef.current = balance;
  }, [balance, triggerDynamicReaction]);

  // Listen to casino_round_settled custom events across all casino tables
  useEffect(() => {
    const handleRoundSettled = (e: Event) => {
      const customEvent = e as CustomEvent<{
        gameId?: string;
        winAmount?: number;
        betAmount?: number;
        netProfit?: number;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      const won = (detail.winAmount ?? 0) > 0 || (detail.netProfit ?? 0) > 0;
      const safeWin = Math.max(detail.winAmount ?? 0, detail.netProfit ?? 0);

      if (won) {
        winStreakRef.current += 1;
        if (safeWin >= 2000) {
          triggerDynamicReaction('big_win');
          return;
        }
        if (winStreakRef.current === 3) {
          triggerDynamicReaction('win_streak');
          return;
        }
      } else if ((detail.betAmount ?? 0) > 0) {
        winStreakRef.current = 0;
        if (balance < 1000 && Date.now() - lastLowChipsWarningTimeRef.current > 12000) {
          lastLowChipsWarningTimeRef.current = Date.now();
          triggerDynamicReaction('low_chips');
        }
      }
    };

    window.addEventListener('casino_round_settled', handleRoundSettled);
    return () => window.removeEventListener('casino_round_settled', handleRoundSettled);
  }, [balance, triggerDynamicReaction]);

  // Listen for betting area operations: NPC triggers floating speech (banter or math intel)
  useEffect(() => {
    const handleBetAction = (e: Event) => {
      const customEvent = e as CustomEvent<{
        gameId?: string;
        betType?: string;
        amount?: number;
      }>;
      const targetGame = customEvent.detail?.gameId;
      if (targetGame && targetGame !== gameId) return;

      const now = Date.now();
      // Throttle speech popups to at least once per 2.2s, with 60% probability or guaranteed if >10s since last tip
      const timeSinceLast = now - lastBetSpeechTimeRef.current;
      if (timeSinceLast < 2200) return;

      const shouldTrigger = timeSinceLast > 10000 || Math.random() < 0.6;
      if (!shouldTrigger) return;

      lastBetSpeechTimeRef.current = now;
      const speech = getRandomTableSpeech(gameId, npc?.id, npc?.name);

      setDialogueText(speech.text);
      setLiveSpeech({ ...speech, id: now });

      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setLiveSpeech(null);
      }, 5500);
    };

    window.addEventListener('casino_bet_action', handleBetAction);
    return () => {
      window.removeEventListener('casino_bet_action', handleBetAction);
    };
  }, [gameId, npc]);

  // Listen for collectible unlock event (silent state sync)
  useEffect(() => {
    const handleCollectibleUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent<{
        item?: CollectibleItem;
        collectibleId?: string;
      }>;
      const targetId = customEvent.detail?.item?.id || customEvent.detail?.collectibleId;
      if (!targetId) return;

      const item = ALL_COLLECTIBLES.find((c) => c.id === targetId);
      if (!item || !npc) return;

      const text = `「好眼力！荷官剛才贈予你的【${item.name}】可是極品珍藏！拿到黑市能換不少籌碼喔！」`;
      setDialogueText(text);
      refreshPlayerItems();
    };

    window.addEventListener('casino_collectible_unlocked', handleCollectibleUnlocked);
    window.addEventListener('casino_inventory_changed', refreshPlayerItems);
    return () => {
      window.removeEventListener('casino_collectible_unlocked', handleCollectibleUnlocked);
      window.removeEventListener('casino_inventory_changed', refreshPlayerItems);
    };
  }, [npc, refreshPlayerItems]);

  // ESC handler to close dialogue modal
  useEffect(() => {
    if (!isDialogueOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playClick();
        setIsDialogueOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialogueOpen]);

  // Function to smoothly switch to another NPC
  const switchNPC = useCallback((farewellLine?: string) => {
    if (!npc) return;
    setIsSwitching(true);
    sound.playClick();
    setLiveSpeech(null);

    setTimeout(() => {
      // Pick a different NPC from roster
      const otherNPCs = BLACK_MARKET_NPCS.filter((n) => n.id !== npc.id);
      const chosenTemplate = otherNPCs[Math.floor(Math.random() * otherNPCs.length)] || BLACK_MARKET_NPCS[0];
      
      const gameCollectibles = ALL_COLLECTIBLES.filter((c) => c.gameId === gameId);
      const targetItem = gameCollectibles[Math.floor(Math.random() * gameCollectibles.length)] || ALL_COLLECTIBLES[0];
      const targetMultiplier = Math.min(3.0, Math.round((chosenTemplate.multiplier + 0.3 + Math.random() * 0.3) * 10) / 10);

      const newNPC: BlackMarketNPC = {
        ...chosenTemplate,
        targetCollectibleId: targetItem.id,
        targetMultiplier,
        wantedDialogue: `「若能在此桌獲得【${targetItem.name}】，我願以 ${targetMultiplier} 倍直接收購！」`,
        expiresAt: Date.now() + 300000,
      };

      setNpc(newNPC);
      setIsSwitching(false);
      sound.playWin();

      const welcomeText = newNPC.tableGreeting || `「哈囉！我是${newNPC.name}，聽說這桌手氣很旺，我也來坐坐！」`;
      setDialogueText(welcomeText);
    }, 1200);
  }, [npc, gameId]);

  // Action 1: Chat / Lore (25% chance of walking away to switch NPC)
  const handleChat = () => {
    if (!npc || isSwitching) return;
    sound.playClick();

    // 25% probability that the NPC says they're heading elsewhere, triggering a switch!
    const shouldLeave = Math.random() < 0.25;
    if (shouldLeave) {
      const farewell = LEAVING_LINES[Math.floor(Math.random() * LEAVING_LINES.length)];
      setDialogueText(farewell);
      switchNPC(farewell);
      return;
    }

    // Normal dialogue line
    const pool = [...(npc.idleReactions || []), npc.greeting];
    const quote = pool[Math.floor(Math.random() * pool.length)];
    setDialogueText(quote);
  };

  // Action 2: Treat NPC to a drink ($100 chips -> activates 60s lucky aura!)
  const handleTreatDrink = () => {
    if (!npc || isSwitching) return;
    const DRINK_COST = 100;
    if (balance < DRINK_COST) {
      toastService.warn('籌碼餘額不足以請客！（需 $100 籌碼）');
      return;
    }

    sound.playChip();
    sound.playWin();
    onUpdateBalance(balance - DRINK_COST);

    // Add 60s to global aura (caps at 300s)
    const newRemaining = addAuraDuration(60);
    setDrinkBuffRemaining(newRemaining);

    const toastReplies = [
      `「乾杯！好兄弟夠爽快！這杯酒我乾了，祝你手氣通天，把把大勝！」`,
      `「好酒！有你這杯頂級特調，今天我就留在這替你壓陣，財氣聚頂！」`,
      `「哈哈！大氣！碰一杯！今天我們不把賭桌贏穿絕不收手！」`,
    ];
    const reply = toastReplies[Math.floor(Math.random() * toastReplies.length)];
    setDialogueText(reply);

    toastService.success(
      `已向 ${npc.name} 敬上一杯！獲得 60 秒敬酒幸運光環！（欲打聽道具情報與心得請至大廳夜行酒吧）`
    );
  };

  // Action 3: In-table direct sale of desired collectible item
  const handleSellCollectibleOnTheSpot = () => {
    if (!npc || !targetItem) return;
    const buyoutPrice = Math.round(targetItem.basePrice * npc.targetMultiplier);

    const res = sellCollectibleToNPC(targetItem.id, npc);
    if (res.chipsEarned > 0) {
      sound.playBigWin();
      onUpdateBalance(balance + res.chipsEarned);
      refreshPlayerItems();

      const successLine = `「太精彩了！這件【${targetItem.name}】正是我苦苦尋覓的珍品！這筆 $${res.chipsEarned.toLocaleString()} 天價籌碼你受之無愧！」`;
      setDialogueText(successLine);

      toastService.success(`已將【${targetItem.name}】高價出讓給 ${npc.name}，獲得 $${res.chipsEarned.toLocaleString()} 籌碼！`);
    } else {
      toastService.warn('背包中未找到可出讓的珍品');
    }
  };

  // Check if player holds the NPC's desired item
  const targetItem = ALL_COLLECTIBLES.find((c) => c.id === npc?.targetCollectibleId);
  const playerHasTargetItem = targetItem && playerItems.some((i) => i.id === targetItem.id);
  const tacticalIntel = TABLE_TACTICAL_INTEL[gameId] || TABLE_TACTICAL_INTEL.roulette;

  return (
    <div
      id={`table-npc-widget-${gameId}`}
      className="relative flex items-center gap-2 z-40 select-none animate-fade-in"
    >
      {/* NPC Avatar Card in Navbar */}
      {npc && (
        <button
          id={`btn-open-npc-dialog-${gameId}`}
          type="button"
          disabled={isSwitching}
          onClick={() => {
            sound.playClick();
            setLiveSpeech(null);
            setIsDialogueOpen(true);
            refreshPlayerItems();
          }}
          className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-black/85 hover:bg-stone-900 border border-amber-500/50 hover:border-amber-400 shadow-xl backdrop-blur transition-all cursor-pointer group active:scale-98 text-left relative ${
            isSwitching ? 'opacity-50 animate-pulse' : ''
          }`}
          title="點擊與桌旁黑市貴賓互動交談、檢視戰術情報或現場高價出售珍品"
        >
          <div className="relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 via-stone-900 to-purple-950 p-0.5 shadow-md flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center text-xl">
              {npc.avatar}
            </div>
            {drinkBuffRemaining > 0 ? (
              <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] border border-stone-950 animate-bounce shadow">
                🍸{drinkBuffRemaining}s
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-black animate-pulse" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-amber-200 group-hover:text-amber-300 truncate max-w-[80px] sm:max-w-[100px]">
                {npc.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono hidden sm:inline shrink-0">
                觀戰中
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-stone-400">
              <span className="text-purple-300 font-bold shrink-0">{npc.targetMultiplier}x</span>
              <span className="truncate max-w-[90px] text-stone-400">求購寶物</span>
            </div>
          </div>
        </button>
      )}

      {/* Floating Instant Live Speech Bubble (Micro dynamic bubble with neon glow & 3s auto-dismiss) */}
      {liveSpeech && npc && (
        <div
          id="table-npc-live-speech-bubble"
          className="pointer-events-none absolute top-full mt-1.5 right-0 w-64 sm:w-72 p-2.5 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.7)] bg-stone-950/95 backdrop-blur-md border border-amber-400/90 transition-all animate-in fade-in zoom-in-95 duration-200 z-50 select-none"
        >
          {/* Neon Glow Pointer Triangle */}
          <div className="absolute -top-1.5 right-6 w-3 h-3 bg-stone-950 border-t border-l border-amber-400/90 rotate-45 pointer-events-none" />

          <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-amber-500/30">
            <span className="text-[11px] font-black flex items-center gap-1 text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
              {liveSpeech.tag || '👀 圍觀起鬨'}
            </span>
            <span className="text-[9px] text-amber-400/75 font-mono font-bold">
              3s 自動關閉
            </span>
          </div>
          <p className="text-xs text-amber-100 font-sans leading-snug font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {liveSpeech.text}
          </p>
        </div>
      )}

      {/* Complete Interactive Dialogue Modal */}
      {isDialogueOpen &&
        npc &&
        createPortal(
          <div
            id="npc-dialog-backdrop"
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                sound.playClick();
                setIsDialogueOpen(false);
              }
            }}
          >
            <div
              id="npc-dialog-modal-card"
              className="relative w-full max-w-lg bg-gradient-to-b from-[#14121a] via-[#0d0d12] to-black border border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-stone-900 to-purple-900 p-0.5 flex items-center justify-center shadow-lg shrink-0">
                    <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-2xl">
                      {npc.avatar}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base text-amber-300 tracking-wide">
                        {npc.name}
                      </h3>
                      <span className="text-[11px] px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-200 font-bold">
                        {npc.title}
                      </span>
                      {drinkBuffRemaining > 0 && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500 text-stone-950 font-black animate-pulse flex items-center gap-1">
                          <Wine className="w-3 h-3" />
                          <span>敬酒光環 ({drinkBuffRemaining}s)</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400 font-medium">
                      觀戰位置：{gameName}貴賓席 • 喜好風格：{npc.personality}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-close-npc-dialog"
                  onClick={() => {
                    sound.playClick();
                    setIsDialogueOpen(false);
                  }}
                  className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition-all cursor-pointer shrink-0"
                  title="關閉對話 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Switching / Departure Status Indicator */}
              {isSwitching && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center gap-2.5 text-amber-200 text-xs font-bold animate-pulse shrink-0">
                  <Footprints className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>{npc.name} 正前往其他區域巡視... 新貴賓即將前來接替觀戰！</span>
                </div>
              )}

              {/* Main Dialogue Bubble */}
              <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-amber-500/40 shadow-inner flex flex-col gap-1.5 relative shrink-0">
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{npc.name} 說：</span>
                  </span>
                  <span className="text-stone-500 font-mono text-[10px]">即時互動</span>
                </div>
                <p className="text-sm leading-relaxed text-amber-100 font-sans font-medium min-h-[44px] flex items-center">
                  {dialogueText}
                </p>
              </div>

              {/* Segmented Navigation Tabs: 3 Distinct Functional Sections */}
              <div className="flex items-center p-1 rounded-xl bg-stone-950 border border-stone-800 shrink-0 gap-1">
                <button
                  type="button"
                  id="tab-npc-chat"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('chat');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>專屬閒聊與請客</span>
                </button>

                <button
                  type="button"
                  id="tab-npc-tactics"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('tactics');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'tactics'
                      ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>盤口戰術密鑑</span>
                </button>

                <button
                  type="button"
                  id="tab-npc-bounty"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('bounty');
                    refreshPlayerItems();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'bounty'
                      ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>現場特約珍寶</span>
                </button>
              </div>

              {/* TAB 1: Chat & Treat Drink */}
              {activeTab === 'chat' && (
                <div className="flex flex-col gap-2 shrink-0 animate-in fade-in-50 duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Chat button */}
                    <button
                      type="button"
                      id="btn-npc-chat"
                      disabled={isSwitching}
                      onClick={handleChat}
                      className="p-3 rounded-xl bg-gradient-to-b from-stone-900 to-stone-950 hover:from-stone-800 hover:to-stone-900 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>隨意聊聊 / 聽聽八卦</span>
                    </button>

                    {/* Treat drink button */}
                    <button
                      type="button"
                      id="btn-npc-treat-drink"
                      disabled={isSwitching || balance < 100}
                      onClick={handleTreatDrink}
                      className="p-3 rounded-xl bg-gradient-to-b from-amber-950/70 via-stone-900 to-stone-950 hover:from-amber-900 hover:to-stone-900 border border-amber-400/60 text-amber-300 hover:text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                      title="耗費 $100 籌碼請貴賓喝一杯特調，獲得 60 秒幸運光環"
                    >
                      <Wine className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>請喝一杯特調 ($100)</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
                    💡 <strong className="text-amber-300">互動提示：</strong>
                    賭桌請客維持 $100，可獲得 60 秒敬酒幸運光環（持光環獲勝有 30% 機率獲得莊家加碼 $300~$1,000，注碼破 $8,000 固定加碼 $1,000）。若想打聽道具線索與心得，請至大廳【夜行酒吧】！
                  </div>
                </div>
              )}

              {/* TAB 2: Tactical & Mathematical Intel Card */}
              {activeTab === 'tactics' && (
                <div className="flex flex-col gap-2.5 shrink-0 animate-in fade-in-50 duration-150 text-xs">
                  {/* Optimal Strategy */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col gap-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>最佳策略指南 (Optimal Strategy)</span>
                    </span>
                    <p className="text-[11px] text-stone-200 leading-relaxed">
                      {tacticalIntel.optimalStrategy}
                    </p>
                  </div>

                  {/* Trap Alert */}
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col gap-1">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>關鍵避險禁忌 (Trap Alert)</span>
                    </span>
                    <p className="text-[11px] text-stone-200 leading-relaxed">
                      {tacticalIntel.trapAlert}
                    </p>
                  </div>

                  {/* Key Formulas */}
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex flex-col gap-1">
                    <span className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>關鍵勝率與公式速查</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {tacticalIntel.keyFormulas.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700/60 font-mono text-[10px] text-stone-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick analysis draw button */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playChip();
                      const quote = getRandomProbabilityAnalysis(gameId, npc.name);
                      setDialogueText(quote);
                    }}
                    className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>即時抽取一條黑市機率心法</span>
                  </button>
                </div>
              )}

              {/* TAB 3: On-the-spot Collectible Bounty */}
              {activeTab === 'bounty' && (
                <div className="flex flex-col gap-2.5 shrink-0 animate-in fade-in-50 duration-150">
                  {targetItem ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-stone-950 to-amber-950/40 border border-amber-500/50 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-amber-400/60 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                          {targetItem.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-400">特約求購目標：</span>
                            <span className="text-sm font-black text-amber-300">
                              【{targetItem.name}】
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300">
                              {targetItem.gameName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-stone-300 mt-1">
                            <span>原市價: ${targetItem.basePrice.toLocaleString()}</span>
                            <span className="text-emerald-400 font-black">
                              → 現場特約收購: ${Math.round(targetItem.basePrice * npc.targetMultiplier).toLocaleString()} ({npc.targetMultiplier}X)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Immediate Action */}
                      {playerHasTargetItem ? (
                        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>你的背包目前持有此珍品！</span>
                          </div>
                          <button
                            type="button"
                            id="btn-npc-sell-on-the-spot"
                            onClick={handleSellCollectibleOnTheSpot}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>現場高價出讓 (+${Math.round(targetItem.basePrice * npc.targetMultiplier).toLocaleString()})</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col gap-1 text-[11px] text-stone-400">
                          <div className="flex items-center gap-1 text-amber-300 font-bold">
                            <Info className="w-3.5 h-3.5" />
                            <span>尚未取得此珍寶</span>
                          </div>
                          <p className="leading-relaxed">
                            {targetItem.flavorText} 在本賭桌獲勝或達成特殊牌型時，荷官有機會贈予收藏。亦可隨時前往大廳黑市展櫃檢視！
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-stone-500 text-xs">
                      目前此貴賓暫無特約求購標的
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Row: Switch Guest (更換觀戰貴賓) */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
                  想換不同風格的貴賓過來陪玩？
                </span>
                <button
                  type="button"
                  id="btn-npc-switch-guest"
                  disabled={isSwitching}
                  onClick={() => {
                    const farewell = '「好嘞！那我先去其他展區逛逛，換個朋友過來陪你玩，回頭見！」';
                    setDialogueText(farewell);
                    switchNPC(farewell);
                  }}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400/60 text-stone-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ml-auto"
                  title="讓當前貴賓前往其他區域巡視，並邀請另一位貴賓過來觀戰"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>換一位貴賓聊聊</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
