import Notification, { StatusType } from "../notification";

/**
 * The base URL of the API.
 */
export const URL = "http://oah.stiansoltvedt.com/";

/**
 * Wraps the `fetch` API with status messages and some error handling.
 * @param url The URL to fetch from.
 * @param options The options and data to pass to `fetch`.
 */
export async function sendRequest(url: string, options: RequestInit): Promise<Response> {
    const clearStatus = Notification.message("Please wait...", StatusType.Info);
    const response = await fetch(url, options);
    clearStatus();

    if (!response.ok) {
        const msg = `Server returned HTTP ${response.status} '${response.statusText}'.`;
        Notification.message(msg, StatusType.Warning, 10);
        return Promise.reject(msg);
    }
    return response;
}
