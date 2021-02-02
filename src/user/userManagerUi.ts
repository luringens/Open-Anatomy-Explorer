import SVG_TAG from "../../static/tag.svg";
import SVG_KEY from "../../static/key.svg";
import SVG_QUIZ from "../../static/help-circle.svg";
import SVG_USER from "../../static/user.svg";
import SVG_USER_X from "../../static/user-x.svg";
import SVG_USER_PLUS from "../../static/user-plus.svg";
import SVG_USER_CHECK from "../../static/user-check.svg";
import SVG_CHEVRON_UP from "../../static/chevron-up.svg";
import SVG_CHEVRON_DOWN from "../../static/chevron-down.svg";
import SVG_CHEVRON_RIGHT from "../../static/chevron-right.svg";
import SVG_PLUS_CIRCLE from "../../static/plus-circle.svg";
import SVG_DELETE from "../../static/delete.svg";
import SVG_UPLOAD from "../../static/upload.svg";
import { JsonUserLabelSet, JsonUserQuiz } from "../Api/user";
import UserManager from "./userManager";

export default class UserManagerUi {
    public userManager: UserManager;
    private expanded = false;

    private loggedinAdminElements: HTMLCollectionOf<Element>;
    private loggedinElements: HTMLCollectionOf<Element>;
    private loginElements: HTMLCollectionOf<Element>;

    private expandPadding: HTMLTableRowElement;
    private iconChevron: HTMLTableDataCellElement;
    private iconUser: HTMLTableDataCellElement;
    private userStatus: HTMLTableDataCellElement;

    private idElement: HTMLInputElement;
    private pwdElement: HTMLInputElement;

    public constructor(userManager: UserManager) {
        this.userManager = userManager;

        // Get relevant HTML elements.
        this.loggedinAdminElements = document.getElementsByClassName("row-logged-in-admin");
        this.loggedinElements = document.getElementsByClassName("row-logged-in");
        this.loginElements = document.getElementsByClassName("row-login");
        this.idElement = document.getElementById("user-id") as HTMLInputElement;
        this.pwdElement = document.getElementById("user-pwd") as HTMLInputElement;
        this.expandPadding = document.getElementById("row-login-padding") as HTMLTableRowElement;
        this.iconChevron = document.getElementById("user-chevron") as HTMLTableDataCellElement;
        this.iconUser = document.getElementById("user-state-icon") as HTMLTableDataCellElement;
        this.userStatus = document.getElementById("user-status") as HTMLTableDataCellElement;

        const iconLabelAdd = document.getElementById("user-icon-labels-add") as HTMLTableDataCellElement;
        const iconLabels = document.getElementById("user-icon-labels") as HTMLTableDataCellElement;
        const iconloginPwd = document.getElementById("user-login-pwd-icon") as HTMLTableDataCellElement;
        const iconloginUser = document.getElementById("user-login-id-icon") as HTMLTableDataCellElement;
        const iconLogout = document.getElementById("user-icon-logout") as HTMLTableDataCellElement;
        const iconQuizzes = document.getElementById("user-icon-quizzes") as HTMLTableDataCellElement;
        const iconQuizzesAdd = document.getElementById("user-icon-quizzes-add") as HTMLTableDataCellElement;
        const iconUpload = document.getElementById("user-icon-upload") as HTMLTableDataCellElement;
        const registerCell = document.getElementById("user-login-register") as HTMLTableDataCellElement;
        const submitCell = document.getElementById("user-login-submit") as HTMLTableDataCellElement;

        // Set SVG icons.
        iconLabelAdd.innerHTML = SVG_PLUS_CIRCLE;
        iconLabels.innerHTML = SVG_TAG;
        iconloginPwd.innerHTML = SVG_KEY;
        iconloginUser.innerHTML = SVG_USER;
        iconLogout.innerHTML = SVG_USER_X;
        iconQuizzes.innerHTML = SVG_QUIZ;
        iconQuizzesAdd.innerHTML = SVG_PLUS_CIRCLE;
        iconUpload.innerHTML = SVG_UPLOAD;
        registerCell.innerHTML = SVG_USER_PLUS;
        submitCell.innerHTML = SVG_CHEVRON_RIGHT;
        this.iconChevron.innerHTML = SVG_CHEVRON_UP;

        // Bind event handlers.

        const headerRow = this.iconChevron.parentElement as HTMLTableRowElement;
        headerRow.onclick = this.toggleInterfaceExpanded.bind(this);
        iconLabelAdd.onclick = this.userManager.addLabel.bind(this.userManager);
        iconLogout.onclick = this.userManager.submitLogout.bind(this.userManager);
        iconQuizzesAdd.onclick = this.userManager.addQuiz.bind(this.userManager);
        iconUpload.onclick = this.userManager.uploadModel.bind(this.userManager);
        registerCell.onclick = this.submitRegister.bind(this);
        submitCell.onclick = this.submitLogin.bind(this);
        this.pwdElement.addEventListener("keyup", this.submitLoginKeyEvent.bind(this));
    }

    /**
     * Log in with a user and update the UI accordingly.
     */
    public async submitLogin(): Promise<void> {
        await this.userManager.submitLogin(this.idElement.value, this.pwdElement.value);
    }

    /**
     * Log in with a user and update the UI accordingly.
     */
    public submitLoginKeyEvent(event: KeyboardEvent): void {
        if (event.key === "Enter") {
            event.preventDefault();
            void this.userManager.submitLogin(this.idElement.value, this.pwdElement.value);
        }
    }

