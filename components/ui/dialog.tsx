"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

type DialogContextValue = {
  open: boolean;
};

const DialogContext = React.createContext<DialogContextValue>({ open: false });

export function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open }}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setUncontrolledOpen(next);
          onOpenChange?.(next);
        }}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  const { open } = React.useContext(DialogContext);

  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="dialog-overlay"
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            <DialogPrimitive.Overlay className="absolute inset-0" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              key="dialog-content"
              className={cn(
                "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border border-border bg-popover p-5 text-popover-foreground shadow-lg focus:outline-none",
                className,
              )}
              initial={{ opacity: 0, scale: 0.97, x: "-50%", y: "calc(-50% + 12px)" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.98, x: "-50%", y: "calc(-50% + 8px)" }}
              transition={{ duration: 0.24, ease: easeOut }}
            >
              {children}
              <DialogPrimitive.Close
                className="absolute right-3 top-3 border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
