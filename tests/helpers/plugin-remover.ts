/**
 * Plugin Remover — simulates removing a plugin from a vault.
 *
 * After removal:
 * - Plugin files are excluded from the store
 * - User instance files remain intact
 * - Re-materialization proceeds without plugin prototype definitions
 * - Properties that were inherited from the plugin prototype are no longer available
 */

import { parseAllPluginFiles, type ParsedFile } from '../conformance/structural/parser.js';
import {
  buildUidMap,
  materializeAsset,
  type MaterializedAsset,
} from './materializer.js';

export interface PostRemovalState {
  /** All remaining files (user data only, no plugin files) */
  remainingFiles: ParsedFile[];
  /** Materialized user instances without plugin inheritance */
  materializedUsers: MaterializedAsset[];
  /** Plugin files that were removed */
  removedFiles: ParsedFile[];
}

/**
 * Simulate plugin removal: load a vault, then remove all plugin files
 * (identified by being in the plugin/ directory) and re-materialize.
 */
export async function simulatePluginRemoval(vaultPath: string): Promise<PostRemovalState> {
  const allFiles = await parseAllPluginFiles(vaultPath);

  const pluginFiles = allFiles.filter((f) => f.filePath.includes('/plugin/'));
  const userFiles = allFiles.filter((f) => !f.filePath.includes('/plugin/'));

  // Re-materialize with only user files (no plugin prototypes available)
  const uidMap = buildUidMap(userFiles);
  const materializedUsers = userFiles.map((f) => materializeAsset(f, uidMap));

  return {
    remainingFiles: userFiles,
    materializedUsers,
    removedFiles: pluginFiles,
  };
}

/**
 * Check if any materialized asset has a property whose key starts with a given prefix.
 * Used to verify that plugin-namespace properties are gone after removal.
 */
export function hasNamespaceProperty(
  materialized: MaterializedAsset[],
  namespacePrefix: string,
): boolean {
  return materialized.some((asset) =>
    Object.keys(asset.properties).some((key) => key.startsWith(namespacePrefix)),
  );
}
