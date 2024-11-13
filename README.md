# Serverless REST web API.

## Serverless REST Assignment - Distributed Systems.

__Name:__ ....Dylan Chai .....

__Demo:__ ... [link to your YouTube video demonstration](https://youtu.be/lNbumAC3ru0) ......

### Context.

This prject is a serverless rest api for managing a club and player ingo using Distributed systems. The main Database tables used are dynamoDB tables. Each club hsa attriubtes such as an ID,name,city and founding year while each player is associated with a club.

### App API endpoints.

The primary data entities include:

Clubs Table: Stores data about each club, including:
id (number): Unique identifier for each club.
name (string): The name of the club.
city (string): The city where the club is based.
year_founded (number): The year the club was established.
translationCache (object): Stores cached translations to avoid repeat translation requests.
ClubPlayers Table: Stores data about players associated with each club, including:
clubId (number): Identifier linking the player to a club.
playerName (string): The player's name.
position (string): The player's position in the team (e.g., Forward, Midfielder).
age (number): The player's age.
nationality (string): The player's nationality.
appearances (number): The number of appearances the player has made.
value (number): The estimated value of the player.
App API Endpoints
Club Management:

POST /clubs - Add a new club to the database.
GET /clubs - Retrieve all clubs in the database.
GET /clubs/{clubId} - Retrieve details of a specific club by ID.
DELETE /clubs/{clubId} - Delete a specific club by ID.
GET /clubs/{clubId}/translate?language={languageCode} - Translate the club's name into a specified language.
Player Management:

GET /clubs/{clubId}/players - Retrieve all players for a specific club.
GET /clubs/{clubId}/players?position={position} - Retrieve players by position for a specific club.

### Update constraint (if relevant).

The update constraint is designed so that only a user who added a club can update it. This is done by verifying the identity of the user. Using authentication and validation ensure only the original creator can update the tables.

### Translation persistence (if relevant).

When a name is Translated into a different lanhaie tje result is stored in a cache with in the clubs database, this improved performance.

###  Extra (If relevant).

This project uses AWS CDK to define and deploy the infrastructure. A multi-stack approach is implemented to separate concerns and manage resources independently. Lambda Layers are used to store common dependencies and speed up deployment times, reducing the upload size for Lambda functions and simplifying updates.