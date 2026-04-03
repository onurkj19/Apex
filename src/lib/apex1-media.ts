/** Foto statike në `/public` (slideshow në hero). */
export const APEX1_MEDIA = {
  heroPoster: '/apex1-hero-poster.jpg',
  about: '/apex1-about.jpg',
  extra: '/apex1-extra.jpg',
} as const;

export const APEX1_HERO_SLIDES = [
  { src: APEX1_MEDIA.heroPoster, alt: 'Apex Gerüste – Gerüstlösungen' },
  { src: APEX1_MEDIA.about, alt: 'Apex Gerüste – Baustelle' },
  { src: APEX1_MEDIA.extra, alt: 'Apex Gerüste – Einsatz' },
] as const;
