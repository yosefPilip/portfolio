// Mix catalog for the DJ & Music coverflow. Add a new mix by appending one
// entry — the carousel and info panel are fully data-driven.

export interface Track {
  id: string;
  title: string;
  description: string;
  cover: string;
  href: string;
}

export const tracks: Track[] = [
  {
    id: 'summer-mix-02',
    title: 'Summer Mix 02',
    description: 'Sun-soaked house — the follow-up, deeper and more dub-leaning.',
    cover: 'https://i1.sndcdn.com/artworks-9qNGdBAkhrAkcwJ3-r2zzSg-t500x500.png',
    href: 'https://soundcloud.com/recursion-mp3/summer-mix-02-recursion',
  },
  {
    id: 'tech-house-mix-01',
    title: 'Tech House Mix',
    description: 'Rolling tech house — grooves, low-end, and late-night energy.',
    cover: 'https://i1.sndcdn.com/artworks-JX31KwMGjDSIy4nH-wz9Hqg-t500x500.jpg',
    href: 'https://soundcloud.com/recursion-mp3/tech-house-mix-01-recursion',
  },
  {
    id: 'summer-mix-01',
    title: 'Summer Mix 01',
    description: 'The original summer set — bright, melodic, made for daytime.',
    cover: 'https://i1.sndcdn.com/artworks-y6C6y79vCEIihnBM-simOdw-t500x500.png',
    href: 'https://soundcloud.com/recursion-mp3/summer-mix-01-recursion',
  },
  {
    id: 'victory-lap-dub',
    title: 'Victory Lap Dub',
    description: 'A dub-flavored victory lap — spacious, hypnotic, bass-forward.',
    cover: 'https://i1.sndcdn.com/artworks-yvizVfKxszpdM5SM-3uweVw-t500x500.png',
    href: 'https://soundcloud.com/recursion-mp3/victory-lap-dub-recursion-1',
  },
  {
    id: 'bathroom-mix',
    title: 'Bathroom Mix',
    description: 'The first live set — UK garage and house, raw and unfiltered.',
    cover: 'https://i1.sndcdn.com/artworks-2uphtHgoDZL8ZrOF-PGxXZg-t500x500.png',
    href: 'https://soundcloud.com/recursion-mp3/recursion-first-live-set-bathroom-mix-ukg-house',
  },
];
