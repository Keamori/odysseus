// ==================================================================================
// LOVERFELLA REPLICATE FOR BLOXD.IO
// ==================================================================================
// This script implements a custom economy, rank progression, plot management,
// and session-based rewards entirely through the Bloxd.io Shop GUI (B key).

// --- 1. Configuration & Constants ---
const GAME_NAME = "LoverFella Bloxd";
const STARTING_TOKENS = 1000;
const SESSION_REWARD_MINUTES = 60;
const KEY_ITEM_NAME = "Dark Green Bricks";
const CURRENCY_ITEM = "Gold Coin";
const CHUNK_SIZE = 64;

const ADMINS = ["Hafuja"];

// Detailed Shop Config
const BUY_ITEMS = [
    { item: "Stone", cost: 5, image: "Stone" },
    { item: "Dirt", cost: 2, image: "Dirt" },
    { item: "Maple Log", cost: 15, image: "Maple Log" },
    { item: "Iron Bar", cost: 50, image: "Iron Bar" },
    { item: "Gold Bar", cost: 150, image: "Gold Bar" },
    { item: "Diamond", cost: 500, image: "Diamond" }
];

const SELL_ITEMS = [
    { item: "Wheat", tokens: 2, image: "Wheat" },
    { item: "Bread", tokens: 5, image: "Bread" },
    { item: "Maple Log", tokens: 7, image: "Maple Log" },
    { item: "Iron Bar", tokens: 25, image: "Iron Bar" },
    { item: "Gold Bar", tokens: 75, image: "Gold Bar" },
    { item: "Diamond", tokens: 250, image: "Diamond" }
];

const LUCKY_BLOCK_TYPES = [
    { item: "Lucky Block", image: "Lucky Block" },
    { item: "Ultra Lucky Block", image: "Lucky Block" },
    { item: "Weapon Lucky Block", image: "Lucky Block" },
    { item: "Pet Lucky Block", image: "Lucky Block" },
    { item: "Gun Lucky Block", image: "Lucky Block" }
];

// Rank Progression
const RANKS = [
    { name: "Peasant", cost: 0, focus: "Start", effects: [], image: "Leather", icon: "user", color: "gray" },
    { name: "Farmer", cost: 2000, focus: "Farming", effects: ["Speed"], image: "Iron Hoe", icon: "leaf", color: "green" },
    { name: "Miner", cost: 5000, focus: "Mining", effects: ["Haste"], image: "Iron Pickaxe", icon: "pickaxe", color: "lightblue" },
    { name: "Warrior", cost: 15000, focus: "PVP", effects: ["Damage"], image: "Iron Sword", icon: "swords", color: "red" },
    { name: "Lumberjack", cost: 30000, focus: "Chopping", effects: ["Haste"], image: "Moonstone Axe", icon: "tree", color: "brown" },
    { name: "Excavator", cost: 60000, focus: "Digging", effects: ["Speed"], image: "Diamond Spade", icon: "shovel", color: "orange" },
    { name: "Knight", cost: 150000, focus: "PVP", effects: ["Damage", "Speed"], image: "Knight Sword", icon: "shield", color: "blue" },
    { name: "Architect", cost: 300000, focus: "Building", effects: ["Jump Boost"], image: "WorldBuilder Wand", icon: "hammer", color: "gold" },
    { name: "Scout", cost: 600000, focus: "Speed", effects: ["Speed", "Jump Boost"], image: "Haste Potion II", icon: "zap", color: "yellow" },
    { name: "Berserker", cost: 1500000, focus: "PVP", effects: ["Damage", "Speed", "Haste"], image: "Chaos Potion", icon: "crown", color: "darkorange" }
];

// --- 2. Database Helpers ---

function getPlayerTokens(id) { return Number(api.getPlayerDbValue(id, "tokens")) || STARTING_TOKENS; }
function setPlayerTokens(id, val) { api.setPlayerDbValue(id, "tokens", val); }
function getPlayerRank(id) { return Number(api.getPlayerDbValue(id, "rankIdx")) || 0; }
function setPlayerRank(id, val) { api.setPlayerDbValue(id, "rankIdx", val); }

