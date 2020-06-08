// import { SavedRegion } from "./labelManager";

export class LabelStorage {
    private static readonly url = "http://51.15.231.127:5000/LabelPoints";
    public static loadLabels(/*uuid: string*/): void {
        // const options = { method: "GET" };
        // fetch(this.url + "/" + uuid, options)
        //     .then(async (response) => {
        //         LabelStorage.handleError(response);
        //         const data = await response.json() as SavedRegion[];
        //         data.forEach(item => {
        //             if (item.model !== this.modelName) return;
        //             const p = item;
        //             const vec = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
        //             const savedRegion = new SavedRegion(vec, p.color, p.radius, p.id, p.model, p.name);
        //             this.positions.push(savedRegion);
        //             const element = this.createRow(savedRegion);
        //             this.listContainer.append(element);
        //             // if (this.visible)
        //             // TODO: reimplement
        //             //this.renderer.setlabelPosition(p.pos, p.color);
        //             this.nextLabelId = Math.max(this.nextLabelId, p.id);
        //         });
        //     });
    }

    public static storeLabels(): void {
        // this.updateNames();
        // const options = {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(this.positions)
        // };
        // fetch(this.url, options)
        //     .then(async (response) => {
        //         if (!response.ok || response.body == null) {
        //             throw new Error(
        //                 "Server responded " + response.status + " " + response.statusText
        //             );
        //         }
        //         const data = await response.json();
        //         console.info("Data stored - UUID: " + data)
        //         window.location.href = window.origin + "?id=" + data;
        //     });
    }

    public static updateLabels(): void {
        // this.updateNames();
        // if (this.uuid == null) throw "UUID is null.";
        // const options = {
        //     method: "PUT",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(this.positions)
        // };
        // fetch(this.url + "/" + this.uuid, options)
        //     .then((response) => {
        //         if (!response.ok || response.body == null) {
        //             throw new Error(
        //                 "Server responded " + response.status + " " + response.statusText
        //             );
        //         }
        //         console.info("Data updated")
        //         window.location.href = window.origin + "?id=" + this.uuid;
        //     });
    }

    public static deleteLabels(): void {
        // if (this.uuid == null) throw "UUID is null.";
        // const options = {
        //     method: "DELETE",
        // };
        // fetch(this.url + "/" + this.uuid, options)
        //     .then((response) => {
        //         if (!response.ok || response.body == null) {
        //             throw new Error(
        //                 "Server responded " + response.status + " " + response.statusText
        //             );
        //         }
        //         console.info("Data deleted")
        //         window.location.href = window.origin;
        //     });
    }

    private static handleError(response: Response): void {
        if (!response.ok || response.body == null) {
            throw new Error(
                "Server responded " + response.status + " " + response.statusText
            );
        }
    }
}