const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

async function requestAI(messages: Array<{ role: string; content: string }>, maxTokens = 800): Promise<string> {
  const token = localStorage.getItem("hcoms_token")
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages,
      options: {
        maxTokens,
        temperature: 0.3,
      },
    }),
  })

  const payload = await response.json()

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Failed to generate AI response")
  }

  return payload.data?.choices?.[0]?.message?.content || ""
}

export async function generateItemExplanation(item: any, question: string): Promise<string> {
  try {
    return await requestAI(
      [
        {
          role: "system",
          content:
            "You are a WHO emergency response equipment expert. Give practical, accurate, field-oriented guidance with safety and logistics considerations.",
        },
        {
          role: "user",
          content: `Equipment: ${item.name}
Category: ${item.category}
Description: ${item.description || "No description available"}
Specifications: ${item.specifications ? JSON.stringify(item.specifications) : "No specifications available"}

Question: ${question}
`,
        },
      ],
      700,
    )
  } catch (error) {
    console.error("Error generating item explanation:", error)
    throw new Error("Failed to generate explanation")
  }
}

export async function generateCategoryOverview(category: string, items: any[]): Promise<string> {
  try {
    return await requestAI(
      [
        {
          role: "system",
          content:
            "You are a WHO emergency response equipment expert. Provide practical category-level overviews for emergency operations staff.",
        },
        {
          role: "user",
          content: `Category: ${category}
Number of items: ${items.length}
Sample items: ${items
            .slice(0, 5)
            .map((item) => item.name)
            .join(", ")}
`,
        },
      ],
      700,
    )
  } catch (error) {
    console.error("Error generating category overview:", error)
    throw new Error("Failed to generate category overview")
  }
}
