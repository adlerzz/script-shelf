import { MAX_CODE_LENGTH, MAX_FOLDER_DEPTH, MAX_ICON_DATA_LENGTH, MAX_ICON_TEXT_LENGTH, MAX_ID_LENGTH, MAX_ITEMS, MAX_NAME_LENGTH } from "../constants/values";
import { isArray, isRecord, isString } from "../guards";

export const ITEM_KIND = { FOLDER: "folder", SCRIPT: "script" } as const;

export type ItemKind = typeof ITEM_KIND.FOLDER | typeof ITEM_KIND.SCRIPT;

interface ItemFields {
    id: string;
    parentId: string | null;
    name: string;
    icon: string;
}

export type Item = FolderItem | ScriptItem;

export interface FolderItem extends ItemFields {
    kind: typeof ITEM_KIND.FOLDER;
}

export interface ScriptItem extends ItemFields {
    kind: typeof ITEM_KIND.SCRIPT;
    code: string;
}

export function isFolderKind (value: unknown): value is typeof ITEM_KIND.FOLDER {
    return value === ITEM_KIND.FOLDER;
}

export function isScriptKind (value: unknown): value is typeof ITEM_KIND.SCRIPT {
    return value === ITEM_KIND.SCRIPT;
}

export function isFolder (item: Item | null | undefined): item is FolderItem {
    return !!item && isFolderKind(item.kind);
}

export function isScript (item: Item | null | undefined): item is ScriptItem {
    return !!item && isScriptKind(item.kind);
}

export function isItem (value: unknown): value is Item {
    return isRecord(value) && isString(value.id) &&
        (value.parentId === null || isString(value.parentId)) &&
        isString(value.name) && isString(value.icon) &&
        (isFolderKind(value.kind) || (isScriptKind(value.kind) && isString(value.code)));
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
