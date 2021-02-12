/**
 * Class to work with the hash-part of the current site address.
 */
export class HashAddress {
    public action: HashAddressType;
    public uuid: string;

    /**
     * Constructs a new instance of the hashaddress class.
     * @param uuid A uuid associated with the instance.
     * @param action The action associated with the instance.
     */
    public constructor(uuid: string, action: HashAddressType) {
        this.action = action;
        this.uuid = uuid;
    }

    /**
     * Constructs an instance of the class from the current address.
     * Returns null if there's no valid hash address set.
     */
    public static fromAddress(): HashAddress | null {
        const parts = location.hash.slice(1).split(",");
        if (parts.length < 2)
            return null;

        const action = parseHashAddressType(parts[0]);
        const uuid: string = parts[1];

        if (action == undefined || uuid.length != 36)
            return null;

        return new HashAddress(uuid, action);
    }

    /**
     * Applies the action and UUID from the instance to the address bar.
     */
    public set(): void {
        let path = `${window.origin}${location.pathname}#${this.action},`;
        if (this.uuid != null)
            path += this.uuid;
        window.location.href = path;
    }

    /**
     * Removes any present hash address from the address bar.
     */
    public static unset(): void {
        const path = `${window.origin}${location.pathname}#`;
        window.location.href = path;
    }

    /**
     * Checks if the hash address type matches any from the given list.
     * @param actions The list of address types to compare to.
     */
    public static isOfType(actions: (HashAddressType | null)[]): boolean {
        const address = HashAddress.fromAddress();
        for (let i = 0; i < actions.length; i++) {
            if (actions[i] == address?.action) {
                return true;
            }
        }
        return false;
    }


}

export enum HashAddressType {
    Label = "LABEL",
    QuizCreate = "QUIZCREATE",
    QuizEdit = "QUIZEDIT",
    QuizTake = "QUIZTAKE"
}

/**
 * Parses a hash address string to the enum.
 * @param input 
 */
function parseHashAddressType(input: string): HashAddressType | null {
    switch (input) {
        case "LABEL": return HashAddressType.Label;
        case "QUIZCREATE": return HashAddressType.QuizCreate;
        case "QUIZEDIT": return HashAddressType.QuizEdit;
        case "QUIZTAKE": return HashAddressType.QuizTake;
        default: return null;
    }
}
