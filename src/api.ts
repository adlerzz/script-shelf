import type { Library, Item } from "./model";
import { REQUEST_TYPE } from "./constants/values";
import { isSuccessResponse } from "./guards";
import type { LoadRequestType, SaveRequestType, RunRequestType } from "./types";

export interface LoadRequest {
    type: LoadRequestType;
}
export interface SaveRequest {
    type: SaveRequestType;
    revision: number;
    items: Item[];
}
export interface RunRequest {
    type: RunRequestType;
    id: string;
    tabId: number;
}
export type Request = LoadRequest | SaveRequest | RunRequest;
export interface SuccessResponse {
    ok: true;
    library?: Library;
    result?: string;
}
export interface FailureResponse {
    ok: false;
    error: string;
}
export type Response = SuccessResponse | FailureResponse;

export async function request (message: Request): Promise<SuccessResponse> {
    const response: Response = await chrome.runtime.sendMessage(message);
    if (!isSuccessResponse(response)) {
        throw new Error(response?.error ?? "Нет ответа от расширения.");
    }
    return response;
}

export async function load (): Promise<Library> {
    const response = await request({ type: REQUEST_TYPE.LOAD });
    if (!response.library) {
        throw new Error("Библиотека не загружена.");
    }
    return response.library;
}

export async function save (library: Library, items: Item[]): Promise<Library> {
    const response = await request({ type: REQUEST_TYPE.SAVE, revision: library.revision, items });
    if (!response.library) {
        throw new Error("Библиотека не сохранена.");
    }
    return response.library;
}
