import { describe, it, expect } from 'vitest'
import { computeCompletenessScore, isAgentReady } from '@/lib/scoring'
import type { RefinedItem } from '@/lib/schemas'

function makeItem(overrides: Partial<RefinedItem> = {}): RefinedItem {
  return {
    title: 'Add export button to dashboard',
    problem: 'Users cannot export their data, reducing adoption metrics by 20%.',
    acceptanceCriteria: [
      'Given a logged-in user, when they click Export, then a CSV downloads within 3 seconds',
      'When export is triggered, then the file contains all visible rows',
      'Verify the exported CSV opens correctly in Excel and Google Sheets',
    ],
    estimate: 'S',
    priority: 'HIGH — blocks user workflows',
    tags: ['feature', 'ux'],
    ...overrides,
  }
}

describe('computeCompletenessScore', () => {
  it('returns 100 for a perfect item', () => {
    const { score, breakdown } = computeCompletenessScore(makeItem())
    expect(score).toBe(100)
    expect(breakdown.has_measurable_outcome).toBe(true)
    expect(breakdown.has_testable_criteria).toBe(true)
    expect(breakdown.has_constraints).toBe(true)
    expect(breakdown.no_vague_verbs).toBe(true)
    expect(breakdown.has_definition_of_done).toBe(true)
    expect(breakdown.has_verification_steps).toBe(true)
  })

  describe('has_measurable_outcome (+20)', () => {
    it('scores true when problem has a number', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ problem: 'Response time exceeds 5 seconds.' }))
      expect(breakdown.has_measurable_outcome).toBe(true)
    })

    it('scores true when problem has measurable keyword', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ problem: 'We need to reduce cart abandonment rate.' }))
      expect(breakdown.has_measurable_outcome).toBe(true)
    })

    it('scores false when problem is vague', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ problem: 'Users are unhappy with the login page.' }))
      expect(breakdown.has_measurable_outcome).toBe(false)
    })
  })

  describe('has_testable_criteria (+25)', () => {
    it('scores true with 2+ action-verb ACs', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: [
          'Given a user is logged in, when they click Export, then a CSV file downloads',
          'When the export completes, then the user sees a success toast',
        ]
      }))
      expect(breakdown.has_testable_criteria).toBe(true)
    })

    it('scores false with only 1 action-verb AC', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: [
          'Given a user is logged in, when they click Export, then a CSV file downloads',
          'The UI looks nice',
        ]
      }))
      expect(breakdown.has_testable_criteria).toBe(false)
    })

    it('scores false with no ACs', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ acceptanceCriteria: [] }))
      expect(breakdown.has_testable_criteria).toBe(false)
    })
  })

  describe('has_constraints (+20)', () => {
    it('scores true with 2+ tags', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ tags: ['bug', 'auth'], assumptions: undefined }))
      expect(breakdown.has_constraints).toBe(true)
    })

    it('scores true with assumptions present', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        tags: ['bug'],
        assumptions: ['Assumes user is authenticated'],
      }))
      expect(breakdown.has_constraints).toBe(true)
    })

    it('scores false with 1 tag and no assumptions', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ tags: ['bug'], assumptions: undefined }))
      expect(breakdown.has_constraints).toBe(false)
    })

    it('scores false with empty assumptions array', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ tags: ['bug'], assumptions: [] }))
      expect(breakdown.has_constraints).toBe(false)
    })
  })

  describe('no_vague_verbs (+20)', () => {
    it('scores true for specific title without vague verbs', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ title: 'Add CSV export to dashboard' }))
      expect(breakdown.no_vague_verbs).toBe(true)
    })

    it('scores true for "Fix login bug" (specific noun present)', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ title: 'Fix login bug on mobile devices' }))
      expect(breakdown.no_vague_verbs).toBe(true)
    })

    it('scores false for "Improve performance" (< 4 words, vague)', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ title: 'Improve performance' }))
      expect(breakdown.no_vague_verbs).toBe(false)
    })

    it('scores false for short vague title like "Enhance UX"', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ title: 'Enhance UX' }))
      expect(breakdown.no_vague_verbs).toBe(false)
    })

    it('scores false for "Optimize" alone', () => {
      const { breakdown } = computeCompletenessScore(makeItem({ title: 'Optimize' }))
      expect(breakdown.no_vague_verbs).toBe(false)
    })
  })

  describe('has_definition_of_done (+10)', () => {
    it('scores true when AC contains a number', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: ['Loads within 2 seconds', 'Shows a spinner'],
      }))
      expect(breakdown.has_definition_of_done).toBe(true)
    })

    it('scores true when AC contains "returns 200"', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: ['API returns 200 status', 'User sees confirmation'],
      }))
      expect(breakdown.has_definition_of_done).toBe(true)
    })

    it('scores true when AC contains "at least"', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: ['At least 3 results are shown', 'Results are sorted'],
      }))
      expect(breakdown.has_definition_of_done).toBe(true)
    })

    it('scores false when ACs are vague', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        acceptanceCriteria: [
          'The page loads quickly',
          'Users can see the results',
        ],
      }))
      expect(breakdown.has_definition_of_done).toBe(false)
    })
  })

  describe('score totals', () => {
    it('returns 0 for a completely vague item', () => {
      const { score } = computeCompletenessScore(makeItem({
        title: 'Improve UX',
        problem: 'Things are not great.',
        acceptanceCriteria: ['The page is better'],
        tags: ['misc'],
        assumptions: undefined,
      }))
      expect(score).toBe(0)
    })

    it('returns partial scores correctly', () => {
      // has_constraints (+20) + no_vague_verbs (+20) = 40
      // has_definition_of_done is now 0 pts (merged into verification)
      // "Button is visible" matches testable_criteria but no verification steps
      const { score } = computeCompletenessScore(makeItem({
        title: 'Add export button',
        problem: 'Users are unhappy.',
        acceptanceCriteria: ['Button is visible'],
        tags: ['feature', 'ux'],
        assumptions: undefined,
      }))
      expect(score).toBe(40)
    })
  })
})

