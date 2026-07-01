import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mobileApiFetch } from "./api";
import { useAuth } from "./auth";
import { useT } from "./i18n";
import { getStoredValue, setStoredValue } from "./storage";
import { showToast } from "./toast";

type BranchRecord = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isDefault?: boolean | null;
};

type BranchSelectionContextValue = {
  branches: BranchRecord[];
  selectedBranch: BranchRecord | null;
  selectedBranchId?: string;
  isLoading: boolean;
  selectBranch: (branchId: string) => Promise<void>;
};

const BranchSelectionContext = createContext<BranchSelectionContextValue | null>(null);

function storageKey(orgId?: string) {
  return `zook_active_branch_${orgId ?? "global"}`;
}

function defaultBranch(branches: BranchRecord[]) {
  return branches.find((branch) => branch.isDefault) ?? branches[0] ?? null;
}

function toCoordinate(value: unknown) {
  const coordinate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function branchCoordinates(branch: BranchRecord) {
  const latitude = toCoordinate(branch.latitude);
  const longitude = toCoordinate(branch.longitude);
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function nearestBranch(
  branches: BranchRecord[],
  coordinates: { latitude: number; longitude: number },
) {
  return branches
    .map((branch) => {
      const branchLocation = branchCoordinates(branch);
      return branchLocation
        ? { branch, distance: distanceMeters(coordinates, branchLocation) }
        : null;
    })
    .filter((item): item is { branch: BranchRecord; distance: number } => Boolean(item))
    .sort((a, b) => a.distance - b.distance)[0]?.branch;
}

export function BranchSelectionProvider({ children }: { children: ReactNode }) {
  const { activeOrgId, session, status, token } = useAuth();
  const t = useT();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const [storedBranchId, setStoredBranchId] = useState<string | undefined>();
  const [autoBranchId, setAutoBranchId] = useState<string | undefined>();
  const [hydratedOrgId, setHydratedOrgId] = useState<string | undefined>();

  const branchesQuery = useQuery({
    queryKey: ["mobile", "branches", activeOrgId, activeOrganization?.username],
    queryFn: async () => {
      const result = await mobileApiFetch<{ branches?: BranchRecord[] }>(
        `/orgs/public/${activeOrganization?.username}`,
        { token },
      );
      return result.branches ?? [];
    },
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(activeOrgId) &&
      Boolean(activeOrganization?.username),
    staleTime: 60_000,
  });

  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const storedBranch =
    hydratedOrgId === activeOrgId
      ? branches.find((branch) => branch.id === storedBranchId)
      : undefined;
  const autoBranch =
    !storedBranchId && hydratedOrgId === activeOrgId
      ? branches.find((branch) => branch.id === autoBranchId)
      : undefined;
  const selectedBranch = storedBranch ?? autoBranch ?? defaultBranch(branches);
  const selectedBranchId = selectedBranch?.id;

  useEffect(() => {
    let cancelled = false;
    setHydratedOrgId(undefined);
    setStoredBranchId(undefined);
    setAutoBranchId(undefined);
    void getStoredValue(storageKey(activeOrgId))
      .then((value) => {
        if (!cancelled) {
          setStoredBranchId(value ?? undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydratedOrgId(activeOrgId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  useEffect(() => {
    if (!branches.length || hydratedOrgId !== activeOrgId || !storedBranchId) {
      return;
    }
    const nextBranch = storedBranch ?? defaultBranch(branches);
    if (nextBranch && storedBranchId !== nextBranch.id && !storedBranch) {
      showToast({
        tone: "amber",
        haptic: "warning",
        message: t("branch.removedSwitched", { name: nextBranch.name }),
      });
      setStoredBranchId(nextBranch.id);
      void setStoredValue(storageKey(activeOrgId), nextBranch.id);
    }
  }, [activeOrgId, branches, hydratedOrgId, storedBranch, storedBranchId, t]);

  useEffect(() => {
    if (
      hydratedOrgId !== activeOrgId ||
      storedBranchId ||
      branches.length < 2 ||
      !branches.some((branch) => branchCoordinates(branch))
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (
        cancelled ||
        existingPermission.status !== Location.PermissionStatus.GRANTED
      ) {
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;
      const nearest = nearestBranch(branches, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (nearest) {
        setAutoBranchId(nearest.id);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeOrgId, branches, hydratedOrgId, storedBranchId]);

  const selectBranch = useCallback(
    async (branchId: string) => {
      setAutoBranchId(undefined);
      setStoredBranchId(branchId);
      await setStoredValue(storageKey(activeOrgId), branchId);
    },
    [activeOrgId],
  );

  const value = useMemo(
    () => ({
      branches,
      selectedBranch,
      selectedBranchId,
      isLoading: branchesQuery.isLoading || hydratedOrgId !== activeOrgId,
      selectBranch,
    }),
    [
      activeOrgId,
      branches,
      branchesQuery.isLoading,
      hydratedOrgId,
      selectBranch,
      selectedBranch,
      selectedBranchId,
    ],
  );

  return (
    <BranchSelectionContext.Provider value={value}>{children}</BranchSelectionContext.Provider>
  );
}

export function useBranchSelection() {
  return (
    useContext(BranchSelectionContext) ?? {
      branches: [],
      selectedBranch: null,
      selectedBranchId: undefined,
      isLoading: false,
      selectBranch: async () => undefined,
    }
  );
}
