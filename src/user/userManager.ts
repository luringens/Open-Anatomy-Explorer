import UserApi from "../Api/user"
import LabelManager from "../labels/labelManager"
import { HashAddress, HashAddressType } from "../hashAddress"
import QuizMasterManager from "../quizmaster/quizMasterManager"
import { ModelManager } from "../modelManager"
import UserManagerUi from "./userManagerUi"
import UserManagerSplashUi from "./userManagerSplashUi"
import Notification, { StatusType } from "../notification"
import ModelApi from "../Api/models"

/**
 * A class handling all things user-related.
 */
export default class UserManager {
    private static readonly SESSION_REFRESH_INTERVAL_MINUTES: number = 15;
    private ui: UserManagerUi;
    private splashUi: UserManagerSplashUi;

    private modelManager: ModelManager | null = null;
    private labelManager: LabelManager | null = null;
    private quizManager: QuizMasterManager | null = null;

    private lastLoggedInCheck: Date = new Date(2000, 1);
    private loginCallback: (() => Promise<unknown>) | null = null;
    public loggedInUsername: string | null = null;

    /**
     * Constructs a new UserManager with it's UI.
     */
    private constructor() {
        this.ui = new UserManagerUi(this);
        this.splashUi = new UserManagerSplashUi(this);
    }

    /**
     * Public "constructor" that also performs first-start async setup.
     */
    public static async initialize(): Promise<UserManager> {
        const manager = new UserManager();
        await manager.updateState();
        await manager.listLabels();
        await manager.listQuizzes();
        return manager;
    }

    /**
     * Provides the UserManager with access to other managers, which is used to load labels,
     * quizzes, upload models, etc.
     */
    public setManagers(
        modelManager: ModelManager | null,
        labelManager: LabelManager | null = null,
        quizManager: QuizMasterManager | null = null
    ): void {
        this.modelManager = modelManager;
        this.labelManager = labelManager;
        this.quizManager = quizManager;
    }

    /**
     * Binds a function to be called the next time the UserManager logs in.
     * Will only be called once.
     */
    public bindLoginCallback(callback: () => Promise<unknown>): void {
        this.loginCallback = callback;
    }

    /**
     * Updatet the UI state and check if we are still logged in.
     */
    public async updateState(): Promise<void> {
        const username = await this.isLoggedIn();
        const loggedIn = username != null;
        const isAdmin = loggedIn && await UserApi.isadmin();
        this.setLoggedInCookie(username);
        this.ui.updateState(loggedIn, isAdmin, username);
    }

    /**
     * Sets the cookie containing the logged in username for caching purposes.
     * @param username The username to remember we're logged in as, or null if logged out.
     */
    private setLoggedInCookie(username: null | string): void {
        if (username == null) {
            document.cookie = "logged-in=";
        } else {
            document.cookie = `logged-in=${username}`;
        }
    }

    /**
     * Returns the username of the currently logged in user, or null if there is no logged in user.
     */
    private async isLoggedIn(): Promise<string | null> {
        // Check cache.
        let loggedIn: null | string = null;
        document.cookie.split(";").forEach(cookie => {
            const parts = cookie.trim().split("=");
            if (parts.length === 2 && parts[0] === "logged-in" && parts[1] !== "") {
                this.loggedInUsername = parts[1];
                loggedIn = parts[1];
            }
        });

        // If our cookie cache says we're checked in, but it's been a while since the server has
        // confirmed, ask it to be sure since it has the final say.
        if (loggedIn != null && this.loginRequiresRefresh()) {
            this.lastLoggedInCheck = new Date();
            const serverLoggedIn = await UserApi.refresh();
            if (!serverLoggedIn) {
                loggedIn = null;
                this.setLoggedInCookie(null);
            }
        }

        return loggedIn;
    }

    /**
     * Checks if more than SESSION_REFRESH_INTERVAL_MINUTES has passed.
     */
    private loginRequiresRefresh(): boolean {
        const diffMs = Date.now().valueOf() - this.lastLoggedInCheck.valueOf();
        const diffMinutes = Math.floor(diffMs / 1000 / 60);
        return diffMinutes > UserManager.SESSION_REFRESH_INTERVAL_MINUTES;
    }

    /**
     * Log in with a user and update the UI accordingly.
     * @param id The username to log in with.
     * @param pwd The password to log in with.
     */
    public async submitLogin(id: string, pwd: string): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await UserApi.login(id, pwd)
            .then(() => {
                this.setLoggedInCookie(id);
                return Promise.resolve();
            })
            .catch((reason) => {
                this.setLoggedInCookie(null);
                console.error(reason);
            });
        await this.updateState();
        await this.listLabels();
        await this.listQuizzes();


