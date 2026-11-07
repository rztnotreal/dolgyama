import { IconUndo, IconX } from './Icons'

export type ToastData = {
  id: number
  message: string
  undo?: () => void
}

type ToastProps = {
  toast: ToastData
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-message">{toast.message}</span>
      {toast.undo ? (
        <button
          type="button"
          className="toast-undo"
          onClick={() => {
            toast.undo?.()
            onClose()
          }}
        >
          <IconUndo />
          Отменить
        </button>
      ) : null}
      <button type="button" className="toast-close" onClick={onClose} aria-label="Закрыть уведомление">
        <IconX width={15} height={15} />
      </button>
      <span className="toast-progress" aria-hidden />
    </div>
  )
}
