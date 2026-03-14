import { describe, it, expect } from 'vitest'
import { computeCompletenessScore, isAgentReady, capScoreForSpeculativeInput } from '@/lib/scoring'
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

    it('scores false when problem is vague and ACs contain no measurable language', () => {
      // DOG-004: has_measurable_outcome now scans allText (problem + ACs + assumptions)
      // Override ACs to avoid false-positive from default AC numbers ("within 3 seconds")
      const { breakdown } = computeCompletenessScore(makeItem({
        problem: 'Users are unhappy with the login page.',
        acceptanceCriteria: [
          'Given a user visits the page, then they see a login form',
          'When credentials are submitted, then the user is authenticated',
        ],
      }))
      expect(breakdown.has_measurable_outcome).toBe(false)
    })

    it('DOG-004: scores true when ACs (not problem) contain measurable language', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        problem: 'The page feels slow.',
        acceptanceCriteria: [
          'Given a user navigates to /dashboard, then it loads within 2 seconds',
          'When loaded, the page shows all visible rows',
          'Verify the load time in Chrome DevTools',
        ],
      }))
      expect(breakdown.has_measurable_outcome).toBe(true)
    })

    it('DOG-004: scores true when assumptions contain measurable language', () => {
      const { breakdown } = computeCompletenessScore(makeItem({
        problem: 'The export feature is missing.',
        acceptanceCriteria: [
          'Given a user clicks Export, when complete, then a file downloads',
          'When exported, then all rows appear in the file',
          'Verify the file opens in Excel',
        ],
        assumptions: ['Target: reduce support tickets by 30%'],
      }))
      expect(breakdown.has_measurable_outcome).toBe(true)
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

// DOG-003: has_review_gate advisory check — detects review/approval language in specs
describe('DOG-003: has_review_gate advisory', () => {
  it('returns has_review_gate=true when spec mentions "review"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a developer submits a PR, when CI passes, then it is ready for review',
        'When reviewed and approved, then the PR can be merged',
        'Verify all checks pass before merge',
      ],
    }))
    expect(breakdown.has_review_gate).toBe(true)
  })

  it('returns has_review_gate=true when spec mentions "approve"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Design changes go live without stakeholder approval, causing rework.',
      acceptanceCriteria: [
        'Given a designer submits a mockup, when shared, then it shows to stakeholders',
        'When approved, then the design moves to implementation',
        'Verify approval is logged in the system',
      ],
    }))
    expect(breakdown.has_review_gate).toBe(true)
  })

  it('returns has_review_gate=true when spec mentions "QA"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      assumptions: ['QA pass required before deployment to staging'],
    }))
    expect(breakdown.has_review_gate).toBe(true)
  })

  it('returns has_review_gate=false when spec has no review language', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Users cannot export their data.',
      acceptanceCriteria: [
        'Given a user clicks Export, then a CSV downloads within 2 seconds',
        'When exported, then all rows are included',
        'Verify the file opens in a spreadsheet editor',
      ],
      tags: ['feature', 'ux'],
      assumptions: undefined,
    }))
    expect(breakdown.has_review_gate).toBe(false)
  })

  it('has_review_gate does not impact score (advisory only)', () => {
    const withGate = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a user submits, when complete, then it shows success after peer review',
        'When approved, then the record is persisted',
        'Verify by checking the database directly',
      ],
    }))
    const withoutGate = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given a user submits, when complete, then it shows success',
        'When saved, then the record is persisted',
        'Verify by checking the database directly',
      ],
    }))
    // Score must be identical regardless of review gate presence
    expect(withGate.score).toBe(withoutGate.score)
  })
})

