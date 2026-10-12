import { exportJSON, validateIcon, type Item } from "./model";
import { ISO_DATE_LENGTH, MAX_ICON_FILE_BYTES, OBJECT_URL_REVOKE_DELAY_MS } from "./constants/values";
import { isError, isImageMimeType } from "./guards";

export function folderPath (items: Item[], id: string | null): string {
    const parts: string[] = [];
    while (id) {
        const node = items.find(item => item.id === id);
        if (!node) {
            break;
        }
        parts.unshift(node.name);
        id = node.parentId;
    }
    return parts.join(" / ");
}

export function errorMessage (error: unknown): string {
    return isError(error) ? error.message : String(error);
}

export function downloadJSON (items: Item[]): void {
    const url = URL.createObjectURL(new Blob([exportJSON(items)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `script-shelf-${new Date().toISOString().slice(0, ISO_DATE_LENGTH)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
}

export async function readIcon (file: File): Promise<string> {
    if (!isImageMimeType(file.type) || file.size > MAX_ICON_FILE_BYTES) {
        throw new Error("Выбери PNG/JPEG/WebP/GIF до 256 КБ.");
    }
    const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
        reader.readAsDataURL(file);
    });
    return validateIcon(value);
}
