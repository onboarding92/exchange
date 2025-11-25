import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ className = "", ...props }) => (
  <div
    className={
      "rounded-lg border border-border bg-background shadow-sm " + className
    }
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div className={"p-4 border-b border-border " + className} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = "",
  ...props
}) => (
  <h2 className={"font-semibold text-lg " + className} {...props} />
);

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className = "", ...props }) => (
  <p className={"text-sm text-muted-foreground " + className} {...props} />
);

export const CardContent: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", ...props }) => (
  <div className={"p-4 space-y-3 " + className} {...props} />
);

export default Card;
