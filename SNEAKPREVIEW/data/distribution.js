// Token distribution snapshot. Generated data: edit values here, or let the daily refresh script rewrite this file.
// ui.js sorts the wallets by size, so their order here does not matter.
window.DISTRIBUTION = {
  "snapshot": "2026-10-03",
  "snapshotLabel": "03 Oct 2026",
  "source": "Solscan",
  "note": "Balances read on-chain on 2026-10-03 at 06:29 UTC (token account balances; supply from getTokenSupply). Loaded as a script so the page also works when opened straight from the folder. To be rewritten daily by a script later. The community multisig (1,018,591 tokens) is not listed separately and counts as circulating.",
  "mint": "Cz7LGKdZPpAxonXx23ZYPW3RtDQvjcf17ZDCZEzFpump",
  "supply": 999339601,
  "circulatingDesc": "All other holders: every wallet outside the top 100 and the locked wallets above, plus exchanges.",
  "top100": {
    "label": "Top 100 holder wallets",
    "desc": "The 100 largest holders once the pools, staking vault and locks above are removed. Solscan holder export of 05 Oct 2026, so it can differ slightly from the 03 Oct balances.",
    "tokens": 610933096,
    "color": "#4A4D57",
    "snapshot": "2026-10-05"
  },
  "wallets": [
    {
      "key": "pumpswap",
      "label": "PumpSwap liquidity pool",
      "desc": "The main pool that lets anyone swap between SOL and 401jK.",
      "tokens": 56452222,
      "locked": true,
      "color": "#7A2CFF",
      "address": "DMd4wqtR6vKfppgMoxgQ3siST4mbEaqabwgPtKVEBwRX",
      "url": "https://solscan.io/account/DMd4wqtR6vKfppgMoxgQ3siST4mbEaqabwgPtKVEBwRX"
    },
    {
      "key": "staked",
      "label": "Staking vault",
      "desc": "Tokens holders have locked on staking.401jk.fun for three months or longer.",
      "tokens": 49883873,
      "locked": true,
      "color": "#08C932",
      "address": "8XH5QJWvFkmiwBJG1g9D7RUEYnnh1n1nEjQ2E9fJr65v",
      "url": "https://solscan.io/account/8XH5QJWvFkmiwBJG1g9D7RUEYnnh1n1nEjQ2E9fJr65v"
    },
    {
      "key": "jupiter",
      "label": "Jupiter lock",
      "desc": "Supply locked on Jupiter Lock and out of circulation until it unlocks.",
      "tokens": 20000000,
      "locked": true,
      "color": "#F51419",
      "address": "HXydCBvxBwLBX89M21ATqK5T7aJhD9TXbb5itp3QUFR7",
      "url": "https://solscan.io/account/HXydCBvxBwLBX89M21ATqK5T7aJhD9TXbb5itp3QUFR7"
    },
    {
      "key": "orca",
      "label": "Orca liquidity pool",
      "desc": "A second pool on Orca, so swaps don't depend on a single venue.",
      "tokens": 12490794,
      "locked": true,
      "color": "#F47B09",
      "address": "J1bnkuMEuua6aUS2mCQfziZJ3f3H1KqqcY8MRskpPan9",
      "url": "https://solscan.io/account/J1bnkuMEuua6aUS2mCQfziZJ3f3H1KqqcY8MRskpPan9"
    },
    {
      "key": "rewards",
      "label": "Staking rewards pool",
      "desc": "Donated by early holders to fund the rewards paid to stakers.",
      "tokens": 8901116,
      "locked": true,
      "color": "#FFD60A",
      "address": "57QBWweYjxCaYpGwc2CCneLErHk1Ccb5NfJS8C9Xgf1J",
      "url": "https://solscan.io/account/57QBWweYjxCaYpGwc2CCneLErHk1Ccb5NfJS8C9Xgf1J"
    }
  ]
};
