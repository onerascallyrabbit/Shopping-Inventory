
export type ToastKind = 'success' | 'error' | 'info';

export const showToast = (message: string, kind: ToastKind = 'success') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, kind } }));
};

export const confirmAction = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('app-confirm', { detail: { message, resolve } }));
  });
};

export interface ChoiceOption {
  label: string;
  value: string;
}

export const chooseAction = (message: string, options: ChoiceOption[]): Promise<string | null> => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('app-choice', { detail: { message, options, resolve } }));
  });
};
