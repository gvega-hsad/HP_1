import LoopingVideo from '../components/LoopingVideo'
import './MagicWords.css'

const A = '/assets'

const steps = [
  {
    n: 1,
    title: 'Wield your Magic Remote',
    body: 'Any LG TV running webOS 25 or later will do. Make sure you’re signed in to your LG account.',
  },
  {
    n: 2,
    title: 'Hold down the mic button',
    body: 'Speak the words, “Ready for Hogwarts.” In a British accent, if you prefer.',
  },
  {
    n: 3,
    title: 'Watch your TV transform',
    body: 'Your home screen displays a Harry Potter theme with Gallery+ art at the ready.',
  },
]

export default function MagicWords() {
  return (
    <section className="magic" data-section="magic-words">
      <div className="magic__inner">
        <div className="magic__row">
          <LoopingVideo
            className="magic__media reveal"
            src={`${A}/hp-teaser.mp4`}
            poster={`${A}/magic-poster.jpg`}
            label="Ollivander in the HBO series"
          />
          <div className="magic__text">
            <p className="overline reveal" style={{ '--d': 1 } as React.CSSProperties}>only on webos</p>
            <h2 className="t3 reveal" style={{ '--d': 2 } as React.CSSProperties}>Say the magic words</h2>
            <p className="body-2 reveal" style={{ '--d': 3 } as React.CSSProperties}>
              A spoken charm turns your LG TV into your own Platform 9¾. No wand necessary, just your Magic Remote.
            </p>
          </div>
        </div>

        <ol className="magic__steps reveal">
          {steps.map((s, i) => (
            <li className="magic__step" key={s.n} style={{ '--i': i } as React.CSSProperties}>
              <span className="magic__num font-jazmin" aria-hidden="true">{s.n}</span>
              <h3 className="subtitle-2">
                <span className="visually-hidden">Step {s.n}: </span>
                {s.title}
              </h3>
              <p className="body-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