function getPlayerExp(id) { return Number(api.getPlayerDbValue(id, "exp")) || 0; }
function setPlayerExp(id, val) { api.setPlayerDbValue(id, "exp", val); }
function getPlayerKills(id) { return Number(api.getPlayerDbValue(id, "kills")) || 0; }
function setPlayerKills(id, val) { api.setPlayerDbValue(id, "kills", val); }
function getPlayerDeaths(id) { return Number(api.getPlayerDbValue(id, "deaths")) || 0; }
function setPlayerDeaths(id, val) { api.setPlayerDbValue(id, "deaths", val); }
function getPlayerLBux(id) { return Number(api.getPlayerDbValue(id, "lbux")) || 0; }
function setPlayerLBux(id, val) { api.setPlayerDbValue(id, "lbux", val); }

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
    if (!pos) return "0,0,0";
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
    const activeRankIdx = Number(api.getPlayerDbValue(playerId, "activeRankIdx")) || 0;
    const rank = RANKS[activeRankIdx];
    const name = api.getEntityName(playerId);

    let tags = [];

    // Add Rank Icon
    tags.push({
        icon: rank.icon === "user" ? "wrench" : (rank.icon === "crown" ? "crown" : rank.icon),
        mainRGB: rank.color,
        chatTag: []
    });

    // Add Admin prefix
    if (ADMINS.includes(name)) {
        tags.push({ str: "🛡️ Admin ", style: { color: "aqua" } });
    }

    // Add Rank Name and Player Name
    tags.push({
        str: ` [${rank.name}] ${name}`,
        style: { color: rank.color }
    });

    api.setTargetedPlayerSettingForEveryone(
        playerId,
        "nameTagInfo",
        { content: tags },
        true
    );
}

// --- 3. Shop GUI logic ---

