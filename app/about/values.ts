import { t } from "@/app/translation/translation";
import { Image, MessageCircle, ShieldCheck } from "lucide-react";

export const getFeatures = (tr: typeof t.en) => [
  {
    icon: MessageCircle,
    title: tr.featureChat,
    description: tr.featureChatDesc,
  },
  {
    icon: Image,
    title: tr.featurePhoto,
    description: tr.featurePhotoDesc,
  },
  {
    icon: ShieldCheck,
    title: tr.featurePrivacy,
    description: tr.featurePrivacyDesc,
  },
];

export const getValues = (tr: typeof t.en) => [
  {
    title: tr.valueRespect,
    description: tr.valueRespectDesc,
  },
  {
    title: tr.valueInnovation,
    description: tr.valueInnovationDesc,
  },
  {
    title: tr.valueInclusivity,
    description: tr.valueInclusivityDesc,
  },
  {
    title: tr.valueSimplicity,
    description: tr.valueSimplicityDesc,
  },
];
