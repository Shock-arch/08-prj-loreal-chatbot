/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// The worker endpoint will forward the request to the OpenAI Chat Completions API.
const workerUrl = "https://loreal-chatbot.your-subdomain.workers.dev/";

// Keep track of the conversation so the bot can respond with context.
const conversationMessages = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal product advisor. Answer only questions about L'Oréal products, skincare routines, haircare routines, beauty recommendations, and general beauty advice related to L'Oréal. If a user asks about unrelated topics, politely refuse and redirect them to beauty, skincare, haircare, or L'Oréal product questions. Keep responses clear, concise, friendly, and practical. Do not provide unsafe or misleading medical advice. If unsure, offer a helpful general recommendation based on L'Oréal products and typical beauty routines.",
  },
];

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

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  // Show the user's message in the chat window.
  addMessage(message, "user");
  userInput.value = "";
  scrollToBottom();

  // Show a temporary loading message.
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "msg ai";
  loadingMessage.textContent = "Thinking...";
  chatWindow.appendChild(loadingMessage);
  scrollToBottom();

  // Add the user's message to the conversation history.
  conversationMessages.push({ role: "user", content: message });

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationMessages }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Replace the loading message with the real reply.
    loadingMessage.textContent = reply;
    conversationMessages.push({ role: "assistant", content: reply });
  } catch (error) {
    loadingMessage.textContent =
      "Sorry, I could not reach the assistant right now.";
    console.error(error);
  }

  scrollToBottom();
});
