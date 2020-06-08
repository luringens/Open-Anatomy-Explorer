import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Renderer } from "./renderer";
import { Object3D } from "three";

export class ModelManager {
    private static readonly url = "http://51.15.231.127:5000/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Object3D) => void) | null = null;

    public constructor(callback: (_: GLTF) => void, renderer: Renderer, name: string) {
        this.renderer = renderer;

        this.getModelList(this.populateModelList.bind(this));
        ModelManager.load(name, (obj: GLTF) => {
            callback(obj);
            this.loadModel(obj);
        });
    }

    public setOnload(callback: (model: Object3D) => void): void {
        this.onload = callback;
    }

    public static load(name: string, callback: (_: GLTF) => void): void {
        new GLTFLoader().load(
            ModelManager.url + name,
            callback,
            undefined,
            (error) => console.error(error)
        );
    }

    private loadModel(model: GLTF): void {
        this.renderer.loadObject(model.scene);
        if (this.onload != null && model.scene != null)
            this.onload(model.scene);
    }

    private getModelList(callback: (names: string[]) => void): void {
        fetch(ModelManager.url)
            .then(res => res.json())
            .then(callback);
    }

    private populateModelList(names: string[]): void {
        const div = document.getElementById("models") as HTMLElement;
        names.forEach(name => {
            if (name.endsWith(".ini") || name.endsWith(".dat")) return;
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            const nameLabel = document.createElement("label");
            nameLabel.innerText = name;
            nameLabel.classList.add("label-name");
            nameCell.appendChild(nameLabel);
            row.appendChild(nameCell);

            const buttonCell = document.createElement("td");
            const button = document.createElement("button");
            button.innerText = "Load";
            buttonCell.appendChild(button);
            row.appendChild(buttonCell);

            div.appendChild(row);

            button.onclick = (): void =>
                ModelManager.load(name, this.loadModel.bind(this));
        });
    }
}
