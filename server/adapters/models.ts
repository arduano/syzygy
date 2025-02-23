import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const openAiApiBase = Deno.env.get("OPENAI_API_BASE");

const baseChatModelName = Deno.env.get("BASE_CHAT_MODEL_NAME");
const expertChatModelName = Deno.env.get("EXPERT_CHAT_MODEL_NAME");

const azureOpenAiApiKey = Deno.env.get("AZURE_OPENAI_API_KEY");

function getBaseChatModel() {
  if (openAiApiKey) {
    console.log(
      `Using OpenAI API key for base chat model, model name: ${baseChatModelName}, base url: ${
        openAiApiBase ?? "default"
      }`
    );
    return new ChatOpenAI({
      model: baseChatModelName,
      configuration: {
        baseURL: openAiApiBase,
      },
    });
  }

  if (azureOpenAiApiKey) {
    console.log(
      `Using Azure OpenAI API key for base chat model, model name: ${baseChatModelName}`
    );
    return new AzureChatOpenAI({
      model: baseChatModelName,
      deploymentName: baseChatModelName,
    });
  }

  throw new Error("No base chat model configured");
}

function getExpertChatModel() {
  if (openAiApiKey) {
    console.log(
      `Using OpenAI API key for base chat model, model name: ${expertChatModelName}, base url: ${
        openAiApiBase ?? "default"
      }`
    );
    return new ChatOpenAI({
      model: expertChatModelName,
      configuration: {
        baseURL: openAiApiBase,
      },
    });
  }

  if (azureOpenAiApiKey) {
    console.log(
      `Using Azure OpenAI API key for base chat model, model name: ${expertChatModelName}`
    );
    return new AzureChatOpenAI({
      model: expertChatModelName,
      deploymentName: expertChatModelName,
    });
  }

  throw new Error("No expert chat model configured");
}

export const baseChatModel = getBaseChatModel();
export const expertChatModel = getExpertChatModel();
