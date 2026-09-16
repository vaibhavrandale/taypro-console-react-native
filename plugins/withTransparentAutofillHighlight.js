const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

/** Removes Android's yellow Autofill overlay on TextInput. */
function withTransparentAutofillHighlight(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(
      config.modResults,
      {
        add: true,
        parent: AndroidConfig.Styles.getAppThemeGroup(),
        name: 'android:autofilledHighlight',
        value: '@android:color/transparent',
      },
    );
    return config;
  });
}

module.exports = withTransparentAutofillHighlight;
