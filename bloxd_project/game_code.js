// ==================================================================================
// LOVERFELLA REPLICATE FOR BLOXD.IO
// ==================================================================================
// This script implements a custom economy, rank progression, property marketplace,
// and session-based rewards entirely through the Bloxd.io Shop GUI (B key).

// --- 1. Configuration & Constants ---
const GAME_NAME = "LoverFella Bloxd";
const STARTING_TOKENS = 1000;
const SESSION_REWARD_MINUTES = 60;
const KEY_ITEM_NAME = "Dark Green Bricks";
const CRATE_ITEM_NAME = "Lucky Block";
const CHUNK_SIZE = 64;
const CLAIM_COST = 500;

// Data-Driven Shop Configuration for Resource Exchanges
const SHOP_CONFIG = {
    "Blocks": {
        "STONE": {
            gives: [{ item: "Stone", amount: 1 }],
            takes: [{ item: "Wheat", amount: 9 }],
            description: "Purchase 1 Stone for 9 Wheat"
        },
        "REDCONCRETE": {
            gives: [{ item: "Red Concrete", amount: 1 }],
            takes: [{ item: "Bread", amount: 8 }, { item: "Corn", amount: 3}],
            description: "Purchase red concrete for 8 Bread + 3 Corn"
        }
    },
    "Crates": {
        "LUCKY_BLOCK": {
            gives: [{ item: "Lucky Block", amount: 1 }],
            takes: [{ item: "Dark Green Bricks", amount: 1 }],
            description: "Swap 1 Dark Green Bricks for 1 Lucky Block"
        }
    }
};

// Rank Progression: Providing permanent stat boosts, kits, and nametag icons.
const RANKS = [
    { name: "Peasant", cost: 0, focus: "Start", effects: [], kit: null, icon: "user", color: "gray" },
    { name: "Farmer", cost: 2000, focus: "Farming", effects: ["Speed"], kit: { items: ["Gold Bar"], amounts: [5] }, icon: "leaf", color: "green" },
    { name: "Miner", cost: 5000, focus: "Mining", effects: ["Haste"], kit: { items: ["Iron Pickaxe"], amounts: [1] }, icon: "pickaxe", color: "lightblue" },
    { name: "Warrior", cost: 15000, focus: "PVP", effects: ["Damage"], kit: { items: ["Iron Sword"], amounts: [1] }, icon: "swords", color: "red" },
    { name: "Lumberjack", cost: 30000, focus: "Chopping", effects: ["Haste"], kit: { items: ["Iron Axe"], amounts: [1] }, icon: "tree", color: "brown" },
    { name: "Excavator", cost: 60000, focus: "Digging", effects: ["Speed"], kit: { items: ["Iron Shovel"], amounts: [1] }, icon: "shovel", color: "orange" },
    { name: "Knight", cost: 150000, focus: "PVP", effects: ["Damage", "Speed"], kit: { items: ["Diamond Sword"], amounts: [1] }, icon: "shield", color: "blue" },
    { name: "Architect", cost: 300000, focus: "Building", effects: ["Jump Boost"], kit: { items: ["Gold Bar"], amounts: [50] }, icon: "hammer", color: "gold" },
    { name: "Scout", cost: 600000, focus: "Speed", effects: ["Speed", "Jump Boost"], kit: { items: ["Speed Potion"], amounts: [3] }, icon: "zap", color: "yellow" },
    { name: "Berserker", cost: 1500000, focus: "PVP", effects: ["Damage", "Speed", "Haste"], kit: { items: ["Diamond Axe"], amounts: [1] }, icon: "crown", color: "darkorange" }
];

// --- 2. Database Helpers ---

function getPlayerTokens(id) { return Number(api.getPlayerDbValue(id, "tokens")) || STARTING_TOKENS; }
function setPlayerTokens(id, val) { api.setPlayerDbValue(id, "tokens", val); }
function getPlayerRank(id) { return Number(api.getPlayerDbValue(id, "rankIdx")) || 0; }
function setPlayerRank(id, val) { api.setPlayerDbValue(id, "rankIdx", val); }

