import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cfss-green focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    let variantStyles = "";
    if (variant === "default") {
      variantStyles = "bg-cfss-green text-white hover:bg-cfss-green-hover shadow-sm";
    } else if (variant === "outline") {
      variantStyles = "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900";
    } else if (variant === "ghost") {
      variantStyles = "bg-transparent hover:bg-gray-100 text-gray-900";
    } else if (variant === "destructive") {
      variantStyles = "bg-red-600 text-white hover:bg-red-700 shadow-sm";
    }

    let sizeStyles = "";
    if (size === "default") {
      sizeStyles = "h-10 py-2 px-4 text-sm";
    } else if (size === "sm") {
      sizeStyles = "h-8 px-3 text-xs";
    } else if (size === "lg") {
      sizeStyles = "h-12 px-8 text-base";
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
