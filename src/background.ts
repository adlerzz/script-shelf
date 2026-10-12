import { emptyLibrary, exportJSON, MAX_FILE_BYTES, validateItems, type Library } from "./model";
import { runCode } from "./runner";
import type { Request, Response } from "./api";
import { FORMAT_VERSION, STORAGE_KEY } from "./constants/values";
import { isRequest, isFormatVersion, isLoadRequest, isRunRequest, isSaveRequest, isRevision, isRecord, isScript, isInteger } from "./guards";
import { errorMessage } from "./ui";
let queue: Promise<unknown> = Promise.resolve();

async function read (): Promise<Library> {
    const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as unknown;
    if (!stored) {
        return emptyLibrary();
    }
    if (!isRecord(stored) || !isFormatVersion(stored.version) || !isRevision(stored.revision)) {
        throw new Error("Неизвестный формат хранилища.");
    }
    return { version: FORMAT_VERSION, revision: stored.revision, items: validateItems(stored.items) };
}

async function handle (message: Request): Promise<Response> {
    if (isLoadRequest(message)) {
        return { ok: true, library: await read() };
    }
    if (isSaveRequest(message)) {
        const library = await read();
        if (library.revision !== message.revision) {
            throw new Error("Данные изменены в другом окне. Перезагрузи страницу перед сохранением.");
        }
        const next: Library = {
            version: FORMAT_VERSION,
            revision: library.revision + 1,
            items: validateItems(message.items),
        };
        if (new TextEncoder().encode(exportJSON(next.items)).length > MAX_FILE_BYTES) {
            throw new Error(
                "Полка больше 8 МБ. Уменьши код или размер иконок, чтобы экспорт можно было импортировать обратно.",
            );
        }
        await chrome.storage.local.set({ [STORAGE_KEY]: next });
        return { ok: true, library: next };
    }
    if (isRunRequest(message)) {
        const script = (await read()).items.find(item => item.id === message.id);
        if (!isScript(script)) {
            throw new Error("Скрипт не найден.");
        }
        if (!isInteger(message.tabId)) {
            throw new Error("Некорректная вкладка.");
        }
        return { ok: true, result: await runCode(script.code, message.tabId) };
    }
    throw new Error("Неизвестная команда.");
}

chrome.runtime.onMessage.addListener(
    (message: unknown, sender, reply: (response: Response) => void) => {
        // Only extension pages may issue management/run commands; no web message bridge.
        if (
            sender.id !== chrome.runtime.id ||
            !sender.url?.startsWith(chrome.runtime.getURL("")) ||
            sender.tab?.url?.startsWith("http")
        ) {
            return false;
        }
        if (!isRequest(message)) {
            reply({ ok: false, error: "Некорректная команда расширения." });
            return false;
        }
        const action = () => handle(message);
        const pending = isRunRequest(message) ? action() : queue.then(action);
        if (!isRunRequest(message)) {
            queue = pending.catch(() => undefined);
        }
        void pending.then(reply, error =>
            reply({ ok: false, error: errorMessage(error) }),
        );
        return true;
    },
);
