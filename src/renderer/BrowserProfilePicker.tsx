import { useCallback, useEffect, useRef, useState } from 'react'

type BrowserProfile = {
  id: string
  name: string
  partition: string
  createdAt: string
  avatarColor: string
}

type Props = {
  onProfileChange: (partition: string) => void
}

export default function BrowserProfilePicker({ onProfileChange }: Props) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<BrowserProfile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showDashlane, setShowDashlane] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const api = (window as any).electronAPI

  const refreshProfiles = useCallback(async () => {
    const [list, active] = await Promise.all([
      api.browserProfile.list(),
      api.browserProfile.getActive(),
    ])

    setProfiles(list)
    setActiveId(active)

    if (list.length === 0) {
      setShowDashlane(true)
    }
  }, [])

  useEffect(() => {
    if (!open) { return }

    void refreshProfiles()
  }, [open, refreshProfiles])

  useEffect(() => {
    if (!open) { return }

    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)

    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleCreate = async () => {
    const trimmed = newName.trim()

    if (!trimmed) { return }

    const result = await api.browserProfile.create({ name: trimmed })

    if (result.ok && result.profile) {
      setActiveId(result.profile.id)
      onProfileChange(result.profile.partition)
    }

    setNewName('')
    setCreating(false)
    await refreshProfiles()
  }

  const handleSwitch = async (profile: BrowserProfile) => {
    await api.browserProfile.setActive({ profileId: profile.id })
    setActiveId(profile.id)
    onProfileChange(profile.partition)
    setOpen(false)
  }

  const handleDelete = async (profileId: string) => {
    await api.browserProfile.delete({ profileId })
    await refreshProfiles()
  }

  const activeProfile = profiles.find((p) => p.id === activeId)
  const avatarColor = activeProfile?.avatarColor ?? '#5b8fff'
  const displayInitial = activeProfile?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={panelRef} className="browser-profile-picker" onMouseDown={(e) => e.stopPropagation()}>
      <button
        className="browser-profile-avatar"
        onClick={() => setOpen(!open)}
        title={activeProfile ? `Profile: ${activeProfile.name}` : 'Browser Profiles'}
        style={{ backgroundColor: avatarColor }}
      >
        {activeProfile ? displayInitial : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </button>

      {open && (
        <div className="browser-profile-panel">
          <div className="browser-profile-panel-header">Profiles</div>

          {showDashlane && profiles.length === 0 && (
            <div className="browser-profile-dashlane">
              <span className="browser-profile-dashlane-icon">🔑</span>
              <span>For password sync across profiles, we recommend <strong>Dashlane</strong>. Install it as a Chrome extension after creating a profile.</span>
            </div>
          )}

          <div className="browser-profile-list">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`browser-profile-item ${profile.id === activeId ? 'active' : ''}`}
                onClick={() => void handleSwitch(profile)}
              >
                <div
                  className="browser-profile-item-avatar"
                  style={{ backgroundColor: profile.avatarColor }}
                >
                  {profile.name[0]?.toUpperCase()}
                </div>
                <div className="browser-profile-item-info">
                  <span className="browser-profile-item-name">{profile.name}</span>
                  {profile.id === activeId && (
                    <span className="browser-profile-item-active">Active</span>
                  )}
                </div>
                <button
                  className="browser-profile-item-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDelete(profile.id)
                  }}
                  title="Delete profile"
                >
                  &times;
                </button>
              </div>
            ))}

            {profiles.length === 0 && !creating && (
              <div className="browser-profile-empty">
                No profiles yet. Create one to save cookies, sign-ins, and extensions separately.
              </div>
            )}
          </div>

          {creating ? (
            <div className="browser-profile-create-row">
              <input
                className="browser-profile-create-input"
                placeholder="Profile name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { void handleCreate() } }}
                autoFocus
              />
              <button
                className="browser-profile-create-btn"
                onClick={() => void handleCreate()}
              >
                Add
              </button>
              <button
                className="browser-profile-cancel-btn"
                onClick={() => { setCreating(false); setNewName('') }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="browser-profile-add-btn"
              onClick={() => setCreating(true)}
            >
              + New Profile
            </button>
          )}

          <div className="browser-profile-tip">
            Each profile has its own cookies, storage, and extensions — like Chrome's profile system.
          </div>
        </div>
      )}
    </div>
  )
}
