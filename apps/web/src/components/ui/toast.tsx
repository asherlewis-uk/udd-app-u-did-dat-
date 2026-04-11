'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex max-h-screen flex-col gap-2 w-[380px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

const variantStyles: Record<ToastVariant, { wrapper: string; icon: React.ReactNode }> = {
  default: { wrapper: 'border-white/[0.1]', icon: null },
  success: {
    wrapper: 'border-emerald-500/20 bg-emerald-500/5',
    icon: <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
  },
  error: {
    wrapper: 'border-red-500/20 bg-red-500/5',
    icon: <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
  },
  info: {
    wrapper: 'border-blue-500/20 bg-blue-500/5',
    icon: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  },
};

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: ToastVariant }
>(({ className, variant = 'default', ...props }, ref) => {
  const styles = variantStyles[variant];
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl',
        'border bg-surface p-4 shadow-2xl',
        'data-[state=open]:animate-slide-in-bottom data-[state=closed]:animate-fade-in',
        styles.wrapper,
        className,
      )}
      {...props}
    >
      {styles.icon}
      <div className="flex-1 grid gap-0.5">
        {props.children}
      </div>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = 'Toast';

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold text-text', className)}
    {...props}
  />
));
ToastTitle.displayName = 'ToastTitle';

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-xs text-text-secondary', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded p-0.5 text-text-muted hover:text-text transition-colors',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = 'ToastClose';

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-7 items-center justify-center rounded px-3 text-xs font-medium',
      'bg-surface-2 text-text hover:bg-surface-3 transition-colors border border-white/[0.07]',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';
