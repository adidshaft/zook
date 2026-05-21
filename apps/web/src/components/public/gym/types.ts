import type { getPublicGymProfileData } from "@/server/public-gym-read-models";

export type PublicGymProfileData = NonNullable<Awaited<ReturnType<typeof getPublicGymProfileData>>>;
export type PublicGym = PublicGymProfileData["org"];
export type PublicGymPlan = PublicGymProfileData["plans"][number];
export type PublicGymTrainer = PublicGymProfileData["trainers"][number];
