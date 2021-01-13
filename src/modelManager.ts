import { Renderer } from "./renderer";
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { URL } from "./Api/api";
import Notification, { StatusType } from "./notification";
import ModelApi from "./Api/models";

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
     * - GLB files, which are compressed GLTF files with an embedded texture.
     * @param modelId The ID of the model to load
     */
    public static async loadAsync(modelId: number): Promise<THREE.Group> {
        const clearStatus = Notification.message("Loading model...", StatusType.Info);
        const name = await ModelApi.lookup(modelId);
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
    private populateModelList(list: [number, string][]): void {
        // Remove existing rows if present first.
        const oldElements = document.getElementsByClassName("model-list-row");
        while (oldElements.length > 0) {
            oldElements[oldElements.length - 1].remove();
        }

        const div = document.getElementById("models") as HTMLElement;
        list.forEach(entry => {
            const id = entry[0], name = entry[1];
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

            // On click, load the model, pass it to the renderer, and call the callback.
            button.onclick = async (): Promise<void> => {
                const model = await ModelManager.loadAsync(id);
                this.renderer.loadObject(model);
                if (this.onload != null) this.onload(id);
            }
        });
    }
}
