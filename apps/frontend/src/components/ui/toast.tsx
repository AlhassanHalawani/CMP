"use client"

import * as ToastPrimitive from "@radix-ui/react-toast"

import { cn } from "@/lib/utils"

import type { ComponentPropsWithoutRef } from "react"

const ToastProvider = ToastPrimitive.Provider

function ToastViewport({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed right-4 bottom-4 z-[100] flex w-[360px] flex-col gap-2",
        className,
      )}
      {...props}
    />
  )
}

function Toast({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "border-2 border-border bg-background p-4 shadow-shadow data-[state=open]:animate-in data-[state=closed]:animate-out",
        className,
      )}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("font-heading", className)} {...props} />
}

function ToastDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn("mt-1 text-sm", className)} {...props} />
}

const ToastAction = ToastPrimitive.Action
const ToastClose = ToastPrimitive.Close

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
}
