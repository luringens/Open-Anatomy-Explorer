import { Question, QuestionFreeform, QuestionLocate, QuestionName, QuestionType, Quiz } from "../quizmaster/quiz";
import { URL, sendRequest } from "./api";

/**
 * Handles communicating with the quiz API.
 */
export default class QuizApi {
    private static url = URL + "quiz/";

    /**
     * POSTs the quiz if it does not have a UUID, otherwise PUTs it.
     * @param set The Quiz to upload.
     * @returns The UUID identifying the quiz on the server.
     */
    public static async upload(quiz: Quiz): Promise<string> {
        if (quiz.uuid == null) return this.post(quiz);
        else return this.put(quiz);
    }

    /**
     * Uploads a quiz with a UUID, replacing any existing quiz with that UUID.
     * @param set The Quiz to upload.
     * @returns The UUID identifying the quiz on the server.
     */
    public static async put(quiz: Quiz): Promise<string> {
        if (quiz.uuid == null) return Promise.reject("Can not PUT without UUID.");
        const url = QuizApi.url + quiz.uuid;
        const options = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(JsonQuiz.fromQuiz(quiz))
        };

        const response = await sendRequest(url, options);
        return await response.json() as string;
    }

    /**
     * Uploads a quiz without considering any pre-existing UUID.
     * @param set The Quiz to upload.
     * @returns The UUID identifying the quiz on the server.
     */
    public static async post(quiz: Quiz): Promise<string> {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(JsonQuiz.fromQuiz(quiz))
        };
        const response = await sendRequest(QuizApi.url, options);
        return await response.json() as string;
    }

    /**
     * Load a quiz by its UUID.
     */
    public static async load(uuid: string): Promise<Quiz> {
        const url = QuizApi.url + uuid;
        const options = { method: "GET" };
        const response = await sendRequest(url, options);
        const jsonQuiz = await response.json() as JsonQuiz;
        return JsonQuiz.toQuiz(jsonQuiz, uuid);
    }

    /**
     * Loads a quiz by its ID number.
     */
    public static async delete(uuid: string): Promise<void> {
        const url = QuizApi.url + uuid;
        const options = { method: "DELETE" };
        await sendRequest(url, options);
    }
}

/**
 * Quiz representation matching what the server expects.
 * Used for converting between the local and the remote format.
 */
class JsonQuiz {
    name: string;
    labelSet: number;
    shuffle: boolean;
    questions: JsonQuestion[];

    constructor(name: string, labelSet: number, shuffle: boolean, questions: JsonQuestion[]) {
        this.name = name;
        this.labelSet = labelSet;
        this.shuffle = shuffle;
        this.questions = questions;
    }

    static toQuiz(json: JsonQuiz, uuid: string): Quiz {
        const questions = [];
        for (let i = 0; i < json.questions.length; i++) {
            questions.push(JsonQuestion.toQuestion(json.questions[i], i));
        }
        return new Quiz(json.name, uuid, json.labelSet, json.shuffle, questions);
    }

    static fromQuiz(quiz: Quiz): JsonQuiz {
        const questions = quiz.questions.map((q) => JsonQuestion.fromQuestion(q));
        return new JsonQuiz(quiz.name, quiz.labelSet, quiz.shuffle, questions);
    }
}

/**
 * Question representation matching what the server expects.
 * Used for converting between the local and the remote format.
 * Notably, it create the appropriate Question implementation as determined by
 * the type number.
 */
class JsonQuestion {
    questionType: number;
    textPrompt: string;
    textAnswer: string | null;
    labelId: number | null;
    showRegions: boolean | null;

    constructor(
        question_type: number,
        text_prompt: string,
        text_answer: string | null,
        label_id: number | null,
        show_regions: boolean | null) {
        this.questionType = question_type;
        this.textPrompt = text_prompt;
        this.textAnswer = text_answer;
        this.labelId = label_id;
        this.showRegions = show_regions;
    }

    static fromQuestion(question: Question): JsonQuestion {
        let textAnswer = null;
        let showRegions = null;
        switch (question.questionType) {
            case QuestionType.Freeform:
                textAnswer = (question as QuestionFreeform).textAnswer;
                break;
            case QuestionType.Name:
                textAnswer = (question as QuestionName).textAnswer;
                break;
            case QuestionType.Locate:
                showRegions = (question as QuestionLocate).showRegions;
                break;
            default: break;
        }
        return new JsonQuestion(question.questionType, question.textPrompt,
            textAnswer, question.labelId, showRegions);
    }

    static toQuestion(q: JsonQuestion, id: number): Question {
        switch (q.questionType) {
            case QuestionType.Freeform: return JsonQuestion.toQuestionFreeform(q, id);
            case QuestionType.Locate: return JsonQuestion.toQuestionLocate(q, id);
            case QuestionType.Name: return JsonQuestion.toQuestionName(q, id);
            default: throw "Invalid question type!"
        }
    }

    static toQuestionFreeform(q: JsonQuestion, id: number): QuestionFreeform {
        const result = new QuestionFreeform(id, q.labelId ?? 0);
        result.textPrompt = q.textPrompt;
        result.textAnswer = q.textAnswer ?? "";
        return result;
    }

    static toQuestionLocate(q: JsonQuestion, id: number): QuestionLocate {
        if (q.showRegions == false) throw "No label ID on locate question!";
        const result = new QuestionLocate(id, q.labelId ?? 0);
        result.textPrompt = q.textPrompt;
        result.showRegions = q.showRegions ?? false;
        return result;
    }

    static toQuestionName(q: JsonQuestion, id: number): QuestionName {
        if (q.labelId == null) throw "No label ID on name question!";
        const result = new QuestionName(id, q.labelId);
        result.textPrompt = q.textPrompt;
        result.textAnswer = q.textAnswer ?? "";
        return result;
    }
}
