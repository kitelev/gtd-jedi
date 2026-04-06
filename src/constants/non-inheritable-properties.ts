/**
 * NonInheritable Properties Registry
 *
 * These properties MUST NOT be propagated from prototype to instance
 * by the materializer. Inheriting them would corrupt user data.
 *
 * This is the authoritative, single source of truth for non-inheritable
 * properties in the Exocortex prototype chain system.
 *
 * Rationale for each property:
 * - exo__Asset_uid: Each asset has a globally unique identifier; inheriting would create duplicates
 * - exo__Asset_label: User-chosen name; prototype label is not the instance label
 * - exo__Asset_description: User-authored description; prototype description is template-level
 * - exo__Asset_isDefinedBy: Namespace binding; instances belong to user namespace, not plugin namespace
 * - ems__Effort_status: Workflow state is per-instance; a prototype's status is irrelevant to instances
 * - aliases: User-facing aliases are per-instance; prototype aliases name the prototype itself
 */

export const NON_INHERITABLE_PROPERTIES = [
  'exo__Asset_uid',
  'exo__Asset_label',
  'exo__Asset_description',
  'exo__Asset_isDefinedBy',
  'ems__Effort_status',
  'aliases',
] as const;

export type NonInheritableProperty = (typeof NON_INHERITABLE_PROPERTIES)[number];

/**
 * Check if a property name is non-inheritable.
 */
export function isNonInheritable(propertyName: string): boolean {
  return (NON_INHERITABLE_PROPERTIES as readonly string[]).includes(propertyName);
}
