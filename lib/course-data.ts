export interface CourseMovie {
  title: string;
  note?: string;
}

export interface Course {
  slug: string;
  title: string;
  description: string;
  theme: string;
  movies: CourseMovie[];
}

export interface StarterRow {
  title: string;
  subtitle?: string;
  seedTitles: string[];
}

export const STARTER_ROWS: StarterRow[] = [
  {
    title: 'Popular Starting Points',
    subtitle: 'Begin with proven all-timers',
    seedTitles: ['Pulp Fiction', 'Heat', 'Goodfellas', 'Seven', 'No Country for Old Men']
  },
  {
    title: 'Crime Classics',
    subtitle: 'Tight scripts, sharp tension',
    seedTitles: ['The Godfather', 'The French Connection', 'Chinatown', 'Thief', 'Reservoir Dogs']
  },
  {
    title: 'Neo-Noir Starter Pack',
    subtitle: 'Stylized dread and neon nights',
    seedTitles: ['Drive', 'Nightcrawler', 'Collateral', 'L.A. Confidential', 'Blade Runner 2049']
  },
  {
    title: 'Hidden Gems Streaming Now',
    subtitle: 'Underseen but worth your night',
    seedTitles: ['The Friends of Eddie Coyle', 'Sorcerer', 'Mikey and Nicky', 'Deep Cover', 'Thief']
  }
];

export const COURSES: Course[] = [
  {
    slug: 'michael-mann-starter',
    title: 'Michael Mann Starter',
    description: 'From procedural precision to neon existentialism.',
    theme: 'Director Journey',
    movies: [
      { title: 'Thief' },
      { title: 'Manhunter' },
      { title: 'Heat' },
      { title: 'The Insider' },
      { title: 'Collateral' }
    ]
  },
  {
    slug: 'paranoia-thrillers-70s',
    title: '70s Paranoia Thrillers',
    description: 'Institutions fail, truth corrodes, everyone is watched.',
    theme: 'Era + Tone',
    movies: [
      { title: 'The Conversation' },
      { title: 'Klute' },
      { title: 'Three Days of the Condor' },
      { title: 'All the President\'s Men' },
      { title: 'Marathon Man' }
    ]
  },
  {
    slug: 'erotic-thrillers-essentials',
    title: 'Erotic Thriller Essentials',
    description: 'Desire, danger, and bad decisions.',
    theme: 'Subgenre Path',
    movies: [
      { title: 'Body Heat' },
      { title: 'Basic Instinct' },
      { title: 'Fatal Attraction' },
      { title: 'Bound' },
      { title: 'In the Cut' }
    ]
  },
  {
    slug: 'neo-noir-essentials',
    title: 'Neo-Noir Essentials',
    description: 'Shadows, cynicism, and modern malaise.',
    theme: 'Vibe Path',
    movies: [
      { title: 'L.A. Confidential' },
      { title: 'Memento' },
      { title: 'Drive' },
      { title: 'Nightcrawler' },
      { title: 'Prisoners' }
    ]
  },
  {
    slug: 'scorsese-crime-run',
    title: 'Scorsese Crime Run',
    description: 'Ambition, guilt, and organized chaos.',
    theme: 'Director Journey',
    movies: [
      { title: 'Mean Streets' },
      { title: 'Goodfellas' },
      { title: 'Casino' },
      { title: 'The Departed' },
      { title: 'The Irishman' }
    ]
  }
];

export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find((course) => course.slug === slug);
}
