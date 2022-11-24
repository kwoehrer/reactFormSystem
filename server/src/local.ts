import { assert } from './assert';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fixFormCompletion, fixFormDescription, FormAccess, FormCompletion, FormDescription } from './formdesc';
import e from 'express';
import { readFile } from 'fs';
import { formatWithOptions } from 'util';

interface FormFileContents {
    templates: Array<FormDescription>;
    instances: Array<FormCompletion>;
}

//X should be json 
function fixFormFileContents(x: any): FormFileContents {
    const result: FormFileContents = {
        templates: [],
        instances: [],
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
    dirty: boolean;
    path: string;
    contents: FormFileContents | undefined;
    //Create a map of json with fixFormFileContents
    //Initialize a write queue based on current structures after certain method are called.

    private waitTillClean() {
        while (this.dirty) {
            setTimeout(() => { }, 0);
        }
    }

    constructor(fileName?: string) {
        this.dirty = false;
        if (fileName === undefined || fileName === null) {
            this.path = "./forms.json";
        } else {
            this.path = fileName;
        }
        
        this.contents = undefined;
    }

    /** Return a list of all form description names. */
    listAllForms(): Array<string> {
        this.waitTillClean();
        let arr: Array<string> = new Array<string>();

        if(this.contents !== undefined){
            this.contents.templates.forEach((form) => arr.push(form.name));
        }

        return arr;
    }

    /** Return the structure of the named form, or undefined if there is no such form.
     * @param name name of form
     * @return form description (if the name is valid) or undefined (otherwise)
     */
    getForm(name: string): FormDescription | undefined {
        this.waitTillClean();
        let result : FormDescription | undefined = undefined;
        if(this.contents !== undefined){
            this.contents.templates.filter(currName => currName.name === name).forEach((form) =>  result = form);
        }

        return result;
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
    create(name: string, contents: string[]): string | undefined {
        let form : FormDescription | undefined = this.getForm(name);
        if(form === undefined){
            return undefined;
        }
        
        if(form.slots.length !== contents.length){
            return undefined;
        }

        //Need to detect system overload

        //Need to create a new instance and write it?? best way to do this?

        this.dirty = true;

    }
    /**
     * Return the form instace for the given id.
     * @param id id of the instance.
     * @return the form instance information, or undefined if no such
     */
    getInstance(id: string): FormCompletion | undefined {
        return undefined;
    }
    /**
     * Replace the contents of a previously created form.
     * If the identifier doesn't match, or if the
     * new contents are the wrong length, no replacement is done.
     * @param id the id of the instance
     * @param newContents the updated contents
     * @return whether the replacement was done 
     */
    replace(id: string, newContents: string[]): boolean {
        return false;
    }

    /**
     * Delete the iunstance from the system.
     * @param id
     * @return whether an insatnhce was delete.
     */
    remove(id: string): boolean {
        return false;
    }

    async load(): Promise<FormAccess>{
        //The only time you read from the json file.
        if (!fs.access(this.path)) {
            this.dirty = true;
            await fs.copyFile('./initial-forms.json', this.path);
            this.dirty = false;
        }

        this.waitTillClean();
        let data: string = "";
        await fs.readFile(this.path, {encoding:'utf8'}).then(value => data = value);
        //Do something to data then you can parse. should be simple
        let data_json = JSON.parse(data);
        this.contents = fixFormFileContents(data_json);
        return this;
    }
}

export async function fileAccess(filename: string): Promise<FormAccess> {
    const result = new FileFormAccess(filename);
    await result.load();
    return result;
}