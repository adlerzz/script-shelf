import {
    EXPORT_FORMAT,
    FORMAT_VERSION,
    JSON_INDENT,
    MAX_FILE_BYTES,
    STORAGE_AREA,
    EXECUTION_WORLD,
} from "../constants/values";
import { isRecord } from "../guards";
import { type Item, validateItems } from "./item.model";

// Kept as re-exports for consumers of the existing model API.
export { FORMAT_VERSION as VERSION, MAX_FILE_BYTES } from "../constants/values";

export type MoveDirection = typeof MOVE_DIRECTION[keyof typeof MOVE_DIRECTION];
export type ImageMimeType = typeof IMAGE_MIME_TYPES[number];
export type FormatVersion = typeof FORMAT_VERSION;
export type ExportFormat = typeof EXPORT_FORMAT;
export type StorageArea = typeof STORAGE_AREA;
export type ExecutionWorld = typeof EXECUTION_WORLD;

export const MOVE_DIRECTION = { UP: -1, DOWN: 1 } as const;
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export interface Library {
    version: FormatVersion;
    revision: number;
    items: Item[];
}

export interface ExportFile {
    format: ExportFormat;
    version: FormatVersion;
    items: Item[];
}

export function isFormatVersion (value: unknown): value is FormatVersion {
    return value === FORMAT_VERSION;
}

function isExportFormat (value: unknown): value is ExportFormat {
    return value === EXPORT_FORMAT;
}

export function isImageMimeType (value: unknown): value is ImageMimeType {
    return IMAGE_MIME_TYPES.some(mimeType => mimeType === value);
}

export type ExecutionResult = { ok: true; result: string } | { ok: false; error: string };

export const emptyLibrary = (): Library => ({ version: FORMAT_VERSION, revision: 0, items: [] });

export function parseImport (text: string): Item[] {
    if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
        throw new Error("JSON больше 8 МБ.");
    }
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        throw new Error("Файл не содержит корректный JSON.");
    }
    if (!isRecord(raw)) {
        throw new Error("Некорректный формат файла.");
    }
    const file = raw;
    if (!isExportFormat(file.format) || !isFormatVersion(file.version)) {
        throw new Error("Ожидается Script Shelf JSON, версия 1.");
    }
    return validateItems(file.items);
}

export function mergeItems (
    current: Item[],
    incoming: Item[],
    uuid: () => string = () => crypto.randomUUID(),
): Item[] {
    const used = new Set(current.map(item => item.id));
    const ids = new Map<string, string>();
    for (const item of incoming) {
        let id = uuid();
        while (used.has(id)) {
            id = uuid();
        }
        used.add(id);
        ids.set(item.id, id);
    }
    return validateItems([
        ...current,
        ...incoming.map(item => ({
            ...item,
            id: ids.get(item.id)!,
            parentId: item.parentId === null ? null : ids.get(item.parentId)!,
        })),
    ]);
}

export function descendants (items: Item[], id: string): Set<string> {
    const result = new Set([id]);
    let size;
    do {
        size = result.size;
        for (const item of items) {
            if (item.parentId && result.has(item.parentId)) {
                result.add(item.id);
            }
        }
    } while (result.size !== size);
    return result;
}

export function reorder (items: Item[], id: string, direction: MoveDirection): Item[] {
    const result = [...items];
    const index = result.findIndex(item => item.id === id);
    const item = result[index];
    if (!item) {
        return result;
    }
    const siblings = result
        .map((node, index) => ({ node, index }))
        .filter(sibling => sibling.node.parentId === item.parentId);
    const siblingIndex = siblings.findIndex(sibling => sibling.node.id === id);
    const other = siblings[siblingIndex + direction];
    if (other) {
        result[index] = other.node;
        result[other.index] = item;
    }
    return result;
}

export function exportJSON (items: Item[]): string {
    return JSON.stringify(
        { format: EXPORT_FORMAT, version: FORMAT_VERSION, items } satisfies ExportFile,
        null,
        JSON_INDENT,
    );
}
