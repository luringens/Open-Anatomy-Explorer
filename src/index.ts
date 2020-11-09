import { Renderer } from "./renderer";
import { LabelManager } from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import { Mesh } from "three";
import QuizMasterManager from "./quizmaster/quizMasterManager";
import QuizTakerManager from "./quizTaker/quizTakerManager";

const defaultModel = "Arm";

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

let quizMasterManager: QuizMasterManager | null = null;
let labelManager: LabelManager | null = null;

// Initialize model manager UI
const modelManager = new ModelManager(renderer);
modelManager.setOnload((obj: Mesh, name: string): void => labelManager?.reset(name, obj));

// Check if we are to load labels, models, quizzes...
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const quizAction = urlParams.get("quizaction");
const quizId = urlParams.get("quiz");
const labelId = urlParams.get("labels");

// If a quiz ID is present and no action, we're doing a quiz.
if (quizId != null && quizAction == null) {
    labelManager = new LabelManager(renderer, defaultModel, false, false);
    quizMasterManager = new QuizMasterManager(labelManager, quizId, false, async function (quiz) {
        const lm = (labelManager as LabelManager);
        await lm.loadWithModel(quiz.labelId, quiz.model);
        new QuizTakerManager(quizMasterManager as QuizMasterManager, lm);
    });
}

// If a quiz ID is present, load the quiz editor.
else if (quizId != null && quizAction == "edit") {
    labelManager = new LabelManager(renderer, defaultModel, false, true);
    quizMasterManager = new QuizMasterManager(labelManager, quizId, true, async function (quiz) {
        const lm = (labelManager as LabelManager);
        await lm.loadWithModel(quiz.labelId, quiz.model);
    });
}

// If a label ID is present, show the label editor.
// If a quiz ID is present but blank, show the quiz editor instead
else if (labelId != null) {
    const showQuizEditor = quizAction == "create";
    const showLabelEditor = !showQuizEditor;

    const lm = new LabelManager(renderer, defaultModel, showLabelEditor, true);
    labelManager = lm;
    void labelManager.loadWithModel(labelId).then(() => {
        quizMasterManager = new QuizMasterManager(lm, null, showQuizEditor);
    });
}

// If nothing is specified, load the label editor alone
else {
    ModelManager.load(defaultModel, (mesh) => {
        renderer.loadObject(mesh);
        labelManager = new LabelManager(renderer, defaultModel, true, true);
        labelManager.reset(defaultModel, mesh)
    });
}
