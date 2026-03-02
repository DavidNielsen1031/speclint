import type { RefinedItem } from '@/lib/schemas'

const VAGUE_VERBS = ['improve', 'enhance', 'optimize', 'update', 'fix']

// Match both imperative ACs ("Verify X") and declarative ACs ("X is visible", "X returns 200")
// LLMs often rewrite "Verify X does Y" → "X does Y" — we must catch both forms
const ACTION_VERB_RE = /^(given|when|then|user can|verify|confirm|ensure|check|assert|validate|the system|it should|should|must|display|show|return|redirect|allow|prevent|enable|disable|create|delete|update|send|receive|load|render|submit|click|navigate|log|track)/i
const DECLARATIVE_AC_RE = /\b(is visible|is displayed|is enabled|is disabled|is present|is removed|is hidden|appears?\b|contains?\b|includes?\b|returns?\b|redirects?\b|loads?\b|renders?\b|shows?\b|displays?\b|supports?\b|accepts?\b|rejects?\b|blocks?\b|allows?\b|prevents?\b|triggers?\b|fires?\b|completes?\b|downloads?\b|uploads?\b|passes?\b|fails?\b|works?\b|functions?\b|remains?\b|stays?\b|persists?\b)\b/i

const DOD_RE = /\d+|logged in|returns? \d+|visible|enabled|disabled|less than|within|at least|greater than|no more than|exactly|complete|success|fail|error|approved|rejected|active|inactive/i

// Detect verification language — signals the author has thought about how to prove it works
const VERIFICATION_RE = /\b(verify|confirm|test that|assert|expect|run .{0,40} and check|unit test|integration test|e2e test|end.to.end test|test passes|manually check|open the page and verify|curl .{0,60} returns|check that|proves?|validated|validates?)\b/i

export function computeCompletenessScore(item: RefinedItem): {
  score: number
  breakdown: Record<string, boolean | string>
  missing: string[]
} {
  const missing: string[] = []

  // has_measurable_outcome: problem field contains measurable/observable outcome (20 pts)
  const measurableRe = /\d+|measur|observ|track|monitor|reduc|increas|decreas|faster|slower|less|more|%|rate|time|count|number|metric|kpi/i
  const has_measurable_outcome = measurableRe.test(item.problem)

  // has_testable_criteria: at least 2 acceptance criteria starting with action verbs (25 pts)
  const ac = item.acceptanceCriteria ?? []
  const testableCount = ac.filter(c => {
    const trimmed = c.trim()
    return ACTION_VERB_RE.test(trimmed) || DECLARATIVE_AC_RE.test(trimmed)
  }).length
  const has_testable_criteria = testableCount >= 2

  // has_constraints: tags >= 2 OR assumptions present and non-empty (20 pts)
  const has_constraints = (item.tags && item.tags.length >= 2) ||
    (Array.isArray(item.assumptions) && item.assumptions.length > 0)

  // no_vague_verbs: title does NOT contain vague verbs without specificity (20 pts)
  const titleWords = item.title.trim().split(/\s+/)
  const titleLower = item.title.toLowerCase()
  const hasVagueVerb = VAGUE_VERBS.some(v => titleLower.includes(v))
  let no_vague_verbs: boolean
  if (!hasVagueVerb) {
    no_vague_verbs = true
  } else if (titleWords.length < 4) {
    // Short title with vague verb = not specific enough
    no_vague_verbs = false
  } else {
    // Title is long enough — check if there's a specific noun beyond the vague verb
    // Remove vague verbs and see if something specific remains
    const withoutVague = VAGUE_VERBS.reduce((t, v) => t.replace(new RegExp(v, 'gi'), '').trim(), titleLower)
    no_vague_verbs = withoutVague.replace(/\s+/g, '').length >= 4 // some specificity remains
  }

  // has_definition_of_done: at least 1 AC mentions specific state/value/threshold (0 pts — merged into verification)
  // Kept in breakdown for backward compatibility
  const has_definition_of_done = ac.some(c => DOD_RE.test(c))

  // has_verification_steps: spec contains language showing HOW to verify it works (15 pts)
  // Search across problem, ACs, and title for verification intent
  const allText = [item.title, item.problem, ...ac].join(' ')
  const has_verification_steps = VERIFICATION_RE.test(allText)
  if (!has_verification_steps) {
    missing.push('No verification steps — how will you know this works?')
  }

  const breakdown: Record<string, boolean | string> = {
    has_measurable_outcome,
    has_testable_criteria,
    has_constraints,
    no_vague_verbs,
    has_definition_of_done,
    has_verification_steps,
  }

  // Complexity advisory — informational only, no score impact
  if (ac.length >= 5) {
    breakdown.complexity_note = `Complex spec (${ac.length} criteria) — consider decomposition`
  }

  const score =
    (has_measurable_outcome ? 20 : 0) +
    (has_testable_criteria ? 25 : 0) +
    (has_constraints ? 20 : 0) +
    (no_vague_verbs ? 20 : 0) +
    (has_definition_of_done ? 0 : 0) +   // merged into verification; kept for backward compat
    (has_verification_steps ? 15 : 0)

  return { score, breakdown, missing }
}

export function isAgentReady(score: number): boolean {
  return score >= 70
}
