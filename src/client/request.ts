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

export function accessServer(host: string, port: number): PromiseFormAccess {

    /**
     * Access class for accessing rest API form access
     */
    class PromiseFileFormAccess implements PromiseFormAccess {
        url: string;

        constructor(host: string, port: number) {
            this.url = "http://" + host + ":" + port;
        }

        /** 
         * Connects to REST server specified and returns a list of all form description names.
         */
        async listAllForms(): Promise<string[]> {
            const res: Response = await fetch(this.url + "/forms");

            let result: Promise<string[]>
            if (res.ok) {
                if (res.body !== undefined && res.body !== null) {
                    return res.json();
                } else{
                    return Promise.reject("body not defined in response");
                }
            } else{
                return Promise.reject(res.statusText);
            }

        }
        
        /** 
         * Connest to REST server specified and return the structure of the named form, or
         * undefined if there is no such form.
         * @param name name of form
         * @return form description (if the name is valid) or undefined (otherwise)
         */
        async getForm(name: string): Promise<FormDescription | undefined> {
            const res: Response = await fetch((this.url + "/forms/" + encodeURIComponent(name)));
            //This one we just want to return undefined if nothing occurs
            if (res.ok) {
                if (res.body !== undefined && res.body !== null) {
                    return res.json();
                }
            }
        }

        /**
         * Connect to the REST server specified and do the following:  
         * Create a new instance of a form with given contents.
         * If the name doesn't match a form, undefined is returned.
         * If the number of slot contents doesn't match, undefined is returned.
         * If the system is overloaded, it may return undefined
         * rather than create a new instance.
         * @param name name of form
         * @param contents values for the slots.
         * @return unique id of created form or undefined if error
         */
        async create(name: string, contents: string[]): Promise<string | undefined>{
            const res: Response = await fetch(this.url + "/instances/", {
                method: "POST",
                headers: {'Content-Type' : 'application/json'},
                body: JSON.stringify({"form": JSON.stringify(name), "contents": JSON.stringify(contents)})
            });
            //This one we just want to return undefined if nothing occurs
            if (res.ok) {
                return (res.text());
            }
        }

    }

    return new PromiseFileFormAccess(host, port);
    // TODO: return an instance of the class
}


