import { FormDescription } from './formdesc';
import { assert } from './assert';

export enum ImageFit {
    FitWidth,
    FitHeight,
    FitWhole
}
  
export class Form {

    private static SLOT_COLOR = "#ADD8e680";

    private canvas: HTMLCanvasElement;

    private image: CanvasImageSource;

    private options: FormDescription;

    private currentSlotIndex : number;
    private slotContents: Array<string>;

    private report(message : string) : boolean {
        console.log(message);
        return false;
    }

    private wellFormed() : boolean {
        if (!this.canvas.width) return this.report('canvas has no width');
        if (!this.image.height) return this.report('image has no height');
        if (!Array.isArray(this.options.slots)) return this.report("slots aren't an array");
        const max = this.options.slots.length;
        if (this.currentSlotIndex < -1 || this.currentSlotIndex >= max) return this.report('currentSlotIndex ' + this.currentSlotIndex + ' out of range[-1,' + max + ')');
        if (this.slotContents.length !== max) return this.report('slot contents inconsistent length');
        for (const content of this.slotContents) {
            if (typeof content !== 'string') return this.report('context ' + content + ' is not a string');
        }
        return true;
    }

    private dirty = true;

    /**
     * Set the current slot index (the one to be highlighted).
     * Set to -1 to mean no selection.
     * @param newIndex new idnex, must be -1 or a valid slot index
     */
    setCurrentSlotIndex(newIndex: number) {
        if (newIndex < -1 || newIndex >= this.options.slots.length) {
            throw new Error('illegal argument: ' + newIndex);
        }
        this.currentSlotIndex = newIndex;
    }

    /**
     * Set the contents for each slot.  The array must be the same size as the number of slots 
     * and each entry must be a string.
     * @param newContents new contents for each slot.
     */
    setSlotContents(newContents: Array<string>) {
        if (newContents.length !== this.options.slots.length) {
            throw new Error('illegal argument: ' +newContents);
        }
        for (let i = 0; i < newContents.length; ++i) {
            if (typeof(newContents[i]) !== 'string') {
                throw new Error('array has bad value: ' + newContents[i]);
            }
        }
        this.slotContents = [...newContents]; // paranoia
    }

    /**
     * Set the scaling for the image.
     * @param newScale 
     */
    setScale(newScale : number) {
        if (newScale <= 0) throw new Error('Illegal argument: ' + newScale);
        this.scale = newScale;
    }

    setFit(fit:ImageFit) {
        if (typeof this.image.width === 'number' &&
            typeof this.image.height === 'number') {
            const sw = this.canvas.width / this.image.width;
            const sh = this.canvas.height / this.image.height;
            switch (fit) {
                case ImageFit.FitWidth:
                    this.scale = sw;
                    break;
                case ImageFit.FitHeight:
                    this.scale = sh;
                    break;
                default:
                    this.scale = Math.min(sw, sh);
                    break;
            }
        }
    }



    /**
     * Arrange for the form to rendered at the earliet convenience,
     * but not until this current event handling is done.
     */
    private repaint() {
        this.dirty = true;
        const gfx = this.canvas.getContext('2d');
        if (gfx) {
            setTimeout(() => {
                if (!this.dirty) return;
                this.dirty = false;
                this.paint(gfx)
            });
        } else {
            console.log('No gfx context!');
        }
    }

    /**
     * The scaling factor between a form and the canvas.
     * For example if scale 2, then the canvas is twice the width
     * of the form.
     * By default, we assume that they are the same size.
     */
    private scale = 1;

    /**
     * Convert a percentage of the width of a form into a 
     * coordinate in the canvas.
     * @param xpct  a number from 0 to 100
     */
    cvtpctx(xpct: number): number {
        return xpct * (this.image.width as number) * this.scale / 100;
    }

    /**
     * Convert a percentage of the height of a form into a 
     * coordinate in the canvas.
     * @param ypct  a number from 0 to 100
     */
    cvtpcty(ypct: number): number {
        return ypct * (this.image.height as number) * this.scale / 100;
    }

    /**
     * Render the form and all superimposed information on the canvas.
     * @param gfx the graphical rendering context
     */
    paint(gfx: CanvasRenderingContext2D) {
        assert(() => this.wellFormed(), 'invariant failed in paint');
        // console.log('painting...');
        gfx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        gfx.drawImage(this.image, 0, 0, this.cvtpctx(100), this.cvtpcty(100));
        if (this.options.debug) {
            gfx.beginPath();
            for (let i = 0; i <= 10; ++i) {
                const y = this.cvtpcty(i * 10);
                gfx.moveTo(0, y);
                gfx.lineTo(this.canvas.width, y);
            }
            for (let j = 0; j <= 10; ++j) {
                const x = this.cvtpctx(j * 10);
                gfx.moveTo(x, 0);
                gfx.lineTo(x, this.canvas.height);
            }
            gfx.closePath();
            gfx.stroke();
        }
        if (this.currentSlotIndex >= 0) {
            const sl = this.options.slots[this.currentSlotIndex]
            const loc = sl.location;
            gfx.fillStyle = Form.SLOT_COLOR;
            const x = this.cvtpctx(loc.x);
            const y = this.cvtpcty(loc.y - loc.h);
            const w = this.cvtpctx(loc.w);
            const h = this.cvtpcty(loc.h);
            gfx.fillRect(x, y, w, h);
        }
        for (let i = 0; i < this.slotContents.length; ++i) {
            const sl = this.options.slots[i];
            const h = this.cvtpcty(sl.location.h);
            const w = this.cvtpctx(sl.location.w);
            gfx.fillStyle = 'black';
            gfx.font = h + 'px sans-serif';
            gfx.fillText(this.slotContents[i], this.cvtpctx(sl.location.x), this.cvtpcty(sl.location.y), w);
        }
    }

    /**
     * Set up the form system with a particular form image.
     * @param canvas The HML element for the canvas to use
     * @param image The form's image itself
     * @param options The information about the form (slots etc).
     */
    constructor(canvas: HTMLCanvasElement, image: CanvasImageSource, options: FormDescription) {
        this.canvas = canvas;
        this.image = image;
        this.options = options;
        this.currentSlotIndex = -1;
        this.slotContents = options.slots.map(_ => "");
        
        assert(() => this.wellFormed(), 'invariant failed in constructor');
    }

}
