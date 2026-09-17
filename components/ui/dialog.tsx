"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useId } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps {
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
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
  const descriptionId = useId();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50" />
      <DialogPrimitive.Content
        className={cn(
          "dialog-content fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 p-4 sm:p-0",
          className,
        )}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="modal-frame">
          <div className="modal-heading">
            <div className="min-w-0">
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description id={descriptionId}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              onClick={onClose}
              className="icon-button shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
