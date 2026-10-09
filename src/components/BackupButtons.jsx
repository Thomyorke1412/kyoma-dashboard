import { buildBackup, restoreBackup } from '../lib/backup'

export default function BackupButtons({ state, onRestore, onNotify }) {
  async function handleExport() {
    try {
      const backup = await buildBackup(state)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'steam-dashboard-backup.json'
      a.click()
      URL.revokeObjectURL(url)
      onNotify('Backup exported.', 'success')
    } catch {
      onNotify('Export failed — could not read stored images.')
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    file
      .text()
      .then((text) => JSON.parse(text))
      .then((backup) => restoreBackup(backup).then(onRestore))
      .then(() => onNotify('Backup restored.', 'success'))
      .catch(() => onNotify('Import failed — not a valid backup file.'))
    e.target.value = ''
  }

  return (
    <div className="backup-row">
      <button className="btn btn-sm" onClick={handleExport}>
        Export Backup
      </button>
      <label className="btn btn-sm">
        Import Backup
        <input type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
      </label>
    </div>
  )
}
