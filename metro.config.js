const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for TypeScript and other file extensions
config.resolver.sourceExts.push('tsx', 'ts', 'jsx', 'js');

// Add support for CSS imports for NativeWind
config.resolver.assetExts.push('css');

module.exports = config;
