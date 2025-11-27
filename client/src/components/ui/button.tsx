import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: React.FC<ButtonProps> = ({
  className = "",
  ...props
}) => (
  <button
    className={
      "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium " +
      "bg-primary text-primary-foreground hover:bg-gray-200 transition-allopacity-90 disabled:opacity-50 disabled:cursor-not-allowed " +
      className
    }
    {...props}
  />
);

export default Button;
