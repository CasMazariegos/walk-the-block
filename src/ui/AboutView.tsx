import { SAMPLES, sampleUrl } from '../samples'

export function AboutView() {
  return (
    <section className="stack">
      <p className="eyebrow">How it works</p>
      <h1>A sidewalk tool, not a story about the owner.</h1>
      <ol className="steps">
        <li>Snap the front of the house from the sidewalk. Add the address if you already know it.</li>
        <li>Gemma marks only visible signals: roof, yard, boards, paint, mail, debris, fence, a vacant look.</li>
        <li>You get a 0–100 score for your route, and a postcard that does not mention any of that.</li>
        <li>The lead, the photo, and the note stay in this browser. Export a CSV when you want a spreadsheet.</li>
      </ol>

      <div className="card">
        <h2>Privacy</h2>
        <p>
          This app has no server. Demo readings are built in, and those sample photos are public-domain or CC0.
        </p>
        <p>
          Private mode sends the photo to an Ollama address you choose. The address, notes, and GPS pin are not part of
          that request.
        </p>
        <p>
          AI Studio mode sends the photo to Google with your key. The key lives in localStorage on this phone. Looking
          up a street name is optional and sends only the pin to OpenStreetMap.
        </p>
        <p>There is no analytics and no font server. Clearing site data clears the list.</p>
      </div>

      <div className="card">
        <h2>What it will not do</h2>
        <p>
          It will not guess why a house looks this way. It will not mention foreclosure, hardship, or the people who
          live there. A high score means visible wear, nothing more. The postcard is a fixed script unless Gemma
          returns a draft that passes the same rules.
        </p>
        <p>Not an appraisal. Not legal advice. Not a reason to pressure anyone.</p>
      </div>

      <div className="card">
        <h2>Why the model is open</h2>
        <p>
          A wholesaler’s lead list is the business. A closed driving-for-dollars app wants that list in its cloud.
          Gemma’s weights can run on your own machine, so the photo does not have to. In-browser vision is left out on
          purpose: a useful Gemma vision model is a multi-gigabyte download, which is a bad trade on a phone at the
          curb. Ollama on a laptop in the car is the private path.
        </p>
      </div>

      <div className="card">
        <h2>Sample photos</h2>
        <ul className="credits">
          {SAMPLES.map((sample) => (
            <li key={sample.id}>
              <img src={sampleUrl(sample.file)} alt="" />
              <span>
                <strong>{sample.title}.</strong> {sample.credit}{' '}
                <a href={sample.creditUrl} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
