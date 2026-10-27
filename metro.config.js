// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Agent worktrees (.claude/worktrees/*) are full repo copies with their own node_modules: crawling and watching them
// made the dev server take over a minute per page and rebuild on edits made in other checkouts.
config.resolver.blockList = [].concat(config.resolver.blockList ?? [], /[\\/]\.claude[\\/].*/, /[\\/]\.superpowers[\\/].*/);

module.exports = config;
