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
        static url: string;

        constructor(host: string, port: number) {
            PromiseFileFormAccess.url = "http://" + host + ":" + port;
            console.log("Creating server connection to " + PromiseFileFormAccess.url);
        }

        /** 
         * Connects to REST server specified and returns a list of all form description names.
         */
        async listAllForms(): Promise<string[]> {
            console.log(PromiseFileFormAccess.url);
            const res: Response = await fetch(PromiseFileFormAccess.url + "/forms");

            if (res.ok) {
                if (res.body !== undefined && res.body !== null) {
                    return res.json();
                } else {
                    return Promise.reject("body not defined in response");
                }
            } else {
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
            console.log("attempting to getForm " + name);
            const res: Response = await fetch((PromiseFileFormAccess.url + "/forms/" + encodeURIComponent(name)));
            //This one we just want to return undefined if nothing occurs
            if (res.ok) {
                if (res.body !== undefined && res.body !== null) {
                    console.log("getForm complete")
                    return res.json();
                }
            } else{
                console.log("failed to getForm " + name);
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
        async create(name: string, contents: string[]): Promise<string | undefined> {
            console.log("recieved create request")
            console.log(name);
            console.log(contents);
            const res: Response = await fetch(PromiseFileFormAccess.url+ "/instances/", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "form": name, "contents": contents})
            });
            //This one we just want to return undefined if nothing occurs
            if (res.ok) {
                console.log("create request successful")
                return (res.text());
            }

            console.log("create request unsuccessful... " + res.statusText);
        }

        /**
         * Connect to the REST server return the form instance for the given id.
         * @param id id of the instance.
         * @return the form instance information, or undefined if no such
         */
        async getInstance(id: string): Promise<FormCompletion | undefined> {
            const res: Response = await fetch((PromiseFileFormAccess.url + "/instances/" + encodeURIComponent(id)));
            //This one we just want to return undefined if nothing occurs
            if (res.ok) {
                if (res.body !== undefined && res.body !== null) {
                    return res.json();
                }
            }
        }

        /**
         * Connect to the REST server specified and do the following:  
         * Replace the contents of a previously created form.
         * If the identifier doesn't match, or if the
         * new contents are the wrong length, no replacement is done.
         * @param id the id of the instance
         * @param newContents the updated contents
         * @return whether the replacement was done 
         */
        async replace(id: string, newContents: string[]): Promise<boolean>{
            const res: Response = await fetch(PromiseFileFormAccess.url + "/instances/" + encodeURIComponent(id), {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "form": JSON.stringify(id), "contents": JSON.stringify(newContents) })
            });
            return (res.ok);
        }

        /**
         * Connect to REST server and delete the specified instance from the system.
         * @param id id of instance we will delete
         * @return whether an insatnhce was delete.
         */
        async remove(id: string): Promise<boolean>{
            const res: Response = await fetch(PromiseFileFormAccess.url + "/instances/" + encodeURIComponent(id), {
                method: "DELETE",
                headers: { 'Content-Type': 'application/json' },
            });
            return (res.ok);
        }

    }

    return new PromiseFileFormAccess(host, port);
}


