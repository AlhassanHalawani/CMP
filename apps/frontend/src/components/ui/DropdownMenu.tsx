import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { type ComponentPropsWithoutRef } from 'react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'z-50 min-w-[160px] border-2 border-[var(--border)] bg-[var(--background)] p-1 shadow-[4px_4px_0px_0px_var(--border)]',
          className
        )}
        sideOffset={4}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn('cursor-pointer px-3 py-2 font-bold outline-none hover:bg-[var(--overlay)]', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn('my-1 h-[2px] bg-[var(--border)]', className)} {...props} />;
}
