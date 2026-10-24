/**
 * Original practice questions written for this site. They illustrate common
 * 11+ question *types*; they are not taken from, or claimed to match, any
 * commercial or official test paper.
 */
export type Skill = "maths" | "verbal" | "english";

export interface PracticeQuestion {
  id: string;
  skill: Skill;
  topic: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const SKILL_LABEL: Record<Skill, string> = { maths: "Mathematics", verbal: "Verbal reasoning", english: "English" };

export const QUESTIONS: PracticeQuestion[] = [
  { id: "m1", skill: "maths", topic: "Arithmetic", prompt: "What is 487 + 356?", options: ["733", "843", "833", "853"], answer: 1, explanation: "487 + 356: 400 + 300 = 700, 87 + 56 = 143, so 843." },
  { id: "m2", skill: "maths", topic: "Fractions", prompt: "What is 3/4 of 96?", options: ["64", "72", "68", "24"], answer: 1, explanation: "A quarter of 96 is 24, so three quarters is 72." },
  { id: "m3", skill: "maths", topic: "Word problems", prompt: "A bus leaves at 08:47 and the journey takes 38 minutes. When does it arrive?", options: ["09:15", "09:25", "09:35", "09:21"], answer: 1, explanation: "08:47 + 13 minutes = 09:00, then 25 more minutes = 09:25." },
  { id: "m4", skill: "maths", topic: "Percentages", prompt: "A jacket costs £60. It is reduced by 15%. What is the new price?", options: ["£45", "£51", "£54", "£9"], answer: 1, explanation: "15% of £60 is £9, so the price is £60 − £9 = £51." },
  { id: "m5", skill: "maths", topic: "Number patterns", prompt: "What comes next? 3, 7, 15, 31, …", options: ["47", "62", "63", "64"], answer: 2, explanation: "Each term is double the previous plus 1: 31 × 2 + 1 = 63." },
  { id: "m6", skill: "maths", topic: "Area", prompt: "A rectangle is 12 cm long and 7 cm wide. What is its area?", options: ["38 cm²", "84 cm²", "19 cm²", "74 cm²"], answer: 1, explanation: "Area = length × width = 12 × 7 = 84 cm²." },
  { id: "m7", skill: "maths", topic: "Ratio", prompt: "Sweets are shared between Amir and Bea in the ratio 2 : 3. Bea gets 18. How many does Amir get?", options: ["12", "27", "9", "15"], answer: 0, explanation: "3 parts = 18, so 1 part = 6, and Amir's 2 parts = 12." },
  { id: "m8", skill: "maths", topic: "Algebra", prompt: "If 4n − 5 = 23, what is n?", options: ["6", "7", "4.5", "8"], answer: 1, explanation: "4n = 28, so n = 7." },
  { id: "v1", skill: "verbal", topic: "Letter series", prompt: "Find the next pair: AZ, BY, CX, DW, …", options: ["EV", "EU", "FV", "DV"], answer: 0, explanation: "The first letter goes forward one (A, B, C, D, E); the second goes back one (Z, Y, X, W, V)." },
  { id: "v2", skill: "verbal", topic: "Codes", prompt: "If CAT is written as DBU, how is DOG written?", options: ["EPH", "EOH", "CNF", "EPG"], answer: 0, explanation: "Each letter moves forward one place: D→E, O→P, G→H." },
  { id: "v3", skill: "verbal", topic: "Analogies", prompt: "Glove is to hand as sock is to …", options: ["shoe", "foot", "leg", "wool"], answer: 1, explanation: "A glove is worn on a hand; a sock is worn on a foot." },
  { id: "v4", skill: "verbal", topic: "Odd one out", prompt: "Which word is the odd one out?", options: ["oak", "birch", "rose", "willow"], answer: 2, explanation: "Oak, birch and willow are trees; a rose is a shrub." },
  { id: "v5", skill: "verbal", topic: "Hidden words", prompt: "Which four-letter word is hidden across the words: 'the bus tops here'?", options: ["stop", "busy", "tops", "hers"], answer: 0, explanation: "'bu(s top)s' — the letters s-t-o-p run across 'bus tops'." },
  { id: "v6", skill: "verbal", topic: "Number sequences in words", prompt: "Which number completes the pattern? 5 (20) 4, 6 (30) 5, 7 (?) 3", options: ["10", "21", "24", "4"], answer: 1, explanation: "The middle number is the outer numbers multiplied: 7 × 3 = 21." },
  { id: "v7", skill: "verbal", topic: "Compound words", prompt: "Which word can go in front of all of these to make new words: …light, …time, …dress?", options: ["sun", "head", "night", "day"], answer: 2, explanation: "Nightlight, night-time and nightdress all work. 'Sun', 'head' and 'day' each fail for one of the three." },
  { id: "e1", skill: "english", topic: "Vocabulary", prompt: "Which word is closest in meaning to 'reluctant'?", options: ["eager", "unwilling", "relieved", "careless"], answer: 1, explanation: "Reluctant means unwilling or hesitant." },
  { id: "e2", skill: "english", topic: "Vocabulary", prompt: "Which word is most nearly opposite to 'scarce'?", options: ["plentiful", "rare", "frightened", "expensive"], answer: 0, explanation: "Scarce means in short supply; plentiful is the opposite." },
  { id: "e3", skill: "english", topic: "Spelling", prompt: "Which word is spelled correctly?", options: ["necessary", "neccessary", "necesary", "neccesary"], answer: 0, explanation: "Necessary has one 'c' and a double 's'." },
  { id: "e4", skill: "english", topic: "Grammar", prompt: "Choose the correct word: 'Neither of the boys ___ finished his homework.'", options: ["have", "has", "were", "are"], answer: 1, explanation: "'Neither' is singular, so it takes 'has'." },
  { id: "e5", skill: "english", topic: "Punctuation", prompt: "Which sentence uses the apostrophe correctly?", options: ["The dog wagged it's tail.", "The dog wagged its tail.", "The dogs' wagged its tail.", "The dog's wagged its tail."], answer: 1, explanation: "'Its' (no apostrophe) shows possession; 'it's' means 'it is'." },
  { id: "e6", skill: "english", topic: "Comprehension", prompt: "\"The harbour was silent; only the gulls dared to argue with the grey morning.\" What mood does this sentence create?", options: ["Cheerful and busy", "Quiet and gloomy", "Angry and violent", "Exciting and fast"], answer: 1, explanation: "'Silent' and 'grey morning' suggest a quiet, gloomy mood; the gulls are the only sound." },
  { id: "e7", skill: "english", topic: "Word classes", prompt: "In 'She sang beautifully', which word is an adverb?", options: ["She", "sang", "beautifully", "none"], answer: 2, explanation: "'Beautifully' describes how she sang, so it is an adverb." },
];

export function questionById(id: string) {
  return QUESTIONS.find((q) => q.id === id);
}
