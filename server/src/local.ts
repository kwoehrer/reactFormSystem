import {assert} from './assert';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fixFormCompletion, fixFormDescription, FormAccess, FormCompletion, FormDescription } from './formdesc';

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
    // TODO: Write this class
}

export async function fileAccess(filename : string) : Promise<FormAccess> {
    const result = new FileFormAccess(filename);
    await result.load();
    return result;
}