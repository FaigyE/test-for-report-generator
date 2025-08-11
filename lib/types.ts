export interface CustomerInfo {
  customerName: string
  propertyName: string
  address: string
  city: string
  state: string
  zip: string
  date: string
  unitType?: string
}

export interface InstallationData {
  Unit: string
  "Shower Head": string
  "Bathroom aerator": string
  "Kitchen Aerator": string
  "Leak Issue Kitchen Faucet": string
  "Leak Issue Bath Faucet": string
  "Tub Spout/Diverter Leak Issue": string
  Notes: string
  [key: string]: string | undefined
}

export interface Note {
  unit: string
  note: string
}
