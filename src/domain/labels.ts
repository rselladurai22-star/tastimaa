/** Human-readable labels for stored enums. Shared by server and client. */

export const SELECTIVITY_LABEL: Record<string, string> = {
  fully_selective: "Grammar school (fully selective)",
  partially_selective: "Partially selective",
  selective_stream: "Selective stream",
  non_selective: "Non-selective",
};

export const SELECTIVITY_SHORT: Record<string, string> = {
  fully_selective: "Grammar",
  partially_selective: "Partially selective",
  selective_stream: "Selective stream",
  non_selective: "Non-selective",
};

export const GENDER_LABEL: Record<string, string> = { boys: "Boys", girls: "Girls", mixed: "Co-educational", unknown: "Not recorded" };

export const NATION_LABEL: Record<string, string> = { england: "England", northern_ireland: "Northern Ireland", wales: "Wales", scotland: "Scotland" };

export const CATCHMENT_LABEL: Record<string, string> = {
  none: "No catchment area",
  defined_area: "Defined catchment area",
  distance_only: "Distance-based priority (no fixed area)",
  multiple_areas: "Several priority areas",
  unknown: "Not yet recorded",
};

export const OUT_OF_AREA_LABEL: Record<string, string> = {
  yes: "Yes — lower priority than local applicants",
  limited: "Limited places",
  no: "No",
  unknown: "Not yet recorded",
};

export const CRITERION_LABEL: Record<string, string> = {
  qualification_required: "Qualification",
  looked_after: "Looked after children",
  previously_looked_after: "Previously looked after",
  ehcp_named: "EHC plan names the school",
  pupil_premium: "Pupil Premium",
  free_school_meals: "Free school meals",
  sibling: "Sibling",
  staff_child: "Staff child",
  medical_social: "Medical or social need",
  catchment_resident: "Catchment resident",
  distance: "Distance",
  feeder_school: "Feeder school",
  faith: "Faith",
  score_rank: "Test score rank",
  random_allocation: "Random allocation",
  other: "Other applicants",
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  open_event: "Open event",
  registration_opens: "Registration opens",
  registration_closes: "Registration closes",
  test_date: "Test",
  results_released: "Results",
  application_deadline: "Application deadline",
  supplementary_form_deadline: "Supplementary form deadline",
  national_offer_day: "Offer day",
  offer_response_deadline: "Respond to offer",
  waiting_list: "Waiting lists",
  appeal_deadline: "Appeal deadline",
  appeal_hearings: "Appeal hearings",
  other: "Key date",
};

/** EIF (2019–2025) overall effectiveness grades. */
export const EIF_GRADE: Record<string, string> = { "1": "Outstanding", "2": "Good", "3": "Requires improvement", "4": "Inadequate" };

export const INSPECTION_AREA_LABEL: Record<string, string> = {
  inclusion: "Inclusion",
  curriculum_and_teaching: "Curriculum and teaching",
  achievement: "Achievement",
  attendance_and_behaviour: "Attendance and behaviour",
  personal_development_and_wellbeing: "Personal development and well-being",
  leadership_and_governance: "Leadership and governance",
  early_years: "Early years",
  post_16: "Post-16 provision",
  quality_of_education: "Quality of education",
  behaviour_and_attitudes: "Behaviour and attitudes",
  personal_development: "Personal development",
  leadership_and_management: "Leadership and management",
  sixth_form: "Sixth form provision",
};

export const FRAMEWORK_LABEL: Record<string, string> = {
  report_card_2025: "Report card inspection (renewed framework, from November 2025)",
  eif_2019: "Graded inspection (education inspection framework, 2019–2025)",
  eif_2019_ungraded: "Ungraded inspection (2019–2025 framework)",
  pre_2019: "Inspection under an earlier framework",
};

/** The five-point report card scale, best first. */
export const REPORT_CARD_SCALE = ["Exceptional", "Strong standard", "Expected standard", "Needs attention", "Urgent improvement"] as const;
