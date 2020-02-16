import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Renderer } from "./renderer";

// Set up renderer.
let wrapper = document.getElementById("canvas-container");
let renderer = new Renderer(wrapper);
renderer.startRendering();

// Start loading the model.
let loader = new GLTFLoader();
loader.load("model.glb", function (gltf) {
    renderer.object = gltf.scene;
    renderer.object.translateZ(-150);
    renderer.scene.add(renderer.object);
}, undefined, function (error: any) {
    console.error(error);
});
