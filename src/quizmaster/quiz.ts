/**
 * A class representing a Quiz.
 */
export class Quiz {
    name: string;
    labelSet: number;
    shuffle: boolean;
    questions: Question[];

    /**
     * The UUID of the quiz as identified by the server.
     * Null will usually mean that it has not been saved to the server yet.
     */
    uuid: string | null;

    constructor(name: string, uuid: string | null, labelSet: number, shuffle: boolean, questions: Question[]) {
        this.name = name;
        this.uuid = uuid;
        this.labelSet = labelSet;
        this.shuffle = shuffle;
        this.questions = questions;
    }
}

/**
 * Enum used to differentiate between question types when the specific type is not yet known.
 */
export enum QuestionType {
    Locate = 0,
    Name = 1,
    Freeform = 2,
}

/**
 * Common question interface.
 */
export interface Question {
    id: number;
    questionType: QuestionType;
    textPrompt: string;
    labelId: number;
}

/**
 * Represents a "locate this" question, asking the user to find a specific region.
 */
export class QuestionLocate implements Question {
    public readonly questionType = QuestionType.Locate;
    public readonly id: number;
    public textPrompt = "";
    public labelId: number;
    public showRegions = true;

    public constructor(id: number, labelId: number) {
        this.id = id;
        this.labelId = labelId;
    }
}

/**
 * Represents a "name this" question, asking the user to name what a displayed region is named.
 */
export class QuestionName implements Question {
    public readonly questionType = QuestionType.Name;
    public readonly id: number;
    public textPrompt = "";
    public textAnswer = "";
    public labelId: number;

    public constructor(id: number, labelId: number) {
        this.id = id;
        this.labelId = labelId;
    }
}

/**
 * Represents a free-form text question.
 */
export class QuestionFreeform implements Question {
    public readonly questionType = QuestionType.Freeform;
    public readonly id: number;
    public textPrompt = "";
    public textAnswer = "";
    public labelId: number;

    public constructor(id: number, labelId: number) {
        this.id = id;
        this.labelId = labelId;
    }
}

/**
 * Translates a question type ID to a human-friendly question type description.
 */
export function GetQuestionTypeName(questionType: QuestionType): string {
    switch (questionType) {
        case QuestionType.Locate:
            return "Locate the region";
        case QuestionType.Name:
            return "Name the region";
        case QuestionType.Freeform:
            return "Freeform question";
    }
}
