/* eslint-disable @typescript-eslint/no-require-imports */
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
