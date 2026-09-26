import React, { useState, useEffect, useRef } from 'react';
import {
  PokerCard,
  PokerStage,
  HandEvaluation,
  PokerGameHistory,
  PokerStats,
} from '../../types/poker';
import {
  createDeck,
  shuffleDeck,
  validateDeckIntegrity,
  evaluateHoldemHand,
  compareEvaluations,
  computeAiDecision,
} from '../../utils/poker';
import { sound } from '../../utils/audio';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { PokerCardView } from './PokerCardView';
import { ChipSelector } from '../ChipSelector';
import { CasinoChip } from '../common/CasinoChip';
import { WinToast, WinToastData } from '../common/WinToast';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import {
  Sparkles,
  Trophy,
  History,
  Shield,
  Bot,
  User,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Award,
  Layers,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  Coins,
  PanelRightOpen,
} from 'lucide-react';

interface PokerTableProps {
  balance: number;
  onUpdateBalance: (newBal: number | ((prev: number) => number)) => void;
  selectedChip: number;
  onSelectChip: (chip: number) => void;
  onResetBalance?: () => void;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEYS = {
  STATS: 'texas_holdem_stats_v1',
  HISTORY: 'texas_holdem_history_v1',
};

const DEFAULT_BLINDS = [
  { label: '低盲注', sb: 50, bb: 100 },
  { label: '標準注', sb: 100, bb: 200 },
  { label: '高額注', sb: 500, bb: 1000 },
];

export const PokerTable: React.FC<PokerTableProps> = ({
  balance,
  onUpdateBalance,
  selectedChip,
  onSelectChip,
  onRoundBusyChange,
}) => {
  // Game Setup & Deck
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [playerCards, setPlayerCards] = useState<PokerCard[]>([]);
  const [aiCards, setAiCards] = useState<PokerCard[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  
  // Game Stage & Turn
  const [stage, setStage] = useState<PokerStage>('idle');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [dealerButton, setDealerButton] = useState<'player' | 'ai'>('player');
  const [selectedBlindIdx, setSelectedBlindIdx] = useState(1); // standard: SB $100 / BB $200

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Bets & Pot
  const [pot, setPot] = useState(0);
  const [playerRoundBet, setPlayerRoundBet] = useState(0);
  const [aiRoundBet, setAiRoundBet] = useState(0);
  const [playerTotalCommitted, setPlayerTotalCommitted] = useState(0);
  const [aiTotalCommitted, setAiTotalCommitted] = useState(0);
  const [currentStreetActions, setCurrentStreetActions] = useState<string[]>([]);

  // Real-time Hand Evaluations
  const [playerEval, setPlayerEval] = useState<HandEvaluation | null>(null);
  const [aiEval, setAiEval] = useState<HandEvaluation | null>(null);
  const [winningCardIds, setWinningCardIds] = useState<Set<string>>(new Set());
  const [showdownComparison, setShowdownComparison] = useState<{
    pEval: HandEvaluation;
    aEval: HandEvaluation;
    cmp: number;
    pot: number;
  } | null>(null);
  const [aiThoughtBubble, setAiThoughtBubble] = useState<string | null>(null);
  const [aiIsBluffing, setAiIsBluffing] = useState<boolean>(false);
  const [isAllInMode, setIsAllInMode] = useState<boolean>(false);

  // Dealer Action Logs
  const [dealerLogs, setDealerLogs] = useState<string[]>([
    '歡迎來到德州撲克 1V1 (Heads-up Texas Hold\'em)！請選擇盲注並點擊「發牌 DEAL」開始。',
  ]);

  // Toast & Stats
  const [winToast, setWinToast] = useState<WinToastData | null>(null);
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);
  const [stats, setStats] = useState<PokerStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STATS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      handsPlayed: 0,
      playerWins: 0,
      aiWins: 0,
      splits: 0,
      totalWon: 0,
      biggestPot: 0,
      royalFlushCount: 0,
      straightFlushCount: 0,
      fourKindCount: 0,
    };
  });

  const [history, setHistory] = useState<PokerGameHistory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const timeoutsRef = useRef<number[]>([]);
  const deckRef = useRef<PokerCard[]>([]);
  const communityCardsRef = useRef<PokerCard[]>([]);
  const playerCardsRef = useRef<PokerCard[]>([]);
  const aiCardsRef = useRef<PokerCard[]>([]);
  const roundCounterRef = useRef<number>(0);

  // Sync active round status to parent
  useEffect(() => {
    const isBusy = stage !== 'idle' && stage !== 'showdown' && stage !== 'folded';
    const atStake = isBusy ? (playerTotalCommitted > 0 ? playerTotalCommitted : playerRoundBet) : 0;
    onRoundBusyChange?.(isBusy, atStake);
  }, [stage, playerTotalCommitted, playerRoundBet, onRoundBusyChange]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  // Listen to global casino reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({
        handsPlayed: 0,
        playerWins: 0,
        aiWins: 0,
        splits: 0,
        totalWon: 0,
        biggestPot: 0,
        royalFlushCount: 0,
        straightFlushCount: 0,
        fourKindCount: 0,
      });
      setHistory([]);
      setPot(0);
      setPlayerRoundBet(0);
      setAiRoundBet(0);
      setPlayerTotalCommitted(0);
      setAiTotalCommitted(0);
      deckRef.current = [];
      communityCardsRef.current = [];
      playerCardsRef.current = [];
      aiCardsRef.current = [];
      setCommunityCards([]);
      setPlayerCards([]);
      setAiCards([]);
      setStage('idle');
      setPlayerEval(null);
      setAiEval(null);
      setShowdownComparison(null);
      setWinToast(null);
      setDealerLogs(['全局數據已重置。請選擇盲注並點擊「發牌 DEAL」開始全新對局。']);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const activeBlind = DEFAULT_BLINDS[selectedBlindIdx];
  const callAmount = Math.max(0, aiRoundBet - playerRoundBet);
  const minRaise = activeBlind.bb;
  const BET_CAP_MAX = 10000;
  // Bet Cap: min(2 * pot, 10,000) for standard raise buttons
  const maxSingleRaise = Math.max(minRaise, Math.min(BET_CAP_MAX, Math.floor(pot * 2)));

  // Dynamic All-in calculation rule:
  // - If pot <= 5000: base All-in = 10000
  // - If pot > 5000: base All-in = pot * 2
  // - Asset protection: min(calculated amount, player's total remaining balance)
  const dynamicAllInBase = pot <= 5000 ? 10000 : pot * 2;
  const calculatedAllInAmount = Math.min(balance, dynamicAllInBase);

  const addLog = (msg: string) => {
    setDealerLogs((prev) => [msg, ...prev.slice(0, 25)]);
  };

  // Evaluate player's hand whenever player or community cards change
  useEffect(() => {
    if (playerCards.length === 2) {
      const allPlayer = [...playerCards, ...communityCards];
      const evaluation = evaluateHoldemHand(allPlayer);
      setPlayerEval(evaluation);
    } else {
      setPlayerEval(null);
    }
  }, [playerCards, communityCards]);

  // ==================== ATOMIC DECK SHOE & DEALING ====================
  // Extracts cards from authoritative deck shoe (deckRef.current) in-place,
  // guaranteeing zero duplicate cards and strictly 52-card single deck integrity.
  const drawCards = (count: number): PokerCard[] => {
    if (deckRef.current.length < count) {
      console.error(
        `[Poker Dealer Error] Deck underflow: requested ${count}, available ${deckRef.current.length}`
      );
      return [];
    }
    const drawn = deckRef.current.splice(0, count);
    setDeck([...deckRef.current]);
    return drawn;
  };

  // ==================== 1. START NEW HAND (PRE-FLOP) ====================
  const handleStartHand = () => {
    if (stage !== 'idle' && stage !== 'showdown' && stage !== 'folded') return;

    const sb = activeBlind.sb;
    const bb = activeBlind.bb;
    const requiredPlayerChips = dealerButton === 'player' ? sb : bb;

    if (balance < requiredPlayerChips) {
      sound.playLoss();
      toastService.warn(`籌碼不足以支付盲注 ($${requiredPlayerChips})，請重置籌碼！`);
      return;
    }

    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    // Deduct player blind
    onRoundBusyChange?.(true, requiredPlayerChips);
    const newBal = balance - requiredPlayerChips;
    onUpdateBalance(newBal);
    dispatchBetAction({ gameId: 'poker', betType: 'blind', amount: requiredPlayerChips });

    // Prepare fresh 52-card single deck (strictly unique suits & ranks)
    roundCounterRef.current += 1;
    const fullDeck = shuffleDeck(createDeck(roundCounterRef.current));
    const deckCheck = validateDeckIntegrity(fullDeck);
    if (!deckCheck.valid) {
      console.error('[CRITICAL] Corrupted deck:', deckCheck.error);
    }
    deckRef.current = fullDeck;
    setDeck([...fullDeck]);
    sound.playShuffle();

    // Deal 2 cards to player, 2 cards to AI (draws exactly 4 cards atomically)
    const pCards = drawCards(2);
    const aCardsRaw = drawCards(2);
    const aCards = aCardsRaw.map((c) => ({ ...c, isHidden: true }));

    playerCardsRef.current = pCards;
    aiCardsRef.current = aCards;
    communityCardsRef.current = [];

    const pBlind = dealerButton === 'player' ? sb : bb;
    const aBlind = dealerButton === 'player' ? bb : sb;

    setPlayerCards(pCards);
    setAiCards(aCards);
    setCommunityCards([]);
    setPot(pBlind + aBlind);
    setPlayerRoundBet(pBlind);
    setAiRoundBet(aBlind);
    setPlayerTotalCommitted(pBlind);
    setAiTotalCommitted(aBlind);
    setWinningCardIds(new Set());
    setPlayerEval(null);
    setAiEval(null);
    setShowdownComparison(null);
    setAiThoughtBubble(null);
    setAiIsBluffing(false);
    setIsAllInMode(false);
    setCurrentStreetActions([]);
    setStage('preflop');

    sound.playCardDeal();
    addLog(`=== 新手局開始 (底池: $${pBlind + aBlind}) ===`);
    addLog(`【盲注】玩家下盲注 $${pBlind}，電腦莊家下盲注 $${aBlind}`);

    // If player is Small Blind (Dealer), player acts first in preflop
    if (dealerButton === 'player') {
      addLog(`輪到玩家行動：可選擇【跟注 $${aBlind - pBlind}】、【加注】或【棄牌】`);
    } else {
      // AI is Small Blind, AI acts first in preflop
      addLog(`輪到電腦行動...`);
      scheduleAiTurn(aBlind, pBlind, pBlind + aBlind, 'preflop');
    }
  };

  // ==================== AUTO RUNOUT (When All-in or Cap Reached) ====================
  const triggerAutoRunout = () => {
    setIsAllInMode(true);
    addLog('⚡ 進入全壓 / 封頂模式：鎖定下注，依序平滑發出剩餘公牌！');

    const steps: { name: string; action: 'flop' | 'turn' | 'river' | 'showdown'; delay: number }[] = [];
    const currentCommLen = communityCardsRef.current.length;

    if (currentCommLen === 0) {
      steps.push({ name: '翻牌圈 (FLOP)', action: 'flop', delay: 600 });
      steps.push({ name: '轉牌圈 (TURN)', action: 'turn', delay: 1300 });
      steps.push({ name: '河牌圈 (RIVER)', action: 'river', delay: 2000 });
      steps.push({ name: '攤牌 (SHOWDOWN)', action: 'showdown', delay: 2700 });
    } else if (currentCommLen === 3) {
      steps.push({ name: '轉牌圈 (TURN)', action: 'turn', delay: 700 });
      steps.push({ name: '河牌圈 (RIVER)', action: 'river', delay: 1400 });
      steps.push({ name: '攤牌 (SHOWDOWN)', action: 'showdown', delay: 2100 });
    } else if (currentCommLen === 4) {
      steps.push({ name: '河牌圈 (RIVER)', action: 'river', delay: 700 });
      steps.push({ name: '攤牌 (SHOWDOWN)', action: 'showdown', delay: 1400 });
    } else {
      steps.push({ name: '攤牌 (SHOWDOWN)', action: 'showdown', delay: 700 });
    }

    steps.forEach((step) => {
      const timer = window.setTimeout(() => {
        if (step.action === 'flop') {
          const flop = drawCards(3);
          communityCardsRef.current = flop;
          setCommunityCards(flop);
          sound.playCardDeal();
          addLog(`--- 翻牌圈 (FLOP) --- 發出公牌 [${flop.map((c) => c.rank).join(' ')}]`);
        } else if (step.action === 'turn') {
          const turn = drawCards(1);
          communityCardsRef.current = [...communityCardsRef.current, ...turn];
          setCommunityCards([...communityCardsRef.current]);
          sound.playCardDeal();
          addLog(`--- 轉牌圈 (TURN) --- 發出公牌 [${turn[0].rank}]`);
        } else if (step.action === 'river') {
          const river = drawCards(1);
          communityCardsRef.current = [...communityCardsRef.current, ...river];
          setCommunityCards([...communityCardsRef.current]);
          sound.playCardDeal();
          addLog(`--- 河牌圈 (RIVER) --- 發出公牌 [${river[0].rank}]`);
        } else if (step.action === 'showdown') {
          handleShowdown();
        }
      }, step.delay);
      timeoutsRef.current.push(timer);
    });
  };

  // ==================== STREET ADVANCEMENT ====================
  const advanceStreet = (nextStreet: 'flop' | 'turn' | 'river' | 'showdown') => {
    if (isAllInMode) return;

    // Reset round bets
    setPlayerRoundBet(0);
    setAiRoundBet(0);
    setCurrentStreetActions([]);

    if (nextStreet === 'flop') {
      // Deal 3 flop cards atomically from deckRef
      const flop = drawCards(3);
      communityCardsRef.current = flop;
      setCommunityCards(flop);
      setStage('flop');
      sound.playCardDeal();
      addLog(`--- 翻牌圈 (FLOP) --- 發出公牌 [${flop.map((c) => c.rank).join(' ')}]`);

      // Post-flop: Player out of position (or Dealer)
      if (dealerButton === 'ai') {
        addLog('輪到玩家行動：可【過牌】或【加注】');
      } else {
        addLog('電腦行動中...');
        scheduleAiTurn(0, 0, pot, 'flop');
      }
    } else if (nextStreet === 'turn') {
      // Deal 1 turn card atomically from deckRef
      const turn = drawCards(1);
      communityCardsRef.current = [...communityCardsRef.current, ...turn];
      setCommunityCards([...communityCardsRef.current]);
      setStage('turn');
      sound.playCardDeal();
      addLog(`--- 轉牌圈 (TURN) --- 發出公牌 [${turn[0].rank}]`);

      if (dealerButton === 'ai') {
        addLog('輪到玩家行動：可【過牌】或【加注】');
      } else {
        addLog('電腦行動中...');
        scheduleAiTurn(0, 0, pot, 'turn');
      }
    } else if (nextStreet === 'river') {
      // Deal 1 river card atomically from deckRef
      const river = drawCards(1);
      communityCardsRef.current = [...communityCardsRef.current, ...river];
      setCommunityCards([...communityCardsRef.current]);
      setStage('river');
      sound.playCardDeal();
      addLog(`--- 河牌圈 (RIVER) --- 發出公牌 [${river[0].rank}]`);

      if (dealerButton === 'ai') {
        addLog('輪到玩家行動：可【過牌】或【加注】');
      } else {
        addLog('電腦行動中...');
        scheduleAiTurn(0, 0, pot, 'river');
      }
    } else if (nextStreet === 'showdown') {
      handleShowdown();
    }
  };

  // ==================== AI DECISION TIMING ====================
  const scheduleAiTurn = (
    aiBet: number,
    playerBet: number,
    currentPot: number,
    currentStage: PokerStage
  ) => {
    setIsAiThinking(true);
    setAiThoughtBubble('思考中...');

    const decision = computeAiDecision(
      aiCardsRef.current,
      communityCardsRef.current,
      playerBet,
      aiBet,
      currentPot,
      minRaise,
      BET_CAP_MAX
    );

    const t = window.setTimeout(() => {
      setIsAiThinking(false);
      executeAiTurn(decision, aiBet, playerBet, currentPot, currentStage);
    }, decision.delayMs);

    timeoutsRef.current.push(t);
  };

  const executeAiTurn = (
    decision: ReturnType<typeof computeAiDecision>,
    aiBet: number,
    playerBet: number,
    currentPot: number,
    currentStage: PokerStage
  ) => {
    setAiThoughtBubble(decision.tellText || decision.thought);
    setAiIsBluffing(decision.isBluff || false);

    if (decision.action === 'fold') {
      sound.playLoss();
      addLog(`電腦選擇棄牌 (Fold)！${decision.tellText ? ' ' + decision.tellText : ''}`);
      handleAiFold();
      return;
    }

    if (decision.action === 'check') {
      sound.playTick();
      addLog(`電腦選擇：【過牌 (Check)】${decision.tellText ? ' ' + decision.tellText : ''}`);

      // If player already acted / checked, street ends
      if (currentStreetActions.includes('player_check')) {
        progressStreet(currentStage);
      } else {
        setCurrentStreetActions((prev) => [...prev, 'ai_check']);
        addLog('輪到玩家行動：可【過牌】或【加注】');
      }
    } else if (decision.action === 'call') {
      sound.playChip();
      const diff = playerBet - aiBet;
      setPot((prev) => prev + diff);
      setAiRoundBet(playerBet);
      setAiTotalCommitted((prev) => prev + diff);
      addLog(`電腦選擇：【跟注 $${diff.toLocaleString()} (Call)】${decision.tellText ? ' ' + decision.tellText : ''}`);

      if (balance === 0) {
        triggerAutoRunout();
      } else {
        // Both bets matched, street concludes
        progressStreet(currentStage);
      }
    } else if (decision.action === 'raise') {
      sound.playChip();
      const diff = playerBet - aiBet;
      const allowedCap = Math.min(BET_CAP_MAX, Math.floor((currentPot + diff) * 2));
      const raiseAmt = Math.min(allowedCap, decision.raiseAmount || minRaise);
      const totalToAdd = diff + raiseAmt;
      const newAiBet = aiBet + totalToAdd;

      setPot((prev) => prev + totalToAdd);
      setAiRoundBet(newAiBet);
      setAiTotalCommitted((prev) => prev + totalToAdd);
      addLog(`電腦選擇：【加注 +$${raiseAmt.toLocaleString()} (Raise)】(總下注 $${newAiBet.toLocaleString()})${decision.tellText ? ' ' + decision.tellText : ''}`);
      addLog(`輪到玩家應對：需跟注 $${(newAiBet - playerBet).toLocaleString()} 或選擇加注/棄牌`);
    }
  };

  const progressStreet = (stageToCheck: PokerStage) => {
    if (stageToCheck === 'preflop') {
      advanceStreet('flop');
    } else if (stageToCheck === 'flop') {
      advanceStreet('turn');
    } else if (stageToCheck === 'turn') {
      advanceStreet('river');
    } else if (stageToCheck === 'river') {
      advanceStreet('showdown');
    }
  };

  // ==================== PLAYER ACTIONS ====================
  const handlePlayerCheck = () => {
    if (isAiThinking || stage === 'idle' || stage === 'showdown' || stage === 'folded' || isAllInMode) return;
    if (callAmount > 0) return; // Cannot check if facing a bet

    sound.playTick();
    addLog(`玩家選擇：【過牌 (Check)】`);

    // If AI already checked, street ends
    if (currentStreetActions.includes('ai_check')) {
      progressStreet(stage);
    } else {
      setCurrentStreetActions((prev) => [...prev, 'player_check']);
      addLog('電腦行動中...');
      scheduleAiTurn(aiRoundBet, playerRoundBet, pot, stage);
    }
  };

  const handlePlayerCall = () => {
    if (isAiThinking || stage === 'idle' || stage === 'showdown' || stage === 'folded' || isAllInMode) return;
    if (callAmount <= 0) {
      handlePlayerCheck();
      return;
    }

    if (balance < callAmount) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足以跟注！');
      return;
    }

    sound.playChip();
    const isPlayerAllIn = balance - callAmount === 0;
    onRoundBusyChange?.(true, playerTotalCommitted + callAmount);
    onUpdateBalance(balance - callAmount);
    dispatchBetAction({ gameId: 'poker', betType: 'call', amount: callAmount });
    setPot((prev) => prev + callAmount);
    setPlayerRoundBet(aiRoundBet);
    setPlayerTotalCommitted((prev) => prev + callAmount);
    addLog(`玩家選擇：【跟注 $${callAmount.toLocaleString()} (Call)】`);

    if (isPlayerAllIn) {
      triggerAutoRunout();
    } else {
      progressStreet(stage);
    }
  };

  const handlePlayerRaise = (extraAmount: number) => {
    if (isAiThinking || stage === 'idle' || stage === 'showdown' || stage === 'folded' || isAllInMode) return;

    const cappedExtra = Math.min(maxSingleRaise, extraAmount);
    const totalCost = callAmount + cappedExtra;
    if (balance < totalCost) {
      sound.playLoss();
      toastService.warn(`籌碼餘額不足！需要 $${totalCost.toLocaleString()}，當前餘額 $${balance.toLocaleString()}`);
      return;
    }

    sound.playChip();
    onRoundBusyChange?.(true, playerTotalCommitted + totalCost);
    onUpdateBalance(balance - totalCost);
    dispatchBetAction({ gameId: 'poker', betType: 'raise', amount: totalCost });
    const newPlayerBet = playerRoundBet + totalCost;
    setPot((prev) => prev + totalCost);
    setPlayerRoundBet(newPlayerBet);
    setPlayerTotalCommitted((prev) => prev + totalCost);
    addLog(`玩家選擇：【加注 +$${cappedExtra.toLocaleString()} (Raise)】(單次上限 $${maxSingleRaise.toLocaleString()})`);

    addLog('電腦行動中...');
    scheduleAiTurn(aiRoundBet, newPlayerBet, pot + totalCost, stage);
  };

  const handlePlayerAllIn = () => {
    if (isAiThinking || stage === 'idle' || stage === 'showdown' || stage === 'folded' || isAllInMode) return;
    if (balance <= 0) {
      sound.playLoss();
      toastService.warn('籌碼已耗盡！');
      return;
    }

    // Dynamic All-in amount:
    // Pot <= 5000: $10,000
    // Pot > 5000: Pot * 2
    // Asset protection: min(calculatedAllInAmount, balance)
    const totalCost = calculatedAllInAmount;

    sound.playChip();
    onRoundBusyChange?.(true, playerTotalCommitted + totalCost);
    onUpdateBalance(balance - totalCost);
    dispatchBetAction({ gameId: 'poker', betType: 'all_in', amount: totalCost });
    const newPlayerBet = playerRoundBet + totalCost;
    setPot((prev) => prev + totalCost);
    setPlayerRoundBet(newPlayerBet);
    setPlayerTotalCommitted((prev) => prev + totalCost);

    addLog(`🔥 玩家發動：【全壓 All-in $${totalCost.toLocaleString()}】(鎖定操作，進入自動開牌攤牌模式)`);

    // Lock actions and smoothly run out all remaining community cards to showdown
    triggerAutoRunout();
  };

  const handlePlayerFold = () => {
    if (isAiThinking || stage === 'idle' || stage === 'showdown' || stage === 'folded' || isAllInMode) return;

    sound.playLoss();
    setStage('folded');
    addLog(`玩家棄牌 (Fold)！電腦莊家贏得彩池 $${pot}`);

    setWinToast({
      title: '本局棄牌',
      amount: 0,
      description: `玩家棄牌，電腦贏得彩池 $${pot.toLocaleString()}`,
      isWin: false,
    });

    setStats((prev) => ({
      ...prev,
      handsPlayed: prev.handsPlayed + 1,
      aiWins: prev.aiWins + 1,
    }));

    setHistory((prev) => [
      {
        id: `poker-hist-${Date.now()}`,
        timestamp: new Date(),
        winner: 'player_folded',
        pot,
        playerHandName: '棄牌',
        aiHandName: '獲勝',
        playerNet: -playerTotalCommitted,
      },
      ...prev.slice(0, 49),
    ]);

    recordCareerRound({
      gameId: 'poker',
      betAmount: playerTotalCommitted,
      winAmount: 0,
    });

    setDealerButton((prev) => (prev === 'player' ? 'ai' : 'player'));
  };

  // Keyboard shortcuts: Space (Start / Check / Call), F (Fold), R (Min Raise), A (All-in)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (stage === 'idle' || stage === 'showdown' || stage === 'folded') {
        if (e.code === 'Space') {
          e.preventDefault();
          handleStartHand();
          return;
        }
      } else if (!isAiThinking && !isAllInMode) {
        if (e.code === 'Space') {
          e.preventDefault();
          if (callAmount === 0) {
            handlePlayerCheck();
          } else {
            handlePlayerCall();
          }
          return;
        }
        if (key === 'F') {
          e.preventDefault();
          handlePlayerFold();
          return;
        }
        if (key === 'R') {
          e.preventDefault();
          handlePlayerRaise(minRaise);
          return;
        }
        if (key === 'A') {
          e.preventDefault();
          handlePlayerAllIn();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    stage,
    isAiThinking,
    isAllInMode,
    callAmount,
    minRaise,
    handleStartHand,
    handlePlayerCheck,
    handlePlayerCall,
    handlePlayerFold,
    handlePlayerRaise,
    handlePlayerAllIn,
  ]);

  const handleAiFold = () => {
    setStage('folded');
    sound.playWin();

    // Check house bonus on win
    let finalPayout = pot;
    let bonusWon = 0;
    const bonus = checkHouseBonus(playerTotalCommitted);
    if (bonus.triggered) {
      bonusWon = bonus.bonusAmount;
      finalPayout += bonusWon;
      notifyHouseBonus(bonus, '德州撲克');
      addLog(`🎰【敬酒光環・莊家加碼】荷官額外加碼賞金 +$${bonus.bonusAmount.toLocaleString()} 籌碼！`);
    }

    onUpdateBalance(balance + finalPayout);
    addLog(`🎉 電腦棄牌！玩家贏得彩池全部籌碼 $${pot}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}！`);

    // Check Hidden Bluff Collectible (Pot threshold >= 2000)
    if (pot >= 2000) {
      unlockHiddenCollectible('col-poker-bluff');
    }

    setWinToast({
      title: '🎉 電腦棄牌！',
      amount: finalPayout,
      extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
      description: `對手棄權，您奪得彩池 $${pot.toLocaleString()}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
      isWin: true,
    });

    setStats((prev) => ({
      ...prev,
      handsPlayed: prev.handsPlayed + 1,
      playerWins: prev.playerWins + 1,
      totalWon: prev.totalWon + pot,
      biggestPot: Math.max(prev.biggestPot, pot),
    }));

    setHistory((prev) => [
      {
        id: `poker-hist-${Date.now()}`,
        timestamp: new Date(),
        winner: 'ai_folded',
        pot,
        playerHandName: playerEval?.categoryName || '獲勝',
        aiHandName: '棄牌',
        playerNet: pot - playerTotalCommitted,
      },
      ...prev.slice(0, 49),
    ]);

    recordCareerRound({
      gameId: 'poker',
      betAmount: playerTotalCommitted,
      winAmount: pot,
    });

    setDealerButton((prev) => (prev === 'player' ? 'ai' : 'player'));
  };

  const progressAfterPlayerAction = () => {
    progressStreet(stage);
  };

  // ==================== SHOWDOWN & HAND COMPARISON ====================
  const handleShowdown = (finalCommunityParam?: PokerCard[], currentAiCardsParam?: PokerCard[]) => {
    setStage('showdown');

    const finalCommunity = finalCommunityParam || communityCardsRef.current;
    const currentAiCards = currentAiCardsParam || aiCardsRef.current;
    const finalPlayer = playerCardsRef.current;

    // Uncover AI cards
    const revealedAi = currentAiCards.map((c) => ({ ...c, isHidden: false }));
    aiCardsRef.current = revealedAi;
    setAiCards(revealedAi);

    // Strict integrity check: verify zero duplicates among player, AI, and community cards
    const allTableCards = [...finalPlayer, ...revealedAi, ...finalCommunity];
    const seenCards = new Set<string>();
    let duplicateDetected = false;
    for (const card of allTableCards) {
      const cardKey = `${card.suit}-${card.rank}`;
      if (seenCards.has(cardKey)) {
        duplicateDetected = true;
        console.error(`[CRITICAL POKER TABLE DUPLICATE] ${cardKey} appeared multiple times on table!`);
      }
      seenCards.add(cardKey);
    }
    if (duplicateDetected) {
      toastService.warn('⚠️ 牌桌偵測到異常重複牌，系統已啟動安全校驗！');
    }

    const allPlayer = [...finalPlayer, ...finalCommunity];
    const allAi = [...revealedAi, ...finalCommunity];

    const pResult = evaluateHoldemHand(allPlayer);
    const aResult = evaluateHoldemHand(allAi);

    setPlayerEval(pResult);
    setAiEval(aResult);

    const cmp = compareEvaluations(pResult, aResult);
    setShowdownComparison({ pEval: pResult, aEval: aResult, cmp, pot });

    // Highlight winning 5 cards
    const winIds = new Set<string>();
    if (cmp >= 0) {
      pResult.best5Cards.forEach((c) => winIds.add(c.id));
    }
    if (cmp <= 0) {
      aResult.best5Cards.forEach((c) => winIds.add(c.id));
    }
    setWinningCardIds(winIds);

    let winnerType: 'player' | 'ai' | 'split' = 'player';
    let netPayout = 0;

    if (cmp > 0) {
      // Player wins
      winnerType = 'player';
      sound.playWin();

      let finalPayout = pot;
      let bonusWon = 0;
      const bonus = checkHouseBonus(playerTotalCommitted);
      if (bonus.triggered) {
        bonusWon = bonus.bonusAmount;
        finalPayout += bonusWon;
        notifyHouseBonus(bonus, '德州撲克');
        addLog(`🎰【敬酒光環・莊家加碼】荷官額外加碼賞金 +$${bonus.bonusAmount.toLocaleString()} 籌碼！`);
      }

      netPayout = finalPayout;
      onUpdateBalance(balance + finalPayout);

      addLog(`🏆 攤牌結果：玩家【${pResult.categoryName}】擊敗電腦【${aResult.categoryName}】！`);
      addLog(`🎉 玩家獨得全部彩池 $${pot.toLocaleString()}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}！`);

      // Check Hidden Collectibles Silently (Differentiated triggers & Pot thresholds)
      if (pResult.category >= 8) {
        unlockHiddenCollectible('col-poker-royal');
      }
      if (pResult.category === 7 && pot >= 2000) {
        unlockHiddenCollectible('col-poker-fullhouse');
      }
      if (pResult.category === 6 && pot >= 3000) {
        unlockHiddenCollectible('col-poker-flush');
      }
      if (isAllInMode && pot >= 5000) {
        unlockHiddenCollectible('col-poker-allin');
      }
      if (!isAllInMode && communityCards.length === 5 && pot >= 5000) {
        unlockHiddenCollectible('col-poker-river');
      }

      setWinToast({
        title: `🏆 獲勝！${pResult.categoryName}`,
        amount: finalPayout,
        extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
        description: `擊敗電腦的【${aResult.categoryName}】，贏得 $${pot.toLocaleString()}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
        isWin: true,
      });
    } else if (cmp < 0) {
      // AI wins
      winnerType = 'ai';
      sound.playLoss();

      addLog(`❌ 攤牌結果：電腦【${aResult.categoryName}】擊敗玩家【${pResult.categoryName}】！`);
      addLog(`電腦贏得彩池 $${pot.toLocaleString()}。`);

      setWinToast({
        title: `電腦獲勝`,
        amount: 0,
        description: `電腦【${aResult.categoryName}】擊敗玩家【${pResult.categoryName}】`,
        isWin: false,
      });
    } else {
      // Split pot
      winnerType = 'split';
      const halfPot = Math.floor(pot / 2);
      netPayout = halfPot;
      onUpdateBalance(balance + halfPot);
      sound.playChip();

      addLog(`🤝 雙方平手 (Tie/Split)！牌型皆為【${pResult.categoryName}】，平分彩池各得 $${halfPot.toLocaleString()}`);

      setWinToast({
        title: `🤝 平分彩池 (Split)`,
        amount: halfPot,
        description: `雙方皆為【${pResult.categoryName}】，各分得 $${halfPot.toLocaleString()}`,
        isWin: true,
      });
    }

    // Update stats
    setStats((prev) => {
      const isPlayerWin = cmp > 0;
      const isSplit = cmp === 0;
      return {
        handsPlayed: prev.handsPlayed + 1,
        playerWins: isPlayerWin ? prev.playerWins + 1 : prev.playerWins,
        aiWins: cmp < 0 ? prev.aiWins + 1 : prev.aiWins,
        splits: isSplit ? prev.splits + 1 : prev.splits,
        totalWon: prev.totalWon + (isPlayerWin ? pot : isSplit ? Math.floor(pot / 2) : 0),
        biggestPot: Math.max(prev.biggestPot, pot),
        royalFlushCount:
          pResult.category === 10 ? prev.royalFlushCount + 1 : prev.royalFlushCount,
        straightFlushCount:
          pResult.category === 9 ? prev.straightFlushCount + 1 : prev.straightFlushCount,
        fourKindCount:
          pResult.category === 8 ? prev.fourKindCount + 1 : prev.fourKindCount,
      };
    });

    // Record history
    setHistory((prev) => [
      {
        id: `poker-hist-${Date.now()}`,
        timestamp: new Date(),
        winner: winnerType,
        pot,
        playerHandName: pResult.categoryName,
        aiHandName: aResult.categoryName,
        playerNet: netPayout - playerTotalCommitted,
      },
      ...prev.slice(0, 49),
    ]);

    recordCareerRound({
      gameId: 'poker',
      betAmount: playerTotalCommitted,
      winAmount: netPayout,
    });

    // Alternate dealer button for next hand
    setDealerButton((prev) => (prev === 'player' ? 'ai' : 'player'));
  };

  const isGameActive = stage !== 'idle' && stage !== 'showdown' && stage !== 'folded';

  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between gap-2.5 h-full overflow-y-auto">
      {/* 1. DEALER LOG & ACTION TERMINAL */}
      <div className={`${isDrawer ? 'h-[160px] max-h-[160px]' : 'h-[230px] max-h-[230px]'} shrink-0 rounded-xl bg-[#0a0f0d] border border-emerald-500/20 p-2.5 flex flex-col justify-between overflow-hidden shadow-lg`}>
        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40 shrink-0">
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-emerald-400">
            <History className="w-4 h-4" />
            <span>牌桌即時戰況 (Poker Log)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-stone-400 font-bold">
              1副牌 (52張) | 局數: {stats.handsPlayed} | 勝率:{' '}
              {stats.handsPlayed > 0
                ? Math.round((stats.playerWins / stats.handsPlayed) * 100)
                : 0}
              %
            </span>
            {!isDrawer && (
              <button
                onClick={() => setIsDesktopCollapsed(true)}
                className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                title="收起側邊欄"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed space-y-1.5 my-1 pr-1 text-stone-200">
          {dealerLogs.map((log, idx) => (
            <div
              key={idx}
              className={`py-0.5 px-1.5 rounded ${
                idx === 0
                  ? 'bg-emerald-950/60 border-l-2 border-emerald-400 text-emerald-200 font-bold'
                  : 'text-stone-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>

        {/* Quick Hand Rank Reference Pill */}
        <div className="pt-1.5 border-t border-emerald-900/40 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <span className="font-bold">牌型大小:</span>
          <span className="text-amber-400 font-black text-xs sm:text-sm">
            同花順 &gt; 鐵支 &gt; 葫蘆 &gt; 同花 &gt; 順子 &gt; 三條 &gt; 兩對 &gt; 一對
          </span>
        </div>
      </div>

      {/* 2. CHIP SELECTOR & STAKES SETUP */}
      <div className="rounded-xl bg-[#0a0f0d] border border-emerald-500/20 p-2 shadow-lg shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1 pb-1 border-b border-stone-800 min-h-[28px]">
          <span className="text-xs text-stone-300 font-bold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            {isGameActive ? '當前盲注:' : '盲注設定:'}
          </span>
          {!isGameActive ? (
            <div className="flex items-center gap-1">
              {DEFAULT_BLINDS.map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedBlindIdx(idx)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBlindIdx === idx
                      ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                      : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-700'
                  }`}
                >
                  {b.label} (${b.sb}/${b.bb})
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <span>{activeBlind.label}</span>
              <span className="text-stone-400 font-normal">(${activeBlind.sb}/${activeBlind.bb})</span>
            </div>
          )}
        </div>

        {/* Global Chip Selector */}
        <div className="w-full">
          <ChipSelector
            selectedChip={selectedChip}
            onSelectChip={onSelectChip}
            disabled={isAiThinking}
            balance={balance}
          />
        </div>
      </div>

      {/* 3. COMPACT INTERACTIVE POKER ACTION PANEL */}
      {isDrawer ? (
        /* In Drawer Safe Mode: ONLY Chip & Stake Switching with Mandatory Confirm Exit Button (No Bet Buttons) */
        <div className="rounded-xl bg-[#0c0e14] border border-amber-500/30 p-3 shadow-xl flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-stone-300 pb-2 border-b border-stone-800">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>安全防誤觸模式已啟用</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              目前選定: ${selectedChip.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed">
            此選單僅供切換籌碼幣值與盲注等級。請選定欲使用的籌碼面額後，點擊下方「確定退出」按鈕，返回牌桌即可進行跟注、過牌、加注或全押。
          </p>

          <button
            id="btn-poker-drawer-confirm"
            onClick={() => {
              sound.playChip();
              setIsDrawerOpen(false);
              toastService.info(`已設定下注籌碼面額：$${selectedChip.toLocaleString()}`);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 active:scale-98 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-stone-950" />
            <span>確定退出 (使用 ${selectedChip.toLocaleString()} 籌碼)</span>
          </button>
        </div>
      ) : (
        /* Desktop Only: Full Interactive Poker Action Panel */
        <div
          id="poker-controls"
          className="flex-1 min-h-[160px] rounded-xl bg-[#0a0f0d] border border-emerald-500/20 p-2.5 sm:p-3 shadow-lg flex flex-col justify-between gap-2 overflow-hidden"
        >
          {!isGameActive ? (
            <div className="h-full flex flex-col justify-between gap-2">
              <div className="shrink-0 min-h-[50px] max-h-[58px]">
                <button
                  id="btn-poker-deal"
                  onClick={handleStartHand}
                  className="w-full h-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-stone-950" />
                  <span>發牌開始新局 (DEAL - 盲注 ${activeBlind.sb}/${activeBlind.bb})</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-xl bg-stone-950/60 border border-emerald-500/20 p-2 text-center text-xs text-stone-400 gap-1">
                <span className="font-bold text-amber-300">德州撲克對決準備就緒</span>
                <p className="text-[11px] text-stone-500">
                  點擊上方「發牌」按鈕即可開局，系統自動扣除小盲/大盲注
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between gap-2">
              <div className="grid grid-cols-2 gap-2.5 shrink-0 min-h-[50px] max-h-[58px]">
                {callAmount === 0 ? (
                  <button
                    id="btn-poker-check"
                    onClick={handlePlayerCheck}
                    disabled={isAiThinking || isAllInMode}
                    className="h-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 text-white font-black text-[17px] sm:text-[19px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>過牌 (CHECK)</span>
                  </button>
                ) : (
                  <button
                    id="btn-poker-call"
                    onClick={handlePlayerCall}
                    disabled={isAiThinking || isAllInMode || balance < callAmount}
                    className="h-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-98 disabled:opacity-50 text-white font-black text-[17px] sm:text-[19px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-5 h-5 shrink-0" />
                    <span>跟注 ${callAmount.toLocaleString()}</span>
                  </button>
                )}

                <button
                  id="btn-poker-fold"
                  onClick={handlePlayerFold}
                  disabled={isAiThinking || isAllInMode}
                  className="h-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-rose-950 text-rose-400 border border-rose-800/60 active:scale-98 disabled:opacity-50 font-black text-[17px] sm:text-[19px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>棄牌 (FOLD)</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                <div className="flex items-center justify-between text-xs text-stone-400 font-bold px-0.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-black text-xs sm:text-sm">快捷加注:</span>
                    <span className="text-[11px] text-stone-500 font-normal">上限 $10,000 / 2x Pot</span>
                  </div>
                  <span className="font-mono text-stone-300 text-xs sm:text-sm font-bold">餘額: ${balance.toLocaleString()}</span>
                </div>

                <div
                  id="poker-raise-grid"
                  className="grid gap-2 flex-1 min-h-[96px]"
                  style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '8px' }}
                >
                  <div className="raise-stack flex flex-col justify-between h-full gap-1.5">
                    {/* 1. Min Raise */}
                    {(() => {
                      const minRaise = Math.min(maxSingleRaise, Math.max(activeBlind.bb, callAmount > 0 ? callAmount * 2 : activeBlind.bb));
                      const canAfford = balance >= callAmount + minRaise;
                      return (
                        <button
                          id="btn-poker-raise-min"
                          onClick={() => handlePlayerRaise(minRaise)}
                          disabled={isAiThinking || isAllInMode || !canAfford}
                          className="flex-1 py-1 px-3 rounded-xl bg-stone-900 hover:bg-amber-950/80 border border-amber-500/40 active:scale-98 disabled:opacity-40 shadow-xs transition-all cursor-pointer flex items-center justify-between text-left"
                        >
                          <span className="text-[14px] sm:text-[15px] font-black text-white tracking-tight">
                            Min Raise
                          </span>
                          <span className="text-xs sm:text-sm text-amber-300 font-mono font-bold">
                            (+${minRaise.toLocaleString()})
                          </span>
                        </button>
                      );
                    })()}

                    {/* 2. 1/2 Pot */}
                    {(() => {
                      const rawRaise = Math.max(activeBlind.bb, Math.floor(pot / 2));
                      const raiseHalfPot = Math.min(maxSingleRaise, rawRaise);
                      const canAfford = balance >= callAmount + raiseHalfPot;
                      return (
                        <button
                          id="btn-poker-raise-half-pot"
                          onClick={() => handlePlayerRaise(raiseHalfPot)}
                          disabled={isAiThinking || isAllInMode || !canAfford}
                          className="flex-1 py-1 px-3 rounded-xl bg-stone-900 hover:bg-amber-950/80 border border-amber-500/40 active:scale-98 disabled:opacity-40 shadow-xs transition-all cursor-pointer flex items-center justify-between text-left"
                        >
                          <span className="text-[14px] sm:text-[15px] font-black text-white tracking-tight">
                            1/2 Pot
                          </span>
                          <span className="text-xs sm:text-sm text-amber-300 font-mono font-bold">
                            (+${raiseHalfPot.toLocaleString()})
                          </span>
                        </button>
                      );
                    })()}

                    {/* 3. 1x Pot */}
                    {(() => {
                      const rawRaise = Math.max(activeBlind.bb, pot);
                      const raiseFullPot = Math.min(maxSingleRaise, rawRaise);
                      const canAfford = balance >= callAmount + raiseFullPot;
                      return (
                        <button
                          id="btn-poker-raise-pot"
                          onClick={() => handlePlayerRaise(raiseFullPot)}
                          disabled={isAiThinking || isAllInMode || !canAfford}
                          className="flex-1 py-1 px-3 rounded-xl bg-stone-900 hover:bg-amber-950/80 border border-amber-500/40 active:scale-98 disabled:opacity-40 shadow-xs transition-all cursor-pointer flex items-center justify-between text-left"
                        >
                          <span className="text-[14px] sm:text-[15px] font-black text-white tracking-tight">
                            1x Pot
                          </span>
                          <span className="text-xs sm:text-sm text-amber-300 font-mono font-bold">
                            (+${raiseFullPot.toLocaleString()})
                          </span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Right Column: Tall All-In Button */}
                  <button
                    id="btn-poker-raise-allin"
                    onClick={handlePlayerAllIn}
                    disabled={isAiThinking || isAllInMode || balance <= 0 || calculatedAllInAmount <= 0}
                    className="allin-tall-btn w-full h-full rounded-xl bg-gradient-to-b from-red-600 via-red-700 to-amber-700 hover:from-red-500 hover:to-amber-600 active:scale-98 disabled:opacity-40 border border-red-500/60 shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2 text-center"
                    style={{ height: '100%' }}
                  >
                    <span className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-1">
                      <span>🔥</span>
                      <span>All-In</span>
                    </span>
                    <span className="text-xs sm:text-sm text-amber-200 font-mono font-black drop-shadow-xs">
                      (${calculatedAllInAmount.toLocaleString()})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-3 overflow-hidden select-none relative">
      {/* ==================== LEFT VISUAL AREA ==================== */}
      <div
        id="game-visual-area"
        className="flex-1 min-w-0 w-full h-full rounded-2xl bg-gradient-to-b from-[#0b1710] via-[#06120a] to-[#030a05] border border-emerald-500/25 shadow-2xl p-2.5 sm:p-3 flex flex-col justify-between items-center relative overflow-hidden transition-all duration-300"
      >
        {/* Floating WinToast Notification */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* 0. TOP DECK & TABLE SPECIFICATIONS BAR */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/30 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-stone-200">1 副標準牌</span>
            <span className="text-[10px] text-stone-400 font-mono hidden xs:inline">（52張・無鬼牌）</span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              title="單副 52 張標準撲克，每局全新洗牌發牌"
            >
              {stage === 'idle'
                ? '開局洗牌 (52/52)'
                : `剩餘 ${deck.length} / 52 張`}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-stone-300">
            <div className="flex items-center gap-1 text-[10px] text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              <span>盲注:</span>
              <span className="font-bold">${activeBlind.sb}/${activeBlind.bb}</span>
            </div>
          </div>
        </div>

        {/* 1. TOP: COMPUTER DEALER / AI OPPONENT AREA */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/20 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-700 to-purple-900 border-2 border-indigo-400/60 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-indigo-200" />
              </div>
              {dealerButton === 'ai' && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] flex items-center justify-center shadow-md"
                  title="Dealer Button (莊家位)"
                >
                  D
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-stone-200">
                  AI 對手 (Poker Bot)
                </span>
                {isAiThinking && (
                  <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                    思考中...
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                本輪投入: ${aiRoundBet.toLocaleString()}
              </span>
            </div>
          </div>

          {/* AI Hole Cards View */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {aiCards.length === 2 ? (
              aiCards.map((c, idx) => (
                <PokerCardView
                  key={c.id}
                  card={c}
                  size="sm"
                  isHidden={stage !== 'showdown'}
                  isWinningCard={stage === 'showdown' && winningCardIds.has(c.id)}
                  delayMs={idx * 100}
                />
              ))
            ) : (
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-11 h-16 sm:w-12 sm:h-18 rounded-lg border border-dashed border-emerald-600/40 bg-emerald-950/20 flex items-center justify-center text-emerald-600 text-xs">
                  🂠
                </div>
                <div className="w-11 h-16 sm:w-12 sm:h-18 rounded-lg border border-dashed border-emerald-600/40 bg-emerald-950/20 flex items-center justify-center text-emerald-600 text-xs">
                  🂠
                </div>
              </div>
            )}

            {/* AI Showdown Evaluation Badge */}
            {aiEval && stage === 'showdown' && (
              <div className="ml-1.5 px-2 py-1 rounded-lg bg-indigo-950/90 border border-indigo-400 text-indigo-200 text-xs font-black shadow-md animate-in zoom-in-95">
                {aiEval.categoryName}
              </div>
            )}
          </div>
        </div>

        {/* 2. CENTER: CLASSIC TEXAS HOLD'EM FELT TABLE & 5 COMMUNITY CARDS */}
        <div className="relative w-full flex-1 my-1.5 rounded-3xl bg-gradient-to-b from-[#0e3a1f] via-[#092915] to-[#051a0d] border-8 border-[#3b2314] shadow-[inset_0_0_60px_rgba(0,0,0,0.85),0_15px_35px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden">
          {/* Table Stitched Felt Inner Ring */}
          <div className="absolute inset-2.5 rounded-2xl border border-emerald-400/20 pointer-events-none" />

          {/* Table Center Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="text-center font-serif text-amber-400">
              <div className="text-lg sm:text-2xl font-black tracking-widest uppercase">
                TEXAS HOLD'EM
              </div>
              <div className="text-[10px] tracking-widest text-emerald-300">
                1 DECK • 52 CARDS • HEADS-UP
              </div>
            </div>
          </div>

          {/* Table Top: Stage Banner & Pot Badge */}
          <div className="z-10 flex flex-col items-center gap-1.5">
            {/* Stage Pill */}
            <div className="px-3 py-0.5 rounded-full bg-black/60 border border-emerald-500/40 text-[10px] sm:text-xs font-black tracking-widest text-amber-300 uppercase shadow-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>
                {stage === 'idle'
                  ? '等待開局'
                  : stage === 'preflop'
                  ? '翻牌前 PRE-FLOP'
                  : stage === 'flop'
                  ? '翻牌圈 FLOP'
                  : stage === 'turn'
                  ? '轉牌圈 TURN'
                  : stage === 'river'
                  ? '河牌圈 RIVER'
                  : stage === 'showdown'
                  ? '攤牌 SHOWDOWN'
                  : '已棄牌 FOLDED'}
              </span>
            </div>

            {/* Glowing Pot Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-950/90 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <CasinoChip amount={pot || 0} size="xs" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                  總彩池 (POT)
                </span>
                <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                  ${pot.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Center Community Cards & Showdown Two-Row Felt Display */}
          {stage === 'showdown' && playerEval && aiEval ? (
            <div
              id="poker-showdown-two-rows"
              className="z-10 flex flex-col items-center justify-center gap-2 sm:gap-3 my-auto w-full max-w-2xl px-2 animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Row 1: AI (Computer) Best 5 Cards */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-indigo-500/40 text-[11px] font-bold text-indigo-200 shadow-sm">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span>電腦最佳組合: <b className="text-white">{aiEval.categoryName}</b></span>
                  </span>
                  {compareEvaluations(playerEval, aiEval) < 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black border border-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.5)]">
                      🏆 勝出
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                  {aiEval.best5Cards.map((card, idx) => (
                    <PokerCardView
                      key={`ai-best5-${card.id}-${idx}`}
                      card={card}
                      size="md"
                      isWinningCard={compareEvaluations(playerEval, aiEval) <= 0}
                    />
                  ))}
                </div>
              </div>

              {/* Felt Dividing Line & Outcome Pill */}
              <div className="flex items-center gap-2 w-full justify-center my-0.5">
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent flex-1 max-w-[80px]" />
                <span className="px-3 py-0.5 rounded-full bg-stone-950/85 border border-amber-500/40 text-[10px] sm:text-[11px] font-bold text-amber-200 font-mono shadow-md">
                  {compareEvaluations(playerEval, aiEval) > 0
                    ? `🎉 玩家【${playerEval.categoryName}】勝出，獨得 $${pot.toLocaleString()}！`
                    : compareEvaluations(playerEval, aiEval) < 0
                    ? `❌ 電腦【${aiEval.categoryName}】勝出`
                    : `🤝 雙方平手，平分彩池各得 $${Math.floor(pot / 2).toLocaleString()}`}
                </span>
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent flex-1 max-w-[80px]" />
              </div>

              {/* Row 2: Player Best 5 Cards */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-amber-400/50 text-[11px] font-bold text-amber-200 shadow-sm">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>玩家最佳組合: <b className="text-amber-300">{playerEval.categoryName}</b></span>
                  </span>
                  {compareEvaluations(playerEval, aiEval) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black border border-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce">
                      🏆 獲勝
                    </span>
                  )}
                  {compareEvaluations(playerEval, aiEval) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black border border-blue-300">
                      🤝 平手 (Split)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                  {playerEval.best5Cards.map((card, idx) => (
                    <PokerCardView
                      key={`p-best5-${card.id}-${idx}`}
                      card={card}
                      size="md"
                      isWinningCard={compareEvaluations(playerEval, aiEval) >= 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="z-10 flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 my-auto">
              {/* Slot 1, 2, 3: FLOP */}
              {[0, 1, 2].map((idx) => {
                const card = communityCards[idx] || null;
                return (
                  <PokerCardView
                    key={`flop-${idx}`}
                    card={card}
                    size="md"
                    isWinningCard={card ? winningCardIds.has(card.id) : false}
                    delayMs={idx * 80}
                  />
                );
              })}

              {/* Divider spacer between Flop, Turn, River */}
              <div className="w-0.5 h-12 bg-emerald-700/40 rounded-full mx-0.5 sm:mx-1 hidden sm:block" />

              {/* Slot 4: TURN */}
              <PokerCardView
                card={communityCards[3] || null}
                size="md"
                isWinningCard={communityCards[3] ? winningCardIds.has(communityCards[3].id) : false}
              />

              <div className="w-0.5 h-12 bg-emerald-700/40 rounded-full mx-0.5 sm:mx-1 hidden sm:block" />

              {/* Slot 5: RIVER */}
              <PokerCardView
                card={communityCards[4] || null}
                size="md"
                isWinningCard={communityCards[4] ? winningCardIds.has(communityCards[4].id) : false}
              />
            </div>
          )}

          {/* AI Dialogue & Psychological Tells Pill */}
          {aiThoughtBubble && isGameActive && (
            <div
              className={`z-10 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 flex items-center gap-2 max-w-[90%] ${
                aiIsBluffing
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-amber-500/20'
                  : 'bg-indigo-950/90 border-indigo-400 text-indigo-100 shadow-indigo-500/20'
              }`}
            >
              <span className="text-sm">🤖</span>
              <span className="truncate">{aiThoughtBubble}</span>
              {aiIsBluffing && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/30 text-amber-300 font-mono">
                  思考較久
                </span>
              )}
            </div>
          )}

          {/* Quick Odds & Hand Rank Preview under Felt */}
          <div className="w-full flex items-center justify-between text-[10px] text-emerald-400/80 font-mono pt-1">
            <span>小盲: ${activeBlind.sb} / 大盲: ${activeBlind.bb} • 牌副: 1副 (52張)</span>
            <span>莊家: {dealerButton === 'player' ? '玩家' : '電腦'}</span>
          </div>
        </div>

        {/* 3. BOTTOM: PLAYER AREA */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/20 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 border-2 border-amber-400 flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-amber-200" />
              </div>
              {dealerButton === 'player' && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] flex items-center justify-center shadow-md"
                  title="Dealer Button (莊家位)"
                >
                  D
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-amber-300">
                  玩家 (YOU)
                </span>
                {playerEval && (
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold">
                    {playerEval.categoryName}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-stone-300">
                本輪已下注: ${playerRoundBet.toLocaleString()} | 總投入: ${playerTotalCommitted.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Player Hole Cards */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {playerCards.length === 2 ? (
              playerCards.map((c, idx) => (
                <PokerCardView
                  key={c.id}
                  card={c}
                  size="md"
                  isWinningCard={winningCardIds.has(c.id)}
                  delayMs={idx * 100}
                />
              ))
            ) : (
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-13 h-18 sm:w-14 sm:h-20 rounded-lg border border-dashed border-amber-600/40 bg-amber-950/20 flex items-center justify-center text-amber-600 text-xs">
                  🂠
                </div>
                <div className="w-13 h-18 sm:w-14 sm:h-20 rounded-lg border border-dashed border-amber-600/40 bg-amber-950/20 flex items-center justify-center text-amber-600 text-xs">
                  🂠
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile & Tablet Compact Action Dock */}
        <div className="lg:hidden w-full mt-2 pt-2 border-t border-emerald-500/20 flex flex-col gap-2 z-20">
          {!isGameActive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
                title="切換盲注與籌碼面額 (防誤觸選單)"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>盲注 (${activeBlind.sb}/${activeBlind.bb})</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-2.5 py-2.5 rounded-xl bg-stone-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
                title="切換籌碼幣值 (防誤觸選單)"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>籌碼 ${selectedChip.toLocaleString()}</span>
              </button>

              <button
                id="btn-poker-deal-mobile"
                onClick={handleStartHand}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 font-black text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>發牌開始新局</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* Top Info Bar: Chip switcher & Pot/Call status */}
              <div className="flex items-center justify-between px-0.5">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  title="切換籌碼幣值 (安全防誤觸模式)"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>籌碼: ${selectedChip.toLocaleString()}</span>
                  <ChevronUp className="w-3 h-3 text-stone-400" />
                </button>

                <div className="flex items-center gap-2 font-mono text-xs text-stone-300 font-bold">
                  <span>底池: <b className="text-amber-400">${pot.toLocaleString()}</b></span>
                  <span>跟注: <b className="text-white">${callAmount.toLocaleString()}</b></span>
                </div>
              </div>

              {/* Row 1: Check/Call & Fold */}
              <div className="flex items-center gap-2">
                {callAmount === 0 ? (
                  <button
                    id="btn-poker-check-mobile"
                    onClick={handlePlayerCheck}
                    disabled={isAiThinking || isAllInMode}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 text-white font-black text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>過牌 (Check)</span>
                  </button>
                ) : (
                  <button
                    id="btn-poker-call-mobile"
                    onClick={handlePlayerCall}
                    disabled={isAiThinking || isAllInMode || balance < callAmount}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 active:scale-98 disabled:opacity-50 text-white font-black text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 shrink-0" />
                    <span className="truncate">跟注 ${callAmount.toLocaleString()}</span>
                  </button>
                )}

                <button
                  id="btn-poker-fold-mobile"
                  onClick={handlePlayerFold}
                  disabled={isAiThinking || isAllInMode}
                  className="py-2 px-4 rounded-xl bg-stone-900 hover:bg-rose-950 text-rose-400 border border-rose-800/60 active:scale-98 disabled:opacity-50 font-black text-sm shadow-md flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>棄牌 (Fold)</span>
                </button>
              </div>

              {/* Row 2: Quick Raises on Table Felt */}
              <div className="grid grid-cols-4 gap-1.5">
                {(() => {
                  const minRaise = Math.min(maxSingleRaise, Math.max(activeBlind.bb, callAmount > 0 ? callAmount * 2 : activeBlind.bb));
                  const canAfford = balance >= callAmount + minRaise;
                  return (
                    <button
                      id="btn-poker-raise-min-mobile"
                      onClick={() => handlePlayerRaise(minRaise)}
                      disabled={isAiThinking || isAllInMode || !canAfford}
                      className="py-1.5 px-1 rounded-lg bg-stone-900 hover:bg-amber-950 border border-amber-500/40 text-xs font-bold text-white disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span className="text-[11px] text-stone-300">Min</span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold">+${minRaise.toLocaleString()}</span>
                    </button>
                  );
                })()}

                {(() => {
                  const rawRaise = Math.max(activeBlind.bb, Math.floor(pot / 2));
                  const raiseHalfPot = Math.min(maxSingleRaise, rawRaise);
                  const canAfford = balance >= callAmount + raiseHalfPot;
                  return (
                    <button
                      id="btn-poker-raise-half-mobile"
                      onClick={() => handlePlayerRaise(raiseHalfPot)}
                      disabled={isAiThinking || isAllInMode || !canAfford}
                      className="py-1.5 px-1 rounded-lg bg-stone-900 hover:bg-amber-950 border border-amber-500/40 text-xs font-bold text-white disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span className="text-[11px] text-stone-300">1/2 Pot</span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold">+${raiseHalfPot.toLocaleString()}</span>
                    </button>
                  );
                })()}

                {(() => {
                  const rawRaise = Math.max(activeBlind.bb, pot);
                  const raiseFullPot = Math.min(maxSingleRaise, rawRaise);
                  const canAfford = balance >= callAmount + raiseFullPot;
                  return (
                    <button
                      id="btn-poker-raise-pot-mobile"
                      onClick={() => handlePlayerRaise(raiseFullPot)}
                      disabled={isAiThinking || isAllInMode || !canAfford}
                      className="py-1.5 px-1 rounded-lg bg-stone-900 hover:bg-amber-950 border border-amber-500/40 text-xs font-bold text-white disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span className="text-[11px] text-stone-300">1x Pot</span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold">+${raiseFullPot.toLocaleString()}</span>
                    </button>
                  );
                })()}

                <button
                  id="btn-poker-raise-allin-mobile"
                  onClick={handlePlayerAllIn}
                  disabled={isAiThinking || isAllInMode || balance <= 0 || calculatedAllInAmount <= 0}
                  className="py-1.5 px-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-700 hover:from-red-500 text-xs font-black text-white disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center shadow-xs cursor-pointer"
                >
                  <span className="text-[11px] text-white">🔥 All-In</span>
                  <span className="text-[10px] font-mono text-amber-200 font-bold">${calculatedAllInAmount.toLocaleString()}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== DESKTOP COLLAPSIBLE RIGHT COLUMN ==================== */}
      {isDesktopCollapsed ? (
        <div className="hidden lg:flex flex-col items-center justify-between py-4 px-1.5 rounded-2xl bg-[#0a0f0d] border border-emerald-500/20 shadow-xl w-11 shrink-0 transition-all duration-300">
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="p-1.5 rounded-lg bg-stone-900 text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-colors cursor-pointer"
            title="展開控制面板"
          >
            <PanelRightOpen className="w-5 h-5 text-amber-400" />
          </button>
          <div className="writing-vertical text-xs font-bold text-stone-400 tracking-widest uppercase my-auto select-none py-4">
            德州撲克控制台
          </div>
          <div className="text-[10px] font-mono text-emerald-400 font-bold">
            ${pot.toLocaleString()}
          </div>
        </div>
      ) : (
        <div
          id="poker-right-panel"
          className="hidden lg:flex w-[38%] xl:w-[35%] h-full flex-col justify-between gap-2.5 overflow-hidden transition-all duration-300"
        >
          {renderSidebarContent(false)}
        </div>
      )}

      {/* ==================== MOBILE & TABLET SLIDE-UP DRAWER ==================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-h-[85vh] rounded-t-3xl bg-[#0a0f0d] border-t border-x border-emerald-500/30 p-4 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            {/* Drawer Drag handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-stone-200">德州撲克控制選單</span>
                <span className="text-xs font-mono text-emerald-400">
                  彩池: ${pot.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {renderSidebarContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
