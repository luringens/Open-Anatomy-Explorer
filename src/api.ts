import { colorToHex, hexToColor, LZW, toHex } from "./utils";
import { Label, LabelSet } from "./labels/Label";

export default class Api {
    private static readonly url = "http://localhost:8001/";

    public static Users = {
        url: Api.url + "users/",

        async register(username: string, password: string): Promise<void> {
            const url = this.url + "create";
            const options = {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, password: password })
            };

            await sendRequest(url, options);
        },

        async login(username: string, password: string): Promise<void> {
            const url = this.url + "login";
            const options = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, password: password })
            };
            await sendRequest(url, options);
        },

        async logout(): Promise<void> {
            const url = this.url + "logout";
            const options = { method: "POST" };
            await sendRequest(url, options);
        },

        async addLabel(labelsetUuid: string): Promise<void> {
            const url = this.url + `labelsets/${labelsetUuid}`;
            const options = { method: "PUT" };
            await sendRequest(url, options);
        },

        async removeLabel(labelsetUuid: string): Promise<void> {
            const url = this.url + `labelsets/${labelsetUuid}`;
            const options = { method: "DELETE" };
            await sendRequest(url, options);
        },

        async getLabels(): Promise<JsonUserLabelSets[]> {
            const url = this.url + "labelsets";
            const options = { method: "GET" };
            const response = await sendRequest(url, options);

            return await response.json() as JsonUserLabelSets[];
        },
    }

    public static Labels = {
        url: Api.url + "labels/",

        /// POSTs the set if it does not have a UUID, otherwise PUTs it.
        async upload(set: LabelSet): Promise<string> {
            if (set.uuid == null) return this.post(set);
            else return this.put(set);
        },

        async put(set: LabelSet): Promise<string> {
            if (set.uuid == null) return Promise.reject("Can not PUT without UUID.");
            const url = this.url + set.uuid;
            const options = {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonLabelSet.fromLabelset(set))
            };

            const response = await sendRequest(url, options);
            return await response.json() as string;
        },

        async post(set: LabelSet): Promise<string> {
            const options = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonLabelSet.fromLabelset(set))
            };

            const response = await sendRequest(this.url, options);
            return await response.json() as string;
        },

        async load(uuid: string): Promise<LabelSet> {
            const url = this.url + uuid;
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            const jsonSet = await response.json() as JsonLabelSet;

            return JsonLabelSet.toLabelset(jsonSet, uuid);
        },

        async delete(uuid: string): Promise<void> {
            const url = this.url + uuid;
            const options = { method: "DELETE" };
            await sendRequest(url, options);
        },
    }

    public static modelStorage = {
        url: Api.url + "modelstorage/",

        async lookup(modelId: number): Promise<string> {
            const url = `${this.url}lookup/${modelId}`;
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            return await response.json() as string;
        }
    }
}

async function sendRequest(url: string, options: RequestInit): Promise<Response> {
    const response = await fetch(url, options);
    if (!response.ok) return Promise.reject(`Server returned HTTP ${response.status}.`);
    return response;
}

export class JsonUserLabelSets {
    id: number;
    name: string;
    uuid: string;

    constructor(id: number, name: string, uuid: string) {
        this.id = id;
        this.name = name;
        this.uuid = uuid;
    }
}

export class JsonLabelSet {
    name: string;
    uuid: string | null;
    model: number;
    labels: JsonLabel[];

    constructor(name: string, model: number, labels: JsonLabel[], uuid: string | null = null) {
        this.name = name;
        this.model = model;
        this.labels = labels;
        this.uuid = uuid;
    }

    static fromLabelset(set: LabelSet): JsonLabelSet {
        const labels = set.labels.map((l) => JsonLabel.fromLabel(l));
        return new JsonLabelSet(set.name, set.modelId, labels, set.uuid);
    }

    static toLabelset(self: JsonLabelSet, uuid: string): LabelSet {
        const labels = [];
        for (let i = 0; i < self.labels.length; i++) {
            labels.push(JsonLabel.toLabel(self.labels[i], i));
        }
        return new LabelSet(uuid, self.model, labels);
    }
}

export class JsonLabel {
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