function updateShop(playerId) {
    const tokens = getPlayerTokens(playerId);
    const currentRankIdx = getPlayerRank(playerId);
    const activeRankIdx = Number(api.getPlayerDbValue(playerId, "activeRankIdx")) || 0;
    const pos = api.getPosition(playerId);
    if (!pos) return;

    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const dbId = api.getPlayerDbId(playerId);

    // Ranks Category [Select, Selected, Buy]
    RANKS.forEach((rank, idx) => {
        let status = "Buy";
        let canBuy = tokens >= rank.cost;
        if (idx <= currentRankIdx) {
            status = (idx === activeRankIdx) ? "Selected" : "Select";
            canBuy = true;
        }

        api.createShopItemForPlayer(playerId, "Ranks", "rank_" + idx, {
            image: rank.image,
            customTitle: `${rank.name} [${status}]`,
            cost: (status === "Buy") ? rank.cost : 0,
            description: `Tier ${idx + 1} | ${rank.focus} focus. Status: ${status}`,
            canBuy: canBuy
        });
    });

    // My Plot (Management)
    if (chunk && chunk.ownerDbId === dbId) {
        api.createShopItemForPlayer(playerId, "My Plot", "rename_plot", {
            image: "Board", customTitle: "Rename Plot", cost: 0,
            description: `Current Name: ${chunk.name || chunk.ownerName + "'s Island"}`,
            userInput: { type: "text", placeholderText: "New Plot Name" }
        });
        api.createShopItemForPlayer(playerId, "My Plot", "tp_home", {
            image: "Red Bed", customTitle: "Teleport Home", cost: 0, description: "Go to your plot spawn."
        });
        api.createShopItemForPlayer(playerId, "My Plot", "set_tp", {
            image: "Compass", customTitle: "Set Plot Spawn", cost: 0, description: "Set where people arrive."
        });
        api.createShopItemForPlayer(playerId, "My Plot", "toggle_tp", {
            image: "Green Portal", customTitle: chunk.tpOpen ? "Close Plot (Private)" : "Open Plot (Public)",
            cost: 0, description: "Toggle visitor access."
        });
        api.createShopItemForPlayer(playerId, "My Plot", "add_trust", {
            image: "WorldBuilder Wand", customTitle: "Trust Builder", cost: 0,
            description: "Allow a player to build here.",
            userInput: { type: "text", placeholderText: "Player Name" }
        });
        api.createShopItemForPlayer(playerId, "My Plot", "sell", {
            image: "Chest", customTitle: "List for Sale", cost: 0,
            description: "Put this plot on the marketplace.",
            userInput: { type: "number", placeholderText: "Price in Tokens" }
        });
    } else if (!chunk) {
        // Claim using Gold Coin item
        api.createShopItemForPlayer(playerId, "My Plot", "claim", {
            image: "Chunk Map",
            customTitle: "Claim This Plot",
            cost: 0,
            description: `Costs 1 ${CURRENCY_ITEM}. Protects 64x64 area.`,
            canBuy: api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1
        });
    }

    // Real Estate (Marketplace)
    const market = getMarketplace();
    market.forEach((item) => {
        api.createShopItemForPlayer(playerId, "Real Estate", "market_" + item.chunkId, {
            image: "Chunk Map",
            customTitle: `${(item.customTitle && item.customTitle !== "Plot") ? item.customTitle : "Plot"} (${item.price} token:)`,
            cost: item.price,
            description: `Seller: ${item.ownerName}. Purchase to own this land.`,
            canBuy: tokens >= item.price && item.ownerDbId !== dbId
        });
    });

    // Visit Plots (Teleportation)
    market.forEach((item) => {
        if (item.tpOpen) {
             api.createShopItemForPlayer(playerId, "Visit Plots", "tp_" + item.chunkId, {
                image: "Compass", customTitle: `Visit: ${item.ownerName}`, cost: 0,
                description: "Teleport to this public plot."
             });
        }
    });

    // Bank (Coin <-> Token)
    api.createShopItemForPlayer(playerId, "Bank", "withdraw_coin", {
        image: "Gold Coin", customTitle: `Withdraw ${CURRENCY_ITEM}`, cost: 500,
        description: `Exchange 500 tokens for 1 ${CURRENCY_ITEM}.`,
        canBuy: tokens >= 500
    });
    api.createShopItemForPlayer(playerId, "Bank", "deposit_coin", {
        image: "Common Lottery Ticket", customTitle: `Deposit ${CURRENCY_ITEM}`, cost: 0,
        description: `Exchange 1 ${CURRENCY_ITEM} for 450 tokens.`,
        canBuy: api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1
    });

    // Buy (Factions Style)
    BUY_ITEMS.forEach(obj => {
        api.createShopItemForPlayer(playerId, "Buy", "buy_item_" + obj.item, {
            image: obj.image, customTitle: obj.item, cost: obj.cost, description: `Buy 1 ${obj.item}`,
            canBuy: tokens >= obj.cost
        });
    });

    // Sell (Factions Style)
    SELL_ITEMS.forEach(obj => {
        api.createShopItemForPlayer(playerId, "Sell", "sell_item_" + obj.item, {
            image: obj.image, customTitle: `Sell ${obj.item}`, cost: -obj.tokens,
            description: `Earn ${obj.tokens} tokens per 1 ${obj.item}`,
            canBuy: api.getInventoryItemAmount(playerId, obj.item) >= 1,
            sell: true
        });
    });

    // Lucky Blocks
    LUCKY_BLOCK_TYPES.forEach(lb => {
        api.createShopItemForPlayer(playerId, "Lucky Blocks", "lucky_" + lb.item, {
            image: lb.image, customTitle: `Buy ${lb.item}`, cost: 0,
            description: `Costs 1 ${KEY_ITEM_NAME}`,
            canBuy: api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1
        });
    });

    // Kits
    api.createShopItemForPlayer(playerId, "Kits", "kit_peasant", {
        image: "Wood Sword", customTitle: "Peasant Kit", cost: 0,
        description: "Standard tools: Sword, Glider, Pickaxe, Axe, Spade."
    });
}

// --- 4. Event Handlers ---

onPlayerChangeBlock = function(playerId, x, y, z, blockName) {
    const chunkId = getChunkId({x, y, z});
    const chunk = getChunkData(chunkId);
    if (!chunk) return;

    const dbId = api.getPlayerDbId(playerId);
    if (chunk.ownerDbId === dbId || (chunk.trusted && chunk.trusted.includes(dbId))) return;

    api.sendMessage(playerId, `&cOwned by ${chunk.name || chunk.ownerName}`);
    return "preventChange";
};

