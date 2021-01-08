import SVG_TAG from "../static/tag.svg"
import SVG_KEY from "../static/key.svg"
import SVG_INFO from "../static/info.svg"
import SVG_USER from "../static/user.svg"
import SVG_USER_X from "../static/user-x.svg"
import SVG_USER_PLUS from "../static/user-plus.svg"
import SVG_USER_CHECK from "../static/user-check.svg"
import SVG_CHEVRON_UP from "../static/chevron-up.svg"
import SVG_CHEVRON_DOWN from "../static/chevron-down.svg"
import SVG_CHEVRON_RIGHT from "../static/chevron-right.svg"
import Api from "./api"

export default class UserManager {
    private iconChevron: HTMLTableDataCellElement;
    private registerCell: HTMLTableDataCellElement;
    private submitCell: HTMLTableDataCellElement;
    private iconUser: HTMLTableDataCellElement;
    private iconloginUser: HTMLTableDataCellElement;
    private iconloginPwd: HTMLTableDataCellElement;
    private iconStatus: HTMLTableDataCellElement;
    private iconLogout: HTMLTableDataCellElement;
    private iconLabels: HTMLTableDataCellElement;
    private userStatus: HTMLTableDataCellElement;
    private expandPadding: HTMLTableRowElement;
    private labelHeader: HTMLTableRowElement;
    private loginElements: HTMLCollectionOf<Element>;
    private loggedinElements: HTMLCollectionOf<Element>;
    private statusRow: HTMLTableRowElement;
    private statusMessage: HTMLTableDataCellElement;

    private static readonly INFO_MESSAGE_TIMEOUT_SECONDS: number = 7;
    private static readonly SESSION_REFRESH_INTERVAL_MINUTES: number = 15;

    private lastLoggedInCheck: Date = new Date(2000, 1);
    private expanded = false;
    private loggedInUsername: string | null = null;

