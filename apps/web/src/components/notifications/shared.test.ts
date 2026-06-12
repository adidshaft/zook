import { describe, expect, it } from "vitest";
import { memberDescription, memberLabel, memberUserId, type MemberRow } from "./shared";

describe("notification member helpers", () => {
  it("reads the member id and label from the members API row shape", () => {
    const member: MemberRow = {
      profile: { id: "profile_1" },
      user: {
        id: "user_1",
        name: "Nisha Sharma",
        email: "nisha@example.com",
        phone: "+919999999999",
      },
    };

    expect(memberUserId(member)).toBe("user_1");
    expect(memberLabel(member)).toBe("Nisha Sharma");
    expect(memberDescription(member)).toBe("+919999999999");
  });

  it("keeps supporting legacy notification rows", () => {
    const member: MemberRow = {
      userId: "user_2",
      profile: { name: "Karan", phone: "+918888888888" },
    };

    expect(memberUserId(member)).toBe("user_2");
    expect(memberLabel(member)).toBe("Karan");
    expect(memberDescription(member)).toBe("+918888888888");
  });
});
