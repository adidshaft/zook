import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { demoMemberHomePayload } from "../../demo-member-home";
import { demoMemberEngagementPayload } from "./engagement";
import { demoMemberCoaching } from "./personal-training";

export function memberOverviewDemoResponse(pathname: string) {
  if (pathname === "/me/dashboard") {
    return {
      home: demoMemberHomePayload(),
      engagement: demoMemberEngagementPayload(),
      referral: {
        referralCodes: zookDemoFixtures.referralCodes,
        rewards: [],
        links: {
          web: "https://zookfit.in/r/ROHAN500",
          short: "zook.fit/r/ROHAN500",
          app: "zook://r/ROHAN500",
        },
        policy: null,
      },
      preferences: [],
    };
  }

  if (pathname === "/me/home") {
    return demoMemberHomePayload();
  }

  if (pathname === "/me/coaching") {
    return demoMemberCoaching();
  }

  return undefined;
}
