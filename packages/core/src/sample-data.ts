import type { GymPublicProfile } from "./types";

export const seedUsers = [
  { role: "Platform admin", email: "platform@zook.local" },
  { role: "Owner", email: "owner@zook.local" },
  { role: "Admin", email: "admin@zook.local" },
  { role: "Receptionist", email: "reception@zook.local" },
  { role: "Trainer", email: "trainer@zook.local" },
  { role: "Member", email: "member@zook.local" },
  { role: "Minor", email: "minor@zook.local" }
] as const;

export const demoGyms: GymPublicProfile[] = [
  {
    id: "iron-house",
    name: "Iron House Fitness",
    username: "iron-house",
    city: "Pune",
    state: "Maharashtra",
    visibility: "PUBLIC",
    joinMode: "OPEN_JOIN",
    latitude: 18.5362,
    longitude: 73.893,
    amenities: ["Strength floor", "Cardio", "Locker", "Personal training"],
    coverImageUrl: "/seed/covers/iron-house.svg"
  },
  {
    id: "peaklab",
    name: "PeakLab Gym",
    username: "peaklab",
    city: "Bengaluru",
    state: "Karnataka",
    visibility: "PUBLIC",
    joinMode: "APPROVAL_REQUIRED",
    latitude: 12.9719,
    longitude: 77.6412,
    amenities: ["Functional zone", "HIIT", "Nutrition desk"],
    coverImageUrl: "/seed/covers/peaklab.svg"
  }
];

export const dashboardMetrics = [
  { label: "Today attendance", value: "84", delta: "+12%" },
  { label: "Active members", value: "642", delta: "+28" },
  { label: "Expiring soon", value: "39", delta: "7 days" },
  { label: "Cash collected", value: "₹18.4k", delta: "today" }
] as const;
