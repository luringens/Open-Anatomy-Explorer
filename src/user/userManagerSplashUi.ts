import SVG_KEY from "../../static/key.svg";
import SVG_USER from "../../static/user.svg";
import SVG_CHEVRON_RIGHT from "../../static/chevron-right.svg";
import UserManager from "./userManager";

export default class UserManagerSplashUi {
    public userManager: UserManager;

    private idElement: HTMLInputElement;
    private pwdElement: HTMLInputElement;

    public constructor(userManager: UserManager) {
        this.userManager = userManager;

        // Get relevant HTML elements.
        this.idElement = document.getElementById("splash-user-id") as HTMLInputElement;
        this.pwdElement = document.getElementById("splash-user-pwd") as HTMLInputElement;
        const iconloginPwd = document.getElementById("splash-user-login-pwd-icon") as HTMLTableDataCellElement;
        const iconloginUser = document.getElementById("splash-user-login-id-icon") as HTMLTableDataCellElement;
        const submitCell = document.getElementById("splash-user-login-submit") as HTMLTableDataCellElement;

        // Set SVG icons.
        iconloginPwd.innerHTML = SVG_KEY;
        iconloginUser.innerHTML = SVG_USER;
        submitCell.innerHTML = SVG_CHEVRON_RIGHT;

        // Bind event handlers.
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
}
