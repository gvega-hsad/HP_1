import { useEffect, useRef } from 'react'
import './VideoModal.css'

type Props = {
  open: boolean
  onClose: () => void
  src: string
  poster?: string
  title: string
}

/** Native <dialog> video lightbox: Esc / backdrop click / close button dismiss it. */
export default function VideoModal({ open, onClose, src, poster, title }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const d = dialog.current
    const v = video.current
    if (!d || !v) return
    if (open && !d.open) {
      d.showModal()
      v.currentTime = 0
      v.play().catch(() => {})
    } else if (!open && d.open) {
      v.pause()
      d.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      className="video-modal"
      aria-label={title}
      onClose={() => {
        video.current?.pause() // Esc closes the dialog natively, so pause here too
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <div className="video-modal__frame">
        <video ref={video} src={src} poster={poster} controls playsInline preload="none" />
        <button type="button" className="video-modal__close" onClick={onClose} aria-label="Close video">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </dialog>
  )
}
