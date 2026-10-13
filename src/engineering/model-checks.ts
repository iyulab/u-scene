/** Input checks shared by the presets: a number that cannot be drawn honestly is rejected,
 *  never coerced into a drawing. Each helper throws a TypeError naming the field. */

/** `value` must be a finite number. */
export function finite(value: number, at: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`u-scene: ${at} must be a finite number`);
  }
}

/** `value` must be finite and greater than 0. */
export function positive(value: number, at: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    throw new TypeError(`u-scene: ${at} must be a finite number greater than 0`);
  }
}

/** `value` must be finite and at least 0. */
export function nonNegative(value: number, at: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value >= 0)) {
    throw new TypeError(`u-scene: ${at} must be a finite number of at least 0`);
  }
}
