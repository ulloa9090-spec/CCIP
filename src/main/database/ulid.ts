import { monotonicFactory } from 'ulid'

/**
 * Plain `ulid()` only guarantees millisecond-resolution ordering — two IDs
 * minted within the same millisecond sort by their random component, not by
 * creation order (confirmed by a real test failure: a batch import, or two
 * fast repository calls in a test, land in the same millisecond often
 * enough to matter). The monotonic factory increments the random part on a
 * same-millisecond collision instead, so `ORDER BY id` is always correct.
 * One shared instance so ordering holds across every repository, not just
 * within a single one.
 */
export const ulid = monotonicFactory()
