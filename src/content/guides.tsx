import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Editorial guides. Every statement of rule is drawn from the cited official
 * source; school-specific examples link to the school's profile where the
 * underlying policy is cited in full.
 */
export interface Guide {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sources: { title: string; url: string }[];
  body: ReactNode;
}

const ADMISSIONS_CODE = { title: "School Admissions Code (Department for Education)", url: "https://www.gov.uk/government/publications/school-admissions-code--2" };
const APPEALS_CODE = { title: "School Admission Appeals Code (Department for Education)", url: "https://www.gov.uk/government/publications/school-admissions-appeals-code" };
const GOVUK_ADMISSIONS = { title: "School admissions — GOV.UK", url: "https://www.gov.uk/schools-admissions" };

export const ADMISSIONS_GUIDES: Guide[] = [
  {
    slug: "qualifying-is-not-an-offer",
    title: "Qualifying for a grammar school is not the same as getting a place",
    description: "Why passing the 11+ makes a child eligible to be considered, how oversubscription criteria decide who is offered a place, and what that means for your choices.",
    updated: "2026-10-24",
    sources: [GOVUK_ADMISSIONS, ADMISSIONS_CODE],
    body: (
      <>
        <p>
          <strong>Short answer:</strong> meeting a grammar school&apos;s qualifying standard makes your child eligible to be <em>considered</em>. It does not guarantee a place. When more qualified children apply than there are places, the school&apos;s published
          oversubscription criteria decide the order in which places are offered.
        </p>
        <h2>The three steps</h2>
        <ol>
          <li>
            <strong>Meet the test standard.</strong> Each school or area sets the standard — often a minimum standardised score in its own entrance test. Some schools also allow a review of results.
          </li>
          <li>
            <strong>Rank under the admission criteria.</strong> If the school is oversubscribed with qualified applicants, they are ranked using criteria such as looked after status, Pupil Premium, siblings, catchment and distance, in a published order.
          </li>
          <li>
            <strong>Receive an offer.</strong> Your home council sends offers on national offer day (1 March for secondary schools in England, or the next working day). Offers go down the ranked list until the published admission number is reached.
          </li>
        </ol>
        <h2>Why it matters for your application</h2>
        <p>
          In England you name schools in order of preference on your home council&apos;s form by 31 October. Because a qualifying score is not a guarantee, it is sensible to include at least one school where your child is very likely to be offered a place — for
          example, your catchment or nearest non-selective school. Listing only one school does not increase your chances there.
        </p>
        <h2>Some schools rank by score instead</h2>
        <p>
          Not every grammar school uses a pass mark followed by other criteria. Some rank all applicants by their test score and offer places to the highest-scoring children first, sometimes after higher-priority groups. The rules are in each school&apos;s
          determined arrangements, which we summarise on each profile for the specific entry year.
        </p>
        <p>
          Example (cited in full on the profile): <Link href="/schools/aylesbury-grammar-school/admissions">Aylesbury Grammar School&apos;s 2027 policy</Link> uses a qualifying score of 121 in the Buckinghamshire Secondary Transfer Test, then ten ordered criteria, with
          distance as the tie-break within each.
        </p>
      </>
    ),
  },
  {
    slug: "out-of-catchment",
    title: "Applying to a grammar school outside your area or county",
    description: "You can apply to grammar schools in other council areas. How catchment areas, distance and out-of-area priority work, and how to judge whether a place is realistic.",
    updated: "2026-10-24",
    sources: [GOVUK_ADMISSIONS, ADMISSIONS_CODE],
    body: (
      <>
        <p>
          <strong>Short answer:</strong> yes, you can apply. In England you always apply through your <em>home</em> council, and you can name schools in other council areas on the same form. Whether a place is realistic depends on that school&apos;s criteria.
        </p>
        <h2>Three ways schools use where you live</h2>
        <ul>
          <li>
            <strong>A defined catchment area.</strong> Children living inside a mapped area get higher priority. Children outside can usually still be offered a place, but only after the higher-priority groups.
          </li>
          <li>
            <strong>Distance only.</strong> There is no fixed area; applicants within a criterion are ranked by how far they live from the school, measured by the school&apos;s stated method.
          </li>
          <li>
            <strong>No residence priority.</strong> Some schools rank qualified applicants by score or other criteria without regard to where they live.
          </li>
        </ul>
        <h2>Evidence that out-of-area offers happen</h2>
        <p>
          DfE&apos;s applications and offers statistics record, for each school, how many applications and offers involved families living in another local authority. We show these on each school&apos;s &ldquo;Applications &amp; offers&rdquo; tab. They show what
          happened in past years only.
        </p>
        <h2>Pitfalls</h2>
        <ul>
          <li>A past year&apos;s furthest-offer distance is not a catchment boundary and changes every year.</li>
          <li>Online distances from a postcode are approximations. Schools measure from your exact home address using the method in their policy.</li>
          <li>Many policies fix the date your address counts from, and require evidence that you live there. Temporary or second addresses are usually not accepted.</li>
        </ul>
        <p>
          Use the <Link href="/tools/catchment-checker">catchment checker</Link> to see whether a school uses a catchment area, and whether we hold a verified boundary for it.
        </p>
      </>
    ),
  },
  {
    slug: "oversubscription",
    title: "How grammar school oversubscription criteria work",
    description: "The order in which places are offered when more qualified children apply than there are places: looked after children, Pupil Premium, siblings, staff, catchment, distance and tie-breaks.",
    updated: "2026-10-24",
    sources: [ADMISSIONS_CODE, GOVUK_ADMISSIONS],
    body: (
      <>
        <p>
          Every state school publishes oversubscription criteria: a numbered list that decides who is offered a place when there are more applicants than places. For grammar schools, these usually apply only to children who have met the qualifying standard.
        </p>
        <h2>Looked after and previously looked after children</h2>
        <p>
          The School Admissions Code requires admission authorities to give the highest priority to looked after children and previously looked after children. In grammar schools that select on ability, this applies to children who meet the school&apos;s
          required standard.
        </p>
        <h2 id="pupil-premium">Pupil Premium and service premium</h2>
        <p>
          The Code allows schools to give priority to children eligible for the Pupil Premium or service premium. Many grammar schools now do so, and some set aside places for disadvantaged children who score slightly below the main qualifying score — always check
          the exact wording, evidence required and dates in the school&apos;s policy.
        </p>
        <h2>Siblings, staff and medical or social need</h2>
        <p>
          Sibling priority is common but defined differently by each school (for example, whether step-siblings or siblings at a linked school count). Staff priority is limited by the Code to staff employed for at least two years, or recruited to fill a
          post with a demonstrable skill shortage. Medical or social need criteria normally require professional written evidence.
        </p>
        <h2>Catchment, distance and tie-breaks</h2>
        <p>
          Catchment and distance criteria rank children by where they live. Within each criterion a tie-break decides between applicants, often distance measured in a straight line from the home to a fixed point at the school, with random allocation for
          exact ties.
        </p>
        <p>
          See how one school lays this out in practice: <Link href="/schools/aylesbury-grammar-school/admissions">Aylesbury Grammar School, September 2027</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "appeals",
    title: "Grammar school appeals: what you can do if you are refused a place",
    description: "How school admission appeals work in England, the deadlines admission authorities must give you, selection reviews, waiting lists and what panels consider.",
    updated: "2026-10-24",
    sources: [{ title: "Appealing a school's decision — GOV.UK", url: "https://www.gov.uk/schools-admissions/appealing-a-schools-decision" }, APPEALS_CODE],
    body: (
      <>
        <p>
          If your child is refused a place, the letter will explain how to appeal. You can appeal against each refusal separately, once. You can also ask to join the school&apos;s waiting list — schools must keep waiting lists open for at least the first term of
          the school year.
        </p>
        <h2>Deadlines</h2>
        <ul>
          <li>The admission authority must allow at least 20 school days to lodge an appeal from when it sends the decision letter.</li>
          <li>You must be given at least 10 school days&apos; notice of the hearing.</li>
          <li>Appeals must be heard within 40 school days of the appeal deadline.</li>
          <li>You will usually be sent the decision within 5 school days.</li>
        </ul>
        <h2>The hearing</h2>
        <p>
          An independent panel of three or more people hears the appeal and must follow the School Admission Appeals Code. The admission authority explains why it refused the place, and you explain why your child should be admitted. If the criteria were not
          followed properly, or don&apos;t comply with the Admissions Code, the appeal must be upheld.
        </p>
        <h2>Selection reviews and test results</h2>
        <p>
          Some areas run a separate review of whether a child should be deemed qualified, before places are allocated. Where this exists, appeal panels usually won&apos;t re-run that assessment. Check the school&apos;s policy for the review route and its deadline.
        </p>
        <h2>Complaints about the process</h2>
        <p>You can complain about how an appeal was carried out (not the decision): to the Local Government Ombudsman for maintained schools, or via DfE&apos;s academy appeals complaint route for academies.</p>
      </>
    ),
  },
  {
    slug: "home-address",
    title: "Home address rules and moving house before applying",
    description: "Which address counts for grammar school admissions, dates from which residence counts, evidence you may need, and why temporary addresses are usually rejected.",
    updated: "2026-10-24",
    sources: [ADMISSIONS_CODE, GOVUK_ADMISSIONS],
    body: (
      <>
        <p>
          Where a school uses catchment or distance, the address on your application matters. Each policy defines the home address — typically where the child lives and sleeps for most of the school week — and many fix a date from which residence counts.
        </p>
        <h2>What policies commonly say</h2>
        <ul>
          <li>The home address is the parent&apos;s residence where the child lives for more than half of school nights.</li>
          <li>Residence may need to start by a fixed date (some schools use 1 September of the year before entry) and continue to the start date.</li>
          <li>Families moving in may need to have sold, let or ended the lease on their previous home.</li>
          <li>Crown servants and UK Armed Forces families moving on posting are treated as living at their new address if they provide official evidence.</li>
        </ul>
        <p>
          Using an address you don&apos;t live at can lead to an offer being withdrawn. If you move after applying, tell your home council straight away. Aylesbury Grammar School&apos;s policy is a detailed{" "}
          <Link href="/schools/aylesbury-grammar-school/admissions">worked example</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "northern-ireland",
    title: "Grammar school transfer in Northern Ireland",
    description: "How transfer from primary to post-primary school works in Northern Ireland: the SEAG Entrance Assessment, Year 8 entry, school admissions criteria and the Education Authority process.",
    updated: "2026-10-24",
    sources: [
      { title: "SEAG — Assessment Guide", url: "https://seagni.co.uk/guidance/assessment-guide" },
      { title: "SEAG — Key Dates", url: "https://seagni.co.uk/guidance/key-dates" },
      { title: "Education Authority (Northern Ireland)", url: "https://www.eani.org.uk/" },
    ],
    body: (
      <>
        <p>
          Northern Ireland has its own system. Children transfer to <strong>Year 8</strong> (not Year 7) in the September after P7. The English 11+ process, application deadlines and offer day do not apply.
        </p>
        <h2>The SEAG Entrance Assessment</h2>
        <p>
          Schools that admit on academic selection use the SEAG Entrance Assessment, sat in P7. It has two papers with an identical format, each assessing English (or Gaeilge) and Mathematics, with a 60-minute main test. Outcomes are standardised for age and
          reported as a Band (1 highest to 6 lowest), a Total Standardised Age Score and a cohort percentile.
        </p>
        <p>
          For the 2026/27 assessment, SEAG lists Paper 1 on Saturday 14 November 2026, Paper 2 on Saturday 21 November 2026, and outcomes issued on Saturday 23 January 2027. See the <Link href="/11-plus/seag-entrance-assessment">SEAG page</Link> for all dates and sources.
        </p>
        <h2>Applying and admissions criteria</h2>
        <p>
          Applications go through the Education Authority&apos;s transfer process. Each post-primary school publishes its own admissions criteria, setting out how it uses SEAG outcomes and other factors such as siblings or feeder schools. Read the criteria for
          every school you list — they differ.
        </p>
        <p>
          <Link href="/grammar-schools/northern-ireland">Browse Northern Ireland&apos;s grammar schools</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "wales-and-scotland",
    title: "School choice in Wales and Scotland: there are no state grammar schools",
    description: "Wales and Scotland don't have state-funded selective grammar schools. How secondary school places are allocated there instead, and where to find official information.",
    updated: "2026-10-24",
    sources: [
      { title: "School admissions — GOV.WALES", url: "https://www.gov.wales/school-admissions" },
      { title: "Choosing a school — mygov.scot", url: "https://www.mygov.scot/choosing-school" },
    ],
    body: (
      <>
        <p>State-funded secondary schools in Wales and Scotland are comprehensive: they do not select pupils by academic ability, so there are no state grammar schools or 11+ tests.</p>
        <h2>Wales</h2>
        <p>Local authorities and voluntary aided schools act as admission authorities and publish admission arrangements. Welsh-medium and faith schools have their own criteria. See GOV.WALES for the official process.</p>
        <h2>Scotland</h2>
        <p>Children are allocated to a catchment secondary school, and parents can make a placing request for a different school. See mygov.scot and your council for details.</p>
        <p>Some independent schools in both nations select by assessment; they are outside the scope of this site.</p>
      </>
    ),
  },
];

export function getGuide(slug: string) {
  return ADMISSIONS_GUIDES.find((g) => g.slug === slug) ?? null;
}
