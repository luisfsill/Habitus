import { LegalPage } from "@/components/legal-page";
import { PRIVACY } from "@/domain/legal";

export default function PrivacyScreen() {
  return <LegalPage doc={PRIVACY} />;
}
