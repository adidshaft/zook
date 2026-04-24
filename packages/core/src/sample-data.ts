import type { GymPublicProfile, PersonalTrackingDashboard } from "./types";

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

export const personalTrackingDashboard: PersonalTrackingDashboard = {
  headline: "Keep your training consistent.",
  subheadline: "Log workout start and end time, total duration, notes, and the exercises you completed after each session.",
  weekDurationLabel: "4h 35m",
  weekSessionsLabel: "5 sessions",
  streakLabel: "4 day consistency streak",
  summaryMetrics: [
    {
      id: "week-duration",
      label: "Worked out",
      value: "4h 35m",
      detail: "Across five gym visits this week",
      tone: "lime"
    },
    {
      id: "last-session",
      label: "Last session",
      value: "75 min",
      detail: "Upper body strength on Thu evening",
      tone: "amber"
    },
    {
      id: "completion",
      label: "Plan adherence",
      value: "82%",
      detail: "4 of 5 scheduled sessions completed",
      tone: "blue"
    },
    {
      id: "notes-streak",
      label: "Workout notes",
      value: "7 days",
      detail: "Daily notes captured after every workout",
      tone: "violet"
    }
  ],
  todayLog: {
    id: "log-today",
    dateLabel: "Today, 24 April 2026",
    workoutName: "Upper Body Strength",
    startTimeLabel: "6:10 PM",
    endTimeLabel: "7:25 PM",
    durationLabel: "1h 15m",
    focusLabel: "Strength",
    effortLabel: "RPE 7/10",
    notes: "Strong pressing day. Keep shoulders warm before the first compound set.",
    exercises: [
      { id: "bench", name: "Bench Press", setsLabel: "4 sets", repsLabel: "8 reps", loadLabel: "60 kg", status: "DONE" },
      { id: "row", name: "Cable Row", setsLabel: "4 sets", repsLabel: "10 reps", loadLabel: "40 kg", status: "DONE" },
      { id: "incline", name: "Incline DB Press", setsLabel: "3 sets", repsLabel: "10 reps", loadLabel: "18 kg", status: "DONE" },
      { id: "face-pull", name: "Face Pull", setsLabel: "3 sets", repsLabel: "15 reps", loadLabel: "20 kg", status: "OPTIONAL" }
    ]
  },
  recentLogs: [
    {
      id: "activity-1",
      dateLabel: "Thu, 23 April 2026",
      workoutName: "Push + Shoulders",
      startTimeLabel: "6:20 PM",
      endTimeLabel: "7:10 PM",
      durationLabel: "50 min",
      focusLabel: "Hypertrophy",
      effortLabel: "RPE 8/10",
      notes: "Energy was good. Add one more back-off set next week.",
      exercises: [
        { id: "db-press", name: "DB Shoulder Press", setsLabel: "4 sets", repsLabel: "10 reps", loadLabel: "16 kg", status: "DONE" },
        { id: "lateral", name: "Lateral Raise", setsLabel: "3 sets", repsLabel: "15 reps", status: "DONE" },
        { id: "pushdown", name: "Tricep Pushdown", setsLabel: "3 sets", repsLabel: "12 reps", status: "DONE" }
      ]
    },
    {
      id: "activity-2",
      dateLabel: "Tue, 21 April 2026",
      workoutName: "Leg Day",
      startTimeLabel: "7:00 PM",
      endTimeLabel: "8:05 PM",
      durationLabel: "1h 05m",
      focusLabel: "Strength",
      effortLabel: "RPE 8.5/10",
      notes: "Squat depth felt better. Keep calf raises at the end.",
      exercises: [
        { id: "squat", name: "Back Squat", setsLabel: "5 sets", repsLabel: "5 reps", loadLabel: "85 kg", status: "DONE" },
        { id: "rdl", name: "RDL", setsLabel: "4 sets", repsLabel: "8 reps", loadLabel: "70 kg", status: "DONE" },
        { id: "calf", name: "Standing Calf Raise", setsLabel: "4 sets", repsLabel: "15 reps", status: "DONE" }
      ]
    }
  ],
  history: [
    {
      key: "TODAY",
      label: "Today",
      totalDurationLabel: "1h 15m",
      sessionCountLabel: "1 session",
      completionLabel: "4 exercises logged",
      entries: [
        {
          id: "history-today",
          dateLabel: "Today, 24 April 2026",
          workoutName: "Upper Body Strength",
          startTimeLabel: "6:10 PM",
          endTimeLabel: "7:25 PM",
          durationLabel: "1h 15m",
          focusLabel: "Strength",
          effortLabel: "RPE 7/10",
          notes: "Logged immediately after training.",
          exercises: [
            { id: "bench", name: "Bench Press", setsLabel: "4 sets", repsLabel: "8 reps", loadLabel: "60 kg", status: "DONE" },
            { id: "row", name: "Cable Row", setsLabel: "4 sets", repsLabel: "10 reps", loadLabel: "40 kg", status: "DONE" }
          ]
        }
      ]
    },
    {
      key: "WEEKLY",
      label: "Weekly",
      totalDurationLabel: "4h 35m",
      sessionCountLabel: "5 sessions",
      completionLabel: "82% plan adherence",
      entries: [
        {
          id: "history-week-1",
          dateLabel: "Thu, 23 April 2026",
          workoutName: "Push + Shoulders",
          startTimeLabel: "6:20 PM",
          endTimeLabel: "7:10 PM",
          durationLabel: "50 min",
          focusLabel: "Hypertrophy",
          effortLabel: "RPE 8/10",
          notes: "Add one more back-off set next week.",
          exercises: [
            { id: "db-press", name: "DB Shoulder Press", setsLabel: "4 sets", repsLabel: "10 reps", loadLabel: "16 kg", status: "DONE" }
          ]
        },
        {
          id: "history-week-2",
          dateLabel: "Tue, 21 April 2026",
          workoutName: "Leg Day",
          startTimeLabel: "7:00 PM",
          endTimeLabel: "8:05 PM",
          durationLabel: "1h 05m",
          focusLabel: "Strength",
          effortLabel: "RPE 8.5/10",
          notes: "Squat depth felt better.",
          exercises: [
            { id: "squat", name: "Back Squat", setsLabel: "5 sets", repsLabel: "5 reps", loadLabel: "85 kg", status: "DONE" }
          ]
        }
      ]
    },
    {
      key: "MONTHLY",
      label: "Monthly",
      totalDurationLabel: "17h 10m",
      sessionCountLabel: "19 sessions",
      completionLabel: "76% adherence this month",
      entries: [
        {
          id: "history-month-1",
          dateLabel: "Sat, 11 April 2026",
          workoutName: "Back + Core",
          startTimeLabel: "10:00 AM",
          endTimeLabel: "11:05 AM",
          durationLabel: "1h 05m",
          focusLabel: "Strength",
          effortLabel: "RPE 7.5/10",
          notes: "Core finisher completed.",
          exercises: [
            { id: "lat", name: "Lat Pulldown", setsLabel: "4 sets", repsLabel: "12 reps", status: "DONE" }
          ]
        },
        {
          id: "history-month-2",
          dateLabel: "Mon, 6 April 2026",
          workoutName: "Full Body Circuit",
          startTimeLabel: "6:30 PM",
          endTimeLabel: "7:20 PM",
          durationLabel: "50 min",
          focusLabel: "Conditioning",
          effortLabel: "RPE 6/10",
          notes: "Short session after work.",
          exercises: [
            { id: "slam", name: "Slam Ball", setsLabel: "3 rounds", repsLabel: "12 reps", status: "DONE" }
          ]
        }
      ]
    },
    {
      key: "YEARLY",
      label: "Yearly",
      totalDurationLabel: "182h",
      sessionCountLabel: "214 sessions",
      completionLabel: "Evening sessions are strongest",
      entries: [
        {
          id: "history-year-1",
          dateLabel: "Jan - Apr 2026",
          workoutName: "Consistency summary",
          startTimeLabel: "Mostly evenings",
          endTimeLabel: "5-6 workouts/week",
          durationLabel: "Average 51 min",
          focusLabel: "Balanced split",
          effortLabel: "Steady progression",
          notes: "Most completed block so far.",
          exercises: [
            { id: "compound", name: "Compound lifts logged", setsLabel: "214", repsLabel: "sessions", status: "DONE" }
          ]
        }
      ]
    }
  ]
};
