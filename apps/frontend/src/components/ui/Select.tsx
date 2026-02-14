import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { type ComponentPropsWithoutRef } from 'react';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({ className, children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex items-center justify-between w-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 font-bold shadow-[2px_2px_0px_0px_var(--border)]',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <span className="ml-2">&#9662;</span>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'z-50 border-2 border-[var(--border)] bg-[var(--background)] shadow-[4px_4px_0px_0px_var(--border)]',
          className
        )}
        position="popper"
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn('cursor-pointer px-3 py-2 font-bold outline-none hover:bg-[var(--overlay)]', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
