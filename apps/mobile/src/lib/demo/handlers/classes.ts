import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

// --- Group classes (offline demo) ------------------------------------------
// Booking state persists for the life of the JS runtime so the booking flow
// works end to end without a backend: book a class, the list updates, the
// status sticks across refetches and on the Home strip.
const demoClassEnrollments = new Map<string, "confirmed" | "waitlisted" | "cancelled">();

// Edits/cancellations applied by a trainer to a fixed template class are kept
// in this overlay so the templates themselves stay the canonical seed data.
type DemoClassOverlay = {
  name?: string;
  description?: string | null;
  classType?: string;
  maxCapacity?: number;
  pricePaise?: number;
  startTime?: string;
  endTime?: string;
  status?: "SCHEDULED" | "CANCELLED";
};
const demoClassOverlays = new Map<string, DemoClassOverlay>();

type DemoClassTemplate = {
  id: string;
  name: string;
  description: string;
  classType: string;
  trainerId: string;
  trainerName: string;
  dayOffset: number;
  startHour: number;
  startMinute: number;
  durationMin: number;
  maxCapacity: number;
  enrolledCount: number;
  defaultEnrollment?: "confirmed" | "waitlisted";
};

const DEMO_CLASS_TEMPLATES: DemoClassTemplate[] = [
  {
    id: "class-hiit",
    name: "HIIT Burn",
    description: "45 minutes of high-intensity intervals to torch calories and build conditioning.",
    classType: "HIIT",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 0,
    startHour: 7,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 16,
    enrolledCount: 11,
  },
  {
    id: "class-strength-am",
    name: "Strength Foundations",
    description: "Coached barbell basics — squat, hinge and press with form cues for every level.",
    classType: "Strength",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 0,
    startHour: 9,
    startMinute: 30,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 8,
  },
  {
    id: "class-yoga",
    name: "Sunset Yoga Flow",
    description: "A calming vinyasa flow to unwind, improve mobility and breathe better.",
    classType: "Yoga",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 0,
    startHour: 18,
    startMinute: 30,
    durationMin: 60,
    maxCapacity: 20,
    enrolledCount: 14,
  },
  {
    id: "class-spin",
    name: "Spin Express",
    description: "A fast, music-driven indoor cycling session. Clip in and ride.",
    classType: "Cycling",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 0,
    startHour: 20,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 14,
    enrolledCount: 14,
  },
  {
    id: "class-push-power",
    name: "Push Day Power",
    description: "Chest, shoulders and triceps with progressive overload. Pairs with your plan.",
    classType: "Strength",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 1,
    startHour: 7,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 5,
    defaultEnrollment: "confirmed",
  },
  {
    id: "class-zumba",
    name: "Zumba Dance Fit",
    description: "Dance your way fit with high-energy choreography. No experience needed.",
    classType: "Dance",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 1,
    startHour: 18,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 25,
    enrolledCount: 18,
  },
  {
    id: "class-mobility",
    name: "Mobility & Stretch",
    description: "Release tight hips and shoulders with guided stretching and foam rolling.",
    classType: "Mobility",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 2,
    startHour: 8,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 16,
    enrolledCount: 6,
  },
  {
    id: "class-boxing",
    name: "Boxing Basics",
    description: "Learn the fundamentals — stance, jab, cross and footwork on the bags.",
    classType: "Boxing",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 2,
    startHour: 19,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 9,
  },
];

function classStartDate(template: DemoClassTemplate) {
  const date = new Date();
  date.setHours(template.startHour, template.startMinute, 0, 0);
  date.setDate(date.getDate() + template.dayOffset);
  return date;
}

function demoClassRecord(template: DemoClassTemplate) {
  const branch = zookDemoFixtures.branches[0];
  const start = classStartDate(template);
  const end = new Date(start.getTime() + template.durationMin * 60 * 1000);
  const userStatus = demoClassEnrollments.get(template.id) ?? template.defaultEnrollment ?? null;
  const baseHasSeat = template.defaultEnrollment === "confirmed";
  const userTakesSeat = userStatus === "confirmed" && !baseHasSeat;
  // A member who cancelled a pre-booked (default-confirmed) class frees that seat.
  const cancelledDefaultSeat = userStatus === "cancelled" && baseHasSeat;
  const overlay = demoClassOverlays.get(template.id);
  const maxCapacity = overlay?.maxCapacity ?? template.maxCapacity;
  const enrollmentCount =
    template.enrolledCount + (userTakesSeat ? 1 : 0) - (cancelledDefaultSeat ? 1 : 0);
  const remainingCapacity = Math.max(0, maxCapacity - enrollmentCount);
  return {
    id: template.id,
    orgId: activeOrg()?.id ?? "org-demo",
    branchId: branch?.id ?? "branch-default",
    branchName: branch?.name ?? null,
    trainerId: template.trainerId,
    trainerName: template.trainerName,
    name: overlay?.name ?? template.name,
    description: overlay?.description ?? template.description,
    classType: overlay?.classType ?? template.classType,
    maxCapacity,
    pricePaise: overlay?.pricePaise ?? null,
    startTime: overlay?.startTime ?? start.toISOString(),
    endTime: overlay?.endTime ?? end.toISOString(),
    recurrenceRule: null,
    status: overlay?.status ?? "SCHEDULED",
    createdAt: nowIso(),
    enrollmentCount,
    remainingCapacity,
    myEnrollmentStatus: userStatus === "cancelled" ? null : userStatus,
  };
}

