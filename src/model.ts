import {
    EXPORT_FORMAT,
    FORMAT_VERSION,
    ITEM_KIND,
    JSON_INDENT,
    MAX_CODE_LENGTH,
    MAX_FILE_BYTES,
    MAX_FOLDER_DEPTH,
    MAX_ICON_DATA_LENGTH,
    MAX_ICON_TEXT_LENGTH,
    MAX_ID_LENGTH,
    MAX_ITEMS,
    MAX_NAME_LENGTH,
} from "./constants/values";
import {
    isArray,
    isExportFormat,
    isFolder,
    isFolderKind,
    isFormatVersion,
    isRecord,
    isScriptKind,
    isString,
} from "./guards";
import type { ExportFormat, FolderKind, FormatVersion, MoveDirection, ScriptKind } from "./types";

// Kept as re-exports for consumers of the existing model API.
export { FORMAT_VERSION as VERSION, MAX_FILE_BYTES } from "./constants/values";

interface ItemFields {
    id: string;
    parentId: string | null;
    name: string;
    icon: string;
}

export interface FolderItem extends ItemFields {
    kind: FolderKind;
}

export interface ScriptItem extends ItemFields {
    kind: ScriptKind;
    code: string;
}

export type Item = FolderItem | ScriptItem;

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

export const emptyLibrary = (): Library => ({ version: FORMAT_VERSION, revision: 0, items: [] });
export function validateIcon (icon: unknown): string {
    if (!isString(icon) || icon.length > MAX_ICON_DATA_LENGTH) {
        throw new Error("Некорректная иконка.");
    }
    if (icon.length <= MAX_ICON_TEXT_LENGTH && !icon.startsWith("data:")) {
        return icon;
    }
    if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(icon)) {
        return icon;
    }
    throw new Error("Иконка: эмодзи, короткий текст или встроенное PNG/JPEG/WebP/GIF.");
}

export function validateItems (input: unknown): Item[] {
    if (!isArray(input) || input.length > MAX_ITEMS) {
        throw new Error(`Ожидается массив, не более ${MAX_ITEMS} элементов.`);
    }
    const ids = new Set<string>();
    const items = input.map((raw: unknown): Item => {
        if (!isRecord(raw)) {
            throw new Error("Некорректный элемент.");
        }
        const candidate = raw;
        if (!isString(candidate.id) || !candidate.id || candidate.id.length > MAX_ID_LENGTH || ids.has(candidate.id)) {
            throw new Error("Идентификаторы должны быть уникальными.");
        }
        ids.add(candidate.id);
        if (candidate.parentId !== null && (!isString(candidate.parentId) || !candidate.parentId)) {
            throw new Error("Некорректная родительская папка.");
        }
        if (!isString(candidate.name) || !candidate.name.trim() || candidate.name.length > MAX_NAME_LENGTH) {
            throw new Error(`Название: от 1 до ${MAX_NAME_LENGTH} символов.`);
        }
        const base = {
            id: candidate.id,
            parentId: candidate.parentId,
            name: candidate.name.trim(),
            icon: validateIcon(candidate.icon),
        };
        if (isFolderKind(candidate.kind)) {
            return { ...base, kind: ITEM_KIND.FOLDER };
        }
        if (!isScriptKind(candidate.kind) || !isString(candidate.code) || candidate.code.length > MAX_CODE_LENGTH) {
            throw new Error("Некорректный код скрипта.");
        }
        return { ...base, kind: ITEM_KIND.SCRIPT, code: candidate.code };
    });
    const byId = new Map(items.map(item => [item.id, item]));
    for (const item of items) {
        const seen = new Set([item.id]);
        let parent = item.parentId;
        while (parent !== null) {
            const node = byId.get(parent);
            if (!isFolder(node)) {
                throw new Error("Родитель должен быть существующей папкой.");
            }
            if (seen.has(parent)) {
                throw new Error("Обнаружен цикл вложенности папок.");
            }
            seen.add(parent);
            if (seen.size > MAX_FOLDER_DEPTH + 1) {
                throw new Error(`Максимальная вложенность — ${MAX_FOLDER_DEPTH} папки.`);
            }
            parent = node.parentId;
        }
    }
    return items;
}

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
