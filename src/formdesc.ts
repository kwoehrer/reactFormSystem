export interface Box {
    x : number, 
    y : number, 
    h : number, 
    w : number
}

export interface Slot {
    description : string;
    location : Box;
}

export interface FormDescription {
    name : string;
    image : string;
    slots : Array<Slot>;
    debug ?: boolean;
}

export interface FormCompletion {
    id : string; // id of completion
    form : string; // name of form
    contents : Array<string>;
}

export interface FormAccess {
    /** Return a list of all form description names. */
    listAllForms : () => Array<string>;

    /** Return the structure of the named form, or undefined if there is no such form.
     * @param name name of form
     * @return form description (if the name is valid) or undefined (otherwise)
     */
    getForm : (name:string) => FormDescription|undefined;

    /**  
     * Create a new instance of a form with given contents.
     * If the name doesn't match a form, undefined is returned.
     * If the number of slot contents doesn't match, undefined is returned.
     * If the system is overloaded, it may return undefined
     * rather than create a new instance.
     * @param name name of form
     * @param contents values for the slots.
     * @return unique id of created form or undefined if error
     */
    create : (name:string, contents : Array<string>) => string|undefined;
    
    /**
     * Return the form instace for the given id.
     * @param id id of the instance.
     * @return the form instance information, or undefined if no such
     */
    getInstance : (id : string) => FormCompletion | undefined;

    /**
     * Replace the contents of a previously created form.
     * If the identifier doesn't match, or if the
     * new contents are the wrong length, no replacement is done.
     * @param id the id of the instance
     * @param newContents the updated contents
     * @return whether the replacement was done 
     */
    replace : (id:string, newContents : Array<string>) => boolean;
    
    /**
     * Delete the iunstance from the system.
     * @param id
     * @return whether an insatnhce was delete.
     */
    remove : (id:string) => boolean;
}

function asString(x : unknown) : string {
    if (typeof x === "string") return x;
    return ""+x;
}

function asNumber(x : unknown) : number {
    if (typeof x === 'number') return x;
    return 0;
}

function asLocation(x : unknown) : Box {
    const b = x as Box;
    return {
        x : asNumber(b.x),
        y : asNumber(b.y),
        w : asNumber(b.w),
        h : asNumber(b.h)
    };
}

function asSlot(x : unknown) : Slot {
    const p = x as Slot;
    return {
        description : asString(p.description),
        location : asLocation(p.location),
    };
}

function asSlots(sl : unknown) : Array<Slot> {
    const result : Array<Slot> = [];
    if (Array.isArray(sl)) {
        for (const elem of sl) {
            result.push(asSlot(elem))
        }
    }
    return result;
}

export function fixFormDescription(d : object) : FormDescription {
    const prelim = d as FormDescription;
    return {
        name : asString(prelim.name),
        image : asString(prelim.image),
        slots : asSlots(prelim.slots),
        debug : prelim.debug
    };
}

export function fixFormCompletion(x : unknown) : FormCompletion {
    const prelim = x as FormCompletion;
    return {
        id : asString(prelim.id),
        form : asString(prelim.form),
        contents : Array.isArray(prelim.contents) ? prelim.contents.map(asString) : []
    };
}