import { Search } from "lucide-react";
import { useState } from "react";
import { formatDate, formatDateTime, formatInr } from "@/lib/format";
import { AvatarInitials } from "../dashboard-primitives";
import { GlassCard } from "../glass-card";
import { ZookButton, ZookButtonLink } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { MemberRow } from "./types";
import { ageLabel, memberLabel, phoneLast4 } from "./utils";

function membershipStatusLabel(status?: string | null) {
  if (!status) return null;
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "PENDING" || normalized === "PENDING_PAYMENT") return "Pending";
  if (normalized === "PAUSED") return "Paused";
  if (["EXPIRED", "PAST_DUE"].includes(normalized)) return "Expired";
  if (["CANCELLED", "FAILED", "REJECTED"].includes(normalized)) return "Inactive";
  return "Review";
}

function attendanceStatusLabel(status?: string | null) {
  if (!status) return "Recorded";
  const normalized = status.toUpperCase();
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "PENDING_APPROVAL") return "Needs review";
  if (normalized === "REJECTED") return "Rejected";
  if (normalized === "FLAGGED") return "Flagged";
  if (normalized === "FAILED") return "Failed";
  if (normalized === "RECORDED") return "Recorded";
  return "Review";
}

export function MemberTab({
  copy,
  memberQuery,
  filteredMembers,
  selectedMember,
  busyId,
  onMemberQueryChange,
  onSelectMember,
  getRecordPaymentHref,
  onOverrideEntry,
  onCheckOut,
  onSendMessage,
}: {
  copy: DeskCopy;
  memberQuery: string;
  filteredMembers: MemberRow[];
  selectedMember: MemberRow | null;
  busyId: string;
  onMemberQueryChange: (value: string) => void;
  onSelectMember: (member: MemberRow) => void;
  getRecordPaymentHref: (member: MemberRow) => string;
  onOverrideEntry: (member: MemberRow) => void;
  onCheckOut: (member: MemberRow) => void;
  onSendMessage: (member: MemberRow) => void;
}) {
  const [showPhone, setShowPhone] = useState(false);
  const phone = selectedMember?.user?.phone;
  const emergencyContact = selectedMember?.user?.emergencyContact;
  const activeCheckIn = selectedMember?.activeCheckIn;
  const selectedPhoto =
    selectedMember?.profile.profilePhotoUrl ?? selectedMember?.user?.profilePhotoUrl ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <GlassCard>
        <h1 className="text-2xl font-semibold text-white">{copy.findMember}</h1>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3">
          <Search size={18} className="text-white/40" />
          <input
            value={memberQuery}
            onChange={(event) => onMemberQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="zook-focus min-h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/32"
          />
        </div>
        <div className="mt-4 grid gap-2">
          {filteredMembers.map((member) => (
            <button
              key={member.profile.id}
              type="button"
              onClick={() => onSelectMember(member)}
              className="zook-focus rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/8"
            >
              <p className="text-sm font-medium text-white">{memberLabel(member)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/42">
                {member.user?.privateHandle ? (
                  <span className="rounded-full border border-white/10 px-2 py-1 text-white/58">
                    {member.user.privateHandle}
                  </span>
                ) : null}
                <span>
                  {copy.phoneEnding} {phoneLast4(member.user?.phone)}
                </span>
                <span>{ageLabel(member.user?.dateOfBirth)}</span>
                <span>
                  {member.activeSubscription
                    ? membershipStatusLabel(member.activeSubscription.status)
                    : copy.noActivePlan}
                </span>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        {selectedMember ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-3xl object-cover"
                />
              ) : (
                <AvatarInitials
                  name={memberLabel(selectedMember)}
                  className="h-20 w-20 rounded-3xl border-white/10 bg-white/8 text-2xl text-white/70"
                />
              )}
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold text-white">{memberLabel(selectedMember)}</h2>
                {selectedMember.user?.privateHandle ? (
                  <p className="mt-1 text-xs font-medium text-white/42">
                    {copy.privateId}: {selectedMember.user.privateHandle}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowPhone((current) => !current)}
                  className="mt-1 text-left text-sm text-white/48 underline-offset-4 hover:underline"
                >
                  {showPhone && phone ? phone : `${copy.phoneEnding} ${phoneLast4(phone)}`}
                </button>
                <p className="mt-1 text-sm text-white/48">
                  {ageLabel(selectedMember.user?.dateOfBirth)}
                </p>
                {!selectedPhoto ? (
                  <p className="mt-2 text-xs text-white/38">{copy.profilePhotoMissing}</p>
                ) : null}
              </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <ZookButtonLink
                  size="sm"
                  href={getRecordPaymentHref(selectedMember)}
                >
                  {copy.recordPayment}
                </ZookButtonLink>
                {activeCheckIn ? (
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    disabled={busyId === `checkout:${selectedMember.user?.id}`}
                    state={busyId === `checkout:${selectedMember.user?.id}` ? "loading" : "idle"}
                    onClick={() => onCheckOut(selectedMember)}
                  >
                    {copy.checkOut}
                  </ZookButton>
                ) : null}
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {copy.membership}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="truncate text-base font-semibold text-white">
                      {selectedMember.activeSubscription
                        ? membershipStatusLabel(selectedMember.activeSubscription.status)
                        : copy.noActiveMembership}
                    </p>
                    <span className="shrink-0 text-xs text-white/42">
                      {formatDate(selectedMember.activeSubscription?.endsAt)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {copy.lastCheckIn}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-white">
                    {formatDateTime(selectedMember.lastCheckIn?.checkedInAt)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {copy.recentActivity}
                  </p>
                  {selectedMember.lastPayment ? (
                    <span className="truncate text-xs text-white/42">
                      {copy.lastPayment}: {formatInr(selectedMember.lastPayment.amountPaise)}
                    </span>
                  ) : null}
                </div>
                {activeCheckIn ? (
                  <div className="mt-3 rounded-xl border border-blue-300/25 bg-blue-300/10 px-3 py-2">
                    <p className="text-sm font-medium text-blue-50">
                      {copy.activeCheckIn} ·{" "}
                      {copy.since} {formatDateTime(activeCheckIn.checkedInAt)}
                    </p>
                    {activeCheckIn.branchName ? (
                      <p className="mt-1 text-xs text-blue-50/60">{activeCheckIn.branchName}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-1.5 text-xs text-white/48">
                  {(selectedMember.recentCheckIns ?? []).slice(0, 3).map((record) => (
                    <div
                      key={record.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
                    >
                      <span className="truncate">{formatDateTime(record.checkedInAt)}</span>
                      <span className="shrink-0 text-white/62">
                        {attendanceStatusLabel(record.status)}
                        {record.checkedOutAt ? ` · ${copy.checkedOut}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <details className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  {copy.emergencyContact}
                </summary>
                {emergencyContact?.name || emergencyContact?.phone ? (
                  <div className="mt-2 text-sm text-white/68">
                    <p className="font-medium text-white">
                      {emergencyContact.name || copy.contactFallback}
                    </p>
                    {emergencyContact.phone ? (
                      <a
                        href={`tel:${emergencyContact.phone}`}
                        className="mt-1 inline-block text-white/58 underline-offset-4 hover:underline"
                      >
                        {emergencyContact.phone}
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/42">{copy.contactNotAdded}</p>
                )}
              </details>
              <div className="flex flex-wrap gap-2">
                <ZookButton
                  type="button"
                  tone="ghost"
                  size="sm"
                  disabled={Boolean(activeCheckIn)}
                  state={busyId === `override:${selectedMember.user?.id}` ? "loading" : "idle"}
                  onClick={() => onOverrideEntry(selectedMember)}
                >
                  {copy.overrideEntry}
                </ZookButton>
                <ZookButton
                  type="button"
                  tone="ghost"
                  size="sm"
                  disabled={busyId === `message:${selectedMember.user?.id}`}
                  state={busyId === `message:${selectedMember.user?.id}` ? "loading" : "idle"}
                  onClick={() => onSendMessage(selectedMember)}
                >
                  {copy.sendMemberMessage}
                </ZookButton>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/12 p-5 text-sm text-white/48">
            {copy.selectMember}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
