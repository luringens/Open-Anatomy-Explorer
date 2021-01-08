import { colorToHex, hexToColor, toHex } from "./utils";
import { LZW } from "./lzw";
import { Label, LabelSet } from "./labels/Label";
import { Question, QuestionFreeform, QuestionLocate, QuestionName, QuestionType, Quiz } from "./quizmaster/Question";

export default class Api {
    public static readonly url = "http://localhost:8001/";

    public static Users = {
        url: Api.url + "users/",

        async register(username: string, password: string): Promise<void> {
            const url = this.url + "create";
            const options: RequestInit = {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, password: password })
            };

            await sendRequest(url, options);
        },

        async login(username: string, password: string): Promise<void> {
            const url = this.url + "login";
            const options: RequestInit = {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, password: password })
            };
            await sendRequest(url, options);
        },

        async logout(): Promise<void> {
            const url = this.url + "logout";
            const options: RequestInit = { method: "POST", credentials: "include" };
            await sendRequest(url, options);
        },

        /// Attempts to refresh the logged in session. Returns true if no longer logged in.
        async refresh(): Promise<boolean> {
            const url = this.url + "refresh";
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
        },

        async addLabel(labelsetUuid: string): Promise<void> {
            const url = this.url + `labelsets/${labelsetUuid}`;
            const options: RequestInit = { method: "PUT", credentials: "include" };
            await sendRequest(url, options);
        },

        async removeLabel(labelsetUuid: string): Promise<void> {
            const url = this.url + `labelsets/${labelsetUuid}`;
            const options: RequestInit = { method: "DELETE", credentials: "include" };
            await sendRequest(url, options);
        },

        async getLabels(): Promise<JsonUserLabelSets[]> {
            const url = this.url + "labelsets";
            const options: RequestInit = { method: "GET", credentials: "include" };
            const response = await sendRequest(url, options);

            return await response.json() as JsonUserLabelSets[];
        },
    }

    public static Labels = {
        url: Api.url + "labels/",

        /// POSTs the set if it does not have a UUID, otherwise PUTs it.
        async upload(set: LabelSet): Promise<string> {
            if (set.uuid == null) return this.post(set);
            else return this.put(set);
        },

        async put(set: LabelSet): Promise<string> {
            if (set.uuid == null) return Promise.reject("Can not PUT without UUID.");
            const url = this.url + set.uuid;
            const options = {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonLabelSet.fromLabelset(set))
            };

            const response = await sendRequest(url, options);
            return await response.json() as string;
        },

        async post(set: LabelSet): Promise<string> {
            const options = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonLabelSet.fromLabelset(set))
            };

            const response = await sendRequest(this.url, options);
            return await response.json() as string;
        },

        async loadByUuid(uuid: string): Promise<LabelSet> {
            const url = `${this.url}uuid/${uuid}`;
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            const jsonSet = await response.json() as JsonLabelSet;

            return JsonLabelSet.toLabelset(jsonSet);
        },

        async load(id: number): Promise<LabelSet> {
            const url = this.url + String(id);
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            const jsonSet = await response.json() as JsonLabelSet;

            return JsonLabelSet.toLabelset(jsonSet);
        },

        async delete(uuid: string): Promise<void> {
            const url = this.url + uuid;
            const options = { method: "DELETE" };
            await sendRequest(url, options);
        },
    }

    public static modelStorage = {
        url: Api.url + "modelstorage/",

        async lookup(modelId: number): Promise<string> {
            const url = `${this.url}lookup/${modelId}`;
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            return await response.json() as string;
        },

        async list(): Promise<[number, string][]> {
            const options = { method: "GET" };
            const response = await sendRequest(this.url, options);
            const models = await response.json() as JsonModel[];
            return models.map(m => [m.id, m.filename])
        },
    }

    public static Quiz = {
        url: Api.url + "quiz/",

        /// POSTs the set if it does not have a UUID, otherwise PUTs it.
        async upload(quiz: Quiz): Promise<string> {
            if (quiz.uuid == null) return this.post(quiz);
            else return this.put(quiz);
        },

        async put(quiz: Quiz): Promise<string> {
            if (quiz.uuid == null) return Promise.reject("Can not PUT without UUID.");
            const url = this.url + quiz.uuid;
            const options = {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonQuiz.fromQuiz(quiz))
            };

            const response = await sendRequest(url, options);
            return await response.json() as string;
        },

        async post(quiz: Quiz): Promise<string> {
            const options = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(JsonQuiz.fromQuiz(quiz))
            };
            const response = await sendRequest(this.url, options);
            return await response.json() as string;
        },

        async load(uuid: string): Promise<Quiz> {
            const url = this.url + uuid;
            const options = { method: "GET" };
            const response = await sendRequest(url, options);
            const jsonQuiz = await response.json() as JsonQuiz;
            return JsonQuiz.toQuiz(jsonQuiz, uuid);
        },

        async delete(uuid: string): Promise<void> {
            const url = this.url + uuid;
            const options = { method: "DELETE" };
            await sendRequest(url, options);
        },
    }
}

