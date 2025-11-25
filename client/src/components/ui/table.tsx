import React from "react";

export const Table: React.FC<
  React.TableHTMLAttributes<HTMLTableElement>
> = ({ className = "", ...props }) => (
  <table
    className={"w-full border-collapse text-sm " + className}
    {...props}
  />
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className = "", ...props }) => (
  <thead className={"border-b border-border " + className} {...props} />
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className = "", ...props }) => (
  <tbody className={className} {...props} />
);

export const TableRow: React.FC<
  React.HTMLAttributes<HTMLTableRowElement>
> = ({ className = "", ...props }) => (
  <tr className={"border-b border-border " + className} {...props} />
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ className = "", ...props }) => (
  <th
    className={"text-left px-3 py-2 font-medium text-muted-foreground " + className}
    {...props}
  />
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ className = "", ...props }) => (
  <td className={"px-3 py-2 " + className} {...props} />
);

export default Table;
