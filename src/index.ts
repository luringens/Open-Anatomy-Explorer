import { Renderer } from "./renderer";
import { LabelManager } from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import { Object3D } from "three";

const defaultModel = "Arm";

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

let labelManager: LabelManager | null = null;

// Set up the model manager.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const modelManager = new ModelManager((_) => {
    // Set up  the label manager.
    labelManager = new LabelManager(renderer, defaultModel);
}, renderer, defaultModel);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
modelManager.setOnload((_: Object3D): void => labelManager?.reset(defaultModel));
