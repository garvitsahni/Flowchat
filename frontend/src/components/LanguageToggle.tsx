import type { Language } from "../types";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <SegmentedControl
      ariaLabel="Interface language"
      options={[
        { value: "en", label: "EN" },
        { value: "hi", label: "हिं" },
      ]}
      value={language}
      onChange={(v: string) => onChange(v as Language)}
      size="sm"
    />
  );
}