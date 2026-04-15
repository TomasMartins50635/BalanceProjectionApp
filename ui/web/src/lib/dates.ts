/** Parse a YYYY-MM-DD string as local midnight (avoids UTC offset shifting the date by one day). */
export const parseLocalDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00');

/** Format a YYYY-MM-DD string for pt-PT display. */
export const formatDate = (dateStr: string): string =>
  parseLocalDate(dateStr).toLocaleDateString('pt-PT');
