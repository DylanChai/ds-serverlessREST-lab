export type Club = {
  id: number;
  city: string;
  name: string;
  year_founded: number;
};

export type ClubPlayer = {
  clubId: number;
  playerName: string;
  value: number;
  age: number;
  nationality: string;
  appearances: number;
  club: string;
  league: string;
  position: string;
};

// Used to validate the query string of HTTP GET requests
export type ClubPlayerQueryParams = {
  clubId: string;
  playerName?: string;
  position?: string;
};
