import { describe, it, expect } from 'vitest';
import { rot13, removeJunk, shiftBack, voeDecode7Step, unpack } from './hosters';

describe('rot13', () => {
  it('is its own inverse', () => {
    const input = 'Hello World 123';
    expect(rot13(rot13(input))).toBe(input);
  });

  it('rotates letters and leaves non-letters untouched', () => {
    expect(rot13('abcXYZ_123')).toBe('nopKLM_123');
  });
});

describe('removeJunk', () => {
  it('strips known junk sequences', () => {
    expect(removeJunk('a@$b^^c~@d%?e*~f!!g#&h')).toBe('abcdefgh');
  });

  it('leaves clean strings untouched', () => {
    expect(removeJunk('SGVsbG8=')).toBe('SGVsbG8=');
  });
});

describe('shiftBack', () => {
  it('shifts character codes down by the given amount', () => {
    expect(shiftBack('def', 3)).toBe('abc');
  });

  it('is inverted by shifting forward by the same amount', () => {
    const input = 'some text 456';
    const shifted = shiftBack(input, -3);
    expect(shiftBack(shifted, 3)).toBe(input);
  });
});

// Re-implements the VOE encode side (inverse of voeDecode7Step's 6 steps) so
// we can build a fixture without depending on real, ever-changing VOE payloads.
function voeEncode7Step(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const step6 = Buffer.from(json, 'utf-8').toString('base64');
  const step5 = step6;
  const step4 = step5.split('').reverse().join('');
  const step3 = Array.from(step4).map((c) => String.fromCharCode(c.charCodeAt(0) + 3)).join('');
  const step2 = Buffer.from(step3, 'utf-8').toString('base64');
  const step1 = step2; // no junk inserted, removeJunk is a no-op on clean input
  const encoded = step1.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((((c.charCodeAt(0) - base - 13) % 26 + 26) % 26) + base);
  });
  return encoded;
}

describe('voeDecode7Step', () => {
  it('decodes a "source" field payload', () => {
    const encoded = voeEncode7Step({ source: 'https://example.com/stream.m3u8' });
    expect(voeDecode7Step(encoded)).toBe('https://example.com/stream.m3u8');
  });

  it('falls back to the first video_urls entry', () => {
    const encoded = voeEncode7Step({ video_urls: [{ file: 'https://example.com/a.m3u8' }] });
    expect(voeDecode7Step(encoded)).toBe('https://example.com/a.m3u8');
  });

  it('falls back to fallback[0].file when present', () => {
    const encoded = voeEncode7Step({ fallback: [{ file: 'https://example.com/b.m3u8' }] });
    expect(voeDecode7Step(encoded)).toBe('https://example.com/b.m3u8');
  });

  it('returns null for garbage input instead of throwing', () => {
    expect(voeDecode7Step('not-a-valid-payload-###')).toBeNull();
  });
});

describe('unpack', () => {
  it('unpacks a p.a.c.k.e.r-style eval() payload', () => {
    // Standard packer output shape: eval(function(p,a,c,k,e,d){...}('body',radix,count,'dict'.split('|'),0,{}))
    const packed = "eval(function(p,a,c,k,e,d){return p}('0 1(\"2\")',3,3,'console|log|hi'.split('|'),0,{}))";
    const result = unpack(packed);
    expect(result).toBe('console log("hi")');
  });

  it('returns null when the input does not match the packer shape', () => {
    expect(unpack('function foo() { return 1; }')).toBeNull();
  });
});
