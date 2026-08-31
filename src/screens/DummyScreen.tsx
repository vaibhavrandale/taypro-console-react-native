import React from "react";
import { StyleSheet, View } from "react-native";
import { Navbar, Screen } from "../components/layout";
import { useTheme } from "../theme";

export function DummyScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="Dummy" subtitle="Custom design" />
      <Screen scroll padded={false} style={styles.body}>
        {/* Design this page here */}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
