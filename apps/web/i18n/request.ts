import { getRequestConfig } from "next-intl/server";
import enMessages from "../messages/dashboard/en.json";
import hiMessages from "../messages/dashboard/hi.json";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = requestedLocale === "hi" ? "hi" : "en";

  return {
    locale,
    messages: locale === "hi" ? hiMessages : enMessages,
    timeZone: "Asia/Kolkata",
  };
});