    /**
     * Register a new user, log in, and update the UI accordingly.
     */
    public async submitRegister(): Promise<void> {
        await this.userManager.submitRegister(this.idElement.value, this.pwdElement.value);
    }

    /**
     * Toggles whether or not the UI is expanded.
     */
    public async toggleInterfaceExpanded(): Promise<void> {
        this.expanded = !this.expanded;
        await this.userManager.updateState();
    }

    /**
     * Update the UI state, toggling expansion, showing login data or logged in info, etc.
     * @param loggedIn Whether or not the user is logged in.
     * @param isAdmin Whether or not the user posesses administrative privileges.
     * @param username The username of the user if logged in.
     */
    public updateState(loggedIn: boolean, isAdmin: boolean, username: string | null): void {
        if (this.expanded) {
            this.iconChevron.innerHTML = SVG_CHEVRON_DOWN;
            this.expandPadding.classList.remove("hide");
            if (loggedIn) {
                this.setVisibilityForCollection(false, this.loginElements);
                this.setVisibilityForCollection(true, this.loggedinElements);
                if (isAdmin) {
                    this.setVisibilityForCollection(true, this.loggedinAdminElements);
                }
            } else {
                this.setVisibilityForCollection(true, this.loginElements);
                this.setVisibilityForCollection(false, this.loggedinElements);
                this.setVisibilityForCollection(false, this.loggedinAdminElements);
            }
        } else {
            this.expandPadding.classList.add("hide");
            this.iconChevron.innerHTML = SVG_CHEVRON_UP;
            this.setVisibilityForCollection(false, this.loginElements);
            this.setVisibilityForCollection(false, this.loggedinElements);
            this.setVisibilityForCollection(false, this.loggedinAdminElements);
        }

        if (loggedIn) {
            const loginstring = username == null ? "" : `as ${username}`;
            this.userStatus.innerText = `Logged in ${loginstring}`;
            this.iconUser.innerHTML = SVG_USER_CHECK;
        } else {
            this.userStatus.innerText = "Not logged in";
            this.iconUser.innerHTML = SVG_USER_X;
        }
    }

    /**
     * Shows or hide a collection of HTML elements.
     * @param visible Whether to set the elements to visible or hidden.
     * @param items The items to show or hide.
     */
    private setVisibilityForCollection(visible: boolean, items: HTMLCollectionOf<Element>): void {
        for (let i = 0; i < items.length; i++) {
            if (visible) items[i].classList.remove("hide");
            else items[i].classList.add("hide");
        }
    }

    /**
     * Render rows of labels to the UI.
     * @param quizzes The labels to render.
     */
    public renderLabelList(labels: JsonUserLabelSet[]): void {
        this.renderList(
            labels,
            "row-userlabel-data",
            this.userManager.removeLabel.bind(this.userManager),
            this.userManager.goToLabel.bind(this.userManager),
            document.getElementById("row-userlabel-footer") as HTMLTableRowElement,
        );
    }

    /**
     * Render rows of quizzes to the UI.
     * @param quizzes The quizzes to render.
     */
    public renderQuizList(quizzes: JsonUserQuiz[]): void {
        this.renderList(
            quizzes,
            "row-userquiz-data",
            this.userManager.removeQuiz.bind(this.userManager),
            this.userManager.goToQuiz.bind(this.userManager),
            document.getElementById("row-userquiz-footer") as HTMLTableRowElement,
        );
    }

    /**
     * Renders rows of items to the UI.
     * @param items The items to render rows for.
     * @param rowClassName The class name to tag the rows with. Pre-existing rows will be deleted.
     * @param removeFunction The function to bind to the delete button.
     * @param goToFunction The function to bind to the go-to button.
     * @param footer The footer element to place the elements before.
     */
    private renderList(
        items: (JsonUserQuiz | JsonUserLabelSet)[],
        rowClassName: string,
        removeFunction: (uuid: string, row: HTMLTableRowElement) => Promise<void>,
        goToFunction: (uuid: string) => Promise<void>,
        footer: HTMLTableRowElement,
    ): void {
        const previous = document.getElementsByClassName(rowClassName);
        for (let i = 0; i < previous.length; i++) {
            previous[i].remove();
        }

        const classNames = ["row-logged-in", rowClassName];
        if (!this.expanded) classNames.push("hide");
        items.forEach(item => {
            const row = document.createElement("tr");
            const tdLabelDelete = document.createElement("td");
            const tdLabelBlank = document.createElement("td");
            const tdLabelName = document.createElement("td");
            const tdLabelLoad = document.createElement("td");

            tdLabelDelete.innerHTML = SVG_DELETE;
            tdLabelDelete.onclick = () => removeFunction(item.uuid, row);

            tdLabelName.innerText = item.name;

            tdLabelLoad.innerHTML = SVG_CHEVRON_RIGHT;
            tdLabelLoad.onclick = () => goToFunction(item.uuid);

            classNames.forEach(className => row.classList.add(className));
            row.appendChild(tdLabelDelete);
            row.appendChild(tdLabelBlank);
            row.appendChild(tdLabelName);
            row.appendChild(tdLabelLoad);

            const table = footer.parentNode as HTMLTableSectionElement;
            table.insertBefore(row, footer);
        });
    }
}