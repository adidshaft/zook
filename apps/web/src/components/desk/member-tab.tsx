import { Search } from "lucide-react";
import { useState } from "react";
import { formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { AvatarInitials } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton, ZookButtonLink } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { MemberRow } from "./types";
import { ageLabel, memberLabel, phoneLast4 } from "./utils";

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
                    ? formatEnumLabel(member.activeSubscription.status)
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
            <div className="flex items-start gap-4">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-3xl object-cover"
                />
              ) : (
                <AvatarInitials
                  name={memberLabel(selectedMember)}
                  className="h-20 w-20 rounded-3xl border-transparent bg-lime-300/15 text-2xl text-lime-100"
                />
              )}
              <div className="min-w-0">
                {selectedMember.user?.privateHandle ? (
                  <Pill tone="blue">
                    {copy.privateId}: {selectedMember.user.privateHandle}
                  </Pill>
                ) : null}
                <h2 className="text-2xl font-semibold text-white">{memberLabel(selectedMember)}</h2>
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
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                  {copy.membership}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedMember.activeSubscription
                    ? formatEnumLabel(selectedMember.activeSubscription.status)
                    : copy.noActiveMembership}
                </p>
                <p className="mt-1 text-sm text-white/48">
                  {copy.validUntil} {formatDate(selectedMember.activeSubscription?.endsAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                  {copy.recentActivity}
                </p>
                {activeCheckIn ? (
                  <div className="mt-3 rounded-2xl border border-lime-300/25 bg-lime-300/10 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-lime-100/70">
                      {copy.activeCheckIn}
                    </p>
                    <p className="mt-1 text-sm font-medium text-lime-50">
                      Since {formatDateTime(activeCheckIn.checkedInAt)}
                    </p>
                    {activeCheckIn.branchName ? (
                      <p className="mt-1 text-xs text-lime-50/60">{activeCheckIn.branchName}</p>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-2 text-sm text-white/68">
                  {copy.lastCheckIn}: {formatDateTime(selectedMember.lastCheckIn?.checkedInAt)}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-white/48">
                  {(selectedMember.recentCheckIns ?? []).slice(0, 3).map((record) => (
                    <p key={record.id}>
                      {formatDateTime(record.checkedInAt)} - {formatEnumLabel(record.status)}
                      {record.checkedOutAt ? ` - Out ${formatDateTime(record.checkedOutAt)}` : ""}
                    </p>
                  ))}
                  {selectedMember.lastPayment ? (
                    <p>
                      {copy.lastPayment}: {formatInr(selectedMember.lastPayment.amountPaise)} -{" "}
                      {formatDateTime(selectedMember.lastPayment.recordedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                  Emergency contact
                </p>
                {emergencyContact?.name || emergencyContact?.phone ? (
                  <div className="mt-2 text-sm text-white/68">
                    <p className="font-medium text-white">
                      {emergencyContact.name || "Contact"}
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
                  <p className="mt-2 text-sm text-white/42">Not added by member.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <ZookButtonLink
                  size="sm"
                  href={getRecordPaymentHref(selectedMember)}
                >
                  {copy.recordPayment}
                </ZookButtonLink>
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
