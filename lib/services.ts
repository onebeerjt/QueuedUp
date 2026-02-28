export const SERVICES = [
  { id: 'netflix', name: 'Netflix', color: '#E50914' },
  { id: 'hbo', name: 'HBO Max', color: '#9B59B6' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783' },
  { id: 'tubi', name: 'Tubi', color: '#FA3A2C' },
  { id: 'plex', name: 'Plex', color: '#F9BE03' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E0' },
  { id: 'apple', name: 'Apple TV+', color: '#FFFFFF' },
  { id: 'disney', name: 'Disney+', color: '#113CCF' },
  { id: 'peacock', name: 'Peacock', color: '#F5A623' },
  { id: 'paramount', name: 'Paramount+', color: '#0064FF' }
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];

const nameToId: Array<{ id: ServiceId; aliases: string[] }> = [
  { id: 'netflix', aliases: ['netflix'] },
  { id: 'hbo', aliases: ['hbo', 'hbo max', 'max'] },
  { id: 'hulu', aliases: ['hulu'] },
  { id: 'tubi', aliases: ['tubi'] },
  { id: 'plex', aliases: ['plex'] },
  { id: 'prime', aliases: ['prime video', 'amazon', 'amazon prime', 'amazon prime video'] },
  { id: 'apple', aliases: ['apple tv+', 'apple tv plus', 'apple tv', 'apple'] },
  { id: 'disney', aliases: ['disney+', 'disney plus', 'disney'] },
  { id: 'peacock', aliases: ['peacock'] },
  { id: 'paramount', aliases: ['paramount+', 'paramount plus', 'paramount'] }
];

export function normalizeServiceName(name: string): ServiceId | null {
  const normalized = name.trim().toLowerCase();
  for (const service of nameToId) {
    if (service.aliases.some((alias) => normalized.includes(alias))) {
      return service.id;
    }
  }
  return null;
}

export function getServiceLogoPath(serviceName: string): string {
  const id = normalizeServiceName(serviceName);
  return id ? `/icons/${id}.svg` : '';
}
