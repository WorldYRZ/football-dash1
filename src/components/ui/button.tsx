import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-pixel uppercase tracking-wider transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-4 border-primary-foreground shadow-[4px_4px_0_hsl(var(--primary-foreground))] hover:shadow-[2px_2px_0_hsl(var(--primary-foreground))] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1",
        destructive:
          "bg-destructive text-destructive-foreground border-4 border-destructive-foreground shadow-[4px_4px_0_hsl(var(--destructive-foreground))] hover:shadow-[2px_2px_0_hsl(var(--destructive-foreground))] hover:translate-x-0.5 hover:translate-y-0.5",
        outline:
          "border-4 border-primary bg-background text-primary shadow-[4px_4px_0_hsl(var(--primary))] hover:bg-primary hover:text-primary-foreground hover:shadow-[2px_2px_0_hsl(var(--primary))] hover:translate-x-0.5 hover:translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground border-4 border-secondary-foreground shadow-[4px_4px_0_hsl(var(--secondary-foreground))] hover:shadow-[2px_2px_0_hsl(var(--secondary-foreground))] hover:translate-x-0.5 hover:translate-y-0.5",
        ghost: "text-primary hover:bg-primary/20 border-2 border-transparent hover:border-primary",
        link: "text-primary underline-offset-4 hover:underline font-pixel",
        arcade: "bg-accent text-accent-foreground border-4 border-accent-foreground shadow-[4px_4px_0_hsl(var(--accent-foreground))] hover:shadow-[2px_2px_0_hsl(var(--accent-foreground))] hover:translate-x-0.5 hover:translate-y-0.5 animate-neon-pulse",
      },
      size: {
        default: "h-12 px-6 py-3 text-xs",
        sm: "h-10 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4 text-sm",
        icon: "h-12 w-12 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
