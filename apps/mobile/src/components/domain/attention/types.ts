import type { ComponentProps } from "react";

import type { IconBubble } from "@/components/primitives";

export type AttentionItem = {
  id: string;
  icon: ComponentProps<typeof IconBubble>["icon"];
  title: string;
  subtitle?: string;
  tone: ComponentProps<typeof IconBubble>["tone"] | "danger";
  cta?: { label: string; onPress: () => void };
};

export type AttentionCardProps = {
  title?: string;
  items: AttentionItem[];
  emptyState?: { title: string; subtitle?: string };
};
