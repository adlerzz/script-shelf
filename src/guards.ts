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

export function isInputElement (value: unknown): value is HTMLInputElement {
    return value instanceof HTMLInputElement;
}

export function isTextareaElement (value: unknown): value is HTMLTextAreaElement {
    return value instanceof HTMLTextAreaElement;
}
