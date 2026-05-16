import type { ReactNode } from "react";
import { IndianRupee, ListChecks, Search, ShoppingBag } from "lucide-react";
import type { BranchSummary, TabKey } from "./types";
import type { DeskCopy } from "./copy";

export const deskTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "queue", label: "Queue", icon: <ListChecks size={18} /> },
  { key: "member", label: "Member", icon: <Search size={18} /> },
  { key: "payment", label: "Payment", icon: <IndianRupee size={18} /> },
  { key: "pickup", label: "Pickup", icon: <ShoppingBag size={18} /> },
];

export function withBranch(path: string, branch?: BranchSummary | null) {
  if (!branch?.id) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}branchId=${encodeURIComponent(branch.id)}`;
}

export function DeskBottomNav({
  activeTab,
  copy,
  onChange,
}: {
  activeTab: TabKey;
  copy: DeskCopy;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070908]/94 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2">
        {deskTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`zook-focus grid min-h-14 place-items-center rounded-2xl text-xs font-semibold transition ${
              activeTab === tab.key ? "bg-lime-300 text-black" : "text-white/58 hover:bg-white/8"
            }`}
          >
            {tab.icon}
            <span>{copy.tabs[tab.key]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
