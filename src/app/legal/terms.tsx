import { LegalPage } from "@/components/legal-page";
import { TERMS } from "@/domain/legal";

export default function TermsScreen() {
  return <LegalPage doc={TERMS} />;
}