onPlayerJoin = function(playerId, fromGameReset) {
    updateShop(playerId);
    updateLobbyHUD(playerId);
    updatePlayerNameTag(playerId);
    api.setClientOption(playerId, "showChatBubbles", true);

    // Playtime tracking
    if (!PLAYER_TIMERS[playerId]) PLAYER_TIMERS[playerId] = api.now();
};

onPlayerChat = function(playerId, msg) {
    msg = msg.trim();
    const stats = {
        tokens: getPlayerTokens(playerId),
        kills: getPlayerKills(playerId),
        deaths: getPlayerDeaths(playerId),
        exp: getPlayerExp(playerId),
        lbux: getPlayerLBux(playerId)
    };

    if (msg === "!help") {
        api.sendMessage(playerId, "Commands: !bal !kills !deaths !kdr !lbux !pay <player> <amount>", { color: "#00FFFF" });
        return false;
    }
    if (msg === "!bal") {
        api.sendMessage(playerId, `Your balance: ${stats.tokens} tokens`, { color: "#00FF00" });
        return false;
    }
    if (msg === "!kills") {
        api.sendMessage(playerId, `Kills: ${stats.kills}`, { color: "#FFAA00" });
        return false;
    }
    if (msg === "!deaths") {
        api.sendMessage(playerId, `Deaths: ${stats.deaths}`, { color: "#FF5555" });
        return false;
    }
    if (msg === "!lbux") {
        api.sendMessage(playerId, `LBux: ${stats.lbux}`, { color: "#ff5555" });
        return false;
    }
    if (msg === "!kdr") {
        let kdr = stats.deaths === 0 ? stats.kills.toFixed(2) : (stats.kills / stats.deaths).toFixed(2);
        api.sendMessage(playerId, `KDR: ${kdr}`, { color: "#AAAAFF" });
        return false;
    }

    if (msg.startsWith("!pay ")) {
        const parts = msg.split(" ");
        const targetName = parts[1];
        const amount = parseInt(parts[2]);
        const targetId = getPlayerIdByName(targetName);

        if (!targetId || targetId === playerId || isNaN(amount) || amount <= 0) {
            api.sendMessage(playerId, "Usage: !pay <player> <amount>", { color: "red" });
            return false;
        }
        if (stats.tokens < amount) {
            api.sendMessage(playerId, "Not enough tokens.", { color: "red" });
            return false;
        }

        setPlayerTokens(playerId, stats.tokens - amount);
        setPlayerTokens(targetId, getPlayerTokens(targetId) + amount);
        api.sendMessage(playerId, `Paid ${amount} token: to ${targetName}`, { color: "#00FF00" });
        api.sendMessage(targetId, `Received ${amount} token: from ${api.getEntityName(playerId)}`, { color: "#00FFAA" });
        return false;
    }

    return true; // Allow normal chat
};

onPlayerKilled = function(victimId, killerId) {
    if (!killerId) return;
    setPlayerKills(killerId, getPlayerKills(killerId) + 1);
    setPlayerDeaths(victimId, getPlayerDeaths(victimId) + 1);
    setPlayerExp(killerId, getPlayerExp(killerId) + 50);

    if (Math.random() < 0.2) {
        setPlayerLBux(killerId, getPlayerLBux(killerId) + 1);
        api.sendMessage(killerId, "&6+1 LBux rewarded!");
    }

    api.sendMessage(killerId, "&a+50 EXP for kill!");
    updateLobbyHUD(killerId);
    updateLobbyHUD(victimId);
};

