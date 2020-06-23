import { Question } from "./Question";

export class QuizStorage {
    //private static readonly url = "http://51.15.231.127:5000/Quiz";
    private static readonly url = "http://127.0.0.1:3000/Quiz";

    public static loadQuiz(uuid: string, callback: ((_: Quiz) => void)): void {
        const options = { method: "GET" };
        fetch(this.url + "/" + uuid, options)
            .then(async (response) => {
                this.handleError(response);
                const data = await response.json() as Quiz;
                callback(data);
            });
    }

    public static storeQuiz(quiz: Quiz): void {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quiz)
        };
        fetch(this.url, options)
            .then(async (response) => {
                this.handleError(response);
                const data = await response.json();
                console.info("Data stored - UUID: " + data)
                window.location.href = window.origin + location.pathname + "?id=" + data;
            });
    }

    public static updateQuiz(uuid: string, quiz: Quiz): void {
        const options = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quiz)
        };
        fetch(this.url + "/" + uuid, options)
            .then((response) => {
                this.handleError(response);
                console.info("Data updated")
                window.location.href = window.origin + location.pathname + "?id=" + uuid;
            });
    }

    public static deleteQuiz(uuid: string): void {
        const options = {
            method: "DELETE",
        };
        fetch(this.url + "/" + uuid, options)
            .then((response) => {
                this.handleError(response);
                console.info("Data deleted")
                window.location.href = window.origin + location.pathname;
            });
    }

    private static handleError(response: Response): void {
        if (!response.ok || response.body == null) {
            throw new Error(
                "Server responded " + response.status + " " + response.statusText
            );
        }
    }
}

export class Quiz {
    public questions: Question[];
    public model: string;
    public labelId: string;

    public constructor(questions: Question[], model: string, labelId: string) {
        this.questions = questions;
        this.model = model;
        this.labelId = labelId;
    }
}
