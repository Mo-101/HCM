const CATEGORY_IMAGE_MAP: Record<string, string> = {
  "emergency health kits": "/placeholder.svg?height=600&width=800&query=Emergency%20Health%20Kit",
  pharmaceuticals: "/placeholder.svg?height=600&width=800&query=Pharmaceutical%20Supplies",
  "biomedical equipment": "/placeholder.svg?height=600&width=800&query=Biomedical%20Equipment",
  "cold chain equipment": "/placeholder.svg?height=600&width=800&query=Cold%20Chain%20Equipment",
  ppe: "/placeholder.svg?height=600&width=800&query=Personal%20Protective%20Equipment",
  vehicles: "/placeholder.svg?height=600&width=800&query=Emergency%20Response%20Vehicle",
  default: "/placeholder.svg?height=600&width=800&query=WHO%20Emergency%20Supply",
}

function normalize(value?: string): string {
  return (value || "").trim().toLowerCase()
}

function toPlaceholder(query: string): string {
  return `/placeholder.svg?height=600&width=800&query=${encodeURIComponent(query)}`
}

export function getCategoryImage(category?: string): string {
  const normalizedCategory = normalize(category)
  if (!normalizedCategory) {
    return CATEGORY_IMAGE_MAP.default
  }

  return CATEGORY_IMAGE_MAP[normalizedCategory] || toPlaceholder(category || "WHO Emergency Supply")
}

export function getRealItemImage(item?: { name?: string; description?: string; category?: string } | null): string {
  if (!item) {
    return CATEGORY_IMAGE_MAP.default
  }

  if (item.name) {
    return toPlaceholder(item.name)
  }

  if (item.description) {
    return toPlaceholder(item.description)
  }

  return getCategoryImage(item.category)
}
