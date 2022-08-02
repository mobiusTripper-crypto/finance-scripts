import { GraphQLClient, gql } from "graphql-request";
import moment from "moment-timezone";

const BEETHOVENX_ENDPOINT = [
  "https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx",
  "https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism",
];

const MASTERCHEF_ENDPOINT = [
  "https://api.thegraph.com/subgraphs/name/beethovenxfi/masterchefv2",
  "https://api.thegraph.com/subgraphs/name/beethovenxfi/balancer-gauges-optimism",
];
const FANTOM_BLOCKS_ENDPOINT = [
  "https://api.thegraph.com/subgraphs/name/beethovenxfi/fantom-blocks",
  "https://api.thegraph.com/subgraphs/name/danielmkm/optimism-blocks",
];

export async function getBlockForCurrentDate(networkIndex) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  return getBlockForDate(startDate, networkIndex);
}

export async function getBlockForDate(startDate, networkIndex) {
  let timestamp = 0;
  const runDateUTC = moment.tz(startDate, "GMT").startOf("day");
  startDate.setDate(startDate.getDate() + 1);
  timestamp = moment.tz(startDate, "GMT").startOf("day").unix();

  const blockNumber = await getBlockForTimestamp(timestamp, networkIndex);

  console.log("import run:%s, %i", runDateUTC.format(), timestamp, blockNumber);

  return { blockNumber, timestamp, runDateUTC };
}

export async function getAllPools(blockNumber, networkIndex) {
  const getPoolsQuery = gql`
    query getpools($blocknumber: Int!) {
      pools(
        first: 1000
        orderDirection: desc
        orderBy: totalLiquidity
        block: { number: $blocknumber }
        where: { totalLiquidity_gt: 4999 }
      ) {
        name
        address
        poolType
        swapFee
        swapsCount
        symbol
        totalLiquidity
        totalShares
        totalSwapFee
        totalSwapVolume
      }
    }
  `;

  const client = new GraphQLClient(BEETHOVENX_ENDPOINT[networkIndex]);
  const variables = { blocknumber: Number(blockNumber) };

  const response = await client.request(getPoolsQuery, variables);

  return response.pools;
}

export async function getEmissionsData(blockNumber, networkIndex) {
  const getEmissionsQuery = gql`
    query getEmissions($blocknumber: Int!) {
      pools(block: { number: $blocknumber }, where: { rewarder_gte: "0" }) {
        pair
        allocPoint
        rewarder {
          rewardTokens {
            token
            symbol
            rewardPerSecond
          }
        }
      }
    }
  `;

  const client = new GraphQLClient(MASTERCHEF_ENDPOINT[networkIndex]);
  const variables = { blocknumber: Number(blockNumber) };
  const response = await client.request(getEmissionsQuery, variables);

  return response.pools;
}

export async function getTokenData(blockNumber, networkIndex) {
  const getTokensQuery = gql`
    query getTokens($blocknumber: Int!) {
      tokens(first: 1000, skip: 0, block: { number: $blocknumber }) {
        symbol
        name
        address
        decimals
        latestPrice {
          priceUSD
        }
      }
    }
  `;

  const client = new GraphQLClient(BEETHOVENX_ENDPOINT[networkIndex]);
  const variables = { blocknumber: Number(blockNumber) };

  const response = await client.request(getTokensQuery, variables);

  return response.tokens;
}

export async function getBeetsPerBlock(blockNumber, networkIndex) {
  const getBeetsPerBlockQuery = gql`
    query getBeetsPerBlock($blocknumber: Int!) {
      masterChefs(block: { number: $blocknumber }) {
        beetsPerBlock
      }
    }
  `;

  const client = new GraphQLClient(MASTERCHEF_ENDPOINT[networkIndex]);
  const variables = { blocknumber: Number(blockNumber) };

  const response = await client.request(getBeetsPerBlockQuery, variables);

  return response.masterChefs;
}

function blockQuery(timestamp) {
  return gql`
  query getblock {
    blocks(
      orderBy: timestamp
      first: 1
      orderDirection: asc
      where: {timestamp_gt: ${timestamp}}
    ) {
      number
      timestamp
    }
  }
  `;

  return gql`
query getblock {
  blocks(orderBy: timestamp,
    orderDirection: desc,
    where: { timestamp_gt: ${timestamp - 8},
             timestamp_lt: ${timestamp + 8} }) {
    number
    timestamp
  }
}
`;
}

async function getBlockForTimestamp(timestamp, networkIndex) {
  const endpoint = FANTOM_BLOCKS_ENDPOINT[networkIndex];

  const client = new GraphQLClient(endpoint);
  const data = await client.request(blockQuery(timestamp));

  if (!data.blocks || data.blocks.length === 0) {
    console.log("block not found for timestamp: ", timestamp);
    process.exit(1);
  }
  return data.blocks[0].number;
}