// Classes scheduled in-app (by a trainer/owner) appear in the member class list
// — closing the loop: schedule a class, members can book it.
type DemoScheduledClass = {
  id: string;
  orgId: string;
  branchId: string;
  branchName: string | null;
  trainerId: string;
  trainerName: string;
  name: string;
  description: string | null;
  classType: string;
  maxCapacity: number;
  pricePaise: number;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
  status: string;
  createdAt: string;
  enrollmentCount: number;
  remainingCapacity: number;
  myEnrollmentStatus: string | null;
};

const demoScheduledClasses: DemoScheduledClass[] = [];

function demoClasses() {
  return [...DEMO_CLASS_TEMPLATES.map(demoClassRecord), ...demoScheduledClasses].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

function demoCreateClass(body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const branch = zookDemoFixtures.branches[0];
  const trainerId = String(body.trainerId ?? "user-rhea");
  const trainerUser = zookDemoFixtures.users.find((user) => user.id === trainerId);
  const start = body.startTime ? new Date(String(body.startTime)) : new Date(Date.now() + 86_400_000);
  const durationMin = toNumber(body.durationMin, 60);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const maxCapacity = toNumber(body.maxCapacity, 16);
  const pricePaise = toNumber(body.pricePaise, 0);
  const cls: DemoScheduledClass = {
    id: `class-custom-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    branchId: branch?.id ?? "branch-default",
    branchName: branch?.name ?? null,
    trainerId,
    trainerName: (trainerUser?.name ?? "Coach").replace(/^Coach\s+/i, ""),
    name: String(body.name ?? "New class").trim() || "New class",
    description: body.description ? String(body.description) : null,
    classType: String(body.classType ?? "Strength"),
    maxCapacity,
    pricePaise,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    recurrenceRule: null,
    status: "SCHEDULED",
    createdAt: nowIso(),
    enrollmentCount: 0,
    remainingCapacity: maxCapacity,
    myEnrollmentStatus: null as string | null,
  };
  demoScheduledClasses.unshift(cls);
  return { class: cls };
}

// Trainers can edit a scheduled class's details, or cancel it outright. A
// cancellation notifies any member who currently holds a confirmed/waitlisted
// seat (in this offline demo that is the "user-aarav" persona) so the member
// app's notification feed reflects the change end to end.
function demoNotifyClassCancelled(className: string, memberUserId: string) {
  zookDemoFixtures.notifications.unshift({
    id: `notif-class-cancel-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    userId: memberUserId,
    type: "OPERATIONAL",
    title: "Class cancelled",
    message: `${className} has been cancelled by your trainer. Please book another session.`,
    targetRoute: "/member/classes",
    readAt: null,
    createdAt: nowIso(),
  });
}

