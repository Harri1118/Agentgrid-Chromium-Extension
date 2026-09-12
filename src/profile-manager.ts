import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

export type BrowserProfile = {
  id: string
  name: string
  partition: string
  createdAt: string
  avatarColor: string
}

type ProfileStore = {
  profiles: BrowserProfile[]
  activeProfileId: string | null
}

const PROFILES_DIR = path.join(os.homedir(), '.agentgrid', 'browser')
const PROFILES_PATH = path.join(PROFILES_DIR, 'profiles.json')

const AVATAR_COLORS = [
  '#5b8fff', '#ff7eb3', '#6bff9e', '#ffbf00',
  '#bc8cff', '#ff6b6b', '#8cd3ff', '#ff9f43',
]

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function readStore(): ProfileStore {
  try {
    if (fs.existsSync(PROFILES_PATH)) {
      return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf-8')) as ProfileStore
    }
  } catch {}

  return { profiles: [], activeProfileId: null }
}

function writeStore(store: ProfileStore): void {
  ensureDir(PROFILES_DIR)
  fs.writeFileSync(PROFILES_PATH, JSON.stringify(store, null, 2))
}

export function listProfiles(): BrowserProfile[] {
  return readStore().profiles
}

export function getActiveProfileId(): string | null {
  return readStore().activeProfileId
}

export function createProfile(name: string): BrowserProfile {
  const store = readStore()
  const id = crypto.randomUUID().slice(0, 8)
  const colorIndex = store.profiles.length % AVATAR_COLORS.length
  const partition = `persist:profile_${id}`

  const profile: BrowserProfile = {
    id,
    name,
    partition,
    createdAt: new Date().toISOString(),
    avatarColor: AVATAR_COLORS[colorIndex] ?? AVATAR_COLORS[0],
  }

  store.profiles.push(profile)

  if (!store.activeProfileId) {
    store.activeProfileId = id
  }

  writeStore(store)
  console.log(`[profiles] created profile "${name}" (${id})`)

  return profile
}

export function deleteProfile(profileId: string): void {
  const store = readStore()
  const idx = store.profiles.findIndex((p) => p.id === profileId)

  if (idx < 0) {
    throw new Error(`Profile ${profileId} not found`)
  }

  store.profiles.splice(idx, 1)

  if (store.activeProfileId === profileId) {
    store.activeProfileId = store.profiles[0]?.id ?? null
  }

  writeStore(store)
  console.log(`[profiles] deleted profile ${profileId}`)
}

export function renameProfile(profileId: string, name: string): void {
  const store = readStore()
  const profile = store.profiles.find((p) => p.id === profileId)

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`)
  }

  profile.name = name
  writeStore(store)
}

export function setActiveProfile(profileId: string): void {
  const store = readStore()
  const exists = store.profiles.some((p) => p.id === profileId)

  if (!exists) {
    throw new Error(`Profile ${profileId} not found`)
  }

  store.activeProfileId = profileId
  writeStore(store)
}
