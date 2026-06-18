import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Candidate = {
  model: string;
  field: string;
  type: string;
  nullable: boolean;
  target: string;
  confidence: "alias" | "exact" | "unknown";
  onDelete: "Cascade" | "Restrict" | "SetNull" | "Review";
  bucket: "tenant-tree" | "operational" | "financial" | "nullable-actor" | "review";
};

const schemaPath = resolve(process.argv[2] ?? "packages/db/prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const modelNames = new Set(
  [...schema.matchAll(/^model\s+(\w+)\s+{/gm)].map((match) => match[1] as string),
);

const aliasTargets: Record<string, string> = {
  acceptedById: "User",
  actorUserId: "User",
  approvedById: "User",
  assignedById: "User",
  assignedToUserId: "User",
  branchId: "Branch",
  challengeId: "Challenge",
  classId: "Class",
  conversationId: "SupportConversation",
  couponId: "Coupon",
  createdById: "User",
  creatorUserId: "User",
  deviceId: "PushDevice",
  dietPlanId: "DietPlan",
  fileAssetId: "FileAsset",
  guardianConsentId: "GuardianConsent",
  habitId: "Habit",
  impersonationSessionId: "ImpersonationSession",
  latestSubscriptionId: "MemberSubscription",
  managerId: "User",
  mandateId: "PaymentMandate",
  memberId: "User",
  memberUserId: "User",
  minorUserId: "User",
  notificationId: "Notification",
  orgId: "Organization",
  organizationId: "Organization",
  originalPaymentId: "Payment",
  originalUserId: "User",
  ownerUserId: "User",
  paidById: "User",
  paymentEventId: "PaymentEvent",
  paymentId: "Payment",
  paymentSessionId: "PaymentSession",
  payoutId: "TrainerPayout",
  planId: "PlanContent",
  proofAssetId: "FileAsset",
  proofFileAssetId: "FileAsset",
  recordedById: "User",
  referralCodeId: "ReferralCode",
  rejectedById: "User",
  requestedById: "User",
  reviewedById: "User",
  sessionLogId: "PersonalTrainingSessionLog",
  shopOrderId: "ShopOrder",
  sourceOrgId: "Organization",
  sourceSubscriptionId: "MemberSubscription",
  subscriptionId: "MemberSubscription",
  targetOrgId: "Organization",
  targetUserId: "User",
  trainerId: "User",
  trainerUserId: "User",
  userId: "User",
  workoutSessionId: "WorkoutSession",
};

const modelFieldTargets: Record<string, string> = {
  "AIMessage.conversationId": "AIConversation",
  "AccountDeletionRequest.latestJobId": "AccountDeletionJob",
  "AccountDeletionRequest.processedById": "User",
  "DataExportRequest.latestJobId": "DataExportJob",
  "DataExportRequest.processedById": "User",
  "InventoryMovement.orderId": "ShopOrder",
  "MembershipJoinRequest.planId": "MembershipPlan",
  "MembershipUsage.attendanceId": "AttendanceRecord",
  "MemberSubscription.activatedById": "User",
  "MemberSubscription.planId": "MembershipPlan",
  "Payment.sessionId": "PaymentSession",
  "PaymentEvent.sessionId": "PaymentSession",
  "PersonalTrainingSessionLog.subscriptionId": "PersonalTrainingSubscription",
  "PersonalTrainingSubscription.ptPlanId": "PersonalTrainingPlan",
  "PickupCode.orderId": "ShopOrder",
  "PlanProgress.assignmentId": "PlanAssignment",
  "ReferralCode.referrerUserId": "User",
  "ReferralRedemption.referredUserId": "User",
  "ReferralReward.appliedToSubId": "MemberSubscription",
  "ReferralReward.redemptionId": "ReferralRedemption",
  "ReferralReward.referrerUserId": "User",
  "SaaSBillingMandate.createdByUserId": "User",
  "ShopOrder.fulfilledById": "User",
  "ShopOrderItem.orderId": "ShopOrder",
  "StaffInvitation.invitedById": "User",
};

const financialModels = [
  "Invoice",
  "ManualPaymentAdjustment",
  "Payment",
  "PaymentEvent",
  "PaymentMandate",
  "PaymentRefund",
  "PaymentSession",
  "TrainerPayout",
  "TrainerPayoutLine",
];

const actorFieldPattern =
  /^(accepted|actor|approved|assignedBy|createdBy|creator|manager|paidBy|recordedBy|rejected|requested|reviewed)Id$|UserId$/;

function titleForField(model: string, field: string) {
  const modelFieldTarget = modelFieldTargets[`${model}.${field}`];
  if (modelFieldTarget) {
    return { target: modelFieldTarget, confidence: "alias" as const };
  }
  if (aliasTargets[field]) {
    return { target: aliasTargets[field], confidence: "alias" as const };
  }
  const base = field.replace(/Id$/, "");
  const target = `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
  if (modelNames.has(target)) {
    return { target, confidence: "exact" as const };
  }
  return { target: "UNKNOWN", confidence: "unknown" as const };
}

function classify(model: string, field: string, nullable: boolean): Pick<Candidate, "bucket" | "onDelete"> {
  const { target } = titleForField(model, field);
  if (target === "UNKNOWN") {
    return { bucket: "review", onDelete: "Review" };
  }
  if (nullable && (actorFieldPattern.test(field) || aliasTargets[field] === "User")) {
    return { bucket: "nullable-actor", onDelete: "SetNull" };
  }
  if (
    financialModels.some((financialModel) => model.includes(financialModel)) ||
    /(Payment|Refund|Invoice|Payout|Mandate)/.test(field)
  ) {
    return { bucket: "financial", onDelete: "Restrict" };
  }
  if (field === "orgId" || field === "organizationId" || field === "branchId") {
    return { bucket: "tenant-tree", onDelete: "Cascade" };
  }
  if (nullable) {
    return { bucket: "operational", onDelete: "SetNull" };
  }
  return { bucket: "operational", onDelete: "Cascade" };
}

const candidates: Candidate[] = [];
const modelBlocks = schema.matchAll(/^model\s+(\w+)\s+{([\s\S]*?)^}/gm);

for (const [, model, body] of modelBlocks) {
  if (!model || !body) continue;
  for (const line of body.split("\n")) {
    const match = line.match(/^\s+(\w+Id)\s+(\w+)(\?)?/);
    if (!match) continue;
    const [, field, type, optional] = match;
    if (!field || !type || !["String", "Int"].includes(type)) continue;
    const nullable = optional === "?";
    const { target, confidence } = titleForField(model, field);
    const { bucket, onDelete } = classify(model, field, nullable);
    candidates.push({ model, field, type, nullable, target, confidence, bucket, onDelete });
  }
}

const byBucket = candidates.reduce<Record<string, number>>((acc, candidate) => {
  acc[candidate.bucket] = (acc[candidate.bucket] ?? 0) + 1;
  return acc;
}, {});

console.log("# A1.1 FK Candidate Inventory\n");
console.log(`Generated from \`${schemaPath}\`.\n`);
console.log("## Summary\n");
console.log(`- Total FK-like \`*Id\` candidates: ${candidates.length}`);
for (const bucket of ["tenant-tree", "operational", "financial", "nullable-actor", "review"]) {
  console.log(`- ${bucket}: ${byBucket[bucket] ?? 0}`);
}
console.log("\n## Candidates\n");
console.log("| model | field | nullable | inferred target | confidence | bucket | proposed onDelete |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const candidate of candidates.sort((a, b) => `${a.model}.${a.field}`.localeCompare(`${b.model}.${b.field}`))) {
  console.log(
    `| ${candidate.model} | ${candidate.field} | ${candidate.nullable ? "yes" : "no"} | ${candidate.target} | ${candidate.confidence} | ${candidate.bucket} | ${candidate.onDelete} |`,
  );
}
