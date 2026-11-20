import { useEffect, useRef, useState } from 'react'
import './ImageModal.css'

export type ModalImage = { src: string; alt: string }

type Props = {
  images: ModalImage[]
  /** index of the image to show, or null when closed */
  index: number | null
  onClose: () => void
  onIndex: (i: number) => void
  label?: string
}

/**
 * Native <dialog> image lightbox with cycling: prev/next buttons, ← / → keys and a
 * horizontal swipe move through the set (wrapping round); Esc, the close button or a
 * click on the backdrop dismiss it. Images crossfade as you move between them.
 */
export default function ImageModal({ images, index, onClose, onIndex, label = 'Image viewer' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(index ?? 0) // image on screen (lags index during the fade)
  const [fading, setFading] = useState(false)
  const touchX = useRef<number | null>(null)
  const open = index !== null
  const n = images.length

  // open / close the dialog
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      setShown(index!)
      d.showModal()
    } else if (!open && d.open) d.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // crossfade to a new index while open
  useEffect(() => {
    if (!open || index === shown) return
    setFading(true)
    const t = window.setTimeout(() => {
      setShown(index!)
      setFading(false)
    }, 220)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // preload the neighbours so cycling is instant
  useEffect(() => {
    if (!open) return
    ;[shown - 1, shown + 1].forEach((i) => {
      const img = new Image()
      img.src = images[(i + n) % n].src
    })
  }, [open, shown, images, n])

  const go = (step: number) => {
    if (index === null) return
    onIndex((index + step + n) % n)
  }

  const img = images[shown]

  return (
    <dialog
      ref={dialog}
      className="image-modal"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(-1)
        }
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      }}
    >
      <figure className="image-modal__frame">
        {img && (
          <img
            key={img.src}
            className={`image-modal__img${fading ? ' is-fading' : ''}`}
            src={img.src}
            alt={img.alt}
          />
        )}
        <figcaption className="image-modal__caption">
          <span>{img?.alt}</span>
          <span className="image-modal__count" aria-live="polite">
            {shown + 1} / {n}
          </span>
        </figcaption>
      </figure>

      <button type="button" className="image-modal__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {n > 1 && (
        <>
          <button type="button" className="image-modal__nav image-modal__nav--prev" onClick={() => go(-1)} aria-label="Previous image">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="image-modal__nav image-modal__nav--next" onClick={() => go(1)} aria-label="Next image">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </dialog>
  )
}
