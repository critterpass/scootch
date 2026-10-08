// Plain JavaScript with `require`: Expo loads app.config.ts by itself, under plain Node, and
// does not compile what it imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const { copyFileSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

/**
 * @typedef {object} AlternateIcon
 * @property {string} name The name `UIApplication.setAlternateIconName` takes.
 * @property {string} light The three drawings, as paths from the project root.
 * @property {string} dark
 * @property {string} tinted
 */

/**
 * Declares the app's other icons to iOS: one icon set in the asset catalogue for each, in its
 * Default, Dark and Tinted drawings, and the setting that tells the compiler to keep them. The
 * app's own icon stays Expo's to write (`ios.icon`).
 *
 * @type {import('expo/config-plugins').ConfigPlugin<readonly AlternateIcon[]>}
 */
const withAlternateAppIcons = (config, icons) => {
  const withSets = withDangerousMod(config, [
    'ios',
    (mod) => {
      const { platformProjectRoot, projectRoot, projectName } = mod.modRequest;
      const catalogue = path.join(platformProjectRoot, projectName ?? '', 'Images.xcassets');
      for (const icon of icons) {
        const set = path.join(catalogue, `${icon.name}.appiconset`);
        mkdirSync(set, { recursive: true });
        const images = ['light', 'dark', 'tinted'].map((variant) => {
          const filename = `${icon.name}-${variant}.png`;
          copyFileSync(path.resolve(projectRoot, icon[variant]), path.join(set, filename));
          return {
            filename,
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
            ...(variant === 'light'
              ? {}
              : { appearances: [{ appearance: 'luminosity', value: variant }] }),
          };
        });
        writeFileSync(
          path.join(set, 'Contents.json'),
          `${JSON.stringify({ images, info: { author: 'expo', version: 1 } }, null, 2)}\n`,
        );
      }
      return mod;
    },
  ]);

  return withXcodeProject(withSets, (mod) => {
    const names = icons.map((icon) => icon.name).join(' ');
    const bundleIdentifier = mod.ios?.bundleIdentifier;
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const configuration of Object.values(configurations)) {
      if (typeof configuration === 'string' || !configuration.buildSettings) continue;
      const { buildSettings } = configuration;
      // The app's own target only: an extension has no icon.
      const identifier = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER ?? '').replace(/"/g, '');
      if (identifier !== bundleIdentifier) continue;
      buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = `"${names}"`;
    }
    return mod;
  });
};

module.exports = { withAlternateAppIcons };
