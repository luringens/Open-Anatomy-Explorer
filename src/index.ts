import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();

let loader = new GLTFLoader();
loader.load("model.glb", function (gltf) {
    let object = gltf.scene;
    object.translateZ(-150)
    scene.add(object);
}, undefined, function (error: any) {
    console.error(error);
});

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-300, 0, 0);

// Controls
let controls = new OrbitControls(camera, renderer.domElement);
// controls.maxPolarAngle = Math.PI * 0.5;
// controls.minDistance = 1000;
// controls.maxDistance = 5000;
controls.enableDamping = true;
controls.update();

// Light
let dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.color.setHSL(0.5, 1, 0.95);
dirLight.position.set(-1, 3, 1);
dirLight.position.multiplyScalar(30);
scene.add(dirLight);

dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

let d = 50;
dirLight.shadow.camera.left = - d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = - d;
dirLight.shadow.camera.far = 3500;
dirLight.shadow.bias = - 0.0001;

let dirLightHeper = new THREE.DirectionalLightHelper(dirLight, 10);
scene.add(dirLightHeper);


let animate = function () {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();
