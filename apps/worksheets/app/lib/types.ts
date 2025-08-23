export type GenerateRequest = {
  input: string;
  path: "public" | "nonPublic";
  inclusive: boolean;
  includeLD: boolean;
  teacherName?: string;
  sourceHint?: { url?: string; publisher?: string; dateISO?: string };

  country?: "IE" | "UK" | "ES";
  schoolYear?: string;
  curriculumTaskType?: string;

  outputLanguage?: "en" | "es" | "ga";
  studentProfile?: "adult" | "teen" | "yl";
  cefr?: "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
  exam?: { provider: "Cambridge"|"Trinity"|"Aptis"|"Linguaskill"; level: string; variant?: string; task?: string };

  grammarPoints?: string[];
  vocabInclude?: string;
  locale?: "IE" | "UK" | "ES";
  schoolType?: "Public" | "Private";
};

export type Exercise =
  | string
  | {
      type: "TrueFalse" | "MCQ" | "ShortAnswer" | "GapFill" | "Matching";
      task?: string;
      question?: string;
      questions?: unknown[];
      options?: unknown[];
      answer?: unknown;
      text?: string;
      prompt?: string;
      [k: string]: unknown;
    };

export type GenerateResponse = {
  meta: {
    outputLanguage: "en" | "es" | "ga";
    cefr: GenerateRequest["cefr"] | null;
    exam?: GenerateRequest["exam"];
    path: GenerateRequest["path"];
    country?: GenerateRequest["country"];
    schoolYear?: GenerateRequest["schoolYear"];
    constraintsSummary: string[];
    source: { title?: string; url?: string; publisher?: string; dateISO?: string; licenseNote?: string };
  };
  studentWorksheet: { title: string; text: string; exercises: Exercise[] };
  teacherNotes: {
    cefrRationale: string;
    sourceValidity: { summary: string; riskFlags: string[]; references: string[] };
    inclusiveLanguage: { summary: string; flagged: string[]; suggestedEdits: string[] };
    differentiation: { tips: string[]; fastFinishers?: string[]; supports?: string[] };
    preTeachVocab: string[];
    extraActivities: string[];
    answerKey: Record<string, string | string[]>;
    ldPanel?: { summary: string; adjustments: string[] };
  };
  ldVariant?: { title: string; text: string; supports?: string[]; exercises?: Exercise[] };
};
