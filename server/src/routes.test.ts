import { nanoid } from "nanoid";
import { expect, jest } from '@jest/globals';
import { withAssertions } from './assert';
import request from 'supertest';
import express from 'express';
import { router } from './routes';
import { FormAccess, FormDescription } from "./formdesc";
import { fileAccess } from "./local";

jest.mock('./local', () => {
    const mockAccess = {
        listAllForms: jest.fn(),
        getForm: jest.fn(),
        create: jest.fn(),
        getInstance: jest.fn(),
        replace: jest.fn(),
        remove: jest.fn(),
    }
    return ({
        fileAccess: (name: string) => Promise.resolve(mockAccess)
    });
});

const FORM1 = {
    name: "form1",
    image: "form1.png",
    slots: [
        {
            description: "slot #1",
            location: {
                w: 10, h: 5,
                x: 5, y: 40,
            }
        },
        {
            description: "slot #2",
            location: {
                w: 10, h: 5,
                x: 5, y: 60
            }
        }
    ]
};

const oneSlotForm =
{
    name: "one-slot-form",
    image: "no-image.png",
    slots: [
        {
            description: "the slot",
            location: { w: 30, h: 10, x: 0, y: 80 }
        }
    ]
};

type MockAccess = {
    [K in keyof FormAccess] : jest.Mock
}
let mockAccess: MockAccess;

async function workAroundNoTopLevelAwait() {
    mockAccess = await fileAccess('forms.json') as MockAccess;
}
workAroundNoTopLevelAwait();

function clearAccessMocks() {
    for (const mock in mockAccess) {
        mockAccess[mock as keyof FormAccess].mockClear();
    }
}

const app = express();
app.use('/', router);

