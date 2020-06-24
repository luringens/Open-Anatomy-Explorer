import { Renderer } from "./renderer";
import { Object3D, Mesh } from "three";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelManager {
    private static readonly url = "http://51.15.231.127:5000/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Mesh, name: string) => void) | null = null;

    public constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.getModelList(this.populateModelList.bind(this));
    }

    private static findMesh(objs: Object3D[]): Mesh | null {
        for (const obj of objs) {
            if (obj.type == "Mesh") return obj as Mesh;

            const childMesh = ModelManager.findMesh(obj.children);
            if (childMesh != null) return childMesh;
        }
        return null;
    }

    public setOnload(callback: (model: Mesh, name: string) => void): void {
        this.onload = callback;
    }

    public static load(name: string, callback: (_: Mesh) => void): void {
        new GLTFLoader().load(
            this.url + name,
            (gltf: GLTF) => {
                const mesh = this.findMesh(gltf.scene.children);
                if (mesh == null) throw "Could not find mesh";
                callback(mesh);
            },
            undefined,
            (error) => console.error(error)
        );
    }

    public static async loadAsync(name: string): Promise<Mesh> {
        const url = this.url;
        return new Promise(function (resolve, reject) {
            new GLTFLoader().load(
                url + name,
                (gltf: GLTF) => {
                    const mesh = ModelManager.findMesh(gltf.scene.children);
                    if (mesh == null) reject("Could not find mesh");
                    else resolve(mesh);
                },
                undefined,
                (error) => console.error(error)
            );
        });
    }

    private loadModel(name: string, mesh: Mesh): void {
        this.renderer.loadObject(mesh);
        if (this.onload != null && mesh != null)
            this.onload(mesh, name);
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
                ModelManager.load(name, this.loadModel.bind(this, name));
        });
    }
}
