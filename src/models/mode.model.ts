export const TREE_MODE = { MANAGE: "manage", RUN: "run" } as const;

export type ManageMode = typeof TREE_MODE.MANAGE;
export type RunMode = typeof TREE_MODE.RUN;
export type TreeMode = ManageMode | RunMode;

export function isManageMode (value: unknown): value is ManageMode {
    return value === TREE_MODE.MANAGE;
}

export function isRunMode (value: unknown): value is RunMode {
    return value === TREE_MODE.RUN;
}
