import React, { useState } from "react";

/**
 * Minimal fake "shadcn-like" Select implementation.
 * It behaves like a normal <select>, but exposes the same
 * components imported in the pages:
 *
 * Select, SelectTrigger, SelectContent, SelectItem, SelectValue
 */

type SelectContextType = {
  value: string;
  setValue: (v: string) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};

export const Select: React.FC<SelectProps> = ({
  value,
  defaultValue,
  onValueChange,
  children,
}) => {
  const [internal, setInternal] = useState(defaultValue ?? "");

  const val = value !== undefined ? value : internal;

  const setValue = (v: string) => {
    if (value === undefined) {
      setInternal(v);
    }
    onValueChange?.(v);
  };

  return (
    <SelectContext.Provider value={{ value: val, setValue }}>
      {children}
    </SelectContext.Provider>
  );
};

export type SelectTriggerProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  className = "",
  children,
  ...props
}) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    return (
      <select
        className={"border rounded px-3 py-2 text-sm " + className}
        {...props}
      >
        {children}
      </select>
    );
  }

  return (
    <select
      className={"border rounded px-3 py-2 text-sm " + className}
      value={ctx.value}
      onChange={(e) => ctx.setValue(e.target.value)}
      {...props}
    >
      {children}
    </select>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

export type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  value: string;
};

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  ...props
}) => <option {...props}>{children}</option>;

export const SelectValue: React.FC<{ placeholder?: string }> = () => null;

export default Select;
