# DEV post draft

Paste-ready draft for the Hacktoberfest Week 2 post. Edit it in your own voice before publishing. Two spots are marked **TODO**: fill them in or delete them. Nothing here invents a field test.

---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

Walk the Block is a phone tool for drive-for-dollars in Hemet, Riverside County. I research houses for wholesale. The job is simple and a little uncomfortable: you drive a neighborhood, look for a roof under a tarp or a yard that has gone to seed, and then you have to write to a person you have never met.

The app lets me snap the front of the house. Gemma, an open-weight vision model, returns a 0–100 distress score and only the signals it can actually see: tarp or damaged roof, overgrown yard, boarded windows, peeling paint, piled mail, junk, a broken fence, a vacant look. It is told not to guess why the house looks that way. Then I get a short postcard in English or Spanish that does not mention the photo at all. No false urgency. No hint that the owner is in trouble. Just: I am a local buyer, there is no pressure, here is my number.

The lead list, the photos, and the notes stay in the browser (IndexedDB). I can sort by score and export a CSV. The only things that leave the phone are the ones I trigger: the photo goes to the Gemma backend I picked, and if I tap **Look up street**, the GPS pin (only the pin) goes to OpenStreetMap to fill in a street name. No analytics, no app server.

Who would pay: wholesalers and small investors who already pay for driving-for-dollars software, around $19 a month. What they are paying for is a list. I would rather that list not sit in a vendor's cloud.

## Demo

https://walk-the-block.casmazariegos.workers.dev

Demo mode needs no key. Tap one of the four public-domain sample houses, read the score, switch the postcard to Spanish, and open Leads. Those sample scores are hand-labeled so the demo works with no key, and the app labels them that way. Scoring your own photo needs either Ollama or your own AI Studio key.

**TODO:** add one real Gemma reading here: a screenshot of the app scoring a photo with AI Studio, or the output of `GEMINI_API_KEY=… npm test`. Delete this line if you can't get one in time.

## Code

https://github.com/CasMazariegos/walk-the-block (MIT)

## How I Built It

A static Vite + React + TypeScript app, deployed to Cloudflare Workers static assets (`npm run cf:deploy`). No app server.

One interface, two Gemma backends:

- **Private:** Ollama, default model `gemma3:4b` (vision starts at 4B). `gemma3:1b` is text-only and the app says so. The browser sends the photo to an address I type, usually a laptop on the same Wi-Fi.
- **Hosted:** Google AI Studio / Gemini API, default model `gemma-4-31b-it`, with `gemma-4-26b-a4b-it` as the other vision option. My key stays in localStorage.

The model must answer with JSON. The parser accepts fenced JSON, trailing commas, and scores that arrive as strings. If Gemma writes its own postcard, the app checks it word by word. A draft that mentions the roof, the yard, foreclosure, or urgency is thrown out, and a fixed, respectful script is used instead. The check works in Spanish too, without tripping on ordinary words like *sin embargo*. Address, notes, and the GPS pin are never put in the model request.

In-browser Gemma is not bundled. A vision model that is actually useful is a multi-gigabyte download, which is the wrong trade when you are standing at a curb.

## Why Does Open Innovation Matter?

The photo of a stranger's house, tied to an address, is private business data. A closed app wants that pair in its database, because the list is the product. An open-weight model is what lets the scoring happen on a machine I control, with no per-photo bill and no lock-in to one vendor's vision API. If Ollama is down I can point the same screen at AI Studio, and if I stop paying Google I still have the weights. The open model is the part the product cannot lose.

## My First User

Me, on my own routes in Hemet. **TODO:** one honest sentence about the first block you try it on, or delete this section (it is optional).

## Prize Categories

- Best Use of Gemma

Tags: `devchallenge`, `hf26challenge`
