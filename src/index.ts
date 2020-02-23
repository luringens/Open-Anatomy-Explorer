import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Renderer } from "./renderer";
import { LabelManager } from "./labels";

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

// Start loading the model.
const loader = new GLTFLoader();
loader.load("model.glb", function (gltf) {
    renderer.object = gltf.scene;
    renderer.object.translateZ(-150);
    renderer.scene.add(renderer.object);

    // Set up label manager.
    new LabelManager(renderer, gltf.scene);
}, undefined, function (error: ErrorEvent) {
    console.error(error);
});
