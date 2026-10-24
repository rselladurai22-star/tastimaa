/**
 * Short statements of national rules, each checked against the cited
 * official page (retrieved 24 October 2026). Used as retrieval documents.
 */
export interface KnowledgeItem {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  text: string;
  verification: "officially_verified" | "awaiting_verification";
}

export const NATIONAL_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: "three-steps",
    title: "Qualifying is not the same as receiving an offer (platform definition)",
    url: "https://www.gov.uk/schools-admissions/admissions-criteria",
    keywords: ["pass", "qualif", "guarantee", "offer", "place"],
    verification: "officially_verified",
    text: "Meeting a grammar school's test standard makes a child eligible to be considered. If more qualifying children apply than there are places, the school's published oversubscription criteria decide the order in which places are offered. Offers are sent by the home council on national offer day. GOV.UK: admission criteria may give priority to children who pass an entrance exam (for selective schools, for example grammar schools), and all state-funded schools must give top priority to children who are or have been in care.",
  },
  {
    id: "england-dates",
    title: "England: secondary application deadline and offer day (GOV.UK)",
    url: "https://www.gov.uk/schools-admissions/how-to-apply",
    keywords: ["deadline", "apply", "application", "31 october", "offer day", "1 march", "when", "date"],
    verification: "officially_verified",
    text: "Applications for secondary school places usually open on 1 September. You must apply for a secondary school place by 31 October. Councils send offers of secondary school places on 1 March; if the date falls on a weekend or bank holiday, offers are sent the next working day. You apply through your local council even if you're applying for schools in another council area. Listing only one school will not increase your chances of getting a place there.",
  },
  {
    id: "england-appeals",
    title: "England: school admission appeals (GOV.UK)",
    url: "https://www.gov.uk/schools-admissions/appealing-a-schools-decision",
    keywords: ["appeal", "refused", "unsuccessful", "rejected", "didn't get", "did not get"],
    verification: "officially_verified",
    text: "If your child is refused a place you can appeal against each rejection separately, once. The admission authority must allow at least 20 school days to appeal from when it sends the decision letter, give at least 10 school days' notice of the hearing, and hear appeals within 40 school days of the appeal deadline. A panel of three or more independent people hears the appeal under the School Admission Appeals Code. You'll usually be sent the decision within 5 school days.",
  },
  {
    id: "england-waiting",
    title: "England: waiting lists (GOV.UK)",
    url: "https://www.gov.uk/schools-admissions/school-waiting-lists",
    keywords: ["waiting list", "waitlist", "unsuccessful", "refused", "no place"],
    verification: "officially_verified",
    text: "You can put your child's name on a waiting list. The admission authority must keep a waiting list open for at least the first term of each school year. You can add your child's name to a waiting list even if they have been offered a place at another school.",
  },
  {
    id: "england-other-area",
    title: "England: applying to schools in another council area (GOV.UK)",
    url: "https://www.gov.uk/schools-admissions/how-to-apply",
    keywords: ["another county", "other county", "outside", "out of area", "out-of-area", "catchment", "another council", "different county"],
    verification: "officially_verified",
    text: "You apply through your local (home) council even if you're applying for schools in another council area. Whether a place is likely depends on the school's own admission criteria, which may give priority to children living in a catchment area or close to the school.",
  },
  {
    id: "adjudicator",
    title: "England: objecting to admission arrangements (GOV.UK)",
    url: "https://www.gov.uk/schools-admissions/admissions-criteria",
    keywords: ["adjudicator", "unfair", "object", "complain"],
    verification: "officially_verified",
    text: "Contact the Schools Adjudicator if you think a school has unlawful or unfair admission arrangements. You need to complain by 15 May of the year before you're applying for a place.",
  },
  {
    id: "ni-seag",
    title: "Northern Ireland: SEAG Entrance Assessment (SEAG)",
    url: "https://seagni.co.uk/guidance/assessment-guide",
    keywords: ["northern ireland", "seag", "belfast", "year 8", "transfer", "ni "],
    verification: "awaiting_verification",
    text: "In Northern Ireland, children transfer to Year 8. The SEAG Entrance Assessment is taken by pupils in their final year of primary school. It has two papers with an identical format, each assessing English (or Gaeilge) and Mathematics with a 60-minute main test. Outcomes are standardised for age and reported as a Band from 1 (highest) to 6 (lowest), a Total Standardised Age Score and a cohort percentile. SEAG key dates for the 2026/27 assessment: Paper 1 on Saturday 14 November 2026; Paper 2 on Saturday 21 November 2026; outcomes issued Saturday 23 January 2027; re-mark requests 25 January to 3 February 2027. Each post-primary school publishes its own admissions criteria; applications go through the Education Authority.",
  },
  {
    id: "wales-scotland",
    title: "Wales and Scotland: no state grammar schools",
    url: "https://www.gov.wales/school-admissions",
    keywords: ["wales", "scotland", "welsh", "scottish"],
    verification: "officially_verified",
    text: "State-funded secondary schools in Wales and Scotland are comprehensive and do not select by academic ability, so there are no state grammar schools or 11+ tests there.",
  },
];
