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

// Initialize model manager UI
const modelManager = new ModelManager(renderer);
modelManager.setOnload((obj: Mesh, name: string): void => labelManager?.reset(name, obj));

// Check if we are to load labels, models, quizzes...
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const quizId = urlParams.get("quiz");
const labelId = urlParams.get("labels");

// If a quiz ID is present, load the quiz editor.
if (quizId != null && quizId != "create") {
    labelManager = new LabelManager(renderer, defaultModel, false);
    quizMasterManager = new QuizMasterManager(labelManager, quizId, true, async function (quiz) {
        const lm = (labelManager as LabelManager);
        await lm.loadWithModel(quiz.labelId, quiz.model);
    });
}

// If a label ID is present, load the label editor and related model.
// If a quiz ID is present but blank, load the quiz editor instead
else if (labelId != null) {
    const showLabelEditor = quizId != "create";
    const showQuizEditor = quizId == "create";

    labelManager = new LabelManager(renderer, defaultModel, showLabelEditor);
    labelManager.loadWithModel(labelId);
    quizMasterManager = new QuizMasterManager(labelManager, null, showQuizEditor);
}

// If nothing is specified, load the label editor
else {
    ModelManager.load(defaultModel, (mesh) => {
        renderer.loadObject(mesh);
        labelManager = new LabelManager(renderer, defaultModel, true);
        labelManager.reset(defaultModel, mesh)
        //quizMasterManager = new QuizMasterManager(labelManager, null);
    });
}
