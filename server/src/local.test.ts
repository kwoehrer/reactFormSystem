import { nanoid } from "nanoid";
import { expect, jest } from '@jest/globals';
import fs from 'fs/promises';
import { withAssertions } from './assert';
import { fileAccess } from './local';

jest.mock('fs/promises');

const SAMPLE_FILE_CONTENTS = {
    templates: [
        {
            name: "form1",
            image: "form1.png",
            slots: [
                {
                    description: "slot #1",
                    location: {
                        w : 10, h : 5,
                        x : 5, y : 40,
                    }
                },
                {
                    description: "slot #2",
                    location: {
                        w : 10, h : 5,
                        x : 5, y: 60
                    }
                }
            ]
        },
        {
            name: "one-slot-form",
            image: "no-image.png",
            slots : [
                { 
                    description: "the slot",
                    location: { w : 30, h : 10, x : 0, y : 80}
                }
            ]
        }
    ],
    instances : [
        {
            id: "cannot-guess-me",
            form: "form1",
            contents : [ "Hello", "World"]
        },
        {
            id: "h92nv789f0",
            form : "one-slot-form",
            contents : [ "contents" ]
        }
    ]
};

const ALT_FILE_CONTENTS = {
    templates : [
        SAMPLE_FILE_CONTENTS.templates[1],
        {
            name: 'zero slot form',
            image: 'hole.png',
            debug: true,
            slots : []
        },
        SAMPLE_FILE_CONTENTS.templates[0]
    ],
    instances : [
        {
            id: "h92nv719f0",
            contents : [ "pleasant" ],
            form: "one-slot-form",
        },
        {
            id: "very unique!!! 1234",
            form: "zero slot form",
            contents: []
        },
        {
            contents: [ "sunny" ],
            form: "one-slot-form",
            id: "b736ho09a5m1",
        }
    ]
};

async function resolve<T>(value : T) : Promise<T> {
    return value;
}

function sleep(value : number) : Promise<void> {
    return new Promise((res) => {
        setTimeout(() => {
            res();
        });
    });
}