function getOwnedChunks(playerDbId) {
    const raw = api.getLobbyDbValue("owned_chunks_" + playerDbId);
    return raw ? raw.split(";") : [];
}
function addOwnedChunk(playerDbId, chunkId) {
    const chunks = getOwnedChunks(playerDbId);
    if (!chunks.includes(chunkId)) {
        chunks.push(chunkId);
        api.setLobbyDbValue("owned_chunks_" + playerDbId, chunks.join(";"));
    }
}
function removeOwnedChunk(playerDbId, chunkId) {
    const chunks = getOwnedChunks(playerDbId);
    const idx = chunks.indexOf(chunkId);
    if (idx >= 0) {
        chunks.splice(idx, 1);
        api.setLobbyDbValue("owned_chunks_" + playerDbId, chunks.join(";"));
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

function getPlayerIdByName(name) {
    const all = api.getPlayerIds();
    for (const id of all) {
        if (api.getEntityName(id).toLowerCase() === name.toLowerCase()) return id;
    }
    return null;
}


function updatePlayerNameTag(playerId) {
    const rank = RANKS[getPlayerRank(playerId)];
    api.setTargetedPlayerSettingForEveryone(
        playerId,
        "nameTagInfo",
        {
            content: [
                {
                    icon: rank.icon,
                    mainRGB: rank.color,
                    chatTag: [],
                },
                {
                    str: ` [${rank.name}] ${api.getEntityName(playerId)}`,
                    style: { color: rank.color }
                },
            ],
        },
        true
    );
}

// --- 3. Shop GUI logic ---

function updateShop(playerId) {
    const tokens = getPlayerTokens(playerId);
    const rankIdx = getPlayerRank(playerId);
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const dbId = api.getPlayerDbId(playerId);

    // Ranks Category
    if (rankIdx < RANKS.length - 1) {
        const nextRank = RANKS[rankIdx + 1];
        api.createShopItemForPlayer(playerId, "Ranks", "buy_rank", {
            image: "Gold Block",
            customTitle: "Upgrade to " + nextRank.name,
            cost: nextRank.cost,
            description: "Become a " + nextRank.name + " (" + nextRank.focus + " focus)",
            canBuy: tokens >= nextRank.cost
        });
    }

    // Real Estate Category
    if (!chunk) {
        api.createShopItemForPlayer(playerId, "Real Estate", "claim", {
            image: "Grass Block",
            customTitle: "Claim This Chunk",
            cost: CLAIM_COST,
            description: "Protect your builds here.",
            canBuy: tokens >= CLAIM_COST
        });
    } else if (chunk.ownerDbId === dbId) {
        api.createShopItemForPlayer(playerId, "Real Estate", "tp_home", {
            image: "Bed",
            customTitle: "Teleport Home",
            cost: 0,
            description: "Teleport to your home point in this chunk."
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "set_tp", {
            image: "Compass",
            customTitle: "Set Home TP",
            cost: 0,
            description: "Set where people arrive in this chunk."
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "toggle_tp", {
            image: "Iron Door",
            customTitle: chunk.tpOpen ? "Close TP (Private)" : "Open TP (Public)",
            cost: 0,
            description: "Control if others can TP here."
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "add_trust", {
            image: "Player Head",
            customTitle: "Trust Player",
            cost: 0,
            description: "Enter name to allow building.",
            userInput: { type: "text", placeholderText: "Player Name" }
        });
        api.createShopItemForPlayer(playerId, "Real Estate", "sell", {
            image: "Chest",
            customTitle: "List for Sale",
            cost: 0,
            description: "Put this chunk on the marketplace.",
            userInput: { type: "number", placeholderText: "Price" }
        });
    }

    // Marketplace
    const market = getMarketplace();
    market.forEach((item) => {
        const itemKey = "market_" + item.chunkId;
        api.createShopItemForPlayer(playerId, "Marketplace", itemKey, {
            image: "Grass Block",
            customTitle: (item.customTitle || item.name || "Plot") + " (" + item.price + " token:)",
            cost: item.price,
            description: "Purchase property from " + item.ownerName,
            canBuy: tokens >= item.price && item.ownerDbId !== dbId
        });

        // If owner opened it, allow visiting
        if (item.tpOpen) {
             api.createShopItemForPlayer(playerId, "Visit Islands", "tp_" + item.chunkId, {
                image: "Compass",
                customTitle: "Island: " + item.ownerName,
                cost: 0,
                description: "Teleport to this island."
            });
        }
    });

    // My Islands
    const owned = getOwnedChunks(dbId);
    owned.forEach((cId) => {
        api.createShopItemForPlayer(playerId, "My Islands", "my_tp_" + cId, {
            image: "Grass Block",
            customTitle: "Island @ " + cId,
            cost: 0,
            description: "Teleport to this owned chunk."
        });
    });

    // Dynamic Categories from SHOP_CONFIG
    for (const category in SHOP_CONFIG) {
        for (const itemKey in SHOP_CONFIG[category]) {
            const entry = SHOP_CONFIG[category][itemKey];
            const firstGive = entry.gives[0];

            // Check if player has all required items
            let hasReqs = true;
            entry.takes.forEach(t => {
                if (api.getInventoryItemAmount(playerId, t.item) < t.amount) hasReqs = false;
            });

            api.createShopItemForPlayer(playerId, category, "config_" + itemKey, {
                image: firstGive.item,
                customTitle: "Buy " + firstGive.item,
                cost: 0,
                description: entry.description,
                canBuy: hasReqs
            });
        }
    }

    // Kits Category
    const currentRank = RANKS[rankIdx];
    if (currentRank.kit) {
        api.createShopItemForPlayer(playerId, "Kits", "claim_kit", {
            image: "Iron Sword",
            customTitle: "Claim " + currentRank.name + " Kit",
            cost: 0,
            description: "Get your rank daily items."
        });
    }
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

onPlayerJoin = function(playerId, fromGameReset) {
    updateShop(playerId);
    updateLobbyHUD(playerId);
    updatePlayerNameTag(playerId);
};

onPlayerBoughtShopItem = function(playerId, categoryKey, itemKey, item, userInput) {
    const dbId = api.getPlayerDbId(playerId);
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);

    if (itemKey === "buy_rank") {
        const nextIdx = getPlayerRank(playerId) + 1;
        setPlayerTokens(playerId, getPlayerTokens(playerId) - RANKS[nextIdx].cost);
        setPlayerRank(playerId, nextIdx);
        updatePlayerNameTag(playerId);
        api.broadcastMessage("&a" + api.getEntityName(playerId) + " is now a " + RANKS[nextIdx].name + "!");
    }

    if (itemKey === "claim") {
        setPlayerTokens(playerId, getPlayerTokens(playerId) - CLAIM_COST);
        setChunkData(chunkId, {
            ownerDbId: dbId, ownerName: api.getEntityName(playerId),
            trusted: [], tpPoint: pos, tpOpen: false, forSale: false, price: 0
        });
        addOwnedChunk(dbId, chunkId);
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
            const entry = { chunkId, price, ownerName: chunk.ownerName, customTitle: "Plot @ " + chunkId, ownerDbId: dbId, tpOpen: chunk.tpOpen };
            if (existingIdx >= 0) market[existingIdx] = entry;
            else market.push(entry);
            setMarketplace(market);
            api.sendMessage(playerId, "&aListed for " + price + " token:");
        }
    }

    if (itemKey === "add_trust") {
        const chunk = getChunkData(chunkId);
        const targetId = getPlayerIdByName(userInput);
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
        const tokens = getPlayerTokens(playerId);

        if (targetChunk && targetChunk.ownerDbId !== dbId && tokens >= listing.price) {
             const oldOwnerDbId = targetChunk.ownerDbId;

             // Update database ownership tracking
             removeOwnedChunk(oldOwnerDbId, targetChunkId);
             addOwnedChunk(dbId, targetChunkId);

             // Transfer Tokens
             setPlayerTokens(playerId, tokens - listing.price);

             // Find online seller to reward
             const allIds = api.getPlayerIds();
             for (const sid of allIds) {
                 if (api.getPlayerDbId(sid) === oldOwnerDbId) {
                     setPlayerTokens(sid, getPlayerTokens(sid) + listing.price);
                     api.sendMessage(sid, `&aChunk sold! You received ${listing.price} token:`);
                     break;
                 }
             }

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

    // Handle Config Exchanges
    if (itemKey.startsWith("config_")) {
        const configId = itemKey.replace("config_", "");
        let configEntry = null;
        for (const cat in SHOP_CONFIG) {
            if (SHOP_CONFIG[cat][configId]) {
                configEntry = SHOP_CONFIG[cat][configId];
                break;
            }
        }

        if (configEntry) {
            // Check Reqs again
            let canAfford = true;
            configEntry.takes.forEach(t => {
                if (api.getInventoryItemAmount(playerId, t.item) < t.amount) canAfford = false;
            });

            if (canAfford) {
                configEntry.takes.forEach(t => api.removeItemName(playerId, t.item, t.amount));
                configEntry.gives.forEach(g => api.giveItem(playerId, g.item, g.amount));
                api.sendMessage(playerId, "&aPurchase successful!");
            }
        }
    }

    updateShop(playerId);
    updateLobbyHUD(playerId);
};

// --- 5. Main Loop ---

const PLAYER_TIMERS = {};
const HUD_UPDATE_INTERVAL = 1000; // Update HUD every second
const LAST_HUD_UPDATES = {};
const LAST_PLAYER_CHUNKS = {};

function updateLobbyHUD(playerId) {
    const allPlayers = api.getPlayerIds();
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const rank = RANKS[getPlayerRank(playerId)];
    const tokens = getPlayerTokens(playerId);

    api.setClientOption(playerId, "RightInfoText", [
        {
            str: " LOVERFELLA BLOXD \n",
            style: { color: "#ffaa00", fontWeight: "bold", fontSize: "16px" }
        },
        { str: "------------------\n", style: { color: "#ffffff" } },
        {
            str: "👤 Players: ",
            style: { color: "#00ffff", fontSize: "12px" }
        },
        {
            str: `${allPlayers.length}\n`,
            style: { color: "#ffffff", fontSize: "12px" }
        },
        {
            str: "👑 Rank: ",
            style: { color: "#ffff00", fontSize: "12px" }
        },
        {
            str: `${rank.name}\n`,
            style: { color: "#ffffff", fontSize: "12px" }
        },
        {
            str: "💰 token: ",
            style: { color: "#00ff00", fontSize: "12px" }
        },
        {
            str: `${tokens.toLocaleString()}\n`,
            style: { color: "#ffffff", fontSize: "12px" }
        },
        {
            str: "📍 Region: ",
            style: { color: "#ff5555", fontSize: "12px" }
        },
        {
            str: `${chunk ? chunk.ownerName : "Unclaimed"}\n`,
            style: { color: "#ffffff", fontSize: "12px" }
        },
        { str: "------------------\n", style: { color: "#ffffff" } },
        {
            str: " Play.LoverFella.io ",
            style: { color: "#aaaaaa", fontSize: "10px", fontStyle: "italic" }
        }
    ]);
}

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

        // Persistent Sidebar HUD & Buffs & Dynamic Shop Updates
        if (!LAST_HUD_UPDATES[p] || now - LAST_HUD_UPDATES[p] >= HUD_UPDATE_INTERVAL) {
            updateLobbyHUD(p);
            const rank = RANKS[getPlayerRank(p)];
            rank.effects.forEach(eff => api.applyEffect(p, eff, 2000, { level: 1 }));

            // Update shop if chunk changed
            const currentChunkId = getChunkId(api.getPosition(p));
            if (LAST_PLAYER_CHUNKS[p] !== currentChunkId) {
                updateShop(p);
                LAST_PLAYER_CHUNKS[p] = currentChunkId;
            }

            LAST_HUD_UPDATES[p] = now;
        }

        // Instant Sell Guidance (LoverFella SMP style)
        // Note: Actual selling is handled by Bloxd's built-in SMP system settings,
        // but we can provide a shortcut to the shop or info here if needed.
    });
};
