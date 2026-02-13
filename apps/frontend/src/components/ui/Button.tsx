import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold border-2 border-[var(--border)] transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-[var(--main)] text-white shadow-[2px_2px_0px_0px_var(--shadow)] hover:-translate-y-0.5',
        secondary: 'bg-[var(--secondary)] text-white shadow-[2px_2px_0px_0px_var(--shadow)] hover:-translate-y-0.5',
        outline: 'bg-[var(--background)] shadow-[2px_2px_0px_0px_var(--shadow)] hover:-translate-y-0.5',
        ghost: 'border-transparent shadow-none hover:bg-black/5',
        destructive: 'bg-red-500 text-white shadow-[2px_2px_0px_0px_var(--shadow)] hover:-translate-y-0.5',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});

Button.displayName = 'Button';
