import THREE = require("three");

/**
 * Converts a Vector4 to a #RRGGBBAA hex string.
 * @param color The color to convert to a hex string.
 */
export function colorToHex(color: THREE.Vector4): string {
    return "#"
        + toHex(color.x)
        + toHex(color.y)
        + toHex(color.z)
        + toHex(color.w);
}

/**
 * Converts RBA hex strings to a Vector4.
 * @param hex The #RRGGBBAA hex string to decompose to a Vector4.
 */
export function hexToColor(hex: string): THREE.Vector4 {
    const color = new THREE.Vector4();
    color.x = parseInt(hex.slice(1, 3), 16);
    color.y = parseInt(hex.slice(3, 5), 16);
    color.z = parseInt(hex.slice(5, 7), 16);
    color.w = parseInt(hex.slice(7, 9), 16);
    return color;
}

/**
 * Converts a number to a hexadecimal string and pads it to a minimum of two digits.
 * @param i The number to convert to hexadecimal.
 */
export function toHex(i: number): string {
    let s = i.toString(16);
    while (s.length < 2) {
        s = "0" + s;
    }
    return s;
}

/**
 * Executes a binary search on an array.
 * IMPORTANT: Sort first!
 * @param array The array to search through.
 * @param value The value to search for.
 */
export function binarySearch<T>(array: ArrayLike<T>, value: T): number | null {
    let mid, lo = 0, hi = array.length - 1;

    while (lo <= hi) {
        mid = Math.floor((lo + hi) / 2);

        if (array[mid] > value) {
            hi = mid - 1;
        } else if (array[mid] < value) {
            lo = mid + 1;
        } else {
            return mid;
        }
    }
    return null;
}

/**
 * Deduplicates an array.
 * IMPORTANT: Sort first!
 * @param array The array to search through
 */
export function uniq(array: number[]): void {
    array.filter((item, pos, array) => !pos || item != array[pos - 1]);
}
