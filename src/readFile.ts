// Implementation of nodefs:promises readFile
// using fetch


export async function readFile(path : string) :Promise<Uint8Array> {
    const response = await window.fetch(path);
    if (!response.body) throw new Error('object not found: ' + path);
    const rs = await response.body.getReader().read();
    if (!rs.value) throw new Error('object could not be read ' + path);
    return rs.value;
}