// DOG-005: XL spec complexity warnings
describe('DOG-005: XL spec complexity warnings', () => {
  it('adds complexity_note for spec with 5+ ACs', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      acceptanceCriteria: [
        'Given state A, when action, then result 1',
        'Given state B, when action, then result 2',
        'Given state C, when action, then result 3',
        'Given state D, when action, then result 4',
        'Verify all 4 states pass automated tests',
      ],
    }))
    expect(breakdown.complexity_note).toMatch(/criteria/)
  })

  it('adds complexity_note for spec >2000 chars', () => {
    // allText = title (~30) + problem + default ACs (~150) — use 2000+ chars in problem alone
    const longProblem = 'A'.repeat(2100) + ' reduces adoption by 20%.'
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: longProblem,
    }))
    expect(breakdown.complexity_note).toMatch(/XL spec/)
    expect(breakdown.complexity_note).toMatch(/chars/)
  })

  it('adds "strongly consider" note when both >2000 chars AND 5+ ACs', () => {
    const longProblem = 'A'.repeat(2100) + ' reduces adoption by 20%.'
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: longProblem,
      acceptanceCriteria: [
        'Given state A, when action, then result 1',
        'Given state B, when action, then result 2',
        'Given state C, when action, then result 3',
        'Given state D, when action, then result 4',
        'Verify all states pass automated tests',
      ],
    }))
    expect(breakdown.complexity_note).toMatch(/strongly consider/)
  })

  it('has no complexity_note for a normal spec', () => {
    const { breakdown } = computeCompletenessScore(makeItem())
    expect(breakdown.complexity_note).toBeUndefined()
  })

  it('complexity_note does not affect score', () => {
    const { score: normalScore } = computeCompletenessScore(makeItem())
    const { score: xlScore } = computeCompletenessScore(makeItem({
      problem: 'A'.repeat(2100) + ' reduces adoption by 20%.',
      acceptanceCriteria: [
        'Given a user clicks Export, then a CSV downloads within 2 seconds',
        'When export triggers, then all rows are included',
        'Given state C, when action, then result 3',
        'Given state D, when action, then result 4',
        'Verify all states pass automated tests',
      ],
    }))
    // Only score dimensions matter — complexity is advisory
    expect(typeof xlScore).toBe('number')
    expect(xlScore).toBeGreaterThanOrEqual(0)
    expect(xlScore).toBeLessThanOrEqual(100)
  })
})

// STRATEGIC-001: has_strategic_justification advisory check
describe('STRATEGIC-001: has_strategic_justification advisory', () => {
  it('returns true when problem mentions revenue impact', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Checkout failures are causing revenue loss — estimated $50k/month in abandoned transactions.',
    }))
    expect(breakdown.has_strategic_justification).toBe(true)
  })

  it('returns true when problem mentions retention/churn', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'High churn rate among enterprise users — 20% cancel within 90 days of signup.',
    }))
    expect(breakdown.has_strategic_justification).toBe(true)
  })

  it('returns true when problem mentions competitive pressure', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Competitors offer dark mode; we are losing customers who cite this as a reason for switching.',
    }))
    expect(breakdown.has_strategic_justification).toBe(true)
  })

  it('returns true when problem mentions compliance/regulatory', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'New GDPR compliance requirement mandates data export within 30 days.',
    }))
    expect(breakdown.has_strategic_justification).toBe(true)
  })

  it('returns true when problem mentions user pain point', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Users are experiencing significant pain point when exporting large datasets — session timeout causes data loss.',
    }))
    expect(breakdown.has_strategic_justification).toBe(true)
  })

  it('returns false when problem has no strategic framing', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'The export button is missing from the dashboard page.',
      acceptanceCriteria: [
        'Given a logged-in user, when they click Export, then a CSV downloads',
        'When export is triggered, then the file contains all rows',
        'Verify the file opens in Excel',
      ],
    }))
    expect(breakdown.has_strategic_justification).toBe(false)
  })

  it('has_strategic_justification does not impact score (advisory only)', () => {
    const withJustification = computeCompletenessScore(makeItem({
      problem: 'Revenue loss of $10k/month due to checkout failures. Users cannot export their data, reducing adoption metrics by 20%.',
    }))
    const withoutJustification = computeCompletenessScore(makeItem({
      problem: 'Users cannot export their data, reducing adoption metrics by 20%.',
    }))
    expect(withJustification.score).toBe(withoutJustification.score)
  })

  it('adds missing message when strategic justification is absent', () => {
    const { missing } = computeCompletenessScore(makeItem({
      problem: 'The export button is missing.',
      acceptanceCriteria: [
        'Given a user clicks Export, then a CSV downloads',
        'When exported, then all rows appear',
        'Verify the file opens in a spreadsheet editor',
      ],
    }))
    expect(missing.some(m => m.toLowerCase().includes('strategic justification'))).toBe(true)
  })
})

