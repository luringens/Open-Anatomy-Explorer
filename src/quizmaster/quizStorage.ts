import { Question } from "./Question";

export class QuizStorage {
    private static readonly url = "http://51.15.231.127:5000/Quiz";

    public static async loadQuizAsync (uuid: string): Promise<Quiz> {
      const options = { method: "GET" };
      const response = await fetch(this.url + "/" + uuid, options);
      this.handleError(response);
      return await response.json() as Quiz;
    }

    public static async storeQuiz (quiz: Quiz): Promise<void> {
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      };
      const response = await fetch(this.url, options);
      this.handleError(response);

      const data = await response.json() as string;
      console.info(`Data stored - UUID: ${data}`)
      window.location.href = window.origin + location.pathname +
            "?quiz=" + data +
            "&quizaction=edit";
    }

    public static async updateQuiz (uuid: string, quiz: Quiz): Promise<void> {
      const options = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      };
      const response = await fetch(this.url + "/" + uuid, options);
      this.handleError(response);

      console.info("Data updated")
      window.location.href = window.origin + location.pathname +
            "?quiz=" + uuid +
            "&quizaction=edit";
    }

    public static async deleteQuiz (uuid: string, labelId: string | null): Promise<void> {
      const labelQuery = labelId == null ? "" : "?labels=" + labelId;
      const options = {
        method: "DELETE",
      };
      const response = await fetch(this.url + "/" + uuid, options);
      this.handleError(response);

      console.info("Data deleted")
      window.location.href = window.origin + location.pathname + labelQuery;
    }

    private static handleError (response: Response): void {
      if (!response.ok || response.body == null) {
        throw new Error(
                `Server responded ${response.status} ${response.statusText}`,
        );
      }
    }
}

export class Quiz {
    public questions: Question[];
    public model: string;
    public labelId: string;
    public shuffle: boolean;

    public constructor (questions: Question[], model: string, labelId: string, shuffle: boolean) {
      this.questions = questions;
      this.model = model;
      this.labelId = labelId;
      this.shuffle = shuffle;
    }
}
