const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDBServerObjectToResponseObject1 = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertDBServerObjectToResponseObject2 = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//Get Players API
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    SELECT *
    FROM player_details
    ORDER BY player_id;`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(
    playersArray.map((eachObject) =>
      convertDBServerObjectToResponseObject1(eachObject)
    )
  );
});

//Get player API
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT * 
    FROM player_details
    WHERE player_id = ${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(convertDBServerObjectToResponseObject1(player));
});

//Update player API
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    UPDATE player_details
    SET
        player_name = '${playerName}'
    WHERE player_id = ${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//Get match details API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
    SELECT * 
    FROM match_details
    WHERE match_id = ${matchId};`;
  const matchDetails = await db.get(getMatchDetailsQuery);
  response.send(convertDBServerObjectToResponseObject2(matchDetails));
});

//Get player matches details API
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesDetailsQuery = `
    SELECT match_details.match_id, match_details.match, match_details.year
    FROM (player_details INNER JOIN player_match_score ON 
    player_details.player_id = player_match_score.player_id) AS T
    INNER JOIN match_details ON
    T.match_id = match_details.match_id
    WHERE T.player_id = ${playerId};`;
  const playerMatchesDetails = await db.all(getPlayerMatchesDetailsQuery);
  response.send(
    playerMatchesDetails.map((eachObject) =>
      convertDBServerObjectToResponseObject2(eachObject)
    )
  );
});

//Get players details according to match API
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersDetailsWithMatchesQuery = `
    SELECT player_details.player_id, player_details.player_name
    FROM (player_details INNER JOIN player_match_score ON 
    player_details.player_id = player_match_score.player_id) AS T
    INNER JOIN match_details ON
    T.match_id = match_details.match_id
    WHERE T.match_id = ${matchId};`;
  const playersArray = await db.all(getPlayersDetailsWithMatchesQuery);
  response.send(
    playersArray.map((eachObject) =>
      convertDBServerObjectToResponseObject1(eachObject)
    )
  );
});

//Get player score details API
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoresDetailsQuery = `
    SELECT T.player_id, T.player_name, SUM(T.score), SUM(T.fours), SUM(T.sixes) 
    FROM (player_details INNER JOIN player_match_score ON 
    player_details.player_id = player_match_score.player_id) AS T
    INNER JOIN match_details ON
    T.match_id = match_details.match_id
    WHERE T.player_id = ${playerId};`;
  const playerScores = await db.get(getPlayerScoresDetailsQuery);
  response.send({
    playerId: playerScores["player_id"],
    playerName: playerScores["player_name"],
    totalScore: playerScores["SUM(T.score)"],
    totalFours: playerScores["SUM(T.fours)"],
    totalSixes: playerScores["SUM(T.sixes)"],
  });
});

module.exports = app;
