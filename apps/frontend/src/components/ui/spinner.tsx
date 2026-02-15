import { cn } from "@/lib/utils"

type SpinnerProps = {
  className?: string
  size?: "sm" | "md" | "lg"
}

function Spinner({ className, size = "md" }: SpinnerProps) {
  const sizeClass = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" }[size]

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-border border-t-transparent",
        sizeClass,
        className,
      )}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Spinner }
