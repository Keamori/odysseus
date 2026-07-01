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
const CHUNK_SIZE = 64;
const CLAIM_COST = 500;

// Rank Progression: Providing permanent stat boosts or kits.
const RANKS = [
    { name: "Peasant", cost: 0, focus: "Start", effects: [], kit: null },
    { name: "Farmer", cost: 2000, focus: "Farming", effects: ["Speed"], kit: { items: ["Gold Bar"], amounts: [5] } },
    { name: "Miner", cost: 5000, focus: "Mining", effects: ["Haste"], kit: { items: ["Iron Pickaxe"], amounts: [1] } },
    { name: "Warrior", cost: 15000, focus: "PVP", effects: ["Damage"], kit: { items: ["Iron Sword"], amounts: [1] } },
    { name: "Lumberjack", cost: 30000, focus: "Chopping", effects: ["Haste"], kit: { items: ["Iron Axe"], amounts: [1] } },
    { name: "Excavator", cost: 60000, focus: "Digging", effects: ["Speed"], kit: { items: ["Iron Shovel"], amounts: [1] } },
    { name: "Knight", cost: 150000, focus: "PVP", effects: ["Damage", "Speed"], kit: { items: ["Diamond Sword"], amounts: [1] } },
    { name: "Architect", cost: 300000, focus: "Building", effects: ["Jump Boost"], kit: { items: ["Gold Bar"], amounts: [50] } },
    { name: "Scout", cost: 600000, focus: "Speed", effects: ["Speed", "Jump Boost"], kit: { items: ["Speed Potion"], amounts: [3] } },
    { name: "Berserker", cost: 1500000, focus: "PVP", effects: ["Damage", "Speed", "Haste"], kit: { items: ["Diamond Axe"], amounts: [1] } }
];

// --- 2. Database Helpers ---

function getPlayerMoney(id) { return Number(api.getPlayerDbValue(id, "money")) || STARTING_MONEY; }
function setPlayerMoney(id, val) { api.setPlayerDbValue(id, "money", val); }
function getPlayerRank(id) { return Number(api.getPlayerDbValue(id, "rankIdx")) || 0; }
function setPlayerRank(id, val) { api.setPlayerDbValue(id, "rankIdx", val); }

