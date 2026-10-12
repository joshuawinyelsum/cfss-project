import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning";
  title?: string;
}

export function Alert({ className = "", variant = "default", title, children, ...props }: AlertProps) {
  let bg = "bg-surface-elevated border-border-strong text-primary";
  let Icon = Info;
  let iconColor = "text-secondary";

  if (variant === "destructive") {
    bg = "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
    Icon = AlertCircle;
    iconColor = "text-red-600 dark:text-red-400";
  } else if (variant === "success") {
    bg = "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300";
    Icon = CheckCircle2;
    iconColor = "text-emerald-600 dark:text-emerald-400";
  } else if (variant === "warning") {
    bg = "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300";
    Icon = AlertTriangle;
    iconColor = "text-amber-600 dark:text-amber-400";
  }

  return (
    <div className={`flex rounded-xl border p-4 ${bg} ${className}`} role="alert" {...props}>
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="ml-3 text-sm flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