function demoUpdateClass(classId: string, body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.status === "CANCELLED") {
      throw new Error("Cancelled classes cannot be edited.");
    }
    if (body.name !== undefined) scheduled.name = String(body.name).trim() || scheduled.name;
    if (body.description !== undefined) scheduled.description = body.description ? String(body.description) : null;
    if (body.classType !== undefined) scheduled.classType = String(body.classType);
    if (body.pricePaise !== undefined) scheduled.pricePaise = toNumber(body.pricePaise, scheduled.pricePaise);
    if (body.maxCapacity !== undefined) {
      const nextCapacity = toNumber(body.maxCapacity, scheduled.maxCapacity);
      scheduled.maxCapacity = nextCapacity;
      scheduled.remainingCapacity = Math.max(0, nextCapacity - scheduled.enrollmentCount);
    }
    if (body.startTime) {
      const start = new Date(String(body.startTime));
      const durationMin = toNumber(
        body.durationMin,
        (new Date(scheduled.endTime).getTime() - new Date(scheduled.startTime).getTime()) / 60_000,
      );
      scheduled.startTime = start.toISOString();
      scheduled.endTime = new Date(start.getTime() + durationMin * 60 * 1000).toISOString();
    }
    return { class: scheduled };
  }
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    throw new Error("That class could not be found.");
  }
  const existing = demoClassOverlays.get(classId) ?? {};
  if (existing.status === "CANCELLED") {
    throw new Error("Cancelled classes cannot be edited.");
  }
  const next: DemoClassOverlay = { ...existing };
  if (body.name !== undefined) next.name = String(body.name).trim() || template.name;
  if (body.description !== undefined) next.description = body.description ? String(body.description) : null;
  if (body.classType !== undefined) next.classType = String(body.classType);
  if (body.pricePaise !== undefined) next.pricePaise = toNumber(body.pricePaise, next.pricePaise ?? 0);
  if (body.maxCapacity !== undefined) next.maxCapacity = toNumber(body.maxCapacity, template.maxCapacity);
  if (body.startTime) {
    const start = new Date(String(body.startTime));
    const currentStart = next.startTime ? new Date(next.startTime) : classStartDate(template);
    const currentEnd = next.endTime
      ? new Date(next.endTime)
      : new Date(currentStart.getTime() + template.durationMin * 60 * 1000);
    const durationMin = toNumber(body.durationMin, (currentEnd.getTime() - currentStart.getTime()) / 60_000);
    next.startTime = start.toISOString();
    next.endTime = new Date(start.getTime() + durationMin * 60 * 1000).toISOString();
  }
  demoClassOverlays.set(classId, next);
  return { class: demoClassRecord(template) };
}

function demoCancelClass(classId: string) {
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.status !== "CANCELLED") {
      const wasEnrolled = scheduled.myEnrollmentStatus === "confirmed" || scheduled.myEnrollmentStatus === "waitlisted";
      scheduled.status = "CANCELLED";
      if (wasEnrolled) {
        demoNotifyClassCancelled(scheduled.name, "user-aarav");
      }
    }
    return { class: scheduled };
  }
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    throw new Error("That class could not be found.");
  }
  const existing = demoClassOverlays.get(classId) ?? {};
  if (existing.status !== "CANCELLED") {
    const record = demoClassRecord(template);
    const wasEnrolled = record.myEnrollmentStatus === "confirmed" || record.myEnrollmentStatus === "waitlisted";
    demoClassOverlays.set(classId, { ...existing, status: "CANCELLED" });
    if (wasEnrolled) {
      demoNotifyClassCancelled(record.name, "user-aarav");
    }
  }
  return { class: demoClassRecord(template) };
}

function demoEnrollInClass(classId: string) {
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
    if (!scheduled) {
      throw new Error("That class could not be found.");
    }
    if (!scheduled.myEnrollmentStatus) {
      const full = scheduled.remainingCapacity <= 0;
      scheduled.myEnrollmentStatus = full ? "waitlisted" : "confirmed";
      if (!full) {
        scheduled.enrollmentCount += 1;
        scheduled.remainingCapacity = Math.max(0, scheduled.remainingCapacity - 1);
      }
    }
    return {
      enrollment: { id: `enroll-${classId}`, status: scheduled.myEnrollmentStatus },
      remainingCapacity: scheduled.remainingCapacity,
    };
  }
  const existing = demoClassEnrollments.get(classId) ?? template.defaultEnrollment ?? null;
  if (existing && existing !== "cancelled") {
    const record = demoClassRecord(template);
    return { enrollment: { id: `enroll-${classId}`, status: existing }, remainingCapacity: record.remainingCapacity };
  }
  const isFull = template.maxCapacity - template.enrolledCount <= 0;
  const status: "confirmed" | "waitlisted" = isFull ? "waitlisted" : "confirmed";
  demoClassEnrollments.set(classId, status);
  const record = demoClassRecord(template);
  return {
    enrollment: { id: `enroll-${classId}`, status },
    remainingCapacity: record.remainingCapacity,
  };
}

function demoCancelEnrollment(classId: string) {
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.myEnrollmentStatus === "confirmed") {
      scheduled.enrollmentCount = Math.max(0, scheduled.enrollmentCount - 1);
      scheduled.remainingCapacity = Math.min(scheduled.maxCapacity, scheduled.remainingCapacity + 1);
    }
    scheduled.myEnrollmentStatus = null;
    return { ok: true };
  }
  // Sentinel so demoClassRecord shows the member as not-enrolled even for
  // templates that were pre-booked (defaultEnrollment === "confirmed").
  demoClassEnrollments.set(classId, "cancelled");
  return { ok: true };
}

const DEMO_ROSTER_NAMES = [
  "Ira Shah", "Rohan Mehta", "Priya Nair", "Arjun Das", "Sara Khan", "Vikram Rao",
  "Neha Joshi", "Karan Singh", "Anjali Verma", "Dev Patel", "Meera Iyer", "Sahil Gupta",
  "Tara Bose", "Yash Shah", "Zoya Ali", "Kabir Roy", "Diya Sen", "Aman Kohli",
];

