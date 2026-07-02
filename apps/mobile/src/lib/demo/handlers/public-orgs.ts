import { zookDemoFixtures } from "@zook/core/demo-fixtures";

type PublicOrgsDeps = {
  activeMembership: () => unknown;
  activeOrg: () => (typeof zookDemoFixtures.organizations)[number] | undefined;
};

function demoGymMedia(username?: string | null) {
  if (username === "aarogya-strength" || username === "your-fitness") {
    const base = `/seed/gyms/${username}`;
    return {
      logoUrl: `${base}/logo.svg`,
      coverImageUrl: `${base}/cover.png`,
      gallery: [
        `${base}/gallery-01.png`,
        `${base}/gallery-02.png`,
        `${base}/gallery-03.png`,
        `${base}/gallery-04.png`,
        `${base}/gallery-05.png`,
      ],
    };
  }
  return { logoUrl: null, coverImageUrl: null, gallery: [] };
}

function demoGymProfile(username: string, viewerAuthenticated: boolean, deps: PublicOrgsDeps) {
  const org =
    zookDemoFixtures.organizations.find((candidate) => candidate.username === username) ??
    deps.activeOrg();
  if (!org) {
    return { org: null, plans: [] };
  }

  const demoMedia = demoGymMedia(org.username);

  return {
    org: {
      id: org.id,
      name: org.name,
      username: org.username,
      city: org.city,
      state: org.state,
      joinMode: org.joinMode,
      visibility: "PUBLIC",
      amenities: org.amenities,
      address: org.address,
      tagline: "Strength, PT, and recovery operations in one gym cockpit.",
      logoUrl: demoMedia.logoUrl,
      coverImageUrl: demoMedia.coverImageUrl,
      gallery: demoMedia.gallery,
      equipment: ["Dumbbells", "Power racks", "Treadmills", "Cable crossover machine"],
    },
    branches: zookDemoFixtures.branches.filter((branch) => branch.orgId === org.id),
    trainers: zookDemoFixtures.users
      .filter((user) => user.id === "user-rhea" || user.id === "user-kabir")
      .map((user) => ({
        userId: user.id,
        name: user.name,
        bio: "Strength, hypertrophy, and habit coaching.",
        specialties: ["Strength", "Form checks"],
        visibleToMembers: true,
      })),
    plans: zookDemoFixtures.membershipPlans
      .filter((plan) => plan.orgId === org.id && plan.publicVisible)
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        type: plan.type,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays,
        visitLimit: plan.visitLimit,
      })),
    viewerState: {
      activeMembership: viewerAuthenticated ? deps.activeMembership() : null,
      pendingJoinRequest: null,
      approvedJoinRequest: null,
    },
    referral: zookDemoFixtures.referralCodes[0]
      ? {
          code: zookDemoFixtures.referralCodes[0].code,
          couponId: zookDemoFixtures.referralCodes[0].id,
          status: zookDemoFixtures.referralCodes[0].status,
        }
      : null,
  };
}

export function publicOrgsDemoResponse(
  pathname: string,
  viewerAuthenticated: boolean,
  deps: PublicOrgsDeps,
) {
  if (pathname === "/orgs/public/cities") {
    return {
      cities: Array.from(
        new Set(
          zookDemoFixtures.organizations
            .map((candidate) => candidate.city.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    };
  }

  if (pathname === "/orgs/public/search") {
    return {
      gyms: zookDemoFixtures.organizations.map((candidate) => {
        const media = demoGymMedia(candidate.username);
        return {
          id: candidate.id,
          username: candidate.username,
          name: candidate.name,
          city: candidate.city,
          state: candidate.state,
          address: candidate.address,
          joinMode: candidate.joinMode,
          visibility: "PUBLIC",
          amenities: candidate.amenities,
          logoUrl: media.logoUrl,
          coverImageUrl: media.coverImageUrl,
        };
      }),
    };
  }

  if (pathname.startsWith("/orgs/public/")) {
    return demoGymProfile(pathname.replace("/orgs/public/", ""), viewerAuthenticated, deps);
  }

  return undefined;
}
