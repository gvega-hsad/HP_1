import { useEffect, useRef, useState } from 'react'
import './LoopingVideo.css'

type Props = {
  src: string
  poster: string
  label: string
  className?: string
  /** Show a sound on/off control next to pause/play. */
  soundToggle?: boolean
}

/**
 * Muted, looping background-style video with pause/play (and optional sound)
 * controls. Starts paused for people who prefer reduced motion.
 */
export default function LoopingVideo({ src, poster, label, className, soundToggle }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) v.play().catch(() => setPlaying(false))
  }, [])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  const toggleSound = () => {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (!v.muted && v.paused) v.play()
  }

  return (
    <div className={`looping-video ${className ?? ''}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="looping-video__controls">
        {soundToggle && (
          <button
            type="button"
            className={`looping-video__toggle${muted ? '' : ' is-on'}`}
            onClick={toggleSound}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            aria-pressed={!muted}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
              {muted ? (
                <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path
                  className="looping-video__waves"
                  d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        )}
        <button
          type="button"
          className="looping-video__toggle"
          onClick={toggle}
          aria-label={playing ? 'Pause video' : 'Play video'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
