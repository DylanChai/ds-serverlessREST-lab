import { Movie, MovieCast } from '../shared/types';

export const movies: Movie[] = [
  {
    adult: false,
    backdrop_path: '/sRLC052ieEzkQs9dEtPMfFxYkej.jpg',
    genre_ids: [878],
    id: 1234,  // Updated ID to match MovieCast references
    original_language: 'en',
    original_title: 'Rebel Moon - Part One: A Child of Fire',
    overview: 'When a peaceful colony on the edge of the galaxy finds itself threatened by the armies of the tyrannical Regent Balisarius...',
    popularity: 2136.3,
    poster_path: '/6epeijccmJlnfvFitfGyfT7njav.jpg',
    release_date: '2023-12-15',
    title: 'Rebel Moon - Part One: A Child of Fire',
    video: false,
    vote_average: 6.4,
    vote_count: 750,
  },
  {
    adult: false,
    backdrop_path: '/jXJxMcVoEuXzym3vFnjqDW4ifo6.jpg',
    genre_ids: [28, 12, 14],
    id: 2345,  // Updated ID to match MovieCast references
    original_language: 'en',
    original_title: 'Aquaman and the Lost Kingdom',
    overview: "Black Manta, still driven by the need to avenge his father's death...",
    popularity: 1605.303,
    poster_path: '/8xV47NDrjdZDpkVcCFqkdHa3T0C.jpg',
    release_date: '2023-12-20',
    title: 'Aquaman and the Lost Kingdom',
    video: false,
    vote_average: 6.5,
    vote_count: 299,
  },
  {
    adult: false,
    backdrop_path: '/5a4JdoFwll5DRtKMe7JLuGQ9yJm.jpg',
    genre_ids: [18, 878, 28],
    id: 695721,
    original_language: 'en',
    original_title: 'The Hunger Games: The Ballad of Songbirds & Snakes',
    overview: '64 years before he becomes the tyrannical president of Panem...',
    popularity: 1509.974,
    poster_path: '/mBaXZ95R2OxueZhvQbcEWy2DqyO.jpg',
    release_date: '2023-11-15',
    title: 'The Hunger Games: The Ballad of Songbirds & Snakes',
    video: false,
    vote_average: 7.2,
    vote_count: 1181,
  },
  // ... Add other movie objects as needed ...
];

export const movieCasts: MovieCast[] = [
  {
    movieId: 1234,
    actorName: 'Joe Bloggs',
    roleName: 'Male Character 1',
    roleDescription: 'description of character 1',
  },
  {
    movieId: 1234,
    actorName: 'Alice Broggs',
    roleName: 'Female Character 1',
    roleDescription: 'description of character 2',
  },
  {
    movieId: 1234,
    actorName: 'Joe Cloggs',
    roleName: 'Male Character 2',
    roleDescription: 'description of character 3',
  },
  {
    movieId: 2345,
    actorName: 'Joe Bloggs',
    roleName: 'Male Character 1',
    roleDescription: 'description of character 3',
  },
];
