import { Label } from "./Label";
import { Vector4 } from "three";
import { toHex, LZW } from "../utils";

export class LabelStorage {
    private static readonly url = "http://51.15.231.127:5000/LabelPoints";

    public static loadLabels(uuid: string, callback: ((_: Label[]) => void)): void {
        const options = { method: "GET" };
        void fetch(this.url + "/" + uuid, options)
            .then(async (response) => {
                LabelStorage.handleError(response);
                const data = await response.json() as StoredLabel[];
                callback(data.map(l => StoredLabel.toLabel(l)));
            });
    }

    public static async loadLabelsAsync(uuid: string): Promise<Label[]> {
        const options = { method: "GET" };
        return fetch(this.url + "/" + uuid, options)
            .then(async (response) => {
                LabelStorage.handleError(response);
                const data = await response.json() as StoredLabel[];
                return data.map(l => StoredLabel.toLabel(l));
            });
    }

    public static storeLabels(labels: Label[]): void {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(labels.map(l => new StoredLabel(l)))
        };
        void fetch(this.url, options)
            .then(async (response) => {
                this.handleError(response);
                const data = await response.json() as string;
                console.info("Data stored - UUID: " + data)
                window.location.href = window.origin + location.pathname + "?labels=" + data;
            });
    }

    public static updateLabels(uuid: string, labels: Label[]): void {
        const options = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(labels.map(l => new StoredLabel(l)))
        };
        void fetch(this.url + "/" + uuid, options)
            .then((response) => {
                this.handleError(response);
                console.info("Data updated")
                window.location.href = window.origin + location.pathname + "?labels=" + uuid;
            });
    }

    public static deleteLabels(uuid: string): void {
        const options = {
            method: "DELETE",
        };
        void fetch(this.url + "/" + uuid, options)
            .then((response) => {
                this.handleError(response);
                console.info("Data deleted")
                window.location.href = window.origin + location.pathname;
            });
    }

    private static handleError(response: Response): void {
        if (!response.ok || response.body == null) {
            throw new Error(
                `Server responded ${response.status} ${response.statusText}`
            );
        }
    }
}

/// Labels are stored with a string format color instead of a vec3.
/// This class converts between them.
class StoredLabel {
    vertices: string;
    id: number;
    color: string;
    model: string;
    name: string;

    public constructor(label: Label) {
        this.id = label.id;
        this.model = label.model;
        this.name = label.name;
        this.color = "#"
            + toHex(label.color.x)
            + toHex(label.color.y)
            + toHex(label.color.z)
            + toHex(label.color.w);

        // First, compress to a hex string.
        // Next, compress using LZW and convert to hex again, because
        // we're transmitting utf8 not bytes.
        const hex = label.vertices.map(toHex).join(",");
        this.vertices = LZW.compress(hex).map(toHex).join(",");
    }

    public static toLabel(label: StoredLabel): Label {
        const color = new Vector4();
        color.x = parseInt(label.color.slice(1, 3), 16);
        color.y = parseInt(label.color.slice(3, 5), 16);
        color.z = parseInt(label.color.slice(5, 7), 16);
        color.w = parseInt(label.color.slice(7, 9), 16);

        const lzw = label.vertices.split(",").map(n => parseInt(n, 16));
        const vertices = LZW.decompress(lzw).split(",").map(n => parseInt(n, 16));

        return new Label(vertices, color, label.id, label.model, label.name);
    }
}
