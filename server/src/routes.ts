import { Router } from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import { fileAccess } from './local';
import { FormAccess} from './formdesc';
import { Request, Response } from 'express';


export const router = Router();

const filename = process.env.FORMS_FILENAME ?? "forms.json";

// top-level "await" doesn't work with Jest
// XXX  const access = await fileAccess(filename);
let access: FormAccess;
async function workaroundNoTopLevelAwait() {
    access = await fileAccess(filename);
}
const promise = workaroundNoTopLevelAwait(); //Lint bug? - This was code provided by prof

router.use(cors());

router.use(bodyParser.json()); // parse any bodies using JSON syntax

/**
 * Return the names of all forms, as an array of strings in JSON.
 */
router.get('/forms', (req: Request, res: Response) => {
    const result = access.listAllForms();
    res.json(result);
});

/**
 * Return the description of the form named in the endpoint. If there is
 * none such, return status 404.
 */
router.get('/forms/:name', (req: Request, res: Response) => {
    const formName = req.params.name;
    const result = access.getForm(formName);
    if (result === undefined) {
        res.sendStatus(404);
    } else {
        res.json(result);
    }
});

/**
 * The body should be a JSON object with form and contents fields for a new
 * instantiation. If the form name is valid and the contents are the correct length, then a fresh
 * (unique) instance identifier is returned. If there is a problem, status 400 is returned.
 */
router.post('/instances', (req: Request, res: Response) => {
    if (req.body && req.body.contents && req.body.form && typeof req.body.form === 'string') {
        const result = access.create(req.body.form, req.body.contents);
        if (result === undefined) {
            res.sendStatus(400);
        } else {
            res.send(result);
        }
    } else {
        res.sendStatus(400);
    }
});

/**
 * Return the form completion for the given name (usually one returned by a previous PUT call).
 * The result is JSON encoded. If there is no such instance, status 404 is returned.
 */
router.get('/instances/:name', (req: Request, res: Response) => {
    const instanceName = req.params.name;
    const result = access.getInstance(instanceName);
    if (result === undefined) {
        res.sendStatus(404);
    } else {
        res.json(result);
    }
});

/**
 * The body should be a JSON object with the contents field
 * bound to an array of strings. If the instance name is valid and its form requires exactly the
 * number of strings as the array has then the instance is updated with the new strings. If the
 * name isn’t valid, status 404 is returned. For other problems, status 400 is returned.
 */
router.patch('/instances/:name', (req: Request, res: Response) => {
    const newContents = req.body.contents;
    const instanceName = req.params.name;
    const oldInstance = access.getInstance(instanceName);

    //Check if the instance already exists
    if (oldInstance === undefined) {
        res.sendStatus(404);
        return;
    }

    //Test for badly formated new contents
    for (let i = 0; i < newContents.length; i++) {
        if (newContents[i] === undefined || newContents[i] === null) {
            console.log("Router: Badly formatted patch request");
            res.sendStatus(400);
            return;
        }
    }

    //Try to replace the instance.
    const result = access.replace(instanceName, newContents);

    if (result === undefined) {
        console.log("Router: Badly formatted patch request");
        res.sendStatus(400);
    } else {
        res.json(result);
    }
});

/**
 * If the name matches an instance, that instance is deleted and
 * success is returned (without content). Otherwise, 404 status is returned.
 */
router.delete('/instances/:name', (req: Request, res: Response) => {
    const instanceName = req.params.name;
    const result = access.remove(instanceName);
    if (!result) {
        res.sendStatus(404);
    } else {
        res.json(result);
    }
});