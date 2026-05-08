import { Search } from "lucide-react";
import { useState } from "react";
import { formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import type { DeskCopy } from "./copy";
import type { MemberRow } from "./types";
import { memberLabel, phoneLast4 } from "./utils";

export function MemberTab({
  copy,
  memberQuery,
  filteredMembers,
  selectedMember,
  busyId,
  onMemberQueryChange,
  onSelectMember,
  onRecordPayment,
  onOverrideEntry,
  onSendMessage,
}: {
  copy: DeskCopy;
  memberQuery: string;
  filteredMembers: MemberRow[];
  selectedMember: MemberRow | null;
  busyId: string;
  onMemberQueryChange: (value: string) => void;
  onSelectMember: (member: MemberRow) => void;
  onRecordPayment: (member: MemberRow) => void;
  onOverrideEntry: (member: MemberRow) => void;
  onSendMessage: (member: MemberRow) => void;
}) {
  const [showPhone, setShowPhone] = useState(false);
  const phone = selectedMember?.user?.phone;
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
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-lime-300/15 text-2xl font-semibold text-lime-100">
                  {memberLabel(selectedMember).slice(0, 1)}
                </div>
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
                <p className="mt-2 text-sm text-white/68">
                  {copy.lastCheckIn}: {formatDateTime(selectedMember.lastCheckIn?.checkedInAt)}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-white/48">
                  {(selectedMember.recentCheckIns ?? []).slice(0, 3).map((record) => (
                    <p key={record.id}>
                      {formatDateTime(record.checkedInAt)} - {formatEnumLabel(record.status)}
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRecordPayment(selectedMember)}
                  className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                >
                  {copy.recordPayment}
                </button>
                <button
                  type="button"
                  disabled={busyId === `override:${selectedMember.user?.id}`}
                  onClick={() => onOverrideEntry(selectedMember)}
                  className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 disabled:opacity-45"
                >
                  {copy.overrideEntry}
                </button>
                <button
                  type="button"
                  disabled={busyId === `message:${selectedMember.user?.id}`}
                  onClick={() => onSendMessage(selectedMember)}
                  className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 disabled:opacity-45"
                >
                  {copy.sendMemberMessage}
                </button>
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
