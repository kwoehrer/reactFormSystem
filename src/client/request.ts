import { fixFormCompletion, fixFormDescription, FormAccess, FormCompletion, FormDescription } from "../formdesc";

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

    /**
     * Access class for accessing rest API form access
     */
    class FileFormAccess implements PromiseFormAccess {
        host : string;
        port : number;

        constructor(host : string, port : number){
            this.host = host;
            this.port = port;

        }

        /**
         * Helper method, creates options for rest helper
         * @param method The type of request (IE GET vs POST)
         * @param body JSON formatted body to be used as request to server
         * @returns a RequestInit object for use in fetch methods.
         */
        private configFetchOptions(method : string, body: {}): RequestInit{
            return {
                headers:{"Content-Type": "application/json"},
                method: method,
                body: JSON.stringify(body)
            }
        }

         /** 
          * Connects to REST server specified and returns a list of all form description names.
          */
        async listAllForms(): Promise<string[]>{
            const options = this.configFetchOptions("GET", {});
            const res: Response = await fetch(host + "/forms", options);
            if(res.status.b)
        }
        getForm: (name: string) => Promise<FormDescription | undefined>;
        create: (name: string, contents: string[]) => Promise<string | undefined>;
        getInstance: (id: string) => Promise<FormCompletion | undefined>;
        replace: (id: string, newContents: string[]) => Promise<boolean>;
        remove: (id: string) => Promise<boolean>;
        
    }
    // TODO: return an instance of the class
}


