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
//   src/documents.js  useDocument, useDocuments, useDocumentByRoute
//   src/router.js     useMikserRoutes, generateMikserRoutes
//   src/href.js       provideHrefIndex, useHref, useAlternates
//   src/asset.js      provideAssetIndex, useAsset
//   src/vector.js     createMikserVectorPlugin, useMikserVectorClient,
//                     useSimilar (semantic search; pairs with
//                     mikser-io-sdk-vector)
//
// Each submodule can also be imported directly:
//
//   import { useDocument } from 'mikser-io-sdk-vue/src/documents.js'
//
// but the package's public surface is this barrel — the submodule
// paths are not part of the API contract.

export { createMikserPlugin, useMikserClient } from './src/plugin.js'
export {
    useDocument, useDocuments, useDocumentByRoute,
    provideCurrentDocument, useCurrentDocument,
} from './src/documents.js'
export {
    useMikserRoutes,
    generateMikserRoutes,
} from './src/router.js'
export { provideHrefIndex, useHref, useAlternates } from './src/href.js'
export { provideAssetIndex, useAsset }          from './src/asset.js'
export { useMikserStatus }                      from './src/status.js'
export {
    createMikserVectorPlugin,
    useMikserVectorClient,
    useSimilar,
} from './src/vector.js'
