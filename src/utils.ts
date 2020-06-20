/// Remember to sort first.
export function binarySearch(array: number[], value: number): number | null {
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

export function toHex(i: number): string {
    let s = i.toString(16);
    while (s.length < 2) {
        s = "0" + s;
    }
    return s;
}