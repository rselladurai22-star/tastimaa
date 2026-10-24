import type { JobResult } from "../runner";
import { runAdmissionsDocuments } from "./admissions-docs";
import { runAppsOffers } from "./apps-offers";
import { runEditorial } from "./editorial";
import { runKs4, runKs5 } from "./ees-results";
import { runGias } from "./gias";
import { runNiSchools } from "./ni-deni";
import { runOfsted } from "./ofsted";

/** Every scheduled ingestion job, in dependency order (identity data first). */
export const JOBS: Record<string, { description: string; schedule: string; run: (trigger?: string) => Promise<JobResult> }> = {
  gias: { description: "England school identity, location and census data (GIAS bulk extract)", schedule: "0 4 * * 1", run: runGias },
  ni_schools: { description: "Northern Ireland grammar schools (DE NI school-level census)", schedule: "0 4 1 * *", run: runNiSchools },
  ofsted_mi: { description: "Ofsted inspection outcomes (monthly management information)", schedule: "0 5 15 * *", run: runOfsted },
  ees_ks4: { description: "GCSE / key stage 4 results and comparators (EES API)", schedule: "0 5 * * 2", run: runKs4 },
  ees_1618: { description: "A level / 16–18 results (EES API)", schedule: "0 5 * * 2", run: runKs5 },
  ees_apps_offers: { description: "Secondary applications and offers, school level (EES)", schedule: "0 5 1 * *", run: runAppsOffers },
  admissions_documents: { description: "Fetch and extract school admissions policies (robots-aware, review queue)", schedule: "0 6 * * 3", run: runAdmissionsDocuments },
  editorial: { description: "Editorial research: tests, key dates, policies (imported as awaiting verification)", schedule: "manual", run: runEditorial },
};

export const JOB_ORDER = Object.keys(JOBS);
