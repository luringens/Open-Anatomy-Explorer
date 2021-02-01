import { Label, LabelSet } from "../labels/Label";
import { LZW } from "../lzw";
import { colorToHex, hexToColor, toHex } from "../utils";
import { URL, sendRequest } from "./api";

/**
 * Handles communicating with the labelset API.
 */
export default class LabelsetApi {
    private static url = URL + "labels/";

    /**
     * POSTs the set if it does not have a UUID, otherwise PUTs it.
     * @param set The Labelset to upload.
     * @returns The UUID identifying the labelset on the server.
     */
    public static async upload(set: LabelSet): Promise<string> {
        if (set.uuid == null) return this.post(set);
        else return this.put(set);
    }

    /**
     * Uploads a labelset with a UUID, replacing any existing labelset with that UUID.
     * @param set The Labelset to upload.
     * @returns The UUID identifying the labelset on the server.
     */
    public static async put(set: LabelSet): Promise<string> {
        if (set.uuid == null) return Promise.reject("Can not PUT without UUID.");
        const url = LabelsetApi.url + set.uuid;
        const options = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(JsonLabelSet.fromLabelset(set))
        };

        const response = await sendRequest(url, options);
        return await response.json() as string;
    }

    /**
     * Uploads a labelset without considering any pre-existing UUID.
     * @param set The Labelset to upload.
     * @returns The UUID identifying the labelset on the server.
     */
    public static async post(set: LabelSet): Promise<string> {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(JsonLabelSet.fromLabelset(set))
        };

        const response = await sendRequest(LabelsetApi.url, options);
        return await response.json() as string;
    }

    /**
     * Load a labelset by it's UUID.
     */
    public static async loadByUuid(uuid: string): Promise<LabelSet> {
        const url = `${LabelsetApi.url}uuid/${uuid}`;
        const options = { method: "GET" };
        const response = await sendRequest(url, options);
        const jsonSet = await response.json() as JsonLabelSet;

        return JsonLabelSet.toLabelset(jsonSet);
    }

    /**
     * Loads a labelset by its ID number.
     */
    public static async load(id: number): Promise<LabelSet> {
        const url = LabelsetApi.url + String(id);
        const options = { method: "GET" };
        const response = await sendRequest(url, options);
        const jsonSet = await response.json() as JsonLabelSet;

        return JsonLabelSet.toLabelset(jsonSet);
    }

    /**
     * Deletes a labelset by its UUID.
     */
    public static async delete(uuid: string): Promise<void> {
        const url = LabelsetApi.url + uuid;
        const options = { method: "DELETE" };
        await sendRequest(url, options);
    }
}

/**
 * Labelset representation matching what the server expects.
 * Used for converting between the local and the remote format.
 */
class JsonLabelSet {
    id: number | null;
    name: string;
    uuid: string | null;
    model: number;
    labels: JsonLabel[];

    constructor(id: number | null, name: string, model: number, labels: JsonLabel[], uuid: string | null = null) {
        this.id = id ?? 0;
        this.name = name;
        this.model = model;
        this.labels = labels;
        this.uuid = uuid;
    }

    static fromLabelset(set: LabelSet): JsonLabelSet {
        const labels = set.labels.map((l) => JsonLabel.fromLabel(l));
        return new JsonLabelSet(set.id, set.name, set.modelId, labels, set.uuid);
    }

    static toLabelset(self: JsonLabelSet): LabelSet {
        if (self.id == null) throw "Server returned null labelset id!";
        const labels = [];
        for (let i = 0; i < self.labels.length; i++) {
            labels.push(JsonLabel.toLabel(self.labels[i], i));
        }
        return new LabelSet(self.id, self.uuid, self.model, labels, self.name);
    }
}

/**
 * Label representation matching what the server expects.
 * Used for converting between the local and the remote format.
 * Notably, it compresses the list of labels
 */
class JsonLabel {
    name: string;
    colour: string;
    vertices: string;

    constructor(name: string, colour: string, vertices: string) {
        this.name = name;
        this.colour = colour;
        this.vertices = vertices;
    }

    static fromLabel(label: Label): JsonLabel {
        // First, compress to a hex string.
        // Next, compress using LZW and convert to hex again, because
        // we're transmitting utf8 not bytes.
        const hex = label.vertices.map(toHex).join(",");
        const vertices = LZW.compress(hex).map(toHex).join(",");

        return new JsonLabel(label.name, colorToHex(label.color), vertices);
    }

    static toLabel(self: JsonLabel, id: number): Label {
        const lzw = self.vertices.split(",").map(n => parseInt(n, 16));
        const vertices = LZW.decompress(lzw).split(",").map(n => parseInt(n, 16));
        return new Label(vertices, hexToColor(self.colour), id, self.name);
    }
}
