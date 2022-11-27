import './App.css';
import { MouseEvent, KeyboardEvent, useEffect, useRef, useState, useInsertionEffect, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Radio, RadioGroup, Select, Stack, useToast, UseToastOptions } from '@chakra-ui/react';
import { Form, ImageFit } from './Form';
import { fixFormDescription, FormDescription } from './formdesc';
import { accessServer, PromiseFormAccess } from './client/request';
import { FormCompletion } from '../server/src/formdesc';

const HORIZ_MARGIN = 24;
const VERT_MARGIN = 60;

function getWindowDimensions(): { width: number; height: number; } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

const DEFAULT_OPTIONS: FormDescription = {
  name: 'default',
  image: '',
  slots: []
}

/**
 * Converts an exception to a string.
 * @param e Exception, to be converted to a string.
 * @returns A string representation of the error
 */
function throwMessage(e: Error): string {
  return e.name + ": " + e.message;
}

function App() {
  // #(
  const [windowDims, setWindowDims] = useState(getWindowDimensions())
  const canvasRef = useRef(null as null | HTMLCanvasElement);
  const [formName, setFormName] = useState('Add Form');
  const [fit, setFit] = useState(ImageFit.FitWidth);
  const [form, setForm] = useState(null as null | Form);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(-1);
  const [slotContents, setSlotContents] = useState([] as Array<string>);

  const toast = useToast();

  const backendServer = accessServer("localhost", 56018);
  const formList = formListParse(usePromise<[], string[]>(backendServer.listAllForms, [], toast));
  const [options, setOptions] = useState(optionsParse(usePromise(backendServer.getForm, [formName], toast)));

  //Instance state logic
  const [instanceList, setInstanceList] = useState(Array<FormCompletion>);
  const [currInstance, setCurrInstance] = useState<FormCompletion | undefined>(undefined);

  function formListParse(formList: string[] | undefined): string[] {
    if (formList === undefined) {
      return [];
    } else {
      return formList;
    }
  }

  function optionsParse(options: FormDescription | undefined): FormDescription {
    if (options === undefined) {
      return DEFAULT_OPTIONS;
    } else {
      return options;
    }
  }

  function usePromise<A extends unknown[], T>(promisef: (...args: A) => Promise<T> | undefined,
    args: A, toast: (opt: UseToastOptions) => unknown): T | undefined {
    console.log("usePromise in use");
    const [result, setResult] = useState<T | undefined>();

    useEffect(() => {
      const prom = promisef(...args);

      prom?.then((res) => {
        console.log("Successful usePromise");
        setResult(res);
      }).catch((err) => {
        toast({ status: 'error', description: throwMessage(err) });
        setResult(undefined);
      });
    }, [...args, toast]);

    console.log("usePromise completed : ");
    return result;
  }

  async function fetchForm(stillTrying : boolean) {
    console.log('Trying fetch');
    const canvas = canvasRef.current;
    if (formName && canvas) {
      try {
        const formSelect = await backendServer.getForm(formName);
        if (formSelect === undefined) {
          return;
        }
        let imageFile: string;
        if (typeof formSelect.image === "string") {
          imageFile = formSelect.image;
        } else {
          throw new Error("No image mentioned in " + formName);
        }
        const formImage = new Image();
        formImage.src = imageFile;
        await formImage.decode();

        let cleanOptions: FormDescription = fixFormDescription(formSelect);

        if (stillTrying) {
          console.log("DEBUG:" + cleanOptions.name);
          console.log("DEBUG:" + options.name);
          //Options is more updated than clean options sometimes.. when? when we select a new instance with different types
          setOptions(cleanOptions);
          
          if(currInstance){
            setSlotContents(currInstance.contents);
          } else{
            setSlotContents(cleanOptions.slots.map(_ => ""));
          }

          setForm(new Form(canvas, formImage, cleanOptions));
          console.log(`Successfully read form`);
        }
      } catch (ex) {
        let mess: string;
        if (typeof ex === 'string') {
          mess = ex;
        } else if (ex instanceof Error) {
          mess = ex.message;
        } else {
          mess = 'Unknown error';
        }
        toast({ status: 'error', description: mess });
      }
    } else {
      console.log(' ... but canvas is null');
    }
  }

  useEffect(() => {
    let stillTrying = true;

    fetchForm(stillTrying);
    return () => { stillTrying = false; }
  }, [formName, canvasRef, toast]);


  useEffect(() => {
    function handleResize() {
      setWindowDims(getWindowDimensions())
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    console.log('attempted to draw');
    const canvas = canvasRef.current;
    if (form && canvas) {
      console.log('fit = ' + fit);
      form.setCurrentSlotIndex(currentSlotIndex);
      try{
        form.setSlotContents(slotContents);
      } catch(error){
        fetchForm(true);
      }
      form.setFit(fit);
      const gfx = canvas.getContext('2d');
      if (gfx) {
        form.paint(gfx);
      } else {
        console.log('no gfx context?');
      }
    } else {
      console.log(`Problem: form = ${form} and canvas = ${canvas}`);
    }
  },);

  function mouseClick(e: MouseEvent) {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      console.log(`x = ${mx}, y = ${my}`);
      let newIndex = -1;
      if (form) {
        if (options) options.slots.forEach((sl, index) => {
          const loc = sl.location;
          const x = form.cvtpctx(loc.x);
          const y = form.cvtpcty(loc.y);
          const w = form.cvtpctx(loc.w);
          const h = form.cvtpcty(loc.h);
          if (mx >= x && mx <= x + w &&
            my <= y && my >= y - h) {
            newIndex = index;
            // console.log('Found index + ' + index);
          }
        });
      }
      if (newIndex !== currentSlotIndex) {
        setCurrentSlotIndex(newIndex);
      }
    }
  }

  function keyDown(e: KeyboardEvent) {
    if (e.key.length === 1) {
      if (currentSlotIndex >= 0) {
        e.preventDefault();
        const index = currentSlotIndex;
        const oldContents = slotContents;
        setSlotContents([...oldContents.slice(0, index), oldContents[index] + e.key, ...oldContents.slice(index + 1)]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      let newIndex = currentSlotIndex;
      if (++newIndex >= slotContents.length) {
        newIndex = -1;
      }
      setCurrentSlotIndex(newIndex);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      if (currentSlotIndex >= 0) {
        e.preventDefault();
        const i = currentSlotIndex;
        const oldContents = slotContents;
        setSlotContents([...oldContents.slice(0, i), slotContents[i].slice(0, -1), ...oldContents.slice(i + 1)]);
      }
    }

  }
  const canvasWidth = windowDims.width - HORIZ_MARGIN;
  const canvasHeight = windowDims.height - VERT_MARGIN;

  //Replaces an instance in the instance list.
  const replaceInstance = (instance: FormCompletion, newInstance: FormCompletion | undefined) => {

    if (newInstance === undefined) {
      setInstanceList(instanceList.filter((instElem) => instElem.id !== instance.id).map((ele) => ele));
    }

    if (newInstance !== undefined) {
      const oldIndex = instanceList.indexOf(instance);
      instanceList.splice(oldIndex, 1);
      instanceList.push(newInstance);
    }

    setCurrInstance(newInstance);
  }

  //Submit button/create instance logic - Too custom to utilize our generic promise.
  const submit = useCallback(async () => {
    let result: string | undefined = undefined;

    if (currInstance !== undefined) {
      //Replace currInstance if we have one
      if (await backendServer.replace(currInstance.id, slotContents)) {
        const newInstance: FormCompletion | undefined = await backendServer.getInstance(currInstance.id);

        replaceInstance(currInstance, newInstance);
        toast({ status: 'info', description: "Updated instance " + currInstance.id });
      } else {
        toast({ status: 'error', description: "Could not update existing instance." });
      }
      setCurrInstance(await backendServer.getInstance(currInstance.id));
    } else {
      //When we have no currInstance, create a new one
      result = await backendServer.create(formName, slotContents);
      if (result !== undefined) {
        const formInstance = await backendServer.getInstance(result);
        setCurrInstance(formInstance);
        if (formInstance !== undefined) {
          instanceList.push(formInstance);
        }
        toast({ status: 'success', description: "New instance id created: " + result });
      } else {
        toast({ status: 'error', description: "Could not create new instance of form" });
      }
    }

  }, [slotContents, currInstance]);

  //Withdraw button, cannot use callback for function so have to provide our own.
  //Does not current slots from screen, simply removes the instance in the database.
  const withdraw = useCallback(async () => {
    //Narrowing conversion
    if (currInstance === undefined) {
      console.log("currInstance was undefined when withdraw button was clickable.");
      return;
    }

    console.log(currInstance.id);

    const result = await backendServer.remove(currInstance.id);

    if (result) {
      replaceInstance(currInstance, undefined);
      toast({ status: 'success', description: "Form instance successfully withdrawn." });
    } else {
      toast({ status: 'error', description: "Could not withdraw the current form instance." });
    }

  }, [currInstance]);

  //determines our state by whatever we have selected.
  const select = useCallback(async (instanceID: string) => {
    console.log("select callback: instanceID = " + instanceID);
    const tempInstance = instanceList.filter((inst) => inst.id === instanceID)[0];
    setCurrInstance(tempInstance);

    if (tempInstance !== undefined) {
      console.log("Selected from menu: Current form:" + tempInstance.form);
      setFormName(tempInstance.form);
      setSlotContents(tempInstance.contents);
    }
  }, [currInstance, formName, slotContents]);

  //Helper method, determines current selected ID when going between pages.
  const selectedID = () => {
    if (currInstance === undefined) {
      return "Select Form Instance";
    } else {
      return currInstance.id;
    }
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <Stack direction='row'>
          <Select placeholder='Select Form' value={formName}
            onChange={(ev) => {
              setFormName(ev.target.value);
              setCurrInstance(undefined);
            }}>
            {
              formList.map(name => (
                <option id={name} value={name}>{name}</option>
              ))
            }
          </Select>
          <RadioGroup onChange={(s) => setFit(+s)} value={fit}>
            <Stack direction='row'>
              <Radio size='lg' value={ImageFit.FitWidth}>Fit Width</Radio>
              <Radio size='lg' value={ImageFit.FitHeight}>Fit Height</Radio>
              <Radio value={ImageFit.FitWhole}>Fit Whole</Radio>
            </Stack>
          </RadioGroup>
          <ButtonGroup>
            <Button colorScheme='blue' variant='outline' onClick={submit}>
              Submit
            </Button>
            <Button disabled={currInstance === undefined} colorScheme='blue' variant='outline' onClick={withdraw}>
              Withdraw
            </Button>
          </ButtonGroup>
          <Select placeholder='Select Form Instance' value={selectedID()}
            onChange={(ev) => select(ev.target.value)}>
            {
              instanceList.map(instance => (
                <option id={instance.id} value={instance.id}>{instance.id}</option>
              ))
            }
          </Select>
        </Stack>
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight}
          onClick={mouseClick} onKeyDown={keyDown} tabIndex={1}>
          This application requires HTML 5 and JavaScript]
        </canvas>
      </header>
    </div>
  );
}

export default App;
