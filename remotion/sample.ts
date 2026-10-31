// Preview data for `npm run studio` and the offline test render.
import type { RenderProps } from "../shared/storyboard";

const img = (id: string) => `https://images.unsplash.com/${id}?w=1080&q=80`;

export const sampleProps: RenderProps = {
  brandName: "Bloom Coffee",
  logoUrl: null,
  musicUrl: null,
  storyboard: {
    title: "Bloom Coffee launch",
    caption: "Your morning just got an upgrade ☕️",
    hashtags: ["coffee", "specialtycoffee"],
    musicMood: "upbeat",
    font: "Montserrat",
    palette: { primary: "#6B3F2A", accent: "#F2B544", background: "#1A120D", text: "#FFF6EA" },
    ctaUrl: "https://bloom.coffee",
    scenes: [],
  },
  scenes: [
    {
      kind: "hook", headline: "Still drinking bad coffee?", subtext: null, voiceover: null,
      assetIndex: null, imagePrompt: null, animate: false, motionPrompt: null, durationSec: 2.5, transition: "zoom",
      imageUrl: img("photo-1495474472287-4d71bcdd2085"), clipUrl: null, voUrl: null, words: [], durationInFrames: 75,
    },
    {
      kind: "media", headline: "Roasted every single morning", subtext: "Small batches, big flavour", voiceover: null,
      assetIndex: null, imagePrompt: null, animate: false, motionPrompt: null, durationSec: 3.5, transition: "slide",
      imageUrl: img("photo-1447933601403-0c6688de566e"), clipUrl: null, voUrl: null, durationInFrames: 105,
      words: [],
    },
    {
      kind: "feature", headline: "Order ahead in seconds", subtext: "Skip the line with the Bloom app", voiceover: null,
      assetIndex: null, imagePrompt: null, animate: false, motionPrompt: null, durationSec: 3.5, transition: "wipe",
      imageUrl: img("photo-1509042239860-f550ce710b93"), clipUrl: null, voUrl: null, words: [], durationInFrames: 105,
    },
    {
      kind: "quote", headline: "Best flat white in the city, no contest", subtext: "Sam, regular since day one", voiceover: null,
      assetIndex: null, imagePrompt: null, animate: false, motionPrompt: null, durationSec: 3, transition: "fade",
      imageUrl: img("photo-1501339847302-ac426a4a7cbb"), clipUrl: null, voUrl: null, words: [], durationInFrames: 90,
    },
    {
      kind: "cta", headline: "Your first cup is on us", subtext: null, voiceover: null,
      assetIndex: null, imagePrompt: null, animate: false, motionPrompt: null, durationSec: 3, transition: "none",
      imageUrl: null, clipUrl: null, voUrl: null, words: [], durationInFrames: 90,
    },
  ],
};
