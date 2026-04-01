import type { ChatCompletionTool } from "openai/resources/index.js";
import { config } from "../config.js";

// Tool Registry
export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Gets the current time and date",
      parameters: {
        type: "object",
        properties: {}, // No params needed
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Gets the current weather for a given city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "The name of the city, e.g. London, Tokyo" }
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_internet",
      description: "Searches the internet for current information. Use this whenever you need to look up facts, news, or updated data that you don't know.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query to look up" }
        },
        required: ["query"],
      },
    },
  }
];

// Tool Executor
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_current_time":
      return new Date().toISOString();
      
    case "get_weather":
      try {
        const { city } = args;
        // 1. Get coordinates via open-meteo geocoding
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
          return `No coordinates found for city: ${city}`;
        }
        
        const { latitude, longitude, name: resolvedName, country } = geoData.results[0];
        
        // 2. Get weather via open-meteo weather API
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        if (!weatherData.current) {
          return `Failed to fetch weather data for ${resolvedName}, ${country}`;
        }
        
        return JSON.stringify({
          location: `${resolvedName}, ${country}`,
          temperature_celsius: weatherData.current.temperature_2m,
          wind_speed: weatherData.current.wind_speed_10m,
          time: weatherData.current.time,
        });
      } catch (e: any) {
        console.error("Weather tool error:", e);
        return `Error fetching weather: ${e.message}`;
      }

    case "search_internet":
      try {
        const { query } = args;
        if (!config.TAVILY_API_KEY) {
          return "Error: TAVILY_API_KEY is missing. No se pudo conectar a internet. Dile al usuario que debe añadir el API Key de Tavily a sus variables de entorno.";
        }
        
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: config.TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 3
          })
        });
        
        const tavilyData = await tavilyRes.json();
        if (tavilyData.answer) {
          return JSON.stringify({ summary: tavilyData.answer, results: tavilyData.results });
        }
        return JSON.stringify(tavilyData.results || tavilyData);
      } catch (e: any) {
        console.error("Search tool error:", e);
        return `Error searching the web: ${e.message}`;
      }

    default:
      console.warn(`Unknown tool called: ${name}`);
      return `Error: Unknown tool ${name}`;
  }
}
