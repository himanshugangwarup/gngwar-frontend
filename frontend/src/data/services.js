// Central catalog for GngWar services + pricing.
// Prices per user spec (Feb 2026 update). Original = ~15% higher for strikethrough.

export const PRICING = [
  { duration: "30 Minutes", price: 75, original: 86 },
  { duration: "45 Minutes", price: 112.5, original: 129 },
  { duration: "60 Minutes", price: 150, original: 173 },
  { duration: "90 Minutes", price: 225, original: 259 },
  { duration: "120 Minutes", price: 300, original: 345 },
  { duration: "180 Minutes", price: 450, original: 518 },
];

export const DEFAULT_DURATION = "60 Minutes";

export const formatINR = (v) =>
  Number.isInteger(v) ? `₹${v}` : `₹${v.toFixed(2).replace(/\.?0+$/, "")}`;

export const getPriceFor = (duration) =>
  PRICING.find((p) => p.duration === duration) || PRICING[2];

export const SERVICES = [
  {
    slug: "sweeping-mopping",
    name: "Sweeping + Mopping",
    description: "A spotless, refreshed floor from room to room.",
    emoji: "🧹",
    tag: "cleaning",
  },
  {
    slug: "utensils-dishwashing",
    name: "Utensils / Dishwashing",
    description: "Thoughtful kitchen cleanup, handled with care.",
    emoji: "🍽️",
    tag: "kitchen",
  },
  {
    slug: "dusting-wiping",
    name: "Dusting + Wiping",
    description: "Detail-led dust removal for a cleaner everyday home.",
    emoji: "✨",
    tag: "cleaning",
  },
  {
    slug: "bathroom-cleaning",
    name: "Bathroom Cleaning",
    description: "A hygienic, sparkling reset for your bathroom.",
    emoji: "🚿",
    tag: "cleaning",
  },
  {
    slug: "kitchen-cleaning",
    name: "Kitchen Cleaning",
    description: "Grease, spills and surfaces made fresh again.",
    emoji: "🍳",
    tag: "kitchen",
  },
  {
    slug: "laundry",
    name: "Laundry",
    description: "Neat, reliable laundry help that fits your routine.",
    emoji: "👕",
    tag: "laundry",
  },
  {
    slug: "ironing-folding",
    name: "Ironing + Folding",
    description: "Crisp clothes, neatly folded and ready to wear.",
    emoji: "🧺",
    tag: "laundry",
  },
  {
    slug: "window-cleaning",
    name: "Window Cleaning",
    description: "Clearer glass and brighter rooms, without the hassle.",
    emoji: "🪟",
    tag: "cleaning",
  },
  {
    slug: "fan-cleaning",
    name: "Fan Cleaning",
    description: "A careful clean for fresher air and quieter fans.",
    emoji: "🌀",
    tag: "cleaning",
  },
  {
    slug: "balcony-cleaning",
    name: "Balcony Cleaning",
    description: "Bring your outdoor corner back to life.",
    emoji: "🌿",
    tag: "cleaning",
  },
  {
    slug: "kitchen-prep",
    name: "Kitchen Prep / Basic Cooking Help",
    description: "A helping hand for everyday kitchen prep.",
    emoji: "🥣",
    tag: "kitchen",
  },
  {
    slug: "packing-unpacking",
    name: "Packing / Unpacking",
    description: "Make moving days calmer, one box at a time.",
    emoji: "📦",
    tag: "cleaning",
  },
];

export const QUICK_SERVICES = [
  "🧹 Sweeping + Mopping",
  "🍽️ Utensils / Dishwashing",
  "✨ Dusting + Wiping",
  "🚿 Bathroom Cleaning",
  "🍳 Kitchen Cleaning",
  "👕 Laundry",
];
