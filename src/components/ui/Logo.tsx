import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../theme";
import { radius } from "../../theme/spacing";

const SIZES = {
  xs: 28,
  sm: 38,
  md: 50,
  lg: 64,
  xl: 80,
  xxl: 96,
  xxxl: 128,
} as const;

const LOGO_SOURCES = {
  dark: require("../../../assets/logofordarkbg.png"),
  light: require("../../../assets/logoforwhitebg.png"),
} as const;

type LogoSize = keyof typeof SIZES;
type LogoBackground = "auto" | "dark" | "light";

type Props = {
  size?: LogoSize;
  rounded?: boolean;
  /** Which background the logo sits on. `auto` follows the active theme. */
  background?: LogoBackground;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function Logo({
  size = "md",
  rounded = true,
  background = "auto",
  style,
  imageStyle,
}: Props) {
  const { isDark } = useTheme();
  const dimension = SIZES[size];
  const onDarkBackground =
    background === "dark" ? true : background === "light" ? false : isDark;
  const source = onDarkBackground ? LOGO_SOURCES.dark : LOGO_SOURCES.light;

  return (
    <View
      style={[
        styles.wrap,
        { width: dimension, height: dimension },
        rounded && { borderRadius: dimension * 0.22 },
        style,
      ]}
    >
      <Image
        source={source}
        style={[
          { width: dimension, height: dimension },
          rounded && { borderRadius: dimension * 0.22 },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderRadius: radius.sm,
  },
});
