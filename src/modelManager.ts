import Renderer from "./renderer";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from "three";
import { URL } from "./Api/api";
import Notification, { StatusType } from "./notification";
import ModelApi, { JsonModel } from "./Api/models";
import { MtlObjBridge } from "three/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js";

/**
 * This class handles loading and parsing models and the list of models from a remote server.
 * Uses the API URL from the Api class as the source of the API.
 */
export class ModelManager {
    private static readonly url = URL + "models/";
    private readonly renderer: Renderer;
    private onload: ((id: number) => void) | null = null;

    /**
     * Constructs the ModelManager
     * @param renderer The renderer to hand off models to.
     */
    public constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    /**
     * Sets a callback to call with the ID of the model loaded whenever a model is loaded.
     * This is only really used to make sure the label system is notified that it should discard
     * it's data to avoid it painting the vertices of the new model.
     * @param callback The function to call whenever a new model is loaded.
     */
    public setOnload(callback: (id: number) => void): void {
        this.onload = callback;
    }

    /**
     * Load and parse a model with the specified ID.
     * Currently supports:
     * - Single OBJ files, with or without vertex colours.
     * - OBJ files with an associated materials and texture file.
     * - GLB files, which are compressed GLTF files with an embedded texture.
     * @param modelId The ID of the model to load, or the JsonModel returned by ModelApi.lookup.
     */
    public static async loadAsync(modelReference: JsonModel | number): Promise<THREE.Object3D> {

        let model: JsonModel;
        if (typeof (modelReference) == "number") {
            model = await ModelApi.lookup(modelReference);
        } else {
            model = modelReference;
        }

        const clearStatus = Notification.message("Loading model...", StatusType.Info);

        // OBJ file loading
        if (model.filename.endsWith(".obj")) {

            // Seperate material and texture handling
            if (model.material != null && model.texture != null) {
                const manager = new THREE.LoadingManager();
                const materials = await new MTLLoader(manager)
                    .setPath(this.url)
                    .loadAsync(model.material) as MTLLoader.MaterialCreator;
                // materials.loadTexture(this.url + model.texture, );
                materials.preload();

                const loader = new OBJLoader2(manager);
                loader.addMaterials(MtlObjBridge.addMaterialsFromMtlLoader(materials), true);
                loader.setPath(this.url);
                const group = await loader.loadAsync(this.url + model.filename) as THREE.Group;

                return group;
            }

            // Vertex colours.
            else {
                const group = await new OBJLoader2().loadAsync(this.url + model.filename) as THREE.Group;
                clearStatus();
                return group;
            }
        }

        // Default to GLTF
        else {
            const data = await new GLTFLoader().loadAsync(this.url + model.filename) as GLTF;
            clearStatus();
            return data.scene; // ?
        }
    }

    /**
     * Load the model list and render the user interface elements for it.
     */
    public async loadModelList(): Promise<void> {
        const list = await ModelApi.list();
        this.populateModelList(list);
    }

    /**
     * Hides or displays the model loading UI.
     * @param visible The desired visibility of the UI.
     */
    public setInterfaceVisibility(visible: boolean): void {
        const div = document.getElementById("models-container") as HTMLElement;
        if (visible) {
            div.classList.remove("hide");
        } else {
            div.classList.add("hide");
        }
    }

    /**
     * Renders the model list interface.
     * @param list List of model IDs and names.
     */
    private populateModelList(list: JsonModel[]): void {
        // Remove existing rows if present first.
        const oldElements = document.getElementsByClassName("model-list-row");
        while (oldElements.length > 0) {
            oldElements[oldElements.length - 1].remove();
        }

        const div = document.getElementById("models") as HTMLElement;
        list.forEach(entry => {
            const row = document.createElement("tr");
            row.classList.add("model-list-row");

            const friendlyName = entry.filename.replace(/\.[^/.]+$/, "")
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

            // On click, load the model, pass it to the renderer, and call the callback.
            button.onclick = async (): Promise<void> => {
                const model = await ModelManager.loadAsync(entry);
                this.renderer.loadObject(model);
                if (this.onload != null) this.onload(entry.id);
            }
        });
    }
}
