import React from "react";

/**
 * Stub per il componente "Toaster" usato in App.tsx.
 *
 * Nella versione originale del progetto non era presente la libreria "sonner",
 * e la gestione delle notifiche è già implementata in src/notifications.tsx.
 *
 * Questo stub serve solo a soddisfare l import:
 *   import { Toaster } from "./components/ui/sonner";
 *
 * Se in futuro vuoi usare davvero "sonner", basterà:
 *   1) installare `sonner` nel client
 *   2) sostituire questo file con:
 *        import { Toaster } from "sonner";
 *        export { Toaster };
 *        export default Toaster;
 */

export type ToasterProps = {
  position?: string;
};

export function Toaster(_props: ToasterProps) {
  // Non fa nulla: le notifiche vengono gestite da NotificationProvider
  return null;
}

export default Toaster;
