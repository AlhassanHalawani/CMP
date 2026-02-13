import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return (
    <div
      className={cn('animate-spin border-2 border-[var(--border)] border-t-transparent rounded-full', sizeClass, className)}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
