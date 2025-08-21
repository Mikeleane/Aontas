export type OutputLanguage = "ga" | "en" | "es";

export type Payload = {
  outputLanguage: OutputLanguage;
  publicSchool: boolean;
  school?: { country: "IE" | "ES"; year: string };
  exam?: { cefr: "A1"|"A2"|"B1"|"B2"|"C1"|"C2"; type: "Cambridge"|"Trinity"|"Aptis"|"Linguaskill"; questionTypes: string[] };
  topic: string;
  ldSupport: boolean;
};

export const CEFR = ["A1","A2","B1","B2","C1","C2"] as const;

export const PUBLIC_SCHOOL: Record<"IE"|"ES",{label:string, years:string[]}> = {
  IE: {
    label: "Ireland",
    years: [
      "Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
      "Junior Cycle 1","Junior Cycle 2","Junior Cycle 3",
      "Senior Cycle 5","Senior Cycle 6"
    ]
  },
  ES: {
    label: "Spain",
    years: [
      "Primaria 1","Primaria 2","Primaria 3","Primaria 4","Primaria 5","Primaria 6",
      "ESO 1","ESO 2","ESO 3","ESO 4",
      "Bachillerato 1","Bachillerato 2"
    ]
  }
};

export const EXAM_QUESTION_TYPES: Record<string,string[]> = {
  Cambridge: [
    "Multiple-choice cloze","Open cloze","Word formation","Key word transformations",
    "Matching headings","Multiple matching","True/False/Not Given",
    "MCQ listening","Note/table completion","Matching",
    "Email/letter","Article","Review","Report","Essay",
    "Interview","Long turn & discussion","Photo comparison"
  ],
  Trinity: [
    "Long reading","Multi-text reading","Reading-into-writing",
    "Listening gap fill","Listening multiple-choice",
    "Writing: email/report/essay",
    "GESE: Topic discussion","GESE: Interactive task","GESE: Conversation"
  ],
  Aptis: [
    "Grammar & vocab MCQ",
    "Reading sentence comprehension","Text cohesion","Short text selection",
    "Listening short dialogues MCQ",
    "Writing email (formal/informal)","Image description notes",
    "Speaking: personal info / describe / compare / opinion"
  ],
  Linguaskill: [
    "Reading: gap fill","Reading: matching","Reading: MCQ",
    "Listening: short dialogues MCQ","Listening: note completion",
    "Writing: email + extended task",
    "Speaking: talk about yourself / describe / speculate / discuss"
  ]
};
