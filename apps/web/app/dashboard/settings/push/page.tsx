"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, MonitorSmartphone, Trash2 } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

type PushDevice = {
  id: string;
  platform: string;
  status: string;
  deviceLabel?: string | null;
  appVersion?: string | null;
  lastRegisteredAt?: string | null;
  lastSeenAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

export default function PushSettingsPage() {
  const queryClient = useQueryClient();
  const devicesQuery = useQuery({
    queryKey: ["me", "push-devices"],
    queryFn: () => webApiFetch<{ devices: PushDevice[] }>("/api/me/push-devices"),
  });
  const revokeDevice = useMutation({
    mutationFn: (deviceId: string) =>
      webApiFetch(`/api/me/push-devices/${deviceId}`, {
        method: "DELETE",
        feedback: { success: "Push device revoked." },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "push-devices"] });
    },
  });
  const canRegisterBrowser = useMemo(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
    [],
  );
  const devices = devicesQuery.data?.devices ?? [];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 p-4 sm:p-6">
      <GlassCard variant="strong">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Settings
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text-primary)]">
              <Bell size={22} />
              Push devices
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Registered phones and browsers that can receive Zook push alerts for this account.
            </p>
          </div>
          <Link className="text-sm font-semibold text-[var(--accent-strong)]" href="/dashboard/settings">
            Back to settings
          </Link>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Registered devices</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Revoke old devices when staff changes phones or browser sessions expire.
            </p>
          </div>
          <ZookButton disabled={!canRegisterBrowser} tone="ghost">
            Register this browser
          </ZookButton>
        </div>
        {!canRegisterBrowser ? (
          <p className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-xs text-[var(--text-tertiary)]">
            Browser push registration needs service worker setup in this browser. Mobile devices can still be
            managed here.
          </p>
        ) : null}
      </GlassCard>

      {devicesQuery.isLoading ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">Loading push devices.</p>
        </GlassCard>
      ) : null}
      {devicesQuery.isError ? (
        <GlassCard variant="danger">
          <p className="text-sm text-[var(--text-primary)]">
            {(devicesQuery.error as Error).message || "Push devices could not load."}
          </p>
        </GlassCard>
      ) : null}
      {!devicesQuery.isLoading && !devices.length ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">No push devices are registered yet.</p>
        </GlassCard>
      ) : null}
      {devices.map((device) => (
        <GlassCard key={device.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)]">
                <MonitorSmartphone size={18} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    {device.deviceLabel || formatEnumLabel(device.platform)}
                  </h2>
                  <Pill tone={device.status === "ACTIVE" ? "lime" : "neutral"}>
                    {formatEnumLabel(device.status)}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {formatEnumLabel(device.platform)}
                  {device.appVersion ? ` · v${device.appVersion}` : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Registered {formatDateTime(device.lastRegisteredAt ?? device.createdAt)}
                  {device.lastSeenAt ? ` · Last seen ${formatDateTime(device.lastSeenAt)}` : ""}
                </p>
              </div>
            </div>
            {device.status === "ACTIVE" ? (
              <ZookButton
                tone="danger"
                size="sm"
                onClick={() => revokeDevice.mutate(device.id)}
                disabled={revokeDevice.isPending}
              >
                <Trash2 size={14} />
                Revoke
              </ZookButton>
            ) : null}
          </div>
        </GlassCard>
      ))}
    </main>
  );
}
