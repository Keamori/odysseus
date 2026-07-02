// ==================================================================================
// LOVERFELLA REPLICATE FOR BLOXD.IO - ENHANCED & COMPLETE
// ==================================================================================

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

const RARE_ITEMS = ["Spirit Pet", "Spirit Saddle"];
const TOOL_TYPES = ["Pickaxe", "Axe", "Spade", "Sword", "Hoe", "Shield", "Bow", "Crossbow"];

const LUCKY_BLOCK_TYPES = [
    { item: "Lucky Block", image: "Lucky Block" },
    { item: "Ultra Lucky Block", image: "Lucky Block" },
    { item: "Weapon Lucky Block", image: "Lucky Block" },
    { item: "Pet Lucky Block", image: "Lucky Block" },
    { item: "Gun Lucky Block", image: "Lucky Block" }
];

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

// --- 2. Database Helpers (Robust & Stable) ---

function getPlayerTokens(id) { return Number(api.getPlayerDbValue(id, "tokens")) || STARTING_TOKENS; }
function setPlayerTokens(id, val) { api.setPlayerDbValue(id, "tokens", val); }
function getPlayerRank(id) { return Number(api.getPlayerDbValue(id, "rankIdx")) || 0; }
function setPlayerRank(id, val) { api.setPlayerDbValue(id, "rankIdx", val); }
function getPlayerPrestige(id) { return Number(api.getPlayerDbValue(id, "prestige")) || 0; }
function setPlayerPrestige(id, val) { api.setPlayerDbValue(id, "prestige", val); }

function getPlayerExp(id) { return Number(api.getPlayerDbValue(id, "exp")) || 0; }
function setPlayerExp(id, val) { api.setPlayerDbValue(id, "exp", val); }
function getPlayerKills(id) { return Number(api.getPlayerDbValue(id, "kills")) || 0; }
function setPlayerKills(id, val) { api.setPlayerDbValue(id, "kills", val); }
function getPlayerDeaths(id) { return Number(api.getPlayerDbValue(id, "deaths")) || 0; }
function setPlayerDeaths(id, val) { api.setPlayerDbValue(id, "deaths", val); }
function getPlayerLBux(id) { return Number(api.getPlayerDbValue(id, "lbux")) || 0; }
function setPlayerLBux(id, val) { api.setPlayerDbValue(id, "lbux", val); }

/**
 * Serialization format for Chunk:
 * ownerDbId|ownerName|name|tpX,tpY,tpZ|tpOpen(0/1)|forSale(0/1)|price|trustBuildIds|trustBreakIds|trustInteractIds
 */
function serializeChunk(c) {
    if (!c) return "";
    return [
        c.ownerDbId,
        c.ownerName,
        c.name.replace(/\|/g, ""),
        `${c.tpPoint.x},${c.tpPoint.y},${c.tpPoint.z}`,
        c.tpOpen ? 1 : 0,
        c.forSale ? 1 : 0,
        c.price,
        (c.trustBuild || []).join(","),
        (c.trustBreak || []).join(","),
        (c.trustInteract || []).join(",")
    ].join("|");
}

function deserializeChunk(str) {
    if (!str) return null;
    const p = str.split("|");
    const coords = p[3] ? p[3].split(",").map(Number) : [0,0,0];
    return {
        ownerDbId: p[0],
        ownerName: p[1],
        name: p[2],
        tpPoint: { x: coords[0], y: coords[1], z: coords[2] },
        tpOpen: p[4] === "1",
        forSale: p[5] === "1",
        price: Number(p[6]) || 0,
        trustBuild: p[7] ? p[7].split(",").filter(id => id.length > 0) : [],
        trustBreak: p[8] ? p[8].split(",").filter(id => id.length > 0) : [],
        trustInteract: p[9] ? p[9].split(",").filter(id => id.length > 0) : []
    };
}

function getChunkData(chunkId) {
    return deserializeChunk(api.getLobbyDbValue("c_" + chunkId));
}

function setChunkData(chunkId, data) {
    api.setLobbyDbValue("c_" + chunkId, serializeChunk(data));
}

