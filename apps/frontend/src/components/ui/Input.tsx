import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        'w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base outline-none focus:shadow-[2px_2px_0px_0px_var(--shadow)] transition-shadow',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';
