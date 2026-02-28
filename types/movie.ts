export interface StreamingSource {
  name: string;
  web_url: string;
  logo: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  poster: string;
  overview: string;
  genres: string[];
  runtime: number;
  imdbRating: number;
  streamingSources: StreamingSource[];
  notFound?: boolean;
}
