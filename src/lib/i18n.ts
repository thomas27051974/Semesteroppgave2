import { getRequestConfig } from "next-intl/server";

export const locales = ["nb-NO"] as const;
export const defaultLocale = "nb-NO";
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: (await import(`../../messages/${defaultLocale}.json`)).default,
  timeZone: "Europe/Oslo",
  now: new Date(),
}));
