import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mobileApiFetch } from "./api";
import { useAuth } from "./auth";
import { getStoredValue, setStoredValue } from "./storage";

type BranchRecord = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
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

export function BranchSelectionProvider({ children }: { children: ReactNode }) {
  const { activeOrgId, session, status, token } = useAuth();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const [storedBranchId, setStoredBranchId] = useState<string | undefined>();
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
    staleTime: 5 * 60_000,
  });

  const branches = branchesQuery.data ?? [];
  const selectedBranch =
    branches.find((branch) => branch.id === storedBranchId) ?? defaultBranch(branches);
  const selectedBranchId = selectedBranch?.id;

  useEffect(() => {
    let cancelled = false;
    setHydratedOrgId(undefined);
    setStoredBranchId(undefined);
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
    if (!branches.length || hydratedOrgId !== activeOrgId) {
      return;
    }
    const nextBranch = selectedBranch;
    if (nextBranch && storedBranchId !== nextBranch.id) {
      setStoredBranchId(nextBranch.id);
      void setStoredValue(storageKey(activeOrgId), nextBranch.id);
    }
  }, [activeOrgId, branches.length, hydratedOrgId, selectedBranch, storedBranchId]);

  const selectBranch = useCallback(
    async (branchId: string) => {
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
