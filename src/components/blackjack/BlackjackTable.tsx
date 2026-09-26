import React, { useState, useEffect, useRef } from 'react';
import { Card, GamePhase, Hand, RoundResult, BlackjackStats } from '../../types/blackjack';
import {
  createSixDeckShoe,
  calculateHand,
  evaluateRoundOutcome,
  evaluateSurrenderOutcome,
  evaluateInsuranceResult,
  evaluateSplitRoundOutcome,
  TOTAL_SHOE_CARDS,
  SHOE_RESHUFFLE_THRESHOLD,
} from '../../utils/blackjack';
import { sound } from '../../utils/audio';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { isTurboMode } from '../../utils/turbo';
import { PlayingCard } from './PlayingCard';
import { CasinoChip } from '../common/CasinoChip';
import { ChipSelector } from '../ChipSelector';
import { WinToast, WinToastData } from '../common/WinToast';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import {
  Layers,
  Sparkles,
  RotateCcw,
  Plus,
  Hand as HandIcon,
  Shield,
  Trophy,
  History,
  Calculator,
  TrendingUp,
  Flame,
  Split,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Undo2,
  Copy,
  XCircle,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
} from 'lucide-react';

interface BlackjackTableProps {
  balance: number;
  onUpdateBalance: (newBalance: number | ((prev: number) => number)) => void;
  selectedChip?: number;
  onSelectChip?: (chip: number) => void;
  onResetBalance?: () => void;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEYS = {
  BJ_SHOE: 'blackjack_shoe_v1',
  BJ_STATS: 'blackjack_stats_v1',
  BJ_PREV_BET: 'blackjack_prev_bet_v1',
  BJ_HISTORY: 'blackjack_history_v1',
};

export interface BlackjackHandRecord {
  id: string;
  outcome: string;
  playerScore: number;
  dealerScore: number;
  bet: number;
  netProfit: number;
  isBlackjack?: boolean;
  timestamp: number;
}

const CHIP_VALUES = [50, 100, 500, 1000, 5000, 25000];

export const BlackjackTable: React.FC<BlackjackTableProps> = ({
  balance,
  onUpdateBalance,
  selectedChip = 100,
  onSelectChip,
  onRoundBusyChange,
}) => {
  // Shoe state (6 decks = 312 cards)
  const [shoe, setShoe] = useState<Card[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BJ_SHOE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return createSixDeckShoe();
  });

