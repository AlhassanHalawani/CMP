import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center border-2 border-[var(--border)] px-2 py-0.5 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-[var(--main)] text-white',
      secondary: 'bg-[var(--secondary)] text-white',
      outline: 'bg-[var(--background)]',
      accent: 'bg-[var(--overlay)] text-[var(--foreground)]',
    },
  },
  defaultVariants: { variant: 'default' },
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
