import { Library } from "./common.model";

export interface SuccessResponse {
    ok: true;
    library?: Library;
    result?: string;
}
export interface FailureResponse {
    ok: false;
    error: string;
}

export type Response = SuccessResponse | FailureResponse;

export function isSuccessResponse (response: Response | null | undefined): response is SuccessResponse {
    return response?.ok === true;
}
