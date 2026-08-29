import type { AgeGroup } from './types'

/**
 * Scales every group's enrollment to a target occupancy %, keeping each
 * group's current private/subsidized mix (spec §9 Enrollment Simulator; also
 * the fill-order assumption the Break-Even Engine uses — proportional to
 * each group's capacity share, flagged as an assumption in
 * docs/ARCHITECTURE.md §10 pending your confirmation).
 */
export const scaleAgeGroupToOccupancy = (group: AgeGroup, occupancyPct: number): AgeGroup => {
  const enrolled = Math.min(group.capacity, Math.max(0, Math.round(group.capacity * occupancyPct)))
  if (group.enrolled === 0) {
    return { ...group, enrolled, privatePay: enrolled, subsidized: 0 }
  }
  const privateRatio = group.privatePay / group.enrolled
  const privatePay = Math.min(enrolled, Math.round(enrolled * privateRatio))
  return { ...group, enrolled, privatePay, subsidized: enrolled - privatePay }
}

export const scaleAgeGroupsToOccupancy = (ageGroups: AgeGroup[], occupancyPct: number): AgeGroup[] =>
  ageGroups.map((g) => scaleAgeGroupToOccupancy(g, occupancyPct))
