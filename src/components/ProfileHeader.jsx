import { useState } from 'react'
import useIdbImage from '../lib/useIdbImage'
import { putBlob } from '../lib/idb'
import LevelBadge from './LevelBadge'

export default function ProfileHeader({ profile, xp, editMode, onProfileChange, onToggleEdit, onOpenCustomize, onNotify }) {
  const avatarUrl = useIdbImage(profile.avatar.type === 'idb' ? profile.avatar.value : null)
  const avatarSrc = profile.avatar.type === 'url' && profile.avatar.value ? profile.avatar.value : avatarUrl
  const [avatarUrlInput, setAvatarUrlInput] = useState('')

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await putBlob('avatar', file)
      onProfileChange({ avatar: { type: 'idb', value: 'avatar' } })
    } catch {
      onNotify('Could not store avatar — browser storage may be full or blocked.')
    }
    e.target.value = ''
  }

  return (
    <header className="profile-header">
      <div className="avatar-column">
        <div className="avatar-frame">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" />
          ) : (
            <div className="avatar-empty">No Avatar</div>
          )}
        </div>
        {editMode && (
          <div className="card-toolbar">
            <label className="btn btn-sm">
              Upload avatar
              <input type="file" accept="image/*" hidden onChange={handleAvatarFile} />
            </label>
            <input
              placeholder="Avatar URL"
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            />
            <button
              className="btn btn-sm"
              onClick={() => {
                if (avatarUrlInput.trim()) onProfileChange({ avatar: { type: 'url', value: avatarUrlInput.trim() } })
              }}
              style={{ marginTop: 6 }}
            >
              Set
            </button>
          </div>
        )}
      </div>
      <div className="profile-info">
        {editMode ? (
          <input
            className="display-name-input"
            value={profile.displayName}
            onChange={(e) => onProfileChange({ displayName: e.target.value })}
          />
        ) : (
          <h1 className="display-name">{profile.displayName}</h1>
        )}
        <div className="status-line">
          {editMode ? (
            <>
              <input
                placeholder="Status"
                value={profile.status.text}
                onChange={(e) => onProfileChange({ status: { ...profile.status, text: e.target.value } })}
                style={{ width: 140 }}
              />
              <input
                type="color"
                value={profile.status.color}
                onChange={(e) => onProfileChange({ status: { ...profile.status, color: e.target.value } })}
                style={{ width: 34, padding: 2 }}
                title="Status color"
              />
            </>
          ) : (
            <span style={{ color: profile.status.color }}>{profile.status.text}</span>
          )}
        </div>
        <LevelBadge xp={xp} />
        <div className="profile-fields">
          {editMode ? (
            <>
              <input
                placeholder="Real name"
                value={profile.realName}
                onChange={(e) => onProfileChange({ realName: e.target.value })}
                style={{ width: '100%', marginBottom: 6 }}
              />
              <input
                placeholder="Location"
                value={profile.location}
                onChange={(e) => onProfileChange({ location: e.target.value })}
                style={{ width: '100%' }}
              />
            </>
          ) : (
            <>
              {profile.realName && <div className="field">{profile.realName}</div>}
              {profile.location && <div className="field">{profile.location}</div>}
            </>
          )}
        </div>
        <div className="summary-box">
          {editMode ? (
            <textarea
              rows={3}
              placeholder="Write your summary..."
              value={profile.summary}
              onChange={(e) => onProfileChange({ summary: e.target.value })}
              style={{ width: '100%' }}
            />
          ) : (
            profile.summary || <span style={{ color: 'var(--text-dim)' }}>No information given.</span>
          )}
        </div>
        <div className="header-actions">
          <button className={`btn ${editMode ? 'btn-edit-active' : ''}`} onClick={onToggleEdit}>
            {editMode ? 'Done Editing' : 'Edit Profile'}
          </button>
          <button className="btn" onClick={onOpenCustomize}>
            Customize
          </button>
        </div>
      </div>
    </header>
  )
}
