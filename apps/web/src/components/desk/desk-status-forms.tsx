"use client";

import type { FormEvent } from "react";
import { ZookButton } from "@/components/zook-button";
import type { DeskCopy } from "./copy";
import type { MemberRow, ShopOrder } from "./types";

export function DeskMessageDraftForm({
  copy,
  busyId,
  messageDraft,
  onCancel,
  onDraftChange,
  onSubmit,
}: {
  copy: DeskCopy;
  busyId: string;
  messageDraft: { member: MemberRow; body: string };
  onCancel: () => void;
  onDraftChange: (body: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isSending = busyId.startsWith("message:");
  return (
    <form
      className="rounded-[24px] border border-white/10 bg-black/30 p-4"
      onSubmit={(event) => void onSubmit(event)}
    >
      <p className="text-sm font-semibold text-white">
        {copy.directMessagePrompt}: {messageDraft.member.user?.name ?? copy.member}
      </p>
      <textarea
        value={messageDraft.body}
        onChange={(event) => onDraftChange(event.target.value)}
        maxLength={500}
        rows={3}
        className="zook-focus mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
        placeholder={copy.deskMessageTitle}
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <ZookButton type="button" tone="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </ZookButton>
        <ZookButton
          type="submit"
          size="sm"
          disabled={!messageDraft.body.trim() || isSending}
          state={isSending ? "loading" : "idle"}
        >
          {isSending ? copy.sending : copy.sendMemberMessage}
        </ZookButton>
      </div>
    </form>
  );
}

export function DeskPickupDraftForm({
  copy,
  busyId,
  pickupDraft,
  onCancel,
  onDraftChange,
  onSubmit,
}: {
  copy: DeskCopy;
  busyId: string;
  pickupDraft: { order: ShopOrder; code: string };
  onCancel: () => void;
  onDraftChange: (code: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isVerifying = busyId.startsWith("verify:");
  return (
    <form
      className="rounded-[24px] border border-white/10 bg-black/30 p-4"
      onSubmit={(event) => void onSubmit(event)}
    >
      <p className="text-sm font-semibold text-white">{copy.pickupPrompt}</p>
      <input
        value={pickupDraft.code}
        onChange={(event) => onDraftChange(event.target.value)}
        className="zook-focus mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
        placeholder={copy.pickupCode}
        autoComplete="one-time-code"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <ZookButton type="button" tone="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </ZookButton>
        <ZookButton
          type="submit"
          size="sm"
          disabled={!pickupDraft.code.trim() || isVerifying}
          state={isVerifying ? "loading" : "idle"}
        >
          {isVerifying ? copy.verifying : copy.verifyCode}
        </ZookButton>
      </div>
    </form>
  );
}