withAssertions(true, () => {
    const FILE_TEXT = JSON.stringify(SAMPLE_FILE_CONTENTS);
    const ALT_TEXT = JSON.stringify(ALT_FILE_CONTENTS);
    const EMPTY_TEXT = JSON.stringify({templates:[],instances:[]});
    const mockedReadFile = fs.readFile as jest.Mock;
    const mockedWriteFile = fs.writeFile as jest.Mock;
    const mockedRename = fs.rename as jest.Mock;
    beforeEach(() => {
        mockedWriteFile.mockImplementation(() => resolve(undefined));
    });
    afterEach(() => {
        mockedReadFile.mockClear();
        mockedWriteFile.mockClear();
        mockedRename.mockClear();
    });
    it('start up', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test1.json');
        expect(access).toBeDefined();
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
    it('read file', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        await fileAccess('test2.json');
        expect(mockedReadFile).toHaveBeenCalledTimes(1);
        expect(mockedReadFile).toHaveBeenCalledWith('test2.json',{encoding:'utf8'});
    });
    it('no such form', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test3.json');
        expect(access.getForm("zero slot form")).toBeUndefined();
    });
    it('all forms #1', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test4.json');
        const allForms = access.listAllForms();
        expect(allForms).toEqual(['form1','one-slot-form']);
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
    it('all forms #2', async () => {
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess('test4.json');
        const allForms = access.listAllForms();
        expect(allForms).toEqual(['one-slot-form','zero slot form','form1']);
    });
    it('get form #1', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test5.json');
        expect(access.getForm('form1')).toEqual(SAMPLE_FILE_CONTENTS.templates[0]);
    });
    it('get form #2', async () => {
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess('test5.json');
        expect(access.getForm('zero slot form')).toEqual(ALT_FILE_CONTENTS.templates[1]);
    });
    it('get form #3', async () => {
        mockedReadFile.mockImplementation(() => resolve(EMPTY_TEXT));
        const access = await fileAccess('test5.json');
        expect(access.getForm('zero slot form')).toBeUndefined();
    });
    it('create form', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        const id = access.create('form1',["hello", "world"]); 
        expect(id).toBeDefined();
        await sleep(1);
        const expectedInstance = {
            form: "form1",
            id: id,
            contents: ["hello", "world"]
        };
        expect(mockedWriteFile).toBeCalledTimes(1);
        const call = mockedWriteFile.mock.calls[0];
        expect(JSON.parse(call[1] as string)).toEqual({
            templates: SAMPLE_FILE_CONTENTS.templates,
            instances: [...SAMPLE_FILE_CONTENTS.instances,
                        expectedInstance]
        });
    });
    it('create form zero', async () => {
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('zero slot form',[])).toBeDefined();
        await sleep(1);
        expect(mockedWriteFile).toBeCalledTimes(1);
        expect(mockedRename).toBeCalledTimes(1);
        const filename = mockedWriteFile.mock.calls[0][0];
        expect(mockedRename).toBeCalledWith(filename,'test6.json');
    });
    it('create form one', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('one-slot-form', ["happy"])).toBeDefined();
        await sleep(1);
        expect(mockedWriteFile).toBeCalledTimes(1);
    });
    it('create form with blank fields', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('one-slot-form', [""])).toBeDefined();
        await sleep(1);
        expect(mockedWriteFile).toBeCalledTimes(1);
    })
    it('create form, bad name', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('zero slot form', [])).toBeUndefined();
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
    it('create form, too few', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('one-slot-form', [])).toBeUndefined();
    });
    it('create form, too many', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        expect(access.create('one-slot-form', ["foo","bar"])).toBeUndefined();
    });
    it('create form, not well defined', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test6.json');
        const badArray : string[] = [];
        badArray[1] = 'afterbad';
        expect(access.create('form1', badArray)).toBeUndefined();
    });

    it('getInstance pre-existing', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        expect(access.getInstance('h92nv789f0')).toEqual(SAMPLE_FILE_CONTENTS.instances[1]);
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
    it('getInstance newly created', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        const id = access.create('form1',["good", "morning"]);
        expect(id).toBeDefined();
        if (id === undefined) return;
        expect(access.getInstance(id)).toEqual({
            id: id, form: 'form1',
            contents: ["good", "morning"]
        });
        // need to clean up any writes:
        await sleep(1);
    });
    it ('getInstance undefined', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        expect(access.getInstance("b736ho09a5m1")).toBeUndefined();
    });

    it('replace existing', async () => {
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess('test8.json');
        expect(access.replace("b736ho09a5m1",["windy"])).toBe(true);
        await sleep(1);
        const expectedNewInstance = {
            contents: [ "windy" ],
            form: "one-slot-form",
            id: "b736ho09a5m1",
        };
        expect(mockedWriteFile).toBeCalledTimes(1);
        const call = mockedWriteFile.mock.calls[0];
        expect(JSON.parse(call[1] as string)).toEqual({
            templates: ALT_FILE_CONTENTS.templates,
            instances: [...ALT_FILE_CONTENTS.instances.slice(0,2),
                        expectedNewInstance]
        });
    });
    it('replace newly created', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        const id = access.create('form1',["good", "morning"]);
        expect(id).toBeDefined();
        if (id === undefined) return;
        expect(access.replace(id, ["good", "night"])).toBe(true);
        await sleep(10); // cleanup
    });
    it('replace newly created with blanks', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        const id = access.create('form1',["good", "morning"]);
        expect(id).toBeDefined();
        if (id === undefined) return;
        expect(access.replace(id, ["", ""])).toBe(true);
        await sleep(10); // cleanup
    });
   it('replace newly created accessible', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        const id = access.create('form1', ["good", "morning"]);
        expect(id).toBeDefined();
        if (id === undefined) return;
        expect(access.replace(id, ["good", "night"])).toBe(true);
        expect(access.getInstance(id)).toEqual({
            id: id,
            form: 'form1',
            contents: ["good", "night"]
        });
        await sleep(10); // cleanup
    });
    it('replace newly created write back', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test7.json');
        const id = access.create('form1',["good", "morning"]);
        expect(id).toBeDefined();
        if (id === undefined) return;
        expect(access.replace(id, ["sweet", "dreams"])).toBe(true);
        await sleep(1);
        expect(mockedWriteFile).toBeCalledTimes(1); // not twice!
        const call = mockedWriteFile.mock.calls[0];
        expect(JSON.parse(call[1] as string)).toEqual({
            templates: SAMPLE_FILE_CONTENTS.templates,
            instances: [...SAMPLE_FILE_CONTENTS.instances,
                        {id:id, form: 'form1', contents: ["sweet", "dreams"]}]
        });        
    });
    
    it('replace undefined', async () => {
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess('test8.json');
        expect(access.replace("b736ho09a5m1",["hot"])).toBe(false);
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
    it('replace wrong length', async () => {
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess('test8.json');
        expect(access.replace("b736ho09a5m1",["hello", "world"])).toBe(false);
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });

    it('remove pre-existing', async () => {
        const filename = nanoid() + '.json';
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess(filename);
        expect(access.remove("cannot-guess-me")).toBe(true);
        await sleep(1);
        expect(mockedWriteFile).toBeCalledTimes(1);
        const call = mockedWriteFile.mock.calls[0];
        expect(JSON.parse(call[1] as string)).toEqual({
            templates: SAMPLE_FILE_CONTENTS.templates,
            instances: [SAMPLE_FILE_CONTENTS.instances[1]]    
        }); 
    })
    it('remove newly created', async () => {
        const filename = nanoid() + '.json';
        mockedReadFile.mockImplementation(() => resolve(ALT_TEXT));
        const access = await fileAccess(filename);
        const contents1 = [nanoid(), nanoid()];
        const id1 = access.create('form1', contents1);
        expect(id1).toBeDefined();
        await sleep(5);
        expect(mockedWriteFile).toBeCalledTimes(1);
        const contents2 : string[] = [];
        const id2 = access.create('zero slot form', contents2);
        expect(id2).toBeDefined();
        expect(access.remove(id1 as string)).toBe(true);
        await sleep(5);
        expect(mockedWriteFile).toBeCalledTimes(2); // not three 
        const call = mockedWriteFile.mock.calls[1];
        expect(JSON.parse(call[1] as string)).toEqual({
            templates: ALT_FILE_CONTENTS.templates,
            instances: [
                ...ALT_FILE_CONTENTS.instances,
                { id: id2, form: 'zero slot form', contents : []}
            ]    
        }); 
        const tempName = call[0];
        expect(mockedRename).toBeCalledTimes(2);
        expect(mockedRename.mock.calls[1]).toEqual([
            tempName,
            filename,
        ]);
    })
    it('remove not present', async () => {
        const filename = nanoid() + '.json';
        mockedReadFile.mockImplementation(() => resolve(FILE_TEXT));
        const access = await fileAccess(filename);
        expect(access.remove("can-guess-me")).toBe(false);
        await sleep(1);
        expect(mockedWriteFile).not.toBeCalled();
    });
});
