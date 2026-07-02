import type { PublicLocale } from "@/lib/public-i18n";

export function loginDestinationLabel(redirect: string | null, locale: PublicLocale) {
  if (!redirect?.startsWith("/") || redirect.startsWith("//")) {
    return null;
  }
  const labels = {
    en: {
      branches: "Branches",
      reports: "Reports",
      staff: "Staff",
      attendanceQr: "Attendance QR Console",
      attendance: "Attendance",
      desk: "Front Desk",
      coach: "Coach",
      platform: "Platform",
      dashboard: "Control Room",
      startGym: "gym setup",
      join: "membership checkout",
    },
    hi: {
      branches: "ब्रांच",
      reports: "रिपोर्ट",
      staff: "स्टाफ",
      attendanceQr: "अटेंडेंस QR कंसोल",
      attendance: "अटेंडेंस",
      desk: "फ्रंट डेस्क",
      coach: "कोच वर्कस्पेस",
      platform: "प्लैटफॉर्म",
      dashboard: "कंट्रोल रूम",
      startGym: "जिम सेटअप",
      join: "सदस्यता चेकआउट",
    },
  }[locale];
  if (redirect.startsWith("/dashboard/branches")) return labels.branches;
  if (redirect.startsWith("/dashboard/reports")) return labels.reports;
  if (redirect.startsWith("/dashboard/staff")) return labels.staff;
  if (redirect.startsWith("/dashboard/attendance/qr-display")) return labels.attendanceQr;
  if (redirect.startsWith("/dashboard/attendance")) return labels.attendance;
  if (redirect.startsWith("/desk")) return labels.desk;
  if (redirect.startsWith("/coach")) return labels.coach;
  if (redirect.startsWith("/platform")) return labels.platform;
  if (redirect.startsWith("/dashboard")) return labels.dashboard;
  if (redirect.startsWith("/start-gym")) return labels.startGym;
  if (redirect.startsWith("/join/")) return labels.join;
  return null;
}

export function loginRedirectMessage(redirect: string | null, locale: PublicLocale) {
  const label = loginDestinationLabel(redirect, locale);
  if (!label) return null;
  return locale === "hi"
    ? `${label} जारी रखने के लिए लॉगिन करें.`
    : `Sign in to continue to ${label}.`;
}
