const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// This is an npm workspaces monorepo, and `frontend` needs a newer React (19.2.x, for
// Next.js) than this app's Expo SDK pins (19.1.0) — a REAL version conflict, not a hoisting
// mistake to "fix" by unifying versions everywhere (most other mobile-only packages, like
// nativewind and react-native itself, are hoisted to the workspace root and rely on Metro's
// normal upward resolution to be found at all — so a blanket `disableHierarchicalLookup`
// would break bundling entirely, not fix this).
//
// The actual bug: because mobile/package.json pins its own react/react-dom/scheduler
// versions, npm kept a SECOND nested copy of exactly those three packages under
// mobile/node_modules alongside the root's newer copies for `frontend`. Metro's bundler
// resolution isn't guaranteed to consistently pick the same one for every file, so two
// different React instances ended up in the same bundle — the classic "Invalid hook call...
// Cannot read property 'useId' of null" dual-package-hazard crash. Only reachable once the
// app actually ran on a real device: Expo Go wraps the root in its own dev-tools component
// (`expo/src/launch/withDevTools.tsx`) that never renders in a plain web build, so this was
// invisible until real-device verification surfaced it.
//
// Fix: force just these three true-singleton packages to always resolve to this project's
// own nested copy, leaving every other package's normal hierarchical resolution (including
// the ones that only exist hoisted at the workspace root) untouched.
//
// `resolver.extraNodeModules` is NOT a forced override — Metro only consults it as a
// FALLBACK when a module can't otherwise be resolved. Since `react`/`react-dom`/`scheduler`
// genuinely DO exist and resolve fine from wherever a root-hoisted package (like
// react-native-safe-area-context) looks for them, extraNodeModules alone never actually took
// effect — confirmed by this exact crash surviving that "fix" (`useContext` returning null
// because SafeAreaProvider's own `react` require resolved to a DIFFERENT copy than the one
// actually driving the render, so its internal hook dispatcher was never initialized).
//
// `resolver.resolveRequest` is Metro's real override hook, checked before any other
// resolution. Rather than hand-constructing paths (subpaths, package.json `exports` fields,
// and platform-specific extensions all need to be handled correctly), this redirects the
// resolution's *origin* to this project's own package.json for just these three names —
// Metro's own default resolver then does a normal upward node_modules walk from THAT fake
// origin, which finds mobile's own nested copy first, exactly as if the request had genuinely
// come from inside this project. This is the standard Expo/Metro monorepo pattern for
// enforcing a true singleton, not something bespoke to this bug.
const REACT_SINGLETONS = ['react', 'react-dom', 'scheduler'];
const projectPackageJson = path.resolve(__dirname, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = REACT_SINGLETONS.some((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  const resolveContext = isSingleton ? { ...context, originModulePath: projectPackageJson } : context;
  return context.resolveRequest(resolveContext, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
