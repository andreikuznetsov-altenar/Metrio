import type { TeamSnapshot } from '../../domain/people/types';
import { fetchEmployeeAvatarDataUrl } from '../bamboo/bambooAvatarService';
import { sanitizePdfImageSrc } from './pdfSafeImage';

export async function resolvePdfAvatarDataUrls(
  teamSnapshot: TeamSnapshot,
  personIds: string[],
): Promise<Record<string, string | null>> {
  const byPersonId = new Map(teamSnapshot.persons.map((person) => [person.id, person]));
  const unique = [...new Set(personIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (personId) => {
      const person = byPersonId.get(personId);
      const bambooId = person?.bamboo?.id?.trim();
      if (!bambooId) {
        return [personId, null] as const;
      }
      try {
        const dataUrl = await fetchEmployeeAvatarDataUrl(bambooId, 'small');
        return [personId, sanitizePdfImageSrc(dataUrl)] as const;
      } catch {
        return [personId, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
