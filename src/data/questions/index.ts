import type { Question } from '@/types/models';
import childPsych from './child-psych.json';
import teaching from './teaching.json';
import math from './math.json';
import language from './language.json';
import science from './science.json';
import evsSst from './evs-sst.json';
import gk from './gk.json';
import reasoning from './reasoning.json';
import ict from './ict.json';
import lifeSkills from './life-skills.json';
import generated from './generated.json';

/** All bundled practice questions. Admin-added questions are merged at runtime by contentService. */
export const bundledQuestions: Question[] = [
  ...(childPsych as Question[]),
  ...(teaching as Question[]),
  ...(math as Question[]),
  ...(language as Question[]),
  ...(science as Question[]),
  ...(evsSst as Question[]),
  ...(gk as Question[]),
  ...(reasoning as Question[]),
  ...(ict as Question[]),
  ...(lifeSkills as Question[]),
  // written by the daily refresh job (tagged ai-generated; review in Admin)
  ...(generated as Question[]),
];
