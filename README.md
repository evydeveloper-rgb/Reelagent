# ReelAgent

Text an agent on iMessage or WhatsApp. Send it a website URL, some photos, or just an idea, and it sends back a short vertical video. Reply "post" and it publishes to Instagram Reels, TikTok, LinkedIn and YouTube Shorts. It can also make and post a fresh video every day.

```
iMessage / WhatsApp
      │
worker/ (Photon v1 API: polls messages) ──► convex/worker.receive ──► agent.ts (Claude decides: make / revise / post / schedule)
                                                              │
                                     pipeline.ts: scrape site → Claude storyboard (sees the images)
                                                  → fal: Kling clips + Flux images → ElevenLabs voiceover
                                                              │ status: render_queued
worker/ (Remotion) ◄──────────── subscribes to the render queue, renders 1080×1920 H.264, uploads to Convex
      │
outbox → preview video + caption in chat → "post" → social.ts (Upload-Post: IG, TikTok, LinkedIn, YT Shorts)
       + share page /v?j=<job> to download and post manually
crons.ts → daily.ts: hourly check, starts the day's video for users with daily posting on
```

## Setup

```bash
npm install
npx convex login && npx convex dev     # cloud deployment: Instagram needs public video URLs
npx convex env set WORKER_SECRET <random>
npx convex env set ANTHROPIC_API_KEY ...
npx convex env set FAL_KEY ...
npx convex env set UPLOAD_POST_API_KEY ...
# optional: ELEVENLABS_API_KEY, FIRECRAWL_API_KEY (see .env.example)
```

Add to `.env.local`: `WORKER_SECRET` (same value), `PHOTON_PROJECT_ID` and `PHOTON_API_KEY` from [app.photon.codes](https://app.photon.codes) (project Settings). Whatever channels the Photon project has enabled (iMessage, WhatsApp, SMS) work automatically.

```bash
npm run worker          # chat + renderer   (npm run worker -- chat | render to split them)
npm run studio          # Remotion Studio: tweak the templates with sample data
```

**Music:** put royalty-free tracks at `public/music/{energetic,chill,cinematic,upbeat}.mp3`. Claude picks the mood, and the music is ducked under the voiceover automatically.

**Posting:** customers never sign up anywhere else. On their first "post" they get an Upload-Post connect link (one page for Instagram, TikTok, LinkedIn, YouTube) and are sent back to `/connected`, which texts them a confirmation. Instagram needs a Business or Creator account.

## Where the quality comes from

- **Claude Opus storyboard with vision.** It sees the uploaded photos and website screenshots and chooses the shot for each scene. It follows a short-form playbook: a hook under 2 seconds, one idea per scene, and a CTA at the end.
- **Remotion templates** (`remotion/`): kinetic typography, brand palette and font, Ken Burns on stills, 3D product cards for screenshots, karaoke captions synced to ElevenLabs word timings, varied transitions, and text kept inside Instagram's safe zones.
- **AI clips** only on 1–3 hero moments (`MAX_AI_CLIPS`). They're the expensive part, and if one fails or times out that scene falls back to Ken Burns.
- **Revisions** ("make it punchier") re-plan from the previous storyboard instead of starting over.
- **Daily posts** rotate through the photo library and avoid repeating recent angles.