function getOwnedChunks(id) {
    const raw = api.getPlayerDbValue(id, "ownedChunks");
    return raw ? raw.split(",") : [];
}
function addOwnedChunk(id, chunkId) {
    const chunks = getOwnedChunks(id);
    if (!chunks.includes(chunkId)) {
        chunks.push(chunkId);
        api.setPlayerDbValue(id, "ownedChunks", chunks.join(","));
    }
}
function removeOwnedChunk(id, chunkId) {
    const chunks = getOwnedChunks(id);
    const idx = chunks.indexOf(chunkId);
    if (idx >= 0) {
        chunks.splice(idx, 1);
        api.setPlayerDbValue(id, "ownedChunks", chunks.join(","));
    }
}

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
    // Bloxd api.getPosition returns {x, y, z}
    return `${Math.floor(pos.x / CHUNK_SIZE)},${Math.floor(pos.y / CHUNK_SIZE)},${Math.floor(pos.z / CHUNK_SIZE)}`;
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
        api.createShopItemForPlayer(playerId, "Real Estate", "tp_home", {
            name: "Teleport Home",
            price: 0,
            description: "Teleport to your home point in this chunk."
        });
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

    // Marketplace
    const market = getMarketplace();
    market.forEach((item) => {
        const itemKey = "market_" + item.chunkId;
        api.createShopItemForPlayer(playerId, "Marketplace", itemKey, {
            name: item.name + " (" + item.price + "$)",
            price: item.price,
            description: "Purchase property from " + item.ownerName,
            canBuy: money >= item.price && item.ownerDbId !== dbId
        });

        // If owner opened it, allow visiting
        if (item.tpOpen) {
             api.createShopItemForPlayer(playerId, "Visit Islands", "tp_" + item.chunkId, {
                name: "Island: " + item.ownerName,
                price: 0,
                description: "Teleport to this island."
            });
        }
    });

    // My Islands
    const owned = getOwnedChunks(playerId);
    owned.forEach((cId) => {
        api.createShopItemForPlayer(playerId, "My Islands", "my_tp_" + cId, {
            name: "Island @ " + cId,
            price: 0,
            description: "Teleport to this owned chunk."
        });
    });

    // Kits Category
    const currentRank = RANKS[rankIdx];
    if (currentRank.kit) {
        api.createShopItemForPlayer(playerId, "Kits", "claim_kit", {
            name: "Claim " + currentRank.name + " Kit",
            price: 0,
            description: "Get your rank daily items."
        });
    }

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
    const chunkId = getChunkId({x, y, z});
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
        addOwnedChunk(playerId, chunkId);
        api.sendMessage(playerId, "&aChunk claimed!");
    }

    if (itemKey === "sell") {
        const chunk = getChunkData(chunkId);
        const price = Number(userInput);
        if (chunk && chunk.ownerDbId === dbId && !isNaN(price)) {
            chunk.forSale = true; chunk.price = price;
            setChunkData(chunkId, chunk);
            const market = getMarketplace();
            // Update or Add to market
            const existingIdx = market.findIndex(m => m.chunkId === chunkId);
            const entry = { chunkId, price, ownerName: chunk.ownerName, name: "Plot @ " + chunkId, ownerDbId: dbId, tpOpen: chunk.tpOpen };
            if (existingIdx >= 0) market[existingIdx] = entry;
            else market.push(entry);
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
        const targetChunkId = itemKey.replace("market_", "");
        const market = getMarketplace();
        const listingIdx = market.findIndex(m => m.chunkId === targetChunkId);
        const listing = market[listingIdx];
        const targetChunk = getChunkData(targetChunkId);
        const money = getPlayerMoney(playerId);

        if (targetChunk && targetChunk.ownerDbId !== dbId && money >= listing.price) {
             const oldOwner = targetChunk.ownerDbId;
             // Update database ownership tracking
             // Note: we'd need player ID from dbId for better tracking in a real lobby,
             // for now we manage the current player's list.
             addOwnedChunk(playerId, targetChunkId);

             setPlayerMoney(playerId, money - listing.price);
             targetChunk.ownerDbId = dbId; targetChunk.ownerName = api.getEntityName(playerId);
             targetChunk.forSale = false; targetChunk.trusted = [];
             setChunkData(targetChunkId, targetChunk);
             market.splice(listingIdx, 1); setMarketplace(market);
             api.sendMessage(playerId, "&aPurchased!");
        }
    }

    if (itemKey.startsWith("my_tp_")) {
        const targetChunkId = itemKey.replace("my_tp_", "");
        const targetChunk = getChunkData(targetChunkId);
        if (targetChunk && targetChunk.ownerDbId === dbId) {
            api.setPosition(playerId, targetChunk.tpPoint.x, targetChunk.tpPoint.y, targetChunk.tpPoint.z);
            api.sendMessage(playerId, "&aTeleported to island.");
        }
    }

    if (itemKey === "tp_home") {
        const chunk = getChunkData(chunkId);
        if (chunk && chunk.ownerDbId === dbId) {
            api.setPosition(playerId, chunk.tpPoint.x, chunk.tpPoint.y, chunk.tpPoint.z);
            api.sendMessage(playerId, "&aTeleported home.");
        }
    }

    if (itemKey.startsWith("tp_")) {
        const targetChunkId = itemKey.replace("tp_", "");
        const targetChunk = getChunkData(targetChunkId);
        if (targetChunk && (targetChunk.tpOpen || targetChunk.ownerDbId === dbId)) {
             api.setPosition(playerId, targetChunk.tpPoint.x, targetChunk.tpPoint.y, targetChunk.tpPoint.z);
             api.sendMessage(playerId, "&aTeleported to island.");
        }
    }

    if (itemKey === "claim_kit") {
        const rank = RANKS[getPlayerRank(playerId)];
        const lastKit = Number(api.getPlayerDbValue(playerId, "lastKit")) || 0;
        const now = api.now();
        if (now - lastKit >= 24 * 60 * 60 * 1000) { // 24h cooldown
            rank.kit.items.forEach((it, i) => {
                api.giveItem(playerId, it, rank.kit.amounts[i]);
            });
            api.setPlayerDbValue(playerId, "lastKit", now);
            api.sendMessage(playerId, "&aKit claimed!");
        } else {
            api.sendMessage(playerId, "&cKit available in " + Math.ceil((24*60*60*1000 - (now-lastKit))/3600000) + " hours.");
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
            // Sync with marketplace if listed
            const market = getMarketplace();
            const mIdx = market.findIndex(m => m.chunkId === chunkId);
            if (mIdx >= 0) {
                market[mIdx].tpOpen = chunk.tpOpen;
                setMarketplace(market);
            }
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

        // Sidebar HUD (Top Right is the standard for custom code)
        if (Math.floor(now / 500) % 2 === 0) {
            const chunk = getChunkId(api.getPosition(p));
            const cData = getChunkData(chunk);
            const statusText = `Owner: ${cData ? cData.ownerName : "Wilderness"} | Rank: ${RANKS[getPlayerRank(p)].name}`;
            // Corrected signature: (playerId, icon, text, options)
            api.sendTopRightHelper(p, "fas fa-crown", statusText, {
                duration: 1
            });
        }

        // Rank Buffs
        const rank = RANKS[getPlayerRank(p)];
        rank.effects.forEach(eff => api.applyEffect(p, eff, 2000, { level: 1 }));

        // Instant Sell Guidance (LoverFella SMP style)
        // Note: Actual selling is handled by Bloxd's built-in SMP system settings,
        // but we can provide a shortcut to the shop or info here if needed.
    });
};
