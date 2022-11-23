import {assert} from './assert';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fixFormCompletion, fixFormDescription, FormAccess, FormCompletion, FormDescription } from './formdesc';
import e from 'express';
import { readFile } from 'fs';

interface FormFileContents {
    templates : Array<FormDescription>;
    instances : Array<FormCompletion>;
}

function fixFormFileContents(x : any) : FormFileContents {
    const result : FormFileContents = {
        templates : [],
        instances : [],
    }
    if (Array.isArray(x?.templates)) {
        for (const temp of x.templates) {
            result.templates.push(fixFormDescription(temp));
        }
    } 
    if (Array.isArray(x?.instances)) {
        for (const inst of x.instances) {
            result.instances.push(fixFormCompletion(inst));
        }
    }
    return result;
}

class FileFormAccess implements FormAccess {
    dirty : boolean;
    path : string;

    private cleanDirty(){
        this.dirty = false;
    }

    private waitTillClean(){
        while(this.dirty){
            setTimeout(() => {},0);
        }
    }

    constructor(fileName?: string) {
        this.dirty = false;
        if(fileName === undefined || fileName){
            this.path =  "./forms.json";
        } else{
            this.path = "./" + fileName;
        }

        try{
            if (!fs.access(this.path)){
                this.dirty = true;
                fs.copyFile('./initial-forms.json', this.path)
                .then(this.cleanDirty);
            }
        } catch(err){
            console.error(err);
        }
    }
    /** Return a list of all form description names. */
    listAllForms (): Array<string>{
        this.waitTillClean();
        let data = fs.readFile(this.path,'utf-8');
        console.log(data);
    }

    /** Return the structure of the named form, or undefined if there is no such form.
     * @param name name of form
     * @return form description (if the name is valid) or undefined (otherwise)
     */
    getForm (name: string): FormDescription | undefined{

    }
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
    create (name: string, contents: string[]):string | undefined{

    }
    /**
     * Return the form instace for the given id.
     * @param id id of the instance.
     * @return the form instance information, or undefined if no such
     */
    getInstance (id: string): FormCompletion | undefined{

    }
    /**
     * Replace the contents of a previously created form.
     * If the identifier doesn't match, or if the
     * new contents are the wrong length, no replacement is done.
     * @param id the id of the instance
     * @param newContents the updated contents
     * @return whether the replacement was done 
     */
    replace(id: string, newContents: string[]): boolean{

    }
    /**
     * Delete the iunstance from the system.
     * @param id
     * @return whether an insatnhce was delete.
     */
    remove(id: string): boolean{

    }
}

export async function fileAccess(filename : string) : Promise<FormAccess> {
    const result = new FileFormAccess(filename);
    await result.load();
    return result;
}