function serializeMarket(list) {
    return list.map(item => {
        return [
            item.chunkId,
            item.price,
            item.ownerName,
            item.customTitle.replace(/[,;]/g, ""),
            item.ownerDbId,
            item.tpOpen ? 1 : 0
        ].join(",");
    }).join(";");
}

function deserializeMarket(str) {
    if (!str) return [];
    return str.split(";").map(s => {
        const p = s.split(",");
        return {
            chunkId: p[0],
            price: Number(p[1]),
            ownerName: p[2],
            customTitle: p[3],
            ownerDbId: p[4],
            tpOpen: p[5] === "1"
        };
    });
}

function getMarketplace() { return deserializeMarket(api.getLobbyDbValue("mkt")); }
function setMarketplace(list) { api.setLobbyDbValue("mkt", serializeMarket(list)); }

function getOwnedChunks(playerDbId) {
    const raw = api.getLobbyDbValue("oc_" + playerDbId);
    return raw ? raw.split(";") : [];
}

function addOwnedChunk(playerDbId, chunkId) {
    const chunks = getOwnedChunks(playerDbId);
    if (!chunks.includes(chunkId)) {
        chunks.push(chunkId);
        api.setLobbyDbValue("oc_" + playerDbId, chunks.join(";"));
    }
}

function removeOwnedChunk(playerDbId, chunkId) {
    const chunks = getOwnedChunks(playerDbId);
    const idx = chunks.indexOf(chunkId);
    if (idx >= 0) {
        chunks.splice(idx, 1);
        api.setLobbyDbValue("oc_" + playerDbId, chunks.join(";"));
    }
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

// --- 3. Dynamic Economy & Sell All ---

function getBasePrice(itemName) {
    const item = SELL_ITEMS.find(i => i.item === itemName);
    return item ? item.tokens : 0;
}

function getDynamicPrice(itemName) {
    const base = getBasePrice(itemName);
    if (base === 0) return 0;
    const factor = Number(api.getLobbyDbValue("dp_" + itemName)) || 1.0;
    return Math.floor(base * factor);
}

function updateDynamicPrices() {
    SELL_ITEMS.forEach(item => {
        let factor = Number(api.getLobbyDbValue("dp_" + item.item)) || 1.0;
        if (factor > 1.0) factor -= 0.01;
        else if (factor < 1.0) factor += 0.01;
        api.setLobbyDbValue("dp_" + item.item, factor.toFixed(2));
    });
}

function adjustDynamicPrice(itemName, bought) {
    let factor = Number(api.getLobbyDbValue("dp_" + itemName)) || 1.0;
    if (bought) factor += 0.05;
    else factor -= 0.02;
    factor = Math.max(0.5, Math.min(2.0, factor));
    api.setLobbyDbValue("dp_" + itemName, factor.toFixed(2));
}

function isSellable(itemName) {
    if (RARE_ITEMS.includes(itemName)) return false;
    if (TOOL_TYPES.some(type => itemName.includes(type))) return false;
    if (itemName.toLowerCase().includes("enchanted")) return false;
    return SELL_ITEMS.some(i => i.item === itemName);
}

function calculateSellAllValue(playerId) {
    let total = 0;
    SELL_ITEMS.forEach(item => {
        const count = api.getInventoryItemAmount(playerId, item.item);
        if (count > 0 && isSellable(item.item)) {
            total += count * getDynamicPrice(item.item);
        }
    });
    return total;
}

// --- 4. Systems (Lucky Blocks, Bounties, UI) ---

const LOOT_TABLES = {
    "Lucky Block": [
        { item: "Stone", chance: 0.5, amount: 64 },
        { item: "Gold Coin", chance: 0.1, amount: 1 },
        { item: "Diamond", chance: 0.05, amount: 2 },
        { item: "Iron Bar", chance: 0.2, amount: 10 },
        { item: "Bread", chance: 0.15, amount: 5 }
    ]
};

function openLuckyBlock(playerId, type) {
    const table = LOOT_TABLES["Lucky Block"];
    const roll = Math.random();
    let cumulative = 0;
    let reward = null;

    for (const entry of table) {
        cumulative += entry.chance;
        if (roll <= cumulative) { reward = entry; break; }
    }

    if (reward) {
        api.giveItem(playerId, reward.item, reward.amount);
        api.sendMessage(playerId, `&6[Lucky] You got ${reward.amount}x ${reward.item}!`);
        const pos = api.getPosition(playerId);
        if (pos) spawnLuckyParticles(pos);
    }
}

function spawnLuckyParticles(pos) {
    api.spawnTempParticleSystem({
        texture: "Star", minLifeTime: 0.5, maxLifeTime: 1.5,
        minEmitPower: 1, maxEmitPower: 3, minSize: 0.1, maxSize: 0.5,
        gravity: [0, -9.8, 0], velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
        colorGradients: [{ timeFraction: 0, minColor: [1, 1, 0, 1], maxColor: [1, 0.5, 0, 1] }],
        blendMode: 2, dir1: [-1, 1, -1], dir2: [1, 2, 1],
        pos1: [pos.x, pos.y + 1, pos.z], pos2: [pos.x, pos.y + 1, pos.z],
        manualEmitCount: 50, hideDist: 100
    });
}

function getBounties() {
    const raw = api.getLobbyDbValue("bounties");
    return raw ? raw.split(";").map(s => {
        const p = s.split(",");
        return { targetName: p[0], amount: Number(p[1]), setterName: p[2] };
    }) : [];
}

function setBounties(list) {
    api.setLobbyDbValue("bounties", list.map(b => `${b.targetName},${b.amount},${b.setterName}`).join(";"));
}

function addBounty(setterId, targetName, amount) {
    const tokens = getPlayerTokens(setterId);
    if (tokens < amount) return false;
    setPlayerTokens(setterId, tokens - amount);
    const list = getBounties();
    const existing = list.find(b => b.targetName.toLowerCase() === targetName.toLowerCase());
    if (existing) existing.amount += amount;
    else list.push({ targetName, amount, setterName: api.getEntityName(setterId) });
    setBounties(list);
    return true;
}

function claimBounty(killerId, victimId) {
    const victimName = api.getEntityName(victimId);
    const list = getBounties();
    const idx = list.findIndex(b => b.targetName.toLowerCase() === victimName.toLowerCase());
    if (idx >= 0) {
        const b = list[idx];
        setPlayerTokens(killerId, getPlayerTokens(killerId) + b.amount);
        api.broadcastMessage(`&6[Bounty] &e${api.getEntityName(killerId)} claimed the ${b.amount} token bounty on ${victimName}!`);
        list.splice(idx, 1);
        setBounties(list);
    }
}

function updatePlayerNameTag(playerId) {
    const activeRankIdx = Number(api.getPlayerDbValue(playerId, "activeRankIdx")) || 0;
    const rank = RANKS[activeRankIdx];
    const name = api.getEntityName(playerId);
    const prestige = getPlayerPrestige(playerId);
    let tags = [];
    if (prestige > 0) tags.push({ str: `[P${prestige}] `, style: { color: "gold", fontWeight: "bold" } });
    tags.push({ icon: rank.icon === "user" ? "Fist" : (rank.icon === "crown" ? "Trader Piggy" : "Question Mark"), style: { color: rank.color } });
    if (ADMINS.includes(name)) tags.push({ str: " 🛡️ Admin ", style: { color: "aqua" } });
    tags.push({ str: ` [${rank.name}] ${name}`, style: { color: rank.color } });
    api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", { content: tags }, true);
}

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
    const prestige = getPlayerPrestige(playerId);
    const claims = getOwnedChunks(api.getPlayerDbId(playerId)).length;
    const k = getPlayerKills(playerId);
    const d = getPlayerDeaths(playerId);

    api.setClientOption(playerId, "RightInfoText", [
        { str: " ❤️ Hafuja's Domain ❤️ \n", style: { color: "#ffff00", fontWeight: "bold", fontSize: "20px" } },
        { str: `  ${allPlayers.length}/23 | Zone ${Math.floor(Math.abs(pos.x)/2000) + 1}\n\n`, style: { color: "#ffffff", fontSize: "14px" } },
        { str: " OWNER: ", style: { color: "#aa0000", fontWeight: "bold" } },
        { str: `${chunk ? (chunk.name || chunk.ownerName) : "Unclaimed"}\n`, style: { color: "#ffffff" } },
        { icon: "Trader Blue", style: { color: "#ffffaa" } },
        { str: ` Money: $${tokens.toLocaleString()}\n`, style: { color: "#ffffaa" } },
        { icon: "Haste", style: { color: "#aaaaff" } },
        { str: ` EXP: ${exp}\n`, style: { color: "#aaaaff" } },
        { icon: "Trader Piggy", style: { color: "#ff5555" } },
        { str: ` Tokens: ${lbux}\n`, style: { color: "#ff5555" } },
        { icon: "Farming Yield", style: { color: "#aaffaa" } },
        { str: ` Claims: ${claims}\n`, style: { color: "#aaffaa" } },
        { icon: "Fist", style: { color: "#ffaaaa" } },
        { str: ` K/D: ${k}/${d}\n\n`, style: { color: "#ffaaaa" } },
        { str: prestige > 0 ? ` [P${prestige}] ` : "", style: { color: "gold", fontWeight: "bold" } },
        { str: ` Rank: ${rank.name}\n`, style: { color: rank.color } },
        { str: " Gamemode Creator: Hafuja ", style: { color: "#aaaaaa", fontSize: "10px" } }
    ]);
}

