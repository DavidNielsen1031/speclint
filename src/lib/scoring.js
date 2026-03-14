"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCompletenessScore = computeCompletenessScore;
exports.isAgentReady = isAgentReady;
exports.capScoreForSpeculativeInput = capScoreForSpeculativeInput;
var VAGUE_VERBS = ['improve', 'enhance', 'optimize', 'update', 'fix'];
// Match both imperative ACs ("Verify X") and declarative ACs ("X is visible", "X returns 200")
// LLMs often rewrite "Verify X does Y" → "X does Y" — we must catch both forms
var ACTION_VERB_RE = /^(given|when|then|user can|verify|confirm|ensure|check|assert|validate|the system|it should|should|must|display|show|return|redirect|allow|prevent|enable|disable|create|delete|update|send|receive|load|render|submit|click|navigate|log|track|provide|document|include|define|implement|configure|set up|add|remove|migrate|deploy|test|run|execute|list|specify|identify|review|approve|generate|export|import|integrate|schedule|notify|alert|measure|monitor|establish|prepare|attach|link|outline|map)/i;
var DECLARATIVE_AC_RE = /\b(is visible|is displayed|is enabled|is disabled|is present|is removed|is hidden|appears?\b|contains?\b|includes?\b|returns?\b|redirects?\b|loads?\b|renders?\b|shows?\b|displays?\b|supports?\b|accepts?\b|rejects?\b|blocks?\b|allows?\b|prevents?\b|triggers?\b|fires?\b|completes?\b|downloads?\b|uploads?\b|passes?\b|fails?\b|works?\b|functions?\b|remains?\b|stays?\b|persists?\b)\b/i;
var DOD_RE = /\d+|logged in|returns? \d+|visible|enabled|disabled|less than|within|at least|greater than|no more than|exactly|complete|success|fail|error|approved|rejected|active|inactive/i;
// Detect verification language — signals the author has thought about how to prove it works
// Handles both inline text and markdown section headers (e.g. "### Verification Steps")
var VERIFICATION_RE = /(?:(?:^|\n)(?:#{1,6}\s*)?(?:verification(?:\s*steps?)?|verify|confirm|test that|assert|expect|run .{0,40} and check|unit test|integration test|e2e test|end.to.end test|test passes|manually check|open the page and verify|curl .{0,60} returns|check that|proves?|validated|validates?)|\b(?:verify|confirm|test that|assert|expect|unit test|integration test|e2e test|end.to.end test|test passes|manually check|curl .{0,60} returns|check that|proves?|validated|validates?))\b/i;
// Detect measurable outcomes across all spec text (title, problem, ACs, assumptions)
// DOG-004: checks allText (not just problem) to catch measurable language in ACs and assumptions
// Handles both inline text and markdown section headers (e.g. "### Measurable Outcome")
var MEASURABLE_OUTCOME_RE = /(?:(?:^|\n)(?:#{1,6}\s*)?(?:measurable outcome|measure|goal|target|kpi|metric|measur|observ|track|monitor|reduc|increas|decreas|faster|slower|less|more|rate|count|number)|\b(?:measurable outcome|measure|goal|target|kpi|metric|measur|observ|track|monitor|reduc|increas|decreas|faster|slower|rate|count|number)|\d+|%)\b/i;
// Detect constraints/assumptions in the overall text (title, problem, ACs, assumptions)
var CONSTRAINTS_RE = /(?:^|\n|\b)(?:constraints|limitations|assumptions|rules|scope|out of scope)\b/i;
// DOG-003: Detect review/approval gate language — signals the spec includes a human checkpoint
var REVIEW_GATE_RE = /\b(review|approve[sd]?|approval|sign.?off|accepted by|reviewed by|qa pass|qa review|peer review|code review|pr review|pull request|demo|walkthrough|stakeholder sign|definition of done)\b/i;
// STRATEGIC-001: Detect WHY this feature matters to the business
var STRATEGIC_JUSTIFICATION_RE = /\b(business impact|business value|revenue|retention|churn|competitive|compliance|regulatory|user pain|pain point|cost reduction|cost saving|market|strategic|growth|conversion|profitability|risk reduction|legal requirement|sla|service level|nps drop|customer loss|losing customers|user frustration|productivity loss|operational cost|efficiency gain)\b/i;
// STRATEGIC-002: Detect evidence of demand — customer feedback, research, data
var EVIDENCE_OF_DEMAND_RE = /\b(users? reported|user report|customer feedback|support tickets?|support volume|research shows?|research indicates?|data indicates?|data shows?|usage data|analytics show|nps|user interviews?|user research|stakeholder request|requested by|sales request|helpdesk|ticket count|survey|focus group|a\/b test|usability test|beta feedback|early access feedback|\d+\s*(?:tickets?|complaints?|reports?|requests?|users?)\s*(?:reported|requested|complained|asked))\b/i;
// STRATEGIC-003: Detect concrete, quantifiable success metric (stricter than has_measurable_outcome)
var SUCCESS_METRIC_RE = /\b(?:\d+(?:\.\d+)?(?:\s*%|ms|s\b|seconds?|minutes?|hours?|days?|x\b)|\d+(?:k|m|b)?\s*(?:users?|requests?|rps|rpm|tps)|p(?:50|75|90|95|99)\b|(?:reduce|increase|decrease|improve|drop|grow|cut|lower|raise)\w*\s+(?:by\s+)?\d+|\d+\s*(?:times|x)\s*(?:faster|slower|more|less)|(?:from|down from|up from)\s+\d+\s*(?:to|down to|up to)\s*\d+|(?:less|more|under|below|above|within|at least|no more than)\s+\d+|conversion rate|adoption rate|error rate|bounce rate|response time|latency|throughput|uptime|availability)\b/i;
function computeCompletenessScore(item) {
    var _a;
    var missing = [];
    var ac = (_a = item.acceptanceCriteria) !== null && _a !== void 0 ? _a : [];
    // Combine all relevant text fields for comprehensive regex matching
    var allText = __spreadArray(__spreadArray(__spreadArray([
        item.title,
        item.problem
    ], ac, true), (item.assumptions || []).map(function (a) { return "Assumption: ".concat(a); }), true), (item.verificationSteps || []).map(function (v) { return "Verification: ".concat(v); }), true).join('\n'); // Use newline to preserve "start of line" context for regexes
    // has_measurable_outcome: spec contains measurable/observable outcome language (20 pts)
    // DOG-004: scan allText (problem + ACs + assumptions), not just item.problem
    var has_measurable_outcome = MEASURABLE_OUTCOME_RE.test(allText);
    // has_testable_criteria: at least 2 acceptance criteria starting with action verbs (25 pts)
    var testableCount = ac.filter(function (c) {
        var trimmed = c.trim();
        return ACTION_VERB_RE.test(trimmed) || DECLARATIVE_AC_RE.test(trimmed);
    }).length;
    var has_testable_criteria = testableCount >= 2;
    // has_constraints: tags >= 2 OR assumptions present and non-empty, OR constraints in content (20 pts)
    var has_constraints = (item.tags && item.tags.length >= 2) ||
        (Array.isArray(item.assumptions) && item.assumptions.length > 0) ||
        CONSTRAINTS_RE.test(allText); // New check for constraints within the overall text
    // no_vague_verbs: title does NOT contain vague verbs without specificity (20 pts)
    var titleWords = item.title.trim().split(/\s+/);
    var titleLower = item.title.toLowerCase();
    var hasVagueVerb = VAGUE_VERBS.some(function (v) { return titleLower.includes(v); });
    var no_vague_verbs;
    if (!hasVagueVerb) {
        no_vague_verbs = true;
    }
    else if (titleWords.length < 4) {
        // Short title with vague verb = not specific enough
        no_vague_verbs = false;
    }
    else {
        // Title is long enough — check if there's a specific noun beyond the vague verb
        // Remove vague verbs and see if something specific remains
        var withoutVague = VAGUE_VERBS.reduce(function (t, v) { return t.replace(new RegExp(v, 'gi'), '').trim(); }, titleLower);
        no_vague_verbs = withoutVague.replace(/\s+/g, '').length >= 4; // some specificity remains
    }
    // has_definition_of_done: at least 1 AC mentions specific state/value/threshold (0 pts — merged into verification)
    // Kept in breakdown for backward compatibility
    var has_definition_of_done = ac.some(function (c) { return DOD_RE.test(c); });
    // has_verification_steps: spec contains language showing HOW to verify it works (15 pts)
    var has_verification_steps = VERIFICATION_RE.test(allText);
    if (!has_verification_steps) {
        missing.push('No verification steps — how will you know this works?');
    }
    // DOG-003: has_review_gate — advisory check, no score impact
    // Signals whether the spec mentions a review, approval, or QA checkpoint
    var has_review_gate = REVIEW_GATE_RE.test(allText);
    // STRATEGIC-001: has_strategic_justification — advisory, 0 pts
    var has_strategic_justification = STRATEGIC_JUSTIFICATION_RE.test(allText);
    if (!has_strategic_justification) {
        missing.push('No strategic justification — why does this matter to the business? Add context about business impact, user pain, revenue, retention, or competitive pressure.');
    }
    // STRATEGIC-002: has_evidence_of_demand — advisory, 0 pts
    var has_evidence_of_demand = EVIDENCE_OF_DEMAND_RE.test(allText);
    if (!has_evidence_of_demand) {
        missing.push('No evidence of demand — cite customer feedback, support tickets, user research, or usage data that motivates this work.');
    }
    // STRATEGIC-003: has_success_metric — advisory, 0 pts
    var has_success_metric = SUCCESS_METRIC_RE.test(allText);
    if (!has_success_metric) {
        missing.push('No quantifiable success metric — add a concrete target with numbers (e.g. "reduce error rate by 30%", "response time < 200ms", "achieve 40% adoption within 30 days").');
    }
    var breakdown = {
        has_measurable_outcome: has_measurable_outcome,
        has_testable_criteria: has_testable_criteria,
        has_constraints: has_constraints,
        no_vague_verbs: no_vague_verbs,
        has_definition_of_done: has_definition_of_done,
        has_verification_steps: has_verification_steps,
        has_review_gate: has_review_gate,
        has_strategic_justification: has_strategic_justification,
        has_evidence_of_demand: has_evidence_of_demand,
        has_success_metric: has_success_metric,
    };
    // DOG-005: Complexity advisory — informational only, no score impact
    // Flag both XL specs (>2000 chars) and specs with many criteria (5+)
    var totalChars = allText.length;
    if (totalChars > 2000 && ac.length >= 5) {
        breakdown.complexity_note = "XL spec (".concat(totalChars, " chars, ").concat(ac.length, " criteria) \u2014 strongly consider decomposition");
    }
    else if (totalChars > 2000) {
        breakdown.complexity_note = "XL spec (".concat(totalChars, " chars) \u2014 consider decomposition into smaller stories");
    }
    else if (ac.length >= 5) {
        breakdown.complexity_note = "Complex spec (".concat(ac.length, " criteria) \u2014 consider decomposition");
    }
    var score = (has_measurable_outcome ? 20 : 0) +
        (has_testable_criteria ? 25 : 0) +
        (has_constraints ? 20 : 0) +
        (no_vague_verbs ? 20 : 0) +
        (has_definition_of_done ? 0 : 0) + // merged into verification; kept for backward compat
        (has_verification_steps ? 15 : 0);
    return { score: score, breakdown: breakdown, missing: missing };
}
function isAgentReady(score) {
    return score >= 70;
}
/**
 * Cap a completeness score when the input quality is speculative.
 * The output may be well-formatted but it's not a real refinement — cap at 60.
 */
function capScoreForSpeculativeInput(score, inputQuality) {
    if (inputQuality.isSpeculative) {
        return Math.min(score, 60);
    }
    return score;
}
