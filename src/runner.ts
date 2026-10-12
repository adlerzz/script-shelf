import { EXECUTION_WORLD, MAX_RESULT_LENGTH, TOP_FRAME_ID } from "./constants/values";
import { isExecutionResult, isString } from "./guards";

// Source is supplied as userScripts code, never evaluated in an extension page.
// An async function gives snippets top-level await/return and a fresh lexical scope per run.
export function executionCode (code: string): string {
    return `(async () => {
    const isString = ${isString.toString()};
    try {
        const value = await (async () => {
${code}
        })();

        let result;
        try {
            result = value === undefined
                ? "Готово"
                : isString(value)
                    ? value
                    : JSON.stringify(value);
        } catch {
            result = String(value);
        }

        return {
            ok: true,
            result: String(result ?? value).slice(0, ${MAX_RESULT_LENGTH}),
        };
    } catch (error) {
        console.error("[Script Shelf]", error);
        return { ok: false, error: String(error) };
    }
})()`;
}

export async function runCode (code: string, tabId: number): Promise<string> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^(https?|file):/.test(tab.url)) {
        throw new Error("Выбери обычную веб-страницу. На служебных страницах запуск недоступен.");
    }
    try {
        await chrome.userScripts.getScripts();
    } catch {
        throw new Error(
            "Включи «Разрешить пользовательские скрипты» в деталях расширения (Chrome 138+). В Chrome 135–137 включи режим разработчика.",
        );
    }
    const results = await chrome.userScripts.execute({
        target: { tabId },
        world: EXECUTION_WORLD,
        injectImmediately: true,
        js: [{ code: executionCode(code) }],
    });
    const first = results.find(result => result.frameId === TOP_FRAME_ID);
    if (!first) {
        throw new Error("Страница не вернула результат.");
    }
    if (first.error) {
        throw new Error(first.error);
    }
    const result: unknown = first.result;
    if (!isExecutionResult(result)) {
        throw new Error("Ошибка выполнения. Подробнее — в консоли вкладки.");
    }
    if (!result.ok) {
        throw new Error(result.error);
    }
    return result.result;
}