// --- 5. Shop GUI ---

function updateShop(playerId) {
    const tokens = getPlayerTokens(playerId);
    const currentRankIdx = getPlayerRank(playerId);
    const activeRankIdx = Number(api.getPlayerDbValue(playerId, "activeRankIdx")) || 0;
    const prestige = getPlayerPrestige(playerId);
    const pos = api.getPosition(playerId);
    if (!pos) return;
    const chunkId = getChunkId(pos);
    const chunk = getChunkData(chunkId);
    const dbId = api.getPlayerDbId(playerId);

    // Ranks
    RANKS.forEach((rank, idx) => {
        let status = "Buy";
        if (idx <= currentRankIdx) status = (idx === activeRankIdx) ? "Selected" : "Select";
        api.createShopItemForPlayer(playerId, "Ranks", "rank_" + idx, {
            image: rank.image, customTitle: `${rank.name} [${status}]`, cost: (status === "Buy") ? rank.cost : 0,
            description: `Tier ${idx + 1} | ${rank.focus} focus. Status: ${status}`, canBuy: (status !== "Buy") || tokens >= rank.cost
        });
    });

    // Prestige
    const prestigeCost = 2000000 * (prestige + 1);
    api.createShopItemForPlayer(playerId, "Ranks", "prestige", {
        image: "Crown", customTitle: "PRESTIGE", cost: prestigeCost,
        description: `Reset your rank for perks. Cost: ${prestigeCost}`,
        canBuy: tokens >= prestigeCost && currentRankIdx === RANKS.length - 1
    });

    // Plot Management
    if (chunk && chunk.ownerDbId === dbId) {
        api.createShopItemForPlayer(playerId, "My Plot", "rename_plot", { image: "Board", customTitle: "Rename Plot", cost: 0, userInput: { type: "text", placeholderText: "New Name" } });
        api.createShopItemForPlayer(playerId, "My Plot", "tp_home", { image: "Red Bed", customTitle: "Teleport Home", cost: 0 });
        api.createShopItemForPlayer(playerId, "My Plot", "set_tp", { image: "Compass", customTitle: "Set Plot Spawn", cost: 0 });
        api.createShopItemForPlayer(playerId, "My Plot", "toggle_tp", { image: "Green Portal", customTitle: chunk.tpOpen ? "Close Plot" : "Open Plot", cost: 0 });
        api.createShopItemForPlayer(playerId, "My Plot", "trust_build", { image: "Wood Plank", customTitle: "Trust Build", cost: 0, userInput: { type: "text", placeholderText: "Player Name" } });
        api.createShopItemForPlayer(playerId, "My Plot", "trust_break", { image: "Iron Pickaxe", customTitle: "Trust Break", cost: 0, userInput: { type: "text", placeholderText: "Player Name" } });
        api.createShopItemForPlayer(playerId, "My Plot", "trust_interact", { image: "Oak Door", customTitle: "Trust Interact", cost: 0, userInput: { type: "text", placeholderText: "Player Name" } });
        api.createShopItemForPlayer(playerId, "My Plot", "sell_plot", { image: "Chest", customTitle: "List for Sale", cost: 0, userInput: { type: "number", placeholderText: "Price" } });
    } else if (!chunk) {
        api.createShopItemForPlayer(playerId, "My Plot", "claim", { image: "Chunk Map", customTitle: "Claim Plot", cost: 0, description: "Costs 1 Gold Coin.", canBuy: api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1 });
    }

    // Real Estate
    getMarketplace().forEach(item => {
        api.createShopItemForPlayer(playerId, "Real Estate", "market_" + item.chunkId, {
            image: "Chunk Map", customTitle: `${item.customTitle} ($${item.price})`, cost: item.price,
            description: `Seller: ${item.ownerName}`, canBuy: tokens >= item.price && item.ownerDbId !== dbId
        });
        if (item.tpOpen) api.createShopItemForPlayer(playerId, "Visit Plots", "tp_" + item.chunkId, { image: "Compass", customTitle: `Visit: ${item.ownerName}`, cost: 0 });
    });

    // Bank
    api.createShopItemForPlayer(playerId, "Bank", "withdraw_coin", { image: "Gold Coin", customTitle: "Withdraw Coin", cost: 500, canBuy: tokens >= 500 });
    api.createShopItemForPlayer(playerId, "Bank", "deposit_coin", { image: "Common Lottery Ticket", customTitle: "Deposit Coin", cost: 0, canBuy: api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1 });

    // Buy/Sell
    BUY_ITEMS.forEach(o => api.createShopItemForPlayer(playerId, "Buy", "buy_item_" + o.item, { image: o.image, customTitle: o.item, cost: o.cost, canBuy: tokens >= o.cost }));
    SELL_ITEMS.forEach(o => {
        const p = getDynamicPrice(o.item);
        api.createShopItemForPlayer(playerId, "Sell", "sell_item_" + o.item, { image: o.image, customTitle: `Sell ${o.item}`, cost: -p, description: `Price: ${p}`, canBuy: api.getInventoryItemAmount(playerId, o.item) >= 1, sell: true });
    });
    const sv = calculateSellAllValue(playerId);
    api.createShopItemForPlayer(playerId, "Sell", "sell_all", { image: "Chest", customTitle: "SELL ALL", cost: -sv, description: `Total: ${sv} tokens`, canBuy: sv > 0, sell: true });

    // Lucky Blocks
    LUCKY_BLOCK_TYPES.forEach(lb => api.createShopItemForPlayer(playerId, "Lucky Blocks", "lucky_" + lb.item, { image: lb.image, customTitle: `Buy ${lb.item}`, cost: 0, description: `Costs 1 ${KEY_ITEM_NAME}`, canBuy: api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1 }));
    api.createShopItemForPlayer(playerId, "Lucky Blocks", "open_lucky", { image: "Iron Chest", customTitle: "Open Lucky Now", cost: 0, canBuy: api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1 });

    // Bounties & Rewards
    api.createShopItemForPlayer(playerId, "Bounties", "set_bounty", { image: "Paper", customTitle: "Set Bounty", cost: 0, userInput: { type: "text", placeholderText: "PlayerName Amount" } });
    getBounties().forEach((b, i) => api.createShopItemForPlayer(playerId, "Bounties", "view_bounty_" + i, { image: "Fist", customTitle: `${b.targetName}: ${b.amount}`, cost: 0 }));

    const lastD = Number(api.getPlayerDbValue(playerId, "lastDaily")) || 0;
    const canD = (api.now() - lastD) >= 24 * 3600000;
    api.createShopItemForPlayer(playerId, "Rewards", "daily_reward", { image: "Iron Chest", customTitle: "Daily Reward", cost: 0, canBuy: canD });
    api.createShopItemForPlayer(playerId, "Kits", "kit_peasant", { image: "Wood Sword", customTitle: "Peasant Kit", cost: 0 });
}

