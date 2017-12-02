export interface Descriptor {
  grit?: Grit,
  main: string,
  title: string,
}

export interface Grit {
  atInits?: string[],
  staticBump: number,
  tableSize: number,
}
