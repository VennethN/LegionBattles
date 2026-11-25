/**
 * The scale SVGs are rasterized at. A figure's canvas is 192 on a side, so a
 * part's picture is up to 384: sharp on a dense screen, and when a boss is
 * drawn big.
 */
export const ART_SCALE = 2;

/**
 * The scale a unit's whole picture at a pose is rasterized at. A crowd of
 * them is shown at half a figure's size or less, so the canvas's own size
 * is sharp enough, and a quarter of the room on the sheet.
 */
export const STILL_SCALE = 1;
