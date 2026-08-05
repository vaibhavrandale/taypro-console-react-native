import { Text, TextInput, StyleSheet, type TextStyle } from 'react-native';
import { blinkerFamilyForWeight, fontFamily } from './fonts';

const SKIP_FAMILIES = /mono|menlo|courier|consolas/i;

function resolveStyle(style: TextStyle | TextStyle[] | undefined) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!flat) {
    return { fontFamily: fontFamily.regular };
  }

  const existing = flat.fontFamily;
  if (existing && SKIP_FAMILIES.test(existing)) {
    return flat;
  }

  // Keep an explicit Blinker face from typography / callers
  if (existing && existing.startsWith('Blinker_')) {
    const { fontWeight: _fw, ...rest } = flat;
    return rest;
  }

  const { fontWeight, ...rest } = flat;
  return {
    ...rest,
    fontFamily: blinkerFamilyForWeight(fontWeight),
  };
}

/**
 * Force Blinker on every Text / TextInput.
 * Uses the correct face per fontWeight (Android won't fake-bold custom fonts).
 */
export function applyBlinkerFont() {
  const textAny = Text as typeof Text & {
    render?: (...args: unknown[]) => unknown;
    __blinkerPatched?: boolean;
  };
  const inputAny = TextInput as typeof TextInput & {
    render?: (...args: unknown[]) => unknown;
    __blinkerPatched?: boolean;
  };

  if (!textAny.__blinkerPatched && typeof textAny.render === 'function') {
    const original = textAny.render.bind(Text);
    textAny.__blinkerPatched = true;
    textAny.render = (props: { style?: TextStyle | TextStyle[] }, ref: unknown) =>
      original({ ...props, style: resolveStyle(props.style) }, ref);
  } else if (!textAny.defaultProps) {
    // Fallback when render isn't patchable
    // @ts-expect-error defaultProps still honored on many RN builds
    Text.defaultProps = {
      ...(Text as { defaultProps?: object }).defaultProps,
      style: { fontFamily: fontFamily.regular },
    };
  }

  if (!inputAny.__blinkerPatched && typeof inputAny.render === 'function') {
    const original = inputAny.render.bind(TextInput);
    inputAny.__blinkerPatched = true;
    inputAny.render = (props: { style?: TextStyle | TextStyle[] }, ref: unknown) =>
      original({ ...props, style: resolveStyle(props.style) }, ref);
  } else if (!(TextInput as { defaultProps?: object }).defaultProps) {
    // @ts-expect-error defaultProps still honored on many RN builds
    TextInput.defaultProps = {
      ...(TextInput as { defaultProps?: object }).defaultProps,
      style: { fontFamily: fontFamily.regular },
    };
  }
}
