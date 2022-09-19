import { google } from "googleapis";
import {
  getBlockForDate,
  getBlockForCurrentDate,
  getAllPoolsForCompetition,
} from "./graph.js";
import {
  getAuthorization,
  getSpreadsheetProperites,
  getDataSheetProperties,
  copyPasteNewRows,
} from "./sheets.js";
import moment from "moment-timezone";

console.log("competition import start");
try {
  await importPoolsForCompetition();
} catch (error) {
  console.log("competition import error", error.message);
}

//"1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS
// 1eqnNNmEINlM2gLSKMdeyJvfZBrCutnTaLnUudQItCyY //test spreadsheet
async function importPoolsForCompetition() {
  const oAuth2Client = await getAuthorization();
  await addPoolDatabaseRowsForCompetition(
    oAuth2Client,
    "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A",
    "DatabaseCompetition",
    0
  );
}

async function addPoolDatabaseRowsForCompetition(
  auth,
  sheetID,
  databaseName,
  networkIndex
) {
  console.log(
    "Start Pool Import",
    new Date().toString(),
    sheetID,
    databaseName,
    networkIndex
  );

  const SPREADSHEET_ID = sheetID;

  const SHEET_NAME = databaseName;

  const appAuthorization = google.sheets({ version: "v4", auth });

  /*  RUN FOR DATE ENTERED  */
  //  const startDate = new Date(2022, 7, 12);
  // const endDate = moment.tz(new Date(2022, 7, 2), "GMT").startOf("day").unix();
  // let lastRunTimestamp = 0;
  // while (lastRunTimestamp <= endDate) {
  // const { blockNumber, timestamp, runDateUTC } = await getBlockForDate(
  //   startDate,
  //   networkIndex
  // );

  /* RUN FOR CURRENT DATE */
  const { blockNumber, timestamp, runDateUTC } = await getBlockForCurrentDate(
    networkIndex
  );

  const spreadsheetProperties = await getSpreadsheetProperites(
    appAuthorization,
    SPREADSHEET_ID
  );

  const { databaseSheetId, lastRowIndex, isTimestampInSheet } =
    await getDataSheetProperties(
      appAuthorization,
      spreadsheetProperties,
      SHEET_NAME,
      timestamp,
      "F"
    );

  if (!isTimestampInSheet) {
    const pools = await getAllPoolsForCompetition(blockNumber, networkIndex);

    const completePools = pools.map((pool, index) => {
      const orderedPool = {
        rank: (index + 1).toString(),
        date: runDateUTC.format("MM/DD/YYYY"),
        blockNumber: blockNumber,
        timeStamp: timestamp.toString(),
        address: pool.address,
        poolType: pool.poolType,
        name: pool.name,
        swapFee: pool.swapFee,
        swapsCount: pool.swapsCount,
        symbol: pool.symbol,
        totalLiquidity: pool.totalLiquidity,
        totalShares: pool.totalShares,
        totalSwapFee: pool.totalSwapFee,
        totalSwapVolume: pool.totalSwapVolume,
        holdersCount: pool.holdersCount,
      };

      return orderedPool;
    });

    const values = completePools.map((pool) => Object.values(pool));

    await copyPasteNewRows(
      appAuthorization,
      SPREADSHEET_ID,
      databaseSheetId,
      pools.length,
      lastRowIndex
    );

    const output = await appAuthorization.spreadsheets.values.update(
      {
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME + "!C" + (lastRowIndex + 1).toString(),
        valueInputOption: "USER_ENTERED",
        resource: { values },
      },
      (err) => {
        if (err) return console.log("The API returned an error: " + err);
      }
    );
  } else console.log("Pool Database already in spreadsheet for timestamp");

  //   lastRunTimestamp = timestamp;
  // }
  console.log("Pool Import Sucessful\n");
}
