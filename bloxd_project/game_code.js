// ==================================================================================
// LOVERFELLA REPLICATE FOR BLOXD.IO
// ==================================================================================
// This script implements a custom economy, rank progression, property marketplace,
// and session-based rewards entirely through the Bloxd.io Shop GUI (B key).

// --- 1. Configuration & Constants ---
const GAME_NAME = "LoverFella Bloxd";
const STARTING_MONEY = 1000;
const SESSION_REWARD_MINUTES = 60;
const KEY_ITEM_NAME = "Unobtainable Item";
const CRATE_ITEM_NAME = "Lucky Block";
const CHUNK_SIZE = 32;
const CLAIM_COST = 500;

// Rank Cycle: Every 3rd rank focuses on PVP.
const RANKS = [
    { name: "Peasant", cost: 0, focus: "Start", effects: [] },
    { name: "Farmer", cost: 2000, focus: "Farming", effects: ["Speed"] },
    { name: "Miner", cost: 5000, focus: "Mining", effects: ["Haste"] },
    { name: "Warrior", cost: 15000, focus: "PVP", effects: ["Damage"] },
    { name: "Lumberjack", cost: 30000, focus: "Chopping", effects: ["Haste"] },
    { name: "Excavator", cost: 60000, focus: "Digging", effects: ["Speed"] },
    { name: "Knight", cost: 150000, focus: "PVP", effects: ["Damage", "Speed"] },
    { name: "Architect", cost: 300000, focus: "Building", effects: ["Jump"] },
    { name: "Scout", cost: 600000, focus: "Scouting", effects: ["Speed", "Jump"] },
    { name: "Berserker", cost: 1500000, focus: "PVP", effects: ["Damage"] }
];

// --- 2. Database Helpers ---

function getPlayerMoney(id) { return Number(api.getPlayerDbValue(id, "money")) || STARTING_MONEY; }
function setPlayerMoney(id, val) { api.setPlayerDbValue(id, "money", val); }
function getPlayerRank(id) { return Number(api.getPlayerDbValue(id, "rankIdx")) || 0; }
function setPlayerRank(id, val) { api.setPlayerDbValue(id, "rankIdx", val); }

function getChunkData(chunkId) {
    const raw = api.getLobbyDbValue("chunk_" + chunkId);
    return raw ? JSON.parse(raw) : null;
}
function setChunkData(chunkId, data) {
    api.setLobbyDbValue("chunk_" + chunkId, JSON.stringify(data));
}

function getMarketplace() {
    const raw = api.getLobbyDbValue("marketplace");
    return raw ? JSON.parse(raw) : [];
}
function setMarketplace(list) {
    api.setLobbyDbValue("marketplace", JSON.stringify(list));
}

function getChunkId(pos) {
    return `${Math.floor(pos[0] / CHUNK_SIZE)},${Math.floor(pos[1] / CHUNK_SIZE)},${Math.floor(pos[2] / CHUNK_SIZE)}`;
}

// --- 3. Shop GUI logic ---

