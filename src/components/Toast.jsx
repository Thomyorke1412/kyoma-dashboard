export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.kind === 'success' ? 'toast-success' : ''}`} role="alert">
      {toast.message}
    </div>
  )
}
