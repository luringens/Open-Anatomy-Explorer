import SVG_KEY from "../static/key.svg"
import SVG_USER from "../static/user.svg"
import SVG_USER_X from "../static/user-x.svg"
import SVG_USER_CHECK from "../static/user-check.svg"
import SVG_CHEVRON_UP from "../static/chevron-up.svg"
import SVG_CHEVRON_DOWN from "../static/chevron-down.svg"
import SVG_CHEVRON_RIGHT from "../static/chevron-right.svg"
import Api from "./api"

export default class UserManager {
    private iconChevron: HTMLTableDataCellElement;
    private submitCell: HTMLTableDataCellElement;
    private iconUser: HTMLTableDataCellElement;
    private iconloginUser: HTMLTableDataCellElement;
    private iconloginPwd: HTMLTableDataCellElement;
    private userStatus: HTMLTableDataCellElement;
    private loginElements: HTMLTableRowElement[];

    private expanded = false;
    private loggedInUsername: string | null = null;

    public constructor() {
        this.iconUser = document.getElementById("user-state-icon") as HTMLTableDataCellElement;
        this.userStatus = document.getElementById("user-status") as HTMLTableDataCellElement;
        this.iconChevron = document.getElementById("user-chevron") as HTMLTableDataCellElement;
        this.submitCell = document.getElementById("user-login-submit") as HTMLTableDataCellElement;
        this.iconloginUser = document.getElementById("user-login-id-icon") as HTMLTableDataCellElement;
        this.iconloginPwd = document.getElementById("user-login-pwd-icon") as HTMLTableDataCellElement;
        this.loginElements = [
            document.getElementById("row-login-padding") as HTMLTableRowElement,
            document.getElementById("row-login-id") as HTMLTableRowElement,
            document.getElementById("row-login-pwd") as HTMLTableRowElement,
        ];

        const headerRow = this.iconChevron.parentElement as HTMLTableRowElement;
        headerRow.onclick = this.toggleInterfaceExpanded.bind(this);
        this.submitCell.onclick = this.submitLogin.bind(this);

        this.iconChevron.innerHTML = SVG_CHEVRON_UP;
        this.submitCell.innerHTML = SVG_CHEVRON_RIGHT;
        this.iconloginUser.innerHTML = SVG_USER;
        this.iconloginPwd.innerHTML = SVG_KEY;
        this.updateState();
    }

    private updateState(): void {
        const loggedIn = this.isLoggedIn();
        if (this.expanded) {
            this.iconChevron.innerHTML = SVG_CHEVRON_DOWN;
            if (loggedIn) {
                this.loginElements.forEach(row => row.classList.add("hide"));
            } else {
                this.loginElements.forEach(row => row.classList.remove("hide"));
            }
        } else {
            this.iconChevron.innerHTML = SVG_CHEVRON_UP;
            this.loginElements.forEach(row => row.classList.add("hide"));
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

    private setInfoMessage(_msg: string): void {
        // TODO: Set nice status message
    }

    private toggleInterfaceExpanded(): void {
        this.expanded = !this.expanded;
        this.updateState()
    }

    private setLoggedIn(username: null | string): void {
        if (username == null) {
            this.setInfoMessage("Failed to log in.");
            document.cookie = "logged-in=";
        } else {
            this.setInfoMessage("");
            document.cookie = `logged-in=${username}`;
        }
        this.updateState();
    }

    private isLoggedIn(): null | string {
        let loggedIn: null | string = null;
        document.cookie.split(";").forEach(cookie => {
            const parts = cookie.trim().split("=");
            if (parts.length === 2 && parts[0] === "logged-in" && parts[1] !== "") {
                this.loggedInUsername = parts[1];
                loggedIn = parts[1];
            }
        });

        return loggedIn;
    }

    private async submitLogin(): Promise<void> {
        const idInput = document.getElementById("user-id") as HTMLInputElement;
        const pwdInput = document.getElementById("user-pwd") as HTMLInputElement;

        await Api.Users.login(idInput.value, pwdInput.value)
            .catch(this.setLoggedIn.bind(this, null));
        this.setLoggedIn(idInput.value);
    }
}