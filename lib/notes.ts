import { InstallationData } from "./types"

// Compile notes for all units, including selected cells and columns
export function compileAllNotes({
  installationData,
  unitColumn,
  selectedCells = {},
  selectedNotesColumns = [],
}: {
  installationData: InstallationData[]
  unitColumn: string
  selectedCells?: Record<string, string[]>
  selectedNotesColumns?: string[]
}): Array<{ unit: string; note: string; [key: string]: any }> {
  return installationData.map((item) => {
    let notes = ""
    // Leak issues (same as before)
    if (item["Leak Issue Kitchen Faucet"]) {
      const leakValue = item["Leak Issue Kitchen Faucet"].trim().toLowerCase()
      if (leakValue === "light") notes += "Light leak from kitchen faucet. "
      else if (leakValue === "moderate") notes += "Moderate leak from kitchen faucet. "
      else if (leakValue === "heavy") notes += "Heavy leak from kitchen faucet. "
      else if (leakValue === "dripping" || leakValue === "driping") notes += "Dripping from kitchen faucet. "
      else notes += "Leak from kitchen faucet. "
    }
    if (item["Leak Issue Bath Faucet"]) {
      const leakValue = item["Leak Issue Bath Faucet"].trim().toLowerCase()
      if (leakValue === "light") notes += "Light leak from bathroom faucet. "
      else if (leakValue === "moderate") notes += "Moderate leak from bathroom faucet. "
      else if (leakValue === "heavy") notes += "Heavy leak from bathroom faucet. "
      else if (leakValue === "dripping" || leakValue === "driping") notes += "Dripping from bathroom faucet. "
      else notes += "Leak from bathroom faucet. "
    }
    if (item["Tub Spout/Diverter Leak Issue"]) {
      const leakValue = item["Tub Spout/Diverter Leak Issue"]
      if (leakValue === "Light") notes += "Light leak from tub spout/diverter. "
      else if (leakValue === "Moderate") notes += "Moderate leak from tub spout/diverter. "
      else if (leakValue === "Heavy") notes += "Heavy leak from tub spout/diverter. "
      else notes += "Leak from tub spout/diverter. "
    }
    // Add notes from selected columns
    if (selectedNotesColumns && selectedNotesColumns.length > 0) {
      selectedNotesColumns.forEach((col) => {
        const val = item[col]
        if (val && val.trim() !== "") notes += `${val}. `
      })
    }
    // Add notes from selected cells
    const unitValue = item[unitColumn] || item.Unit
    if (unitValue && selectedCells[unitValue]) {
      selectedCells[unitValue].forEach((cellInfo) => {
        notes += `${cellInfo}. `
      })
    }
    return {
      unit: unitValue,
      note: notes.trim(),
      ...item,
    }
  })
}

// Unified notes management functions
export function getStoredNotes(): Record<string, string> {
  if (typeof window === "undefined") return {}
  
  try {
    const stored = localStorage.getItem("unifiedNotes")
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("Error parsing stored unified notes:", error)
    return {}
  }
}

export function saveStoredNotes(notes: Record<string, string>): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("unifiedNotes", JSON.stringify(notes))
    // Dispatch a custom event to notify listeners that notes have changed
    window.dispatchEvent(new Event("unifiedNotesUpdated"))
  } catch (error) {
    console.error("Error saving unified notes:", error)
  }
}

export function updateStoredNote(unit: string, note: string): void {
  const existingNotes = getStoredNotes()
  const updatedNotes = { ...existingNotes, [unit]: note }
  saveStoredNotes(updatedNotes)
}

export function getUnifiedNotes({
  installationData,
  unitColumn,
  selectedCells = {},
  selectedNotesColumns = [],
}: {
  installationData: InstallationData[]
  unitColumn: string
  selectedCells?: Record<string, string[]>
  selectedNotesColumns?: string[]
}): Array<{ unit: string; note: string; [key: string]: any }> {
  // Get compiled notes from installation data
  const compiledNotes = compileAllNotes({
    installationData,
    unitColumn,
    selectedCells,
    selectedNotesColumns,
  })

  // Get manually edited notes from localStorage
  const storedNotes = getStoredNotes()

  // Merge compiled notes with manual edits
  return compiledNotes.map((item) => ({
    ...item,
    note: storedNotes[item.unit] !== undefined ? storedNotes[item.unit] : item.note,
  }))
}

export function getFinalNoteForUnit(
  unit: string,
  compiledNote: string
): string {
  const storedNotes = getStoredNotes()
  return storedNotes[unit] !== undefined ? storedNotes[unit] : compiledNote
}