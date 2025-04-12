import React, { useState } from 'react';
import './App.css'; // Optional styling

const LAMBDA_URL = "https://ivhhr4zky7nc72i6eebo7nspbe0zcawb.lambda-url.us-east-1.on.aws/";

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [userId, setUserId] = useState("");

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        try {
            const response = await fetch(LAMBDA_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_prompt: input, user_id: userId })
            });

            const data = await response.json();
            const botMessage = { role: "bot", content: data.ai_reply };

            setMessages((prev) => [...prev, botMessage]);
            setUserId(data.user_id);
            console.log("User ID:", data.user_id);
        } catch (error) {
            console.error("Error communicating with Lambda:", error);
            const errorMessage = { role: "bot", content: "Sorry, something went wrong." };
            setMessages((prev) => [...prev, errorMessage]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") sendMessage();
    };

    return (
        <div className="chat-container">
            <h2>Chatbot</h2>
            <div className="chat-box">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                        <strong>{msg.role === "user" ? "You" : "Bot"}:</strong> {msg.content}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                placeholder="Type your message..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default App;
