import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,scale] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-acao disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-laranja-acao text-primary-foreground shadow-suave hover:bg-vinho",
        secondary: "bg-amarelo text-vinho shadow-suave hover:bg-mostarda",
        outline: "border-2 border-marrom bg-transparent text-marrom hover:bg-creme",
        ghost: "text-marrom hover:bg-creme",
        link: "text-laranja-acao underline underline-offset-4 hover:text-vinho px-0 h-auto active:scale-100",
        destructive: "bg-erro text-destructive-foreground hover:opacity-90",
        google: "border-2 border-marrom bg-card text-marrom shadow-suave hover:bg-creme",
        claro: "bg-offwhite text-vinho hover:bg-creme",
        contornoClaro: "border-2 border-offwhite/80 text-offwhite hover:bg-offwhite/10",
      },
      size: {
        default: "min-h-11 px-5 py-2",
        sm: "min-h-11 px-4 text-sm",
        lg: "min-h-13 px-7 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
