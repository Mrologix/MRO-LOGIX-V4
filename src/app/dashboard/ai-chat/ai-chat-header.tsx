"use client";

import React from "react";
import { Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const AIChatHeader = () => {
  return (
    <Card className="w-full bg-gradient-to-r from-purple-500 to-blue-500 p-[1px] rounded-lg">
        <div className="w-full h-full bg-background rounded-lg">
      <header className="h-16 flex items-center justify-between px-4">
        {/* Title + badge */}
        <div className="flex items-center gap-3">
          <Users size={24} strokeWidth={1.5} className="text-[#06b6d4]" />
          <h1 className="text-2xl font-bold leading-none underline">Chat Assistant</h1>
          <div className="relative w-4 h-4">
            <div className="absolute w-4 h-4 bg-green-500 rounded-full animate-[livePulse_2s_ease-in-out_infinite]"></div>
          </div>
        </div>

        {/* Meta line */}
        <div className="flex items-center gap-2 text-sm text-black">
          <Sparkles size={18} strokeWidth={1.5} className="text-[#06b6d4]" />
          <span>Powered by OpenAI</span>
        </div>
      </header>
        </div>
    </Card>
  );
};

export default AIChatHeader;
