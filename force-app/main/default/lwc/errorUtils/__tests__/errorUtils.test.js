import { reduceErrors } from '../errorUtils';

describe('reduceErrors', () => {
    it('reads Apex error body message', () => {
        expect(reduceErrors({ body: { message: 'Apex failed' } })).toBe('Apex failed');
    });

    it('reads array bodies', () => {
        expect(reduceErrors({ body: [{ message: 'a' }, { message: 'b' }] })).toBe('a; b');
    });

    it('reads JS errors, strings and arrays', () => {
        expect(reduceErrors(new Error('js'))).toBe('js');
        expect(reduceErrors('plain')).toBe('plain');
        expect(reduceErrors(['x', { message: 'y' }])).toBe('x; y');
    });

    it('falls back for unknown input', () => {
        expect(reduceErrors(null)).toBe('Unknown error');
        expect(reduceErrors({})).toBe('Unknown error');
    });
});
