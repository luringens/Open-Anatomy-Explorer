import Renderer from "./renderer";
import LabelManager from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import QuizMasterManager from "./quizmaster/quizMasterManager";
import QuizTakerManager from "./quizTaker/quizTakerManager";
import { HashAddress, HashAddressType } from "./hashAddress";
import UserManager from "./user/userManager";
import { Spinner } from "spin.js";


void startup();

async function startup() {
    const userManager = await UserManager.initialize();

    // Load UI if we are logged in.
    if (userManager.loggedInUsername != null) {
        void startupRenderer(userManager);
    }

    // Otherwise, bind it as a login callback.
    else {
        userManager.bindLoginCallback(startupRenderer.bind(undefined, userManager));
    }
}

async function startupRenderer(userManager: UserManager) {
    const defaultModel = 1;

    const spinnerOpts = {
        lines: 8,
        color: "#ffffff",
        top: "120%",
    };
    const spinner = new Spinner(spinnerOpts)
        .spin(document.getElementById("spinner-space") ?? undefined);

    (document.getElementById("splash-user-id") as HTMLInputElement).disabled = true;
    (document.getElementById("splash-user-pwd") as HTMLInputElement).disabled = true;

    // Reset default tool to work around browser persistence.
    (document.getElementById("tool-camera") as HTMLInputElement).checked = true;

    // Set up renderer.
    const wrapper = document.getElementById("canvas-container") as HTMLElement;
    const renderer = new Renderer(wrapper);
    renderer.startRendering();

    let quizMasterManager: QuizMasterManager | null = null;
    let labelManager: LabelManager | null = null;

    // Initialize model manager UI
    const modelManager = new ModelManager(renderer);
    modelManager.setOnload((id: number) => void labelManager?.newModel(id));
    await modelManager.loadModelList();

    // Check if we are to load labels, models, quizzes...
    const action = HashAddress.fromAddress();

    // If nothing else is specified in the address, just load the label editor from scratch.
    if (action == null) {
        const model = await modelManager.loadAsync(defaultModel);
        renderer.loadObject(model);
        labelManager = new LabelManager(renderer, true, defaultModel, modelManager);
        labelManager.reset();
    }

    else switch (action.action) {
        // Load label editor with stored labels.
        case HashAddressType.Label:
            labelManager = new LabelManager(renderer, true, 0, modelManager);
            await labelManager.loadWithModelByUuid(action.uuid);
            break;

        // Load quiz editor, instructed to create a new quiz from stored labels.
        case HashAddressType.QuizCreate:
            labelManager = new LabelManager(renderer, false, 0, modelManager);
            await labelManager.loadWithModelByUuid(action.uuid);
            quizMasterManager = new QuizMasterManager(labelManager, true);
            break;

        // Load quiz editor on existing stored quiz.
        case HashAddressType.QuizEdit:
            labelManager = new LabelManager(renderer, false, 0, modelManager);
            quizMasterManager = new QuizMasterManager(labelManager, true);
            await quizMasterManager.loadQuiz(action.uuid);
            break;

        // Load quiz taker from stored quiz.
        case HashAddressType.QuizTake:
            labelManager = new LabelManager(renderer, false, 0, modelManager);
            quizMasterManager = new QuizMasterManager(labelManager, false);
            await quizMasterManager.loadQuiz(action.uuid)
            new QuizTakerManager(quizMasterManager, labelManager);
            break;
    }

    userManager.setManagers(modelManager, labelManager, quizMasterManager);

    spinner.stop();
    (document.getElementById("splash") as HTMLDivElement).classList.add("hide");
    (document.getElementById("main") as HTMLDivElement).classList.remove("hide");
    renderer.poke();
}
