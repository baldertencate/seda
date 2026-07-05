export type Instrument =
  | 'piano'
  | 'flute'
  | 'setar'
  | 'trumpet'
  | 'clarinet'
  | 'trombone'

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: 'Piano',
  flute: 'Flute',
  setar: 'Setar',
  trumpet: 'Trumpet',
  clarinet: 'Clarinet',
  trombone: 'Trombone',
}

export const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[]
