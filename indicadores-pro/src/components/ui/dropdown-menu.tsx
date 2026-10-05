import * as DM from '@radix-ui/react-dropdown-menu'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger
export const DropdownMenuGroup = DM.Group
export const DropdownMenuRadioGroup = DM.RadioGroup

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DM.Content>,
  ComponentPropsWithoutRef<typeof DM.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DM.Portal>
    <DM.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[14rem] animate-fade-in overflow-hidden rounded-lg border bg-surface p-1 text-foreground shadow-lg',
        className,
      )}
      {...props}
    />
  </DM.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const itemClass =
  'relative flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground'

export const DropdownMenuItem = forwardRef<ElementRef<typeof DM.Item>, ComponentPropsWithoutRef<typeof DM.Item>>(
  ({ className, ...props }, ref) => <DM.Item ref={ref} className={cn(itemClass, className)} {...props} />,
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof DM.RadioItem>,
  ComponentPropsWithoutRef<typeof DM.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DM.RadioItem ref={ref} className={cn(itemClass, 'pr-8', className)} {...props}>
    {children}
    <DM.ItemIndicator className="absolute right-2.5 size-2 rounded-full bg-primary" />
  </DM.RadioItem>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export function DropdownMenuLabel({ className, ...props }: ComponentPropsWithoutRef<typeof DM.Label>) {
  return <DM.Label className={cn('px-2.5 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof DM.Separator>) {
  return <DM.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
