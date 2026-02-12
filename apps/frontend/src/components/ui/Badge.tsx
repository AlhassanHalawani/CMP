import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center border-2 border-[var(--color-border)] px-2 py-0.5 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-[var(--color-primary)] text-white',
      secondary: 'bg-[var(--color-secondary)] text-white',
      outline: 'bg-[var(--color-surface)]',
      accent: 'bg-[var(--color-accent)] text-[var(--color-text)]',
    },
  },
  defaultVariants: { variant: 'default' },
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
