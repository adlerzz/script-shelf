import {
    EXECUTION_WORLD,
    EXPORT_FORMAT,
    FORMAT_VERSION,
    IMAGE_MIME_TYPES,
    ITEM_KIND,
    MOVE_DIRECTION,
    REQUEST_TYPE,
    STORAGE_AREA,
    TREE_MODE,
} from "./constants/values";
import type {
    ExecutionWorld,
    ExportFormat,
    FolderKind,
    FormatVersion,
    ImageMimeType,
    ItemKind,
    LoadRequestType,
    ManageMode,
    MoveDirection,
    RequestType,
    RunMode,
    RunRequestType,
    SaveRequestType,
    ScriptKind,
    StorageArea,
    TreeMode,
} from "./types";
import type { FolderItem, Item, ScriptItem } from "./model";
import type { LoadRequest, Request, RunRequest, SaveRequest, SuccessResponse, Response } from "./api";

export function isString (value: unknown): value is string {
    return typeof value === "string";
}

export function isArray (value: unknown): value is unknown[] {
    return Array.isArray(value);
}

export function isRecord (value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !isArray(value);
}

export function isError (value: unknown): value is Error {
    return value instanceof Error;
}

export function isInteger (value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value);
}

export function isRevision (value: unknown): value is number {
    return isInteger(value) && Number.isSafeInteger(value) && value >= 0;
}

export function isFolderKind (value: unknown): value is FolderKind {
    return value === ITEM_KIND.FOLDER;
}

export function isScriptKind (value: unknown): value is ScriptKind {
    return value === ITEM_KIND.SCRIPT;
}

export function isItemKind (value: unknown): value is ItemKind {
    return isFolderKind(value) || isScriptKind(value);
}

// Structural JSON guard; semantic limits and parent relationships are validated by the model.
export function isItem (value: unknown): value is Item {
    return isRecord(value) && isString(value.id) &&
        (value.parentId === null || isString(value.parentId)) &&
        isString(value.name) && isString(value.icon) &&
        (isFolderKind(value.kind) || (isScriptKind(value.kind) && isString(value.code)));
}

// Item guards operate on already validated models, not arbitrary JSON objects.
export function isFolder (item: Item | null | undefined): item is FolderItem {
    return !!item && isFolderKind(item.kind);
}

export function isScript (item: Item | null | undefined): item is ScriptItem {
    return !!item && isScriptKind(item.kind);
}

export function isLoadRequestType (value: unknown): value is LoadRequestType {
    return value === REQUEST_TYPE.LOAD;
}

export function isSaveRequestType (value: unknown): value is SaveRequestType {
    return value === REQUEST_TYPE.SAVE;
}

export function isRunRequestType (value: unknown): value is RunRequestType {
    return value === REQUEST_TYPE.RUN;
}

export function isRequestType (value: unknown): value is RequestType {
    return isLoadRequestType(value) || isSaveRequestType(value) || isRunRequestType(value);
}

export function isRequest (value: unknown): value is Request {
    if (!isRecord(value) || !isRequestType(value.type)) {
        return false;
    }
    if (isLoadRequestType(value.type)) {
        return true;
    }
    if (isSaveRequestType(value.type)) {
        return isRevision(value.revision) && isArray(value.items) && value.items.every(isItem);
    }
    return isString(value.id) && isInteger(value.tabId);
}

export function isInputElement (value: unknown): value is HTMLInputElement {
    return value instanceof HTMLInputElement;
}

export function isTextareaElement (value: unknown): value is HTMLTextAreaElement {
    return value instanceof HTMLTextAreaElement;
}

export function isLoadRequest (request: Request): request is LoadRequest {
    return isLoadRequestType(request.type);
}

export function isSaveRequest (request: Request): request is SaveRequest {
    return isSaveRequestType(request.type);
}

export function isRunRequest (request: Request): request is RunRequest {
    return isRunRequestType(request.type);
}

export function isManageMode (value: unknown): value is ManageMode {
    return value === TREE_MODE.MANAGE;
}

export function isRunMode (value: unknown): value is RunMode {
    return value === TREE_MODE.RUN;
}

export function isTreeMode (value: unknown): value is TreeMode {
    return isManageMode(value) || isRunMode(value);
}

export function isMoveDirection (value: unknown): value is MoveDirection {
    return value === MOVE_DIRECTION.UP || value === MOVE_DIRECTION.DOWN;
}

export function isFormatVersion (value: unknown): value is FormatVersion {
    return value === FORMAT_VERSION;
}

export function isExportFormat (value: unknown): value is ExportFormat {
    return value === EXPORT_FORMAT;
}

export function isStorageArea (value: unknown): value is StorageArea {
    return value === STORAGE_AREA;
}

export function isExecutionWorld (value: unknown): value is ExecutionWorld {
    return value === EXECUTION_WORLD;
}

export function isImageMimeType (value: unknown): value is ImageMimeType {
    return IMAGE_MIME_TYPES.some(mimeType => mimeType === value);
}

export function isSuccessResponse (response: Response | null | undefined): response is SuccessResponse {
    return response?.ok === true;
}

export type ExecutionResult = { ok: true; result: string } | { ok: false; error: string };

export function isExecutionResult (value: unknown): value is ExecutionResult {
    return isRecord(value) && (value.ok === true ? isString(value.result) : value.ok === false && isString(value.error));
}
