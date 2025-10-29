import resolveMapImageSource from './mapImages';

describe('resolveMapImageSource', () => {
  it('returns a trimmed imageUrl when available', () => {
    expect(
      resolveMapImageSource({ imageUrl: ' https://example.com/map.png ' })
    ).toBe('https://example.com/map.png');
  });

  it('builds a data url from imageBase64', () => {
    const result = resolveMapImageSource({ imageBase64: 'YmFzZTY0' });
    expect(result).toBe('data:image/png;base64,YmFzZTY0');
  });

  it('uses the provided mime type for base64 images', () => {
    const result = resolveMapImageSource({ imageBase64: 'YmFzZTY0', imageType: 'image/jpeg' });
    expect(result).toBe('data:image/jpeg;base64,YmFzZTY0');
  });

  it('supports nested image objects with urls', () => {
    const map = { image: { url: 'https://cdn.example.com/map.jpg' } };
    expect(resolveMapImageSource(map)).toBe('https://cdn.example.com/map.jpg');
  });

  it('supports nested image objects with base64 data', () => {
    const map = { image: { base64: 'QUJD', mimeType: 'image/gif' } };
    expect(resolveMapImageSource(map)).toBe('data:image/gif;base64,QUJD');
  });

  it('falls back to the first resolvable entry in a nested images array', () => {
    const map = { images: [{}, { data: 'Rk9P', mimeType: 'image/webp' }] };
    expect(resolveMapImageSource(map)).toBe('data:image/webp;base64,Rk9P');
  });

  it('returns null when no source can be resolved', () => {
    expect(resolveMapImageSource(null)).toBeNull();
    expect(resolveMapImageSource({})).toBeNull();
  });
});
