import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-vault-600 text-white hover:bg-vault-500 shadow-glow hover:shadow-glow active:scale-[0.98]",
        gold:
          "bg-gradient-gold text-surface-900 font-semibold hover:brightness-110 shadow-glow-gold active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]",
        outline:
          "border border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm active:scale-[0.98]",
        ghost:
          "text-white/70 hover:text-white hover:bg-white/10 active:scale-[0.98]",
        glass:
          "border border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 shadow-glass active:scale-[0.98]",
        link: "text-vault-400 underline-offset-4 hover:underline hover:text-vault-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
