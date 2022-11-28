import { assert } from './assert';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fixFormCompletion, fixFormDescription, FormAccess, FormCompletion, FormDescription } from './formdesc';

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

/**
 * A file access class that provides read and write access to a series of Form classes stored in
 * JSON format. Instances of the forms can be instantiated and stored.
 */
class FileFormAccess implements FormAccess {
    private dirty: boolean;
    private path: string;
    private contents: FormFileContents | undefined;
    private templateMap: Map<string, FormDescription>;
    private instanceMap: Map<string, FormCompletion>;
    private currentlyWriting: boolean;

    private wellFormed(): boolean {
        if (!this.path) return this.report('FileFormAccess has no path.');

        const instMapArr = Array.from(this.instanceMap.values());
        const templateMapArr = Array.from(this.templateMap.values());
        if (this.contents !== undefined) {
            for(let i = 0; i < instMapArr.length; i++){
                if(this.contents.instances.indexOf(instMapArr[i]) === -1){
                    return this.report('Content instances do not match internal instance map.');
                }
            }

            for(let i = 0; i < templateMapArr.length; i++){
                if(this.contents.templates.indexOf(templateMapArr[i]) === -1){
                    return this.report('Content templates do not match internal templates map.');
                }
            }
        } else{
            if(templateMapArr.length !== 0){
                return this.report('Internal template map should be empty when contents is' +
                'undefined');
            }
            if(instMapArr.length !== 0){
                return this.report('Internal instance map should be empty when contents is' +
                'undefined');
            }
        }

        return true;
    }

    private report(message: string): boolean {
        console.log(message);
        return false;
    }

    /**
     * Constructor for FileFormAccess. 
     * @param fileName Optional String. Allows you to change the location of the file storing our
     * form information.
     */
    constructor(fileName?: string) {
        this.dirty = false;
        if (fileName === undefined || fileName === null) {
            this.path = "./forms.json";
        } else {
            this.path = fileName;
        }

        this.contents = undefined;;
        this.templateMap = new Map<string, FormDescription>();
        this.instanceMap = new Map<string, FormCompletion>();
        this.currentlyWriting = false;

        assert(() => this.wellFormed(), 'invariant failed in constructor');
    }

    /** Return a list of all form description names. */
    listAllForms(): Array<string> {
        assert(() => this.wellFormed(), 'invariant failed at start of listAllForms');
        return Array.from(this.templateMap.keys());
    }

    /** Return the structure of the named form, or undefined if there is no such form.
     * @param name name of form
     * @return form description (if the name is valid) or undefined (otherwise)
     */
    getForm(name: string): FormDescription | undefined {
        assert(() => this.wellFormed(), 'invariant failed at start of getForm');
        return this.templateMap.get(name);
    }

    /**
     * Write helper. Kind of analagous to a singleton as only one can run at at a time?
     */
    private writeDaemon() {
        assert(() => this.wellFormed(), 'invariant failed at start of writeDaemon');
        if (this.currentlyWriting || !this.dirty) {
            return;
        }
        this.dirty = false;
        this.currentlyWriting = true;

        //Write temp file
        fs.writeFile("temp", JSON.stringify(this.contents)).then(() => {
            fs.rename("temp", this.path);

            this.currentlyWriting = false;
            if (this.dirty) {
                this.writeDaemon();
            }
        })

        assert(() => this.wellFormed(), 'invariant failed at end of writeDaemon');
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
        assert(() => this.wellFormed(), 'invariant failed at start of create');
        let form: FormDescription | undefined = this.getForm(name);
        if (form === undefined) {
            console.log("form undefined in local create");
            return undefined;
        }

        if (form.slots.length !== contents.length) {
            console.log("incorrect slots length in local create");
            return undefined;
        }

        for (let i = 0; i < contents.length; i++) {
            if (contents[i] === undefined || contents[i] === null) {
                console.log("undefined or null array elements in contents argument in create");
                return undefined;
            }
        }

        //Need to detect system overload
        let instance = {
            form: name,
            id: nanoid(),
            contents: contents,
        }

        this.contents?.instances.push(instance);
        this.instanceMap.set(instance.id, instance);

        this.dirty = true;
        setTimeout(() => this.writeDaemon(), 0);

        assert(() => this.wellFormed(), 'invariant failed at end of create');
        return "" + instance.id;
    }
    /**
     * Return the form instace for the given id.
     * @param id id of the instance.
     * @return the form instance information, or undefined if no such
     */
    getInstance(id: string): FormCompletion | undefined {
        assert(() => this.wellFormed(), 'invariant failed at start of getInstance');
        return this.instanceMap.get(id);
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
        assert(() => this.wellFormed(), 'invariant failed at start of replace');
        if (this.contents !== undefined) {
            const targetInst = this.instanceMap.get(id);
            if (targetInst) {
                if (targetInst.contents.length === newContents.length) {
                    targetInst.contents = newContents;
                    this.dirty = true;
                    setTimeout(() => this.writeDaemon(), 0);
                    return true;
                }
            }
        }
        assert(() => this.wellFormed(), 'invariant failed at end of replace');
        return false;
    }

    /**
     * Delete the iunstance from the system.
     * @param id id of instance we will delete
     * @return whether an insatnhce was delete.
     */
    remove(id: string): boolean {
        assert(() => this.wellFormed(), 'invariant failed at start of remove');
        if (this.contents !== undefined) {
            const target = this.getInstance(id);
            if (target !== undefined) {
                const index = this.contents.instances.indexOf(target);
                this.contents.instances.splice(index, 1);

                this.instanceMap.delete(id);

                this.dirty = true;
                setTimeout(() => this.writeDaemon(), 0);
                return true;
            }

        }

        assert(() => this.wellFormed(), 'invariant failed at end of remove');
        return false;
    }

    /**
     * This method is responsible for async loading a series of forms and their instances to a
     * FormAccess class
     * @returns A promise of a FormAccess instance 
     */
    async load(): Promise<FormAccess> {
        assert(() => this.wellFormed(), 'invariant failed at start of load');
        //The only time you read from the json file.
        if (!(await this.pathExists())) {
            this.dirty = true;
            await fs.copyFile('./initial-forms.json', this.path);
            this.dirty = false;
        }

        let data: string = "";
        await fs.readFile(this.path, { encoding: 'utf8' }).then(value => data = value);
        let data_json = JSON.parse(data);

        this.contents = fixFormFileContents(data_json);

        this.templateMap.clear();
        this.contents.templates.forEach(element => {
            this.templateMap.set(element.name, element);
        });

        this.instanceMap.clear();
        this.contents.instances.forEach(element => {
            this.instanceMap.set(element.id, element);
        });

        assert(() => this.wellFormed(), 'invariant failed at end of load');
        return this;
    }

    //Helper method to make code easier to read
    private async pathExists(): Promise<boolean> {
        assert(() => this.wellFormed(), 'invariant failed at start of pathExists');
        try {
            await fs.access(this.path, fs.constants.R_OK);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}

/**
 * Async function, takes a file name and returns a FormAccess promise to that file.
 * @param filename path to file
 * @returns Promise<FormAccess> which contains relevant methods for interacting with form files.
 */
export async function fileAccess(filename: string): Promise<FormAccess> {
    const result = new FileFormAccess(filename);
    await result.load();
    return result;
}