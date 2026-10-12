import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "../src/api";

test("background serializes writes, prevents lost updates, and rejects web senders", async () => {
    let listener: (
        message: Request,
        sender: chrome.runtime.MessageSender,
        reply: (response: Response) => void,
    ) => boolean;
    const data: Record<string, unknown> = {};
    const id = "extension-id";
    const url = `chrome-extension://${id}/manager.html`;
    Object.assign(globalThis, {
        chrome: {
            runtime: {
                id,
                getURL: (path: string) => `chrome-extension://${id}/${path}`,
                onMessage: {
                    addListener: (value: typeof listener) => {
                        listener = value;
                    },
                },
            },
            storage: {
                local: {
                    get: async () => structuredClone(data),
                    set: async (values: Record<string, unknown>) => {
                        await new Promise(resolve => setTimeout(resolve, 5));
                        Object.assign(data, values);
                    },
                },
            },
        },
    });
    await import("../src/background");
    const call = (message: Request) =>
        new Promise<Response>(resolve => listener(message, { id, url }, resolve));
    const item = {
        id: "s",
        parentId: null,
        kind: "script" as const,
        name: "Script",
        icon: "",
        code: "return 1;",
    };
    const [firstResponse, secondResponse] = await Promise.all([
        call({ type: "save", revision: 0, items: [item] }),
        call({ type: "save", revision: 0, items: [] }),
    ]);
    assert.equal(firstResponse.ok, true);
    assert.equal(secondResponse.ok, false);
    if (!secondResponse.ok) {
        assert.match(secondResponse.error, /другом окне/);
    }
    const loaded = await call({ type: "load" });
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
        assert.equal(loaded.library?.items.length, 1);
    }
    let replied = false;
    assert.equal(
        listener!({ type: "load" }, { id, url: "https://example.test" }, () => {
            replied = true;
        }),
        false,
    );
    assert.equal(replied, false);
});
