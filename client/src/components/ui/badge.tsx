import React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export const Badge: React.FC<BadgeProps> = ({ className = "", ...props }) => (
  <span
    className={
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold " +
      "bg-secondary text-secondary-foreground " +
      className
    }
    {...props}
  />
);

export default Badge;
