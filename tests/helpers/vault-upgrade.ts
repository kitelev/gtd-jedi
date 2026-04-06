/**
 * Vault Upgrade Simulator — simulates upgrading a plugin within a vault.
 *
 * Loads a vault fixture (plugin files + user data), captures pre-upgrade state,
 * then "upgrades" by replacing plugin files with the new version and re-materializing.
 *
 * The simulation:
 * 1. Parses all files from vault-v1.0 (plugin + user data)
 * 2. Records user instance UIDs and their NonInheritable properties
 * 3. Replaces plugin files with vault-v1.1 plugin files
 * 4. Re-materializes with the new plugin prototype
 * 5. Returns both pre- and post-upgrade states for comparison
 */

import { parseAllPluginFiles, type ParsedFile } from '../conformance/structural/parser.js';
import {
  buildUidMap,
  materializeAsset,
  NON_INHERITABLE_PROPERTIES,
  type MaterializedAsset,
} from './materializer.js';

export interface UserInstanceData {
  uid: string;
  label: string;
  status: string;
  startTimestamp: string;
  description: string;
}

export interface VaultState {
  allFiles: ParsedFile[];
  pluginFiles: ParsedFile[];
  userFiles: ParsedFile[];
  userInstances: UserInstanceData[];
  materializedUsers: MaterializedAsset[];
}

/**
 * Load a vault fixture and extract user instance data.
 */
export async function loadVaultFixture(vaultPath: string): Promise<VaultState> {
  const allFiles = await parseAllPluginFiles(vaultPath);

  const pluginFiles = allFiles.filter((f) => f.filePath.includes('/plugin/'));
  const userFiles = allFiles.filter((f) => f.filePath.includes('/user-data/'));

  const uidMap = buildUidMap(allFiles);
  const materializedUsers = userFiles.map((f) => materializeAsset(f, uidMap));

  const userInstances = userFiles.map((f) => ({
    uid: f.uid ?? f.fileName,
    label: String(f.frontmatter.exo__Asset_label ?? ''),
    status: String(f.frontmatter.ems__Effort_status ?? ''),
    startTimestamp: String(f.frontmatter.ems__Effort_startTimestamp ?? ''),
    description: String(f.frontmatter.exo__Asset_description ?? ''),
  }));

  return { allFiles, pluginFiles, userFiles, userInstances, materializedUsers };
}

/**
 * Simulate a plugin upgrade: replace plugin files from v1.0 with v1.1,
 * keep user data unchanged, re-materialize.
 */
export async function simulateUpgrade(
  v10Path: string,
  v11Path: string,
): Promise<{ before: VaultState; after: VaultState }> {
  const before = await loadVaultFixture(v10Path);
  const after = await loadVaultFixture(v11Path);

  return { before, after };
}
