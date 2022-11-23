import { fixFormCompletion, fixFormDescription, FormAccess } from "../formdesc";

// The interface to implement:
export type Promisified<T> = {
    [K in keyof T]: T[K] extends (...args: any) => infer R ? 
        (...args: Parameters<T[K]>) => Promise<R> :
        T;
}

export type PromiseFormAccess = Promisified<FormAccess>;

// TODO: Define a class to do the work.
// It should be stateless: it should delegate all its work to the REST API
// using 'fetch'.  Do not cache any information.

export function accessServer(host : string, port : number) : PromiseFormAccess {
    // TODO: return an instance of the class
}

