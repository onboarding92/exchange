import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => (
  <input
    className={
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm " +
      "shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 " +
      "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 " +
      className
    }
    {...props}
  />
);

export default Input;
