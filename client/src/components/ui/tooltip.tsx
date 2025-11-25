import React from "react";

/**
 * Stub per il TooltipProvider usato in App.tsx.
 *
 * Nel progetto originale non esisteva ancora il file UI tooltip,
 * ma App.tsx importava:
 *
 *   import { TooltipProvider } from "@/components/ui/tooltip";
 *
 * Qui forniamo un'implementazione minimale che semplicemente
 * wrappa i children. Se in futuro vorrai usare una libreria
 * (es. Radix + shadcn/ui), potrai sostituire questo file.
 */

export type TooltipProviderProps = {
  children: React.ReactNode;
};

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

export default TooltipProvider;
