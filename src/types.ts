export interface Partition {
    name: string;
    type: string;
    subtype: string;
    size: number;
    offset: number;
    flags:string;
  }

 export  interface PartitionSet {
    name: string;
    partitions: Partition[];
  }