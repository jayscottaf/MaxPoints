'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps {
  title: string
  description?: string
  onClose?: () => void
  className?: string
  children: React.ReactNode
}

/**
 * Accessible modal built on Radix Dialog. Gives us focus trapping,
 * Escape-to-close, scroll lock and enter/exit animations for free.
 */
export function DialogContent({
  title,
  description,
  onClose,
  className,
  children,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'dialog-content fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 p-4 sm:p-0',
          className
        )}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
      >
        <div className="mx-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#1a1b23] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 p-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-xl font-semibold text-white">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-zinc-400">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto p-6">{children}</div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
