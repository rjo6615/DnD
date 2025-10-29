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

  it('supports image values provided directly as strings', () => {
    expect(resolveMapImageSource({ image: 'https://cdn.example.com/direct.png' })).toBe(
      'https://cdn.example.com/direct.png'
    );
  });

  it('treats standalone base64 strings as image data', () => {
    expect(resolveMapImageSource({ image: 'R0lGODdhAQABAIAAAAUEBA==' })).toBe(
      'data:image/png;base64,R0lGODdhAQABAIAAAAUEBA=='
    );
  });

  it('falls back to the first resolvable entry in a nested images array', () => {
    const map = { images: [{}, { data: 'Rk9P', mimeType: 'image/webp' }] };
    expect(resolveMapImageSource(map)).toBe('data:image/webp;base64,Rk9P');
  });

  it('supports string entries in nested image arrays', () => {
    const map = { images: ['   https://cdn.example.com/listed.png  '] };
    expect(resolveMapImageSource(map)).toBe('https://cdn.example.com/listed.png');
  });

  it('prefers nested mapImage definitions when available', () => {
    const map = { mapImage: { imageUrl: 'https://cdn.example.com/mapImage.jpg' } };
    expect(resolveMapImageSource(map)).toBe('https://cdn.example.com/mapImage.jpg');
  });

  it('returns plain strings that are not base64 as-is', () => {
    expect(resolveMapImageSource({ image: 'relative/path/to/image.png' })).toBe(
      'relative/path/to/image.png'
    );
  });

  it('returns null when no source can be resolved', () => {
    expect(resolveMapImageSource(null)).toBeNull();
    expect(resolveMapImageSource({})).toBeNull();
  });
});
