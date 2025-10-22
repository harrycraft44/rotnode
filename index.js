// Comprehensive ROT cipher module (CommonJS)
// Exports: rot, encode, decode, presets, createRotFunction

function normalizeShift(shift, modulus) {
  const s = Number(shift) || 0;
  if (!Number.isFinite(s)) return 0;
  return ((Math.trunc(s) % modulus) + modulus) % modulus;
}

const CHARSETS = {
  latinLower: 'abcdefghijklmnopqrstuvwxyz',
  latinUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  // printable ASCII 33 (!) to 126 (~) inclusive -> used for ROT47
  asciiPrintable: (() => {
    let out = '';
    for (let i = 33; i <= 126; i++) out += String.fromCharCode(i);
    return out;
  })(),
};

// Helper: rotate a single character in a given charset string
function rotateCharInCharset(ch, shift, charset) {
  const idx = charset.indexOf(ch);
  if (idx === -1) return ch;
  const s = normalizeShift(shift, charset.length);
  return charset[(idx + s) % charset.length];
}

// rot on a string, supports presets and named charsets
// Usage:
//   rot(text, 13, 'latin')            // default behavior: rotate letters (both cases) with shift 13
//   rot(text, { preset: 'rot47' })    // use a preset
//   rot(text, { shift: 5, charset: 'digits' }) // rotate digits
function rot(text, shiftOrOptions = 13, maybeCharset) {
  if (text === null || text === undefined) return '';
  const str = String(text);

  // normalize input options
  let shift = 13;
  let charset = maybeCharset || 'latin';
  let preset = null;
  if (typeof shiftOrOptions === 'object' && shiftOrOptions !== null) {
    shift = shiftOrOptions.shift ?? 13;
    charset = shiftOrOptions.charset ?? 'latin';
    preset = shiftOrOptions.preset ?? null;
  } else {
    shift = shiftOrOptions;
  }

  // Handle presets
  if (preset) {
    switch (String(preset).toLowerCase()) {
      case 'rot13':
        charset = 'latin';
        shift = 13;
        break;
      case 'rot5':
        charset = 'digits';
        shift = 5;
        break;
      case 'rot18':
        // rot13 for letters and rot5 for digits; handled specially
        return rot18(str);
      case 'rot47':
        charset = 'ascii';
        shift = 47;
        break;
      default:
        // allow preset like 'rotN' where N is a number
        {
          const m = String(preset).toLowerCase().match(/^rot(\d+)$/);
          if (m) {
            shift = Number(m[1]);
          }
        }
    }
  }

  if (charset === 'latin') {
    // rotate uppercase and lowercase independently
    const s = normalizeShift(shift, 26);
    if (s === 0) return str;
    let out = '';
    for (let ch of str) {
      if (ch >= 'A' && ch <= 'Z') {
        out += rotateCharInCharset(ch, s, CHARSETS.latinUpper);
      } else if (ch >= 'a' && ch <= 'z') {
        out += rotateCharInCharset(ch, s, CHARSETS.latinLower);
      } else {
        out += ch;
      }
    }
    return out;
  }

  if (charset === 'ascii') {
    // printable ASCII 33..126 (ROT47 typical)
    const s = normalizeShift(shift, CHARSETS.asciiPrintable.length);
    if (s === 0) return str;
    let out = '';
    for (let ch of str) {
      out += rotateCharInCharset(ch, s, CHARSETS.asciiPrintable);
    }
    return out;
  }

  // named single charsets: latinLower, latinUpper, digits
  if (CHARSETS[charset]) {
    const s = normalizeShift(shift, CHARSETS[charset].length);
    if (s === 0) return str;
    let out = '';
    for (let ch of str) {
      out += rotateCharInCharset(ch, s, CHARSETS[charset]);
    }
    return out;
  }

  // If charset is a custom string (explicit list of characters)
  if (typeof charset === 'string') {
    const set = charset;
    const s = normalizeShift(shift, set.length);
    if (s === 0) return str;
    let out = '';
    for (let ch of str) {
      out += rotateCharInCharset(ch, s, set);
    }
    return out;
  }

  // fallback: return input unchanged
  return str;
}

// Special case: rotate a string with rot18 behavior (rot13 on letters, rot5 on digits)
function rot18(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  let out = '';
  for (let ch of str) {
    if (ch >= 'A' && ch <= 'Z') out += rotateCharInCharset(ch, 13, CHARSETS.latinUpper);
    else if (ch >= 'a' && ch <= 'z') out += rotateCharInCharset(ch, 13, CHARSETS.latinLower);
    else if (ch >= '0' && ch <= '9') out += rotateCharInCharset(ch, 5, CHARSETS.digits);
    else out += ch;
  }
  return out;
}

function encode(text, shiftOrOptions = 13, charset) {
  return rot(text, shiftOrOptions, charset);
}

function decode(text, shiftOrOptions = 13, charset) {
  // If options object provided, invert shift, respecting preset logic for rot18/rot47
  if (typeof shiftOrOptions === 'object' && shiftOrOptions !== null) {
    const opts = Object.assign({}, shiftOrOptions);
    if (opts.preset) {
      const p = String(opts.preset).toLowerCase();
      if (p === 'rot18') return rot18(text); // symmetric
      if (p === 'rot47') return rot(text, { preset: 'rot47' }); // symmetric
      // other presets behave like simple shift
    }
    opts.shift = - (opts.shift ?? 13);
    return rot(text, opts);
  } else {
    // numeric shift provided
    if (typeof shiftOrOptions === 'number') {
      return rot(text, -shiftOrOptions, charset);
    }
    // fallback
    return rot(text, -13, charset);
  }
}

// Create a reusable rot function for a fixed charset & shift
function createRotFunction(shift, charset) {
  return function (text) {
    return rot(text, shift, charset);
  };
}

const presets = {
  rot13: (text) => rot(text, { preset: 'rot13' }),
  rot5: (text) => rot(text, { preset: 'rot5' }),
  rot18: (text) => rot(text, { preset: 'rot18' }),
  rot47: (text) => rot(text, { preset: 'rot47' }),
};

module.exports = {
  rot,
  encode,
  decode,
  createRotFunction,
  CHARSETS,
  presets,
};
