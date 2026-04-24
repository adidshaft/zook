import type { Permission, Role } from "../types";

export function createPlanVersionSnapshot(input: {
  title: string;
  description?: string;
  content: Record<string, unknown>;
  aiGenerated?: boolean;
  visibility?: string;
  attachments?: Record<string, unknown>;
}) {
  return {
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    ...(input.aiGenerated ? { aiGenerated: true } : {}),
    ...(input.visibility ? { visibility: input.visibility } : {}),
    ...(input.attachments ? { attachments: input.attachments } : {}),
    content: input.content
  };
}

export function canAssignPlanToUser(input: {
  actorRoles: Role[];
  actorPermissions: Permission[];
  audience: string;
  targetUserId?: string;
  assignedClientUserIds?: string[];
}) {
  const elevated =
    input.actorRoles.includes("OWNER") ||
    input.actorRoles.includes("ADMIN") ||
    input.actorPermissions.includes("PLANS_PUBLISH_ALL");
  if (elevated) {
    return true;
  }
  if (!input.actorPermissions.includes("PLANS_PUBLISH_ASSIGNED")) {
    return false;
  }
  if (input.audience !== "selected_member" || !input.targetUserId) {
    return false;
  }
  return (input.assignedClientUserIds ?? []).includes(input.targetUserId);
}
