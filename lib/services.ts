export const SERVICES = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', logo: 'https://cdn.simpleicons.org/netflix/E50914' },
  { id: 'hbo', name: 'HBO Max', color: '#9B59B6', logo: 'https://cdn.simpleicons.org/max/9B59B6' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783', logo: 'https://cdn.simpleicons.org/hulu/1CE783' },
  { id: 'tubi', name: 'Tubi', color: '#FA3A2C', logo: 'https://cdn.simpleicons.org/tubi/FA3A2C' },
  { id: 'plex', name: 'Plex', color: '#F9BE03', logo: 'https://cdn.simpleicons.org/plex/F9BE03' },
  { id: 'roku', name: 'Roku Channel', color: '#6F1AB1', logo: 'https://cdn.simpleicons.org/roku/6F1AB1' },
  { id: 'pluto', name: 'Pluto TV', color: '#13A5FF', logo: 'https://cdn.simpleicons.org/plutotv/13A5FF' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E0', logo: 'https://cdn.simpleicons.org/primevideo/00A8E0' },
  { id: 'apple', name: 'Apple TV+', color: '#FFFFFF', logo: 'https://cdn.simpleicons.org/appletv/111111' },
  { id: 'disney', name: 'Disney+', color: '#113CCF', logo: 'https://cdn.simpleicons.org/disneyplus/113CCF' },
  { id: 'peacock', name: 'Peacock', color: '#F5A623', logo: 'https://cdn.simpleicons.org/peacock/F5A623' },
  {
    id: 'paramount',
    name: 'Paramount+',
    color: '#0064FF',
    logo: 'https://cdn.simpleicons.org/paramountplus/0064FF'
  }
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
