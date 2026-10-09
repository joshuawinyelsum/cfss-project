import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning";
  title?: string;
}

export function Alert({ className = "", variant = "default", title, children, ...props }: AlertProps) {
  let bg = "bg-gray-50 border-gray-200 text-gray-800";
  let Icon = Info;
  let iconColor = "text-gray-500";

  if (variant === "destructive") {
    bg = "bg-red-50 border-red-200 text-red-800";
    Icon = AlertCircle;
    iconColor = "text-red-500";
  } else if (variant === "success") {
    bg = "bg-green-50 border-green-200 text-green-800";
    Icon = CheckCircle2;
    iconColor = "text-green-500";
  } else if (variant === "warning") {
    bg = "bg-amber-50 border-amber-200 text-amber-800";
    Icon = AlertTriangle;
    iconColor = "text-amber-500";
  }

  return (
    <div className={`flex rounded-md border p-4 ${bg} ${className}`} role="alert" {...props}>
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="ml-3 text-sm flex-1">
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
