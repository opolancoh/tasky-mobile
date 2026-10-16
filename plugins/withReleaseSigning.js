// Signs Android release builds with the upload key in keystore.properties (gitignored, next to app.json), M61.
// Runs at `expo prebuild`: android/app/build.gradle gets a `release` signing config read from that file, and the
// release build type uses it (the template signs releases with the debug key). Without the file, nothing is signed
// with it, and scripts/android-build.sh refuses to build.
const { withAppBuildGradle } = require('expo/config-plugins');

const LOAD = `
def azigniaKeystore = new Properties()
def azigniaKeystoreFile = rootProject.file("../keystore.properties")
if (azigniaKeystoreFile.exists()) { azigniaKeystoreFile.withInputStream { azigniaKeystore.load(it) } }
def azigniaStoreFile = { String path -> new File(path).isAbsolute() ? file(path) : rootProject.file("../" + path) }
`;

const CONFIG = `
        release {
            if (azigniaKeystore['storeFile']) {
                storeFile azigniaStoreFile(azigniaKeystore['storeFile'])
                storePassword azigniaKeystore['storePassword']
                keyAlias azigniaKeystore['keyAlias']
                keyPassword azigniaKeystore['keyPassword']
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes('azigniaKeystore')) return mod;
    gradle = gradle.replace(/^android\s*\{/m, `${LOAD}\nandroid {`);
    gradle = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${CONFIG}`);
    // Only the release build type: its line is the last `signingConfig signingConfigs.debug` in buildTypes.
    gradle = gradle.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    mod.modResults.contents = gradle;
    return mod;
  });
