import { VacancyItem } from '../types/vacancy';
import { tokenize, cleanText } from './text';

export interface SearchResult {
  item: VacancyItem;
  score: number;
  matchedTokens: string[];
}

function normalizeYo(str: string): string {
  return str.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
}

export function searchVacancies(
  vacancies: VacancyItem[],
  query: string,
  filterSalary?: string,
  filterSchedule?: string,
  filterExperience?: string
): VacancyItem[] {
  let result = vacancies;

  // Apply categorical filters
  if (filterSchedule) {
    const sLower = normalizeYo(filterSchedule.toLowerCase());
    result = result.filter(v => {
      const vSched = normalizeYo((v.schedule || '').toLowerCase());
      if (sLower === 'remote' || sLower === 'удаленка') {
        return /удален|remote/i.test(vSched);
      }
      if (sLower === 'hybrid' || sLower === 'гибрид') {
        return /гибрид|hybrid/i.test(vSched);
      }
      if (sLower === 'office' || sLower === 'офис') {
        return /офис|office/i.test(vSched);
      }
      return vSched.includes(sLower);
    });
  }

  if (filterSalary) {
    if (filterSalary === 'with_salary') {
      result = result.filter(v => Boolean(v.salary && !/не указана/i.test(v.salary)));
    } else if (filterSalary === '150k') {
      result = result.filter(v => {
        const numbers = (v.salary || '').match(/\d+/g);
        if (!numbers) return false;
        const maxVal = Math.max(...numbers.map(Number));
        return maxVal >= 150;
      });
    } else if (filterSalary === '250k') {
      result = result.filter(v => {
        const numbers = (v.salary || '').match(/\d+/g);
        if (!numbers) return false;
        const maxVal = Math.max(...numbers.map(Number));
        return maxVal >= 250;
      });
    }
  }

  if (filterExperience) {
    const expLower = normalizeYo(filterExperience.toLowerCase());
    result = result.filter(v => {
      const vExp = normalizeYo((v.experience || '').toLowerCase());
      return vExp.includes(expLower);
    });
  }

  const q = cleanText(query);
  if (!q) return result;

  const tokenGroups = tokenize(q);
  if (!tokenGroups.length) return result;

  const scored: SearchResult[] = [];

  for (const item of result) {
    const titleLower = normalizeYo((item.title || '').toLowerCase());
    const skillsLower = normalizeYo((item.skills || []).join(' ').toLowerCase());
    const companyLower = normalizeYo((item.company || '').toLowerCase());
    const descLower = normalizeYo((item.description || '').toLowerCase());
    const textLower = normalizeYo((item.text || '').toLowerCase());

    let allGroupsMatch = true;
    let score = 0;
    const matchedTokens: string[] = [];

    for (const group of tokenGroups) {
      let groupMatched = false;
      for (const token of group) {
        if (!token) continue;
        const normToken = normalizeYo(token);
        let tokenHit = false;

        if (titleLower.includes(normToken)) {
          score += 50;
          tokenHit = true;
        }
        if (skillsLower.includes(normToken)) {
          score += 40;
          tokenHit = true;
        }
        if (companyLower.includes(normToken)) {
          score += 20;
          tokenHit = true;
        }
        if (descLower.includes(normToken)) {
          score += 10;
          tokenHit = true;
        } else if (textLower.includes(normToken)) {
          score += 5;
          tokenHit = true;
        }

        if (tokenHit) {
          groupMatched = true;
          matchedTokens.push(token);
          break;
        }
      }

      if (!groupMatched) {
        allGroupsMatch = false;
        break;
      }
    }

    if (allGroupsMatch) {
      // Add boost for AI score if present
      if (item.aiScore) {
        score += item.aiScore * 0.5;
      }
      scored.push({ item, score, matchedTokens });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item);
}
