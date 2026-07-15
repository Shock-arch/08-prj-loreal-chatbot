/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const questionPreview = document.getElementById("questionPreview");
const questionText = document.getElementById("questionText");

// The worker endpoint will forward the request to the OpenAI Chat Completions API.
const workerUrl = "https://oreal-worker.cooldee811.workers.dev/";

// Keep track of the conversation so the bot can respond with context.
const systemPrompt = {
  role: "system",
  content:
    "You are a helpful L'Oréal product advisor. Answer only questions about L'Oréal products, skincare routines, haircare routines, beauty recommendations, and general beauty advice related to L'Oréal. If a user asks about unrelated topics, politely refuse and redirect them to beauty, skincare, haircare, or L'Oréal product questions. Keep responses clear, concise, friendly, and practical. Do not provide unsafe or misleading medical advice. If unsure, offer a helpful general recommendation based on L'Oréal products and typical beauty routines. Remember details the user shares such as their name, preferences, and earlier questions so the conversation feels natural across turns.",
};

const conversationMessages = [systemPrompt];
const userContext = {
  name: null,
  topics: [],
  preferences: [],
};

function saveConversationState() {
  localStorage.setItem(
    "lorealChatContext",
    JSON.stringify(conversationMessages),
  );
  localStorage.setItem("lorealUserContext", JSON.stringify(userContext));
}

function loadConversationState() {
  try {
    const savedMessages = localStorage.getItem("lorealChatContext");
    const savedContext = localStorage.getItem("lorealUserContext");

    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
        conversationMessages.splice(
          0,
          conversationMessages.length,
          ...parsedMessages,
        );
      }
    }

    if (savedContext) {
      const parsedContext = JSON.parse(savedContext);
      Object.assign(userContext, parsedContext);
    }
  } catch (error) {
    console.error("Unable to load saved chat context.", error);
  }
}

function updateContextFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  const nameMatch =
    message.match(/my name is ([a-zA-Z]+)/i) ||
    message.match(/i am ([a-zA-Z]+)/i) ||
    message.match(/call me ([a-zA-Z]+)/i);

  if (nameMatch && nameMatch[1]) {
    userContext.name = nameMatch[1];
  }

  if (lowerMessage.includes("skincare")) {
    if (!userContext.topics.includes("skincare")) {
      userContext.topics.push("skincare");
    }
  }

  if (lowerMessage.includes("hair")) {
    if (!userContext.topics.includes("haircare")) {
      userContext.topics.push("haircare");
    }
  }

  if (lowerMessage.includes("makeup")) {
    if (!userContext.topics.includes("makeup")) {
      userContext.topics.push("makeup");
    }
  }

  if (lowerMessage.includes("fragrance")) {
    if (!userContext.topics.includes("fragrance")) {
      userContext.topics.push("fragrance");
    }
  }
}

function buildContextPrompt() {
  const contextParts = [];

  if (userContext.name) {
    contextParts.push(`The user's name is ${userContext.name}.`);
  }

  if (userContext.topics.length > 0) {
    contextParts.push(
      `The user has asked about ${userContext.topics.join(", ")}.`,
    );
  }

  if (contextParts.length > 0) {
    return `Use the following conversation context naturally in your replies: ${contextParts.join(" ")}`;
  }

  return "Use the conversation history to keep the interaction natural and personalized.";
}

loadConversationState();

// Display a welcome message when the page loads.
const welcomeMessage = document.createElement("p");
welcomeMessage.className = "msg ai";
welcomeMessage.textContent = "👋 Hello! How can I help you today?";
chatWindow.appendChild(welcomeMessage);

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = `msg ${sender}`;
  message.textContent = text;
  chatWindow.appendChild(message);
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateQuestionPreview(text) {
  questionText.textContent = text;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  // Show the user's message in the chat window and update the preview.
  addMessage(message, "user");
  updateQuestionPreview(message);
  userInput.value = "";
  scrollToBottom();

  // Show a temporary loading message.
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "msg ai";
  loadingMessage.textContent = "Thinking...";
  chatWindow.appendChild(loadingMessage);
  scrollToBottom();

  // Add the user's message to the conversation history and update stored context.
  updateContextFromMessage(message);
  conversationMessages.push({ role: "user", content: message });

  const contextPrompt = {
    role: "system",
    content: buildContextPrompt(),
  };

  const messagesForApi = [
    systemPrompt,
    contextPrompt,
    ...conversationMessages.slice(1),
  ];

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messagesForApi }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Replace the loading message with the real reply.
    loadingMessage.textContent = reply;
    conversationMessages.push({ role: "assistant", content: reply });
    saveConversationState();
  } catch (error) {
    loadingMessage.textContent =
      "Sorry, I could not reach the assistant right now.";
    console.error(error);
  }

  scrollToBottom();
});
