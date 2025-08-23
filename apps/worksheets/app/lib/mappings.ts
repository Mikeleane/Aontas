export const SCHOOL_MAP = {
  IE: {
    years: [
      { label: "5th Class (Primary)", cefr: "A2", targets: ["present simple", "everyday vocabulary"] },
      { label: "1st Year (Junior Cycle)", cefr: "A2/B1", targets: ["narrative past", "opinions"] },
      { label: "6th Year (Leaving Cert)", cefr: "B2/C1", targets: ["argumentation", "text organization"] },
    ],
    tasks: ["Reading comprehension", "Opinion essay", "Summary + response", "Listening worksheet"],
  },
  UK: { years: [], tasks: [] },
  ES: { years: [], tasks: [] },
} as const;

export const EXAM_TASKS = {
  Cambridge: {
    B2: ["Reading Part 5", "Use of English Part 1", "Writing Part 1 (Essay)", "Speaking Part 3"],
    C1: ["Reading & Use Part 6", "Writing Part 2 (Proposal)", "Listening Part 4"],
  },
  Trinity: { ISE_II: ["Reading into writing", "Listening into speaking"], GESE_7: ["Topic discussion", "Interactive phase"] },
  Aptis: { General_B2: ["Reading task 3", "Writing task 3"] },
  Linguaskill: { General_B2: ["Reading gap fill", "Writing email"] },
} as const;

export const GRAMMAR_BY_CEFR = {
  B2: ["past modals", "passive voice", "wish/if only", "inversion for emphasis"],
  C1: ["cleft sentences", "mixed conditionals", "advanced passives"],
} as const;
