import "@/index.css";

import { mountWidget, useLayout } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function HelloWorld() {
  const { input, output } = useToolInfo<"say_hello">();
  const { theme } = useLayout();
  const dark = theme === "dark";

  const name = output
    ? output.greeting.match(/Hello, (.+)!/)?.[1] ?? "there"
    : (input?.name ?? "there");

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${dark ? "bg-gray-950" : "bg-gradient-to-br from-indigo-50 to-blue-100"}`}>
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5 ${dark ? "bg-gray-900" : "bg-white"}`}>

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-lg text-3xl select-none">
          👋
        </div>

        <div className="text-center">
          <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
            Hello, <span className="text-indigo-500">{name}</span>!
          </h1>
          {output && (
            <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {output.greeting}
            </p>
          )}
        </div>

        <div className={`w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${dark ? "bg-gray-800 text-gray-400" : "bg-indigo-50 text-indigo-600"}`}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          Powered by Skybridge MCP
        </div>
      </div>
    </div>
  );
}

export default HelloWorld;

mountWidget(<HelloWorld />);
