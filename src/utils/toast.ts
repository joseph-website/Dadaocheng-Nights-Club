import { sound } from './audio';

export interface ToastMessage {
  id: string;
  type?: 'warning' | 'info' | 'error' | 'success';
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export const toastService = {
  subscribe(listener: ToastListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  show(message: string, type: 'warning' | 'info' | 'error' | 'success' = 'warning', title?: string, duration = 3000) {
    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      title: title || (type === 'warning' ? '警告' : type === 'error' ? '警告' : type === 'success' ? '操作成功' : '系統提醒'),
      duration,
    };
    if (type === 'error' || type === 'warning') {
      sound.playLoss();
    } else {
      sound.playClick();
    }
    listeners.forEach((fn) => fn(toast));
  },

  warn(message: string, title = '警告') {
    this.show(message, 'warning', title, 3200);
  },

  info(message: string, title = '系統提示') {
    this.show(message, 'info', title, 2800);
  },

  error(message: string, title = '警告') {
    this.show(message, 'error', title, 3500);
  },

  success(message: string, title = '成功') {
    this.show(message, 'success', title, 2500);
  },
};

// Convenience global trigger for simple imports
export const showCasinoToast = (message: string, type: 'warning' | 'info' | 'error' | 'success' = 'warning', title?: string) => {
  toastService.show(message, type, title);
};
