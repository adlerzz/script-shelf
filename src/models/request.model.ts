import { isArray, isInteger, isRecord, isString } from "../guards";
import { isItem, type Item } from "./item.model";

export const REQUEST_TYPE = { LOAD: "load", SAVE: "save", RUN: "run" } as const;

export interface LoadRequest {
    type: typeof REQUEST_TYPE.LOAD;
}
export interface SaveRequest {
    type: typeof REQUEST_TYPE.SAVE;
    revision: number;
    items: Item[];
}
export interface RunRequest {
    type: typeof REQUEST_TYPE.RUN;
    id: string;
    tabId: number;
}
export type Request = LoadRequest | SaveRequest | RunRequest;

function hasRequestType (value: unknown, type: Request["type"]): boolean {
    return isRecord(value) && "type" in value && value.type === type;
}

export function isLoadRequest (value: unknown): value is LoadRequest {
    return hasRequestType(value, REQUEST_TYPE.LOAD);
}

export function isSaveRequest (value: unknown): value is SaveRequest {
    return hasRequestType(value, REQUEST_TYPE.SAVE);
}

export function isRunRequest (value: unknown): value is RunRequest {
    return hasRequestType(value, REQUEST_TYPE.RUN);
}

export function isRevision (value: unknown): value is number {
    return isInteger(value) && Number.isSafeInteger(value) && value >= 0;
}

export function isRequest (value: unknown): value is Request {
    if (!isRecord(value) ) {
        return false;
    }
    if (isLoadRequest(value)) {
        return true;
    }
    if (isSaveRequest(value)) {
        return isRevision(value.revision) && isArray(value.items) && value.items.every(isItem);
    }
    return isString(value.id) && isInteger(value.tabId);
}