type DemoAttendanceStatus = "PENDING" | "ATTENDED" | "NO_SHOW";

// Per-class, per-member attendance marks set by trainers on the roster screen.
// Persists for the life of the JS runtime so marking a member present/no-show
// sticks across refetches, mirroring how class enrollments are tracked above.
const demoRosterAttendance = new Map<string, Map<string, DemoAttendanceStatus>>();

function demoClassRoster(classId: string) {
  const cls = demoClasses().find((entry) => entry.id === classId);
  if (!cls) {
    throw new Error("That class could not be found.");
  }
  const attendanceForClass = demoRosterAttendance.get(classId);
  const roster: Array<{
    memberId: string;
    name: string;
    status: string;
    enrolledAt: string;
    attendanceStatus: DemoAttendanceStatus;
  }> = [];
  const userConfirmed = cls.myEnrollmentStatus === "confirmed";
  const userWaitlisted = cls.myEnrollmentStatus === "waitlisted";
  if (userConfirmed) {
    roster.push({
      memberId: "user-aarav",
      name: "Nisha Menon",
      status: "confirmed",
      enrolledAt: hoursAgoIso(3),
      attendanceStatus: attendanceForClass?.get("user-aarav") ?? "PENDING",
    });
  }
  const confirmedOthers = Math.max(0, cls.enrollmentCount - (userConfirmed ? 1 : 0));
  for (let index = 0; index < confirmedOthers; index += 1) {
    const memberId = `demo-${classId}-${index}`;
    roster.push({
      memberId,
      name: DEMO_ROSTER_NAMES[index % DEMO_ROSTER_NAMES.length] ?? "Member",
      status: "confirmed",
      enrolledAt: hoursAgoIso(8 + index),
      attendanceStatus: attendanceForClass?.get(memberId) ?? "PENDING",
    });
  }
  if (userWaitlisted) {
    roster.push({
      memberId: "user-aarav",
      name: "Nisha Menon",
      status: "waitlisted",
      enrolledAt: hoursAgoIso(1),
      attendanceStatus: attendanceForClass?.get("user-aarav") ?? "PENDING",
    });
  }
  return {
    class: { id: cls.id, name: cls.name, startTime: cls.startTime, maxCapacity: cls.maxCapacity },
    roster,
  };
}

function demoMarkClassAttendance(classId: string, memberId: string, status: unknown) {
  const cls = demoClasses().find((entry) => entry.id === classId);
  if (!cls) {
    throw new Error("That class could not be found.");
  }
  const normalized = typeof status === "string" ? status.toUpperCase() : "";
  if (normalized !== "PENDING" && normalized !== "ATTENDED" && normalized !== "NO_SHOW") {
    throw new Error("That attendance status is not valid.");
  }
  if (!demoRosterAttendance.has(classId)) {
    demoRosterAttendance.set(classId, new Map());
  }
  demoRosterAttendance.get(classId)!.set(memberId, normalized);
  return { ok: true, memberId, attendanceStatus: normalized as DemoAttendanceStatus };
}


export function classesDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  const enrollMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/enroll$/);
  if (enrollMatch && method === "POST") {
    return demoEnrollInClass(enrollMatch[1]);
  }
  if (enrollMatch && method === "DELETE") {
    return demoCancelEnrollment(enrollMatch[1]);
  }
  const classCancelMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/cancel$/);
  if (classCancelMatch && (method === "POST" || method === "DELETE")) {
    return demoCancelClass(classCancelMatch[1]);
  }
  const rosterMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/roster$/);
  if (rosterMatch) {
    return demoClassRoster(rosterMatch[1]);
  }
  const rosterAttendanceMatch = pathname.match(
    /^\/orgs\/[^/]+\/classes\/([^/]+)\/roster\/([^/]+)\/attendance$/,
  );
  if (rosterAttendanceMatch && method === "POST") {
    const body = demoBody(init);
    return demoMarkClassAttendance(rosterAttendanceMatch[1], rosterAttendanceMatch[2], body.status);
  }

  const classDetailMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)$/);
  if (classDetailMatch && method === "GET") {
    const entry = demoClasses().find((item) => item.id === classDetailMatch[1]);
    if (!entry) {
      throw new Error("That class could not be found.");
    }
    return { class: entry };
  }
  if (classDetailMatch && method === "PATCH") {
    return demoUpdateClass(classDetailMatch[1], demoBody(init));
  }
  if (classDetailMatch && method === "DELETE") {
    return demoCancelClass(classDetailMatch[1]);
  }

  if (pathname.match(/^\/orgs\/[^/]+\/classes$/)) {
    if (method === "POST") {
      return demoCreateClass(demoBody(init));
    }
    return { classes: demoClasses() };
  }

  return undefined;
}
