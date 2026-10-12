<script lang="ts">
    import CodeFlask from "codeflask";
    import { EDITOR_INDENT, EDITOR_LANGUAGE } from "../constants/values";
    import { isTextareaElement } from "../guards";

    interface Props {
        value: string;
        disabled?: boolean;
        onchange: (code: string) => void;
    }

    let { value, disabled = false, onchange }: Props = $props();

    function attachEditor (container: HTMLDivElement): { destroy: () => void } {
        const editor = new CodeFlask(container, {
            language: EDITOR_LANGUAGE,
            defaultTheme: false,
            lineNumbers: true,
            tabSize: EDITOR_INDENT.length,
            areaId: "code",
            // Keep native typing and the existing Tab behavior; no automatic bracket edits.
            handleTabs: false,
            handleSelfClosingCharacters: false,
            handleNewLineIndentation: false,
        });
        const textarea = container.querySelector("textarea");
        if (!isTextareaElement(textarea)) {
            throw new Error("Не удалось создать редактор кода.");
        }
        textarea.setAttribute("aria-label", "Код скрипта");
        let active = true;

        function publish (code: string): void {
            if (active && !disabled && code !== value) {
                onchange(code);
            }
        }

        // CodeFlask's onUpdate is deferred. Native input must update the draft before
        // a following save or selection click; delayed notifications are only a fallback.
        const input = () => publish(textarea.value);
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Tab" && !disabled) {
                event.preventDefault();
                textarea.setRangeText(EDITOR_INDENT, textarea.selectionStart, textarea.selectionEnd, "end");
                editor.updateCode(textarea.value);
                publish(textarea.value);
            }
        };
        textarea.addEventListener("input", input);
        textarea.addEventListener("keydown", keydown);
        editor.onUpdate(publish);

        $effect(() => {
            if (editor.getCode() !== value) {
                editor.updateCode(value);
            }
            if (disabled) {
                editor.enableReadonlyMode();
            } else {
                editor.disableReadonlyMode();
            }
        });

        return {
            destroy: () => {
                active = false;
                textarea.removeEventListener("input", input);
                textarea.removeEventListener("keydown", keydown);
                container.replaceChildren();
            },
        };
    }
</script>

<div class="code-editor" use:attachEditor></div>

<style>
    .code-editor {
        position: relative;
        min-height: 320px;
        height: calc(100vh - 485px);
        resize: vertical;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #0d1219;
        --code-font: 'Cascadia Code', 'Consolas', monospace;
        --code-line-height: 24px;
        --code-gutter: 46px;
        --code-padding: 18px;

        &:focus-within {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        & :global(.codeflask) {
            color: #d6ecc8;

            &::before {
                width: var(--code-gutter);
                background: #151b24;
                border-right: 1px solid var(--line);
            }
        }

        & :global(.codeflask__flatten) {
            padding: var(--code-padding);
            font: 14px/var(--code-line-height) var(--code-font);
            tab-size: 4;
        }

        & :global(.codeflask--has-line-numbers .codeflask__flatten) {
            left: var(--code-gutter);
            width: calc(100% - var(--code-gutter));
        }

        & :global(.codeflask__textarea) {
            color: transparent;
            caret-color: var(--text);
            outline: none;
            white-space: pre;
            overflow-wrap: normal;
        }

        & :global(.codeflask__pre) {
            height: auto;
            min-height: 100%;
            overflow: visible;
        }

        & :global(.codeflask__code) {
            font: inherit;
        }

        & :global(.codeflask__lines) {
            padding: var(--code-padding) 8px;
            width: var(--code-gutter);
            font: 12px/var(--code-line-height) var(--code-font);
            color: var(--muted);
            pointer-events: none;
        }

        & :global(.token.comment) {
            color: #8292a8;
        }

        & :global(.token.keyword) {
            color: #c6a0f6;
        }

        & :global(.token.string), & :global(.token.template-string) {
            color: #b1f176;
        }

        & :global(.token.number), & :global(.token.boolean) {
            color: #f0b67f;
        }

        & :global(.token.function) {
            color: #8ccaff;
        }

        & :global(.token.operator), & :global(.token.punctuation) {
            color: #c7d1df;
        }

        & :global(.token.regex) {
            color: #f1d18a;
        }
    }
</style>
