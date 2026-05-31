// mikser-io-sdk-vue
//
// Vue 3 composables and router integration for a mikser-io server.
// Pairs with mikser-io-sdk-api — get the entities client from there,
// hand it to the plugin, and use the composables anywhere.
//
// This file is a re-export barrel. The actual implementations live in
// ./src — one file per concern:
//
//   src/plugin.js     createMikserPlugin, useMikserClient
//   src/documents.js  useDocument, useDocuments
//   src/router.js     useMikserRoutes, useMikserRoutesSync, generateMikserRoutes
//   src/href.js       provideHrefIndex, useHref
//   src/asset.js      provideAssetIndex, useAsset
//
// Each submodule can also be imported directly:
//
//   import { useDocument } from 'mikser-io-sdk-vue/src/documents.js'
//
// but the package's public surface is this barrel — the submodule
// paths are not part of the API contract.

export { createMikserPlugin, useMikserClient } from './src/plugin.js'
export { useDocument, useDocuments }            from './src/documents.js'
export {
    useMikserRoutes,
    useMikserRoutesSync,
    generateMikserRoutes,
} from './src/router.js'
export { provideHrefIndex, useHref, useAlternates } from './src/href.js'
export { provideAssetIndex, useAsset }          from './src/asset.js'
