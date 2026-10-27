export interface WheelTimeProps {
  /** "HH:MM". */
  value: string;
  onChange: (value: string) => void;
}

/** Web only (wheel-time.web.tsx). iOS and Android use the system time picker, which already is a wheel. */
export function WheelTime(_props: WheelTimeProps) {
  return null;
}
