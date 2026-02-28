export const SERVICES = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', logo: '/icons/netflix.svg' },
  { id: 'hbo', name: 'HBO Max', color: '#9B59B6', logo: '/icons/hbo.svg' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783', logo: '/icons/hulu.svg' },
  { id: 'tubi', name: 'Tubi', color: '#FA3A2C', logo: '/icons/tubi.svg' },
  { id: 'plex', name: 'Plex', color: '#F9BE03', logo: '/icons/plex.svg' },
  { id: 'roku', name: 'Roku Channel', color: '#6F1AB1', logo: '/icons/roku.svg' },
  { id: 'pluto', name: 'Pluto TV', color: '#13A5FF', logo: '/icons/pluto.svg' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E0', logo: '/icons/prime.svg' },
  { id: 'apple', name: 'Apple TV+', color: '#FFFFFF', logo: '/icons/apple.svg' },
  { id: 'disney', name: 'Disney+', color: '#113CCF', logo: '/icons/disney.svg' },
  { id: 'peacock', name: 'Peacock', color: '#F5A623', logo: '/icons/peacock.svg' },
  { id: 'paramount', name: 'Paramount+', color: '#0064FF', logo: '/icons/paramount.svg' }
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];

const nameToId: Array<{ id: ServiceId; aliases: string[] }> = [
  { id: 'netflix', aliases: ['netflix'] },
  { id: 'hbo', aliases: ['hbo', 'hbo max', 'max'] },
  { id: 'hulu', aliases: ['hulu'] },
  { id: 'tubi', aliases: ['tubi'] },
  { id: 'plex', aliases: ['plex'] },
  { id: 'roku', aliases: ['roku channel', 'roku'] },
  { id: 'pluto', aliases: ['pluto tv', 'pluto'] },
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
  return id ? SERVICES.find((service) => service.id === id)?.logo ?? '' : '';
}