    public constructor() {
        this.iconUser = document.getElementById("user-state-icon") as HTMLTableDataCellElement;
        this.userStatus = document.getElementById("user-status") as HTMLTableDataCellElement;
        this.iconStatus = document.getElementById("logged-in-status-icon") as HTMLTableDataCellElement;
        this.iconChevron = document.getElementById("user-chevron") as HTMLTableDataCellElement;
        this.registerCell = document.getElementById("user-login-register") as HTMLTableDataCellElement;
        this.submitCell = document.getElementById("user-login-submit") as HTMLTableDataCellElement;
        this.iconloginUser = document.getElementById("user-login-id-icon") as HTMLTableDataCellElement;
        this.iconloginPwd = document.getElementById("user-login-pwd-icon") as HTMLTableDataCellElement;
        this.expandPadding = document.getElementById("row-login-padding") as HTMLTableRowElement;
        this.labelHeader = document.getElementById("logged-in-label-header") as HTMLTableRowElement;
        this.statusRow = document.getElementById("logged-in-status") as HTMLTableRowElement;
        this.statusMessage = document.getElementById("logged-in-status-message") as HTMLTableDataCellElement;
        this.iconLogout = document.getElementById("user-icon-logout") as HTMLTableDataCellElement;
        this.iconLabels = document.getElementById("user-icon-labels") as HTMLTableDataCellElement;

        this.loginElements = document.getElementsByClassName("row-login");
        this.loggedinElements = document.getElementsByClassName("row-logged-in");

        const headerRow = this.iconChevron.parentElement as HTMLTableRowElement;
        headerRow.onclick = this.toggleInterfaceExpanded.bind(this);

        this.registerCell.onclick = this.submitRegister.bind(this);
        this.iconLogout.onclick = this.submitLogout.bind(this);

        this.submitCell.onclick = this.submitLogin.bind(this);
        (document.getElementById("user-pwd") as HTMLInputElement).addEventListener("keyup", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                void this.submitLogin();
            }
        });

        this.iconChevron.innerHTML = SVG_CHEVRON_UP;
        this.registerCell.innerHTML = SVG_USER_PLUS;
        this.submitCell.innerHTML = SVG_CHEVRON_RIGHT;
        this.iconloginUser.innerHTML = SVG_USER;
        this.iconloginPwd.innerHTML = SVG_KEY;
        this.iconStatus.innerHTML = SVG_INFO;
        this.iconLogout.innerHTML = SVG_USER_X;
        this.iconLabels.innerHTML = SVG_TAG;
        void this.updateState();
    }

    private async updateState(): Promise<void> {
        const loggedIn = await this.isLoggedIn();
        this.setLoggedInCookie(loggedIn);
        if (this.expanded) {
            this.iconChevron.innerHTML = SVG_CHEVRON_DOWN;
            this.expandPadding.classList.remove("hide");
            if (loggedIn) {
                this.setVisibilityForCollection(false, this.loginElements);
                this.setVisibilityForCollection(true, this.loggedinElements);
            } else {
                this.setVisibilityForCollection(true, this.loginElements);
                this.setVisibilityForCollection(false, this.loggedinElements);
            }
        } else {
            this.expandPadding.classList.add("hide");
            this.iconChevron.innerHTML = SVG_CHEVRON_UP;
            this.setVisibilityForCollection(false, this.loginElements);
            this.setVisibilityForCollection(false, this.loggedinElements);
        }

        if (loggedIn) {
            const username = this.loggedInUsername == null ? "" : `as ${this.loggedInUsername}`;
            this.userStatus.innerText = `Logged in ${username}`;
            this.iconUser.innerHTML = SVG_USER_CHECK;
        } else {
            this.userStatus.innerText = "Not logged in";
            this.iconUser.innerHTML = SVG_USER_X;
        }
    }

    private setVisibilityForCollection(visible: boolean, items: HTMLCollectionOf<Element>) {
        for (let i = 0; i < items.length; i++) {
            if (visible) items[i].classList.remove("hide");
            else items[i].classList.add("hide");
        }
    }

    private setInfoMessage(msg: string): void {
        this.statusMessage.innerText = msg;
        this.statusRow.classList.remove("hide");
        window.setTimeout(() => {
            this.statusRow.classList.add("hide");
        }, 1000 * UserManager.INFO_MESSAGE_TIMEOUT_SECONDS);
    }

    private async toggleInterfaceExpanded(): Promise<void> {
        this.expanded = !this.expanded;
        await this.updateState()
    }

    private setLoggedInCookie(username: null | string): void {
        if (username == null) {
            document.cookie = "logged-in=";
        } else {
            document.cookie = `logged-in=${username}`;
        }
    }

    private async isLoggedIn(): Promise<null | string> {
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

    private loginRequiresRefresh(): boolean {
        const diffMs = Date.now().valueOf() - this.lastLoggedInCheck.valueOf();
        const diffMinutes = Math.floor(diffMs / 1000 / 60);
        return diffMinutes > UserManager.SESSION_REFRESH_INTERVAL_MINUTES;
    }

    private async submitLogin(): Promise<void> {
        const id = (document.getElementById("user-id") as HTMLInputElement).value;
        const pwd = (document.getElementById("user-pwd") as HTMLInputElement).value;

        this.lastLoggedInCheck = new Date();
        await Api.Users.login(id, pwd)
            .then(this.setLoggedInCookie.bind(this, id))
            .then(this.updateState.bind(this))
            .then(this.setInfoMessage.bind(this, "Logged in!"))
            .catch(() => {
                this.setLoggedInCookie(null);
                this.setInfoMessage("Failed to log in.");
            });
    }

    private async submitRegister(): Promise<void> {
        const id = (document.getElementById("user-id") as HTMLInputElement).value;
        const pwd = (document.getElementById("user-pwd") as HTMLInputElement).value;

        this.lastLoggedInCheck = new Date();
        await Api.Users.register(id, pwd)
            .then(this.setLoggedInCookie.bind(this, id))
            .then(this.updateState.bind(this))
            .then(this.setInfoMessage.bind(this, "User registered!"))
            .catch(() => {
                this.setLoggedInCookie(null);
                this.setInfoMessage("Failed to register user.");
            });

    }
    private async submitLogout(): Promise<void> {
        this.lastLoggedInCheck = new Date();
        await Api.Users.logout()
            .then(this.setLoggedInCookie.bind(this, null))
            .then(this.updateState.bind(this))
            .then(this.setInfoMessage.bind(this, "Logged out!"))
            .catch(this.setInfoMessage.bind(this, "Failed to log out?"));
    }
}