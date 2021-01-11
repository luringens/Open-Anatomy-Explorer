import THREE = require("three");

export function colorToHex(color: THREE.Vector4): string {
    return "#"
        + toHex(color.x)
        + toHex(color.y)
        + toHex(color.z)
        + toHex(color.w);
}

export function hexToColor(hex: string): THREE.Vector4 {
    const color = new THREE.Vector4();
    color.x = parseInt(hex.slice(1, 3), 16);
    color.y = parseInt(hex.slice(3, 5), 16);
    color.z = parseInt(hex.slice(5, 7), 16);
    color.w = parseInt(hex.slice(7, 9), 16);
    return color;
}

export enum HashAddressType {
    Label = "LABEL",
    QuizCreate = "QUIZCREATE",
    QuizEdit = "QUIZEDIT",
    QuizTake = "QUIZTAKE",
}

function parseHashAddressType(input: string): HashAddressType | null {
    switch (input) {
        case "LABEL": return HashAddressType.Label;
        case "QUIZCREATE": return HashAddressType.QuizCreate;
        case "QUIZEDIT": return HashAddressType.QuizEdit;
        case "QUIZTAKE": return HashAddressType.QuizTake;
        default: return null;
    }
}

export class HashAdress {
    action: HashAddressType;
    uuid: string;

    constructor(uuid: string, action: HashAddressType) {
        this.action = action;
        this.uuid = uuid;
    }

    static fromAddress(): HashAdress | null {
        const parts = location.hash.slice(1).split(",");
        if (parts.length < 2) return null;

        const action = parseHashAddressType(parts[0]);
        const uuid: string = parts[1];

        if (action == undefined || uuid.length != 36) return null;

        return new HashAdress(uuid, action);
    }

    set(): void {
        let path = `${window.origin}${location.pathname}#${this.action},`;
        if (this.uuid != null) path += this.uuid;
        window.location.href = path;
    }

    static unset(): void {
        const path = `${window.origin}${location.pathname}#`;
        window.location.href = path;
    }

    static isOfType(actions: (HashAddressType | null)[]): boolean {
        const address = HashAdress.fromAddress();
        for (let i = 0; i < actions.length; i++) {
            if (actions[i] == address?.action) {
                return true;
            }
        }
        return false;
    }
}

/// Remember to sort first.
export function binarySearch(array: ArrayLike<number>, value: number): number | null {
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

/// Remember to sort first.
export function uniq(array: number[]): void {
    array.filter((item, pos, array) => !pos || item != array[pos - 1]);
}
