export const FRAGRANCE_NOTE_KEYS = ["top", "heart", "base"];

export const EMPTY_FRAGRANCE_NOTES = Object.freeze({
  top: [],
  heart: [],
  base: [],
});

function cleanNotes(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array of notes.`);

  const notes = [];
  for (const note of value) {
    const cleaned = String(note || "").trim().replace(/\s+/g, " ");
    if (!cleaned) continue;
    if (cleaned.length > 80) throw new Error(`${label} notes must be 80 characters or fewer.`);
    if (!notes.some((item) => item.toLowerCase() === cleaned.toLowerCase())) notes.push(cleaned);
  }
  if (notes.length > 12) throw new Error(`${label} can contain up to 12 notes.`);
  return notes;
}

export function normalizeFragranceNotes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Fragrance notes must include Top, Heart, and Base note arrays.");
  }

  return FRAGRANCE_NOTE_KEYS.reduce((notes, key) => {
    notes[key] = cleanNotes(value[key] || [], `${key[0].toUpperCase()}${key.slice(1)}`);
    return notes;
  }, {});
}

export function readFragranceNotes(value) {
  try {
    return normalizeFragranceNotes(value || EMPTY_FRAGRANCE_NOTES);
  } catch {
    return { ...EMPTY_FRAGRANCE_NOTES, top: [], heart: [], base: [] };
  }
}

export function parseFragranceNoteText(value) {
  return String(value || "")
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

export function fragranceNotesToText(value) {
  const notes = readFragranceNotes(value);
  return FRAGRANCE_NOTE_KEYS.reduce((result, key) => ({ ...result, [key]: notes[key].join(", ") }), {});
}
