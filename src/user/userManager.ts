import Api from "../api"
import { LabelManager } from "../labels/labelManager"
import { HashAddressType, HashAdress } from "../utils"
import QuizMasterManager from "../quizmaster/quizMasterManager"
import { ModelManager } from "../modelManager"
import UserManagerUi from "./userManagerUi"
import Notification, { StatusType } from "../notification"

/**
 * A class handling all things user-related.
 */
export default class UserManager {
    private static readonly SESSION_REFRESH_INTERVAL_MINUTES: number = 15;
    private ui: UserManagerUi;

    private modelManager: ModelManager;
    private labelManager: LabelManager;
    private quizManager: QuizMasterManager | null;

    private lastLoggedInCheck: Date = new Date(2000, 1);
    public loggedInUsername: string | null = null;

    public constructor(modelManager: ModelManager, labelManager: LabelManager, quizManager: QuizMasterManager | null = null) {
        this.modelManager = modelManager;
        this.labelManager = labelManager;
        this.quizManager = quizManager;
        this.ui = new UserManagerUi(this);

        void this.updateState()
            .then(this.listLabels.bind(this))
            .then(this.listQuizzes.bind(this));
    }

    /**
     * Updatet the UI state and check if we are still logged in.
     */
    public async updateState(): Promise<void> {
        const username = await this.isLoggedIn();
        const loggedIn = username != null;
        const isAdmin = loggedIn && await Api.Users.isadmin();
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
            const serverLoggedIn = await Api.Users.refresh();
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
        await Api.Users.login(id, pwd)
            .then(this.setLoggedInCookie.bind(this, id))
            .then(this.updateState.bind(this))
            .then(this.listLabels.bind(this))
            .then(this.listQuizzes.bind(this))
            .catch(this.setLoggedInCookie.bind(this, null));
    }

    /**
     * Register a new user, log in, and update the UI accordingly.
     * @param id The username to log in with.
     * @param pwd The password to log in with.
     */
    public async submitRegister(id: string, pwd: string): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await Api.Users.register(id, pwd)
            .then(this.setLoggedInCookie.bind(this, id))
            .then(this.updateState.bind(this))
            .then(Notification.message("User registered!", StatusType.Info, 5))
            .catch(() => {
                this.setLoggedInCookie(null);
                Notification.message("Failed to register user.", StatusType.Error)
            });
    }

    /**
     * Log out from the server.
     */
    public async submitLogout(): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await Api.Users.logout()
            .then(this.setLoggedInCookie.bind(this, null))
            .then(this.updateState.bind(this))
            .then(Notification.message("Logged out!", StatusType.Info, 5))
            .catch(Notification.message("Failed to log out?", StatusType.Error));
    }

    /**
     * Upload a model to the server.
     * This requires the logged in user to be have administrative privileges, which is enforced by
     * the server.
     */
    public async uploadModel(): Promise<void> {
        const filePicker = document.getElementById("file-upload") as HTMLInputElement;
        if (filePicker.files == null) return;
        const name = filePicker.files[0].name;
        await Api.modelStorage.upload(name, filePicker.files[0])
            .then(Notification.message("File uploaded!", StatusType.Info, 5))
            .catch(Notification.message("Failed to upload file!", StatusType.Error))
            .then(this.modelManager.loadModelList.bind(this.modelManager));
    }

    /**
     * Bookmark a label on the user account.
     */
    public async addLabel(): Promise<void> {
        const id = this.labelManager.labelSet.uuid;
        if (id == null) return;

        await Api.Users.Labels.add(id)
            .then(this.listLabels.bind(this));
    }

    /**
     * Bookmark a quiz on the user account.
     */
    public async addQuiz(): Promise<void> {
        if (this.quizManager == null) return Promise.reject("No quizmanager");
        const uuid = this.quizManager.getQuizUuid();
        if (uuid == null) return Promise.reject("No saved quiz in quizmanager");

        await Api.Users.Quizzes.add(uuid)
            .then(this.listQuizzes.bind(this));
    }

    /**
     * Remove a bookmarked label.
     * @param uuid The UUID of the label to remove.
     * @param element The related UI element to remove.
     */
    public async removeLabel(uuid: string, element: HTMLTableRowElement): Promise<void> {
        await Api.Users.Labels.remove(uuid)
            .then(() => element.remove());
    }

    /**
     * Remove a bookmarked quiz.
     * @param uuid The UUID of the quiz to remove.
     * @param element The related UI element to remove.
     */
    public async removeQuiz(uuid: string, element: HTMLTableRowElement): Promise<void> {
        await Api.Users.Quizzes.remove(uuid)
            .then(() => element.remove());
    }

    /**
     * Fetch all bookmarked labels on this user and render them.
     */
    public async listLabels(): Promise<void> {
        if (!await this.isLoggedIn()) return;

        const labels = await Api.Users.Labels.get();
        this.ui.renderLabelList(labels);
    }

    /**
     * Fetch all bookmarked quizzes on this user and render them.
     */
    public async listQuizzes(): Promise<void> {
        if (!await this.isLoggedIn()) return;

        const quizzes = await Api.Users.Quizzes.get();
        this.ui.renderQuizList(quizzes);
    }

    /**
     * Go to a bookmarked labelset. May refresh the page.
     */
    public async goToLabel(uuid: string): Promise<void> {
        if (HashAdress.isOfType([null, HashAddressType.Label])) {
            await this.labelManager.loadWithModelByUuid(uuid);
            new HashAdress(uuid, HashAddressType.Label)
        }
        else {
            new HashAdress(uuid, HashAddressType.Label).set();
            location.reload();
        }
    }

    /**
     * Go to a bookmarked quiz. May refresh the page.
     */
    public async goToQuiz(uuid: string): Promise<void> {
        const quizModes = [HashAddressType.QuizEdit, HashAddressType.QuizCreate];
        if (this.quizManager != null && HashAdress.isOfType(quizModes)) {
            await this.quizManager.loadQuestions(uuid);
            new HashAdress(uuid, HashAddressType.QuizEdit).set();
        }
        else {
            new HashAdress(uuid, HashAddressType.QuizEdit).set();
            location.reload();
        }
    }
}
