import React from "react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-xs font-semibold text-secondary mb-1.5 ${className}`}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
