import { Renderer } from "./renderer";
import { LabelManager } from "./labels";
import { ModelManager } from "./modelManager";
import { Object3D } from "three";

const defaultModel = "Arm";

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

let labelManager: LabelManager | null = null;

// Set up the model manager.
const modelManager = new ModelManager((gltf) => {
    renderer.object = gltf.scene;
    renderer.scene.add(renderer.object);

    // Set up  the label manager.
    labelManager = new LabelManager(renderer, gltf.scene, defaultModel);
}, renderer, defaultModel);

modelManager.setOnload((model: Object3D): void => labelManager?.reset(model, defaultModel));
