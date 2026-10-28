import makeQr from "qrcode-generator";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

/** A Pix QR, dark modules on white with a quiet border, so any bank app reads it in dark mode too. */
export function PixQr({ value, size }: { value: string; size: number }) {
  const { path, count } = useMemo(() => {
    const qr = makeQr(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { path: d, count: n };
  }, [value]);
  const quiet = 2;
  const box = count + quiet * 2;
  return (
    <View accessible role="img" accessibilityLabel="QR Code do Pix">
      <Svg width={size} height={size} viewBox={`${-quiet} ${-quiet} ${box} ${box}`}>
        <Rect x={-quiet} y={-quiet} width={box} height={box} fill="#FFFFFF" rx={2} />
        <Path d={path} fill="#000000" />
      </Svg>
    </View>
  );
}
