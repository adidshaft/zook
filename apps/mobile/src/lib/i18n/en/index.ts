import { enCommonTranslations } from "./common";
import { enMemberTranslations } from "./member";
import { enOwnerTranslations } from "./owner";
import { enTrainerTranslations } from "./trainer";
import { enReceptionTranslations } from "./reception";

export const enTranslations = {
  ...enCommonTranslations,
  ...enMemberTranslations,
  ...enOwnerTranslations,
  ...enTrainerTranslations,
  ...enReceptionTranslations,
} as const;
