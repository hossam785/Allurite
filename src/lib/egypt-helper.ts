/**
 * Egypt Market Localization Helpers
 * Includes mobile/landline regex, EGP formatting, and Cairo time zone converters.
 */

// Egyptian Mobile: starts with +201 or 01 followed by 0, 1, 2, 5 and 8 digits (11 or 13 digits)
// Egyptian Landline: starts with area code (e.g. 02, 03, etc.) or +202 etc. followed by 8 landline digits
const EGYPT_MOBILE_REGEX = /^(?:\+20|0)?1[0125]\d{8}$/;
const EGYPT_LANDLINE_REGEX = /^(?:\+20|0)?[2345689]\d{7,8}$/;

/**
 * Validates if the phone number matches Egyptian mobile or landline structures
 */
export function validateEgyptianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, ""); // strip symbols/spaces
  return EGYPT_MOBILE_REGEX.test(cleanPhone) || EGYPT_LANDLINE_REGEX.test(cleanPhone);
}

/**
 * Formats monetary amounts in Egyptian Pounds (EGP)
 */
export function formatEgyptianCurrency(amount: number, language: "ar" | "en" = "ar"): string {
  try {
    const formatter = new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch (err) {
    return language === "ar" ? `${amount.toFixed(2)} ج.م` : `${amount.toFixed(2)} EGP`;
  }
}

/**
 * Formats a given date to Cairo time zone (GMT+2 / GMT+3 with DST)
 */
export function formatEgyptianDate(date: Date | string, language: "ar" | "en" = "ar", includeTime = true): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    };
    
    return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-EG", options).format(d);
  } catch (err) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString();
  }
}
