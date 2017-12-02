export interface Descriptor {
  grit?: Grit,
  main: string,
  title: string,
}

export interface Grit {
  atInits?: string[],
  staticSize: number,
  tableSize: number,
}
