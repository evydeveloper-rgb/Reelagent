import { z } from "zod";

// What Claude plans. Kept flat with nullable fields so it works with structured outputs.
export const SceneSchema = z.object({
  kind: z.enum(["hook", "media", "feature", "quote", "cta"]),
  headline: z.string().describe("On-screen text. Punchy, max ~7 words."),
  subtext: z.string().nullable().describe("Optional smaller supporting line, max ~12 words."),
  voiceover: z.string().nullable().describe("Spoken line for this scene, or null for no voice."),
  assetIndex: z.number().int().nullable().describe("Index into the provided images to show, or null."),
  imagePrompt: z
    .string()
    .nullable()
    .describe("If no provided image fits, a prompt to generate a photorealistic 9:16 image. Otherwise null."),
  animate: z.boolean().describe("Turn this scene's image into an AI video clip (use for 1-3 hero moments)."),
  motionPrompt: z.string().nullable().describe("Camera/subject motion for the AI clip, e.g. 'slow dolly in, steam rising'."),
  durationSec: z.number().describe("2 to 6 seconds."),
  transition: z.enum(["fade", "slide", "wipe", "zoom", "none"]).describe("Transition INTO the next scene."),
});

export const StoryboardSchema = z.object({
  title: z.string(),
  caption: z.string().describe("Instagram caption: hook line, 1-3 short lines, a call to action."),
  hashtags: z.array(z.string()).describe("5-12 relevant hashtags without #."),
  musicMood: z.enum(["energetic", "chill", "cinematic", "upbeat", "none"]),
  font: z.enum(["Inter", "Montserrat", "Poppins", "Playfair Display", "Bebas Neue"]),
  palette: z.object({
    primary: z.string().describe("hex"),
    accent: z.string().describe("hex"),
    background: z.string().describe("hex"),
    text: z.string().describe("hex"),
  }),
  ctaUrl: z.string().nullable(),
  scenes: z.array(SceneSchema).describe("5-8 scenes, 15-30 seconds total. First scene must hook in under 2s."),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;

export type Word = { text: string; start: number; end: number }; // seconds, relative to scene start

// What the renderer gets: the storyboard plus resolved media.
export type RenderScene = Scene & {
  imageUrl: string | null;
  clipUrl: string | null;
  voUrl: string | null;
  words: Word[];
  durationInFrames: number;
};

export type RenderProps = {
  storyboard: Storyboard;
  scenes: RenderScene[];
  brandName: string | null;
  logoUrl: string | null;
  musicUrl: string | null;
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TRANSITION_FRAMES = 12;

export function transitionCount(scenes: { transition: Scene["transition"] }[]) {
  return scenes.slice(0, -1).filter((s) => s.transition !== "none").length;
}

export function totalFrames(scenes: { durationInFrames: number; transition: Scene["transition"] }[]) {
  const sum = scenes.reduce((a, s) => a + s.durationInFrames, 0);
  return Math.max(FPS, sum - TRANSITION_FRAMES * transitionCount(scenes));
}
