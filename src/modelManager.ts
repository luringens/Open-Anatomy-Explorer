import { Renderer } from "./renderer";
import { Object3D } from "three";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';

export class ModelManager {
    private static readonly url = "http://localhost:8001/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Object3D, name: string) => void) | null = null;

    public constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.getModelList(this.populateModelList.bind(this));
    }

    public setOnload(callback: (model: Object3D, name: string) => void): void {
        this.onload = callback;
    }

    public static async loadAsync(name: string): Promise<THREE.Group> {
        if (name.endsWith(".obj")) {
            // OBJ file loading
            return await new OBJLoader2().loadAsync(this.url + name) as THREE.Group;
        } else {
            // Default to GLTF
            const data = await new GLTFLoader().loadAsync(this.url + name) as GLTF;
            return data.scene; // ?
        }
    }

    private loadModel(name: string, model: Object3D): void {
        this.renderer.loadObject(model);
        if (this.onload != null && model != null)
            this.onload(model, name);
    }

    private getModelList(callback: (names: string[]) => void): void {
        void fetch(ModelManager.url)
            .then(res => res.json())
            .then(callback);
    }

    private populateModelList(names: string[]): void {
        const div = document.getElementById("models") as HTMLElement;
        names.forEach(name => {
            if (name.endsWith(".ini") || name.endsWith(".dat")) return;
            const row = document.createElement("tr");

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
                this.loadModel(name, await ModelManager.loadAsync(name));
        });
    }
}
