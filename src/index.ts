import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Renderer } from "./renderer";
import { LabelManager } from "./labels";
import THREE = require("three");

// Set up renderer.
let wrapper = <HTMLElement>document.getElementById("canvas-container");
let renderer = new Renderer(wrapper);
renderer.startRendering();

// Start loading the model.
let loader = new GLTFLoader();
loader.load("model.glb", function (gltf) {
    renderer.object = gltf.scene;
    renderer.object.translateZ(-150);
    renderer.scene.add(renderer.object);

    // Set up label manager.
    new LabelManager(renderer, gltf.scene);
}, undefined, function (error: any) {
    console.error(error);
});
