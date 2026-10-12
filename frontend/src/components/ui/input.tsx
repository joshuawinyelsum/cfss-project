import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cfss-green/20 focus:border-cfss-green disabled:cursor-not-allowed disabled:bg-surface-elevated/50 disabled:text-secondary disabled:border-border transition-colors ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
