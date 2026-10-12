import type {
    EXPORT_FORMAT,
    FORMAT_VERSION,
    ITEM_KIND,
    MOVE_DIRECTION,
    REQUEST_TYPE,
    TREE_MODE,
    IMAGE_MIME_TYPES,
    STORAGE_AREA,
    EXECUTION_WORLD,
} from "./constants/values";

export type FolderKind = typeof ITEM_KIND.FOLDER;
export type ScriptKind = typeof ITEM_KIND.SCRIPT;
export type ItemKind = FolderKind | ScriptKind;
export type LoadRequestType = typeof REQUEST_TYPE.LOAD;
export type SaveRequestType = typeof REQUEST_TYPE.SAVE;
export type RunRequestType = typeof REQUEST_TYPE.RUN;
export type RequestType = LoadRequestType | SaveRequestType | RunRequestType;
export type ManageMode = typeof TREE_MODE.MANAGE;
export type RunMode = typeof TREE_MODE.RUN;
export type TreeMode = ManageMode | RunMode;
export type MoveDirection = typeof MOVE_DIRECTION[keyof typeof MOVE_DIRECTION];
export type ImageMimeType = typeof IMAGE_MIME_TYPES[number];
export type FormatVersion = typeof FORMAT_VERSION;
export type ExportFormat = typeof EXPORT_FORMAT;
export type StorageArea = typeof STORAGE_AREA;
export type ExecutionWorld = typeof EXECUTION_WORLD;
