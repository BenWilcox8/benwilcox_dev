/**
 * Pure helpers for keeping the gitignored `public/photos` working directory in
 * lock-step with the published (green-labelled) set.
 *
 * `generate` builds the manifest from whatever sits in the working directory, so
 * a photo that loses its green label must have its working files removed before
 * the next `generate` — otherwise it would be re-discovered and re-published.
 */

/**
 * Returns the working files (by name) whose slug is NOT in the published set —
 * i.e. leftovers from a previous run that should be deleted so `generate` no
 * longer sees them.
 */
export function staleWorkingFiles(
  existingFiles: string[],
  publishedSlugs: Set<string>,
  slugOf: (file: string) => string,
): string[] {
  return existingFiles.filter(file => !publishedSlugs.has(slugOf(file)))
}
