import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import type { Storyboard } from "../shared/storyboard";

const opts = { subsets: ["latin" as const] };

export const FONTS: Record<Storyboard["font"], string> = {
  Inter: inter("normal", { ...opts, weights: ["500", "800"] }).fontFamily,
  Montserrat: montserrat("normal", { ...opts, weights: ["500", "800"] }).fontFamily,
  Poppins: poppins("normal", { ...opts, weights: ["500", "800"] }).fontFamily,
  "Playfair Display": playfair("normal", { ...opts, weights: ["500", "800"] }).fontFamily,
  "Bebas Neue": bebas("normal", { ...opts, weights: ["400"] }).fontFamily,
};

// Body copy and captions always use a clean sans.
export const BODY_FONT = FONTS.Inter;
