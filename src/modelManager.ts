import { Renderer } from "./renderer";
import { Object3D, Group, Mesh, LoadingManager } from "three";
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export class ModelManager {
    private static readonly url = "http://51.15.231.127:5000/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Mesh) => void) | null = null;

    public constructor(callback: (_: Object3D) => void, renderer: Renderer, name: string) {
        this.renderer = renderer;

        this.getModelList(this.populateModelList.bind(this));
        ModelManager.load(name, (group: Group) => {
            const mesh = ModelManager.findMesh(group.children);
            if (mesh == null) throw "Could not find mesh";
            callback(mesh);
            this.loadModel(group);
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

    public static load(name: string, callback: (_: Group) => void): void {
        const manager = new LoadingManager();
        manager.addHandler(/\.dds$/i, new DDSLoader());

        new MTLLoader(manager).load(
            "HandArm-HR-reduced.obj.mtl",
            (materials: MTLLoader.MaterialCreator) => {
                materials.preload();
                new OBJLoader(manager)
                    .setMaterials(materials)
                    .load(
                        "HandArm-HR-reduced.obj",
                        callback,
                        undefined,
                        (error: unknown) => console.error(error)
                    );
            }
        );
    }

    private loadModel(group: Group): void {
        const mesh = ModelManager.findMesh(group.children);
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
