/**
 * localStorage that never throws: private browsing, a full disk or a blocked
 * site all simply mean nothing is remembered.
 */
export const local = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null): void {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Not fatal: the value lives for this page only.
    }
  },
};

export const HOST_KEY = 'tablet-parks.host';
/** Phone handles are kept per seat code, so a phone can sit at two tables (one per game). */
export const seatKey = (ticket: string) => `tablet-parks.seat.${ticket.slice(-24)}`;
export const HIDE_OBJECTIVES_KEY = 'tablet-parks.hide-objectives';
