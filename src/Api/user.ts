import { URL, sendRequest } from "./api";

/**
 * Handles communicating with the users API.
 */
export default class Users {
    private static url = URL + "users/";

    /**
     * Registers a new user with the server.
     */
    public static async register(username: string, password: string): Promise<void> {
        const url = Users.url + "create";
        const options: RequestInit = {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, password: password })
        };

        await sendRequest(url, options);
    }

    /**
     * Attempts to logs in with the specified credentials.
     * If successful, we will have a login cookie to use when calling APIs
     * requiring authorization.
     */
    public static async login(username: string, password: string): Promise<void> {
        const url = Users.url + "login";
        const options: RequestInit = {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, password: password })
        };
        await sendRequest(url, options);
    }

    /**
     * Instructs the server to log us out, deleting the login cookie.
     */
    public static async logout(): Promise<void> {
        const url = Users.url + "logout";
        const options: RequestInit = { method: "POST", credentials: "include" };
        await sendRequest(url, options);
    }

    /**
     * Asks the server if the currently logged in account has administrative
     * privileges. If there is no logged in user, the API returns 401
     * Unauthorized, and the Promise is rejected.
     * 
     * This function is used for determining whether or not admin UIs should be
     * displayed. It is not used for security purposes.
     */
    public static async isadmin(): Promise<boolean> {
        const url = Users.url + "isadmin";
        const options: RequestInit = { method: "GET", credentials: "include" };
        const response = await sendRequest(url, options);
        return (await response.json()) as boolean;
    }

    /**
     * Attempts to refresh the logged in session. Returns false if the server'
     * does not accept our login cookie, or we are otherwise not logged in.
     */
    public static async refresh(): Promise<boolean> {
        const url = Users.url + "refresh";
        const options: RequestInit = { method: "POST", credentials: "include" };
        return await fetch(url, options)
            .then(response => {
                // 401 UNAUTHORIZED indicates that we are not logged in.
                if (response.status == 401) return false;
                // Other codes are unhandled.
                if (!response.ok) return Promise.reject(`Server returned HTTP ${response.status}.`);
                else return response.ok;
            })
            .catch((response: Response) => {
                if (response.status == 401) return false;
                if (!response.ok) return Promise.reject(`Server returned HTTP ${response.status}.`);
                return true;
            });
    }

    /**
     * Groups functions handling bookmarked labelsets.
     */
    public static Labels = {
        url: Users.url + "labelsets/",

        /**
         * Bookmark a labelset with the given UUID.
         */
        async add(labelsetUuid: string): Promise<void> {
            const url = this.url + labelsetUuid;
            const options: RequestInit = { method: "PUT", credentials: "include" };
            await sendRequest(url, options);
        },

        /**
         * Remove a bookmark for a labelset with the given UUID. Rejects the
         * Promise if it is not bookmarked, as the server will return 404.
         */
        async remove(labelsetUuid: string): Promise<void> {
            const url = this.url + labelsetUuid;
            const options: RequestInit = { method: "DELETE", credentials: "include" };
            await sendRequest(url, options);
        },

        /**
         * Get a list of all bookmarked labelsets.
         */
        async get(): Promise<JsonUserLabelSet[]> {
            const options: RequestInit = { method: "GET", credentials: "include" };
            const response = await sendRequest(this.url, options);
            return await response.json() as JsonUserLabelSet[];
        },
    }

    /**
     * Groups functions handling bookmarked quizzes.
     */
    public static Quizzes = {
        url: Users.url + "quizzes/",

        /**
         * Bookmark a quiz with the given UUID.
         */
        async add(quizUuid: string): Promise<void> {
            const url = this.url + quizUuid;
            const options: RequestInit = { method: "PUT", credentials: "include" };
            await sendRequest(url, options);
        },

        /**
         * Remove a bookmark for a quiz with the given UUID. Rejects the Promise
         * if it is not bookmarked, as the server will return 404.
         */
        async remove(quizUuid: string): Promise<void> {
            const url = this.url + quizUuid;
            const options: RequestInit = { method: "DELETE", credentials: "include" };
            await sendRequest(url, options);
        },

        /**
         * Get a list of all bookmarked quizzes.
         */
        async get(): Promise<JsonUserLabelSet[]> {
            const options: RequestInit = { method: "GET", credentials: "include" };
            const response = await sendRequest(this.url, options);
            return await response.json() as JsonUserQuiz[];
        },
    }
}

export class JsonUserLabelSet {
    id: number;
    name: string;
    uuid: string;

    constructor(id: number, name: string, uuid: string) {
        this.id = id;
        this.name = name;
        this.uuid = uuid;
    }
}

export class JsonUserQuiz {
    id: number;
    name: string;
    uuid: string;

    constructor(id: number, name: string, uuid: string) {
        this.id = id;
        this.name = name;
        this.uuid = uuid;
    }
}
