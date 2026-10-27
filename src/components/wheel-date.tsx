export interface WheelDateProps {
  /** "YYYY-MM-DD". */
  value: string;
  onChange: (value: string) => void;
}

/** Web only (wheel-date.web.tsx). iOS and Android use the system date picker. */
export function WheelDate(_props: WheelDateProps) {
  return null;
}
