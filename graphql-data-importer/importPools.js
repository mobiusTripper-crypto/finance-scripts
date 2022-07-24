import { google } from "googleapis";
import {
  getBlockForDate,
  getBlockForCurrentDate,
  getAllPools,
} from "./graph.js";
import {
  getAuthorization,
  getSpreadsheetProperites,
  getDataSheetProperties,
  copyPasteNewRows,
} from "./sheets.js";
import moment from "moment-timezone";

console.log("fantom import start");
try {
  await importPoolsFantom();
} catch (error) {
  console.log("fantom import error", error.message);
}

console.log("optimism import start");
try {
  await importPoolsOptimism();
} catch (error) {
  console.log("optimism import error", error.message);
}

//"1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS
// 1eqnNNmEINlM2gLSKMdeyJvfZBrCutnTaLnUudQItCyY //test spreadsheet
async function importPoolsFantom() {
  const oAuth2Client = await getAuthorization();
  await addPoolDatabaseRows(
    oAuth2Client,
    "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A",
    "Database",
    0
  );
}

async function importPoolsOptimism() {
  const oAuth2Client = await getAuthorization();
  await addPoolDatabaseRows(
    oAuth2Client,
    "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A",
    "DatabaseOptimism",
    1
  );
}

async function addPoolDatabaseRows(auth, sheetID, databaseName, networkIndex) {
  console.log(
    "\nStart Pool Import",
    new Date().toString(),
    sheetID,
    databaseName,
    networkIndex
  );

  const SPREADSHEET_ID = sheetID;

  const SHEET_NAME = databaseName;

  const appAuthorization = google.sheets({ version: "v4", auth });

  /*  RUN FOR DATE ENTERED  */
  // const startDate = new Date(2022, 5, 2);
  // const endDate = moment.tz(new Date(2022, 6, 23), "GMT").startOf("day").unix();
  // let lastRunTimestamp = 0;
  // while (lastRunTimestamp <= endDate) {
  //   const { blockNumber, timestamp, runDateUTC } = await getBlockForDate(
  //     startDate,
  //     networkIndex
  //   );

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
    const pools = await getAllPools(blockNumber, networkIndex);

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

  //lastRunTimestamp = timestamp;
  // }
  console.log("Pool Import Sucessful");
}