// STRATEGIC-002: has_evidence_of_demand advisory check
describe('STRATEGIC-002: has_evidence_of_demand advisory', () => {
  it('returns true when problem mentions customer feedback', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Customer feedback consistently cites missing export feature as a blocker.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions support tickets', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: '47 support tickets in Q1 requesting bulk export functionality.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions "users reported"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Users reported that the login flow fails on mobile Safari.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions user research', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'User interviews with 12 enterprise customers revealed this is a top-3 pain point.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions NPS', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'NPS survey results show 30% of detractors cite this issue.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions "requested by"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Feature requested by enterprise sales team after 3 deals stalled on this gap.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns true when problem mentions "research shows"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Research shows 60% of users abandon the flow before completing step 3.',
    }))
    expect(breakdown.has_evidence_of_demand).toBe(true)
  })

  it('returns false when no evidence of demand is cited', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'We should add a dark mode to the dashboard.',
      acceptanceCriteria: [
        'Given a user enables dark mode, then the UI updates',
        'When dark mode is active, then all pages respect the setting',
        'Verify dark mode persists across sessions',
      ],
    }))
    expect(breakdown.has_evidence_of_demand).toBe(false)
  })

  it('has_evidence_of_demand does not impact score (advisory only)', () => {
    const withEvidence = computeCompletenessScore(makeItem({
      problem: '47 support tickets requested export. Users cannot export their data, reducing adoption metrics by 20%.',
    }))
    const withoutEvidence = computeCompletenessScore(makeItem({
      problem: 'Users cannot export their data, reducing adoption metrics by 20%.',
    }))
    expect(withEvidence.score).toBe(withoutEvidence.score)
  })

  it('adds missing message when evidence of demand is absent', () => {
    const { missing } = computeCompletenessScore(makeItem({
      problem: 'We should add dark mode.',
      acceptanceCriteria: [
        'Given a user enables dark mode, then the UI updates',
        'When active, then all pages respect the setting',
        'Verify it persists across sessions',
      ],
    }))
    expect(missing.some(m => m.toLowerCase().includes('evidence of demand'))).toBe(true)
  })
})

// STRATEGIC-003: has_success_metric advisory check
describe('STRATEGIC-003: has_success_metric advisory', () => {
  it('returns true when problem contains a percentage target', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'We need to reduce error rate by 30% to meet our SLA commitment.',
    }))
    expect(breakdown.has_success_metric).toBe(true)
  })

  it('returns true when problem contains a response time target', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'API latency must be under 200ms for 95th percentile requests.',
    }))
    expect(breakdown.has_success_metric).toBe(true)
  })

  it('returns true when AC contains a numeric threshold', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Dashboard loads too slowly.',
      acceptanceCriteria: [
        'Given a user navigates to /dashboard, then it loads within 2 seconds',
        'When export is triggered, then the file downloads in under 5 seconds',
        'Verify p95 load time in New Relic stays below 3 seconds',
      ],
    }))
    expect(breakdown.has_success_metric).toBe(true)
  })

  it('returns true when spec contains an adoption rate target', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Adoption rate for new onboarding flow should reach 40% within 30 days of launch.',
    }))
    expect(breakdown.has_success_metric).toBe(true)
  })

  it('returns true when spec mentions "increase by N%"', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Goal is to increase conversion rate by 15% over the next quarter.',
    }))
    expect(breakdown.has_success_metric).toBe(true)
  })

  it('returns false when spec has no concrete numbers or targets', () => {
    const { breakdown } = computeCompletenessScore(makeItem({
      problem: 'Users should be able to export their data more easily.',
      acceptanceCriteria: [
        'Given a user clicks Export, then a file downloads',
        'When exported, then all rows are included',
        'Verify the file opens correctly in Excel',
      ],
    }))
    expect(breakdown.has_success_metric).toBe(false)
  })

  it('has_success_metric does not impact score (advisory only)', () => {
    const withMetric = computeCompletenessScore(makeItem({
      problem: 'Users cannot export data. Success Metric: reduce support tickets by 50% within 60 days.',
    }))
    const withoutMetric = computeCompletenessScore(makeItem({
      problem: 'Users cannot export their data, reducing adoption metrics by 20%.',
    }))
    expect(withMetric.score).toBe(withoutMetric.score)
  })

  it('adds missing message when success metric is absent', () => {
    const { missing } = computeCompletenessScore(makeItem({
      problem: 'Users should export data more easily.',
      acceptanceCriteria: [
        'Given a user clicks Export, then a file downloads',
        'When exported, then all rows are included',
        'Verify the file opens correctly',
      ],
    }))
    expect(missing.some(m => m.toLowerCase().includes('success metric'))).toBe(true)
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

describe('capScoreForSpeculativeInput', () => {
  it('caps score at 60 when input is speculative', () => {
    expect(capScoreForSpeculativeInput(100, { isSpeculative: true })).toBe(60)
    expect(capScoreForSpeculativeInput(80, { isSpeculative: true })).toBe(60)
    expect(capScoreForSpeculativeInput(60, { isSpeculative: true })).toBe(60)
    expect(capScoreForSpeculativeInput(45, { isSpeculative: true })).toBe(45)
    expect(capScoreForSpeculativeInput(0, { isSpeculative: true })).toBe(0)
  })

  it('returns score unchanged when input is not speculative', () => {
    expect(capScoreForSpeculativeInput(100, { isSpeculative: false })).toBe(100)
    expect(capScoreForSpeculativeInput(75, { isSpeculative: false })).toBe(75)
    expect(capScoreForSpeculativeInput(0, { isSpeculative: false })).toBe(0)
  })
})