// DOG-002 regression: markdown section headers must be recognized by the scoring engine
// The OSS CLI emits specs with "### Verification" / "### Measurable Outcome" headers —
// previously these scored 60 instead of ~85 because the regex skipped "## " prefixes.
describe('DOG-002: markdown section headers in scoring', () => {
  it('scores has_verification_steps=true for "### Verification Steps" header', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a user clicks submit, then the form is saved',
        'When saved, then a success toast appears',
        '### Verification Steps\nRun `npm test` and confirm all 3 test cases pass',
      ],
    }))
    expect(breakdown.has_verification_steps).toBe(true)
  })

  it('scores has_verification_steps=true for "## Verification" header', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a user is authenticated, when they access /admin, then it renders',
        'The page returns HTTP 200',
        '## Verification\ncurl /admin and confirm 200 response',
      ],
    }))
    expect(breakdown.has_verification_steps).toBe(true)
  })

  it('scores has_measurable_outcome=true when problem has "### Measurable Outcome" header', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: '### Measurable Outcome\nReduce page load time by 40% on mobile',
    }))
    expect(breakdown.has_measurable_outcome).toBe(true)
  })

  it('still scores verification=false when no verification content at all', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a user clicks submit, then the form is saved',
        'When saved, then a success toast appears',
      ],
    }))
    expect(breakdown.has_verification_steps).toBe(false)
  })
})

describe('isAgentReady', () => {
  it('returns true for score >= 70', () => {
    expect(isAgentReady(70)).toBe(true)
    expect(isAgentReady(85)).toBe(true)
    expect(isAgentReady(100)).toBe(true)
  })

  it('returns false for score < 70', () => {
    expect(isAgentReady(0)).toBe(false)
    expect(isAgentReady(45)).toBe(false)
    expect(isAgentReady(69)).toBe(false)
  })
})
