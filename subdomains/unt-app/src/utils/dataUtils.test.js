import { readThrough } from './dataUtils';

describe('readThrough', () => {
    test('concurrent callers share one in-flight read', async () => {
        const store = new Map();
        let reads = 0;
        const read = () => { reads += 1; return Promise.resolve(['row']); };

        const first = readThrough(store, 1, read);
        const second = readThrough(store, 1, read);

        expect(second).toBe(first);
        expect(reads).toBe(1);
        await expect(first).resolves.toEqual(['row']);
        expect(store.get(1)).toBe(first);
    });

    test('a rejected read is not cached and the next call retries', async () => {
        const store = new Map();
        let reads = 0;
        const read = () => {
            reads += 1;
            return reads === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(['row']);
        };

        await expect(readThrough(store, 1, read)).rejects.toThrow('boom');
        expect(store.has(1)).toBe(false);

        await expect(readThrough(store, 1, read)).resolves.toEqual(['row']);
        expect(reads).toBe(2);
    });
});
