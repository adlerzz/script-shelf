<script lang="ts">
    import { isInputElement } from "../guards";
    import { MAX_NAME_LENGTH, MAX_ICON_TEXT_LENGTH } from "../constants/values";
    import type { MoveDirection } from "../models/common.model";
    import { descendants, MOVE_DIRECTION } from "../models/common.model";
    import { folderPath } from "../ui";
    import ItemIcon from "./ItemIcon.svelte";
    import CodeEditor from "./CodeEditor.svelte";
    import { isFolder, isScript, type Item } from "../models/item.model";

    interface Props {
        draft: Item;
        items: Item[];
        dirty: boolean;
        saving: boolean;
        onchange: () => void;
        onsave: () => void;
        onduplicate: () => void;
        ondelete: () => void;
        onreorder: (direction: MoveDirection) => void;
        onupload: () => void;
    }

    let { draft = $bindable(), items, dirty, saving, onchange, onsave, onduplicate, ondelete, onreorder, onupload }: Props = $props();
    const excluded = $derived(isFolder(draft) ? descendants(items, draft.id) : new Set([draft.id]));
    const folders = $derived(items.filter(item => isFolder(item) && !excluded.has(item.id)));
    let nameInput = $state<HTMLInputElement>();
    let focusedId = "";

    $effect(() => {
        if (nameInput && draft.id !== focusedId) {
            focusedId = draft.id;
            nameInput.focus();
            nameInput.select();
        }
    });

    function setIcon (event: Event): void {
        if (!isInputElement(event.currentTarget)) {
            return;
        }
        draft.icon = event.currentTarget.value;
        onchange();
    }

</script>

<form id="edit-form" onsubmit={event => {
    event.preventDefault(); onsave();
}} oninput={onchange} onchange={onchange}>
    <fieldset disabled={saving}>
        <div class="editor-heading">
            <h2 id="editor-title">{isFolder(draft) ? "Папка" : "Скрипт"}</h2>
            <span id="dirty" class="badge" class:unsaved={dirty}>{dirty ? "Не сохранено" : "Сохранено"}</span>
        </div>
        <div class="fields">
            <label>Название
                <input id="name" bind:this={nameInput} bind:value={draft.name} maxlength={MAX_NAME_LENGTH} required autocomplete="off" />
            </label>
            <label class="dropdown-wrapper">Папка
                <select id="parent" bind:value={draft.parentId}>
                    <option value={null}>Корень</option>
                    {#each folders as folder (folder.id)}
                        <option value={folder.id}>{folderPath(items, folder.id)}</option>
                    {/each}
                </select>
            </label>
            <div class="icon-field">
                <label for="icon">Иконка</label>
                <div class="icon-controls">
                    <input
                        id="icon"
                        value={draft.icon.startsWith("data:") ? "" : draft.icon}
                        oninput={setIcon}
                        placeholder="⚡"
                        maxlength={MAX_ICON_TEXT_LENGTH}
                        aria-label="Эмодзи или текст иконки"
                    />
                    <button id="upload-icon" type="button" onclick={onupload}>Изображение…</button>
                    <button
                        id="clear-icon"
                        type="button"
                        title="Сбросить иконку"
                        onclick={() => {
                            draft.icon = ""; onchange();
                        }}
                    >×</button>
                    <span id="icon-preview"><ItemIcon item={draft} /></span>
                </div>
            </div>
        </div>
        {#if isScript(draft)}
            <div id="code-section">
                <div class="code-heading">
                    <label for="code">JAVASCRIPT</label>
                    <span>без javascript: · await и return доступны</span>
                </div>
                <CodeEditor
                    value={draft.code}
                    disabled={saving}
                    onchange={code => {
                        if (isScript(draft)) {
                            draft.code = code;
                            onchange();
                        }
                    }}
                />
                <p class="hint">Запуск — через иконку расширения на нужной вкладке. Доступны document, window и переменные страницы. Ctrl+S — сохранить.</p>
            </div>
        {/if}
        <div class="editor-actions">
            <button id="save" class="primary" type="submit">Сохранить</button>
            <button id="duplicate" type="button" disabled={isFolder(draft)} onclick={onduplicate}>Дублировать</button>
            <button id="up" type="button" title="Выше" onclick={() => onreorder(MOVE_DIRECTION.UP)}>↑</button>
            <button id="down" type="button" title="Ниже" onclick={() => onreorder(MOVE_DIRECTION.DOWN)}>↓</button>
            <button id="delete" class="danger" type="button" onclick={ondelete}>Удалить</button>
        </div>
    </fieldset>
</form>

<style>
    .editor-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .badge {
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 12px;
        color: var(--muted);
    }

    .unsaved {
        color: var(--accent);
        border-color: #536e3f;
    }

    .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;

        & > .icon-field {
            grid-column: 1/-1;
        }

        @media (max-width: 800px) {
            grid-template-columns: 1fr;
        }
    }

    label {
        display: block;
        color: var(--muted);
        font-size: 12px;

        & input, & select {
            display: block;
            margin-top: 7px;
            color: var(--text);
            font-size: 14px;
        }

        &.dropdown-wrapper {
            display: inline-block;
            width: 250px;
            position: relative;

            select {
                appearance: none;
            }

            &::after {
                content: "\23F7";
                color: white;
                font-size: 20px;
                line-height: 16px;
                position: absolute;
                width: 16px;
                height: 16px;
                top: 38px;
                right: 17px;
                pointer-events: none;
            }
        }
    }

    .icon-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 7px;

        & input {
            margin: 0;
            width: 110px;
        }
    }

    .code-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 0 10px;
        gap: 10px;

        & label {
            letter-spacing: 1.5px;
        }

        & span {
            font-size: 11px;
            color: var(--muted);
        }

        @media (max-width: 560px) {
            & span {
                display: none;
            }
        }
    }

    .hint {
        font-size: 12px;
        color: var(--muted);
        margin: 8px 0 12px;
    }

    .editor-actions {
        display: flex;
        gap: 8px;
        align-items: center;

        & .danger {
            margin-left: auto;
        }

        @media (max-width: 560px) {
            flex-wrap: wrap;
        }
    }

    fieldset {
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
    }
</style>
