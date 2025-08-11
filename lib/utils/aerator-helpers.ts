/**
 * Checks if a value indicates an aerator was installed
 * Handles both numeric values (1, 2) and text descriptions (male, female, insert)
 */
export const isAeratorInstalled = (value: string) => {
  if (!value) return false
  if (value === "1" || value === "2") return true

  // Check for text values that indicate installation
  const lowerValue = value.toLowerCase()
  return (
    lowerValue.includes("male") ||
    lowerValue.includes("female") ||
    lowerValue.includes("insert") ||
    lowerValue.includes("gpm") ||
    lowerValue.includes("aerator")
  )
}

/**
 * Gets a standardized description for an aerator based on its value
 * @param value The raw value from the data
 * @param type The type of aerator (kitchen, bathroom, shower)
 * @returns A standardized description string
 */
export const getAeratorDescription = (value: string, type: string) => {
  if (!value) return "No Touch."

  if (value === "1") return type === "shower" ? "1.75 GPM" : "1.0 GPM"
  if (value === "2") return type === "shower" ? "1.75 GPM" : "1.0 GPM"

  // If it's a text value that indicates installation
  if (isAeratorInstalled(value)) {
    // If the text already includes GPM, use it as is
    if (value.toLowerCase().includes("gpm")) return value

    // For specific text descriptions, return standard GPM value
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes("male") || lowerValue.includes("female") || lowerValue.includes("insert")) {
      return type === "shower" ? "1.75 GPM" : "1.0 GPM"
    }

    // For other descriptions that indicate installation
    return type === "shower" ? "1.75 GPM" : "1.0 GPM"
  }

  return "No Touch."
}

/**
 * Formats a note with proper sentence case
 * @param note The note to format
 * @returns The formatted note
 */
export const formatNote = (note: string): string => {
  if (!note) return ""

  // Split by periods to handle multiple sentences
  const sentences = note.split(".")

  return (
    sentences
      .map((sentence) => {
        const trimmed = sentence.trim()
        if (!trimmed) return ""

        // Capitalize first letter, lowercase the rest
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      })
      .filter((s) => s) // Remove empty strings
      .join(". ") + (note.endsWith(".") ? "." : "")
  ) // Add final period if original had one
}
