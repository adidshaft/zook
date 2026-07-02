import { useMemo } from "react";

import {
  formatActivityDate,
  formatRelativeDate,
  formatUsageLimit,
  formatVisitLimit,
  type ActivityDateLabels,
  type RelativeDateLabels,
} from "./formatting";
import { useI18n } from "./i18n";

export function useFormatters() {
  const { t } = useI18n();

  return useMemo(() => {
    const relativeDateLabels: RelativeDateLabels = {
      unknownTime: t("common.unknownTime"),
      today: t("common.today"),
      inAboutAnHour: t("common.inAboutAnHour"),
      aboutAnHourAgo: t("common.aboutAnHourAgo"),
      inHours: (hours) => t("common.inHoursShort", { count: hours }),
      hoursAgo: (hours) => t("common.hoursAgoShort", { count: hours }),
      inDays: (days) => t("common.inDaysShort", { count: days }),
      daysAgo: (days) => t("common.daysAgoShort", { count: days }),
    };
    const activityDateLabels: ActivityDateLabels = {
      today: t("common.today"),
      yesterday: t("common.yesterday"),
      recently: t("common.recently"),
    };
    const visitLimitLabels = {
      unlimited: t("common.unlimited"),
      visitOne: t("common.visitOne"),
      visitOther: t("common.visitOther"),
    };

    return {
      formatActivityDate: (value?: string | Date | null) =>
        formatActivityDate(value, activityDateLabels),
      formatRelativeDate: (value?: string | Date | null) =>
        formatRelativeDate(value, relativeDateLabels),
      formatUsageLimit: (limit?: number | null, options: { compact?: boolean } = {}) =>
        formatUsageLimit(limit, { ...options, unlimitedLabel: t("common.unlimited") }),
      formatVisitLimit: (limit?: number | null) => formatVisitLimit(limit, visitLimitLabels),
    };
  }, [t]);
}
