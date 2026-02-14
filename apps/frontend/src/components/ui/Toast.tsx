import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { type ComponentPropsWithoutRef } from 'react';

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn('fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px]', className)}
      {...props}
    />
  );
}

export function Toast({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        'border-2 border-[var(--border)] bg-[var(--background)] p-4 shadow-[4px_4px_0px_0px_var(--border)] data-[state=open]:animate-in data-[state=closed]:animate-out',
        className
      )}
      {...props}
    />
  );
}

export function ToastTitle({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn('font-black', className)} {...props} />;
}

export function ToastDescription({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn('text-sm mt-1', className)} {...props} />;
}

export const ToastAction = ToastPrimitive.Action;
export const ToastClose = ToastPrimitive.Close;
