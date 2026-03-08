const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Добавляем поддержку .mjs файлов, которые часто используются в новых библиотеках (как Zustand)
config.resolver.sourceExts.push('mjs');

module.exports = config;
