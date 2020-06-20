import { Renderer } from "./renderer";
import { Object3D, Mesh } from "three";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelManager {
    private static readonly url = "http://51.15.231.127:5000/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Mesh) => void) | null = null;

    public constructor(callback: (_: Object3D) => void, renderer: Renderer, name: string) {
        this.renderer = renderer;

        this.getModelList(this.populateModelList.bind(this));
        ModelManager.load(name, (GLTF: GLTF) => {
            const mesh = ModelManager.findMesh(GLTF.scene.children);
            if (mesh == null) throw "Could not find mesh";
            callback(mesh);
            this.loadModel(GLTF);
        });
    }

    private static findMesh(objs: Object3D[]): Mesh | null {
        for (const obj of objs) {
            if (obj.type == "Mesh") return obj as Mesh;

            const childMesh = ModelManager.findMesh(obj.children);
            if (childMesh != null) return childMesh;
        }
        return null;
    }

    public setOnload(callback: (model: Mesh) => void): void {
        this.onload = callback;
    }

    public static load(name: string, callback: (_: GLTF) => void): void {
        new GLTFLoader().load(
            "Box.glb",
            callback,
            undefined,
            (error) => console.error(error)
        );
    }

    private loadModel(GLTF: GLTF): void {
        const mesh = ModelManager.findMesh(GLTF.scene.children);
        if (mesh == null) throw "Could not find mesh";
        this.renderer.loadObject(mesh);
        if (this.onload != null && mesh != null)
            this.onload(mesh);
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
