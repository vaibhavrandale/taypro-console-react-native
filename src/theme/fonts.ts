export const fontFamily = {
  thin: 'Blinker_100Thin',
  extraLight: 'Blinker_200ExtraLight',
  light: 'Blinker_300Light',
  regular: 'Blinker_400Regular',
  semiBold: 'Blinker_600SemiBold',
  bold: 'Blinker_700Bold',
  extraBold: 'Blinker_800ExtraBold',
  black: 'Blinker_900Black',
} as const;

/** Map RN fontWeight → Blinker face (Blinker has no 500). */
export const blinkerFamilyForWeight = (
  weight?: string | number,
): string => {
  switch (String(weight ?? '400')) {
    case '100':
      return fontFamily.thin;
    case '200':
      return fontFamily.extraLight;
    case '300':
      return fontFamily.light;
    case '500':
    case '600':
      return fontFamily.semiBold;
    case '700':
    case 'bold':
      return fontFamily.bold;
    case '800':
      return fontFamily.extraBold;
    case '900':
      return fontFamily.black;
    case '400':
    case 'normal':
    default:
      return fontFamily.regular;
  }
};
