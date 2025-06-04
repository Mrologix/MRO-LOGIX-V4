"use client";

import { useState, useEffect, useRef} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, Send, User as UserIcon } from "lucide-react";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import AIChatHeader from "./ai-chat-header";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  message: z.string().min(1, "Please enter a message"),
});

type FormData = z.infer<typeof formSchema>;

type Message = {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
};

export default function AIChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    const message = form.getValues("message").trim();
    if (!message) return;

    try {
      setIsLoading(true);

      const userMessage: Message = { role: "user", content: message };
      const updated = [...messages, userMessage];
      setMessages(updated);

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to get response");

      if (json.success && json.data) {
        const assistantMessage: Message = { role: "assistant" as const, content: json.data.content, isTyping: true };
        setMessages([...updated, assistantMessage]);
        
        // Start typing effect
        let currentText = "";
        const fullText = json.data.content;
        const textArray = fullText.split("");
        let currentIndex = 0;

        const typingInterval = setInterval(() => {
          if (currentIndex < textArray.length) {
            currentText += textArray[currentIndex];
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: currentText
              };
              return newMessages;
            });
            currentIndex++;
          } else {
            clearInterval(typingInterval);
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                isTyping: false
              };
              return newMessages;
            });
          }
        }, 8); // Adjust typing speed here (milliseconds)
      }
      form.reset();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 pt-4">
      {/* Main chat card */}
      <Card className="flex flex-col h-[85vh] bg-gradient-to-r from-purple-500 to-blue-500 p-[1px] rounded-lg">
        <div className="flex flex-col h-full w-full bg-background rounded-lg">
        {/* Header */}
        <CardHeader className="border-b">
          <AIChatHeader />
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto space-y-6 py-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2 items-start",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {/* Assistant avatar */}
              {m.role === "assistant" && (
                <div className="shrink-0 rounded-full p-[2px] bg-muted">
                  <Bot size={18} className="text-[#06b6d4]" strokeWidth={1.5} />
                </div>
              )}

              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[75%] rounded-lg p-3 prose prose-sm dark:prose-invert",
                  m.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-gray-100"
                    : "bg-muted"
                )}
              >
                <>
                  <ReactMarkdown
                    components={{
                    a: ({ className, children, ...props }) => {
                      const href = props.href || "";
                      const isInternal =
                        href && (href.startsWith("/") || href.startsWith("#"));
                      if (isInternal) {
                        return (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "text-blue-600 dark:text-blue-400 underline underline-offset-2",
                              "hover:text-blue-700 dark:hover:text-blue-300",
                              className
                            )}
                          >
                            {children}
                          </Link>
                        );
                      }
                      return (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "text-blue-600 dark:text-blue-400 underline underline-offset-2",
                            "hover:text-blue-700 dark:hover:text-blue-300",
                            className
                          )}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                  >
                    {m.content}
                  </ReactMarkdown>
                  {m.isTyping && (
                    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
                  )}
                </>
              </div>

              {/* User avatar */}
              {m.role === "user" && (
                <div className="shrink-0 rounded-full p-[2px] bg-primary text-primary-foreground">
                  <UserIcon size={18} strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </CardContent>

        {/* Input */}
        <CardFooter className="border-t">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="w-full flex gap-2">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea
                        placeholder="Type your message … (Enter to send)"
                        className="min-h-[56px] max-h-[120px] resize-none"
                        disabled={isLoading}
                        onKeyDown={handleKeyDown}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading}
                className="h-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Form>
        </CardFooter>
        </div>
      </Card>
    </div>
  );
}
