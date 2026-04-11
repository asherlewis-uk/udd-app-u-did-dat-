'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactNode;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ToastInput = Omit<ToastProps, 'id' | 'open' | 'onOpenChange'>;

interface ToastState {
  toasts: ToastProps[];
}

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: { type: 'add'; toast: ToastProps } | { type: 'remove'; id: string }) {
  if (action.type === 'add') {
    memoryState = { toasts: [...memoryState.toasts, action.toast] };
  } else {
    memoryState = { toasts: memoryState.toasts.filter((t) => t.id !== action.id) };
  }
  listeners.forEach((l) => l(memoryState));
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export function toast(input: ToastInput) {
  const id = genId();
  const duration = input.duration ?? 4000;

  dispatch({
    type: 'add',
    toast: {
      ...input,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dispatch({ type: 'remove', id });
      },
    },
  });

  setTimeout(() => {
    dispatch({ type: 'remove', id });
  }, duration);

  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { toasts: state.toasts, toast };
}
