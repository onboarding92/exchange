/**
 * Client-side constants and helpers.
 *
 * In the original project, many pages import:
 *   import { getLoginUrl } from "@/const";
 *
 * but src/const.ts was missing. This file provides that helper.
 */

export const LOGIN_PATH = "/login";

/**
 * Returns the URL used for login redirects/links.
 * For now it's just a relative path. If in the future you
 * need an absolute URL, you can prepend window.location.origin.
 */
export function getLoginUrl(): string {
  return LOGIN_PATH;
}

// Facoltativo: nome app (non usato ma utile)
export const APP_NAME = "BitChange";
