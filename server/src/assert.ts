let assertionsEnabled = false;

export function withAssertions(val : boolean, body : () => unknown) {
    const savedEnabled = assertionsEnabled;
    return describe('with assertions = ' + val, () => {
        beforeAll( () => {
            assertionsEnabled = val;
        });
        afterAll( () => {
            assertionsEnabled = savedEnabled;
        });
        body();
    })
}

export function assert(condition : () => boolean, message ?: string) {
    if (assertionsEnabled) {
        if (!condition()) {
            throw new Error("assertion failed" + (message ?? ""));
        }
    }
}
