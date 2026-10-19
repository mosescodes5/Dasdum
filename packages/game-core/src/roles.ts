// Single source of truth for starting roles. Seed script builds DB rows from this;
// the server uses generateCharacter(). The client NEVER chooses its own stats.
export interface RoleDef {
  key: string; name: string; tags: string[]; skillKey: string;
  monthlyNaira: number; cashNaira: number; bankNaira: number;
  skills: Record<string, number>; socialClass: string; goal: string; ladder: [string, string, string, string];
  minLevel?: number; startable?: boolean; // level needed to APPLY at entry; false = can't be a starting job (you have to earn your way in)
  hours?: [number, number]; entryRep?: number; // when shifts may START (Lagos hours), and the reputation needed to APPLY at entry level
}
export const LEVEL_STEP = 2; // each promotion asks for two more levels than the rung below
export const LADDER = {
  salaryMult: [1, 1.4, 2, 3], minShifts: [0, 20, 60, 150],
  minReputation: [0, 20, 35, 50], minSkill: [0, 35, 50, 65],
} as const;

export const ROLES: RoleDef[] = [
  { key: 'danfo', name: 'Danfo Driver', tags: ['trans', 'trade'], skillKey: 'Driving', monthlyNaira: 90000, cashNaira: 35000, bankNaira: 12000, skills: { Driving: 30, 'Street Smarts': 30, Communication: 25 }, socialClass: 'Lower Middle', goal: 'Build a transport business', ladder: ['Conductor', 'Danfo Driver', 'Fleet Owner', 'Transport Company Owner'] },
  { key: 'trader', name: 'Market Trader', tags: ['trade', 'biz'], skillKey: 'Business', monthlyNaira: 70000, cashNaira: 50000, bankNaira: 20000, skills: { Business: 28, Negotiation: 30, Communication: 30 }, socialClass: 'Lower Middle', goal: 'Open a shop', ladder: ['Small Trader', 'Shop Owner', 'Wholesaler', 'Business Chain Owner'] },
  { key: 'teacher', name: 'Teacher', tags: ['edu', 'care'], skillKey: 'Teaching', monthlyNaira: 85000, cashNaira: 25000, bankNaira: 30000, skills: { Teaching: 35, Communication: 32, Patience: 30 }, socialClass: 'Lower Middle', goal: 'Become a school head', ladder: ['Assistant Teacher', 'Teacher', 'Senior Teacher', 'Principal'], minLevel: 2, entryRep: 12 },
  { key: 'nurse', name: 'Nurse', tags: ['care'], skillKey: 'Medicine', monthlyNaira: 120000, cashNaira: 30000, bankNaira: 45000, skills: { Medicine: 33, Empathy: 36, Stamina: 30 }, socialClass: 'Middle', goal: 'Specialise and own a clinic', ladder: ['Staff Nurse', 'Senior Nurse', 'Nurse Specialist', 'Matron'], minLevel: 3, entryRep: 20 },
  { key: 'lawyer', name: 'Junior Lawyer', tags: ['law', 'gov'], skillKey: 'Law', monthlyNaira: 150000, cashNaira: 80000, bankNaira: 120000, skills: { Law: 40, Communication: 35, Negotiation: 32 }, socialClass: 'Middle', goal: 'Make partner', ladder: ['Junior Associate', 'Associate', 'Senior Lawyer', 'Partner'], minLevel: 4, entryRep: 25 },
  { key: 'dev', name: 'Software Developer', tags: ['dev', 'fin'], skillKey: 'Coding', monthlyNaira: 220000, cashNaira: 60000, bankNaira: 150000, skills: { Coding: 42, Logic: 38, Business: 18 }, socialClass: 'Middle', goal: 'Launch a tech company', ladder: ['Junior Developer', 'Developer', 'Senior Developer', 'Engineering Lead'], minLevel: 3, entryRep: 15 },
  { key: 'banker', name: 'Bank Officer', tags: ['fin', 'biz'], skillKey: 'Finance', monthlyNaira: 180000, cashNaira: 50000, bankNaira: 90000, skills: { Finance: 36, Communication: 34, Negotiation: 25 }, socialClass: 'Middle', goal: 'Branch manager', ladder: ['Teller', 'Customer Officer', 'Relationship Manager', 'Branch Manager'], minLevel: 3, entryRep: 20 },
  { key: 'mechanic', name: 'Mechanic', tags: ['trans', 'trade'], skillKey: 'Repairs', monthlyNaira: 80000, cashNaira: 40000, bankNaira: 15000, skills: { Repairs: 38, 'Street Smarts': 30, Business: 15 }, socialClass: 'Lower Middle', goal: 'Own a workshop', ladder: ['Apprentice', 'Mechanic', 'Master Mechanic', 'Workshop Owner'] },
  { key: 'journalist', name: 'Journalist', tags: ['media', 'law'], skillKey: 'Writing', monthlyNaira: 95000, cashNaira: 25000, bankNaira: 35000, skills: { Writing: 36, Research: 33, Connections: 28 }, socialClass: 'Lower Middle', goal: 'Break a big story', ladder: ['Reporter', 'Correspondent', 'Senior Editor', 'Editor-in-Chief'], minLevel: 2, entryRep: 12 },
  { key: 'civil', name: 'Civil Servant', tags: ['gov'], skillKey: 'Admin', monthlyNaira: 110000, cashNaira: 30000, bankNaira: 50000, skills: { Admin: 34, Connections: 30, Communication: 28 }, socialClass: 'Middle', goal: 'Rise to director', ladder: ['Clerk', 'Officer', 'Deputy Director', 'Director'], minLevel: 2, entryRep: 15 },
  { key: 'owner', name: 'Small Business Owner', tags: ['biz', 'trade'], skillKey: 'Leadership', monthlyNaira: 130000, cashNaira: 70000, bankNaira: 60000, skills: { Business: 38, Negotiation: 30, Leadership: 25 }, socialClass: 'Middle', goal: 'Build a chain', ladder: ['Startup Owner', 'Established Owner', 'Regional Owner', 'Group CEO'], minLevel: 4 },
  { key: 'guard', name: 'Security Guard', tags: ['gov', 'trans'], skillKey: 'Vigilance', monthlyNaira: 55000, cashNaira: 15000, bankNaira: 8000, skills: { Vigilance: 34, Stamina: 32, 'Street Smarts': 28 }, socialClass: 'Lower', goal: 'Start a security firm', ladder: ['Guard', 'Senior Guard', 'Supervisor', 'Security Firm Owner'], minLevel: 2, entryRep: 15, hours: [0, 24] },
  { key: 'police', name: 'Police Officer', tags: ['gov', 'law'], skillKey: 'Enforcement', monthlyNaira: 90000, cashNaira: 20000, bankNaira: 15000, skills: { Enforcement: 32, Stamina: 32, 'Street Smarts': 28 }, socialClass: 'Lower Middle', goal: 'Rise through the ranks', ladder: ['Constable', 'Corporal', 'Sergeant', 'Inspector'], minLevel: 3, hours: [0, 24], entryRep: 15 },
  { key: 'keke', name: 'Keke Rider', tags: ['trans', 'trade'], skillKey: 'Driving', monthlyNaira: 75000, cashNaira: 20000, bankNaira: 8000, skills: { Driving: 28, 'Street Smarts': 30 }, socialClass: 'Lower', goal: 'Own a fleet of keke', ladder: ['Keke Rider', 'Senior Rider', 'Keke Fleet Owner', 'Transport Union Chairman'], minLevel: 2, startable: false, hours: [5, 22] },
  { key: 'brt', name: 'Public Bus Driver', tags: ['trans', 'gov'], skillKey: 'Driving', monthlyNaira: 140000, cashNaira: 30000, bankNaira: 40000, skills: { Driving: 40, Discipline: 35 }, socialClass: 'Middle', goal: 'Run the transport authority', ladder: ['Bus Driver', 'Senior Driver', 'Route Supervisor', 'Transport Authority Officer'], minLevel: 4, startable: false, hours: [5, 21], entryRep: 20 },
  { key: 'efcc', name: 'EFCC Investigator', tags: ['law', 'gov', 'fin'], skillKey: 'Investigation', monthlyNaira: 200000, cashNaira: 50000, bankNaira: 90000, skills: { Investigation: 40, Finance: 30 }, socialClass: 'Middle', goal: 'Bring down the big fish', ladder: ['Investigator', 'Senior Investigator', 'Team Lead', 'Director of Operations'], minLevel: 6, startable: false, entryRep: 30 },
  { key: 'court', name: 'Court Staff', tags: ['law', 'gov'], skillKey: 'Law', monthlyNaira: 160000, cashNaira: 40000, bankNaira: 100000, skills: { Law: 45, Discipline: 35 }, socialClass: 'Middle', goal: 'Sit on the bench', ladder: ['Court Clerk', 'Registrar', 'Magistrate', 'High Court Judge'], minLevel: 6, startable: false, entryRep: 30 },
  { key: 'politics', name: 'Political Aide', tags: ['gov'], skillKey: 'Influence', monthlyNaira: 180000, cashNaira: 60000, bankNaira: 80000, skills: { Influence: 40, Communication: 35 }, socialClass: 'Middle', goal: 'Reach the Governor\'s office', ladder: ['Ward Aide', 'Special Assistant', 'Commissioner', 'Deputy Governor'], minLevel: 5, startable: false, entryRep: 35 },
];

