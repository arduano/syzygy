import { ChatOpenAI } from "@langchain/openai";
import { ChatCompletionChunk, ChatCompletionMessage, ChatCompletion } from "openai/resources/index.mjs";

export class ChatDeepSeek extends ChatOpenAI {
  protected override _convertOpenAIDeltaToBaseMessageChunk(
    delta: Record<string, any>,
    rawResponse: ChatCompletionChunk,
    defaultRole?:
      | "function"
      | "user"
      | "system"
      | "developer"
      | "assistant"
      | "tool"
  ) {
    const messageChunk = super._convertOpenAIDeltaToBaseMessageChunk(
      delta,
      rawResponse,
      defaultRole
    );
    messageChunk.additional_kwargs.reasoning_content = delta.reasoning_content;
    return messageChunk;
  }

  protected override _convertOpenAIChatCompletionMessageToBaseMessage(
    message: ChatCompletionMessage,
    rawResponse: ChatCompletion
  ) {
    const langChainMessage =
      super._convertOpenAIChatCompletionMessageToBaseMessage(
        message,
        rawResponse
      );
    langChainMessage.additional_kwargs.reasoning_content = (
      message as any
    ).reasoning_content;
    return langChainMessage;
  }
}
