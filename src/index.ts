import { Renderer } from "./renderer";
import { LabelManager } from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import { Mesh } from "three";
import QuizMasterManager from "./quizmaster/quizMasterManager";

const defaultModel = "Arm";

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let quizMasterManager: QuizMasterManager | null = null;
let labelManager: LabelManager | null = null;

// Set up the model manager.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const modelManager = new ModelManager((_) => {
    // Set up  the label manager.
    labelManager = new LabelManager(renderer, defaultModel);
    quizMasterManager = new QuizMasterManager(null, labelManager);
}, renderer, defaultModel);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
modelManager.setOnload((obj: Mesh): void => labelManager?.reset(defaultModel, obj));
