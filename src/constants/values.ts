// Persisted format and browser API identifiers.
export const FORMAT_VERSION = 1;
export const EXPORT_FORMAT = "script-shelf";
export const STORAGE_KEY = "scriptShelf";
export const STORAGE_AREA = "local";
export const EXECUTION_WORLD = "MAIN";

export function isStorageArea (value: unknown): value is typeof STORAGE_AREA {
    return value === STORAGE_AREA;
}

// Data limits and runtime behavior. CSS dimensions remain in the stylesheets.
const BYTES_PER_KIB = 1024;
export const MAX_FILE_BYTES = 8 * BYTES_PER_KIB * BYTES_PER_KIB;
export const MAX_ICON_FILE_BYTES = 256 * BYTES_PER_KIB;
export const MAX_ICON_DATA_LENGTH = 400_000;
export const MAX_ICON_TEXT_LENGTH = 32;
export const MAX_ITEMS = 5000;
export const MAX_ID_LENGTH = 100;
export const MAX_NAME_LENGTH = 200;
export const MAX_CODE_LENGTH = 1_000_000;
export const MAX_FOLDER_DEPTH = 32;
export const MAX_RESULT_LENGTH = 4000;
export const COPY_NAME_SUFFIX = " (копия)";
export const COPY_NAME_MAX_LENGTH = MAX_NAME_LENGTH - COPY_NAME_SUFFIX.length;
export const JSON_INDENT = 2;
export const EDITOR_INDENT = "    ";
export const OBJECT_URL_REVOKE_DELAY_MS = 1000;
export const ISO_DATE_LENGTH = 10;
export const TOP_FRAME_ID = 0;
export const TREE_INDENT_PX = 16;
export const TREE_MANAGE_PADDING_PX = 8;
export const TREE_RUN_PADDING_PX = 12;

export const EDITOR_LANGUAGE = "js";
