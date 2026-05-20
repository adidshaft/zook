import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type { InvoiceRecord, OrgPaymentRecord } from "@/lib/domains/shared/types";

export function useMyInvoices() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.payments.invoices(),
    queryFn: () =>
      mobileApiFetch<{ invoices: InvoiceRecord[] }>("/me/invoices", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useOrgRecentPayments(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.payments.list(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ payments: OrgPaymentRecord[] }>(
        `/orgs/${resolvedOrgId}/payments/recent${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}
