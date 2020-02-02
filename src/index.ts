import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();
let object: THREE.Object3D = null;

let loader = new GLTFLoader();
loader.load("model.glb", function (gltf) {
    object = gltf.scene;
    object.translateZ(-150);
    scene.add(object);
}, undefined, function (error: any) {
    console.error(error);
});

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
let container = renderer.domElement;
document.body.appendChild(container);

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-300, 0, 0);

// Controls
let controls = new OrbitControls(camera, renderer.domElement);
// controls.maxPolarAngle = Math.PI * 0.5;
// controls.minDistance = 1000;
// controls.maxDistance = 5000;
controls.enableDamping = true;
controls.update();

// Leader label

var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
var helper = new THREE.PlaneHelper(plane, 500, 0xFFF);
scene.add(helper);

// Light
var light = new THREE.AmbientLight(0x404040);
scene.add(light);

let dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.color.setHSL(0.5, 1, 1);
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

let dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
scene.add(dirLightHelper);

let animate = function () {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

animate();


// Click detection
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let onClickPosition = new THREE.Vector2();
window.addEventListener('resize', onWindowResize, false);
container.addEventListener('mousedown', onMouseMove, false);

function onMouseMove(evt: any) {
    evt.preventDefault();

    var array = getMousePosition(container, evt.clientX, evt.clientY);
    onClickPosition.fromArray(array);

    var intersects: THREE.Intersection[] = getIntersects(onClickPosition, object);
    if (intersects.length > 0) {
        let p = intersects[0].point;
        let pUnit = intersects[0].face.normal;
        pUnit.multiplyScalar(25);
        dirLight.position.set(p.x, p.y, p.z);
        dirLight.position.add(pUnit);

        scene.remove(dirLightHelper)
        dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
        scene.add(dirLightHelper);
    }
}

function getMousePosition(dom: HTMLElement, x: number, y: number) {
    var rect = dom.getBoundingClientRect();
    return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
}

function getIntersects(point: THREE.Vector2, object: THREE.Object3D) {
    mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObject(object, true);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}