// --- 6. Event Handlers ---

onPlayerChangeBlock = function(playerId, x, y, z, blockName) {
    const chunkId = getChunkId({x, y, z});
    const chunk = getChunkData(chunkId);
    if (!chunk) return;
    const dbId = api.getPlayerDbId(playerId);
    if (chunk.ownerDbId === dbId) return;
    if (blockName === "Air") {
        if (chunk.trustBreak && chunk.trustBreak.includes(dbId)) return;
        api.sendMessage(playerId, `&cNo BREAK trust.`);
    } else {
        if (chunk.trustBuild && chunk.trustBuild.includes(dbId)) return;
        api.sendMessage(playerId, `&cNo BUILD trust.`);
    }
    return "preventChange";
};

onPlayerJoin = function(playerId) {
    updateShop(playerId); updateLobbyHUD(playerId); updatePlayerNameTag(playerId);
    api.setClientOption(playerId, "showChatBubbles", true);
    if (!PLAYER_TIMERS[playerId]) PLAYER_TIMERS[playerId] = api.now();
};

onPlayerChat = function(playerId, msg) {
    msg = msg.trim();
    const stats = { tokens: getPlayerTokens(playerId), kills: getPlayerKills(playerId), deaths: getPlayerDeaths(playerId) };
    if (msg === "!bal") { api.sendMessage(playerId, `Balance: ${stats.tokens}`, { color: "#00FF00" }); return false; }
    if (msg === "!kills") { api.sendMessage(playerId, `Kills: ${stats.kills}`, { color: "#FFAA00" }); return false; }
    if (msg === "!deaths") { api.sendMessage(playerId, `Deaths: ${stats.deaths}`, { color: "#FF5555" }); return false; }
    if (msg === "!kdr") { let kdr = stats.deaths === 0 ? stats.kills.toFixed(2) : (stats.kills / stats.deaths).toFixed(2); api.sendMessage(playerId, `KDR: ${kdr}`, { color: "#AAAAFF" }); return false; }
    if (msg.startsWith("!pay ")) {
        const p = msg.split(" "); const tName = p[1]; const amt = parseInt(p[2]); const tId = getPlayerIdByName(tName);
        if (!tId || tId === playerId || isNaN(amt) || amt <= 0 || stats.tokens < amt) { api.sendMessage(playerId, "Invalid payment.", { color: "red" }); return false; }
        setPlayerTokens(playerId, stats.tokens - amt); setPlayerTokens(tId, getPlayerTokens(tId) + amt);
        api.sendMessage(playerId, `Paid ${amt} to ${tName}`); api.sendMessage(tId, `Received ${amt} from ${api.getEntityName(playerId)}`);
        return false;
    }
    return true;
};

