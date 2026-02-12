import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        'w-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base outline-none focus:shadow-[var(--shadow-brutal-sm)] transition-shadow',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';
