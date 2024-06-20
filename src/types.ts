export interface Partition {
    name: string;
    type: string;
    subtype: string;
    size: number;
    offset: number;
    flags:string;
    newsize:number;
  }

 export  interface PartitionSet {
    name: string;
    partitions: Partition[];
  }