import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Renderer } from "./renderer";
import { Object3D } from "three";
import FragmentShader from "./shader.frag";
import VertexShader from "./shader.vert";
import THREE = require("three");

export class ModelManager {
    private static readonly url = "http://51.15.231.127:5000/models/";
    private readonly renderer: Renderer;
    private onload: ((model: Object3D) => void) | null = null;

    public constructor(callback: (_: GLTF) => void, renderer: Renderer, name: string) {
        this.renderer = renderer;

        this.getModelList(this.populateModelList.bind(this));
        ModelManager.load(name, callback);
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
        if (this.renderer.object != null)
            this.renderer.scene.remove(this.renderer.object);

        model.scene.receiveShadow = true;
        model.scene.castShadow = true;

        model.scene.children.forEach(ModelManager.setMaterial.bind(this));

        this.renderer.object = model.scene;
        this.renderer.scene.add(model.scene);
        if (this.onload != null && this.renderer.object != null)
            this.onload(this.renderer.object);
    }

    private static setMaterial(obj: Object3D): void {
        const mesh = obj as THREE.Mesh;
        // let texture: THREE.Texture | null = null;
        // if (mesh.material instanceof THREE.MeshStandardMaterial) {
        //     texture = mesh.material.map;
        // }
        // const newMaterial = new THREE.MeshStandardMaterial();
        // newMaterial.map = texture;
        // mesh.material = newMaterial;

        mesh.material = new THREE.ShaderMaterial({
            uniforms: {
                worldLightPosition: {
                    value: new THREE.Vector3(0.0, 100.0, 0.0)
                },
                baseColor: {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                ambientIntensity: { value: 1.0 },
                specularIntensity: { value: 1.0 },
                diffuseIntensity: { value: 1.0 },
                specularReflection: { value: 0.2 },
                diffuseReflection: { value: 0.2 },
                ambientReflection: { value: 0.2 },
                shininess: { value: 20.0 },
            },
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            name: "custom-material",
        });

        obj.children.forEach(ModelManager.setMaterial.bind(this));
    }

    private getModelList(callback: (names: string[]) => void): void {
        fetch(ModelManager.url)
            .then(res => res.json())
            .then(callback);
    }

    private populateModelList(names: string[]): void {
        const div = document.getElementById("models") as HTMLElement;
        names.forEach(name => {
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
