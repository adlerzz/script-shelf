// Public API used by CodeEditor; CodeFlask 1.4.1 does not ship declarations.
declare module "codeflask" {
    interface CodeFlaskOptions {
        language: string;
        defaultTheme?: boolean;
        lineNumbers?: boolean;
        tabSize?: number;
        areaId?: string;
        readonly?: boolean;
        handleTabs?: boolean;
        handleSelfClosingCharacters?: boolean;
        handleNewLineIndentation?: boolean;
    }

    export default class CodeFlask {
        constructor (element: HTMLElement, options: CodeFlaskOptions);
        onUpdate (callback: (code: string) => void): void;
        updateCode (code: string): void;
        getCode (): string;
        enableReadonlyMode (): void;
        disableReadonlyMode (): void;
    }
}
