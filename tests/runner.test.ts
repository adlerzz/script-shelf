import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { executionCode, runCode } from "../src/runner";

test("snippet can await and return a value from the page context", async () => {
    const result = await vm.runInNewContext(
        executionCode("const pageValue = await Promise.resolve(window.pageValue); return pageValue + document.title;"),
        { window: { pageValue: 42 }, document: { title: "title" } },
    );
    assert.equal(result.ok, true);
    assert.equal(result.result, "42title");
});
test("each run has independent lexical declarations but explicit window changes persist", async () => {
    const context = vm.createContext({ window: { value: 0 } });
    const code = executionCode("const increment = 2; window.value += increment; return window.value;");
    assert.equal((await vm.runInContext(code, context)).result, "2");
    assert.equal((await vm.runInContext(code, context)).result, "4");
});
test("runtime errors are returned and logged; comments do not swallow wrapper", async () => {
    const logs: unknown[] = [];
    const result = await vm.runInNewContext(executionCode('throw new Error("broken"); // end'), {
        console: { error: (...args: unknown[]) => logs.push(args) },
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /broken/);
    assert.equal(logs.length, 1);
    assert.equal(
        (await vm.runInNewContext(executionCode("const value = 1; // trailing comment"))).result,
        "Готово",
    );
});
test("circular and BigInt results are handled, large results truncated", async () => {
    assert.equal((await vm.runInNewContext(executionCode("return 1n;"))).result, "1");
    assert.equal(
        (await vm.runInNewContext(executionCode("const circular = {}; circular.self = circular; return circular;"))).result,
        "[object Object]",
    );
    assert.equal(
        (await vm.runInNewContext(executionCode('return "a".repeat(10000);'))).result.length,
        4000,
    );
});
test("runner rejects protected tabs, checks API toggle and reports injection errors", async () => {
    let url = "chrome://extensions";
    let enabled = true;
    let fail = false;
    let captured: chrome.userScripts.UserScriptInjection | undefined;
    Object.assign(globalThis, {
        chrome: {
            tabs: { get: async () => ({ url }) },
            userScripts: {
                getScripts: async () => {
                    if (!enabled) {
                        throw Error("disabled");
                    }
                },
                execute: async (config: chrome.userScripts.UserScriptInjection) => {
                    captured = config;
                    return [
                        {
                            frameId: 0,
                            ...(fail ? { error: "SyntaxError" } : { result: { ok: true, result: "page" } }),
                        },
                    ];
                },
            },
        },
    });
    await assert.rejects(runCode("return 1;", 1), /служебных/);
    url = "https://example.test";
    enabled = false;
    await assert.rejects(runCode("return 1;", 1), /пользовательские/);
    enabled = true;
    assert.equal(await runCode("return 1;", 1), "page");
    assert.equal(captured?.world, "MAIN");
    assert.equal(captured?.target.tabId, 1);
    fail = true;
    await assert.rejects(runCode("bad", 1), /SyntaxError/);
});
