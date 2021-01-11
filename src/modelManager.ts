import { Renderer } from "./renderer";
import { Object3D } from "three";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import Api from "./api";
import Notification, { StatusType } from "./notification";

export class ModelManager {
    private static readonly url = Api.url + "models/";
    private readonly renderer: Renderer;
    private onload: ((id: number) => void) | null = null;

    public constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    public setOnload(callback: (id: number) => void): void {
        this.onload = callback;
    }

    public static async loadAsync(modelId: number): Promise<THREE.Group> {
        const clearStatus = Notification.message("Loading model...", StatusType.Info);
        const name = await Api.modelStorage.lookup(modelId);
        if (name.endsWith(".obj")) {
            // OBJ file loading
            const group = await new OBJLoader2().loadAsync(this.url + name) as THREE.Group;
            clearStatus();
            return group;
        } else {
            // Default to GLTF
            const data = await new GLTFLoader().loadAsync(this.url + name) as GLTF;
            clearStatus();
            return data.scene; // ?
        }
    }

    private loadModel(id: number, model: Object3D): void {
        this.renderer.loadObject(model);
        if (this.onload != null && model != null)
            this.onload(id);
    }

    public async loadModelList(): Promise<void> {
        const list = await Api.modelStorage.list();
        this.populateModelList(list);
    }

    public setInterfaceVisibility(visible: boolean): void {
        const div = document.getElementById("models-container") as HTMLElement;
        if (visible) {
            div.classList.remove("hide");
        } else {
            div.classList.add("hide");
        }
    }

    private populateModelList(list: [number, string][]): void {
        const oldElements = document.getElementsByClassName("model-list-row");
        while (oldElements.length > 0) {
            oldElements[oldElements.length - 1].remove();
        }

        const div = document.getElementById("models") as HTMLElement;
        list.forEach(entry => {
            const id = entry[0], name = entry[1];

            if (!name.endsWith(".ini") && !name.endsWith(".dat")) {
                const row = document.createElement("tr");
                row.classList.add("model-list-row");

                const friendlyName = name.replace(/\.[^/.]+$/, "")
                    .replace(/^\w/, function (c) { return c.toUpperCase(); });

                const nameCell = document.createElement("td");
                const nameLabel = document.createElement("label");
                nameLabel.innerText = friendlyName;
                nameLabel.classList.add("label-name");
                nameCell.appendChild(nameLabel);
                row.appendChild(nameCell);

                const buttonCell = document.createElement("td");
                const button = document.createElement("button");
                button.innerText = "Load";
                buttonCell.appendChild(button);
                row.appendChild(buttonCell);

                div.appendChild(row);

                button.onclick = async (): Promise<void> =>
                    this.loadModel(id, await ModelManager.loadAsync(id));
            }
        });
    }
}