async function sendRequest(url: string, options: RequestInit): Promise<Response> {
    const response = await fetch(url, options);
    if (!response.ok) return Promise.reject(`Server returned HTTP ${response.status}.`);
    return response;
}

class JsonUserLabelSets {
    id: number;
    name: string;
    uuid: string;

    constructor(id: number, name: string, uuid: string) {
        this.id = id;
        this.name = name;
        this.uuid = uuid;
    }
}

class JsonModel {
    id: number;
    filename: string;

    constructor(id: number, filename: string) {
        this.id = id;
        this.filename = filename;
    }
}

class JsonLabelSet {
    id: number | null;
    name: string;
    uuid: string | null;
    model: number;
    labels: JsonLabel[];

    constructor(id: number | null, name: string, model: number, labels: JsonLabel[], uuid: string | null = null) {
        this.id = id ?? 0;
        this.name = name;
        this.model = model;
        this.labels = labels;
        this.uuid = uuid;
    }

    static fromLabelset(set: LabelSet): JsonLabelSet {
        const labels = set.labels.map((l) => JsonLabel.fromLabel(l));
        return new JsonLabelSet(set.id, set.name, set.modelId, labels, set.uuid);
    }

    static toLabelset(self: JsonLabelSet): LabelSet {
        if (self.id == null) throw "Server returned null labelset id!";
        const labels = [];
        for (let i = 0; i < self.labels.length; i++) {
            labels.push(JsonLabel.toLabel(self.labels[i], i));
        }
        return new LabelSet(self.id, self.uuid, self.model, labels);
    }
}

class JsonLabel {
    name: string;
    colour: string;
    vertices: string;

    constructor(name: string, colour: string, vertices: string) {
        this.name = name;
        this.colour = colour;
        this.vertices = vertices;
    }

    static fromLabel(label: Label): JsonLabel {
        // First, compress to a hex string.
        // Next, compress using LZW and convert to hex again, because
        // we're transmitting utf8 not bytes.
        const hex = label.vertices.map(toHex).join(",");
        const vertices = LZW.compress(hex).map(toHex).join(",");

        return new JsonLabel(label.name, colorToHex(label.color), vertices);
    }

    static toLabel(self: JsonLabel, id: number): Label {
        const lzw = self.vertices.split(",").map(n => parseInt(n, 16));
        const vertices = LZW.decompress(lzw).split(",").map(n => parseInt(n, 16));
        return new Label(vertices, hexToColor(self.colour), id, self.name);
    }
}

class JsonQuiz {
    labelSet: number;
    shuffle: boolean;
    questions: JsonQuestion[];

    constructor(labelSet: number, shuffle: boolean, questions: JsonQuestion[]) {
        this.labelSet = labelSet;
        this.shuffle = shuffle;
        this.questions = questions;
    }

    static toQuiz(json: JsonQuiz, uuid: string): Quiz {
        const questions = [];
        for (let i = 0; i < json.questions.length; i++) {
            questions.push(JsonQuestion.toQuestion(json.questions[i], i));
        }
        return new Quiz(uuid, json.labelSet, json.shuffle, questions);
    }

    static fromQuiz(quiz: Quiz): JsonQuiz {
        const questions = quiz.questions.map((q) => JsonQuestion.fromQuestion(q));
        return new JsonQuiz(quiz.labelSet, quiz.shuffle, questions);
    }
}

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
