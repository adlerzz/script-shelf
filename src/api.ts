import { type Item } from "./models/item.model";
import { type Library } from "./models/common.model";
import { Request, REQUEST_TYPE } from "./models/request.model";
import { Response, isSuccessResponse, SuccessResponse } from "./models/response.model";

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
