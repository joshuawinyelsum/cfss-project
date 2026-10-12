import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cfss-green/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg cursor-pointer";
    
    let variantStyles = "";
    if (variant === "default") {
      variantStyles = "bg-cfss-green text-white hover:bg-cfss-green-hover shadow-xs active:translate-y-px";
    } else if (variant === "outline") {
      variantStyles = "border border-border-strong bg-surface text-primary hover:bg-surface-elevated hover:text-primary";
    } else if (variant === "secondary") {
      variantStyles = "bg-surface-elevated text-primary hover:bg-surface-elevated/80 border border-border";
    } else if (variant === "ghost") {
      variantStyles = "bg-transparent hover:bg-surface-elevated text-secondary hover:text-primary";
    } else if (variant === "destructive") {
      variantStyles = "bg-red-600 text-white hover:bg-red-700 shadow-xs";
    }

    let sizeStyles = "";
    if (size === "default") {
      sizeStyles = "h-9 py-2 px-4 text-sm";
    } else if (size === "sm") {
      sizeStyles = "h-8 px-3 text-xs";
    } else if (size === "lg") {
      sizeStyles = "h-11 px-6 text-sm";
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
