import { expect, jest, test } from '@jest/globals';
import { Mock } from 'jest-mock';
import { FormDescription } from '../formdesc';
import { withAssertions } from '../assert';

import fetch  from 'jest-mock-fetch';
import { accessServer } from './request';
import { nanoid } from 'nanoid';

const SAMPLE_FORMS = [
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
];

withAssertions(true, () => {
    beforeAll(() => {
        Object.assign(global, {fetch:fetch}); 
    })
    afterEach(() => {
        fetch.reset();
    });
    it('list all forms', async () => {
        const formName = nanoid();
        const access = accessServer('pabst.ceas.uwm.edu',4040);
        const promise = access.listAllForms();
        expect(fetch).toHaveBeenCalledWith('http://pabst.ceas.uwm.edu:4040/forms');
        fetch.mockResponse({
            json: () => Promise.resolve([formName])
        });
        const result = await promise;
        expect(result).toEqual([ formName ]);
    });
    it('get form successful', async () => {
        const formName = nanoid();
        const form = {
            name : formName,
            image: formName + ".png",
            slots : SAMPLE_FORMS[0].slots,
        };
        const access = accessServer('pabst.ceas.uwm.edu',4040);
        const promise = access.getForm(formName);
        expect(fetch).toHaveBeenCalledWith('http://pabst.ceas.uwm.edu:4040/forms/' + formName);
        fetch.mockResponse({
            json: () => Promise.resolve(form)
        });
        const result = await promise;
        expect(result).toEqual(form);
    });
    it('get form with interesting name', async () => {
        const formpart1 = nanoid();
        const formpart2 = nanoid();
        const formName = formpart1+' /' + formpart2;
        const form = {
            name : formName,
            image: formName + ".png",
            slots : SAMPLE_FORMS[0].slots,
        };
        const access = accessServer('pabst.ceas.uwm.edu',4040);
        const promise = access.getForm(formName);
        expect(fetch).toHaveBeenCalledWith('http://pabst.ceas.uwm.edu:4040/forms/' + formpart1+'%20%2F'+formpart2);
        fetch.mockResponse({
            json: () => Promise.resolve(form)
        });
        const result = await promise;
        expect(result).toEqual(form);
    });
    it('get form unsuccessful', async () => {
        const formName = nanoid();
        const access = accessServer('pabst.ceas.uwm.edu',4040);
        const promise = access.getForm(formName);
        expect(fetch).toHaveBeenCalledWith('http://pabst.ceas.uwm.edu:4040/forms/' + formName);
        fetch.mockResponse({
            ok: false,
            status: 404
        })
        const result = await promise;
        expect(result).toBeUndefined();
    });
    it('create form successful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const formName = nanoid();
        const strings = [nanoid(), nanoid()];
        const instName = nanoid();
        const access = accessServer(serverName,port);
        const promise = access.create(formName, strings);
        // console.log(JSON.stringify(fetch.lastReqGet()));
        const last = fetch.lastReqGet();
        expect(last.resource).toBe(`http://${serverName}:${port}/instances/`);
        expect(last.init?.method).toBe('POST');
        expect(last.init?.headers).toEqual({'Content-Type': 'application/json'});
        fetch.mockResponse({
            // Bug in jest-mock-fetch types 'text' wrong
            text: () => Promise.resolve(instName) as unknown as string,
            json: () => Promise.reject(new Error("not valid JSON"))
        });
        const result = await promise;
        expect(result).toBe(instName);
    });
    it('create form unsuccessful', async () => {
        const formName = nanoid();
        const access = accessServer('pabst.ceas.uwm.edu',4040);
        const strings = [nanoid(), nanoid()];
        const promise = access.create(formName, strings);
        fetch.mockResponse({
            ok: false,
            status: 400
        })
        const result = await promise;
        expect(result).toBeUndefined();
    });

    it('get instance', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);

        access.getInstance(instName);
        const last = fetch.lastReqGet();
        expect(last.resource).toBe(`http://${serverName}:${port}/instances/${instName}`);
        if (last.init?.method !== undefined) {
            expect(last.init.method).toBe('GET');
        }
    });

    it('get instance successful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const formName = nanoid();
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const strings = [nanoid(), nanoid()];
        const promise = access.getInstance(instName);
        const instance = {
            id: instName,
            form: formName,
            contents: strings,
        };
        fetch.mockResponse({
            json: () => Promise.resolve(instance)
        });
        const result = await promise;
        expect(result).toEqual(instance);
    })
    it('get instance unsuccessful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);

        const promise = access.getInstance(instName);
        fetch.mockResponse({
            ok: false,
            status: 404,
        })
        const result = await promise;
        expect(result).toBeUndefined();
    });

    it('replace instance successful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const strings = [nanoid(), nanoid()];
        const promise = access.replace(instName, strings);
        fetch.mockResponse({
            ok: true,
            status: 204
        });
        const result = await promise;
        expect(result).toBe(true);
    });
    it('replace instance unsuccessful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const strings = [nanoid(), nanoid()];
        const promise = access.replace(instName, strings);
        fetch.mockResponse({
            ok: false,
            status: 400
        });
        const result = await promise;
        expect(result).toBe(false);
    });
    it('replace instance undefined', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const strings = [nanoid(), nanoid()];
        const promise = access.replace(instName, strings);
        fetch.mockResponse({
            ok: false,
            status: 404
        });
        const result = await promise;
        expect(result).toBe(false);
    });

    it('remove instance successful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const promise = access.remove(instName);
        fetch.mockResponse({
            ok: true,
            status: 204
        });
        const result = await promise;
        expect(result).toBe(true);
    });
    it('remove instance unsuccessful', async () => {
        const serverName = nanoid() + '.com';
        const port = Math.floor(Math.random() * 1000) + 50000;
        const instName = nanoid();
        const access = accessServer(serverName, port);
        const promise = access.remove(instName);
        fetch.mockResponse({
            ok: false,
            status: 404
        });
        const result = await promise;
        expect(result).toBe(false);
    });
  
})