        if (this.loginCallback != null && this.loggedInUsername != null) {
            await this.loginCallback();
            this.loginCallback = null;
        }
    }

    /**
     * Register a new user, log in, and update the UI accordingly.
     * @param id The username to log in with.
     * @param pwd The password to log in with.
     */
    public async submitRegister(id: string, pwd: string): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await UserApi.register(id, pwd)
            .then(this.setLoggedInCookie.bind(this, id))
            .then(this.updateState.bind(this))
            .then(Notification.message("User registered!", StatusType.Info, 5))
            .catch(message => {
                // Check if the issue is that the username already exists.
                if (typeof message == "string" && message.search("409") != -1) {
                    Notification.message(`The user '${id}' is already registered.`, StatusType.Warning)
                } else {
                    Notification.message("Failed to register a new user.", StatusType.Error)
                }
                this.setLoggedInCookie(null);
            });
    }

    /**
     * Log out from the server.
     */
    public async submitLogout(): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await UserApi.logout()
            .then(this.setLoggedInCookie.bind(this, null))
            .then(this.updateState.bind(this))
            .then(() => { Notification.message("Logged out!", StatusType.Info, 5); return Promise.resolve() })
            .catch((reason) => {
                Notification.message("Failed to log out?", StatusType.Error);
                console.error(reason);
            });
    }

    /**
     * Upload a model to the server.
     * This requires the logged in user to be have administrative privileges, which is enforced by
     * the server.
     */
    public async uploadModel(): Promise<void> {
        if (this.modelManager == null) {
            Notification.message("No modelmanager!", StatusType.Error);
            return Promise.reject();
        }
        const filePicker = document.getElementById("file-upload") as HTMLInputElement;
        if (filePicker.files == null) return;
        const name = filePicker.files[0].name;
        const mm = this.modelManager;
        await ModelApi.upload(name, filePicker.files[0])
            .then(() => {
                Notification.message("File uploaded!", StatusType.Info, 5);
                return mm.loadModelList();
            })
            .catch((reason) => {
                Notification.message("Failed to upload file!: ", StatusType.Error);
                console.error(reason);
            });
    }

    /**
     * Upload a material or texture to the server.
     * This requires the logged in user to be have administrative privileges, which is enforced by
     * the server.
     */
    public async uploadMaterials(type: "MATERIAL" | "TEXTURE"): Promise<void> {
        if (this.modelManager == null) {
            Notification.message("No modelmanager!", StatusType.Error);
            return Promise.reject();
        }
        const filePicker = document.getElementById("file-upload") as HTMLInputElement;
        if (filePicker.files == null) return;
        const name = filePicker.files[0].name;
        const modelId = this.modelManager.loadedModelId;
        await ModelApi.uploadMaterials(name, type, modelId, filePicker.files[0])
            .then(() => {
                Notification.message("File uploaded!", StatusType.Info, 5);
                return Promise.resolve();
            })
            .catch((reason) => {
                Notification.message("Failed to upload file!: ", StatusType.Error);
                console.error(reason);
            });
    }

    /**
     * Bookmark a label on the user account.
     */
    public async addLabel(): Promise<void> {
        if (this.labelManager == null) {
            Notification.message("No labelmanager!", StatusType.Error);
            return Promise.reject();
        }
        const id = this.labelManager.labelSet.uuid;
        if (id == null) return;

        await UserApi.Labels.add(id)
            .then(this.listLabels.bind(this));
    }

    /**
     * Bookmark a quiz on the user account.
     */
    public async addQuiz(): Promise<void> {
        if (this.quizManager == null) {
            Notification.message("No quizmanager!", StatusType.Error);
            return Promise.reject();
        }
        const uuid = this.quizManager.getQuizUuid();
        if (uuid == null) return Promise.reject("No saved quiz in quizmanager");

        await UserApi.Quizzes.add(uuid)
            .then(this.listQuizzes.bind(this));
    }

    /**
     * Remove a bookmarked label.
     * @param uuid The UUID of the label to remove.
     * @param element The related UI element to remove.
     */
    public async removeLabel(uuid: string, element: HTMLTableRowElement): Promise<void> {
        await UserApi.Labels.remove(uuid)
            .then(() => element.remove());
    }

    /**
     * Remove a bookmarked quiz.
     * @param uuid The UUID of the quiz to remove.
     * @param element The related UI element to remove.
     */
    public async removeQuiz(uuid: string, element: HTMLTableRowElement): Promise<void> {
        await UserApi.Quizzes.remove(uuid)
            .then(() => element.remove());
    }

    /**
     * Fetch all bookmarked labels on this user and render them.
     */
    public async listLabels(): Promise<void> {
        if (!await this.isLoggedIn()) return;

        const labels = await UserApi.Labels.get();
        this.ui.renderLabelList(labels);
    }

    /**
     * Fetch all bookmarked quizzes on this user and render them.
     */
    public async listQuizzes(): Promise<void> {
        if (!await this.isLoggedIn()) return;

        const quizzes = await UserApi.Quizzes.get();
        this.ui.renderQuizList(quizzes);
    }

    /**
     * Go to a bookmarked labelset. May refresh the page.
     */
    public async goToLabel(uuid: string): Promise<void> {
        if (this.labelManager != null && HashAddress.isOfType([null, HashAddressType.Label])) {
            await this.labelManager.loadWithModelByUuid(uuid);
            new HashAddress(uuid, HashAddressType.Label)
        }
        else {
            new HashAddress(uuid, HashAddressType.Label).set();
            location.reload();
        }
    }

    /**
     * Go to a bookmarked quiz. May refresh the page.
     */
    public async goToQuiz(uuid: string): Promise<void> {
        const quizModes = [HashAddressType.QuizEdit, HashAddressType.QuizCreate];
        if (this.quizManager != null && HashAddress.isOfType(quizModes)) {
            await this.quizManager.loadQuiz(uuid);
            new HashAddress(uuid, HashAddressType.QuizEdit).set();
        }
        else {
            new HashAddress(uuid, HashAddressType.QuizEdit).set();
            location.reload();
        }
    }
}
