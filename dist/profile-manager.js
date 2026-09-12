"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProfiles = listProfiles;
exports.getActiveProfileId = getActiveProfileId;
exports.createProfile = createProfile;
exports.deleteProfile = deleteProfile;
exports.renameProfile = renameProfile;
exports.setActiveProfile = setActiveProfile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const PROFILES_DIR = node_path_1.default.join(node_os_1.default.homedir(), '.agentgrid', 'browser');
const PROFILES_PATH = node_path_1.default.join(PROFILES_DIR, 'profiles.json');
const AVATAR_COLORS = [
    '#5b8fff', '#ff7eb3', '#6bff9e', '#ffbf00',
    '#bc8cff', '#ff6b6b', '#8cd3ff', '#ff9f43',
];
function ensureDir(dir) {
    node_fs_1.default.mkdirSync(dir, { recursive: true });
}
function readStore() {
    try {
        if (node_fs_1.default.existsSync(PROFILES_PATH)) {
            return JSON.parse(node_fs_1.default.readFileSync(PROFILES_PATH, 'utf-8'));
        }
    }
    catch { }
    return { profiles: [], activeProfileId: null };
}
function writeStore(store) {
    ensureDir(PROFILES_DIR);
    node_fs_1.default.writeFileSync(PROFILES_PATH, JSON.stringify(store, null, 2));
}
function listProfiles() {
    return readStore().profiles;
}
function getActiveProfileId() {
    return readStore().activeProfileId;
}
function createProfile(name) {
    const store = readStore();
    const id = node_crypto_1.default.randomUUID().slice(0, 8);
    const colorIndex = store.profiles.length % AVATAR_COLORS.length;
    const partition = `persist:profile_${id}`;
    const profile = {
        id,
        name,
        partition,
        createdAt: new Date().toISOString(),
        avatarColor: AVATAR_COLORS[colorIndex] ?? AVATAR_COLORS[0],
    };
    store.profiles.push(profile);
    if (!store.activeProfileId) {
        store.activeProfileId = id;
    }
    writeStore(store);
    console.log(`[profiles] created profile "${name}" (${id})`);
    return profile;
}
function deleteProfile(profileId) {
    const store = readStore();
    const idx = store.profiles.findIndex((p) => p.id === profileId);
    if (idx < 0) {
        throw new Error(`Profile ${profileId} not found`);
    }
    store.profiles.splice(idx, 1);
    if (store.activeProfileId === profileId) {
        store.activeProfileId = store.profiles[0]?.id ?? null;
    }
    writeStore(store);
    console.log(`[profiles] deleted profile ${profileId}`);
}
function renameProfile(profileId, name) {
    const store = readStore();
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
    }
    profile.name = name;
    writeStore(store);
}
function setActiveProfile(profileId) {
    const store = readStore();
    const exists = store.profiles.some((p) => p.id === profileId);
    if (!exists) {
        throw new Error(`Profile ${profileId} not found`);
    }
    store.activeProfileId = profileId;
    writeStore(store);
}