onPlayerKilled = function(victimId, killerId) {
    if (!killerId) return;
    setPlayerKills(killerId, getPlayerKills(killerId) + 1); setPlayerDeaths(victimId, getPlayerDeaths(victimId) + 1);
    setPlayerExp(killerId, getPlayerExp(killerId) + 50); claimBounty(killerId, victimId);
    updateLobbyHUD(killerId); updateLobbyHUD(victimId);
};

onPlayerBoughtShopItem = function(playerId, categoryKey, itemKey, userInput) {
    const dbId = api.getPlayerDbId(playerId); const pos = api.getPosition(playerId); const chunkId = getChunkId(pos); const tokens = getPlayerTokens(playerId);

    if (itemKey === "sell_all") {
        const v = calculateSellAllValue(playerId);
        if (v > 0) { SELL_ITEMS.forEach(i => { const a = api.getInventoryItemAmount(playerId, i.item); if (a > 0 && isSellable(i.item)) { api.removeItemName(playerId, i.item, a); adjustDynamicPrice(i.item, false); } }); setPlayerTokens(playerId, tokens + v); api.sendMessage(playerId, `Sold all for ${v}`); }
    }
    if (itemKey === "open_lucky") { if (api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1) { api.removeItemName(playerId, KEY_ITEM_NAME, 1); openLuckyBlock(playerId, "Lucky Block"); } }
    if (itemKey === "daily_reward") {
        const lastD = Number(api.getPlayerDbValue(playerId, "lastDaily")) || 0;
        if ((api.now() - lastD) >= 24 * 3600000) { const r = Math.floor(Math.random() * 500) + 100; setPlayerTokens(playerId, tokens + r); api.setPlayerDbValue(playerId, "lastDaily", api.now()); api.sendMessage(playerId, `Daily reward: ${r}`); }
    }
    if (itemKey === "prestige") {
        const p = getPlayerPrestige(playerId); const cost = 2000000 * (p + 1);
        if (tokens >= cost && getPlayerRank(playerId) === RANKS.length - 1) { setPlayerTokens(playerId, tokens - cost); setPlayerRank(playerId, 0); api.setPlayerDbValue(playerId, "activeRankIdx", 0); setPlayerPrestige(playerId, p + 1); api.broadcastMessage(`&6&l[PRESTIGE] &e${api.getEntityName(playerId)} reached Prestige ${p + 1}!`); updatePlayerNameTag(playerId); }
    }
    if (itemKey === "set_bounty") { const p = userInput.split(" "); if (addBounty(playerId, p[0], parseInt(p[1]))) api.broadcastMessage(`&6[Bounty] &e${api.getEntityName(playerId)} set ${p[1]} on ${p[0]}!`); }

    if (itemKey.startsWith("trust_")) {
        const type = itemKey.replace("trust_", ""); const tId = getPlayerIdByName(userInput); const c = getChunkData(chunkId);
        if (c && c.ownerDbId === dbId && tId) { const tDbId = api.getPlayerDbId(tId); if (type === "build") c.trustBuild.push(tDbId); if (type === "break") c.trustBreak.push(tDbId); if (type === "interact") c.trustInteract.push(tDbId); setChunkData(chunkId, c); api.sendMessage(playerId, `Granted ${type} trust.`); }
    }
    if (itemKey.startsWith("rank_")) {
        const idx = parseInt(itemKey.split("_")[1]); const r = RANKS[idx]; const owned = getPlayerRank(playerId);
        if (idx <= owned) { api.setPlayerDbValue(playerId, "activeRankIdx", idx); updatePlayerNameTag(playerId); }
        else if (idx === owned + 1 && tokens >= r.cost) { setPlayerTokens(playerId, tokens - r.cost); setPlayerRank(playerId, idx); api.setPlayerDbValue(playerId, "activeRankIdx", idx); updatePlayerNameTag(playerId); }
    }
    if (itemKey === "claim") {
        if (api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1) { api.removeItemName(playerId, CURRENCY_ITEM, 1); setChunkData(chunkId, { ownerDbId: dbId, ownerName: api.getEntityName(playerId), name: "Plot", trustBuild: [], trustBreak: [], trustInteract: [], tpPoint: pos, tpOpen: false, forSale: false, price: 0 }); addOwnedChunk(dbId, chunkId); api.sendMessage(playerId, "Plot claimed!"); }
    }
    if (itemKey === "rename_plot") { const c = getChunkData(chunkId); if (c && c.ownerDbId === dbId) { c.name = userInput; setChunkData(chunkId, c); api.sendMessage(playerId, "Plot renamed."); } }
    if (itemKey === "tp_home") { const c = getChunkData(chunkId); if (c && c.ownerDbId === dbId) api.setPosition(playerId, c.tpPoint.x, c.tpPoint.y, c.tpPoint.z); }
    if (itemKey === "set_tp") { const c = getChunkData(chunkId); if (c && c.ownerDbId === dbId) { c.tpPoint = pos; setChunkData(chunkId, c); api.sendMessage(playerId, "Spawn set."); } }
    if (itemKey === "toggle_tp") { const c = getChunkData(chunkId); if (c && c.ownerDbId === dbId) { c.tpOpen = !c.tpOpen; setChunkData(chunkId, c); } }
    if (itemKey === "withdraw_coin") { if (tokens >= 500) { setPlayerTokens(playerId, tokens - 500); api.giveItem(playerId, CURRENCY_ITEM, 1); } }
    if (itemKey === "deposit_coin") { if (api.getInventoryItemAmount(playerId, CURRENCY_ITEM) >= 1) { api.removeItemName(playerId, CURRENCY_ITEM, 1); setPlayerTokens(playerId, tokens + 450); } }
    if (itemKey.startsWith("buy_item_")) { const item = itemKey.replace("buy_item_", ""); const b = BUY_ITEMS.find(i => i.item === item); if (tokens >= b.cost) { setPlayerTokens(playerId, tokens - b.cost); api.giveItem(playerId, item, 1); adjustDynamicPrice(item, true); } }
    if (itemKey.startsWith("sell_item_")) { const item = itemKey.replace("sell_item_", ""); const p = getDynamicPrice(item); if (api.getInventoryItemAmount(playerId, item) >= 1) { api.removeItemName(playerId, item, 1); setPlayerTokens(playerId, tokens + p); adjustDynamicPrice(item, false); } }
    if (itemKey.startsWith("lucky_")) { const item = itemKey.replace("lucky_", ""); if (api.getInventoryItemAmount(playerId, KEY_ITEM_NAME) >= 1) { api.removeItemName(playerId, KEY_ITEM_NAME, 1); api.giveItem(playerId, item, 1); } }
    if (itemKey === "kit_peasant") { const last = Number(api.getPlayerDbValue(playerId, "lastKit")) || 0; if (api.now() - last >= 86400000) { ["Wood Sword", "Wood Hang Glider", "Wood Pickaxe", "Wood Axe", "Wood Spade"].forEach(i => api.giveItem(playerId, i, 1)); api.setPlayerDbValue(playerId, "lastKit", api.now()); } }
    if (itemKey === "sell_plot") {
        const c = getChunkData(chunkId); const p = parseInt(userInput);
        if (c && c.ownerDbId === dbId && !isNaN(p)) {
            c.forSale = true; c.price = p; setChunkData(chunkId, c);
            const m = getMarketplace(); m.push({ chunkId, price: p, ownerName: c.ownerName, customTitle: c.name, ownerDbId: dbId, tpOpen: c.tpOpen }); setMarketplace(m);
        }
    }
    if (itemKey.startsWith("market_")) {
        const tid = itemKey.replace("market_", ""); const m = getMarketplace(); const idx = m.findIndex(i => i.chunkId === tid); const l = m[idx]; const tc = getChunkData(tid);
        if (tc && tokens >= l.price) {
            removeOwnedChunk(tc.ownerDbId, tid); addOwnedChunk(dbId, tid); setPlayerTokens(playerId, tokens - l.price);
            tc.ownerDbId = dbId; tc.ownerName = api.getEntityName(playerId); tc.forSale = false; tc.trustBuild = []; tc.trustBreak = []; tc.trustInteract = []; setChunkData(tid, tc);
            m.splice(idx, 1); setMarketplace(m); api.sendMessage(playerId, "Purchased plot!");
        }
    }
    if (itemKey.startsWith("tp_")) { const tid = itemKey.replace("tp_", ""); const tc = getChunkData(tid); if (tc && tc.tpOpen) api.setPosition(playerId, tc.tpPoint.x, tc.tpPoint.y, tc.tpPoint.z); }

    updateShop(playerId); updateLobbyHUD(playerId);
};

// --- 7. Main Loop ---

const PLAYER_TIMERS = {};
let lastEconomyUpdate = 0;

tick = function() {
    const now = api.now();
    if (now - lastEconomyUpdate >= 300000) { updateDynamicPrices(); lastEconomyUpdate = now; }
    api.getPlayerIds().forEach(p => {
        if (now - (PLAYER_TIMERS[p] || now) >= SESSION_REWARD_MINUTES * 60000) { api.giveItem(p, KEY_ITEM_NAME, 1); api.broadcastMessage(`&6[LoverFella] &e${api.getEntityName(p)} earned ${KEY_ITEM_NAME}!`); PLAYER_TIMERS[p] = now; }
        updateLobbyHUD(p);
        const r = RANKS[Number(api.getPlayerDbValue(p, "activeRankIdx")) || 0];
        if (r.effects) r.effects.forEach(e => api.applyEffect(p, e, 2000, { level: 1 }));
    });
};