// SURVEY[question][option] -> tags. Same order as the client UI (5 options each).
export const SURVEY: string[][][] = [
  [['biz', 'fin'], ['law', 'gov'], ['gov', 'law'], ['trans', 'dev'], ['care', 'edu']],
  [['care', 'edu'], ['biz', 'fin'], ['trans', 'trade'], ['law', 'dev'], ['biz', 'trans']],
  [['care', 'fin'], ['biz', 'trade'], ['gov', 'law'], ['gov', 'media'], ['trade', 'dev']],
  [['law', 'gov', 'care'], ['biz', 'trade'], ['trans', 'biz'], ['gov', 'media'], ['edu', 'dev']],
];
const FIRST = ['Chinedu', 'Aisha', 'Tunde', 'Ngozi', 'Ibrahim', 'Funke', 'Emeka', 'Hauwa', 'Bola', 'Efe', 'Uche', 'Zainab', 'Seyi', 'Amaka', 'Danjuma', 'Folake'];
const LAST = ['Okafor', 'Bello', 'Adeyemi', 'Eze', 'Musa', 'Balogun', 'Nwosu', 'Ibrahim', 'Okoro', 'Abubakar', 'Etim', 'Lawal'];

export function generateCharacter(answers: number[], rand: () => number = Math.random) {
  const tags = answers.flatMap((a, q) => SURVEY[q][a]);
  // Survey nudges the result; randomness keeps it unpredictable.
  const role = ROLES.filter((r) => r.startable !== false).map((r) => ({ r, s: r.tags.filter((t) => tags.includes(t)).length * 2 + rand() * 3.2 }))
    .sort((a, b) => b.s - a.s)[0].r;
  const jit = () => 0.85 + rand() * 0.35;
  const skills = Object.fromEntries(Object.entries(role.skills).map(([k, v]) => [k, Math.round(v * jit())]));
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const koba = (naira: number) => BigInt(Math.round((naira * jit()) / 500) * 500) * 100n;
  return {
    name: `${pick(FIRST)} ${pick(LAST)}`, age: 21 + Math.floor(rand() * 18), role,
    cashKobo: koba(role.cashNaira), bankKobo: koba(role.bankNaira), skills,
    reputation: 12 + Math.round(rand() * 14),
  };
}
