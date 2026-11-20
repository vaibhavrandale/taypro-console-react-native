const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

function withUsbSerialGradle(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const gradlePath = path.join(
        config.modRequest.projectRoot,
        "node_modules/react-native-usb-serialport-for-android/android/build.gradle",
      );
      if (!fs.existsSync(gradlePath)) return config;
      let text = fs.readFileSync(gradlePath, "utf8");
      if (!text.includes('namespace "com.bastengao.usbserialport"')) {
        text = text.replace(
          "android {",
          'android {\n    namespace "com.bastengao.usbserialport"',
        );
      }
      text = text.replace(
        "compileSdkVersion safeExtGet('UsbSerialportForAndroid_compileSdkVersion', 30)",
        "compileSdkVersion safeExtGet('UsbSerialportForAndroid_compileSdkVersion', 35)",
      );
      text = text.replace(/^\s*jcenter\(\)\s*$/gm, "");
      fs.writeFileSync(gradlePath, text);
      const manifestPath = path.join(
        path.dirname(gradlePath),
        "src/main/AndroidManifest.xml",
      );
      if (fs.existsSync(manifestPath)) {
        const manifest = fs
          .readFileSync(manifestPath, "utf8")
          .replace(
            '<uses-feature android:name="android.hardware.usb.host" />',
            '<uses-feature android:name="android.hardware.usb.host" android:required="false" />',
          );
        fs.writeFileSync(manifestPath, manifest);
      }
      return config;
    },
  ]);
}

/** Lets the phone act as USB host for the PCB serial dongle. */
function withUsbHost(config) {
  config = withUsbSerialGradle(config);
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const features = manifest["uses-feature"] ?? [];
    const name = "android.hardware.usb.host";
    const present = features.some((item) => item.$?.["android:name"] === name);
    if (!present) {
      features.push({
        $: { "android:name": name, "android:required": "false" },
      });
    }
    manifest["uses-feature"] = features;
    return config;
  });
}

module.exports = withUsbHost;
