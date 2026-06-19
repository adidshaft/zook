"use client";

import type { Dispatch, SetStateAction } from "react";
import { TextInput, SelectInput } from "../../dashboard-primitives";
import { ZookButton } from "../../zook-button";
import { HelpHint, RadioCardGroup } from "../../ui";
import { BranchHoursEditor } from "./branch-hours-editor";
import { indianStates } from "./branch-states";
import type { StaffAssignmentRow, StaffUserRow } from "@/components/dashboard/types";
import type { BranchFormState } from "./branches-section";
import { Pill } from "../../glass-card";

export function BranchForm({
  mode = "create",
  variant = "full",
  form,
  setForm,
  onSubmit,
  onCancel,
  formBusy,
  staffAssignments = [],
  staffUsersById = new Map(),
}: {
  mode?: "create" | "edit";
  variant?: "full" | "compact";
  form: BranchFormState;
  setForm: Dispatch<SetStateAction<BranchFormState>>;
  onSubmit: () => Promise<void> | void;
  onCancel?: () => void;
  formBusy: boolean;
  staffAssignments?: StaffAssignmentRow[];
  staffUsersById?: Map<string, StaffUserRow>;
}) {
  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition((position) => {
      setForm((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        locationSource: "MANUAL",
      }));
    });
  }

  const isStepLayout = variant === "full" && mode === "create";

  return (
    <div className="grid gap-4">
      {isStepLayout && <Pill className="w-fit">Step 1 · Location</Pill>}
      
      {variant === "full" && (
        <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Coordinates & Map</span>
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={useCurrentLocation}
              className="w-fit"
            >
              Use current location
            </ZookButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              label="Latitude"
              value={form.latitude ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  latitude: event.target.value,
                  locationSource: "MANUAL",
                }))
              }
              placeholder="e.g. 28.6139"
              inputMode="decimal"
            />
            <TextInput
              label="Longitude"
              value={form.longitude ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  longitude: event.target.value,
                  locationSource: "MANUAL",
                }))
              }
              placeholder="e.g. 77.2090"
              inputMode="decimal"
            />
          </div>
          {form.latitude && form.longitude ? (
            <iframe
              title="Branch map pin"
              src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
              className="h-40 w-full rounded-2xl border border-[var(--border)]"
            />
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              Map pin will resolve from full address when saved if coordinates are omitted.
            </p>
          )}
        </div>
      )}

      {isStepLayout && <Pill className="w-fit mt-2">Step 2 · Details</Pill>}

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          label="Branch name"
          value={form.name ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="e.g. South Delhi Central"
          required
        />
        <TextInput
          label="Full address"
          value={form.address ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, address: event.target.value }))
          }
          placeholder="e.g. 12 Ring Road"
          required
        />
        <TextInput
          label="City"
          value={form.city ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, city: event.target.value }))
          }
          placeholder="e.g. New Delhi"
          required
        />
        <SelectInput
          label="State"
          value={form.state ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, state: event.target.value }))
          }
          required
        >
          <option value="">Select State</option>
          {indianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </SelectInput>
        <TextInput
          label="Pincode"
          value={form.pincode ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, pincode: event.target.value }))
          }
          placeholder="e.g. 110024"
          inputMode="numeric"
          required
        />
        <SelectInput
          label="Branch manager"
          value={form.managerId ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, managerId: event.target.value }))
          }
        >
          <option value="">No manager assigned</option>
          {staffAssignments
            .filter((assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN")
            .map((assignment) => (
              <option key={assignment.userId} value={assignment.userId}>
                {staffUsersById.get(assignment.userId)?.name ??
                  staffUsersById.get(assignment.userId)?.email ??
                  "Team member"}
              </option>
            ))}
        </SelectInput>
        <TextInput
          label="Branch phone"
          value={form.contactPhone ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, contactPhone: event.target.value }))
          }
          placeholder="e.g. +91 99999 88888"
        />
        <TextInput
          label="Branch email"
          value={form.contactEmail ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, contactEmail: event.target.value }))
          }
          placeholder="e.g. delhi@gym.com"
          type="email"
        />
        <TextInput
          label="WhatsApp number"
          value={form.whatsappNumber ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, whatsappNumber: event.target.value }))
          }
          placeholder="e.g. +91 99999 88888"
        />
        <TextInput
          label="Amenities"
          value={form.amenitiesText ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, amenitiesText: event.target.value }))
          }
          placeholder="e.g. AC, Showers, Locker Room"
        />
      </div>

      {variant === "full" && (
        <>
          {isStepLayout && <Pill className="w-fit mt-2">Step 3 · Plans and Products</Pill>}
          <div className="grid gap-2">
            <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Commerce setup
              <HelpHint label="Commerce setup" title="Commerce setup">
                Shared uses the current gym plans and products. Custom lets this branch use its
                own pricing and product list before members are attached.
              </HelpHint>
            </span>
            <RadioCardGroup
              name={`${mode}-branch-commerce-setup`}
              label="Commerce setup"
              value={form.commerceSetup ?? "SHARED"}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  commerceSetup: value as "SHARED" | "CUSTOM",
                }))
              }
              options={[
                {
                  value: "SHARED",
                  label: "Use current plans and products",
                  description: "Branch sells the current gym plans and shop catalog.",
                },
                {
                  value: "CUSTOM",
                  label: "Set separate pricing",
                  description: "Branch can use its own pricing and product list before launch.",
                },
              ]}
            />
          </div>
        </>
      )}

      {isStepLayout && <Pill className="w-fit mt-2">Step 4 · Working Hours</Pill>}
      <BranchHoursEditor
        value={form.hoursText}
        onChange={(hoursText) => setForm((current) => ({ ...current, hoursText }))}
        compact={variant === "compact"}
      />

      <div className="flex flex-wrap gap-2 mt-4">
        <ZookButton
          type="button"
          onClick={onSubmit}
          disabled={formBusy}
          state={formBusy ? "loading" : "idle"}
          className={mode === "create" && variant === "full" ? "w-full" : "w-fit"}
        >
          {mode === "create" ? "Add branch" : "Save branch"}
        </ZookButton>
        {onCancel && (
          <ZookButton type="button" tone="ghost" size="sm" onClick={onCancel}>
            Cancel
          </ZookButton>
        )}
      </div>
    </div>
  );
}