  // Save shoe state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BJ_SHOE, JSON.stringify(shoe));
  }, [shoe]);

  // Current Bet on table
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [lastRoundBet, setLastRoundBet] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BJ_PREV_BET);
    return saved ? parseInt(saved, 10) || 100 : 100;
  });
  const [betHistoryStack, setBetHistoryStack] = useState<number[]>([]);

  // Game phase
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [isDouble, setIsDouble] = useState(false);

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Split hands state
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [splitHand, setSplitHand] = useState<Hand | null>(null);
  const [activeHandIndex, setActiveHandIndex] = useState<0 | 1>(0);

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);
  const [splitBet, setSplitBet] = useState<number>(0);
  const [isHand1Double, setIsHand1Double] = useState<boolean>(false);
  const [isHand2Double, setIsHand2Double] = useState<boolean>(false);

  // Insurance state
  const [insuranceBet, setInsuranceBet] = useState<number>(0);
  const [isInsuranceBought, setIsInsuranceBought] = useState<boolean>(false);

  // Side Tab: 'history' (近局牌路與路紙) | 'counter' (Hi-Lo 算牌計數與優勢)
  const [sideTab, setSideTab] = useState<'history' | 'counter'>('history');

  // Hands
  const [playerHand, setPlayerHand] = useState<Hand>({
    cards: [],
    score: 0,
    isSoft: false,
    isBusted: false,
    isBlackjack: false,
  });

  const [dealerHand, setDealerHand] = useState<Hand>({
    cards: [],
    score: 0,
    isSoft: false,
    isBusted: false,
    isBlackjack: false,
  });

  // Round result
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [isShufflingModal, setIsShufflingModal] = useState(false);
  const [winToast, setWinToast] = useState<WinToastData | null>(null);

  // Recent hands history
  const [recentHands, setRecentHands] = useState<BlackjackHandRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BJ_HISTORY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BJ_HISTORY, JSON.stringify(recentHands));
  }, [recentHands]);

  // Sync active round status to parent for clean settlement and forfeit warning
  useEffect(() => {
    const isBusy = (phase !== 'betting' && phase !== 'settled') || (phase === 'betting' && currentBet > 0);
    const totalBetAtStake = phase === 'settled' ? 0 : (currentBet + splitBet + insuranceBet);
    onRoundBusyChange?.(isBusy, totalBetAtStake);
  }, [phase, currentBet, splitBet, insuranceBet, onRoundBusyChange]);

  // Statistics
  const [stats, setStats] = useState<BlackjackStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BJ_STATS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      handsPlayed: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      blackjacks: 0,
      highestWin: 0,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BJ_STATS, JSON.stringify(stats));
  }, [stats]);

  // Listen to global casino reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({
        handsPlayed: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        blackjacks: 0,
        highestWin: 0,
      });
      setRecentHands([]);
      setCurrentBet(0);
      setLastRoundBet(100);
      setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
      setPlayerHand({
        cards: [],
        score: 0,
        isSoft: false,
        isBusted: false,
        isBlackjack: false,
      });
      setPhase('betting');
      setRoundResult(null);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, []);

  // Ref to prevent race conditions during dealer turn
  const isDealerDrawingRef = useRef(false);

  // Helper to draw a card from shoe
  const drawCard = (currentShoe: Card[], isHidden = false): { card: Card; newShoe: Card[] } => {
    let activeShoe = currentShoe;
    if (activeShoe.length === 0) {
      activeShoe = createSixDeckShoe();
    }
    const [card, ...rest] = activeShoe;
    return {
      card: { ...card, isHidden },
      newShoe: rest,
    };
  };

  // Place bet on the betting circle
  const handlePlaceBet = (amount?: number) => {
    if (phase !== 'betting') return;
    const betAmount = amount || selectedChip;
    if (balance < betAmount) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足！');
      return;
    }
    const newBet = currentBet + betAmount;
    setBetHistoryStack((prev) => [...prev, betAmount]);
    onRoundBusyChange?.(true, newBet);
    sound.playChip();
    onUpdateBalance(balance - betAmount);
    setCurrentBet(newBet);
    dispatchBetAction({ gameId: 'blackjack', betType: 'bet', amount: betAmount });
  };

  // Remove/refund bet on spot (Right-click or undo)
  const handleRemoveBetSpot = (removeAmount?: number) => {
    if (phase !== 'betting' || currentBet === 0) return;
    const amtToRemove = removeAmount || selectedChip;
    const actualRefund = Math.min(amtToRemove, currentBet);
    sound.playClick();
    onUpdateBalance(balance + actualRefund);
    const newBet = currentBet - actualRefund;
    setCurrentBet(newBet);
    onRoundBusyChange?.(newBet > 0, newBet);

    // deduct from stack
    setBetHistoryStack((prev) => {
      let remainingToDeduct = actualRefund;
      const nextStack = [...prev];
      while (nextStack.length > 0 && remainingToDeduct > 0) {
        const top = nextStack[nextStack.length - 1];
        if (top <= remainingToDeduct) {
          remainingToDeduct -= top;
          nextStack.pop();
        } else {
          nextStack[nextStack.length - 1] = top - remainingToDeduct;
          remainingToDeduct = 0;
        }
      }
      return nextStack;
    });
  };

  // Step-by-step undo of last placed bet
  const handleUndoBet = () => {
    if (phase !== 'betting' || betHistoryStack.length === 0 || currentBet === 0) return;
    const lastAmt = betHistoryStack[betHistoryStack.length - 1];
    setBetHistoryStack((prev) => prev.slice(0, -1));
    const refundAmt = Math.min(lastAmt, currentBet);
    sound.playClick();
    onUpdateBalance(balance + refundAmt);
    const newBet = currentBet - refundAmt;
    setCurrentBet(newBet);
    onRoundBusyChange?.(newBet > 0, newBet);
  };

  // Handle clicking a chip in ChipSelector tray or quick chip pills
  const handleChipClick = (amount: number) => {
    onSelectChip?.(amount);
    if (phase === 'round_over') {
      setPhase('betting');
      handlePlaceBet(amount);
    } else if (phase === 'betting') {
      handlePlaceBet(amount);
    }
  };

  // Clear current bet
  const handleClearBet = () => {
    if (phase !== 'betting' || currentBet === 0) return;
    onRoundBusyChange?.(false, 0);
    sound.playClick();
    onUpdateBalance(balance + currentBet);
    setCurrentBet(0);
    setBetHistoryStack([]);
  };

  // Double current placed bet before deal
  const handleDoublePlacedBet = () => {
    if (phase !== 'betting' || currentBet === 0) return;
    if (balance < currentBet) {
      toastService.warn('籌碼不足以加倍！');
      return;
    }
    const newBet = currentBet * 2;
    onRoundBusyChange?.(true, newBet);
    sound.playChip();
    onUpdateBalance(balance - currentBet);
    setCurrentBet(newBet);
    dispatchBetAction({ gameId: 'blackjack', betType: 'double_placed', amount: currentBet });
  };

  // Rebet previous round amount
  const handleRebet = () => {
    if (phase !== 'betting') return;
    if (lastRoundBet <= 0) return;
    if (balance + currentBet < lastRoundBet) {
      toastService.warn('籌碼不足以重複上一輪下注額度！');
      return;
    }
    onRoundBusyChange?.(true, lastRoundBet);
    sound.playChip();
    // refund current bet if any
    const refundedBalance = balance + currentBet;
    onUpdateBalance(refundedBalance - lastRoundBet);
    setCurrentBet(lastRoundBet);
    dispatchBetAction({ gameId: 'blackjack', betType: 'rebet', amount: lastRoundBet });
  };

  // Perform Manual Reshuffle
  const performShuffle = () => {
    sound.playShuffle();
    setIsShufflingModal(true);
    setTimeout(() => {
      const newShoe = createSixDeckShoe();
      setShoe(newShoe);
      setIsShufflingModal(false);
    }, 1200);
  };

  // Check and trigger auto reshuffle if remaining < threshold
  const checkReshuffleAfterSettlement = (remainingShoe: Card[]) => {
    if (remainingShoe.length < SHOE_RESHUFFLE_THRESHOLD) {
      setTimeout(() => {
        sound.playShuffle();
        setIsShufflingModal(true);
        setTimeout(() => {
          const freshShoe = createSixDeckShoe();
          setShoe(freshShoe);
          setIsShufflingModal(false);
        }, 1400);
      }, 900);
    }
  };

  // Start Deal
  const handleDeal = () => {
    if (phase !== 'betting' || currentBet === 0) {
      toastService.warn('請先在下注區放置籌碼！');
      return;
    }

    setLastRoundBet(currentBet);
    localStorage.setItem(STORAGE_KEYS.BJ_PREV_BET, currentBet.toString());
    setBetHistoryStack([]);

    setPhase('dealing');
    setRoundResult(null);
    setWinToast(null);
    setIsDouble(false);
    setIsSplit(false);
    setSplitHand(null);
    setActiveHandIndex(0);
    setSplitBet(0);
    setIsHand1Double(false);
    setIsHand2Double(false);
    setInsuranceBet(0);
    setIsInsuranceBought(false);

    let activeShoe = [...shoe];
    if (activeShoe.length < 10) {
      activeShoe = createSixDeckShoe();
    }

    sound.playCardDeal();

    // 1st Player card
    const d1 = drawCard(activeShoe, false);
    const pCard1 = d1.card;
    activeShoe = d1.newShoe;

    // 1st Dealer card (face up)
    const d2 = drawCard(activeShoe, false);
    const dCard1 = d2.card;
    activeShoe = d2.newShoe;

    // 2nd Player card
    const d3 = drawCard(activeShoe, false);
    const pCard2 = d3.card;
    activeShoe = d3.newShoe;

    // 2nd Dealer card (face down hole card)
    const d4 = drawCard(activeShoe, true);
    const dCard2 = d4.card;
    activeShoe = d4.newShoe;

    setShoe(activeShoe);

    const initialPlayerHand = calculateHand([pCard1, pCard2]);
    const initialDealerHand = calculateHand([dCard1, dCard2]);

    setPlayerHand(initialPlayerHand);
    setDealerHand(initialDealerHand);

    // After dealing animation delay, check dealer upcard & immediate natural Blackjack
    setTimeout(() => {
      sound.playCardFlip();

      // If dealer upcard is Ace, prompt Insurance
      if (dCard1.rank === 'A') {
        setPhase('insurance');
      } else {
        // Dealer not Ace: check immediate natural Blackjack
        if (initialPlayerHand.isBlackjack) {
          const revealedDealerCards = [dCard1, { ...dCard2, isHidden: false }];
          const finalDealerHand = calculateHand(revealedDealerCards);
          setDealerHand(finalDealerHand);

          const result = evaluateRoundOutcome(initialPlayerHand, finalDealerHand, currentBet, false);
          settleRound(result, activeShoe);
        } else {
          setPhase('player_turn');
        }
      }
    }, isTurboMode() ? 200 : 600);
  };

  // Buyer accepts Insurance
  const handleBuyInsurance = () => {
    if (phase !== 'insurance') return;
    const cost = Math.floor(currentBet / 2);
    if (balance < cost) {
      toastService.warn('籌碼餘額不足以購買保險！');
      return;
    }

    onRoundBusyChange?.(true, currentBet + cost);
    sound.playChip();
    onUpdateBalance(balance - cost);
    setInsuranceBet(cost);
    setIsInsuranceBought(true);

    // Check dealer hole card
    const dealerHoleCard = dealerHand.cards[1];
    const isDealerBlackjack = dealerHoleCard && ['10', 'J', 'Q', 'K'].includes(dealerHoleCard.rank);

    if (isDealerBlackjack) {
      sound.playCardFlip();
      const revealed = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
      const finalDealerHand = calculateHand(revealed);
      setDealerHand(finalDealerHand);

      const insRes = evaluateInsuranceResult(cost, true);
      if (playerHand.isBlackjack) {
        // Push on main bet + Win on insurance
        const res: RoundResult = {
          outcome: 'player_blackjack',
          title: '🛡️ 雙方 Blackjack & 保險 2:1 獲勝！',
          description: `莊家擁有 Blackjack，主注平手退回 $${currentBet.toLocaleString()}，保險獲利 +$${insRes.netProfit.toLocaleString()}`,
          payout: currentBet + insRes.payout,
          netProfit: insRes.netProfit,
          isDouble: false,
        };
        settleRound(res, shoe);
      } else {
        // Main bet lost, insurance won (2:1, pays 3x cost)
        const netProfit = insRes.payout - currentBet - cost;
        const res: RoundResult = {
          outcome: netProfit >= 0 ? 'player_win' : 'dealer_win',
          title: '🛡️ 莊家 Blackjack！保險成功賠付',
          description: `莊家底牌為 10 點牌，主注失利，但保險以 2:1 賠付 $${insRes.payout.toLocaleString()}`,
          payout: insRes.payout,
          netProfit,
          isDouble: false,
        };
        settleRound(res, shoe);
      }
    } else {
      toastService.info('莊家底牌不是 10 點牌，保險未中。繼續手牌操作！');
      if (playerHand.isBlackjack) {
        const revealed = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
        const finalDealerHand = calculateHand(revealed);
        setDealerHand(finalDealerHand);

        const res = evaluateRoundOutcome(playerHand, finalDealerHand, currentBet, false);
        settleRound(res, shoe);
      } else {
        setPhase('player_turn');
      }
    }
  };

  // Buyer declines Insurance
  const handleSkipInsurance = () => {
    if (phase !== 'insurance') return;
    sound.playClick();

    const dealerHoleCard = dealerHand.cards[1];
    const isDealerBlackjack = dealerHoleCard && ['10', 'J', 'Q', 'K'].includes(dealerHoleCard.rank);

    if (isDealerBlackjack) {
      sound.playCardFlip();
      const revealed = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
      const finalDealerHand = calculateHand(revealed);
      setDealerHand(finalDealerHand);

      const res = evaluateRoundOutcome(playerHand, finalDealerHand, currentBet, false);
      settleRound(res, shoe);
    } else {
      if (playerHand.isBlackjack) {
        const revealed = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
        const finalDealerHand = calculateHand(revealed);
        setDealerHand(finalDealerHand);

        const res = evaluateRoundOutcome(playerHand, finalDealerHand, currentBet, false);
        settleRound(res, shoe);
      } else {
        setPhase('player_turn');
      }
    }
  };

  // Split eligibility
  const canSplit =
    phase === 'player_turn' &&
    !isSplit &&
    playerHand.cards.length === 2 &&
    (playerHand.cards[0].value === playerHand.cards[1].value ||
      playerHand.cards[0].rank === playerHand.cards[1].rank) &&
    balance >= currentBet;

  // Surrender eligibility
  const canSurrender = phase === 'player_turn' && !isSplit && playerHand.cards.length === 2;

  // Player Split Action
  const handleSplit = () => {
    if (!canSplit) return;

    onRoundBusyChange?.(true, currentBet * 2);
    sound.playChip();
    onUpdateBalance(balance - currentBet);
    dispatchBetAction({ gameId: 'blackjack', betType: 'split', amount: currentBet });

    setIsSplit(true);
    setSplitBet(currentBet);

    const card1 = playerHand.cards[0];
    const card2 = playerHand.cards[1];
    const isAceSplit = card1.rank === 'A';

    sound.playCardDeal();
    // Deal 1 card to Hand 1
    const d1 = drawCard(shoe, false);
    const h1 = calculateHand([card1, d1.card]);
    setPlayerHand(h1);

    if (isAceSplit) {
      // Split Aces rule: Deal exactly 1 card to Hand 2, then automatically stand both hands
      const d2 = drawCard(d1.newShoe, false);
      const h2 = calculateHand([card2, d2.card]);
      setSplitHand(h2);
      setShoe(d2.newShoe);

      toastService.info('分牌 Ace 規則：每手僅補一張牌，自動進入莊家回合！');
      setTimeout(() => {
        handleDealerTurnForSplit(h1, h2, d2.newShoe, false, false, currentBet, currentBet);
      }, 800);
    } else {
      const h2 = calculateHand([card2]);
      setSplitHand(h2);
      setShoe(d1.newShoe);
      setActiveHandIndex(0);

      if (h1.score === 21) {
        toastService.success('手牌 1 達到 21 點！切換至手牌 2');
        setTimeout(() => {
          advanceToHand2(h1, d1.newShoe, currentBet, currentBet, false, false);
        }, 800);
      }
    }
  };

  // Switch to Hand 2 and deal its second card
  const advanceToHand2 = (
    currentH1: Hand,
    currentShoe: Card[],
    bet1: number,
    bet2: number,
    h1Double: boolean,
    h2Double: boolean
  ) => {
    setActiveHandIndex(1);
    sound.playCardDeal();
    const d = drawCard(currentShoe, false);
    setShoe(d.newShoe);

    const baseHand2 = splitHand?.cards.length ? splitHand.cards : [playerHand.cards[1]];
    const updatedH2 = calculateHand([...baseHand2, d.card]);
    setSplitHand(updatedH2);

    if (updatedH2.score === 21) {
      toastService.success('手牌 2 達到 21 點！自動進入莊家回合');
      setTimeout(() => {
        handleDealerTurnForSplit(currentH1, updatedH2, d.newShoe, h1Double, h2Double, bet1, bet2);
      }, 800);
    }
  };

  // Player Surrender Action
  const handleSurrender = () => {
    if (!canSurrender) return;
    sound.playLoss();

    const revealedCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
    const finalDealerHand = calculateHand(revealedCards);
    setDealerHand(finalDealerHand);

    const result = evaluateSurrenderOutcome(currentBet);
    settleRound(result, shoe);
  };

  // Player Hit
  const handleHit = () => {
    if (phase !== 'player_turn') return;
    sound.playCardDeal();

    if (!isSplit) {
      const { card, newShoe } = drawCard(shoe, false);
      setShoe(newShoe);

      const updatedCards = [...playerHand.cards, card];
      const updatedHand = calculateHand(updatedCards);
      setPlayerHand(updatedHand);

      if (updatedHand.isBusted) {
        sound.playLoss();
        const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
        const finalDealerHand = calculateHand(revealedDealerCards);
        setDealerHand(finalDealerHand);

        const result = evaluateRoundOutcome(updatedHand, finalDealerHand, currentBet, isDouble);
        settleRound(result, newShoe);
      } else if (updatedHand.cards.length >= 5) {
        // FIVE-CARD CHARLIE (五龍過五關) - Instant Win with 2:1 Payout!
        sound.playBigWin();
        toastService.success('🐉 狂賀！達成「五龍過五關」直接勝出 (2:1 彩金)！');
        const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
        const finalDealerHand = calculateHand(revealedDealerCards);
        setDealerHand(finalDealerHand);

        const result = evaluateRoundOutcome(updatedHand, finalDealerHand, currentBet, isDouble);
        settleRound(result, newShoe);
      } else if (updatedHand.score === 21) {
        handleStandWithCards(updatedHand, newShoe, isDouble, currentBet);
      }
    } else {
      // Split Hit
      const { card, newShoe } = drawCard(shoe, false);
      setShoe(newShoe);

      if (activeHandIndex === 0) {
        const updatedHand = calculateHand([...playerHand.cards, card]);
        setPlayerHand(updatedHand);

        if (updatedHand.isBusted || updatedHand.score === 21 || updatedHand.cards.length >= 5) {
          if (updatedHand.isBusted) {
            sound.playLoss();
          } else if (updatedHand.cards.length >= 5) {
            sound.playBigWin();
            toastService.success('🐉 手牌 1 達成「五龍過五關」！');
          }
          setTimeout(() => {
            advanceToHand2(updatedHand, newShoe, currentBet, splitBet, isHand1Double, isHand2Double);
          }, 600);
        }
      } else {
        if (!splitHand) return;
        const updatedHand2 = calculateHand([...splitHand.cards, card]);
        setSplitHand(updatedHand2);

        if (updatedHand2.isBusted || updatedHand2.score === 21 || updatedHand2.cards.length >= 5) {
          if (updatedHand2.isBusted) {
            sound.playLoss();
          } else if (updatedHand2.cards.length >= 5) {
            sound.playBigWin();
            toastService.success('🐉 手牌 2 達成「五龍過五關」！');
          }
          setTimeout(() => {
            handleDealerTurnForSplit(
              playerHand,
              updatedHand2,
              newShoe,
              isHand1Double,
              isHand2Double,
              currentBet,
              splitBet
            );
          }, 600);
        }
      }
    }
  };

  // Player Double Down
  const handleDoubleDown = () => {
    if (phase !== 'player_turn') return;

    if (!isSplit) {
      if (playerHand.cards.length !== 2) return;
      if (balance < currentBet) {
        toastService.warn('籌碼餘額不足以雙倍下注！');
        return;
      }

      const doubledTotalBet = currentBet * 2;
      onRoundBusyChange?.(true, doubledTotalBet);
      sound.playChip();
      onUpdateBalance(balance - currentBet);
      setCurrentBet(doubledTotalBet);
      setIsDouble(true);

      sound.playCardDeal();
      const { card, newShoe } = drawCard(shoe, false);
      setShoe(newShoe);

      const updatedCards = [...playerHand.cards, card];
      const updatedHand = calculateHand(updatedCards);
      setPlayerHand(updatedHand);

      if (updatedHand.isBusted) {
        sound.playLoss();
        const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
        const finalDealerHand = calculateHand(revealedDealerCards);
        setDealerHand(finalDealerHand);

        const result = evaluateRoundOutcome(updatedHand, finalDealerHand, doubledTotalBet, true);
        settleRound(result, newShoe);
      } else {
        handleStandWithCards(updatedHand, newShoe, true, doubledTotalBet);
      }
    } else {
      // Split Double Down
      if (activeHandIndex === 0) {
        if (playerHand.cards.length !== 2 || balance < currentBet) {
          toastService.warn('籌碼餘額不足以雙倍下注！');
          return;
        }
        sound.playChip();
        onUpdateBalance(balance - currentBet);
        setIsHand1Double(true);

        sound.playCardDeal();
        const { card, newShoe } = drawCard(shoe, false);
        setShoe(newShoe);

        const updatedH1 = calculateHand([...playerHand.cards, card]);
        setPlayerHand(updatedH1);

        setTimeout(() => {
          advanceToHand2(updatedH1, newShoe, currentBet * 2, splitBet, true, isHand2Double);
        }, 600);
      } else {
        if (!splitHand || splitHand.cards.length !== 2 || balance < splitBet) {
          toastService.warn('籌碼餘額不足以雙倍下注！');
          return;
        }
        sound.playChip();
        onUpdateBalance(balance - splitBet);
        setIsHand2Double(true);

        sound.playCardDeal();
        const { card, newShoe } = drawCard(shoe, false);
        setShoe(newShoe);

        const updatedH2 = calculateHand([...splitHand.cards, card]);
        setSplitHand(updatedH2);

        setTimeout(() => {
          handleDealerTurnForSplit(
            playerHand,
            updatedH2,
            newShoe,
            isHand1Double,
            true,
            isHand1Double ? currentBet * 2 : currentBet,
            splitBet * 2
          );
        }, 600);
      }
    }
  };

  // Player Stand
  const handleStand = () => {
    if (phase !== 'player_turn') return;

    if (!isSplit) {
      handleStandWithCards(playerHand, shoe, isDouble, currentBet);
    } else {
      if (activeHandIndex === 0) {
        advanceToHand2(playerHand, shoe, currentBet, splitBet, isHand1Double, isHand2Double);
      } else {
        if (!splitHand) return;
        handleDealerTurnForSplit(
          playerHand,
          splitHand,
          shoe,
          isHand1Double,
          isHand2Double,
          currentBet,
          splitBet
        );
      }
    }
  };

  // Dealer turn loop (Dealer must draw on < 17, stand on >= 17)
  const handleStandWithCards = (
    finalPlayerHand: Hand,
    currentShoe: Card[],
    doubleFlag: boolean,
    roundBet: number
  ) => {
    setPhase('dealer_turn');
    if (isDealerDrawingRef.current) return;
    isDealerDrawingRef.current = true;

    // 1. Reveal dealer's hole card
    sound.playCardFlip();
    const revealedCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
    let curDealerHand = calculateHand(revealedCards);
    setDealerHand(curDealerHand);

    let activeShoe = [...currentShoe];

    // Dealer AI Drawing Loop
    const runDealerStep = () => {
      if (curDealerHand.score < 17) {
        setTimeout(() => {
          sound.playCardDeal();
          const { card, newShoe } = drawCard(activeShoe, false);
          activeShoe = newShoe;
          setShoe(activeShoe);

          const nextCards = [...curDealerHand.cards, card];
          curDealerHand = calculateHand(nextCards);
          setDealerHand(curDealerHand);

          runDealerStep();
        }, isTurboMode() ? 250 : 700);
      } else {
        isDealerDrawingRef.current = false;
        setTimeout(() => {
          const result = evaluateRoundOutcome(finalPlayerHand, curDealerHand, roundBet, doubleFlag);
          settleRound(result, activeShoe);
        }, isTurboMode() ? 150 : 400);
      }
    };

    setTimeout(runDealerStep, isTurboMode() ? 250 : 600);
  };

  // Dealer Turn Loop for Split Hands
  const handleDealerTurnForSplit = (
    finalH1: Hand,
    finalH2: Hand,
    currentShoe: Card[],
    d1Flag: boolean,
    d2Flag: boolean,
    bet1: number,
    bet2: number
  ) => {
    setPhase('dealer_turn');
    if (isDealerDrawingRef.current) return;
    isDealerDrawingRef.current = true;

    sound.playCardFlip();
    const revealed = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
    let curDealerHand = calculateHand(revealed);
    setDealerHand(curDealerHand);

    let activeShoe = [...currentShoe];

    // If both player hands busted, dealer does not need to draw
    if (finalH1.isBusted && finalH2.isBusted) {
      isDealerDrawingRef.current = false;
      setTimeout(() => {
        const result = evaluateSplitRoundOutcome(finalH1, finalH2, curDealerHand, bet1, bet2, d1Flag, d2Flag);
        settleRound(result, activeShoe);
      }, isTurboMode() ? 200 : 500);
      return;
    }

    const runDealerStep = () => {
      if (curDealerHand.score < 17) {
        setTimeout(() => {
          sound.playCardDeal();
          const { card, newShoe } = drawCard(activeShoe, false);
          activeShoe = newShoe;
          setShoe(activeShoe);

          const nextCards = [...curDealerHand.cards, card];
          curDealerHand = calculateHand(nextCards);
          setDealerHand(curDealerHand);

          runDealerStep();
        }, isTurboMode() ? 250 : 700);
      } else {
        isDealerDrawingRef.current = false;
        setTimeout(() => {
          const result = evaluateSplitRoundOutcome(finalH1, finalH2, curDealerHand, bet1, bet2, d1Flag, d2Flag);
          settleRound(result, activeShoe);
        }, isTurboMode() ? 150 : 400);
      }
    };

    setTimeout(runDealerStep, isTurboMode() ? 250 : 600);
  };

  // Settle Round & Update Stats / Balance
  const settleRound = (result: RoundResult, currentShoe: Card[]) => {
    setPhase('settled');
    setRoundResult(result);

    const isWin =
      result.outcome === 'player_win' ||
      result.outcome === 'player_blackjack' ||
      result.outcome === 'five_card_charlie' ||
      result.outcome === 'dealer_bust' ||
      (result.outcome === 'split_mixed' && result.netProfit > 0);
    const isPush =
      result.outcome === 'push' ||
      result.outcome === 'push_blackjack' ||
      (result.outcome === 'split_mixed' && result.netProfit === 0);

    // House bonus check when winning with active Toast Aura
    let totalPayout = result.payout;
    let bonusWon = 0;
    if (isWin) {
      const roundTotalBet = currentBet + (isSplit ? splitBet : 0);
      const bonus = checkHouseBonus(roundTotalBet);
      if (bonus.triggered) {
        bonusWon = bonus.bonusAmount;
        totalPayout += bonusWon;
        notifyHouseBonus(bonus, '21點');
      }
    }

    // Audio cues & Toast
    if (result.outcome === 'player_blackjack') {
      sound.playBigWin();
      setWinToast({
        id: Date.now(),
        title: '🌟 21點 BLACKJACK 3:2 大勝！',
        amount: totalPayout,
        extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
        subtitle: `${result.description}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
        isJackpot: true,
      });
    } else if (result.outcome === 'five_card_charlie') {
      sound.playBigWin();
      setWinToast({
        id: Date.now(),
        title: '🐉 五龍過五關 2:1 大勝！',
        amount: totalPayout,
        extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
        subtitle: `${result.description}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
        isJackpot: true,
      });
    } else if (isWin) {
      sound.playWin();
      setWinToast({
        id: Date.now(),
        title: '🎉 恭喜獲勝！',
        amount: totalPayout,
        extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
        subtitle: `${result.description}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
      });
    } else if (isPush) {
      sound.playClick();
    } else {
      sound.playLoss();
    }

    // Update global balance with total returned payout
    if (totalPayout > 0) {
      onUpdateBalance(balance + totalPayout);
    }

    // Update stats
    setStats((prev) => {
      const isBJ = result.outcome === 'player_blackjack';
      const netWin = result.netProfit > 0 ? result.netProfit : 0;
      const isLoss = !isWin && !isPush;

      return {
        handsPlayed: prev.handsPlayed + 1,
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (isLoss ? 1 : 0),
        pushes: prev.pushes + (isPush ? 1 : 0),
        blackjacks: prev.blackjacks + (isBJ ? 1 : 0),
        highestWin: Math.max(prev.highestWin, netWin),
      };
    });

    // Record into recent hands history
    setRecentHands((prev) => [
      {
        id: `bj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        outcome: result.outcome,
        playerScore: playerHand.score,
        dealerScore: dealerHand.score,
        bet: currentBet,
        netProfit: result.netProfit,
        isBlackjack: result.outcome === 'player_blackjack',
        timestamp: Date.now(),
      },
      ...prev.slice(0, 19),
    ]);

    // Check Hidden Collectibles Silently (Differentiated triggers & Chip thresholds)
    if (result.outcome === 'player_blackjack' && currentBet >= 500) {
      unlockHiddenCollectible('col-blackjack-natural');
    }
    if (playerHand.cards.length >= 5 && !playerHand.isBusted && isWin) {
      unlockHiddenCollectible('col-blackjack-charlie');
    }
    if (isDouble && isWin && currentBet >= 1000) {
      unlockHiddenCollectible('col-blackjack-double');
    }
    if (
      currentBet >= 500 &&
      playerHand.cards.length >= 2 &&
      playerHand.cards[0].rank === playerHand.cards[1].rank &&
      isWin
    ) {
      unlockHiddenCollectible('col-blackjack-split');
    }
    if (result.outcome === 'dealer_bust' && currentBet >= 500) {
      unlockHiddenCollectible('col-blackjack-dealer-bust');
    }
    if (
      playerHand.cards.length === 3 &&
      playerHand.cards.every((c) => c.rank === '7')
    ) {
      unlockHiddenCollectible('col-blackjack-triple-seven');
    }

    // Record into Global Career Stats for Favorite Game tracking
    const isBlackjackWin = result.outcome === 'player_blackjack';
    const payoutWon = Math.max(0, currentBet + result.netProfit);
    recordCareerRound({
      gameId: 'blackjack',
      betAmount: currentBet,
      winAmount: payoutWon,
      multiplier: isBlackjackWin ? 2.5 : isWin ? 2 : 1,
    });

    // Check if reshuffle is required (< 75 cards in shoe)
    checkReshuffleAfterSettlement(currentShoe);
  };

  // Reset table for next game
  const handlePlayAgain = () => {
    sound.playClick();
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setCurrentBet(0);
    setRoundResult(null);
    setWinToast(null);
    setIsDouble(false);
    setIsSplit(false);
    setSplitHand(null);
    setActiveHandIndex(0);
    setSplitBet(0);
    setIsHand1Double(false);
    setIsHand2Double(false);
    setInsuranceBet(0);
    setIsInsuranceBought(false);
    setPhase('betting');
  };

  // Quick Rebet and Deal
  const handleRebetAndDeal = () => {
    if (lastRoundBet <= 0) return;
    if (balance < lastRoundBet) {
      toastService.warn('籌碼不足以重複上一輪下注！');
      return;
    }
    onRoundBusyChange?.(true, lastRoundBet);
    sound.playChip();
    onUpdateBalance(balance - lastRoundBet);
    setCurrentBet(lastRoundBet);
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setRoundResult(null);
    setWinToast(null);
    setIsDouble(false);
    setIsSplit(false);
    setSplitHand(null);
    setActiveHandIndex(0);
    setSplitBet(0);
    setIsHand1Double(false);
    setIsHand2Double(false);
    setInsuranceBet(0);
    setIsInsuranceBought(false);
    setPhase('dealing');

    // Trigger deal in next tick
    setTimeout(() => {
      let activeShoe = [...shoe];
      if (activeShoe.length < 10) {
        activeShoe = createSixDeckShoe();
      }

      sound.playCardDeal();
      const d1 = drawCard(activeShoe, false);
      const pCard1 = d1.card;
      activeShoe = d1.newShoe;

      const d2 = drawCard(activeShoe, false);
      const dCard1 = d2.card;
      activeShoe = d2.newShoe;

      const d3 = drawCard(activeShoe, false);
      const pCard2 = d3.card;
      activeShoe = d3.newShoe;

      const d4 = drawCard(activeShoe, true);
      const dCard2 = d4.card;
      activeShoe = d4.newShoe;

      setShoe(activeShoe);

      const pHand = calculateHand([pCard1, pCard2]);
      const dHand = calculateHand([dCard1, dCard2]);
      setPlayerHand(pHand);
      setDealerHand(dHand);

      setTimeout(() => {
        sound.playCardFlip();
        if (dCard1.rank === 'A') {
          setPhase('insurance');
        } else {
          if (pHand.isBlackjack) {
            const revealed = [dCard1, { ...dCard2, isHidden: false }];
            const finalDH = calculateHand(revealed);
            setDealerHand(finalDH);
            const res = evaluateRoundOutcome(pHand, finalDH, lastRoundBet, false);
            settleRound(res, activeShoe);
          } else {
            setPhase('player_turn');
          }
        }
      }, 600);
    }, 100);
  };

  const handleDoubleRebetAndDeal = () => {
    const doubled = lastRoundBet * 2;
    if (doubled <= 0) return;
    if (balance < doubled) {
      toastService.warn('籌碼不足以加倍續注！');
      return;
    }
    onRoundBusyChange?.(true, doubled);
    sound.playChip();
    onUpdateBalance(balance - doubled);
    setCurrentBet(doubled);
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setRoundResult(null);
    setWinToast(null);
    setIsDouble(false);
    setIsSplit(false);
    setSplitHand(null);
    setActiveHandIndex(0);
    setSplitBet(0);
    setIsHand1Double(false);
    setIsHand2Double(false);
    setInsuranceBet(0);
    setIsInsuranceBought(false);
    setPhase('dealing');

    setTimeout(() => {
      let activeShoe = [...shoe];
      if (activeShoe.length < 10) {
        activeShoe = createSixDeckShoe();
      }

      sound.playCardDeal();
      const d1 = drawCard(activeShoe, false);
      const pCard1 = d1.card;
      activeShoe = d1.newShoe;

      const d2 = drawCard(activeShoe, false);
      const dCard1 = d2.card;
      activeShoe = d2.newShoe;

      const d3 = drawCard(activeShoe, false);
      const pCard2 = d3.card;
      activeShoe = d3.newShoe;

      const d4 = drawCard(activeShoe, true);
      const dCard2 = d4.card;
      activeShoe = d4.newShoe;

      setShoe(activeShoe);

      const pHand = calculateHand([pCard1, pCard2]);
      const dHand = calculateHand([dCard1, dCard2]);
      setPlayerHand(pHand);
      setDealerHand(dHand);

      setTimeout(() => {
        sound.playCardFlip();
        if (dCard1.rank === 'A') {
          setPhase('insurance');
        } else {
          if (pHand.isBlackjack) {
            const revealed = [dCard1, { ...dCard2, isHidden: false }];
            const finalDH = calculateHand(revealed);
            setDealerHand(finalDH);
            const res = evaluateRoundOutcome(pHand, finalDH, doubled, false);
            settleRound(res, activeShoe);
          } else {
            setPhase('player_turn');
          }
        }
      }, 600);
    }, 100);
  };


  const remainingShoeCount = shoe.length;
  const shoePercentage = Math.round((remainingShoeCount / TOTAL_SHOE_CARDS) * 100);
  const isNearShuffle = remainingShoeCount < SHOE_RESHUFFLE_THRESHOLD;
  const canDouble = playerHand.cards.length === 2 && balance >= currentBet;

  // Blackjack Keyboard Shortcuts: Space (Deal), H (Hit), S (Stand), D (Double Down), C (Clear), X (Double Bet), R (Rebet)
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

      if (phase === 'betting') {
        if (e.code === 'Space') {
          e.preventDefault();
          if (currentBet > 0) {
            handleDeal();
          }
          return;
        }
        if (key === 'Z') {
          e.preventDefault();
          if (currentBet > 0 && betHistoryStack.length > 0) {
            handleUndoBet();
          }
          return;
        }
        if (key === 'C') {
          e.preventDefault();
          if (currentBet > 0) {
            handleClearBet();
          }
          return;
        }
        if (key === 'X') {
          e.preventDefault();
          if (currentBet > 0 && balance >= currentBet) {
            handleDoublePlacedBet();
          }
          return;
        }
        if (key === 'R') {
          e.preventDefault();
          if (lastRoundBet > 0 && balance + currentBet >= lastRoundBet) {
            handleRebet();
          }
          return;
        }
      } else if (phase === 'insurance') {
        if (key === 'I' || key === 'Y') {
          e.preventDefault();
          handleBuyInsurance();
          return;
        }
        if (key === 'N') {
          e.preventDefault();
          handleSkipInsurance();
          return;
        }
      } else if (phase === 'player_turn') {
        if (key === 'H') {
          e.preventDefault();
          handleHit();
          return;
        }
        if (key === 'S') {
          e.preventDefault();
          handleStand();
          return;
        }
        if (key === 'D') {
          e.preventDefault();
          handleDoubleDown();
          return;
        }
        if (key === 'P' && canSplit) {
          e.preventDefault();
          handleSplit();
          return;
        }
        if (key === 'U' && canSurrender) {
          e.preventDefault();
          handleSurrender();
          return;
        }
      } else if (phase === 'settled') {
        if (e.code === 'Space') {
          e.preventDefault();
          handlePlayAgain();
          return;
        }
        if (key === 'R' && lastRoundBet > 0 && balance >= lastRoundBet) {
          e.preventDefault();
          handleRebetAndDeal();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    phase,
    currentBet,
    balance,
    lastRoundBet,
    canDouble,
    canSplit,
    canSurrender,
    handleDeal,
    handleHit,
    handleStand,
    handleDoubleDown,
    handleSplit,
    handleSurrender,
    handleBuyInsurance,
    handleSkipInsurance,
    handleClearBet,
    handleDoublePlacedBet,
    handleRebet,
    handlePlayAgain,
    handleRebetAndDeal,
  ]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-hidden select-none animate-fade-in relative">
      {/* LEFT COLUMN: Main Blackjack Velvet Felt Board (Maximized on Mobile/Tablet) */}
      <div
        id="game-visual-area"
        className={`w-full ${
          isDesktopCollapsed ? 'lg:flex-1' : 'lg:w-[62%] xl:w-[65%]'
        } h-full min-h-0 flex flex-col rounded-2xl bg-gradient-to-b from-[#06331e] via-[#094228] to-[#042415] border-3 border-[#78350f]/80 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden p-2 sm:p-3 relative justify-between transition-all duration-700`}
      >
        {/* Floating 2-Second Auto-Fading Win Toast located internally inside #game-visual-area */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* Table Felt Markings & Arch */}
        <div className="absolute inset-x-6 top-10 bottom-10 border-2 border-dashed border-amber-400/15 rounded-[60px] pointer-events-none" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none opacity-20 select-none">
          <span className="text-base sm:text-lg xl:text-xl font-black font-serif tracking-[0.2em] text-amber-200 uppercase text-center px-4">
            BLACKJACK PAYS 3 TO 2 • 5-CARD CHARLIE PAYS 2 TO 1
          </span>
          <span className="text-[11px] font-semibold tracking-widest text-emerald-200 mt-0.5 text-center">
            DEALER MUST STAND ON 17 • 五龍過五關 2:1 彩金 (5張不爆即贏)
          </span>
        </div>

        {/* 1. TOP SHOE BAR */}
        <div className="relative z-20 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur border border-amber-500/30">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-stone-200">6 副牌靴</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isNearShuffle
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              剩餘 {remainingShoeCount} / {TOTAL_SHOE_CARDS} 張
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isNearShuffle ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${shoePercentage}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-400 font-mono">{shoePercentage}%</span>
            </div>

            <button
              id="btn-manual-shuffle"
              disabled={phase !== 'betting'}
              onClick={performShuffle}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 disabled:opacity-40 text-stone-300 border border-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
              title="重新洗牌 (312 張)"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>洗牌</span>
            </button>
          </div>
        </div>

        {/* 2. DEALER AREA */}
        <div className="relative z-10 flex flex-col items-center mt-1">
          {/* Dealer Title & Score Badge */}
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/70 backdrop-blur border border-amber-500/40 shadow-lg mb-2">
            <Shield className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-bold text-stone-200">莊家 (DEALER)</span>
            {dealerHand.cards.length > 0 && (
              <span
                className={`ml-1 font-mono font-black text-xs px-2 py-0.2 rounded ${
                  dealerHand.isBusted
                    ? 'bg-rose-600 text-white'
                    : dealerHand.isBlackjack
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-stone-800 text-amber-300'
                }`}
              >
                {dealerHand.cards.some((c) => c.isHidden)
                  ? `${dealerHand.score} + ?`
                  : dealerHand.isBusted
                  ? 'BUST (爆牌)'
                  : `${dealerHand.score} 點`}
              </span>
            )}
          </div>

          {/* Dealer Cards */}
          <div className="flex items-center justify-center -space-x-8 sm:-space-x-10 min-h-[105px]">
            {dealerHand.cards.length === 0 ? (
              <div className="w-18 h-26 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-emerald-400/30 flex items-center justify-center text-emerald-300/40 text-xs font-bold">
                等待發牌
              </div>
            ) : (
              dealerHand.cards.map((card, idx) => (
                <PlayingCard key={card.id || idx} card={card} index={idx} />
              ))
            )}
          </div>
        </div>

        {/* 3. CENTER NOTIFICATION & RESULT OVERLAY */}
        <div className="relative z-20 my-1 flex flex-col items-center justify-center min-h-[46px]">
          {isShufflingModal ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-black/90 border border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse">
              <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-black text-amber-300">
                牌靴不足 75 張，重新洗牌中 (312 Cards)...
              </span>
            </div>
          ) : roundResult ? (
            <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-black/90 backdrop-blur border border-amber-400 shadow-2xl animate-in zoom-in-95 duration-200">
              <div
                className={`text-sm sm:text-base font-black tracking-wide ${
                  roundResult.netProfit > 0
                    ? 'text-emerald-400'
                    : roundResult.netProfit === 0
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }`}
              >
                {roundResult.title}
              </div>
              <span className="text-stone-600">|</span>
              <p className="text-xs text-stone-300">{roundResult.description}</p>
            </div>
          ) : phase === 'insurance' ? (
            <div className="text-xs font-bold text-amber-300 bg-black/80 px-4 py-1.5 rounded-full border border-amber-400/80 backdrop-blur animate-pulse flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>莊家明牌為 Ace！請在右側選擇是否購買保險 (2:1 賠率)</span>
            </div>
          ) : phase === 'betting' ? (
            <div className="text-xs font-semibold text-emerald-200/90 bg-black/50 px-4 py-1 rounded-full border border-emerald-500/30 backdrop-blur">
              {currentBet === 0
                ? '請在右側選擇籌碼，或點擊下方圓圈放置注金'
                : '注金已就緒，請點擊右側「開始發牌 (DEAL)」'}
            </div>
          ) : phase === 'player_turn' ? (
            <div className="text-xs font-bold text-amber-300 bg-black/70 px-4 py-1 rounded-full border border-amber-500/50 backdrop-blur animate-pulse">
              {isSplit
                ? `分牌對局中：正在操作【手牌 ${activeHandIndex + 1}】`
                : '玩家回合：請選擇「要牌」、「停牌」或「雙倍」'}
            </div>
          ) : (
            <div className="text-xs font-bold text-stone-300 bg-black/60 px-4 py-1 rounded-full border border-stone-600 backdrop-blur">
              莊家補牌中...
            </div>
          )}
        </div>

        {/* 4. PLAYER AREA */}
        <div className="relative z-10 flex flex-col items-center mb-1">
          {/* Betting Status Flank Badges & Cards/Betting Circle */}
          <div className="w-full flex items-center justify-between px-2 sm:px-6 mb-1">
            {/* Left: Available Balance Indicator */}
            <div className="flex flex-col items-start px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur border border-emerald-500/40 shadow-lg">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                當前可用籌碼
              </span>
              <span className="font-mono font-black text-xs sm:text-sm text-emerald-400">
                ${balance.toLocaleString()}
              </span>
            </div>

            {/* Center: Cards or Pure Display Betting Circle / Split Hands */}
            {!isSplit ? (
              <div className="flex items-center justify-center -space-x-8 sm:-space-x-10 min-h-[105px]">
                {playerHand.cards.length === 0 ? (
                  <div
                    id="betting-spot-circle"
                    onClick={() => {
                      if (phase === 'betting') {
                        handlePlaceBet(selectedChip);
                      } else if (phase === 'round_over') {
                        setPhase('betting');
                        handlePlaceBet(selectedChip);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleRemoveBetSpot(selectedChip);
                    }}
                    className={`w-24 h-24 sm:w-26 sm:h-26 rounded-full border-2 ${
                      currentBet > 0
                        ? 'border-amber-400/90 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                        : 'border-amber-400/30 bg-black/40 hover:border-amber-400/70'
                    } flex flex-col items-center justify-center transition-all select-none relative group cursor-pointer active:scale-95`}
                    title={`左鍵點擊加注 $${selectedChip.toLocaleString()} • 右鍵點擊撤回籌碼`}
                  >
                    {currentBet > 0 ? (
                      <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-150">
                        <CasinoChip amount={currentBet} size="md" />
                        <span className="text-[10px] font-mono font-black text-amber-300 mt-1">
                          ${currentBet.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-amber-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 whitespace-nowrap bg-black/85 px-2 py-0.5 rounded-full border border-amber-500/40">
                          +${selectedChip.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wider">
                          押注區
                        </span>
                        <span className="text-[9px] text-amber-400/90 font-mono mt-0.5 group-hover:text-amber-300">
                          點擊 +${selectedChip.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  playerHand.cards.map((card, idx) => (
                    <PlayingCard key={card.id || idx} card={card} index={idx} />
                  ))
                )}
              </div>
            ) : (
              /* Split Hands Layout: Hand 1 & Hand 2 */
              <div className="flex items-center justify-center gap-3 sm:gap-6 min-h-[105px]">
                {/* Hand 1 */}
                <div
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition-all ${
                    activeHandIndex === 0 && phase === 'player_turn'
                      ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/60'
                      : 'bg-black/50 border-stone-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-stone-200">手牌 1</span>
                    <span className="text-[9px] font-mono font-bold text-amber-400">
                      ${(isHand1Double ? currentBet * 2 : currentBet).toLocaleString()}
                    </span>
                    {activeHandIndex === 0 && phase === 'player_turn' && (
                      <span className="text-[9px] font-black text-amber-400 animate-pulse">● 操作中</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center -space-x-7 sm:-space-x-8 min-h-[90px]">
                    {playerHand.cards.map((card, idx) => (
                      <PlayingCard key={card.id || idx} card={card} index={idx} />
                    ))}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`font-mono font-bold text-[10px] px-2 py-0.2 rounded ${
                        playerHand.isBusted
                          ? 'bg-rose-600 text-white'
                          : playerHand.isBlackjack
                          ? 'bg-amber-400 text-black'
                          : playerHand.isCharlie
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black'
                          : 'bg-stone-800 text-amber-300'
                      }`}
                    >
                      {playerHand.isBusted
                        ? 'BUST 爆牌'
                        : playerHand.isCharlie
                        ? '🐉 過五關'
                        : `${playerHand.score} 點`}
                    </span>
                  </div>
                </div>

                {/* Hand 2 */}
                <div
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition-all ${
                    activeHandIndex === 1 && phase === 'player_turn'
                      ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/60'
                      : 'bg-black/50 border-stone-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-stone-200">手牌 2</span>
                    <span className="text-[9px] font-mono font-bold text-amber-400">
                      ${(isHand2Double ? splitBet * 2 : splitBet).toLocaleString()}
                    </span>
                    {activeHandIndex === 1 && phase === 'player_turn' && (
                      <span className="text-[9px] font-black text-amber-400 animate-pulse">● 操作中</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center -space-x-7 sm:-space-x-8 min-h-[90px]">
                    {splitHand?.cards.map((card, idx) => (
                      <PlayingCard key={card.id || idx} card={card} index={idx} />
                    ))}
                  </div>
                  <div className="mt-1">
                    {splitHand && (
                      <span
                        className={`font-mono font-bold text-[10px] px-2 py-0.2 rounded ${
                          splitHand.isBusted
                            ? 'bg-rose-600 text-white'
                            : splitHand.isBlackjack
                            ? 'bg-amber-400 text-black'
                            : splitHand.isCharlie
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black'
                            : 'bg-stone-800 text-amber-300'
                        }`}
                      >
                        {splitHand.isBusted
                          ? 'BUST 爆牌'
                          : splitHand.isCharlie
                          ? '🐉 過五關'
                          : `${splitHand.score} 點`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Right: Placed Bet Indicator */}
            <div className="flex flex-col items-end px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur border border-amber-500/40 shadow-lg">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                本局已下注金額
              </span>
              <span className="font-mono font-black text-xs sm:text-sm text-amber-400">
                ${(isSplit ? (isHand1Double ? currentBet * 2 : currentBet) + (isHand2Double ? splitBet * 2 : splitBet) : currentBet).toLocaleString()}{' '}
                {isDouble && '(2X)'}
              </span>
            </div>
          </div>

          {/* Player Title & Score Badge */}
          <div className="flex items-center gap-2">
            {!isSplit ? (
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/70 backdrop-blur border border-amber-500/40 shadow-lg">
                <span className="text-xs font-bold text-stone-200">玩家 (YOU)</span>
                {playerHand.cards.length > 0 && (
                  <span
                    className={`ml-1 font-mono font-black text-xs px-2 py-0.2 rounded ${
                      playerHand.isBusted
                        ? 'bg-rose-600 text-white'
                        : playerHand.isBlackjack
                        ? 'bg-amber-400 text-black animate-pulse'
                        : playerHand.isCharlie
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md'
                        : 'bg-stone-800 text-amber-300'
                    }`}
                  >
                    {playerHand.isBusted
                      ? 'BUST (爆牌)'
                      : playerHand.isBlackjack
                      ? '🌟 BLACKJACK'
                      : playerHand.isCharlie
                      ? `🐉 過五關 (${playerHand.score} 點)`
                      : `${playerHand.score} 點 ${playerHand.isSoft ? '(軟牌)' : ''}`}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/70 backdrop-blur border border-cyan-500/50 shadow-lg">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">分牌對局進行中 (2手牌)</span>
              </div>
            )}

            {/* Placed Bet Badge when cards dealt and not split */}
            {!isSplit && playerHand.cards.length > 0 && (
              <div className="px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-xs font-mono font-bold text-amber-300 shadow">
                下注: ${currentBet.toLocaleString()} {isDouble && '(2X 雙倍)'}
              </div>
            )}
          </div>
        </div>

        {/* COMPACT MOBILE & TABLET ACTION DOCK (手機與平板專屬快捷操作列) */}
        <div className="w-full mt-1.5 pt-1.5 border-t border-emerald-800/60 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 lg:hidden">
          {phase === 'betting' && (
            <div className="w-full flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 shrink-0">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={balance < amt}
                    onClick={() => handleChipClick(amt)}
                    className="px-2 py-1 min-h-[40px] rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-stone-700 text-[11px] font-mono font-bold text-amber-300 disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
                  >
                    +${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              <button
                id="btn-mobile-bj-deal"
                disabled={currentBet === 0}
                onClick={handleDeal}
                className={`flex-1 min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation ${
                  currentBet > 0
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>發牌 (${currentBet.toLocaleString()})</span>
              </button>

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-2.5 py-1.5 min-h-[44px] rounded-xl bg-stone-900/95 text-stone-200 hover:text-amber-400 border border-stone-700 flex items-center gap-1 text-xs font-bold shrink-0 active:scale-95 touch-manipulation"
                title="開啟下注選單與局勢分析"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="hidden min-[380px]:inline">選單</span>
                <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </div>
          )}

          {phase === 'player_turn' && (
            <div className="w-full flex items-center justify-between gap-1 sm:gap-2">
              <button
                onClick={handleHit}
                className="flex-1 min-h-[44px] py-1 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm shadow flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <HandIcon className="w-4 h-4" />
                <span>要牌 (HIT)</span>
              </button>

              <button
                onClick={handleStand}
                className="flex-1 min-h-[44px] py-1 px-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs sm:text-sm shadow flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <Shield className="w-4 h-4" />
                <span>停牌 (STAND)</span>
              </button>

              {canDouble && (
                <button
                  onClick={handleDoubleDown}
                  className="px-2.5 py-1 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-black text-xs shadow active:scale-95 touch-manipulation shrink-0"
                >
                  加倍
                </button>
              )}

              {canSplit && (
                <button
                  onClick={handleSplit}
                  className="px-2.5 py-1 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black text-xs shadow active:scale-95 touch-manipulation shrink-0"
                >
                  分牌
                </button>
              )}

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-2 py-1 min-h-[44px] rounded-xl bg-stone-900/90 text-stone-300 border border-stone-700 flex items-center justify-center active:scale-95 touch-manipulation shrink-0"
                title="局勢分析"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}

          {phase === 'insurance' && (
            <div className="w-full flex items-center justify-between gap-1.5">
              <button
                disabled={balance < Math.floor(currentBet / 2)}
                onClick={handleBuyInsurance}
                className="flex-1 min-h-[44px] py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>買保險 (${Math.floor(currentBet / 2).toLocaleString()})</span>
              </button>
              <button
                onClick={handleSkipInsurance}
                className="flex-1 min-h-[44px] py-1.5 rounded-xl bg-stone-900 text-stone-300 border border-stone-700 font-bold text-xs active:scale-95 touch-manipulation"
              >
                放棄保險
              </button>
            </div>
          )}

          {(phase === 'dealing' || phase === 'dealer_turn') && (
            <div className="w-full flex items-center justify-center gap-2 py-1 text-xs text-amber-300 font-bold">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
              <span>{phase === 'dealing' ? '發牌進行中...' : '莊家補牌中...'}</span>
            </div>
          )}

          {phase === 'round_over' && (
            <div className="w-full flex items-center justify-between gap-1.5">
              <button
                onClick={handlePlayAgain}
                className="flex-1 min-h-[44px] py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-bold active:scale-95 touch-manipulation"
              >
                重新下注
              </button>
              <button
                disabled={balance < lastRoundBet}
                onClick={handleRebetAndDeal}
                className="flex-[1.5] min-h-[44px] py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1 shadow-lg active:scale-95 touch-manipulation"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>同額發牌 (${lastRoundBet.toLocaleString()})</span>
              </button>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-2.5 py-1.5 min-h-[44px] rounded-xl bg-stone-900 text-stone-200 border border-stone-700 flex items-center gap-1 text-xs font-bold active:scale-95 touch-manipulation shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP SIDEBAR (35%): Stats, Chips, Actions, Rules */}
      <div
        className={`hidden lg:flex transition-all duration-300 ${
          isDesktopCollapsed
            ? 'w-11 h-full justify-center items-center'
            : 'w-[38%] xl:w-[35%] h-full flex flex-col justify-between gap-1.5'
        } overflow-hidden shrink-0 relative`}
      >
        {isDesktopCollapsed ? (
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="w-10 h-36 rounded-xl bg-stone-900/90 border border-amber-500/40 text-amber-400 hover:text-white flex flex-col items-center justify-center gap-2 hover:bg-stone-800 shadow-xl transition-all cursor-pointer"
            title="展開21點分析與選單"
          >
            <PanelRightOpen className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold" style={{ writingMode: 'vertical-rl' }}>
              展開分析選單
            </span>
          </button>
        ) : (
          <div className="w-full h-full flex flex-col justify-between gap-1.5 overflow-hidden relative">
            <div className="absolute top-1.5 right-1.5 z-20">
              <button
                onClick={() => setIsDesktopCollapsed(true)}
                className="p-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700/80 cursor-pointer shadow-md"
                title="收起選單以最大化牌桌視野"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1. TOP: Lifetime Stats */}
        <div className="p-2 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1 shrink-0">
          <div className="flex items-center justify-between border-b border-stone-800 pb-0.5">
            <div className="flex items-center gap-1.5 text-stone-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>21點生涯戰績 (STATS)</span>
            </div>
            <button
              onClick={() => {
                setStats({
                  handsPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pushes: 0,
                  blackjacks: 0,
                  highestWin: 0,
                });
              }}
              className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
            >
              清空
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
              <div className="text-[9px] text-stone-400">局數</div>
              <div className="font-mono font-black text-xs text-stone-100">{stats.handsPlayed}</div>
            </div>
            <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
              <div className="text-[9px] text-emerald-400">勝局</div>
              <div className="font-mono font-black text-xs text-emerald-400">{stats.wins}</div>
            </div>
            <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
              <div className="text-[9px] text-amber-300">BJ 數</div>
              <div className="font-mono font-black text-xs text-amber-300">{stats.blackjacks}</div>
            </div>
          </div>
        </div>

        {/* 2. RECENT HANDS HISTORY & HI-LO COUNTING WIDGET (Replaces Redundant Chip Selector) */}
        {(() => {
          // Hi-Lo Card Counting Calculations from Active Shoe (312 cards total, 24 of each rank)
          const shoeRankCounts = shoe.reduce((acc, c) => {
            acc[c.rank] = (acc[c.rank] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const lowDealt = ['2', '3', '4', '5', '6'].reduce((sum, r) => sum + (24 - (shoeRankCounts[r] || 0)), 0);
          const highDealt = ['10', 'J', 'Q', 'K', 'A'].reduce((sum, r) => sum + (24 - (shoeRankCounts[r] || 0)), 0);
          const runningCount = lowDealt - highDealt;
          const decksRemaining = Math.max(0.5, shoe.length / 52);
          const trueCount = Math.round((runningCount / decksRemaining) * 10) / 10;

          const countAdvantage =
            trueCount >= 2
              ? {
                  title: '✨ 牌面偏大（有利玩家加注）',
                  text: '牌靴剩餘較多 10 點與 A，莊家補牌極易爆牌，適合把握時機提高注額！',
                  badgeColor: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/60',
                }
              : trueCount <= -2
              ? {
                  title: '⚠️ 牌面偏小（建議保守觀望）',
                  text: '牌靴剩餘小牌居多，莊家補牌不易爆牌，建議保持基礎保守下注。',
                  badgeColor: 'text-rose-300 border-rose-500/50 bg-rose-950/60',
                }
              : {
                  title: '⚖️ 牌況均衡（常態機率）',
                  text: '高低點數分佈平均，遵循標準 21 點基本策略可掌握最佳勝率。',
                  badgeColor: 'text-amber-300 border-amber-500/50 bg-amber-950/60',
                };

          return (
            <div className="p-2 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {/* Header with Segmented Tabs */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                <div className="flex items-center gap-1 bg-stone-950/90 p-0.5 rounded-lg border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSideTab('history');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      sideTab === 'history'
                        ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <History className="w-3 h-3" />
                    <span>近局戰況 ({recentHands.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSideTab('counter');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      sideTab === 'counter'
                        ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Calculator className="w-3 h-3" />
                    <span>局勢分析</span>
                  </button>
                </div>

                <div className="text-[10px] font-mono text-stone-400">
                  {sideTab === 'history' ? (
                    <span>近 {recentHands.length} 局牌路</span>
                  ) : (
                    <span>Hi-Lo 牌力推算</span>
                  )}
                </div>
              </div>

              {/* Tab 1: Recent Hands History (牌路路紙) */}
              {sideTab === 'history' && (
                <div className="flex flex-col gap-1">
                  {recentHands.length === 0 ? (
                    <div className="py-3 text-center text-stone-500 text-[11px] flex flex-col items-center justify-center">
                      <History className="w-4 h-4 text-stone-600 mb-1 opacity-50" />
                      <span>尚未有對局紀錄，開牌後將自動記錄戰報</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1">
                      {recentHands.slice(0, 8).map((hand, idx) => {
                        const isBJ = hand.isBlackjack;
                        const isCharlie = hand.outcome === 'five_card_charlie';
                        const isWin = hand.netProfit > 0;
                        const isPush = hand.netProfit === 0;

                        return (
                          <div
                            key={hand.id || idx}
                            className={`p-1 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${
                              isBJ
                                ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/60 border-amber-400/80'
                                : isCharlie
                                ? 'bg-gradient-to-b from-teal-500/20 to-emerald-950/60 border-teal-400/80'
                                : isWin
                                ? 'bg-emerald-950/50 border-emerald-500/50'
                                : isPush
                                ? 'bg-stone-900/80 border-stone-700'
                                : 'bg-rose-950/50 border-rose-500/40'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-black leading-none ${
                                isBJ
                                  ? 'text-amber-300'
                                  : isCharlie
                                  ? 'text-teal-300'
                                  : isWin
                                  ? 'text-emerald-400'
                                  : isPush
                                  ? 'text-stone-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {isBJ ? '👑 21點' : isCharlie ? '🐉 過五關' : isWin ? '🟢 勝出' : isPush ? '🟡 平手' : '🔴 莊勝'}
                            </span>
                            <span className="text-[9px] font-mono text-stone-300 mt-0.5">
                              {hand.playerScore} : {hand.dealerScore}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold ${
                                hand.netProfit > 0
                                  ? 'text-emerald-300'
                                  : hand.netProfit === 0
                                  ? 'text-stone-400'
                                  : 'text-rose-300'
                              }`}
                            >
                              {hand.netProfit >= 0
                                ? `+$${hand.netProfit}`
                                : `-$${Math.abs(hand.netProfit)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Hi-Lo Card Counting Advantage Dashboard */}
              {sideTab === 'counter' && (
                <div className="flex flex-col gap-2 animate-fade-in text-stone-200">
                  {/* 1. Enlarged Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {/* Running Count (RC) Card */}
                    <div className="p-2 rounded-xl bg-gradient-to-b from-stone-900/90 to-stone-950/90 border border-stone-800 shadow-md flex flex-col items-center justify-between">
                      <div className="text-[10px] text-stone-400 font-bold tracking-wide">
                        流水計數 (RC)
                      </div>
                      <div
                        className={`font-mono font-black text-xl sm:text-2xl my-0.5 tracking-tight ${
                          runningCount > 0
                            ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                            : runningCount < 0
                            ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]'
                            : 'text-stone-300'
                        }`}
                      >
                        {runningCount > 0 ? `+${runningCount}` : runningCount}
                      </div>
                      <div className="text-[9px] text-stone-500 font-mono">
                        小+{lowDealt} / 大-{highDealt}
                      </div>
                    </div>

                    {/* True Count (TC) Card - Highlighted Center */}
                    <div className="p-2 rounded-xl bg-gradient-to-b from-amber-950/40 via-stone-900/90 to-stone-950/90 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10 flex flex-col items-center justify-between relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                      <div className="text-[10px] text-amber-300 font-black tracking-wide flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>真實計數 (TC)</span>
                      </div>
                      <div
                        className={`font-mono font-black text-2xl sm:text-3xl my-0.5 tracking-tight ${
                          trueCount >= 2
                            ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                            : trueCount <= -2
                            ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.6)]'
                            : 'text-amber-300'
                        }`}
                      >
                        {trueCount > 0 ? `+${trueCount}` : trueCount}
                      </div>
                      <div className="text-[9px] text-amber-400/80 font-mono font-bold">
                        {trueCount >= 2 ? '🔥 玩家優勢' : trueCount <= -2 ? '⚠️ 莊家優勢' : '⚖️ 勢均力敵'}
                      </div>
                    </div>

                    {/* Remaining Decks Card */}
                    <div className="p-2 rounded-xl bg-gradient-to-b from-stone-900/90 to-stone-950/90 border border-stone-800 shadow-md flex flex-col items-center justify-between">
                      <div className="text-[10px] text-stone-400 font-bold tracking-wide">
                        牌靴剩餘
                      </div>
                      <div className="font-mono font-black text-lg sm:text-xl my-0.5 text-stone-100">
                        {decksRemaining.toFixed(1)} <span className="text-xs text-stone-400 font-normal">/ 6副</span>
                      </div>
                      <div className="text-[9px] text-stone-500 font-mono">
                        餘 {remainingShoeCount} 張 ({shoePercentage}%)
                      </div>
                    </div>
                  </div>

                  {/* 2. Real-time Advantage & Bet Advisory */}
                  <div className={`p-2 rounded-xl border shadow-sm ${countAdvantage.badgeColor}`}>
                    <div className="font-black text-xs flex items-center justify-between mb-0.5">
                      <span>{countAdvantage.title}</span>
                      <span className="text-[9px] font-mono opacity-80">
                        TC: {trueCount > 0 ? `+${trueCount}` : trueCount}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-300 leading-relaxed font-medium">
                      {countAdvantage.text}
                    </div>
                  </div>

                  {/* 3. Pedagogical Indicator Explanation Guide */}
                  <div className="p-2 rounded-xl bg-stone-950/80 border border-stone-800/80 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-stone-300 font-black text-[11px] pb-1 border-b border-stone-800/60">
                      <div className="flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hi-Lo 算牌指標原理說明</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-mono text-stone-400">
                        <span className="px-1 py-0.2 bg-emerald-950 border border-emerald-700/50 text-emerald-300 rounded">2-6: +1</span>
                        <span className="px-1 py-0.2 bg-stone-800 text-stone-300 rounded">7-9: 0</span>
                        <span className="px-1 py-0.2 bg-rose-950 border border-rose-700/50 text-rose-300 rounded">10-A: -1</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px] text-stone-400 leading-normal">
                      <div>
                        <strong className="text-stone-200">▪ RC (流水計數)：</strong>
                        開靴至今開出牌的點數加總。小牌出得多時 RC 為正，代表牌靴中剩餘的大牌 (10, J, Q, K, A) 比例正在上升。
                      </div>
                      <div>
                        <strong className="text-amber-300">▪ TC (真實計數 = RC ÷ 剩餘副數)：</strong>
                        將流水計數平均到每一副牌。<strong>TC 才是評估真實勝率的科學指標</strong>，TC 每增加 +1，玩家勝率與優勢提升約 0.5%！
                      </div>
                      <div className="pt-0.5 border-t border-stone-800/50 text-stone-300 text-[10px] font-medium">
                        💡 <span className="text-amber-400">實戰秘訣：</span>
                        當 <span className="text-emerald-400 font-bold font-mono">TC &ge; +2</span> 時，莊家易爆牌且玩家拿到 21 點機率高，為<span className="text-emerald-300 font-bold">加大注碼的最佳時機</span>！
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. CASINO CHIP SELECTOR TRAY (Full authentic round casino chips) */}
        <div className="rounded-xl bg-[#0c0e14] border border-amber-500/20 p-1.5 shadow-lg shrink-0">
          <ChipSelector
            selectedChip={selectedChip}
            onSelectChip={handleChipClick}
            disabled={phase !== 'betting' && phase !== 'round_over'}
            balance={balance}
          />
        </div>

        {/* 4. ACTION CONTROLS PANEL (Fixed stable height of 154px to eliminate all layout jumping) */}
        <div
          id="blackjack-action-controls-panel"
          className="h-[154px] min-h-[154px] max-h-[154px] p-2 rounded-xl bg-[#0c0e17] border border-amber-500/30 shadow-xl flex flex-col justify-between shrink-0 overflow-hidden"
        >
          {/* Betting Phase Controls */}
          {phase === 'betting' && (
            <div className="h-full flex flex-col justify-between">
              {/* Row 1: Header - Current Bet & Quick Chip Coins */}
              <div className="flex items-center justify-between gap-1 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-300 font-bold">當前注金:</span>
                  <span className="text-base sm:text-lg font-black font-mono text-amber-400">
                    ${currentBet.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-400 font-bold mr-0.5 hidden sm:inline">加碼:</span>
                  {[100, 500, 1000, 5000].map((amt) => {
                    const chipStyle =
                      amt === 100
                        ? 'from-blue-600 via-blue-500 to-blue-700 border-blue-400 text-white shadow-blue-900/40'
                        : amt === 500
                        ? 'from-purple-600 via-purple-500 to-purple-700 border-purple-400 text-white shadow-purple-900/40'
                        : amt === 1000
                        ? 'from-amber-500 via-yellow-400 to-amber-600 border-amber-200 text-stone-950 font-black shadow-amber-900/40'
                        : 'from-rose-600 via-rose-500 to-rose-700 border-rose-400 text-white shadow-rose-900/40';

                    return (
                      <button
                        key={amt}
                        id={`btn-bj-quick-add-${amt}`}
                        disabled={balance < amt}
                        onClick={() => handleChipClick(amt)}
                        className={`relative py-0.5 px-2 rounded-full bg-gradient-to-b border text-xs font-mono font-bold transition-all shadow-sm cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 select-none ${chipStyle}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                        <span>+${amt >= 1000 ? `${amt / 1000}k` : amt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Primary DEAL Action (Fixed in Row 2, perfectly matching HIT/STAND and REBET) */}
              <button
                id="btn-bj-deal"
                disabled={currentBet === 0}
                onClick={handleDeal}
                className={`action-btn w-full min-h-[44px] flex items-center justify-center gap-2 py-2 rounded-xl font-black text-base tracking-wider uppercase shadow-xl transition-all cursor-pointer ${
                  currentBet > 0
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-[0.98]'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span>開始發牌 (DEAL)</span>
              </button>

              {/* Row 3: Secondary Bet Controls (Clear, Double, Rebet) & Balance Info */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-800/80 text-xs">
                <div className="text-[11px] text-stone-400 flex items-center gap-1 font-mono">
                  <span>餘額:</span>
                  <span className="font-bold text-amber-400">${balance.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-bj-undo"
                    disabled={currentBet === 0 || betHistoryStack.length === 0}
                    onClick={handleUndoBet}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-300 border border-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="撤銷上一筆下注 (快捷鍵: Z)"
                  >
                    <Undo2 className="w-3 h-3 text-amber-400" />
                    <span>撤銷</span>
                  </button>
                  <button
                    id="btn-bj-clear"
                    disabled={currentBet === 0}
                    onClick={handleClearBet}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-200 border border-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="清除所有押注 (快捷鍵: C)"
                  >
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>清除</span>
                  </button>
                  <button
                    id="btn-bj-double-placed"
                    disabled={currentBet === 0 || balance < currentBet}
                    onClick={handleDoublePlacedBet}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="押注加倍 2X (快捷鍵: X)"
                  >
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                    <span>加倍 2X</span>
                  </button>
                  <button
                    id="btn-bj-rebet"
                    disabled={lastRoundBet === 0 || balance < lastRoundBet}
                    onClick={handleRebet}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="重複上一輪下注 (快捷鍵: R)"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>同額續注</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Insurance Phase Controls - STRICTLY 3-ROW FIXED HEIGHT ALIGNMENT (Zero jumping) */}
          {phase === 'insurance' && (
            <div className="h-full flex flex-col justify-between animate-in fade-in">
              {/* Row 1: Header - Insurance question & amount */}
              <div className="flex items-center justify-between text-xs sm:text-sm text-amber-300 font-bold px-1">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  莊家明牌 Ace：是否購買保險？
                </span>
                <span className="font-mono font-bold text-amber-400">
                  保金: ${Math.floor(currentBet / 2).toLocaleString()}
                </span>
              </div>

              {/* Row 2: Fixed Row 2 Primary Buttons (Anchored to exact same 44px Row 2 as HIT/STAND and DEAL) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-bj-buy-insurance"
                  disabled={balance < Math.floor(currentBet / 2)}
                  onClick={handleBuyInsurance}
                  className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-stone-950 text-xs sm:text-sm font-black shadow transition-all cursor-pointer active:scale-95"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>購買保險 (${Math.floor(currentBet / 2).toLocaleString()})</span>
                </button>
                <button
                  id="btn-bj-skip-insurance"
                  onClick={handleSkipInsurance}
                  className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
                >
                  <span>放棄保險</span>
                </button>
              </div>

              {/* Row 3: Auxiliary description & balance (matches Surrender and Double Rebet Row 3) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80 text-xs">
                <p className="text-[11px] text-stone-400">
                  若莊家底牌為 10 點牌組成 BlackJack，保險按 2:1 賠付。
                </p>
                <div className="text-[11px] text-stone-400 flex items-center gap-1 font-mono shrink-0">
                  <span>餘額:</span>
                  <span className="font-bold text-amber-400">${balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Player Turn Controls (Hit, Stand, Double Down, Split, Surrender) */}
          {phase === 'player_turn' && (
            <div className="h-full flex flex-col justify-between">
              {/* Row 1: Active turn info */}
              <div className="flex items-center justify-between text-xs sm:text-sm text-amber-300 font-bold px-1">
                <span className="flex items-center gap-1">
                  {isSplit ? `分牌操作 [手牌 ${activeHandIndex + 1}/2]:` : '玩家回合操作:'}
                </span>
                <span className="font-mono text-sm sm:text-base font-black">
                  ${isSplit ? (activeHandIndex === 0 ? currentBet : splitBet).toLocaleString() : currentBet.toLocaleString()}
                </span>
              </div>

              {/* Row 2: Fixed-position Hit / Stand / Double / Split buttons */}
              <div className={`grid ${canSplit ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5`}>
                {/* Hit Button */}
                <button
                  id="btn-bj-hit"
                  onClick={handleHit}
                  className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs sm:text-sm font-black shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>要牌 (HIT)</span>
                </button>

                {/* Stand Button */}
                <button
                  id="btn-bj-stand"
                  onClick={handleStand}
                  className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white text-xs sm:text-sm font-black shadow-[0_0_12px_rgba(225,29,72,0.4)] transition-all cursor-pointer active:scale-95"
                >
                  <HandIcon className="w-4 h-4" />
                  <span>停牌 (STAND)</span>
                </button>

                {/* Double Down button */}
                <button
                  id="btn-bj-doubledown"
                  disabled={
                    !isSplit
                      ? playerHand.cards.length !== 2 || balance < currentBet
                      : activeHandIndex === 0
                      ? playerHand.cards.length !== 2 || balance < currentBet
                      : !splitHand || splitHand.cards.length !== 2 || balance < splitBet
                  }
                  onClick={handleDoubleDown}
                  className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-purple-900/90 hover:bg-purple-800 disabled:opacity-30 text-purple-200 border border-purple-500/60 text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>雙倍 (2X)</span>
                </button>

                {/* Split Button */}
                {canSplit && (
                  <button
                    id="btn-bj-split"
                    onClick={handleSplit}
                    className="action-btn flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-black shadow-[0_0_12px_rgba(59,130,246,0.4)] transition-all cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Layers className="w-4 h-4" />
                    <span>分牌 (SPLIT)</span>
                  </button>
                )}
              </div>

              {/* Row 3: Surrender row is ALWAYS rendered so buttons above never jump! */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-stone-500" />
                  <span>起手認賠保護：</span>
                </div>
                <button
                  id="btn-bj-surrender"
                  disabled={!canSurrender}
                  onClick={handleSurrender}
                  className={`action-btn w-full sm:w-auto ml-auto flex items-center justify-center gap-1.5 px-3 py-1 min-h-[34px] rounded-lg border text-xs font-semibold shadow-sm transition-all ${
                    canSurrender
                      ? 'bg-stone-900/90 hover:bg-stone-800 active:bg-stone-700 text-stone-300 hover:text-white border-stone-700/80 hover:border-amber-500/50 cursor-pointer active:scale-95'
                      : 'bg-stone-900/40 text-stone-600 border-stone-800/50 cursor-not-allowed opacity-40'
                  }`}
                  title={canSurrender ? '投降認賠，立即回收50%賭注' : '已要牌，無法投降 (投降僅限起手首兩張牌)'}
                >
                  <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${canSurrender ? 'text-amber-400/90' : 'text-stone-600'}`} />
                  <span>
                    {canSurrender ? (
                      <>
                        投降 (SURRENDER) · <strong className="text-amber-300 font-bold">回收50%</strong> (${Math.floor(currentBet / 2).toLocaleString()})
                      </>
                    ) : (
                      '已要牌 (僅限起手牌可投降)'
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Settled Phase Controls */}
          {phase === 'settled' && (
            <div className="h-full flex flex-col justify-between">
              {/* Row 1: Net profit and brief settlement note */}
              <div className="flex items-center justify-between text-xs sm:text-sm px-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-stone-400 text-xs">本局結算:</span>
                  <span
                    className={`font-black font-mono text-sm sm:text-base ${
                      roundResult && roundResult.netProfit > 0
                        ? 'text-emerald-400'
                        : roundResult && roundResult.netProfit === 0
                        ? 'text-amber-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {roundResult
                      ? roundResult.netProfit >= 0
                        ? `+$${roundResult.netProfit.toLocaleString()}`
                        : `-$${Math.abs(roundResult.netProfit).toLocaleString()}`
                      : '$0'}
                  </span>
                </div>

                <div className="text-[11px] text-stone-300 font-mono py-0.5 truncate max-w-[220px] sm:max-w-[300px]">
                  {roundResult?.description || '牌局結算完成'}
                </div>
              </div>

              {/* Row 2: PRIMARY ACTION HOT-ZONE - Coincides exactly with HIT & STAND position in player_turn! */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="btn-bj-rebet-deal"
                  disabled={balance < lastRoundBet}
                  onClick={handleRebetAndDeal}
                  className="col-span-2 action-btn flex items-center justify-center gap-2 min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-30 disabled:pointer-events-none text-stone-950 text-xs sm:text-sm font-black shadow-[0_0_16px_rgba(245,158,11,0.5)] transition-all cursor-pointer active:scale-95 group"
                  title="以相同注額立即發牌（熱鍵：R 或空白鍵）"
                >
                  <RotateCcw className="w-4 h-4 text-stone-950 group-hover:-rotate-45 transition-transform" />
                  <span>同額續注發牌 (${lastRoundBet.toLocaleString()})</span>
                </button>

                <button
                  id="btn-bj-play-again"
                  onClick={handlePlayAgain}
                  className="col-span-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
                  title="返回下注區自由調整籌碼"
                >
                  <span>調整注碼</span>
                </button>
              </div>

              {/* Row 3: Secondary Action Row (Matches Surrender Row Height) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80 text-xs">
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                  <span>當前籌碼:</span>
                  <span className="font-mono font-bold text-amber-400">${balance.toLocaleString()}</span>
                </div>

                <button
                  id="btn-bj-double-rebet-deal"
                  disabled={balance < lastRoundBet * 2}
                  onClick={handleDoubleRebetAndDeal}
                  className="flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-lg bg-purple-950/80 hover:bg-purple-900 disabled:opacity-30 text-purple-200 border border-purple-500/50 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                  title="以上一把的 2 倍注額直接發牌"
                >
                  <Plus className="w-3 h-3 text-purple-300" />
                  <span>加倍續注 (${(lastRoundBet * 2).toLocaleString()})</span>
                </button>
              </div>
            </div>
          )}


          {/* Dealing / Dealer Turn Indicator */}
          {(phase === 'dealing' || phase === 'dealer_turn') && (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-2 text-center animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>{phase === 'dealing' ? '牌局正在發牌中...' : '莊家正在補牌與結算中...'}</span>
              </div>
              <div className="w-44 h-1.5 rounded-full bg-stone-800 overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 w-1/2 rounded-full animate-pulse mx-auto" />
              </div>
              <p className="text-[11px] text-stone-400 font-mono">
                牌局進行中，按鈕已鎖定以防誤觸
              </p>
            </div>
          )}
        </div>


            </div>
          )}
        </div>

      {/* MOBILE & TABLET SLIDE-UP COLLAPSIBLE DRAWER (收納式21點戰報與籌碼選單 - 手機與平板專屬) */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1 w-full"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="w-full max-h-[88vh] overflow-hidden flex flex-col bg-[#0b0e14] border-t-2 border-amber-500/60 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="p-3 bg-stone-950/95 border-b border-stone-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300 leading-tight">
                    21點分析與籌碼選單
                  </h3>
                  <span className="text-[11px] text-stone-400 font-mono">
                    當前注額: ${currentBet.toLocaleString()} • 餘額: ${balance.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-bold border border-stone-700 flex items-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
              >
                <span>收起選單</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 flex flex-col gap-2.5">
              {/* 1. Drawer Safe Mode: Chip Selector Tray & Mandatory Confirm Exit Button */}
              <div className="rounded-xl bg-[#0c0e14] border border-amber-500/30 p-3 shadow-xl flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-stone-300 pb-2 border-b border-stone-800">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>安全防誤觸模式已啟用</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    目前籌碼: ${selectedChip.toLocaleString()}
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed">
                  此選單僅供切換籌碼幣值與查看牌靴算牌數據。選定欲使用的籌碼面額後，請點擊下方「確定退出」按鈕，返回牌桌即可點擊押注區進行下注。
                </p>

                <div className="w-full">
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelectChip={(val) => {
                      onSelectChip?.(val);
                      sound.playChip();
                    }}
                    disabled={phase !== 'betting' && phase !== 'round_over'}
                    balance={balance}
                  />
                </div>

                <button
                  id="btn-blackjack-drawer-confirm"
                  onClick={() => {
                    sound.playChip();
                    setIsDrawerOpen(false);
                    toastService.info(`已設定下注籌碼面額：$${selectedChip.toLocaleString()}`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-stone-950" />
                  <span>確定退出 (使用 ${selectedChip.toLocaleString()} 籌碼)</span>
                </button>
              </div>

              {/* 2. Hi-Lo Card Counting Calculations from Active Shoe */}
              {(() => {
                const shoeRankCounts = shoe.reduce((acc, c) => {
                  acc[c.rank] = (acc[c.rank] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const lowDealt = ['2', '3', '4', '5', '6'].reduce((sum, r) => sum + (24 - (shoeRankCounts[r] || 0)), 0);
                const highDealt = ['10', 'J', 'Q', 'K', 'A'].reduce((sum, r) => sum + (24 - (shoeRankCounts[r] || 0)), 0);
                const runningCount = lowDealt - highDealt;
                const decksRemaining = Math.max(0.5, shoe.length / 52);
                const trueCount = Math.round((runningCount / decksRemaining) * 10) / 10;

                const countAdvantage =
                  trueCount >= 2
                    ? {
                        title: '✨ 牌面偏大（有利玩家加注）',
                        text: '牌靴剩餘較多 10 點與 A，莊家補牌極易爆牌，適合把握時機提高注額！',
                        badgeColor: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/60',
                      }
                    : trueCount <= -2
                    ? {
                        title: '⚠️ 牌面偏小（有利莊家保守）',
                        text: '牌靴剩餘較多小牌（2-6），莊家補牌不易爆牌，建議減注或保守應對。',
                        badgeColor: 'text-rose-300 border-rose-500/50 bg-rose-950/60',
                      }
                    : {
                        title: '⚖️ 局勢中立（常規下注）',
                        text: '高低牌分佈均衡，建議依照標準基本策略操作。',
                        badgeColor: 'text-stone-300 border-stone-600 bg-stone-900/60',
                      };

                return (
                  <div className="p-2.5 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                      <div className="flex items-center gap-1.5 text-stone-200 font-bold text-xs">
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hi-Lo 牌力推算與局勢分析</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        剩餘牌靴: {shoe.length} 張 ({Math.round(decksRemaining * 10) / 10} 副)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                        <div className="text-[10px] text-stone-400">流水數 (RC)</div>
                        <div className={`font-mono font-black text-sm ${runningCount > 0 ? 'text-emerald-400' : runningCount < 0 ? 'text-rose-400' : 'text-stone-200'}`}>
                          {runningCount > 0 ? `+${runningCount}` : runningCount}
                        </div>
                      </div>
                      <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                        <div className="text-[10px] text-stone-400">真數 (True Count)</div>
                        <div className={`font-mono font-black text-sm ${trueCount > 0 ? 'text-emerald-400' : trueCount < 0 ? 'text-rose-400' : 'text-stone-200'}`}>
                          {trueCount > 0 ? `+${trueCount}` : trueCount}
                        </div>
                      </div>
                      <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                        <div className="text-[10px] text-stone-400">牌靴剩餘</div>
                        <div className="font-mono font-black text-sm text-amber-400">{shoe.length} 張</div>
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg border text-xs leading-relaxed ${countAdvantage.badgeColor}`}>
                      <div className="font-bold mb-0.5">{countAdvantage.title}</div>
                      <div className="text-[11px] opacity-90">{countAdvantage.text}</div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Lifetime Stats */}
              <div className="p-2.5 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                  <div className="flex items-center gap-1.5 text-stone-300 font-bold text-xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>21點生涯戰績</span>
                  </div>
                  <button
                    onClick={() => {
                      setStats({
                        handsPlayed: 0,
                        wins: 0,
                        losses: 0,
                        pushes: 0,
                        blackjacks: 0,
                        highestWin: 0,
                      });
                    }}
                    className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    清空戰績
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-stone-400">總局數</div>
                    <div className="font-mono font-black text-xs text-stone-100">{stats.handsPlayed}</div>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-emerald-400">勝局</div>
                    <div className="font-mono font-black text-xs text-emerald-400">{stats.wins}</div>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-rose-400">負局</div>
                    <div className="font-mono font-black text-xs text-rose-400">{stats.losses}</div>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-amber-300">BJ 次數</div>
                    <div className="font-mono font-black text-xs text-amber-300">{stats.blackjacks}</div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
};
