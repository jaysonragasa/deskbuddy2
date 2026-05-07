export async function handleToolCall(toolCall: any): Promise<any> {
  const { name, arguments: args } = toolCall.function;
  
  if (name === 'get_current_weather') {
    const { location } = args;
    const apiKey = JSON.parse(localStorage.getItem('mochiSettings') || '{}').openWeatherApiKey;
    if (!apiKey) {
      return { error: 'OpenWeather API Key is not configured in settings.' };
    }
    
    try {
      const gRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`);
      const gData = await gRes.json();
      if (!gData || gData.length === 0) return { error: 'Location not found' };
      
      const { lat, lon } = gData[0];
      const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
      const wData = await wRes.json();
      
      return {
        temperature: wData.main.temp,
        description: wData.weather[0].description,
        city: wData.name
      };
    } catch (e: any) {
      return { error: e.message || 'Failed to fetch weather' };
    }
  }

  if (name === 'register_face') {
    const { name: personName } = args;
    const event = new CustomEvent('MOCHI_REGISTER_FACE', { detail: { name: personName } });
    window.dispatchEvent(event);
    return { success: true, message: `Face registration started for ${personName}. Mochi might take a second to learn it!` };
  }

  return { error: 'Unknown tool call' };
}

export const MOCHI_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_current_weather",
      description: "Get the current weather for a specific city.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and country, e.g. San Francisco, US"
          }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "register_face",
      description: "Ask Mochi to register the currently visible face and associate it with a name.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the user to register."
          }
        },
        required: ["name"]
      }
    }
  }
];
