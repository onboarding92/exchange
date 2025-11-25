import React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({
  className = "",
  ...props
}) => (
  <textarea
    className={
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
      "shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 " +
      "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 " +
      className
    }
    {...props}
  />
);

export default Textarea;
