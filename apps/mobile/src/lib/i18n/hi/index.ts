import { hiCommonTranslations } from "./common";
import { hiMemberTranslations } from "./member";
import { hiOwnerTranslations } from "./owner";
import { hiTrainerTranslations } from "./trainer";
import { hiReceptionTranslations } from "./reception";

export const hiTranslations = {
  ...hiCommonTranslations,
  ...hiMemberTranslations,
  ...hiOwnerTranslations,
  ...hiTrainerTranslations,
  ...hiReceptionTranslations,
} as const;
