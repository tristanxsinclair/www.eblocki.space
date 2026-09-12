/** Parent-studio configuration. Do not ship a guessed or placeholder URL. */
export const SINK_SPACE_HOME_URL =
  (import.meta.env.VITE_SINK_SPACE_URL as string | undefined)?.trim() || null;
