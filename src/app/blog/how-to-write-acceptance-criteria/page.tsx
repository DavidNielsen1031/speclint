import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "How to Write Acceptance Criteria That Actually Work",
  description: "Learn to write acceptance criteria that prevent sprint rework. Master Given/When/Then, testability, and avoid 7 common mistakes.",
  keywords: ["how to write acceptance criteria","acceptance criteria examples","acceptance criteria testing","Given When Then format"],
  alternates: {
    canonical: "https://refinebacklog.com/blog/how-to-write-acceptance-criteria",
  },
}

const articleSchema = {"@context":"https://schema.org","@type":"Article","headline":"How to Write Acceptance Criteria That Actually Work","description":"Learn to write acceptance criteria that prevent sprint rework. Master Given/When/Then, testability, and avoid 7 common mistakes.","author":{"@type":"Organization","name":"Perpetual Agility LLC"},"publisher":{"@type":"Organization","name":"Perpetual Agility LLC","url":"https://refinebacklog.com"},"datePublished":"2026-02-20","dateModified":"2026-02-20","mainEntityOfPage":"https://refinebacklog.com/blog/how-to-write-acceptance-criteria","image":"https://refinebacklog.com/og-image.png"}

const breadcrumbSchema = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://refinebacklog.com"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://refinebacklog.com/blog"},{"@type":"ListItem","position":3,"name":"How to Write Acceptance Criteria That Actually Work","item":"https://refinebacklog.com/blog/how-to-write-acceptance-criteria"}]}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What makes acceptance criteria testable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Testable acceptance criteria have three properties: they describe observable behavior (not implementation details), they use measurable outcomes instead of subjective adjectives, and they can be verified independently by two people with identical results. 'The login form should be fast' fails all three. 'The login form should submit within 2 seconds on a 3G connection' passes all three. The rule of thumb: replace words like fast, intuitive, reliable, and smooth with specific numbers, thresholds, or explicit pass/fail conditions."
      }
    },
    {
      "@type": "Question",
      "name": "When should you use Given/When/Then vs. checklist-style acceptance criteria?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use Given/When/Then for complex multi-step workflows and behavior-driven features where the user interaction sequence matters — for example, 'Given a user is logged in, When they click Forgot Password, Then they receive a reset email within 2 minutes.' Use checklist style for features with discrete, independent requirements that can be tested in parallel — for example, a file upload feature might list: max 5MB, supports JPG/PNG/WebP, old file deleted from CDN. Neither is universally better; match the pattern to the complexity of the work."
      }
    },
    {
      "@type": "Question",
      "name": "What are the most common acceptance criteria mistakes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The 7 most common mistakes: (1) criteria that are too vague ('load quickly'); (2) criteria that are too prescriptive ('use React hooks'); (3) describing the feature instead of the behavior; (4) missing acceptance thresholds ('reduce latency' — by how much?); (5) hidden dependencies on incomplete stories; (6) criteria that require full-system manual verification; and (7) conflating acceptance with estimation ('complete in 3 days' is not a criterion). Each mistake creates a gap that leads to rework."
      }
    },
    {
      "@type": "Question",
      "name": "How much do poor acceptance criteria cost a development team?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A 2-day story with unclear acceptance criteria that gets reworked becomes a 5-day story — 3 extra days of engineering capacity per story. With 10 stories per sprint and a 30% rework rate due to unclear criteria, teams lose 9 days of capacity per sprint. Annualized across 26 sprints, that's 450+ lost engineering days — nearly two full engineers' worth of output — all from skipping 15 minutes of quality criteria work per story."
      }
    },
    {
      "@type": "Question",
      "name": "How does Refine Backlog help write better acceptance criteria?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Refine Backlog's AI applies consistent testability standards across every backlog item automatically — flagging vague language, suggesting Given/When/Then breakdowns for complex behaviors, and ensuring each criterion is independent and measurable. Instead of debating during refinement sessions whether criteria are 'testable enough,' teams review AI-generated structured criteria and refine the edge cases. The result is consistent quality across the entire backlog without the manual overhead."
      }
    }
  ]
};

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <article className="mx-auto max-w-3xl px-6 lg:px-8 py-24">
        <Link href="/blog" className="text-emerald-400 hover:underline text-sm mb-8 inline-block">
          ← Back to Blog
        </Link>

        <header className="mb-12">
          <p className="text-sm text-muted-foreground mb-4">February 20, 2026 · 7 min read</p>
          <h1 className="text-4xl font-bold font-space-grotesk mb-6 leading-tight">
            How to Write Acceptance Criteria That Actually Work
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Stop shipping half-built features: master the acceptance criteria patterns that reduce rework by 40% and align teams on what "done" actually means.
          </p>
        </header>

        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-12">
          <p className="text-sm font-semibold text-emerald-400 mb-2">Key Takeaway</p>
          <p className="text-muted-foreground">
            Bad acceptance criteria are the #1 source of sprint rework. They're either too vague ("make it faster"), too prescriptive ("use React hooks"), or untestable. This guide covers the two proven patterns—Given/When/Then and checklist style—plus the exact checklist to catch mistakes before code review.
          </p>
        </div>

        <div className="prose prose-invert prose-emerald max-w-none space-y-6">

          <h2 className="text-2xl font-semibold mt-12 mb-4">Why Do Teams Struggle to Write Acceptance Criteria?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Most teams write criteria that sound reasonable but fail to answer developer questions, turning 2-day stories into 5-day rework cycles every sprint.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Here's what we see constantly: a product manager writes acceptance criteria that sound reasonable in isolation, but when developers start building, they realize the criteria don't actually answer the questions they need answered. Is the feature complete if it works on desktop but not mobile? What happens when the API times out? Does "intuitive UX" mean following Material Design or the company's design system?
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The result? Developers guess, build it one way, get feedback, and rework it. A two-day story becomes a five-day story. Your sprint velocity tanks. Your team gets frustrated.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The root cause isn't laziness or incompetence—it's that most teams have never learned the patterns that make criteria testable, specific, and actually useful. They're writing criteria the way they'd write an email, not the way they'd write a test.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">What Makes Acceptance Criteria Actually Testable?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Testable criteria describe observable behavior, use measurable outcomes instead of subjective adjectives, and can be verified by two people independently with identical results.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Testable acceptance criteria share three non-negotiable properties: they describe observable behavior (not implementation), they're specific enough that two people would test them the same way, and they can be verified without ambiguity.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Let's compare. "The login form should be fast" fails all three tests. Fast to whom? On what connection? Measured how? Now try: "The login form should submit within 2 seconds on a 3G connection." That's testable. You can measure it. You can automate it. You know when you're done.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The magic is moving from subjective adjectives (fast, intuitive, reliable) to measurable outcomes (2 seconds, 95th percentile latency, 3 retries). If your acceptance criteria contain words like "should be", "nice to have", "easy", or "smooth", you've probably missed the mark. Those are nice-to-haves for the retrospective, not criteria for done.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">Should You Use Given/When/Then or Checklist Style?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Use Given/When/Then for complex multi-step workflows; use checklist style for features with discrete requirements where parallel testing by team members is easier.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            There are two dominant patterns for writing acceptance criteria, and each works best in different contexts. Neither is universally superior—it's about matching the pattern to the work.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Given/When/Then (also called Gherkin syntax) structures criteria as scenarios: Given [precondition], When [user action], Then [expected result]. This pattern shines for behavior-driven features where the interaction matters more than the outcome. It's also great for complex workflows with multiple paths.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Example (Given/When/Then):</strong> Given a user is logged in, When they click "Forgot Password", Then they receive an email with a reset link within 2 minutes.</li>
            <li><strong className="text-foreground">Checklist style</strong> is simpler and works better for features with discrete requirements. Instead of scenarios, you list what must be true: "Payment form accepts Visa, Mastercard, and Amex", "Confirmation email sends within 30 seconds", "User can update payment method without re-entering CVV". Checklist criteria are easier to scan, easier to parallelize across team members, and less likely to become overly prescriptive.</li>
            <li><strong className="text-foreground">Example (Checklist):</strong> User can update their profile photo. New photo appears within 5 seconds. Old photo is deleted from CDN. File size is validated (max 5MB). Supported formats: JPG, PNG, WebP.</li>
          </ul>


          <h2 className="text-2xl font-semibold mt-12 mb-4">What Are the 7 Most Common Acceptance Criteria Mistakes?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            The 7 acceptance criteria mistakes teams repeat: vague language, over-prescription, feature descriptions instead of behavior, no thresholds, hidden dependencies, untestable isolation, and estimation conflation.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We've reviewed thousands of backlog items, and the same mistakes appear again and again. Knowing them is half the battle.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            First: criteria that are too vague. "The dashboard should load quickly" doesn't tell anyone when they're done. Second: criteria that are too prescriptive. "Use React hooks for state management" isn't a criterion—it's a technical decision that belongs in the description, not the acceptance criteria. You're defining what needs to happen, not how.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Third: criteria that describe the feature instead of the behavior. "A notification system" is not a criterion. "Users receive an email notification when someone comments on their post within 1 minute" is. Fourth: criteria with no acceptance threshold. "Reduce API latency" by how much? 5%? 50%? "Improve test coverage" to what percentage?
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Fifth: criteria that depend on other incomplete stories. "Once the payment API is ready..." creates hidden blockers. Write criteria that stand alone. Sixth: criteria that are impossible to test without the full system. If your criteria require a production environment or manual verification every time, they're not testable—they're aspirational.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Seventh: criteria that conflate acceptance with estimation. "Complete in 3 days" is not a criterion. Neither is "Research React libraries." Those belong in the story description or as subtasks, not as criteria for done.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">How Do You Know When Acceptance Criteria Are Ready for Sprint?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Criteria are ready when a QA engineer can test each one without clarification questions, and every criterion has a clear, unambiguous pass-or-fail result.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Before a story hits the sprint board, run it through this checklist. It takes 90 seconds and prevents hours of rework.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            First, read each criterion aloud. If you stumble or feel the need to add explanation, it's not clear enough. Second, ask: "Could a QA engineer test this without asking me questions?" If the answer is no, it needs more specificity. Third, check: does this criterion describe behavior or implementation? If you see "use", "build", "create", or "implement", you've slipped into implementation details.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Fourth, verify that each criterion is independent. You shouldn't need to complete criterion #2 before testing criterion #1. Fifth, make sure there's a clear pass/fail. If you can't imagine a test result that definitively passes or fails the criterion, it's not ready. Sixth, confirm that all criteria together define "done". If you shipped a story that met all criteria but the feature still felt incomplete, your criteria were incomplete.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Finally, ask your team. The developers who'll build it and the QA who'll test it should be able to read the criteria and nod. If anyone looks confused, workshop it together before the sprint starts.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">How Does AI-Powered Backlog Refinement Help?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            AI-powered refinement tools apply consistent testability standards across every item, automatically flagging vague language and suggesting Given/When/Then breakdowns before sprint planning.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Writing good acceptance criteria is a skill, but it's also repetitive. You're applying the same patterns, asking the same questions, and catching the same mistakes over and over. That's where structured tools help.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <Link href="/" className="text-emerald-400 hover:underline">Refine Backlog</Link>'s AI-powered backlog refinement API transforms messy backlog items into structured, actionable work items with properly formatted acceptance criteria, estimates, priorities, and tags. Instead of spending refinement sessions debating whether criteria are testable enough, the API helps surface the patterns automatically—suggesting Given/When/Then breakdowns for complex behaviors, flagging vague language, and ensuring each criterion is independent and measurable.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The real win is consistency. When your backlog is refined with the same standards applied across every item, developers spend less time guessing and more time building. Rework drops. Velocity stabilizes. Teams actually enjoy sprint planning because the work is clear.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">What's the Difference Between Good and Bad Acceptance Criteria in Practice?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Bad criteria are subjective and vague; good criteria specify exact behaviors, measurable thresholds, and edge cases so developers know precisely when they're done.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Let's make this concrete with a real example: a feature to add a "save for later" button to product listings.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Bad criteria: "Users can save products. Saved products appear in their profile. The feature should be fast and intuitive." This fails on multiple counts. It's vague (what does "appear" mean—instantly? in a list? sorted how?). It's subjective (fast and intuitive to whom?). It doesn't specify the interaction (click where? does it show confirmation?). It doesn't cover edge cases (what if they save the same product twice? what if they're not logged in?).
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Good criteria: "User clicks heart icon on product card. Product is added to 'Saved' list within 1 second. Heart icon changes to filled state. User can navigate to 'Saved' section in their profile to view all saved products, sorted by most recently saved. Attempting to save a product already in 'Saved' shows a toast notification: 'Already saved.' Unauthenticated users see a login modal when clicking the heart icon." Each criterion is testable, specific, and covers the actual user interaction.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The difference isn't length—it's precision. Good criteria make the feature obvious. Bad criteria leave room for interpretation, which is where rework lives.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">How Should Your Team Approach Acceptance Criteria in Refinement?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Co-create criteria in refinement: product defines the happy path, engineering challenges it with edge cases, and QA confirms each criterion can be tested independently.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Acceptance criteria aren't something the product manager writes and throws over the wall. They're a conversation between product, engineering, and QA. Here's how to structure it:
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Start with the user story itself. What problem are we solving? Who's the user? What's the outcome they need? Then, product describes the happy path: the main scenario where everything works. Engineering challenges it: what about edge cases? What about error states? QA asks: how do we know this is done? What do we test?
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This conversation often surfaces missing criteria. Maybe you thought the feature was simple, but engineering points out that it needs to handle offline scenarios. Maybe QA realizes you need criteria for different user roles. This is the refinement working as intended—catching gaps before the sprint starts.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If your team is distributed or async, document the criteria in a shared space and use comments to debate specifics. The goal is alignment, not perfection. If criteria are 80% clear and the team agrees on what they mean, you're good to go. You can refine further during the sprint if needed, but the big ambiguities should be resolved in refinement.
          </p>


          <h2 className="text-2xl font-semibold mt-12 mb-4">What's the Cost of Skipping Good Acceptance Criteria?</h2>
          <p className="text-base font-medium text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r">
            Poor acceptance criteria turn 2-day stories into 5-day stories—with 30% rework rate across 10 sprint stories, teams lose 450+ engineering days per year.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If you're tempted to rush acceptance criteria or skip refinement, consider the math. A two-day story that gets reworked becomes a five-day story. That's three extra days of engineering capacity per story. If you have 10 stories per sprint and 30% of them get reworked due to unclear criteria, you're losing 9 days of capacity per sprint. Over a year, that's 450+ lost days—nearly two full engineers.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Beyond capacity, unclear criteria erode team morale. Developers get frustrated building features twice. QA gets frustrated testing incomplete work. Product gets frustrated explaining what they meant. Everyone's slower, everyone's grumpier, and the culture shifts toward blame instead of collaboration.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Good acceptance criteria cost almost nothing upfront—maybe 15 minutes per story in refinement. The payoff is enormous: fewer surprises, faster delivery, happier teams. It's one of the highest-ROI practices in product development, and yet it's one of the most neglected.
          </p>

        </div>

        <div className="mt-16 p-8 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
          <h3 className="text-xl font-semibold mb-3">Start refining smarter</h3>
          <p className="text-muted-foreground mb-6">Let AI handle the structure. You handle the strategy.</p>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
            <Link href="/#refiner">
              Try Refine Backlog Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </article>
    </main>
  )
}