function updateShop(playerId) {
    const money = getPlayerMoney(playerId);
    const rankIdx = getPlayerRank(playerId);
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const dbId = api.getPlayerDbId(playerId);

    // Ranks Category
    if (rankIdx < RANKS.length - 1) {
        const nextRank = RANKS[rankIdx + 1];
        api.createShopItemForPlayer(playerId, "Ranks", "buy_rank", {
            name: "Upgrade to " + nextRank.name,
            price: nextRank.cost,
            description: "Become a " + nextRank.name + " (" + nextRank.focus + " focus)",
            canBuy: money >= nextRank.cost
        });
    }

    // Real Estate Category
    if (!chunk) {
        api.createShopItemForPlayer(playerId, "Real Estate", "claim", {
            name: "Claim This Chunk",
            price: CLAIM_COST,
            description: "Protect your builds here.",
            canBuy: money >= CLAIM_COST
        });
    } else if (chunk.ownerDbId === dbId) {
        api.createShopItemForPlayer(playerId, "Real Estate", "set_tp", {
            name: "Set Home TP",
            price: 0,
            description: "Set where people arrive in this chunk."
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "toggle_tp", {
            name: chunk.tpOpen ? "Close TP (Private)" : "Open TP (Public)",
            price: 0,
            description: "Control if others can TP here."
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "add_trust", {
            name: "Trust Player",
            price: 0,
            description: "Enter name to allow building.",
            userInput: { placeholder: "Player Name" }
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "sell", {
            name: "List for Sale",
            price: 0,
            description: "Put this chunk on the marketplace.",
            userInput: { placeholder: "Price" }
        });
    }

    // Marketplace Category
    const market = getMarketplace();
    market.forEach((item, idx) => {
        api.createShopItemForPlayer(playerId, "Marketplace", "market_" + idx, {
            name: item.name + " (" + item.price + "$)",
            price: item.price,
            description: "Buy/TP to property from " + item.ownerName,
            canBuy: true // Allow interaction for both Buy and TP
        });
    });

    // Crate Exchange
    api.createShopItemForPlayer(playerId, "Crates", "buy_lucky", {
        name: "Buy Lucky Block",
        price: 0,
        description: "Swap 1 " + KEY_ITEM_NAME + " for a Lucky Block.",
        canBuy: api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1
    });
}

// --- 4. Event Handlers ---

onPlayerChangeBlock = function(playerId, x, y, z, blockName) {
    const chunkId = getChunkId([x, y, z]);
    const chunk = getChunkData(chunkId);
    if (!chunk) return;

    const dbId = api.getPlayerDbId(playerId);
    if (chunk.ownerDbId === dbId || (chunk.trusted && chunk.trusted.includes(dbId))) return;

    api.sendMessage(playerId, "&cOwned by " + chunk.ownerName);
    return "preventChange";
};

onPlayerJoin = function(playerId) {
    updateShop(playerId);
};

onPlayerBoughtShopItem = function(playerId, categoryKey, itemKey, userInput) {
    const dbId = api.getPlayerDbId(playerId);
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);

    if (itemKey === "buy_rank") {
        const nextIdx = getPlayerRank(playerId) + 1;
        setPlayerMoney(playerId, getPlayerMoney(playerId) - RANKS[nextIdx].cost);
        setPlayerRank(playerId, nextIdx);
        api.broadcastMessage("&a" + api.getEntityName(playerId) + " is now a " + RANKS[nextIdx].name + "!");
    }

    if (itemKey === "claim") {
        setPlayerMoney(playerId, getPlayerMoney(playerId) - CLAIM_COST);
        setChunkData(chunkId, {
            ownerDbId: dbId, ownerName: api.getEntityName(playerId),
            trusted: [], tpPoint: pos, tpOpen: false, forSale: false, price: 0
        });
        api.sendMessage(playerId, "&aChunk claimed!");
    }

    if (itemKey === "sell") {
        const chunk = getChunkData(chunkId);
        const price = Number(userInput);
        if (chunk && chunk.ownerDbId === dbId && !isNaN(price)) {
            chunk.forSale = true; chunk.price = price;
            setChunkData(chunkId, chunk);
            const market = getMarketplace();
            market.push({ chunkId, price, ownerName: chunk.ownerName, name: "Plot @ " + chunkId });
            setMarketplace(market);
            api.sendMessage(playerId, "&aListed for $" + price);
        }
    }

    if (itemKey === "add_trust") {
        const chunk = getChunkData(chunkId);
        const targetId = api.getPlayerId(userInput);
        if (chunk && chunk.ownerDbId === dbId && targetId) {
            const tDbId = api.getPlayerDbId(targetId);
            if (!chunk.trusted.includes(tDbId)) {
                chunk.trusted.push(tDbId); setChunkData(chunkId, chunk);
                api.sendMessage(playerId, "&aTrusted " + userInput);
            }
        }
    }

    if (itemKey.startsWith("market_")) {
        const idx = parseInt(itemKey.split("_")[1]);
        const market = getMarketplace();
        const listing = market[idx];
        const targetChunk = getChunkData(listing.chunkId);
        const money = getPlayerMoney(playerId);

        if (targetChunk.ownerDbId !== dbId && money >= listing.price) {
             setPlayerMoney(playerId, money - listing.price);
             targetChunk.ownerDbId = dbId; targetChunk.ownerName = api.getEntityName(playerId);
             targetChunk.forSale = false; targetChunk.trusted = [];
             setChunkData(listing.chunkId, targetChunk);
             market.splice(idx, 1); setMarketplace(market);
             api.sendMessage(playerId, "&aPurchased!");
        } else if (targetChunk.tpOpen || targetChunk.ownerDbId === dbId) {
             api.setPosition(playerId, targetChunk.tpPoint);
        }
    }

    if (itemKey === "set_tp") {
        const chunk = getChunkData(chunkId);
        if (chunk && chunk.ownerDbId === dbId) {
            chunk.tpPoint = pos; setChunkData(chunkId, chunk);
            api.sendMessage(playerId, "&aTP set!");
        }
    }

    if (itemKey === "toggle_tp") {
        const chunk = getChunkData(chunkId);
        if (chunk && chunk.ownerDbId === dbId) {
            chunk.tpOpen = !chunk.tpOpen; setChunkData(chunkId, chunk);
            api.sendMessage(playerId, "&aTP: " + (chunk.tpOpen ? "Open" : "Closed"));
        }
    }

    if (itemKey === "buy_lucky") {
        api.removeItemName(playerId, KEY_ITEM_NAME, 1);
        api.giveItem(playerId, CRATE_ITEM_NAME, 1);
        api.sendMessage(playerId, "&eLucky Block received!");
    }

    updateShop(playerId);
};

// --- 5. Main Loop ---

const PLAYER_TIMERS = {};

tick = function() {
    const allPlayers = api.getPlayerIds();
    const now = api.now();

    allPlayers.forEach(p => {
        // Hourly Reward
        if (!PLAYER_TIMERS[p]) PLAYER_TIMERS[p] = now;
        if (now - PLAYER_TIMERS[p] >= SESSION_REWARD_MINUTES * 60000) {
            api.giveItem(p, KEY_ITEM_NAME, 1);
            api.broadcastMessage("&6[LoverFella] &e" + api.getEntityName(p) + " earned a " + KEY_ITEM_NAME + "!");
            PLAYER_TIMERS[p] = now;
        }

        // Sidebar HUD
        if (Math.floor(now / 500) % 2 === 0) {
            const chunk = getChunkData(getChunkId(api.getPosition(p)));
            api.sendTopRightHelper(p, "fas fa-crown", GAME_NAME, {
                duration: 1, text: `${GAME_NAME} | Owner: ${chunk ? chunk.ownerName : "Wilderness"} | Players: ${allPlayers.length}`
            });
        }

        // Rank Buffs
        const rank = RANKS[getPlayerRank(p)];
        rank.effects.forEach(eff => api.applyEffect(p, eff, 2000, { level: 1 }));
    });
};
