import { ChipDenomination } from '../types/roulette';

// Standard European single-zero roulette wheel order clockwise from 0
export const WHEEL_NUMBERS: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS: number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
];

export const BLACK_NUMBERS: number[] = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
];

export const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
};

export const CHIP_DENOMINATIONS: ChipDenomination[] = [
  {
    value: 100,
    label: '100',
    color: 'bg-blue-600',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-50',
    glowColor: 'rgba(59, 130, 246, 0.6)',
  },
  {
    value: 200,
    label: '200',
    color: 'bg-emerald-600',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-50',
    glowColor: 'rgba(16, 185, 129, 0.6)',
  },
  {
    value: 500,
    label: '500',
    color: 'bg-purple-600',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-50',
    glowColor: 'rgba(168, 85, 247, 0.6)',
  },
  {
    value: 1000,
    label: '1K',
    color: 'bg-amber-500',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-950 font-black',
    glowColor: 'rgba(245, 158, 11, 0.7)',
  },
  {
    value: 2000,
    label: '2K',
    color: 'bg-rose-600',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-50 font-black',
    glowColor: 'rgba(225, 29, 72, 0.7)',
  },
];

export const INITIAL_BALANCE = 20000;
