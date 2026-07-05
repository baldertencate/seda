export type Instrument =
  | 'piano'
  | 'flute'
  | 'setar'
  | 'violin'
  | 'cello'
  | 'trumpet'
  | 'clarinet'
  | 'trombone'

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: 'Piano',
  flute: 'Flute',
  setar: 'Setar',
  violin: 'Violin',
  cello: 'Cello',
  trumpet: 'Trumpet',
  clarinet: 'Clarinet',
  trombone: 'Trombone',
}

export const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[]