function arrayEqual(a : unknown[], b : unknown[]) : boolean {
    if (a.length != b.length) return false;
    for (let i=0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

withAssertions(true, () => {
    afterEach(() => {
        clearAccessMocks();
    })
    it('top level forms', async() => {
        const names = [nanoid(), nanoid()];
        mockAccess.listAllForms.mockImplementation(() => names);
        const res = await request(app).get('/forms');
        expect(res.body).toEqual(names);
    });
    it('get form existing', async() => {
        const fname = nanoid();
        // shouldn't check this
        mockAccess.listAllForms.mockImplementation(() => []);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        const res = await request(app).get('/forms/' + fname);
        expect(res.body).toEqual({
            ...FORM1, name: fname
        });
    });
    it('get form non-existing', async () => {
        const fname = nanoid();
        const names = [nanoid(),nanoid()];
        mockAccess.listAllForms.mockImplementation(() => names);
        const res = await request(app).get('/forms/' + fname);
        expect(res.status).toBe(404);
    });
    it('post instance with data', async() => {
        const fname = nanoid();
        const names = [nanoid(), fname, nanoid()];
        const contents = [nanoid(), nanoid()];
        const inst = nanoid();
        mockAccess.listAllForms.mockImplementation(() => names);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        mockAccess.create.mockImplementation((f : string, a: string[]) => {
            if (f === fname && arrayEqual(a,contents)) {
                return inst;
            }
        });
        const res = await request(app)
            .post('/instances/')
            .send({form: fname, contents});
        expect(res.text).toBe(inst);
    })
    it('post instance with json', async() => {
        const fname = nanoid();
        const names = [nanoid(), fname, nanoid()];
        const contents = [nanoid(), nanoid()];
        const inst = nanoid();
        mockAccess.listAllForms.mockImplementation(() => names);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        mockAccess.create.mockImplementation((f : string, a: string[]) => {
            if (f === fname && arrayEqual(a,contents)) {
                return inst;
            }
        });
        const res = await request(app)
            .post('/instances/')
            .send(JSON.stringify({form: fname, contents}))
            .set('Content-type','application/json');
        expect(res.text).toBe(inst);
    });
    it('post instance with nothing', async () => {
        const fname = nanoid();
        const names = [nanoid(), fname, nanoid()];
        const contents = [nanoid(), nanoid()];
        const inst = nanoid();
        mockAccess.listAllForms.mockImplementation(() => names);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        mockAccess.create.mockImplementation((f : string, a: string[]) => {
            if (f === fname && arrayEqual(a,contents)) {
                return inst;
            }
        });
        const res = await request(app)
            .post('/instances/');
        expect(res.status).toBe(400);
    })
    it('post instance with bad object', async () => {
        const fname = nanoid();
        const names = [nanoid(), fname, nanoid()];
        const contents = [nanoid(), nanoid()];
        const inst = nanoid();
        mockAccess.listAllForms.mockImplementation(() => names);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        mockAccess.create.mockImplementation((f : string, a: string[]) => {
            if (f === fname && arrayEqual(a,contents)) {
                return inst;
            }
        });
        const res = await request(app)
            .post('/instances/')
            .send({ name : 'zero slot form', slots : []});
        expect(res.status).toBe(400);
    })
    it('post instance with wrong data', async () => {
        const fname = nanoid();
        const names = [nanoid(), fname, nanoid()];
        const contents = [nanoid(), nanoid()];
        const inst = nanoid();
        mockAccess.listAllForms.mockImplementation(() => names);
        mockAccess.getForm.mockImplementation((name:string) => {
            if (name === fname) return {
                ...FORM1,
                name: fname
            }
        });
        mockAccess.create.mockImplementation((f : string, a: string[]) => {
            if (f !== fname && arrayEqual(a,contents)) {
                return inst;
            }
        });
        const res = await request(app)
            .post('/instances/')
            .send({form: fname, contents});
        expect(res.status).toBe(400);
    })
    it('get defined instance', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name:string) => {
            if (name === inst) return {
                form: fname, contents, id: inst
            }
        });
        const res = await request(app).get('/instances/' + inst);
        expect(res.body).toEqual({
            id: inst, form: fname, contents
        });
    });
    it('get undefined instance', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name:string) => {
            if (name !== inst) return {
                form: fname, contents, id: inst
            }
        });
        const res = await request(app).get('/instances/' + inst);
        expect(res.status).toBe(404);
    });

    it('patch instance contents', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name: string) => {
            if (name === inst) return {
                form: fname, contents: ["a", "b"], id: inst
            }
        });
        mockAccess.replace.mockImplementation((name: string, array: string[]) =>
            (name === inst && arrayEqual(array, contents)));
        const res = await request(app).patch('/instances/' + inst)
            .send(JSON.stringify({ contents }))
            .set('Content-type', 'application/json');
        expect([200,204]).toContain(res.status);
    });
    it('patch bad contents', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [] as string[];
        contents[1] = nanoid();
        mockAccess.getInstance.mockImplementation((name: string) => {
            if (name === inst) return {
                form: fname, contents: ["a", "b"], id: inst
            }
        });
        mockAccess.replace.mockImplementation((name: string, array: string[]) =>
            (name === inst && array.length == 2 && typeof array[0] === 'string'));
        const res = await request(app).patch('/instances/' + inst)
            .send(JSON.stringify({ contents }))
            .set('Content-type', 'application/json');
        expect(res.status).toBe(400);
    })
    it('patch undefined instance', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name: string) => {
            if (name !== inst) return {
                form: fname, contents: ["a", "b"], id: inst
            }
        });
        mockAccess.replace.mockImplementation((name: string, array: string[]) =>
            (name !== inst));
        const res = await request(app).patch('/instances/' + inst)
            .send(JSON.stringify({ contents }))
            .set('Content-type', 'application/json');
        expect(res.status).toBe(404);
    });

    it('delete defined instance', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name: string) => {
            if (name === inst) return {
                form: fname, contents: contents, id: inst
            }
        });
        mockAccess.remove.mockImplementation((name: string) =>
            (name === inst));
        const res = await request(app).delete('/instances/' + inst);
        expect([200,204]).toContain(res.status);
    });
    it('delete undefined instance', async () => {
        const inst = nanoid();
        const fname = nanoid();
        const contents = [nanoid(), nanoid()];
        mockAccess.getInstance.mockImplementation((name: string) => {
            if (name !== inst) return {
                form: fname, contents: contents, id: inst
            }
        });
        mockAccess.remove.mockImplementation((name: string) =>
            (name !== inst));
        const res = await request(app).delete('/instances/' + inst);
        expect(res.status).toBe(404);
    });
})