onPlayerBoughtShopItem = function(playerId, categoryKey, itemKey, userInput) {
    const dbId = api.getPlayerDbId(playerId);
    const pos = api.getPosition(playerId);
    const chunkId = getChunkId(pos);
    const tokens = getPlayerTokens(playerId);

    if (itemKey.startsWith("rank_")) {
        const idx = parseInt(itemKey.split("_")[1]);
        const rank = RANKS[idx];
        const ownedRankIdx = getPlayerRank(playerId);

        if (idx <= ownedRankIdx) {
            api.setPlayerDbValue(playerId, "activeRankIdx", idx);
            updatePlayerNameTag(playerId);
            api.sendMessage(playerId, `&aSelected ${rank.name} rank.`);
        } else if (idx === ownedRankIdx + 1 && tokens >= rank.cost) {
            setPlayerTokens(playerId, tokens - rank.cost);
            setPlayerRank(playerId, idx);
            api.setPlayerDbValue(playerId, "activeRankIdx", idx);
            updatePlayerNameTag(playerId);
            api.broadcastMessage(`&a${api.getEntityName(playerId)} is now a ${rank.name}!`);
        }
    }

    if (itemKey === "claim") {
        if (api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1) {
            api.removeItemName(playerId, CURRENCY_ITEM, 1);
            const defaultPlotName = api.getPlayerDbValue(playerId, "defaultPlotName") || `${api.getEntityName(playerId)}'s Plot`;
            setChunkData(chunkId, {
                ownerDbId: dbId, ownerName: api.getEntityName(playerId), name: defaultPlotName,
                trusted: [], tpPoint: pos, tpOpen: false, forSale: false, price: 0
            });
            addOwnedChunk(dbId, chunkId);
            api.sendMessage(playerId, "&aPlot claimed!");
        }
    }

    if (itemKey === "rename_plot") {
        const c = getChunkData(chunkId);
        if (c && c.ownerDbId === dbId) {
            c.name = userInput;
            setChunkData(chunkId, c);
            api.setPlayerDbValue(playerId, "defaultPlotName", userInput);
            api.sendMessage(playerId, `&aPlot renamed to: ${userInput}`);
        }
    }

    if (itemKey === "withdraw_coin") {
        if (tokens >= 500) {
            setPlayerTokens(playerId, tokens - 500);
            api.giveItem(playerId, CURRENCY_ITEM, 1);
            api.sendMessage(playerId, `&aWithdrew 1 ${CURRENCY_ITEM}.`);
        }
    }
    if (itemKey === "deposit_coin") {
        if (api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1) {
            api.removeItemName(playerId, CURRENCY_ITEM, 1);
            setPlayerTokens(playerId, tokens + 450);
            api.sendMessage(playerId, `&aDeposited 1 ${CURRENCY_ITEM}. Received 450 token:`);
        }
    }

    if (itemKey.startsWith("buy_item_")) {
        const itemName = itemKey.replace("buy_item_", "");
        const buyObj = BUY_ITEMS.find(i => i.item === itemName);
        if (tokens >= buyObj.cost) {
            setPlayerTokens(playerId, tokens - buyObj.cost);
            api.giveItem(playerId, itemName, 1);
        }
    }
    if (itemKey.startsWith("sell_item_")) {
        const itemName = itemKey.replace("sell_item_", "");
        const sellObj = SELL_ITEMS.find(i => i.item === itemName);
        if (api.getInventoryItemAmount(playerId, itemName) >= 1) {
            api.removeItemName(playerId, itemName, 1);
            setPlayerTokens(playerId, tokens + sellObj.reward);
        }
    }

    if (itemKey.startsWith("lucky_")) {
        const lbName = itemKey.replace("lucky_", "");
        if (api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1) {
            api.removeItemName(playerId, KEY_ITEM_NAME, 1);
            api.giveItem(playerId, lbName, 1);
        }
    }

    if (itemKey === "kit_peasant") {
        const lastKit = Number(api.getPlayerDbValue(playerId, "lastPeasantKit")) || 0;
        const now = api.now();
        if (now - lastKit >= 24 * 3600000) {
            api.giveItem(playerId, "Wood Sword", 1);
            api.giveItem(playerId, "Wood Hang Glider", 1);
            api.giveItem(playerId, "Wood Pickaxe", 1);
            api.giveItem(playerId, "Wood Axe", 1);
            api.giveItem(playerId, "Wood Spade", 1);
            api.setPlayerDbValue(playerId, "lastPeasantKit", now);
            api.sendMessage(playerId, "&aPeasant kit claimed!");
        }
    }

    if (itemKey === "sell") {
        const chunk = getChunkData(chunkId);
        const price = Number(userInput);
        if (chunk && chunk.ownerDbId === dbId && !isNaN(price)) {
            chunk.forSale = true; chunk.price = price;
            setChunkData(chunkId, chunk);
            const market = getMarketplace();
            const existingIdx = market.findIndex(m => m.chunkId === chunkId);
            const entry = { chunkId, price, ownerName: chunk.ownerName, customTitle: chunk.name || "Plot @ " + chunkId, ownerDbId: dbId, tpOpen: chunk.tpOpen };
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

        if (targetChunk && targetChunk.ownerDbId !== dbId && tokens >= listing.price) {
             const oldOwnerDbId = targetChunk.ownerDbId;
             removeOwnedChunk(oldOwnerDbId, targetChunkId);
             addOwnedChunk(dbId, targetChunkId);
             setPlayerTokens(playerId, tokens - listing.price);

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
             api.sendMessage(playerId, "&aTeleported to plot.");
        }
    }

    if (itemKey === "set_tp") {
        const chunk = getChunkData(chunkId);
        if (chunk && chunk.ownerDbId === dbId) {
            chunk.tpPoint = pos; setChunkData(chunkId, chunk);
            api.sendMessage(playerId, "&aPlot spawn set!");
        }
    }

    if (itemKey === "toggle_tp") {
        const chunk = getChunkData(chunkId);
        if (chunk && chunk.ownerDbId === dbId) {
            chunk.tpOpen = !chunk.tpOpen; setChunkData(chunkId, chunk);
            api.sendMessage(playerId, "&aPlot: " + (chunk.tpOpen ? "Open" : "Closed"));
            const market = getMarketplace();
            const mIdx = market.findIndex(m => m.chunkId === chunkId);
            if (mIdx >= 0) {
                market[mIdx].tpOpen = chunk.tpOpen;
                setMarketplace(market);
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
    if (!pos) return;
    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const rank = RANKS[Number(api.getPlayerDbValue(playerId, "activeRankIdx")) || 0];
    const tokens = getPlayerTokens(playerId);
    const exp = getPlayerExp(playerId);
    const lbux = getPlayerLBux(playerId);
    const claims = getOwnedChunks(api.getPlayerDbId(playerId)).length;
    const k = getPlayerKills(playerId);
    const d = getPlayerDeaths(playerId);

    api.setClientOption(playerId, "RightInfoText", [
        {
            str: " ❤️ Mega Survival ❤️ \n",
            style: { color: "#ffff00", fontWeight: "bold", fontSize: "14px" }
        },
        {
            str: `  ${allPlayers.length}/23 | Zone ${Math.floor(Math.abs(pos.x)/2000) + 1}\n\n`,
            style: { color: "#ffffff", fontSize: "12px" }
        },
        {
            str: "OWNER ",
            style: { color: "#aa0000", fontWeight: "bold" }
        },
        {
            str: `${chunk ? (chunk.name || chunk.ownerName) : "LoverFella"}\n`,
            style: { color: "#aa0000" }
        },
        {
            str: ` $ Money: $${tokens.toLocaleString()}\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: ` ☀️ EXP: ${exp}\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: ` 🚀 LBux: ${lbux}\n`,
            style: { color: "#ff5555", fontSize: "12px" }
        },
        {
            str: ` ⛏️ Claims: ${claims} chunks\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: ` 💀 K/D: ${k}/${d}\n\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: "Your Claim\n",
            style: { color: "#aaaaaa", fontSize: "12px" }
        },
        {
            str: ` Rank: ${rank.name}\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: " Profile: Global Profile\n",
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: ` Chunk: ${Math.floor(pos.x/64)}, ${Math.floor(pos.z/64)}\n\n`,
            style: { color: "#ffffaa", fontSize: "12px" }
        },
        {
            str: " play.loverfella.com ",
            style: { color: "#aaaaaa", fontSize: "10px" }
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
            const pos = api.getPosition(p);
            if (!pos) return;

            updateLobbyHUD(p);
            const activeRankIdx = Number(api.getPlayerDbValue(p, "activeRankIdx")) || 0;
            const rank = RANKS[activeRankIdx];
            rank.effects.forEach(eff => api.applyEffect(p, eff, 2000, { level: 1 }));

            // Update shop if chunk changed
            const currentChunkId = getChunkId(pos);
            if (LAST_PLAYER_CHUNKS[p] !== currentChunkId) {
                updateShop(p);
                LAST_PLAYER_CHUNKS[p] = currentChunkId;
            }

            LAST_HUD_UPDATES[p] = now;
        }
    });
};
