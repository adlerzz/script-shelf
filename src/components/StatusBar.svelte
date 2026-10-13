<script lang="ts">
    let { message, failed = false, compact = false, caption = "" }: { message: string; failed?: boolean; compact?: boolean; caption?: string } = $props();
    const { version } = chrome.runtime.getManifest();
</script>

<footer class:compact>
    <div>ver. {version}</div>
    <div id="status" class="status" class:error={failed} role="status" aria-live="polite">{message}</div>
    {#if caption}
        <span class="caption">{caption}</span>
    {/if}
</footer>

<style>
    footer {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;

        &:not(.compact) {
            gap: 20px;
            padding: 8px 28px;
            @media (max-width: 560px) {
                & .caption {
                    display: none;
                }
            }
        }

        &.compact {
            padding: 8px 16px;
            min-height: 36px;
            /*max-height: 160px;*/
            overflow: auto;
        }
    }

    .status {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .error {
        color: var(--danger);
    }
</style>
