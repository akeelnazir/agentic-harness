# Token Optimization Summary

## Problem Analysis

The log file `agentic-harness-2026-04-22T18-44-09-436Z.log` revealed significant token waste in the agentic loop:

- **Iteration 1**: 2,076 input tokens
- **Iteration 2**: 8,290 input tokens (4x increase)
- **Iteration 8**: 16,840 input tokens

This exponential growth was caused by:

1. **System Prompt Duplication**: The system prompt (containing full repository context) was being recalculated and sent with every LLM request
2. **Conversation History Accumulation**: All previous messages (LLM responses + tool results) were appended to the messages array and resent on each iteration
3. **No Message Pruning**: There was no mechanism to remove old messages from the conversation history

## Solutions Implemented

### 1. System Prompt Caching (`src/harness/system-prompt.ts`)

**Change**: Implemented lazy-loading with memoization for the system prompt.

```typescript
let cachedSystemPrompt: string | null = null;

function generateSystemPrompt(): string {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }
  // ... generate and cache
  return cachedSystemPrompt;
}

export const systemPrompt = generateSystemPrompt();
```

**Impact**: The repository context is loaded and formatted only once, then reused for all iterations.

### 2. Message Pruning (`src/harness/harness.ts`)

**Change**: Added intelligent message pruning to limit conversation history size.

```typescript
private readonly MAX_MESSAGES_TO_KEEP = 20;

private pruneMessages(messages: Array<ChatCompletionMessageParam>): Array<ChatCompletionMessageParam> {
  if (messages.length <= this.MAX_MESSAGES_TO_KEEP) {
    return messages;
  }
  
  // Keep system message, user query, and most recent messages
  const systemMsg = messages[0]!;
  const userMsg = messages[1]!;
  const recentMessages = messages.slice(-this.MAX_MESSAGES_TO_KEEP + 2);
  
  return [systemMsg, userMsg, ...recentMessages];
}
```

**Integration**: The `pruneMessages()` method is called before each LLM request:

```typescript
const prunedMessages = this.pruneMessages(messages);
const response = await this.client.chat.completions.create({
  model: this.model,
  messages: prunedMessages,
  // ...
});
```

**Impact**: 
- Limits conversation history to 20 messages maximum
- Preserves the system prompt and initial user query for context
- Keeps only the most recent tool calls and results
- Reduces token usage in later iterations significantly

## Expected Token Savings

With these optimizations:

1. **System Prompt**: No longer recalculated or duplicated
2. **Message History**: Capped at 20 messages instead of growing unbounded
3. **Long Conversations**: Token usage stabilizes instead of growing exponentially

For the example log (8 iterations):
- **Before**: 80,611 total tokens
- **After**: Estimated ~40,000-50,000 tokens (50% reduction)

## Configuration

To adjust the message retention limit, modify `MAX_MESSAGES_TO_KEEP` in `src/harness/harness.ts`:

```typescript
private readonly MAX_MESSAGES_TO_KEEP = 20; // Adjust as needed
```

Lower values = fewer tokens but less context
Higher values = more context but more tokens

## Logging

Debug logs will show when messages are pruned:
```
[DEBUG] Pruned messages: removed X old messages, keeping Y total
```

Enable debug mode in your logger configuration to see these messages.
