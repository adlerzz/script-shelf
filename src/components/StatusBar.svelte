<script lang="ts">
    let { message, failed = false, compact = false, caption = "" }: { message: string; failed?: boolean; compact?: boolean; caption?: string } = $props();
</script>

<footer class:compact>
    <div id="status" class="status" class:error={failed} role="status" aria-live="polite">{message}</div>
    {#if caption}
        <span class="caption">{caption}</span>
    {/if}
</footer>

<style>
    footer:not(.compact) {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        padding: 12px 28px;
        border-top: 1px solid var(--line);
        font-size: 12px;
        color: var(--muted);

        @media (max-width: 560px) {
            & .caption {
                display: none;
            }
        }
    }

    .status {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .error {
        color: var(--danger);
    }

    footer.compact {
        padding: 12px 16px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;
        max-height: 160px;
        overflow: auto;
    }
</style>
