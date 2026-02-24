
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

const DavidChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: "Hello! I'm David, your Faithhouse Ministry Assistant. How can I help you navigate the system today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("Gemini API Key is not configured in the environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-flash-latest";
      
      const systemInstruction = `
        You are David, an AI assistant for the Faithhouse Chapel International Church Management System (CMS).
        Your goal is to help church administrators, pastors, and ministry heads use the application effectively.
        
        App Context:
        - Dashboard: Overview of church growth, tasks, and upcoming programs.
        - Members: Registry of all church members, import/export, and profile management.
        - Attendance: Tracking attendance for services (Prophetic Word, Help from Above, etc.).
        - Ministries: Specialized modules for Music, Media, Prayer, Ushering, Evangelism, and Children's ministries.
        - Finance: Treasury management, revenue tracking (Tithes, Offerings), and expenditure auditing.
        - Events: Scheduling and auto-generating recurring services.
        - WhatsApp Hub: Automated outreach and communication via WhatsApp.
        - Recurring Tasks: Operational checklists for various services.
        
        Tone:
        - Professional, helpful, and efficient.
        - Respectful and spiritual (Faithhouse is a Christian church).
        - Use "we" when referring to the church or the system.
        
        Guidance:
        - If asked how to do something, provide step-by-step instructions based on the modules listed.
        - If asked about financial reports, mention the "Generate Report" feature in the Finance module.
        - If asked about Music Ministry, mention the Performance Tracker and Song Repository.
      `;

      // Filter out the initial greeting from the history as contents must start with a user message
      const chatHistory = messages
        .filter((m, index) => !(index === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          ...chatHistory,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const aiText = response.text || "I apologize, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error: any) {
      console.error("David Chat Error:", error);
      const errorMessage = error.message?.includes("API Key") 
        ? "I'm sorry, but my connection to the AI service is not configured. Please check the GEMINI_API_KEY environment variable."
        : "I encountered an error while processing your request. Please ensure the system is fully connected.";
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-fh-green text-fh-gold flex items-center justify-between border-b border-black/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-fh-gold/20 rounded-xl flex items-center justify-center border border-fh-gold/30">
                  <Bot className="w-6 h-6 text-fh-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">David</h3>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Ministry Assistant AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
            >
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-fh-gold text-fh-green' : 'bg-fh-green text-fh-gold'}`}>
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-fh-gold text-fh-green rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{m.text}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-fh-green text-fh-gold rounded-lg flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask David for guidance..."
                  className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-fh-gold transition-all text-xs font-bold text-slate-800 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-3 bg-fh-green text-fh-gold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
          isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-fh-green text-fh-gold'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : (
          <div className="relative">
            <MessageSquare className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-fh-gold rounded-full border-2 border-fh-green flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-fh-green" />
            </div>
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default DavidChatbot;
