// node_modules/mediabunny/dist/modules/src/misc.js
function assert(x) {
  if (!x) {
    throw new Error("Assertion failed.");
  }
}
var DEG_TO_RAD = Math.PI / 180;
var RAD_TO_DEG = 180 / Math.PI;
var normalizeRotation = (rotation) => {
  const mappedRotation = (rotation % 360 + 360) % 360;
  if (mappedRotation === 0 || mappedRotation === 90 || mappedRotation === 180 || mappedRotation === 270) {
    return mappedRotation;
  } else {
    throw new Error(`Invalid rotation ${rotation}.`);
  }
};
var IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];
var centeredTransformationMatrix = (linear, width, height) => {
  const [a, b, , c, d] = linear;
  const transformedWidth = Math.abs(a) * width + Math.abs(c) * height;
  const transformedHeight = Math.abs(b) * width + Math.abs(d) * height;
  return multiplyMatrices(multiplyMatrices(translationMatrix(-width / 2, -height / 2), linear), translationMatrix(transformedWidth / 2, transformedHeight / 2));
};
var extractRotationFromMatrix = (matrix) => {
  const [a, b] = matrix;
  const radians = Math.atan2(b, matrixIsFlipped(matrix) ? -a : a);
  return normalizeRotation(roundToMultiple(radians * RAD_TO_DEG, 90));
};
var matrixIsFlipped = (matrix) => {
  const [a, b, , c, d] = matrix;
  const det = a * d - b * c;
  return det < 0;
};
var rotationMatrix = (rotationInDegrees) => {
  const theta = rotationInDegrees * DEG_TO_RAD;
  const cosTheta = Math.round(Math.cos(theta));
  const sinTheta = Math.round(Math.sin(theta));
  return [
    cosTheta,
    sinTheta,
    0,
    -sinTheta,
    cosTheta,
    0,
    0,
    0,
    1
  ];
};
var translationMatrix = (x, y) => {
  return [
    1,
    0,
    0,
    0,
    1,
    0,
    x,
    y,
    1
  ];
};
var scaleMatrix = (x, y) => {
  return [
    x,
    0,
    0,
    0,
    y,
    0,
    0,
    0,
    1
  ];
};
var multiplyMatrices = (a, b) => {
  const result = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
    }
  }
  return result;
};
var composeRotationAndFlip = (rotation1, flip1, rotation2, flip2) => {
  return {
    rotation: normalizeRotation(rotation1 + (flip1 ? -rotation2 : rotation2)),
    flip: flip1 !== flip2
  };
};
var last = (arr) => {
  return arr && arr[arr.length - 1];
};
var readExpGolomb = (bitstream) => {
  let leadingZeroBits = 0;
  while (bitstream.readBits(1) === 0 && leadingZeroBits < 32) {
    leadingZeroBits++;
  }
  if (leadingZeroBits >= 32) {
    throw new Error("Invalid exponential-Golomb code.");
  }
  const result = 2 ** leadingZeroBits - 1 + bitstream.readBits(leadingZeroBits);
  return result;
};
var writeExpGolomb = (bitstream, value) => {
  const codeNum = value + 1;
  const leadingZeroBits = Math.floor(Math.log2(codeNum));
  bitstream.writeBits(leadingZeroBits, 0);
  bitstream.writeBits(1, 1);
  bitstream.writeBits(leadingZeroBits, codeNum - 2 ** leadingZeroBits);
};
var readSignedExpGolomb = (bitstream) => {
  const codeNum = readExpGolomb(bitstream);
  return codeNum % 2 === 0 ? -(codeNum / 2) : (codeNum + 1) / 2;
};
var toUint8Array = (source) => {
  if (source.constructor === Uint8Array) {
    return source;
  } else if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  } else {
    return new Uint8Array(source);
  }
};
var toDataView = (source) => {
  if (source.constructor === DataView) {
    return source;
  } else if (ArrayBuffer.isView(source)) {
    return new DataView(source.buffer, source.byteOffset, source.byteLength);
  } else {
    return new DataView(source);
  }
};
var TextDecoder = /* @__PURE__ */ (() => typeof globalThis.TextDecoder !== "undefined" ? globalThis.TextDecoder : class TextDecoder {
  constructor(label = "utf-8") {
    const normalized = label.trim().toLowerCase();
    if (normalized === "utf-8" || normalized === "utf8" || normalized === "unicode-1-1-utf-8") {
      this.encoding = "utf-8";
    } else if (normalized === "utf-16le" || normalized === "utf-16") {
      this.encoding = "utf-16le";
    } else if (normalized === "utf-16be") {
      this.encoding = "utf-16be";
    } else {
      throw new RangeError(`The encoding label provided ('${label}') is invalid.`);
    }
  }
  decode(input2) {
    const bytes = input2 ? toUint8Array(input2) : new Uint8Array(0);
    const units = [];
    if (this.encoding === "utf-8") {
      let i = bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? 3 : 0;
      while (i < bytes.length) {
        const lead = bytes[i];
        if (lead < 128) {
          units.push(lead);
          i++;
          continue;
        }
        let continuationCount;
        let codePoint;
        if (lead >= 194 && lead < 224) {
          continuationCount = 1;
          codePoint = lead & 31;
        } else if (lead >= 224 && lead < 240) {
          continuationCount = 2;
          codePoint = lead & 15;
        } else if (lead >= 240 && lead < 245) {
          continuationCount = 3;
          codePoint = lead & 7;
        } else {
          units.push(65533);
          i++;
          continue;
        }
        let lowerBound = lead === 224 ? 160 : lead === 240 ? 144 : 128;
        let upperBound = lead === 237 ? 159 : lead === 244 ? 143 : 191;
        let j = 1;
        for (; j <= continuationCount; j++) {
          const byte = i + j < bytes.length ? bytes[i + j] : 0;
          if (byte < lowerBound || byte > upperBound) {
            break;
          }
          codePoint = codePoint << 6 | byte & 63;
          lowerBound = 128;
          upperBound = 191;
        }
        i += j;
        if (j <= continuationCount) {
          units.push(65533);
        } else if (codePoint >= 65536) {
          codePoint -= 65536;
          units.push(55296 | codePoint >> 10, 56320 | codePoint & 1023);
        } else {
          units.push(codePoint);
        }
      }
    } else {
      const littleEndian = this.encoding === "utf-16le";
      const bomLow = littleEndian ? 255 : 254;
      const bomHigh = littleEndian ? 254 : 255;
      let i = bytes.length >= 2 && bytes[0] === bomLow && bytes[1] === bomHigh ? 2 : 0;
      while (i + 1 < bytes.length) {
        const unit = littleEndian ? bytes[i] | bytes[i + 1] << 8 : bytes[i] << 8 | bytes[i + 1];
        i += 2;
        if (unit >= 55296 && unit <= 56319) {
          const next = i + 1 < bytes.length ? littleEndian ? bytes[i] | bytes[i + 1] << 8 : bytes[i] << 8 | bytes[i + 1] : -1;
          if (next >= 56320 && next <= 57343) {
            units.push(unit, next);
            i += 2;
          } else {
            units.push(65533);
            if (i + 1 === bytes.length) {
              i++;
            }
          }
        } else if (unit >= 56320 && unit <= 57343) {
          units.push(65533);
        } else {
          units.push(unit);
        }
      }
      if (i < bytes.length) {
        units.push(65533);
      }
    }
    let result = "";
    for (let i = 0; i < units.length; i += 8192) {
      result += String.fromCharCode(...units.slice(i, i + 8192));
    }
    return result;
  }
})();
var textDecoder = /* @__PURE__ */ new TextDecoder();
var strictTextDecoder = /* @__PURE__ */ new TextDecoder("utf-8", { fatal: true });
var invertObject = (object) => {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [value, key]));
};
var COLOR_PRIMARIES_MAP = {
  bt709: 1,
  // ITU-R BT.709
  bt470bg: 5,
  // ITU-R BT.470BG
  smpte170m: 6,
  // ITU-R BT.601 525 - SMPTE 170M
  bt2020: 9,
  // ITU-R BT.202
  smpte432: 12
  // SMPTE EG 432-1
};
var COLOR_PRIMARIES_MAP_INVERSE = /* @__PURE__ */ invertObject(COLOR_PRIMARIES_MAP);
var TRANSFER_CHARACTERISTICS_MAP = {
  "bt709": 1,
  // ITU-R BT.709
  "smpte170m": 6,
  // SMPTE 170M
  "linear": 8,
  // Linear transfer characteristics
  "iec61966-2-1": 13,
  // IEC 61966-2-1
  "pq": 16,
  // Rec. ITU-R BT.2100-2 perceptual quantization (PQ) system
  "hlg": 18
  // Rec. ITU-R BT.2100-2 hybrid loggamma (HLG) system
};
var TRANSFER_CHARACTERISTICS_MAP_INVERSE = /* @__PURE__ */ invertObject(TRANSFER_CHARACTERISTICS_MAP);
var MATRIX_COEFFICIENTS_MAP = {
  "rgb": 0,
  // Identity
  "bt709": 1,
  // ITU-R BT.709
  "bt470bg": 5,
  // ITU-R BT.470BG
  "smpte170m": 6,
  // SMPTE 170M
  "bt2020-ncl": 9
  // ITU-R BT.2020-2 (non-constant luminance)
};
var MATRIX_COEFFICIENTS_MAP_INVERSE = /* @__PURE__ */ invertObject(MATRIX_COEFFICIENTS_MAP);
var colorSpaceIsComplete = (colorSpace) => {
  return !!colorSpace && !!colorSpace.primaries && !!colorSpace.transfer && !!colorSpace.matrix && colorSpace.fullRange != null;
};
var EMPTY_COLOR_SPACE = {
  primaries: void 0,
  transfer: void 0,
  matrix: void 0,
  fullRange: void 0
};
var isAllowSharedBufferSource = (x) => {
  return x instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && x instanceof SharedArrayBuffer || ArrayBuffer.isView(x);
};
var AsyncMutex = class {
  constructor() {
    this.currentPromise = Promise.resolve();
    this.pending = 0;
  }
  async acquire() {
    let resolver;
    const nextPromise = new Promise((resolve) => {
      let resolved = false;
      resolver = () => {
        if (resolved) {
          return;
        }
        resolve();
        this.pending--;
        resolved = true;
      };
    });
    const currentPromiseAlias = this.currentPromise;
    this.currentPromise = nextPromise;
    this.pending++;
    await currentPromiseAlias;
    return resolver;
  }
};
var HEX_STRING_REGEX = /^[0-9a-fA-F]+$/;
var bytesToHexString = (bytes) => {
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
};
var hexStringToBytes = (hexString) => {
  assert(hexString.length % 2 === 0);
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.slice(i, i + 2), 16);
  }
  return bytes;
};
var reverseBitsU32 = (x) => {
  x = x >> 1 & 1431655765 | (x & 1431655765) << 1;
  x = x >> 2 & 858993459 | (x & 858993459) << 2;
  x = x >> 4 & 252645135 | (x & 252645135) << 4;
  x = x >> 8 & 16711935 | (x & 16711935) << 8;
  x = x >> 16 & 65535 | (x & 65535) << 16;
  return x >>> 0;
};
var binarySearchExact = (arr, key, valueGetter) => {
  let low = 0;
  let high = arr.length - 1;
  let ans = -1;
  while (low <= high) {
    const mid = low + high >> 1;
    const midVal = valueGetter(arr[mid]);
    if (midVal === key) {
      ans = mid;
      high = mid - 1;
    } else if (midVal < key) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
};
var binarySearchLessOrEqual = (arr, key, valueGetter) => {
  let low = 0;
  let high = arr.length - 1;
  let ans = -1;
  while (low <= high) {
    const mid = low + (high - low + 1) / 2 | 0;
    const midVal = valueGetter(arr[mid]);
    if (midVal <= key) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
};
var insertSorted = (arr, item, valueGetter) => {
  const insertionIndex = binarySearchLessOrEqual(arr, valueGetter(item), valueGetter);
  arr.splice(insertionIndex + 1, 0, item);
};
var promiseWithResolvers = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
var removeItem = (arr, item) => {
  const index = arr.indexOf(item);
  if (index !== -1) {
    arr.splice(index, 1);
  }
};
var findLast = (arr, predicate) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return arr[i];
    }
  }
  return void 0;
};
var findLastIndex = (arr, predicate) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i;
    }
  }
  return -1;
};
var toAsyncIterator = async function* (source) {
  if (Symbol.iterator in source) {
    yield* source[Symbol.iterator]();
  } else {
    yield* source[Symbol.asyncIterator]();
  }
};
var validateAnyIterable = (iterable) => {
  if (!(Symbol.iterator in iterable) && !(Symbol.asyncIterator in iterable)) {
    throw new TypeError("Argument must be an iterable or async iterable.");
  }
};
var assertNever = (x) => {
  throw new Error(`Unexpected value: ${x}`);
};
var getUint24 = (view, byteOffset, littleEndian) => {
  const byte1 = view.getUint8(byteOffset);
  const byte2 = view.getUint8(byteOffset + 1);
  const byte3 = view.getUint8(byteOffset + 2);
  if (littleEndian) {
    return byte1 | byte2 << 8 | byte3 << 16;
  } else {
    return byte1 << 16 | byte2 << 8 | byte3;
  }
};
var setUint24 = (view, byteOffset, value, littleEndian) => {
  value = value >>> 0;
  value = value & 16777215;
  if (littleEndian) {
    view.setUint8(byteOffset, value & 255);
    view.setUint8(byteOffset + 1, value >>> 8 & 255);
    view.setUint8(byteOffset + 2, value >>> 16 & 255);
  } else {
    view.setUint8(byteOffset, value >>> 16 & 255);
    view.setUint8(byteOffset + 1, value >>> 8 & 255);
    view.setUint8(byteOffset + 2, value & 255);
  }
};
var mapAsyncGenerator = (generator, map) => {
  return {
    async next() {
      const result = await generator.next();
      if (result.done) {
        return { value: void 0, done: true };
      }
      try {
        return { value: map(result.value), done: false };
      } catch (error) {
        await generator.return();
        throw error;
      }
    },
    return() {
      return generator.return();
    },
    throw(error) {
      return generator.throw(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
};
var clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};
var modEuclid = (value, modulus) => {
  return value - Math.floor(value / modulus) * modulus;
};
var UNDETERMINED_LANGUAGE = "und";
var roundIfAlmostInteger = (value) => {
  const rounded = Math.round(value);
  if (Math.abs(value / rounded - 1) < 10 * Number.EPSILON) {
    return rounded;
  } else {
    return value;
  }
};
var roundToMultiple = (value, multiple) => {
  return Math.round(value / multiple) * multiple;
};
var roundToDivisor = (value, multiple) => {
  return Math.round(value * multiple) / multiple;
};
var floorToMultiple = (value, multiple) => {
  return Math.floor(value / multiple) * multiple;
};
var ilog = (x) => {
  let ret = 0;
  while (x) {
    ret++;
    x >>= 1;
  }
  return ret;
};
var popcount = (value) => {
  let count = 0;
  while (value !== 0) {
    value &= value - 1;
    count++;
  }
  return count;
};
var ISO_639_2_REGEX = /^[a-z]{3}$/;
var isIso639Dash2LanguageCode = (x) => {
  return ISO_639_2_REGEX.test(x);
};
var SECOND_TO_MICROSECOND_FACTOR = 1e6 * (1 + Number.EPSILON);
var CallSerializer = class {
  constructor() {
    this.currentPromise = Promise.resolve();
  }
  call(fn) {
    const result = this.currentPromise.then(fn);
    this.currentPromise = result.catch(() => {
    });
    return result;
  }
};
var isWebKitCache = null;
var isWebKit = () => {
  if (isWebKitCache !== null) {
    return isWebKitCache;
  }
  return isWebKitCache = !!(typeof navigator !== "undefined" && // eslint-disable-next-line @typescript-eslint/no-deprecated
  (navigator.vendor?.match(/apple/i) || /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) || /\b(iPad|iPhone|iPod)\b/.test(navigator.userAgent)));
};
var isFirefoxCache = null;
var isFirefox = () => {
  if (isFirefoxCache !== null) {
    return isFirefoxCache;
  }
  return isFirefoxCache = typeof navigator !== "undefined" && navigator.userAgent?.includes("Firefox");
};
var isChromiumCache = null;
var isChromium = () => {
  if (isChromiumCache !== null) {
    return isChromiumCache;
  }
  return isChromiumCache = !!(typeof navigator !== "undefined" && (navigator.vendor?.includes("Google Inc") || /Chrome/.test(navigator.userAgent)));
};
var isAndroidCache = null;
var isAndroid = () => {
  if (isAndroidCache !== null) {
    return isAndroidCache;
  }
  return isAndroidCache = typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
};
var missingWebCodecsClassMessage = (className) => {
  if (typeof globalThis.isSecureContext !== "undefined" && !globalThis.isSecureContext) {
    return `${className} is not available in this environment; this may be because this page is running in an insecure context. Try serving your page over HTTPS or use localhost.`;
  }
  return `${className} is not available in this environment.`;
};
var NativePromiseConstructor = /* @__PURE__ */ (() => (async () => {
})().constructor)();
var isThenable = (value) => {
  if (value instanceof NativePromiseConstructor || value instanceof Promise) {
    return true;
  }
  return typeof value?.then === "function";
};
var coalesceIndex = (a, b) => {
  return a !== -1 ? a : b;
};
var closedIntervalsOverlap = (startA, endA, startB, endB) => {
  return startA <= endB && startB <= endA;
};
var base64ToBytes = (base64) => {
  let decoded;
  try {
    decoded = atob(base64);
  } catch {
    throw new Error("Invalid base64 string.");
  }
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
};
var uint8ArraysAreEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
var polyfillSymbolDispose = () => {
  Symbol.dispose ??= /* @__PURE__ */ Symbol("Symbol.dispose");
};
var isNumber = (x) => {
  return typeof x === "number" && !Number.isNaN(x);
};
var joinPaths = (basePath, relativePath) => {
  if (/^(?:[a-z][a-z0-9+.-]*:\/\/|(?:data|blob):)/i.test(relativePath)) {
    return relativePath;
  }
  if (basePath.includes("://")) {
    const queryIndex = basePath.search(/[?#]/);
    if (queryIndex !== -1) {
      basePath = basePath.slice(0, queryIndex);
    }
  }
  const suffixIndex = relativePath.search(/[?#]/);
  const suffix = suffixIndex === -1 ? "" : relativePath.slice(suffixIndex);
  if (suffixIndex !== -1) {
    relativePath = relativePath.slice(0, suffixIndex);
  }
  let result;
  if (relativePath === "") {
    result = basePath;
  } else if (relativePath.startsWith("/")) {
    const protocolIndex2 = basePath.indexOf("://");
    if (protocolIndex2 === -1) {
      result = relativePath;
    } else if (relativePath.startsWith("//")) {
      result = basePath.slice(0, protocolIndex2 + 1) + relativePath;
    } else {
      const pathStart = basePath.indexOf("/", protocolIndex2 + 3);
      if (pathStart === -1) {
        result = basePath + relativePath;
      } else {
        result = basePath.slice(0, pathStart) + relativePath;
      }
    }
  } else {
    const protocolIndex2 = basePath.indexOf("://");
    const lastSlash = basePath.lastIndexOf("/");
    if (protocolIndex2 !== -1 && lastSlash === protocolIndex2 + 2) {
      result = basePath + "/" + relativePath;
    } else if (lastSlash === -1) {
      result = relativePath;
    } else {
      result = basePath.slice(0, lastSlash + 1) + relativePath;
    }
  }
  let prefix = "";
  const protocolIndex = result.indexOf("://");
  if (protocolIndex !== -1) {
    const pathStart = result.indexOf("/", protocolIndex + 3);
    if (pathStart !== -1) {
      prefix = result.slice(0, pathStart);
      result = result.slice(pathStart);
    }
  }
  const segments = result.split("/");
  const normalized = [];
  for (const segment of segments) {
    if (segment === "..") {
      if (normalized.length === 0 || normalized[normalized.length - 1] === "..") {
        normalized.push("..");
      } else if (normalized.length !== 1 || normalized[0] !== "") {
        normalized.pop();
      }
    } else if (segment !== ".") {
      normalized.push(segment);
    }
  }
  return prefix + normalized.join("/") + suffix;
};
var getQueryParameter = (path, name) => {
  const fragmentIndex = path.indexOf("#");
  const pathWithoutFragment = fragmentIndex === -1 ? path : path.slice(0, fragmentIndex);
  const queryIndex = pathWithoutFragment.indexOf("?");
  if (queryIndex === -1) {
    return null;
  }
  return new URLSearchParams(pathWithoutFragment.slice(queryIndex + 1)).get(name);
};
var arrayCount = (array, predicate) => {
  let count = 0;
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      count++;
    }
  }
  return count;
};
var arrayArgmin = (array, getValue) => {
  let minIndex = -1;
  let minValue = Infinity;
  for (let i = 0; i < array.length; i++) {
    const value = getValue(array[i]);
    if (minIndex === -1 || value < minValue) {
      minValue = value;
      minIndex = i;
    }
  }
  return minIndex;
};
var simplifyRational = (rational) => {
  assert(Number.isInteger(rational.num));
  assert(Number.isInteger(rational.den));
  assert(rational.den !== 0);
  let a = Math.abs(rational.num);
  let b = Math.abs(rational.den);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  const gcd = a || 1;
  return {
    num: rational.num / gcd,
    den: rational.den / gcd
  };
};
var validateRectangle = (rect, propertyPath) => {
  if (typeof rect !== "object" || !rect) {
    throw new TypeError(`${propertyPath} must be an object.`);
  }
  if (!Number.isInteger(rect.left) || rect.left < 0) {
    throw new TypeError(`${propertyPath}.left must be a non-negative integer.`);
  }
  if (!Number.isInteger(rect.top) || rect.top < 0) {
    throw new TypeError(`${propertyPath}.top must be a non-negative integer.`);
  }
  if (!Number.isInteger(rect.width) || rect.width < 0) {
    throw new TypeError(`${propertyPath}.width must be a non-negative integer.`);
  }
  if (!Number.isInteger(rect.height) || rect.height < 0) {
    throw new TypeError(`${propertyPath}.height must be a non-negative integer.`);
  }
};
var wait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var toArray = (x) => {
  if (Array.isArray(x)) {
    return x;
  } else {
    return [x];
  }
};
var EventEmitter = class {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  /** Registers a listener for the given event. Returns a function that, when called, removes the listener again. */
  on(event, listener, options) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, /* @__PURE__ */ new Set());
    }
    const entry = { fn: listener, once: options?.once ?? false };
    this._listeners.get(event).add(entry);
    return () => {
      this._listeners.get(event)?.delete(entry);
    };
  }
  /** @internal */
  _emit(...args) {
    const [event, data] = args;
    const listeners = this._listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const entry of [...listeners]) {
      if (!listeners.has(entry)) {
        continue;
      }
      if (entry.once) {
        listeners.delete(entry);
      }
      try {
        entry.fn(data);
      } catch (error) {
        console.error(error);
      }
    }
  }
};
var createUtcDate = (year, monthIndex = 0, day = 1) => {
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
};
var ISO_SUFFIX_REGEX = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?)?)?)?(?:Z|([+-])(\d{2})(?::?(\d{2}))?)?$/;
var parseIsoSuffix = (text) => {
  const match = ISO_SUFFIX_REGEX.exec(text);
  if (!match) {
    return null;
  }
  const [, year, month = "01", day = "01", hours = "00", minutes = "00", seconds = "00", fraction = "", offsetSign = "+", offsetHours = "00", offsetMinutes = "00"] = match;
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  const date = /* @__PURE__ */ new Date(`${isoString}.${fraction.padEnd(3, "0").slice(0, 3)}Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(isoString) || Number(offsetHours) > 23 || Number(offsetMinutes) > 59) {
    return null;
  }
  const offsetInMinutes = (offsetSign === "-" ? -1 : 1) * (60 * Number(offsetHours) + Number(offsetMinutes));
  date.setTime(date.getTime() - 6e4 * offsetInMinutes);
  return date;
};

// node_modules/mediabunny/dist/modules/src/logging.js
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["Silent"] = 0] = "Silent";
  LogLevel2[LogLevel2["Errors"] = 1] = "Errors";
  LogLevel2[LogLevel2["Warnings"] = 2] = "Warnings";
  LogLevel2[LogLevel2["Info"] = 3] = "Info";
})(LogLevel || (LogLevel = {}));
var Logging = class _Logging {
  constructor() {
  }
  /** The current log level. Defaults to {@link LogLevel.Info}. */
  static get level() {
    return _Logging._level;
  }
  static set level(value) {
    if (value !== LogLevel.Silent && value !== LogLevel.Errors && value !== LogLevel.Warnings && value !== LogLevel.Info) {
      throw new TypeError("Invalid log level. Use one of the values of the LogLevel enum.");
    }
    _Logging._level = value;
  }
  /** @internal */
  static get _emitter() {
    return _Logging._emitterInstance ??= new EventEmitter();
  }
  /** Registers a listener for a log event. Returns a function that, when called, removes the listener again. */
  static on(event, listener, options) {
    return _Logging._emitter.on(event, listener, options);
  }
  /** @internal */
  static _error(...args) {
    _Logging._emitter._emit("error", args);
    if (_Logging._level >= LogLevel.Errors) {
      console.error(...args);
    }
  }
  /** @internal */
  static _warn(...args) {
    _Logging._emitter._emit("warn", args);
    if (_Logging._level >= LogLevel.Warnings) {
      console.warn(...args);
    }
  }
  /** @internal */
  static _info(...args) {
    _Logging._emitter._emit("info", args);
    if (_Logging._level >= LogLevel.Info) {
      console.info(...args);
    }
  }
};
Logging._level = LogLevel.Info;
Logging._emitterInstance = null;

// node_modules/mediabunny/dist/modules/src/metadata.js
var RichImageData = class {
  /** Creates a new {@link RichImageData}. */
  constructor(data, mimeType) {
    this.data = data;
    this.mimeType = mimeType;
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (typeof mimeType !== "string") {
      throw new TypeError("mimeType must be a string.");
    }
  }
};
var AttachedFile = class {
  /** Creates a new {@link AttachedFile}. */
  constructor(data, mimeType, name, description) {
    this.data = data;
    this.mimeType = mimeType;
    this.name = name;
    this.description = description;
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (mimeType !== void 0 && typeof mimeType !== "string") {
      throw new TypeError("mimeType, when provided, must be a string.");
    }
    if (name !== void 0 && typeof name !== "string") {
      throw new TypeError("name, when provided, must be a string.");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new TypeError("description, when provided, must be a string.");
    }
  }
};
var DEFAULT_TRACK_DISPOSITION = {
  default: true,
  primary: true,
  forced: false,
  original: false,
  commentary: false,
  hearingImpaired: false,
  visuallyImpaired: false
};

// node_modules/mediabunny/dist/modules/shared/bitstream.js
var Bitstream = class _Bitstream {
  constructor(bytes) {
    this.bytes = bytes;
    this.pos = 0;
  }
  seekToByte(byteOffset) {
    this.pos = 8 * byteOffset;
  }
  readBit() {
    const byteIndex = Math.floor(this.pos / 8);
    const byte = this.bytes[byteIndex] ?? 0;
    const bitIndex = 7 - (this.pos & 7);
    const bit = (byte & 1 << bitIndex) >> bitIndex;
    this.pos++;
    return bit;
  }
  readBits(n) {
    if (n === 1) {
      return this.readBit();
    }
    let result = 0;
    for (let i = 0; i < n; i++) {
      result = 2 * result + this.readBit();
    }
    return result;
  }
  writeBits(n, value) {
    const end = this.pos + n;
    for (let i = this.pos; i < end; i++) {
      const byteIndex = Math.floor(i / 8);
      let byte = this.bytes[byteIndex];
      const bitIndex = 7 - (i & 7);
      const bit = Math.floor(value / 2 ** (end - i - 1)) & 1;
      byte &= ~(1 << bitIndex);
      byte |= bit << bitIndex;
      this.bytes[byteIndex] = byte;
    }
    this.pos = end;
  }
  copyBits(n, other) {
    let i = 0;
    for (i; i < n - 7; i += 8) {
      this.writeBits(8, other.readBits(8));
    }
    const leftover = n - i;
    if (leftover > 0) {
      this.writeBits(leftover, other.readBits(leftover));
    }
  }
  readAlignedByte() {
    if (this.pos % 8 !== 0) {
      throw new Error("Bitstream is not byte-aligned.");
    }
    const byteIndex = this.pos / 8;
    const byte = this.bytes[byteIndex] ?? 0;
    this.pos += 8;
    return byte;
  }
  skipBits(n) {
    this.pos += n;
  }
  getBitsLeft() {
    return this.bytes.length * 8 - this.pos;
  }
  clone() {
    const clone = new _Bitstream(this.bytes);
    clone.pos = this.pos;
    return clone;
  }
};

// node_modules/mediabunny/dist/modules/shared/aac-misc.js
var aacFrequencyTable = [
  96e3,
  88200,
  64e3,
  48e3,
  44100,
  32e3,
  24e3,
  22050,
  16e3,
  12e3,
  11025,
  8e3,
  7350
];
var aacChannelMap = [-1, 1, 2, 3, 4, 5, 6, 8];
var generalAudioObjectTypes = [1, 2, 3, 4, 6, 7, 17, 19, 20, 21, 22];
var parseAacAudioSpecificConfig = (bytes) => {
  if (!bytes || bytes.byteLength < 2) {
    throw new TypeError("AAC description must be at least 2 bytes long.");
  }
  const bitstream = new Bitstream(bytes);
  const objectType = readAacObjectType(bitstream);
  const { frequencyIndex, sampleRate } = readAacSamplingFrequency(bitstream);
  const channelConfiguration = bitstream.readBits(4);
  let numberOfChannels = null;
  if (channelConfiguration >= 1 && channelConfiguration <= 7) {
    numberOfChannels = aacChannelMap[channelConfiguration];
  }
  let coreObjectType = objectType;
  let psPresent = false;
  let outputSampleRate = sampleRate;
  if (objectType === 5 || objectType === 29) {
    psPresent = objectType === 29;
    outputSampleRate = readAacSamplingFrequency(bitstream).sampleRate;
    coreObjectType = readAacObjectType(bitstream);
    if (coreObjectType === 22) {
      bitstream.skipBits(4);
    }
  }
  let frameLength = 1024;
  let programConfigElement = null;
  if (generalAudioObjectTypes.includes(coreObjectType)) {
    frameLength = bitstream.readBits(1) ? 960 : 1024;
    if (channelConfiguration === 0) {
      if (bitstream.readBits(1)) {
        bitstream.skipBits(14);
      }
      bitstream.skipBits(1);
      programConfigElement = readAacProgramConfigElement(bitstream);
      numberOfChannels = getAacProgramConfigElementChannelCount(programConfigElement);
    }
  }
  if (objectType !== 5 && objectType !== 29) {
    while (bitstream.getBitsLeft() > 15) {
      const searchStart = bitstream.pos;
      if (bitstream.readBits(11) !== 695) {
        bitstream.pos = searchStart + 1;
        continue;
      }
      if (readAacObjectType(bitstream) === 5 && bitstream.readBits(1)) {
        outputSampleRate = readAacSamplingFrequency(bitstream).sampleRate;
        if (bitstream.getBitsLeft() > 11 && bitstream.readBits(11) === 1352) {
          psPresent = !!bitstream.readBits(1);
        }
      }
      break;
    }
  }
  if (numberOfChannels !== null && numberOfChannels > 1) {
    psPresent = false;
  }
  return {
    objectType,
    coreObjectType,
    frequencyIndex,
    channelConfiguration,
    coreSampleRate: sampleRate,
    outputSampleRate,
    outputNumberOfChannels: psPresent && numberOfChannels === 1 ? 2 : numberOfChannels,
    frameLength,
    programConfigElement
  };
};
var readAacObjectType = (bitstream) => {
  const objectType = bitstream.readBits(5);
  return objectType === 31 ? 32 + bitstream.readBits(6) : objectType;
};
var readAacSamplingFrequency = (bitstream) => {
  const frequencyIndex = bitstream.readBits(4);
  if (frequencyIndex === 15) {
    return {
      frequencyIndex,
      sampleRate: bitstream.readBits(24)
    };
  }
  return {
    frequencyIndex,
    sampleRate: frequencyIndex < aacFrequencyTable.length ? aacFrequencyTable[frequencyIndex] : null
  };
};
var buildAacAudioSpecificConfig = (config) => {
  const usesSbr = config.objectType === 5 || config.objectType === 29;
  const usesPs = config.objectType === 29;
  const coreSampleRate = usesSbr ? config.outputSampleRate / 2 : config.outputSampleRate;
  const coreNumberOfChannels = usesPs ? 1 : config.outputNumberOfChannels;
  const channelConfiguration = config.programConfigElement ? 0 : aacChannelMap.indexOf(coreNumberOfChannels);
  if (channelConfiguration === -1) {
    throw new TypeError(`Unsupported number of channels: ${config.outputNumberOfChannels}`);
  }
  let bitCount = 5 + 4 + 4 + 3;
  if (config.objectType >= 32) {
    bitCount += 6;
  }
  if (findAacFrequencyIndex(coreSampleRate) === 15) {
    bitCount += 24;
  }
  if (usesSbr) {
    bitCount += 4 + 5;
    if (findAacFrequencyIndex(config.outputSampleRate) === 15) {
      bitCount += 24;
    }
  }
  const byteCount = Math.ceil(bitCount / 8) + (config.programConfigElement ? getMaxPceByteLength(config.programConfigElement) : 0);
  const bytes = new Uint8Array(byteCount);
  const bitstream = new Bitstream(bytes);
  writeAacObjectType(bitstream, config.objectType);
  writeAacSamplingFrequency(bitstream, coreSampleRate);
  bitstream.writeBits(4, channelConfiguration);
  if (usesSbr) {
    writeAacSamplingFrequency(bitstream, config.outputSampleRate);
    writeAacObjectType(bitstream, 2);
  }
  bitstream.writeBits(3, 0);
  if (config.programConfigElement) {
    writeAacProgramConfigElement(bitstream, config.programConfigElement);
  }
  return bytes.subarray(0, Math.ceil(bitstream.pos / 8));
};
var writeAacObjectType = (bitstream, objectType) => {
  if (objectType < 32) {
    bitstream.writeBits(5, objectType);
  } else {
    bitstream.writeBits(5, 31);
    bitstream.writeBits(6, objectType - 32);
  }
};
var writeAacSamplingFrequency = (bitstream, sampleRate) => {
  const frequencyIndex = findAacFrequencyIndex(sampleRate);
  bitstream.writeBits(4, frequencyIndex);
  if (frequencyIndex === 15) {
    bitstream.writeBits(24, sampleRate);
  }
};
var findAacFrequencyIndex = (sampleRate) => {
  const index = aacFrequencyTable.indexOf(sampleRate);
  return index === -1 ? 15 : index;
};
var getMaxPceByteLength = (programConfigElement) => {
  return 64 + programConfigElement.comment.byteLength;
};
var writeAacProgramConfigElement = (bitstream, pce) => {
  bitstream.writeBits(4, pce.elementInstanceTag);
  bitstream.writeBits(2, pce.objectType);
  bitstream.writeBits(4, pce.samplingFrequencyIndex);
  bitstream.writeBits(4, pce.frontElements.length);
  bitstream.writeBits(4, pce.sideElements.length);
  bitstream.writeBits(4, pce.backElements.length);
  bitstream.writeBits(2, pce.lfeElementTags.length);
  bitstream.writeBits(3, pce.assocDataElementTags.length);
  bitstream.writeBits(4, pce.ccElements.length);
  bitstream.writeBits(1, +(pce.monoMixdownElementNumber !== null));
  if (pce.monoMixdownElementNumber !== null) {
    bitstream.writeBits(4, pce.monoMixdownElementNumber);
  }
  bitstream.writeBits(1, +(pce.stereoMixdownElementNumber !== null));
  if (pce.stereoMixdownElementNumber !== null) {
    bitstream.writeBits(4, pce.stereoMixdownElementNumber);
  }
  bitstream.writeBits(1, +(pce.matrixMixdown !== null));
  if (pce.matrixMixdown) {
    bitstream.writeBits(2, pce.matrixMixdown.index);
    bitstream.writeBits(1, +pce.matrixMixdown.pseudoSurroundEnabled);
  }
  for (const element of [...pce.frontElements, ...pce.sideElements, ...pce.backElements]) {
    bitstream.writeBits(1, +element.isCpe);
    bitstream.writeBits(4, element.tagSelect);
  }
  for (const tag of [...pce.lfeElementTags, ...pce.assocDataElementTags]) {
    bitstream.writeBits(4, tag);
  }
  for (const element of pce.ccElements) {
    bitstream.writeBits(1, +element.isIndependentlySwitched);
    bitstream.writeBits(4, element.tagSelect);
  }
  bitstream.pos = 8 * Math.ceil(bitstream.pos / 8);
  bitstream.writeBits(8, pce.comment.byteLength);
  bitstream.bytes.set(pce.comment, bitstream.pos / 8);
  bitstream.pos += 8 * pce.comment.byteLength;
};
var readAdtsProgramConfigElement = (rawDataBlock) => {
  const bitstream = new Bitstream(rawDataBlock);
  if (bitstream.readBits(3) !== 5) {
    return null;
  }
  const programConfigElement = readAacProgramConfigElement(bitstream);
  const size = bitstream.pos / 8;
  if (size > rawDataBlock.byteLength) {
    throw new Error("Invalid ADTS frame: its program config element extends past the end of the frame.");
  }
  return {
    programConfigElement,
    size
    // In bytes, within the raw data block
  };
};
var readAacProgramConfigElement = (bitstream) => {
  const elementInstanceTag = bitstream.readBits(4);
  const objectType = bitstream.readBits(2);
  const samplingFrequencyIndex = bitstream.readBits(4);
  const frontElementCount = bitstream.readBits(4);
  const sideElementCount = bitstream.readBits(4);
  const backElementCount = bitstream.readBits(4);
  const lfeElementCount = bitstream.readBits(2);
  const assocDataElementCount = bitstream.readBits(3);
  const ccElementCount = bitstream.readBits(4);
  const monoMixdownElementNumber = bitstream.readBits(1) ? bitstream.readBits(4) : null;
  const stereoMixdownElementNumber = bitstream.readBits(1) ? bitstream.readBits(4) : null;
  const matrixMixdown = bitstream.readBits(1) ? {
    index: bitstream.readBits(2),
    pseudoSurroundEnabled: !!bitstream.readBits(1)
  } : null;
  const readChannelElements = (count) => Array.from({ length: count }, () => ({
    isCpe: !!bitstream.readBits(1),
    tagSelect: bitstream.readBits(4)
  }));
  const frontElements = readChannelElements(frontElementCount);
  const sideElements = readChannelElements(sideElementCount);
  const backElements = readChannelElements(backElementCount);
  const lfeElementTags = Array.from({ length: lfeElementCount }, () => bitstream.readBits(4));
  const assocDataElementTags = Array.from({ length: assocDataElementCount }, () => bitstream.readBits(4));
  const ccElements = Array.from({ length: ccElementCount }, () => ({
    isIndependentlySwitched: !!bitstream.readBits(1),
    tagSelect: bitstream.readBits(4)
  }));
  bitstream.pos = 8 * Math.ceil(bitstream.pos / 8);
  const commentLength = bitstream.readBits(8);
  const comment = bitstream.bytes.slice(bitstream.pos / 8, bitstream.pos / 8 + commentLength);
  bitstream.pos += 8 * commentLength;
  return {
    elementInstanceTag,
    objectType,
    samplingFrequencyIndex,
    frontElements,
    sideElements,
    backElements,
    lfeElementTags,
    assocDataElementTags,
    ccElements,
    monoMixdownElementNumber,
    stereoMixdownElementNumber,
    matrixMixdown,
    comment
  };
};
var getAacProgramConfigElementChannelCount = (pce) => {
  const elements = [...pce.frontElements, ...pce.sideElements, ...pce.backElements];
  return elements.reduce((count, element) => count + (element.isCpe ? 2 : 1), pce.lfeElementTags.length);
};

// node_modules/mediabunny/dist/modules/shared/mp3-misc.js
var MP3_FRAME_HEADER_SIZE = 4;
var MP3_DECODER_DELAY = 529;
var SAMPLING_RATES = [44100, 48e3, 32e3];
var KILOBIT_RATES = [
  // lowSamplingFrequency === 0
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  // layer = 0
  -1,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  -1,
  // layer 1
  -1,
  32,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  384,
  -1,
  // layer = 2
  -1,
  32,
  64,
  96,
  128,
  160,
  192,
  224,
  256,
  288,
  320,
  352,
  384,
  416,
  448,
  -1,
  // layer = 3
  // lowSamplingFrequency === 1
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  // layer = 0
  -1,
  8,
  16,
  24,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160,
  -1,
  // layer = 1
  -1,
  8,
  16,
  24,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160,
  -1,
  // layer = 2
  -1,
  32,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160,
  176,
  192,
  224,
  256,
  -1
  // layer = 3
];
var XING = 1483304551;
var INFO = 1231971951;
var VBRI = 1447187017;
var computeMp3FrameSize = (lowSamplingFrequency, layer, bitrate, sampleRate, padding) => {
  if (layer === 0) {
    return 0;
  } else if (layer === 1) {
    return Math.floor(144 * bitrate / (sampleRate << lowSamplingFrequency)) + padding;
  } else if (layer === 2) {
    return Math.floor(144 * bitrate / sampleRate) + padding;
  } else {
    return (Math.floor(12 * bitrate / sampleRate) + padding) * 4;
  }
};
var computeAverageMp3FrameSize = (lowSamplingFrequency, layer, bitrate, sampleRate) => {
  if (layer === 0) {
    return 0;
  } else if (layer === 1) {
    return 144 * bitrate / (sampleRate << lowSamplingFrequency);
  } else if (layer === 2) {
    return 144 * bitrate / sampleRate;
  } else {
    return 12 * bitrate / sampleRate * 4;
  }
};
var getXingOffset = (mpegVersionId, channel) => {
  return mpegVersionId === 3 ? channel === 3 ? 21 : 36 : channel === 3 ? 13 : 21;
};
var readMp3FrameHeader = (word, remainingBytes) => {
  const firstByte = word >>> 24;
  const secondByte = word >>> 16 & 255;
  const thirdByte = word >>> 8 & 255;
  const fourthByte = word & 255;
  if (firstByte !== 255 && secondByte !== 255 && thirdByte !== 255 && fourthByte !== 255) {
    return {
      header: null,
      bytesAdvanced: 4
    };
  }
  if (firstByte !== 255) {
    return { header: null, bytesAdvanced: 1 };
  }
  if ((secondByte & 224) !== 224) {
    return { header: null, bytesAdvanced: 1 };
  }
  let lowSamplingFrequency = 0;
  let mpeg25 = 0;
  if (secondByte & 1 << 4) {
    lowSamplingFrequency = secondByte & 1 << 3 ? 0 : 1;
  } else {
    lowSamplingFrequency = 1;
    mpeg25 = 1;
  }
  const mpegVersionId = secondByte >> 3 & 3;
  const layer = secondByte >> 1 & 3;
  const bitrateIndex = thirdByte >> 4 & 15;
  const frequencyIndex = thirdByte >> 2 & 3;
  if (mpegVersionId === 1 || frequencyIndex === 3) {
    return { header: null, bytesAdvanced: 1 };
  }
  const padding = thirdByte >> 1 & 1;
  const channel = fourthByte >> 6 & 3;
  const modeExtension = fourthByte >> 4 & 3;
  const copyright = fourthByte >> 3 & 1;
  const original = fourthByte >> 2 & 1;
  const emphasis = fourthByte & 3;
  const kilobitRate = KILOBIT_RATES[lowSamplingFrequency * 16 * 4 + layer * 16 + bitrateIndex];
  if (kilobitRate === -1) {
    return { header: null, bytesAdvanced: 1 };
  }
  const bitrate = kilobitRate * 1e3;
  const sampleRate = SAMPLING_RATES[frequencyIndex] >> lowSamplingFrequency + mpeg25;
  const frameLength = computeMp3FrameSize(lowSamplingFrequency, layer, bitrate, sampleRate, padding);
  if (remainingBytes !== null && remainingBytes < frameLength) {
    return { header: null, bytesAdvanced: 1 };
  }
  let audioSamplesInFrame;
  if (mpegVersionId === 3) {
    audioSamplesInFrame = layer === 3 ? 384 : 1152;
  } else {
    if (layer === 3) {
      audioSamplesInFrame = 384;
    } else if (layer === 2) {
      audioSamplesInFrame = 1152;
    } else {
      audioSamplesInFrame = 576;
    }
  }
  return {
    header: {
      totalSize: frameLength,
      mpegVersionId,
      lowSamplingFrequency,
      layer,
      bitrate,
      frequencyIndex,
      sampleRate,
      channel,
      modeExtension,
      copyright,
      original,
      emphasis,
      audioSamplesInFrame
    },
    bytesAdvanced: 1
  };
};
var decodeSynchsafe = (synchsafed) => {
  let mask = 2130706432;
  let unsynchsafed = 0;
  while (mask !== 0) {
    unsynchsafed >>= 1;
    unsynchsafed |= synchsafed & mask;
    mask >>= 8;
  }
  return unsynchsafed;
};
var XingFlags;
(function(XingFlags2) {
  XingFlags2[XingFlags2["FrameCount"] = 1] = "FrameCount";
  XingFlags2[XingFlags2["FileSize"] = 2] = "FileSize";
  XingFlags2[XingFlags2["Toc"] = 4] = "Toc";
  XingFlags2[XingFlags2["Quality"] = 8] = "Quality";
})(XingFlags || (XingFlags = {}));
var getMp3ChannelCount = (channel) => {
  return channel === 3 ? 1 : 2;
};

// node_modules/mediabunny/dist/modules/shared/ac3-misc.js
var AC3_SAMPLE_RATES = [48e3, 44100, 32e3];
var EAC3_REDUCED_SAMPLE_RATES = [24e3, 22050, 16e3];

// node_modules/mediabunny/dist/modules/shared/truehd-misc.js
var TRUEHD_MAJOR_SYNC_WORD = 4168249274;

// node_modules/mediabunny/dist/modules/src/codec-data.js
var AvcNalUnitType;
(function(AvcNalUnitType2) {
  AvcNalUnitType2[AvcNalUnitType2["NON_IDR_SLICE"] = 1] = "NON_IDR_SLICE";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPA"] = 2] = "SLICE_DPA";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPB"] = 3] = "SLICE_DPB";
  AvcNalUnitType2[AvcNalUnitType2["SLICE_DPC"] = 4] = "SLICE_DPC";
  AvcNalUnitType2[AvcNalUnitType2["IDR"] = 5] = "IDR";
  AvcNalUnitType2[AvcNalUnitType2["SEI"] = 6] = "SEI";
  AvcNalUnitType2[AvcNalUnitType2["SPS"] = 7] = "SPS";
  AvcNalUnitType2[AvcNalUnitType2["PPS"] = 8] = "PPS";
  AvcNalUnitType2[AvcNalUnitType2["AUD"] = 9] = "AUD";
  AvcNalUnitType2[AvcNalUnitType2["SPS_EXT"] = 13] = "SPS_EXT";
})(AvcNalUnitType || (AvcNalUnitType = {}));
var HevcNalUnitType;
(function(HevcNalUnitType2) {
  HevcNalUnitType2[HevcNalUnitType2["RASL_N"] = 8] = "RASL_N";
  HevcNalUnitType2[HevcNalUnitType2["RASL_R"] = 9] = "RASL_R";
  HevcNalUnitType2[HevcNalUnitType2["BLA_W_LP"] = 16] = "BLA_W_LP";
  HevcNalUnitType2[HevcNalUnitType2["RSV_IRAP_VCL23"] = 23] = "RSV_IRAP_VCL23";
  HevcNalUnitType2[HevcNalUnitType2["VPS_NUT"] = 32] = "VPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["SPS_NUT"] = 33] = "SPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["PPS_NUT"] = 34] = "PPS_NUT";
  HevcNalUnitType2[HevcNalUnitType2["AUD_NUT"] = 35] = "AUD_NUT";
  HevcNalUnitType2[HevcNalUnitType2["PREFIX_SEI_NUT"] = 39] = "PREFIX_SEI_NUT";
  HevcNalUnitType2[HevcNalUnitType2["SUFFIX_SEI_NUT"] = 40] = "SUFFIX_SEI_NUT";
})(HevcNalUnitType || (HevcNalUnitType = {}));
var iterateNalUnitsInAnnexB = function* (packetData) {
  let i = 0;
  let nalStart = -1;
  while (i < packetData.length - 2) {
    const zeroIndex = packetData.indexOf(0, i);
    if (zeroIndex === -1 || zeroIndex >= packetData.length - 2) {
      break;
    }
    i = zeroIndex;
    let startCodeLength = 0;
    if (i + 3 < packetData.length && packetData[i + 1] === 0 && packetData[i + 2] === 0 && packetData[i + 3] === 1) {
      startCodeLength = 4;
    } else if (packetData[i + 1] === 0 && packetData[i + 2] === 1) {
      startCodeLength = 3;
    }
    if (startCodeLength === 0) {
      i++;
      continue;
    }
    if (nalStart !== -1 && i > nalStart) {
      yield {
        offset: nalStart,
        length: i - nalStart
      };
    }
    nalStart = i + startCodeLength;
    i = nalStart;
  }
  if (nalStart !== -1 && nalStart < packetData.length) {
    yield {
      offset: nalStart,
      length: packetData.length - nalStart
    };
  }
};
var iterateNalUnitsInLengthPrefixed = function* (packetData, lengthSize) {
  let offset = 0;
  const dataView = new DataView(packetData.buffer, packetData.byteOffset, packetData.byteLength);
  while (offset + lengthSize <= packetData.length) {
    let nalUnitLength;
    if (lengthSize === 1) {
      nalUnitLength = dataView.getUint8(offset);
    } else if (lengthSize === 2) {
      nalUnitLength = dataView.getUint16(offset, false);
    } else if (lengthSize === 3) {
      nalUnitLength = getUint24(dataView, offset, false);
    } else {
      assert(lengthSize === 4);
      nalUnitLength = dataView.getUint32(offset, false);
    }
    offset += lengthSize;
    yield {
      offset,
      length: nalUnitLength
    };
    offset += nalUnitLength;
  }
};
var iterateAvcNalUnits = (packetData, decoderConfig) => {
  if (decoderConfig.description) {
    const bytes = toUint8Array(decoderConfig.description);
    const lengthSizeMinusOne = bytes[4] & 3;
    const lengthSize = lengthSizeMinusOne + 1;
    return iterateNalUnitsInLengthPrefixed(packetData, lengthSize);
  } else {
    return iterateNalUnitsInAnnexB(packetData);
  }
};
var extractNalUnitTypeForAvc = (byte) => {
  return byte & 31;
};
var removeEmulationPreventionBytes = (data) => {
  const result = new Uint8Array(data.length);
  const len = data.length;
  let resultLength = 0;
  for (let i = 0; i < len; i++) {
    if (i + 2 < len && data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 3) {
      result[resultLength++] = 0;
      result[resultLength++] = 0;
      i += 2;
    } else {
      result[resultLength++] = data[i];
    }
  }
  return result.subarray(0, resultLength);
};
var addEmulationPreventionBytes = (data) => {
  const result = [];
  let zeroCount = 0;
  for (const byte of data) {
    if (zeroCount === 2 && byte <= 3) {
      result.push(3);
      zeroCount = 0;
    }
    result.push(byte);
    zeroCount = byte === 0 ? zeroCount + 1 : 0;
  }
  return new Uint8Array(result);
};
var ANNEX_B_START_CODE = new Uint8Array([0, 0, 0, 1]);
var concatNalUnitsInAnnexB = (nalUnits) => {
  const totalLength = nalUnits.reduce((a, b) => a + ANNEX_B_START_CODE.byteLength + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const nalUnit of nalUnits) {
    result.set(ANNEX_B_START_CODE, offset);
    offset += ANNEX_B_START_CODE.byteLength;
    result.set(nalUnit, offset);
    offset += nalUnit.byteLength;
  }
  return result;
};
var concatNalUnitsInLengthPrefixed = (nalUnits, lengthSize) => {
  const totalLength = nalUnits.reduce((a, b) => a + lengthSize + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const nalUnit of nalUnits) {
    const dataView = new DataView(result.buffer, result.byteOffset, result.byteLength);
    switch (lengthSize) {
      case 1:
        dataView.setUint8(offset, nalUnit.byteLength);
        break;
      case 2:
        dataView.setUint16(offset, nalUnit.byteLength, false);
        break;
      case 3:
        setUint24(dataView, offset, nalUnit.byteLength, false);
        break;
      case 4:
        dataView.setUint32(offset, nalUnit.byteLength, false);
        break;
    }
    offset += lengthSize;
    result.set(nalUnit, offset);
    offset += nalUnit.byteLength;
  }
  return result;
};
var concatAvcNalUnits = (nalUnits, decoderConfig) => {
  if (decoderConfig.description) {
    const bytes = toUint8Array(decoderConfig.description);
    const lengthSizeMinusOne = bytes[4] & 3;
    const lengthSize = lengthSizeMinusOne + 1;
    return concatNalUnitsInLengthPrefixed(nalUnits, lengthSize);
  } else {
    return concatNalUnitsInAnnexB(nalUnits);
  }
};
var extractAvcDecoderConfigurationRecord = (packetData) => {
  try {
    const spsUnits = [];
    const ppsUnits = [];
    const spsExtUnits = [];
    for (const loc of iterateNalUnitsInAnnexB(packetData)) {
      const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
      const type = extractNalUnitTypeForAvc(nalUnit[0]);
      if (type === AvcNalUnitType.SPS && spsUnits.length < 31) {
        spsUnits.push(nalUnit);
      } else if (type === AvcNalUnitType.PPS && ppsUnits.length < 255) {
        ppsUnits.push(nalUnit);
      } else if (type === AvcNalUnitType.SPS_EXT && spsExtUnits.length < 255) {
        spsExtUnits.push(nalUnit);
      }
    }
    if (spsUnits.length === 0) {
      return null;
    }
    if (ppsUnits.length === 0) {
      return null;
    }
    const spsData = spsUnits[0];
    const spsInfo = parseAvcSps(spsData);
    if (!spsInfo) {
      return null;
    }
    const hasExtendedData = avcProfileHasExtendedConfigurationData(spsInfo.profileIdc);
    return {
      configurationVersion: 1,
      avcProfileIndication: spsInfo.profileIdc,
      profileCompatibility: spsInfo.constraintFlags,
      avcLevelIndication: spsInfo.levelIdc,
      lengthSizeMinusOne: 3,
      // Typically 4 bytes for length field
      sequenceParameterSets: spsUnits,
      pictureParameterSets: ppsUnits,
      chromaFormat: hasExtendedData ? spsInfo.chromaFormatIdc : null,
      bitDepthLumaMinus8: hasExtendedData ? spsInfo.bitDepthLumaMinus8 : null,
      bitDepthChromaMinus8: hasExtendedData ? spsInfo.bitDepthChromaMinus8 : null,
      sequenceParameterSetExt: hasExtendedData ? spsExtUnits : null
    };
  } catch (error) {
    Logging._error("Error building AVC Decoder Configuration Record:", error);
    return null;
  }
};
var serializeAvcDecoderConfigurationRecord = (record) => {
  const bytes = [];
  bytes.push(record.configurationVersion);
  bytes.push(record.avcProfileIndication);
  bytes.push(record.profileCompatibility);
  bytes.push(record.avcLevelIndication);
  bytes.push(252 | record.lengthSizeMinusOne & 3);
  bytes.push(224 | record.sequenceParameterSets.length & 31);
  for (const sps of record.sequenceParameterSets) {
    const length = sps.byteLength;
    bytes.push(length >> 8);
    bytes.push(length & 255);
    for (let i = 0; i < length; i++) {
      bytes.push(sps[i]);
    }
  }
  bytes.push(record.pictureParameterSets.length);
  for (const pps of record.pictureParameterSets) {
    const length = pps.byteLength;
    bytes.push(length >> 8);
    bytes.push(length & 255);
    for (let i = 0; i < length; i++) {
      bytes.push(pps[i]);
    }
  }
  if (avcProfileHasExtendedConfigurationData(record.avcProfileIndication) && record.chromaFormat !== null) {
    assert(record.bitDepthLumaMinus8 !== null);
    assert(record.bitDepthChromaMinus8 !== null);
    assert(record.sequenceParameterSetExt !== null);
    bytes.push(252 | record.chromaFormat & 3);
    bytes.push(248 | record.bitDepthLumaMinus8 & 7);
    bytes.push(248 | record.bitDepthChromaMinus8 & 7);
    bytes.push(record.sequenceParameterSetExt.length);
    for (const spsExt of record.sequenceParameterSetExt) {
      const length = spsExt.byteLength;
      bytes.push(length >> 8);
      bytes.push(length & 255);
      for (let i = 0; i < length; i++) {
        bytes.push(spsExt[i]);
      }
    }
  }
  return new Uint8Array(bytes);
};
var deserializeAvcDecoderConfigurationRecord = (data) => {
  try {
    const view = toDataView(data);
    let offset = 0;
    const configurationVersion = view.getUint8(offset++);
    const avcProfileIndication = view.getUint8(offset++);
    const profileCompatibility = view.getUint8(offset++);
    const avcLevelIndication = view.getUint8(offset++);
    const lengthSizeMinusOne = view.getUint8(offset++) & 3;
    const numOfSequenceParameterSets = view.getUint8(offset++) & 31;
    const sequenceParameterSets = [];
    for (let i = 0; i < numOfSequenceParameterSets; i++) {
      const length = view.getUint16(offset, false);
      offset += 2;
      sequenceParameterSets.push(data.subarray(offset, offset + length));
      offset += length;
    }
    const numOfPictureParameterSets = view.getUint8(offset++);
    const pictureParameterSets = [];
    for (let i = 0; i < numOfPictureParameterSets; i++) {
      const length = view.getUint16(offset, false);
      offset += 2;
      pictureParameterSets.push(data.subarray(offset, offset + length));
      offset += length;
    }
    const record = {
      configurationVersion,
      avcProfileIndication,
      profileCompatibility,
      avcLevelIndication,
      lengthSizeMinusOne,
      sequenceParameterSets,
      pictureParameterSets,
      chromaFormat: null,
      bitDepthLumaMinus8: null,
      bitDepthChromaMinus8: null,
      sequenceParameterSetExt: null
    };
    if (avcProfileHasExtendedConfigurationData(avcProfileIndication) && offset + 4 <= data.length) {
      const chromaFormat = view.getUint8(offset++) & 3;
      const bitDepthLumaMinus8 = view.getUint8(offset++) & 7;
      const bitDepthChromaMinus8 = view.getUint8(offset++) & 7;
      const numOfSequenceParameterSetExt = view.getUint8(offset++);
      record.chromaFormat = chromaFormat;
      record.bitDepthLumaMinus8 = bitDepthLumaMinus8;
      record.bitDepthChromaMinus8 = bitDepthChromaMinus8;
      const sequenceParameterSetExt = [];
      for (let i = 0; i < numOfSequenceParameterSetExt; i++) {
        const length = view.getUint16(offset, false);
        offset += 2;
        sequenceParameterSetExt.push(data.subarray(offset, offset + length));
        offset += length;
      }
      record.sequenceParameterSetExt = sequenceParameterSetExt;
    }
    return record;
  } catch (error) {
    Logging._error("Error deserializing AVC Decoder Configuration Record:", error);
    return null;
  }
};
var avcProfileHasExtendedConfigurationData = (profileIdc) => {
  return profileIdc !== 66 && profileIdc !== 77 && profileIdc !== 88;
};
var AVC_HEVC_ASPECT_RATIO_IDC_TABLE = {
  1: { num: 1, den: 1 },
  2: { num: 12, den: 11 },
  3: { num: 10, den: 11 },
  4: { num: 16, den: 11 },
  5: { num: 40, den: 33 },
  6: { num: 24, den: 11 },
  7: { num: 20, den: 11 },
  8: { num: 32, den: 11 },
  9: { num: 80, den: 33 },
  10: { num: 18, den: 11 },
  11: { num: 15, den: 11 },
  12: { num: 64, den: 33 },
  13: { num: 160, den: 99 },
  14: { num: 4, den: 3 },
  15: { num: 3, den: 2 },
  16: { num: 2, den: 1 }
};
var parseAvcSps = (sps) => {
  try {
    const emulationUnpreventedBytes = removeEmulationPreventionBytes(sps);
    const bitstream = new Bitstream(emulationUnpreventedBytes);
    bitstream.skipBits(1);
    bitstream.skipBits(2);
    const nalUnitType = bitstream.readBits(5);
    if (nalUnitType !== 7) {
      return null;
    }
    const profileIdc = bitstream.readAlignedByte();
    const constraintFlags = bitstream.readAlignedByte();
    const levelIdc = bitstream.readAlignedByte();
    readExpGolomb(bitstream);
    let chromaFormatIdc = 1;
    let bitDepthLumaMinus8 = 0;
    let bitDepthChromaMinus8 = 0;
    let separateColourPlaneFlag = 0;
    if (profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244 || profileIdc === 44 || profileIdc === 83 || profileIdc === 86 || profileIdc === 118 || profileIdc === 128 || profileIdc === 138 || profileIdc === 139 || profileIdc === 134 || profileIdc === 135 || profileIdc === 144) {
      chromaFormatIdc = readExpGolomb(bitstream);
      if (chromaFormatIdc === 3) {
        separateColourPlaneFlag = bitstream.readBits(1);
      }
      bitDepthLumaMinus8 = readExpGolomb(bitstream);
      bitDepthChromaMinus8 = readExpGolomb(bitstream);
      bitstream.skipBits(1);
      const seqScalingMatrixPresentFlag = bitstream.readBits(1);
      if (seqScalingMatrixPresentFlag) {
        for (let i = 0; i < (chromaFormatIdc !== 3 ? 8 : 12); i++) {
          const seqScalingListPresentFlag = bitstream.readBits(1);
          if (seqScalingListPresentFlag) {
            const sizeOfScalingList = i < 6 ? 16 : 64;
            let lastScale = 8;
            let nextScale = 8;
            for (let j = 0; j < sizeOfScalingList; j++) {
              if (nextScale !== 0) {
                const deltaScale = readSignedExpGolomb(bitstream);
                nextScale = (lastScale + deltaScale + 256) % 256;
              }
              lastScale = nextScale === 0 ? lastScale : nextScale;
            }
          }
        }
      }
    }
    readExpGolomb(bitstream);
    const picOrderCntType = readExpGolomb(bitstream);
    if (picOrderCntType === 0) {
      readExpGolomb(bitstream);
    } else if (picOrderCntType === 1) {
      bitstream.skipBits(1);
      readSignedExpGolomb(bitstream);
      readSignedExpGolomb(bitstream);
      const numRefFramesInPicOrderCntCycle = readExpGolomb(bitstream);
      for (let i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
        readSignedExpGolomb(bitstream);
      }
    }
    const maxNumRefFrames = readExpGolomb(bitstream);
    bitstream.skipBits(1);
    const picWidthInMbsMinus1 = readExpGolomb(bitstream);
    const picHeightInMapUnitsMinus1 = readExpGolomb(bitstream);
    const frameMbsOnlyFlag = bitstream.readBits(1);
    if (!frameMbsOnlyFlag) {
      bitstream.skipBits(1);
    }
    const codedWidth = 16 * (picWidthInMbsMinus1 + 1);
    const codedHeight = 16 * (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1);
    let displayWidth = codedWidth;
    let displayHeight = codedHeight;
    bitstream.skipBits(1);
    const frameCroppingFlag = bitstream.readBits(1);
    if (frameCroppingFlag) {
      const frameCropLeftOffset = readExpGolomb(bitstream);
      const frameCropRightOffset = readExpGolomb(bitstream);
      const frameCropTopOffset = readExpGolomb(bitstream);
      const frameCropBottomOffset = readExpGolomb(bitstream);
      let cropUnitX;
      let cropUnitY;
      const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
      if (chromaArrayType === 0) {
        cropUnitX = 1;
        cropUnitY = 2 - frameMbsOnlyFlag;
      } else {
        const subWidthC = chromaFormatIdc === 3 ? 1 : 2;
        const subHeightC = chromaFormatIdc === 1 ? 2 : 1;
        cropUnitX = subWidthC;
        cropUnitY = subHeightC * (2 - frameMbsOnlyFlag);
      }
      displayWidth -= cropUnitX * (frameCropLeftOffset + frameCropRightOffset);
      displayHeight -= cropUnitY * (frameCropTopOffset + frameCropBottomOffset);
    }
    if (displayWidth <= 0 || displayHeight <= 0) {
      return null;
    }
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    let fullRangeFlag = 0;
    let pixelAspectRatio = { num: 1, den: 1 };
    let numReorderFrames = null;
    let maxDecFrameBuffering = null;
    let bitstreamRestrictionFlagBitOffset = null;
    let bitstreamRestrictionFlag = null;
    const vuiParametersFlagBitOffset = bitstream.pos;
    const vuiParametersPresentFlag = bitstream.readBits(1);
    if (vuiParametersPresentFlag) {
      const aspectRatioInfoPresentFlag = bitstream.readBits(1);
      if (aspectRatioInfoPresentFlag) {
        const aspectRatioIdc = bitstream.readBits(8);
        if (aspectRatioIdc === 255) {
          pixelAspectRatio = {
            num: bitstream.readBits(16),
            den: bitstream.readBits(16)
          };
        } else {
          const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspectRatioIdc];
          if (aspectRatio) {
            pixelAspectRatio = aspectRatio;
          }
        }
      }
      const overscanInfoPresentFlag = bitstream.readBits(1);
      if (overscanInfoPresentFlag) {
        bitstream.skipBits(1);
      }
      const videoSignalTypePresentFlag = bitstream.readBits(1);
      if (videoSignalTypePresentFlag) {
        bitstream.skipBits(3);
        fullRangeFlag = bitstream.readBits(1);
        const colourDescriptionPresentFlag = bitstream.readBits(1);
        if (colourDescriptionPresentFlag) {
          colourPrimaries = bitstream.readBits(8);
          transferCharacteristics = bitstream.readBits(8);
          matrixCoefficients = bitstream.readBits(8);
        }
      }
      const chromaLocInfoPresentFlag = bitstream.readBits(1);
      if (chromaLocInfoPresentFlag) {
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
      }
      const timingInfoPresentFlag = bitstream.readBits(1);
      if (timingInfoPresentFlag) {
        bitstream.skipBits(32);
        bitstream.skipBits(32);
        bitstream.skipBits(1);
      }
      const nalHrdParametersPresentFlag = bitstream.readBits(1);
      if (nalHrdParametersPresentFlag) {
        skipAvcHrdParameters(bitstream);
      }
      const vclHrdParametersPresentFlag = bitstream.readBits(1);
      if (vclHrdParametersPresentFlag) {
        skipAvcHrdParameters(bitstream);
      }
      if (nalHrdParametersPresentFlag || vclHrdParametersPresentFlag) {
        bitstream.skipBits(1);
      }
      bitstream.skipBits(1);
      bitstreamRestrictionFlagBitOffset = bitstream.pos;
      bitstreamRestrictionFlag = bitstream.readBits(1);
      if (bitstreamRestrictionFlag) {
        bitstream.skipBits(1);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        numReorderFrames = Math.min(readExpGolomb(bitstream), 16);
        maxDecFrameBuffering = Math.min(readExpGolomb(bitstream), 16);
      }
    }
    if (numReorderFrames === null) {
      assert(maxDecFrameBuffering === null);
      const constraintSet3Flag = constraintFlags & 16;
      if ((profileIdc === 44 || profileIdc === 86 || profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244) && constraintSet3Flag) {
        numReorderFrames = 0;
        maxDecFrameBuffering = 0;
      } else {
        const picWidthInMbs = picWidthInMbsMinus1 + 1;
        const picHeightInMapUnits = picHeightInMapUnitsMinus1 + 1;
        const frameHeightInMbs = (2 - frameMbsOnlyFlag) * picHeightInMapUnits;
        const isLevel1b = levelIdc === 11 && constraintSet3Flag && (profileIdc === 66 || profileIdc === 77 || profileIdc === 88);
        const levelInfo = AVC_LEVEL_TABLE.find((x) => x.level >= (isLevel1b ? 10 : levelIdc)) ?? last(AVC_LEVEL_TABLE);
        const maxDpbFrames = Math.min(Math.floor(levelInfo.maxDpbMbs / (picWidthInMbs * frameHeightInMbs)), 16);
        numReorderFrames = maxDpbFrames;
        maxDecFrameBuffering = Math.min(Math.max(maxDpbFrames, maxNumRefFrames), 16);
      }
    }
    assert(maxDecFrameBuffering !== null);
    return {
      emulationUnpreventedBytes,
      profileIdc,
      constraintFlags,
      levelIdc,
      frameMbsOnlyFlag,
      chromaFormatIdc,
      bitDepthLumaMinus8,
      bitDepthChromaMinus8,
      codedWidth,
      codedHeight,
      displayWidth,
      displayHeight,
      pixelAspectRatio,
      colourPrimaries,
      matrixCoefficients,
      transferCharacteristics,
      fullRangeFlag,
      numReorderFrames,
      maxDecFrameBuffering,
      vuiParametersFlagBitOffset,
      bitstreamRestrictionFlagBitOffset,
      bitstreamRestrictionFlag
    };
  } catch (error) {
    Logging._error("Error parsing AVC SPS:", error);
    return null;
  }
};
var skipAvcHrdParameters = (bitstream) => {
  const cpb_cnt_minus1 = readExpGolomb(bitstream);
  bitstream.skipBits(4);
  bitstream.skipBits(4);
  for (let i = 0; i <= cpb_cnt_minus1; i++) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    bitstream.skipBits(1);
  }
  bitstream.skipBits(5);
  bitstream.skipBits(5);
  bitstream.skipBits(5);
  bitstream.skipBits(5);
};
var addAvcBitstreamRestriction = (sps) => {
  assert(sps.bitstreamRestrictionFlag !== 1);
  const modifiedBytes = new Uint8Array(sps.emulationUnpreventedBytes.byteLength + 64);
  const oldBitstream = new Bitstream(sps.emulationUnpreventedBytes);
  const newBitstream = new Bitstream(modifiedBytes);
  if (sps.bitstreamRestrictionFlag === null) {
    newBitstream.copyBits(sps.vuiParametersFlagBitOffset, oldBitstream);
    newBitstream.writeBits(1, 1);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
    newBitstream.writeBits(1, 0);
  } else {
    assert(sps.bitstreamRestrictionFlagBitOffset !== null);
    newBitstream.copyBits(sps.bitstreamRestrictionFlagBitOffset, oldBitstream);
  }
  newBitstream.writeBits(1, 1);
  newBitstream.writeBits(1, 1);
  writeExpGolomb(newBitstream, 2);
  writeExpGolomb(newBitstream, 1);
  writeExpGolomb(newBitstream, 16);
  writeExpGolomb(newBitstream, 16);
  writeExpGolomb(newBitstream, sps.numReorderFrames);
  writeExpGolomb(newBitstream, sps.maxDecFrameBuffering);
  newBitstream.writeBits(1, 1);
  newBitstream.writeBits((8 - newBitstream.pos % 8) % 8, 0);
  const byteLength = newBitstream.pos / 8;
  assert(Number.isInteger(byteLength));
  return addEmulationPreventionBytes(modifiedBytes.subarray(0, byteLength));
};
var concatHevcNalUnits = (nalUnits, decoderConfig) => {
  if (decoderConfig.description) {
    const bytes = toUint8Array(decoderConfig.description);
    const lengthSizeMinusOne = bytes[21] & 3;
    const lengthSize = lengthSizeMinusOne + 1;
    return concatNalUnitsInLengthPrefixed(nalUnits, lengthSize);
  } else {
    return concatNalUnitsInAnnexB(nalUnits);
  }
};
var iterateHevcNalUnits = (packetData, decoderConfig) => {
  if (decoderConfig.description) {
    const bytes = toUint8Array(decoderConfig.description);
    const lengthSizeMinusOne = bytes[21] & 3;
    const lengthSize = lengthSizeMinusOne + 1;
    return iterateNalUnitsInLengthPrefixed(packetData, lengthSize);
  } else {
    return iterateNalUnitsInAnnexB(packetData);
  }
};
var extractNalUnitTypeForHevc = (byte) => {
  return byte >> 1 & 63;
};
var parseHevcSps = (sps) => {
  try {
    const bitstream = new Bitstream(removeEmulationPreventionBytes(sps));
    bitstream.skipBits(16);
    bitstream.readBits(4);
    const spsMaxSubLayersMinus1 = bitstream.readBits(3);
    const spsTemporalIdNestingFlag = bitstream.readBits(1);
    const { general_profile_space, general_tier_flag, general_profile_idc, general_profile_compatibility_flags, general_constraint_indicator_flags, general_level_idc } = parseProfileTierLevel(bitstream, spsMaxSubLayersMinus1);
    readExpGolomb(bitstream);
    const chromaFormatIdc = readExpGolomb(bitstream);
    let separateColourPlaneFlag = 0;
    if (chromaFormatIdc === 3) {
      separateColourPlaneFlag = bitstream.readBits(1);
    }
    const picWidthInLumaSamples = readExpGolomb(bitstream);
    const picHeightInLumaSamples = readExpGolomb(bitstream);
    let displayWidth = picWidthInLumaSamples;
    let displayHeight = picHeightInLumaSamples;
    if (bitstream.readBits(1)) {
      const confWinLeftOffset = readExpGolomb(bitstream);
      const confWinRightOffset = readExpGolomb(bitstream);
      const confWinTopOffset = readExpGolomb(bitstream);
      const confWinBottomOffset = readExpGolomb(bitstream);
      let subWidthC = 1;
      let subHeightC = 1;
      const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
      if (chromaArrayType === 1) {
        subWidthC = 2;
        subHeightC = 2;
      } else if (chromaArrayType === 2) {
        subWidthC = 2;
        subHeightC = 1;
      }
      displayWidth -= (confWinLeftOffset + confWinRightOffset) * subWidthC;
      displayHeight -= (confWinTopOffset + confWinBottomOffset) * subHeightC;
    }
    if (displayWidth <= 0 || displayHeight <= 0) {
      return null;
    }
    const bitDepthLumaMinus8 = readExpGolomb(bitstream);
    const bitDepthChromaMinus8 = readExpGolomb(bitstream);
    const log2MaxPicOrderCntLsbMinus4 = readExpGolomb(bitstream);
    const spsSubLayerOrderingInfoPresentFlag = bitstream.readBits(1);
    const startI = spsSubLayerOrderingInfoPresentFlag ? 0 : spsMaxSubLayersMinus1;
    let spsMaxNumReorderPics = 0;
    for (let i = startI; i <= spsMaxSubLayersMinus1; i++) {
      readExpGolomb(bitstream);
      spsMaxNumReorderPics = readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    if (bitstream.readBits(1)) {
      if (bitstream.readBits(1)) {
        skipScalingListData(bitstream);
      }
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    if (bitstream.readBits(1)) {
      bitstream.skipBits(4);
      bitstream.skipBits(4);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      bitstream.skipBits(1);
    }
    const numShortTermRefPicSets = readExpGolomb(bitstream);
    skipAllStRefPicSets(bitstream, numShortTermRefPicSets);
    if (bitstream.readBits(1)) {
      const numLongTermRefPicsSps = readExpGolomb(bitstream);
      for (let i = 0; i < numLongTermRefPicsSps; i++) {
        bitstream.skipBits(log2MaxPicOrderCntLsbMinus4 + 4);
        bitstream.skipBits(1);
      }
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    let fullRangeFlag = 0;
    let minSpatialSegmentationIdc = 0;
    let pixelAspectRatio = { num: 1, den: 1 };
    if (bitstream.readBits(1)) {
      const vui = parseHevcVui(bitstream, spsMaxSubLayersMinus1);
      pixelAspectRatio = vui.pixelAspectRatio;
      colourPrimaries = vui.colourPrimaries;
      transferCharacteristics = vui.transferCharacteristics;
      matrixCoefficients = vui.matrixCoefficients;
      fullRangeFlag = vui.fullRangeFlag;
      minSpatialSegmentationIdc = vui.minSpatialSegmentationIdc;
    }
    return {
      displayWidth,
      displayHeight,
      pixelAspectRatio,
      colourPrimaries,
      transferCharacteristics,
      matrixCoefficients,
      fullRangeFlag,
      // Can't exceed MaxDpbSize, which is at most 16. Bigger values would make us buffer absurd amounts of
      // frames
      maxDecFrameBuffering: Math.min(spsMaxNumReorderPics + 1, 16),
      spsMaxSubLayersMinus1,
      spsTemporalIdNestingFlag,
      generalProfileSpace: general_profile_space,
      generalTierFlag: general_tier_flag,
      generalProfileIdc: general_profile_idc,
      generalProfileCompatibilityFlags: general_profile_compatibility_flags,
      generalConstraintIndicatorFlags: general_constraint_indicator_flags,
      generalLevelIdc: general_level_idc,
      chromaFormatIdc,
      bitDepthLumaMinus8,
      bitDepthChromaMinus8,
      minSpatialSegmentationIdc
    };
  } catch (error) {
    Logging._error("Error parsing HEVC SPS:", error);
    return null;
  }
};
var extractHevcDecoderConfigurationRecord = (packetData) => {
  try {
    const vpsUnits = [];
    const spsUnits = [];
    const ppsUnits = [];
    const prefixSeiUnits = [];
    const suffixSeiUnits = [];
    const MAX_NAL_UNITS_PER_ARRAY = 65535;
    for (const loc of iterateNalUnitsInAnnexB(packetData)) {
      const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
      const type = extractNalUnitTypeForHevc(nalUnit[0]);
      if (type === HevcNalUnitType.VPS_NUT && vpsUnits.length < MAX_NAL_UNITS_PER_ARRAY) {
        vpsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.SPS_NUT && spsUnits.length < MAX_NAL_UNITS_PER_ARRAY) {
        spsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.PPS_NUT && ppsUnits.length < MAX_NAL_UNITS_PER_ARRAY) {
        ppsUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.PREFIX_SEI_NUT && prefixSeiUnits.length < MAX_NAL_UNITS_PER_ARRAY) {
        prefixSeiUnits.push(nalUnit);
      } else if (type === HevcNalUnitType.SUFFIX_SEI_NUT && suffixSeiUnits.length < MAX_NAL_UNITS_PER_ARRAY) {
        suffixSeiUnits.push(nalUnit);
      }
    }
    if (spsUnits.length === 0 || ppsUnits.length === 0)
      return null;
    const spsInfo = parseHevcSps(spsUnits[0]);
    if (!spsInfo)
      return null;
    let parallelismType = 0;
    if (ppsUnits.length > 0) {
      const pps = ppsUnits[0];
      const ppsBitstream = new Bitstream(removeEmulationPreventionBytes(pps));
      ppsBitstream.skipBits(16);
      readExpGolomb(ppsBitstream);
      readExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(3);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      readExpGolomb(ppsBitstream);
      readExpGolomb(ppsBitstream);
      readSignedExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      if (ppsBitstream.readBits(1)) {
        readExpGolomb(ppsBitstream);
      }
      readSignedExpGolomb(ppsBitstream);
      readSignedExpGolomb(ppsBitstream);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      ppsBitstream.skipBits(1);
      const tiles_enabled_flag = ppsBitstream.readBits(1);
      const entropy_coding_sync_enabled_flag = ppsBitstream.readBits(1);
      if (!tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
        parallelismType = 0;
      else if (tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
        parallelismType = 2;
      else if (!tiles_enabled_flag && entropy_coding_sync_enabled_flag)
        parallelismType = 3;
      else
        parallelismType = 0;
    }
    const arrays = [
      ...vpsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.VPS_NUT,
          nalUnits: vpsUnits
        }
      ] : [],
      ...spsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.SPS_NUT,
          nalUnits: spsUnits
        }
      ] : [],
      ...ppsUnits.length ? [
        {
          arrayCompleteness: 1,
          nalUnitType: HevcNalUnitType.PPS_NUT,
          nalUnits: ppsUnits
        }
      ] : [],
      // "array_completeness is 1 for arrays of all types of parameter sets, and 0 for all other arrays"
      ...prefixSeiUnits.length ? [
        {
          arrayCompleteness: 0,
          nalUnitType: HevcNalUnitType.PREFIX_SEI_NUT,
          nalUnits: prefixSeiUnits
        }
      ] : [],
      ...suffixSeiUnits.length ? [
        {
          arrayCompleteness: 0,
          nalUnitType: HevcNalUnitType.SUFFIX_SEI_NUT,
          nalUnits: suffixSeiUnits
        }
      ] : []
    ];
    const record = {
      configurationVersion: 1,
      generalProfileSpace: spsInfo.generalProfileSpace,
      generalTierFlag: spsInfo.generalTierFlag,
      generalProfileIdc: spsInfo.generalProfileIdc,
      generalProfileCompatibilityFlags: spsInfo.generalProfileCompatibilityFlags,
      generalConstraintIndicatorFlags: spsInfo.generalConstraintIndicatorFlags,
      generalLevelIdc: spsInfo.generalLevelIdc,
      minSpatialSegmentationIdc: spsInfo.minSpatialSegmentationIdc,
      parallelismType,
      chromaFormatIdc: spsInfo.chromaFormatIdc,
      bitDepthLumaMinus8: spsInfo.bitDepthLumaMinus8,
      bitDepthChromaMinus8: spsInfo.bitDepthChromaMinus8,
      avgFrameRate: 0,
      constantFrameRate: 0,
      numTemporalLayers: spsInfo.spsMaxSubLayersMinus1 + 1,
      temporalIdNested: spsInfo.spsTemporalIdNestingFlag,
      lengthSizeMinusOne: 3,
      arrays
    };
    return record;
  } catch (error) {
    Logging._error("Error building HEVC Decoder Configuration Record:", error);
    return null;
  }
};
var parseProfileTierLevel = (bitstream, maxNumSubLayersMinus1) => {
  const general_profile_space = bitstream.readBits(2);
  const general_tier_flag = bitstream.readBits(1);
  const general_profile_idc = bitstream.readBits(5);
  let general_profile_compatibility_flags = 0;
  for (let i = 0; i < 32; i++) {
    general_profile_compatibility_flags = general_profile_compatibility_flags << 1 | bitstream.readBits(1);
  }
  const general_constraint_indicator_flags = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    general_constraint_indicator_flags[i] = bitstream.readBits(8);
  }
  const general_level_idc = bitstream.readBits(8);
  const sub_layer_profile_present_flag = [];
  const sub_layer_level_present_flag = [];
  for (let i = 0; i < maxNumSubLayersMinus1; i++) {
    sub_layer_profile_present_flag.push(bitstream.readBits(1));
    sub_layer_level_present_flag.push(bitstream.readBits(1));
  }
  if (maxNumSubLayersMinus1 > 0) {
    for (let i = maxNumSubLayersMinus1; i < 8; i++) {
      bitstream.skipBits(2);
    }
  }
  for (let i = 0; i < maxNumSubLayersMinus1; i++) {
    if (sub_layer_profile_present_flag[i])
      bitstream.skipBits(88);
    if (sub_layer_level_present_flag[i])
      bitstream.skipBits(8);
  }
  return {
    general_profile_space,
    general_tier_flag,
    general_profile_idc,
    general_profile_compatibility_flags,
    general_constraint_indicator_flags,
    general_level_idc
  };
};
var skipScalingListData = (bitstream) => {
  for (let sizeId = 0; sizeId < 4; sizeId++) {
    for (let matrixId = 0; matrixId < (sizeId === 3 ? 2 : 6); matrixId++) {
      const scaling_list_pred_mode_flag = bitstream.readBits(1);
      if (!scaling_list_pred_mode_flag) {
        readExpGolomb(bitstream);
      } else {
        const coefNum = Math.min(64, 1 << 4 + (sizeId << 1));
        if (sizeId > 1) {
          readSignedExpGolomb(bitstream);
        }
        for (let i = 0; i < coefNum; i++) {
          readSignedExpGolomb(bitstream);
        }
      }
    }
  }
};
var skipAllStRefPicSets = (bitstream, num_short_term_ref_pic_sets) => {
  const NumDeltaPocs = [];
  for (let stRpsIdx = 0; stRpsIdx < num_short_term_ref_pic_sets; stRpsIdx++) {
    NumDeltaPocs[stRpsIdx] = skipStRefPicSet(bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs);
  }
};
var skipStRefPicSet = (bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs) => {
  let NumDeltaPocsThis = 0;
  let inter_ref_pic_set_prediction_flag = 0;
  let RefRpsIdx = 0;
  if (stRpsIdx !== 0) {
    inter_ref_pic_set_prediction_flag = bitstream.readBits(1);
  }
  if (inter_ref_pic_set_prediction_flag) {
    if (stRpsIdx === num_short_term_ref_pic_sets) {
      const delta_idx_minus1 = readExpGolomb(bitstream);
      RefRpsIdx = stRpsIdx - (delta_idx_minus1 + 1);
    } else {
      RefRpsIdx = stRpsIdx - 1;
    }
    bitstream.readBits(1);
    readExpGolomb(bitstream);
    const numDelta = NumDeltaPocs[RefRpsIdx] ?? 0;
    for (let j = 0; j <= numDelta; j++) {
      const used_by_curr_pic_flag = bitstream.readBits(1);
      const use_delta_flag = used_by_curr_pic_flag || bitstream.readBits(1);
      if (use_delta_flag) {
        NumDeltaPocsThis++;
      }
    }
  } else {
    const num_negative_pics = readExpGolomb(bitstream);
    const num_positive_pics = readExpGolomb(bitstream);
    for (let i = 0; i < num_negative_pics; i++) {
      readExpGolomb(bitstream);
      bitstream.readBits(1);
    }
    for (let i = 0; i < num_positive_pics; i++) {
      readExpGolomb(bitstream);
      bitstream.readBits(1);
    }
    NumDeltaPocsThis = num_negative_pics + num_positive_pics;
  }
  return NumDeltaPocsThis;
};
var parseHevcVui = (bitstream, sps_max_sub_layers_minus1) => {
  let colourPrimaries = 2;
  let transferCharacteristics = 2;
  let matrixCoefficients = 2;
  let fullRangeFlag = 0;
  let minSpatialSegmentationIdc = 0;
  let pixelAspectRatio = { num: 1, den: 1 };
  if (bitstream.readBits(1)) {
    const aspect_ratio_idc = bitstream.readBits(8);
    if (aspect_ratio_idc === 255) {
      pixelAspectRatio = {
        num: bitstream.readBits(16),
        den: bitstream.readBits(16)
      };
    } else {
      const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspect_ratio_idc];
      if (aspectRatio) {
        pixelAspectRatio = aspectRatio;
      }
    }
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(1);
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(3);
    fullRangeFlag = bitstream.readBits(1);
    if (bitstream.readBits(1)) {
      colourPrimaries = bitstream.readBits(8);
      transferCharacteristics = bitstream.readBits(8);
      matrixCoefficients = bitstream.readBits(8);
    }
  }
  if (bitstream.readBits(1)) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  bitstream.readBits(1);
  bitstream.readBits(1);
  bitstream.readBits(1);
  if (bitstream.readBits(1)) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(32);
    bitstream.readBits(32);
    if (bitstream.readBits(1)) {
      readExpGolomb(bitstream);
    }
    if (bitstream.readBits(1)) {
      skipHevcHrdParameters(bitstream, true, sps_max_sub_layers_minus1);
    }
  }
  if (bitstream.readBits(1)) {
    bitstream.readBits(1);
    bitstream.readBits(1);
    bitstream.readBits(1);
    minSpatialSegmentationIdc = readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
  }
  return {
    pixelAspectRatio,
    colourPrimaries,
    transferCharacteristics,
    matrixCoefficients,
    fullRangeFlag,
    minSpatialSegmentationIdc
  };
};
var skipHevcHrdParameters = (bitstream, commonInfPresentFlag, maxNumSubLayersMinus1) => {
  let nal_hrd_parameters_present_flag = false;
  let vcl_hrd_parameters_present_flag = false;
  let sub_pic_hrd_params_present_flag = false;
  if (commonInfPresentFlag) {
    nal_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
    vcl_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
    if (nal_hrd_parameters_present_flag || vcl_hrd_parameters_present_flag) {
      sub_pic_hrd_params_present_flag = bitstream.readBits(1) === 1;
      if (sub_pic_hrd_params_present_flag) {
        bitstream.readBits(8);
        bitstream.readBits(5);
        bitstream.readBits(1);
        bitstream.readBits(5);
      }
      bitstream.readBits(4);
      bitstream.readBits(4);
      if (sub_pic_hrd_params_present_flag) {
        bitstream.readBits(4);
      }
      bitstream.readBits(5);
      bitstream.readBits(5);
      bitstream.readBits(5);
    }
  }
  for (let i = 0; i <= maxNumSubLayersMinus1; i++) {
    const fixed_pic_rate_general_flag = bitstream.readBits(1) === 1;
    let fixed_pic_rate_within_cvs_flag = true;
    if (!fixed_pic_rate_general_flag) {
      fixed_pic_rate_within_cvs_flag = bitstream.readBits(1) === 1;
    }
    let low_delay_hrd_flag = false;
    if (fixed_pic_rate_within_cvs_flag) {
      readExpGolomb(bitstream);
    } else {
      low_delay_hrd_flag = bitstream.readBits(1) === 1;
    }
    let CpbCnt = 1;
    if (!low_delay_hrd_flag) {
      const cpb_cnt_minus1 = readExpGolomb(bitstream);
      CpbCnt = cpb_cnt_minus1 + 1;
    }
    if (nal_hrd_parameters_present_flag) {
      skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
    }
    if (vcl_hrd_parameters_present_flag) {
      skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
    }
  }
};
var skipSubLayerHrdParameters = (bitstream, CpbCnt, sub_pic_hrd_params_present_flag) => {
  for (let i = 0; i < CpbCnt; i++) {
    readExpGolomb(bitstream);
    readExpGolomb(bitstream);
    if (sub_pic_hrd_params_present_flag) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    bitstream.readBits(1);
  }
};
var deserializeHevcDecoderConfigurationRecord = (data) => {
  try {
    const view = toDataView(data);
    let offset = 0;
    const configurationVersion = view.getUint8(offset++);
    const byte1 = view.getUint8(offset++);
    const generalProfileSpace = byte1 >> 6 & 3;
    const generalTierFlag = byte1 >> 5 & 1;
    const generalProfileIdc = byte1 & 31;
    const generalProfileCompatibilityFlags = view.getUint32(offset, false);
    offset += 4;
    const generalConstraintIndicatorFlags = data.subarray(offset, offset + 6);
    offset += 6;
    const generalLevelIdc = view.getUint8(offset++);
    const minSpatialSegmentationIdc = (view.getUint8(offset++) & 15) << 8 | view.getUint8(offset++);
    const parallelismType = view.getUint8(offset++) & 3;
    const chromaFormatIdc = view.getUint8(offset++) & 3;
    const bitDepthLumaMinus8 = view.getUint8(offset++) & 7;
    const bitDepthChromaMinus8 = view.getUint8(offset++) & 7;
    const avgFrameRate = view.getUint16(offset, false);
    offset += 2;
    const byte21 = view.getUint8(offset++);
    const constantFrameRate = byte21 >> 6 & 3;
    const numTemporalLayers = byte21 >> 3 & 7;
    const temporalIdNested = byte21 >> 2 & 1;
    const lengthSizeMinusOne = byte21 & 3;
    const numOfArrays = view.getUint8(offset++);
    const arrays = [];
    for (let i = 0; i < numOfArrays; i++) {
      const arrByte = view.getUint8(offset++);
      const arrayCompleteness = arrByte >> 7 & 1;
      const nalUnitType = arrByte & 63;
      const numNalus = view.getUint16(offset, false);
      offset += 2;
      const nalUnits = [];
      for (let j = 0; j < numNalus; j++) {
        const nalUnitLength = view.getUint16(offset, false);
        offset += 2;
        nalUnits.push(data.subarray(offset, offset + nalUnitLength));
        offset += nalUnitLength;
      }
      arrays.push({
        arrayCompleteness,
        nalUnitType,
        nalUnits
      });
    }
    return {
      configurationVersion,
      generalProfileSpace,
      generalTierFlag,
      generalProfileIdc,
      generalProfileCompatibilityFlags,
      generalConstraintIndicatorFlags,
      generalLevelIdc,
      minSpatialSegmentationIdc,
      parallelismType,
      chromaFormatIdc,
      bitDepthLumaMinus8,
      bitDepthChromaMinus8,
      avgFrameRate,
      constantFrameRate,
      numTemporalLayers,
      temporalIdNested,
      lengthSizeMinusOne,
      arrays
    };
  } catch (error) {
    Logging._error("Error deserializing HEVC Decoder Configuration Record:", error);
    return null;
  }
};
var HevcNaluOrderState;
(function(HevcNaluOrderState2) {
  HevcNaluOrderState2[HevcNaluOrderState2["audAllowed"] = 0] = "audAllowed";
  HevcNaluOrderState2[HevcNaluOrderState2["beforeFirstVcl"] = 1] = "beforeFirstVcl";
  HevcNaluOrderState2[HevcNaluOrderState2["afterFirstVcl"] = 2] = "afterFirstVcl";
  HevcNaluOrderState2[HevcNaluOrderState2["eoBitstreamAllowed"] = 3] = "eoBitstreamAllowed";
  HevcNaluOrderState2[HevcNaluOrderState2["noMoreDataAllowed"] = 4] = "noMoreDataAllowed";
})(HevcNaluOrderState || (HevcNaluOrderState = {}));
var sanitizeHevcPacketForChromium = (packetData, decoderConfig) => {
  const removedNalUnits = /* @__PURE__ */ new Set();
  let orderState = HevcNaluOrderState.audAllowed;
  for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
    if (orderState === HevcNaluOrderState.noMoreDataAllowed) {
      removedNalUnits.add(loc.offset);
      continue;
    }
    const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
    if (orderState === HevcNaluOrderState.eoBitstreamAllowed && type !== 37) {
      removedNalUnits.add(loc.offset);
      continue;
    }
    let remove = false;
    if (type === 35) {
      if (orderState > HevcNaluOrderState.audAllowed) {
        remove = true;
      } else {
        orderState = HevcNaluOrderState.beforeFirstVcl;
      }
    } else if (type <= 31) {
      if (orderState > HevcNaluOrderState.afterFirstVcl) {
        remove = true;
      } else {
        orderState = HevcNaluOrderState.afterFirstVcl;
      }
    } else if (type === 36) {
      if (orderState !== HevcNaluOrderState.afterFirstVcl) {
        remove = true;
      } else {
        orderState = HevcNaluOrderState.eoBitstreamAllowed;
      }
    } else if (type === 37) {
      if (orderState < HevcNaluOrderState.afterFirstVcl) {
        remove = true;
      } else {
        orderState = HevcNaluOrderState.noMoreDataAllowed;
      }
    } else if (type === 32 || type === 33 || type === 34 || type === 39 || type >= 41 && type <= 44 || type >= 48 && type <= 55) {
      if (orderState > HevcNaluOrderState.beforeFirstVcl) {
        remove = true;
      } else {
        orderState = HevcNaluOrderState.beforeFirstVcl;
      }
    } else if (type === 38 || type === 40 || type >= 45 && type <= 47 || type >= 56 && type <= 63) {
      if (orderState < HevcNaluOrderState.afterFirstVcl) {
        remove = true;
      }
    }
    if (remove) {
      removedNalUnits.add(loc.offset);
    }
  }
  if (removedNalUnits.size === 0) {
    return null;
  }
  const filteredNalUnits = [];
  for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
    if (!removedNalUnits.has(loc.offset)) {
      filteredNalUnits.push(packetData.subarray(loc.offset, loc.offset + loc.length));
    }
  }
  return concatHevcNalUnits(filteredNalUnits, decoderConfig);
};
var VP9_COLOR_SPACE_TABLE = {
  1: { colourPrimaries: 5, transferCharacteristics: 6, matrixCoefficients: 5 },
  // CS_BT_601
  2: { colourPrimaries: 1, transferCharacteristics: 1, matrixCoefficients: 1 },
  // CS_BT_709
  3: { colourPrimaries: 6, transferCharacteristics: 6, matrixCoefficients: 6 },
  // CS_SMPTE_170
  4: { colourPrimaries: 7, transferCharacteristics: 7, matrixCoefficients: 7 },
  // CS_SMPTE_240
  5: { colourPrimaries: 9, transferCharacteristics: 14, matrixCoefficients: 9 },
  // CS_BT_2020
  7: { colourPrimaries: 1, transferCharacteristics: 13, matrixCoefficients: 0 }
  // CS_RGB (sRGB)
};
var extractVp9CodecInfoFromPacket = (packet) => {
  const bitstream = new Bitstream(packet);
  const frameMarker = bitstream.readBits(2);
  if (frameMarker !== 2) {
    return null;
  }
  const profileLowBit = bitstream.readBits(1);
  const profileHighBit = bitstream.readBits(1);
  const profile = (profileHighBit << 1) + profileLowBit;
  if (profile === 3) {
    bitstream.skipBits(1);
  }
  const showExistingFrame = bitstream.readBits(1);
  if (showExistingFrame === 1) {
    return null;
  }
  const frameType = bitstream.readBits(1);
  if (frameType !== 0) {
    return null;
  }
  bitstream.skipBits(2);
  const syncCode = bitstream.readBits(24);
  if (syncCode !== 4817730) {
    return null;
  }
  let bitDepth = 8;
  if (profile >= 2) {
    const tenOrTwelveBit = bitstream.readBits(1);
    bitDepth = tenOrTwelveBit ? 12 : 10;
  }
  const colorSpace = bitstream.readBits(3);
  let chromaSubsampling = 0;
  let videoFullRangeFlag = 0;
  if (colorSpace !== 7) {
    const colorRange = bitstream.readBits(1);
    videoFullRangeFlag = colorRange;
    if (profile === 1 || profile === 3) {
      const subsamplingX = bitstream.readBits(1);
      const subsamplingY = bitstream.readBits(1);
      chromaSubsampling = !subsamplingX && !subsamplingY ? 3 : subsamplingX && !subsamplingY ? 2 : 1;
      bitstream.skipBits(1);
    } else {
      chromaSubsampling = 1;
    }
  } else {
    chromaSubsampling = 3;
    videoFullRangeFlag = 1;
    if (profile === 1 || profile === 3) {
      bitstream.skipBits(1);
    }
  }
  const widthMinusOne = bitstream.readBits(16);
  const heightMinusOne = bitstream.readBits(16);
  const width = widthMinusOne + 1;
  const height = heightMinusOne + 1;
  const pictureSize = width * height;
  let level = last(VP9_LEVEL_TABLE).level;
  for (const entry of VP9_LEVEL_TABLE) {
    if (pictureSize <= entry.maxPictureSize) {
      level = entry.level;
      break;
    }
  }
  const colorSpaceValues = VP9_COLOR_SPACE_TABLE[colorSpace];
  const colourPrimaries = colorSpaceValues?.colourPrimaries ?? 2;
  const transferCharacteristics = colorSpaceValues?.transferCharacteristics ?? 2;
  const matrixCoefficients = colorSpaceValues?.matrixCoefficients ?? 2;
  return {
    profile,
    level,
    bitDepth,
    chromaSubsampling,
    videoFullRangeFlag,
    colourPrimaries,
    transferCharacteristics,
    matrixCoefficients
  };
};
var vp9CodecInfoHasColorInfo = (info) => {
  return info.colourPrimaries !== 2 || info.transferCharacteristics !== 2 || info.matrixCoefficients !== 2;
};
var iterateAv1PacketObus = function* (packet) {
  const bitstream = new Bitstream(packet);
  const readLeb128 = () => {
    let value = 0;
    for (let i = 0; i < 8; i++) {
      const byte = bitstream.readAlignedByte();
      value += (byte & 127) * 2 ** (i * 7);
      if (!(byte & 128)) {
        break;
      }
      if (i === 7 && byte & 128) {
        return null;
      }
    }
    if (value > 2 ** 32 - 1) {
      return null;
    }
    return value;
  };
  while (bitstream.getBitsLeft() >= 8) {
    bitstream.skipBits(1);
    const obuType = bitstream.readBits(4);
    const obuExtension = bitstream.readBits(1);
    const obuHasSizeField = bitstream.readBits(1);
    bitstream.skipBits(1);
    if (obuExtension) {
      bitstream.skipBits(8);
    }
    let obuSize;
    if (obuHasSizeField) {
      const obuSizeValue = readLeb128();
      if (obuSizeValue === null)
        return;
      obuSize = obuSizeValue;
    } else {
      obuSize = Math.floor(bitstream.getBitsLeft() / 8);
    }
    assert(bitstream.pos % 8 === 0);
    yield {
      type: obuType,
      data: packet.subarray(bitstream.pos / 8, bitstream.pos / 8 + obuSize)
    };
    bitstream.skipBits(obuSize * 8);
  }
};
var extractAv1CodecInfoFromPacket = (packet) => {
  for (const { type, data } of iterateAv1PacketObus(packet)) {
    if (type !== 1) {
      continue;
    }
    const bitstream = new Bitstream(data);
    const seqProfile = bitstream.readBits(3);
    const stillPicture = bitstream.readBits(1);
    const reducedStillPictureHeader = bitstream.readBits(1);
    let seqLevel = 0;
    let seqTier = 0;
    let bufferDelayLengthMinus1 = 0;
    if (reducedStillPictureHeader) {
      seqLevel = bitstream.readBits(5);
    } else {
      const timingInfoPresentFlag = bitstream.readBits(1);
      let decoderModelInfoPresentFlag = 0;
      if (timingInfoPresentFlag) {
        bitstream.skipBits(32);
        bitstream.skipBits(32);
        const equalPictureInterval = bitstream.readBits(1);
        if (equalPictureInterval) {
          let leadingZeros = 0;
          while (leadingZeros < 32 && !bitstream.readBits(1)) {
            leadingZeros++;
          }
          if (leadingZeros < 32) {
            bitstream.skipBits(leadingZeros);
          }
        }
        decoderModelInfoPresentFlag = bitstream.readBits(1);
        if (decoderModelInfoPresentFlag) {
          bufferDelayLengthMinus1 = bitstream.readBits(5);
          bitstream.skipBits(32);
          bitstream.skipBits(5);
          bitstream.skipBits(5);
        }
      }
      const initialDisplayDelayPresentFlag = bitstream.readBits(1);
      const operatingPointsCntMinus1 = bitstream.readBits(5);
      for (let i = 0; i <= operatingPointsCntMinus1; i++) {
        bitstream.skipBits(12);
        const seqLevelIdx = bitstream.readBits(5);
        if (i === 0) {
          seqLevel = seqLevelIdx;
        }
        if (seqLevelIdx > 7) {
          const seqTierTemp = bitstream.readBits(1);
          if (i === 0) {
            seqTier = seqTierTemp;
          }
        }
        if (decoderModelInfoPresentFlag) {
          const decoderModelPresentForThisOp = bitstream.readBits(1);
          if (decoderModelPresentForThisOp) {
            const n = bufferDelayLengthMinus1 + 1;
            bitstream.skipBits(n);
            bitstream.skipBits(n);
            bitstream.skipBits(1);
          }
        }
        if (initialDisplayDelayPresentFlag) {
          const initialDisplayDelayPresentForThisOp = bitstream.readBits(1);
          if (initialDisplayDelayPresentForThisOp) {
            bitstream.skipBits(4);
          }
        }
      }
    }
    const frameWidthBitsMinus1 = bitstream.readBits(4);
    const frameHeightBitsMinus1 = bitstream.readBits(4);
    const n1 = frameWidthBitsMinus1 + 1;
    bitstream.skipBits(n1);
    const n2 = frameHeightBitsMinus1 + 1;
    bitstream.skipBits(n2);
    let frameIdNumbersPresentFlag = 0;
    if (reducedStillPictureHeader) {
      frameIdNumbersPresentFlag = 0;
    } else {
      frameIdNumbersPresentFlag = bitstream.readBits(1);
    }
    if (frameIdNumbersPresentFlag) {
      bitstream.skipBits(4);
      bitstream.skipBits(3);
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    if (!reducedStillPictureHeader) {
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      const enableOrderHint = bitstream.readBits(1);
      if (enableOrderHint) {
        bitstream.skipBits(1);
        bitstream.skipBits(1);
      }
      const seqChooseScreenContentTools = bitstream.readBits(1);
      let seqForceScreenContentTools = 0;
      if (seqChooseScreenContentTools) {
        seqForceScreenContentTools = 2;
      } else {
        seqForceScreenContentTools = bitstream.readBits(1);
      }
      if (seqForceScreenContentTools > 0) {
        const seqChooseIntegerMv = bitstream.readBits(1);
        if (!seqChooseIntegerMv) {
          bitstream.skipBits(1);
        }
      }
      if (enableOrderHint) {
        bitstream.skipBits(3);
      }
    }
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    const highBitdepth = bitstream.readBits(1);
    let bitDepth = 8;
    if (seqProfile === 2 && highBitdepth) {
      const twelveBit = bitstream.readBits(1);
      bitDepth = twelveBit ? 12 : 10;
    } else if (seqProfile <= 2) {
      bitDepth = highBitdepth ? 10 : 8;
    }
    let monochrome = 0;
    if (seqProfile !== 1) {
      monochrome = bitstream.readBits(1);
    }
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    const colorDescriptionPresentFlag = bitstream.readBits(1);
    if (colorDescriptionPresentFlag) {
      colourPrimaries = bitstream.readBits(8);
      transferCharacteristics = bitstream.readBits(8);
      matrixCoefficients = bitstream.readBits(8);
    }
    let videoFullRangeFlag = 0;
    let chromaSubsamplingX = 1;
    let chromaSubsamplingY = 1;
    let chromaSamplePosition = 0;
    if (monochrome) {
      videoFullRangeFlag = bitstream.readBits(1);
    } else if (colourPrimaries === 1 && transferCharacteristics === 13 && matrixCoefficients === 0) {
      videoFullRangeFlag = 1;
      chromaSubsamplingX = 0;
      chromaSubsamplingY = 0;
    } else {
      videoFullRangeFlag = bitstream.readBits(1);
      if (seqProfile === 0) {
        chromaSubsamplingX = 1;
        chromaSubsamplingY = 1;
      } else if (seqProfile === 1) {
        chromaSubsamplingX = 0;
        chromaSubsamplingY = 0;
      } else {
        if (bitDepth === 12) {
          chromaSubsamplingX = bitstream.readBits(1);
          chromaSubsamplingY = chromaSubsamplingX ? bitstream.readBits(1) : 0;
        } else {
          chromaSubsamplingX = 1;
          chromaSubsamplingY = 0;
        }
      }
      if (chromaSubsamplingX && chromaSubsamplingY) {
        chromaSamplePosition = bitstream.readBits(2);
      }
    }
    return {
      profile: seqProfile,
      level: seqLevel,
      tier: seqTier,
      bitDepth,
      monochrome,
      chromaSubsamplingX,
      chromaSubsamplingY,
      chromaSamplePosition,
      videoFullRangeFlag,
      colourPrimaries,
      transferCharacteristics,
      matrixCoefficients
    };
  }
  return null;
};
var av1CodecInfoHasColorInfo = (info) => {
  return info.colourPrimaries !== 2 || info.transferCharacteristics !== 2 || info.matrixCoefficients !== 2;
};
var extractProresCodecInfoFromPacket = (packet) => {
  const frameHeaderStart = 8;
  if (packet.length < frameHeaderStart + 20) {
    return null;
  }
  const view = toDataView(packet);
  if (view.getUint32(4) !== 1768124518) {
    return null;
  }
  const headerSize = view.getUint16(frameHeaderStart);
  if (headerSize < 20) {
    return null;
  }
  return {
    fullRange: false,
    // ProRes is always limited range
    colourPrimaries: view.getUint8(frameHeaderStart + 14),
    transferCharacteristics: view.getUint8(frameHeaderStart + 15),
    matrixCoefficients: view.getUint8(frameHeaderStart + 16)
  };
};
var parseOpusIdentificationHeader = (bytes) => {
  if (bytes.byteLength < 19) {
    throw new Error("Invalid Opus identification header: too short.");
  }
  const view = toDataView(bytes);
  const outputChannelCount = view.getUint8(9);
  const preSkip = view.getUint16(10, true);
  const inputSampleRate = view.getUint32(12, true);
  const outputGain = view.getInt16(16, true);
  const channelMappingFamily = view.getUint8(18);
  let channelMappingTable = null;
  if (channelMappingFamily) {
    channelMappingTable = bytes.subarray(19);
  }
  return {
    outputChannelCount,
    preSkip,
    inputSampleRate,
    outputGain,
    channelMappingFamily,
    channelMappingTable
  };
};
var OPUS_FRAME_DURATION_TABLE = [
  480,
  960,
  1920,
  2880,
  480,
  960,
  1920,
  2880,
  480,
  960,
  1920,
  2880,
  480,
  960,
  480,
  960,
  120,
  240,
  480,
  960,
  120,
  240,
  480,
  960,
  120,
  240,
  480,
  960,
  120,
  240,
  480,
  960
];
var parseOpusTocByte = (packet) => {
  const config = packet[0] >> 3;
  const code = packet[0] & 3;
  let frameCount;
  if (code === 0) {
    frameCount = 1;
  } else if (code === 1 || code === 2) {
    frameCount = 2;
  } else {
    frameCount = packet[1] & 63;
  }
  return {
    durationInSamples: OPUS_FRAME_DURATION_TABLE[config] * frameCount
  };
};
var parseModesFromVorbisSetupPacket = (setupHeader) => {
  if (setupHeader.length < 7) {
    throw new Error("Setup header is too short.");
  }
  if (setupHeader[0] !== 5) {
    throw new Error("Wrong packet type in Setup header.");
  }
  const signature = String.fromCharCode(...setupHeader.slice(1, 7));
  if (signature !== "vorbis") {
    throw new Error("Invalid packet signature in Setup header.");
  }
  const bufSize = setupHeader.length;
  const revBuffer = new Uint8Array(bufSize);
  for (let i = 0; i < bufSize; i++) {
    revBuffer[i] = setupHeader[bufSize - 1 - i];
  }
  const bitstream = new Bitstream(revBuffer);
  let gotFramingBit = 0;
  while (bitstream.getBitsLeft() > 97) {
    if (bitstream.readBits(1) === 1) {
      gotFramingBit = bitstream.pos;
      break;
    }
  }
  if (gotFramingBit === 0) {
    throw new Error("Invalid Setup header: framing bit not found.");
  }
  let modeCount = 0;
  let gotModeHeader = false;
  let lastModeCount = 0;
  while (bitstream.getBitsLeft() >= 97) {
    const tempPos = bitstream.pos;
    const a = bitstream.readBits(8);
    const b = bitstream.readBits(16);
    const c = bitstream.readBits(16);
    if (a > 63 || b !== 0 || c !== 0) {
      bitstream.pos = tempPos;
      break;
    }
    bitstream.skipBits(1);
    modeCount++;
    if (modeCount > 64) {
      break;
    }
    const bsClone = bitstream.clone();
    const candidate = bsClone.readBits(6) + 1;
    if (candidate === modeCount) {
      gotModeHeader = true;
      lastModeCount = modeCount;
    }
  }
  if (!gotModeHeader) {
    throw new Error("Invalid Setup header: mode header not found.");
  }
  if (lastModeCount > 63) {
    throw new Error(`Unsupported mode count: ${lastModeCount}.`);
  }
  const finalModeCount = lastModeCount;
  bitstream.pos = 0;
  bitstream.skipBits(gotFramingBit);
  const modeBlockflags = Array(finalModeCount).fill(0);
  for (let i = finalModeCount - 1; i >= 0; i--) {
    bitstream.skipBits(40);
    modeBlockflags[i] = bitstream.readBits(1);
  }
  return { modeBlockflags };
};
var determineVideoPacketType = (codec, decoderConfig, packetData) => {
  switch (codec) {
    case "avc":
      {
        for (const loc of iterateAvcNalUnits(packetData, decoderConfig)) {
          const nalTypeByte = packetData[loc.offset];
          const type = extractNalUnitTypeForAvc(nalTypeByte);
          if (type >= AvcNalUnitType.NON_IDR_SLICE && type <= AvcNalUnitType.SLICE_DPC) {
            return "delta";
          }
          if (type === AvcNalUnitType.IDR) {
            return "key";
          }
          if (type === AvcNalUnitType.SEI && !isChromium()) {
            const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
            const bytes = removeEmulationPreventionBytes(nalUnit);
            let pos = 1;
            do {
              let payloadType = 0;
              while (true) {
                const nextByte = bytes[pos++];
                if (nextByte === void 0)
                  break;
                payloadType += nextByte;
                if (nextByte < 255) {
                  break;
                }
              }
              let payloadSize = 0;
              while (true) {
                const nextByte = bytes[pos++];
                if (nextByte === void 0)
                  break;
                payloadSize += nextByte;
                if (nextByte < 255) {
                  break;
                }
              }
              const PAYLOAD_TYPE_RECOVERY_POINT = 6;
              if (payloadType === PAYLOAD_TYPE_RECOVERY_POINT) {
                const bitstream = new Bitstream(bytes);
                bitstream.pos = 8 * pos;
                let recoveryFrameCount = -1;
                try {
                  recoveryFrameCount = readExpGolomb(bitstream);
                } catch {
                }
                const exactMatchFlag = bitstream.readBits(1);
                if (recoveryFrameCount === 0 && exactMatchFlag === 1) {
                  return "key";
                }
              }
              pos += payloadSize;
            } while (pos < bytes.length - 1);
          }
        }
        return "delta";
      }
      ;
    case "hevc":
      {
        for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
          const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
          if (type < HevcNalUnitType.BLA_W_LP) {
            return "delta";
          }
          if (type <= HevcNalUnitType.RSV_IRAP_VCL23) {
            return "key";
          }
        }
        return "delta";
      }
      ;
    case "vp8":
      {
        const frameType = packetData[0] & 1;
        return frameType === 0 ? "key" : "delta";
      }
      ;
    case "vp9":
      {
        const bitstream = new Bitstream(packetData);
        if (bitstream.readBits(2) !== 2) {
          return null;
        }
        ;
        const profileLowBit = bitstream.readBits(1);
        const profileHighBit = bitstream.readBits(1);
        const profile = (profileHighBit << 1) + profileLowBit;
        if (profile === 3) {
          bitstream.skipBits(1);
        }
        const showExistingFrame = bitstream.readBits(1);
        if (showExistingFrame) {
          return null;
        }
        const frameType = bitstream.readBits(1);
        return frameType === 0 ? "key" : "delta";
      }
      ;
    case "av1":
      {
        let reducedStillPictureHeader = false;
        for (const { type, data } of iterateAv1PacketObus(packetData)) {
          if (type === 1) {
            const bitstream = new Bitstream(data);
            bitstream.skipBits(4);
            reducedStillPictureHeader = !!bitstream.readBits(1);
          } else if (type === 3 || type === 6 || type === 7) {
            if (reducedStillPictureHeader) {
              return "key";
            }
            const bitstream = new Bitstream(data);
            const showExistingFrame = bitstream.readBits(1);
            if (showExistingFrame) {
              return null;
            }
            const frameType = bitstream.readBits(2);
            const showFrame = bitstream.readBits(1);
            return frameType === 0 && showFrame === 1 ? "key" : "delta";
          }
        }
        return null;
      }
      ;
    case "prores":
      {
        return "key";
      }
      ;
    default:
      {
        assertNever(codec);
        assert(false);
      }
      ;
  }
};
var countShownVideoFrames = (codec, packetData) => {
  if (codec === "vp8") {
    return packetData[0] >> 4 & 1;
  } else if (codec === "vp9") {
    const isShown = (frameData) => {
      const bitstream = new Bitstream(frameData);
      bitstream.skipBits(2);
      const profileLowBit = bitstream.readBits(1);
      const profileHighBit = bitstream.readBits(1);
      if (profileLowBit === 1 && profileHighBit === 1) {
        bitstream.skipBits(1);
      }
      const showExistingFrame = bitstream.readBits(1);
      if (showExistingFrame === 1) {
        return true;
      }
      bitstream.skipBits(1);
      const showFrame = bitstream.readBits(1);
      return showFrame === 1;
    };
    const lastByte = packetData[packetData.length - 1];
    if ((lastByte & 224) === 192) {
      const frameCount = (lastByte & 7) + 1;
      const frameSizeLength = (lastByte >> 3 & 3) + 1;
      const indexStart = packetData.length - (2 + frameCount * frameSizeLength);
      if (packetData[indexStart] === lastByte) {
        let shownFrameCount = 0;
        let frameStart = 0;
        for (let i = 0; i < frameCount; i++) {
          let frameSize = 0;
          for (let j = 0; j < frameSizeLength; j++) {
            frameSize += packetData[indexStart + 1 + i * frameSizeLength + j] * 2 ** (8 * j);
          }
          if (isShown(packetData.subarray(frameStart, frameStart + frameSize))) {
            shownFrameCount++;
          }
          frameStart += frameSize;
        }
        return shownFrameCount;
      }
    }
    return isShown(packetData) ? 1 : 0;
  }
  return 1;
};
var determineAudioPacketType = (codec, packetData) => {
  if (codec === "truehd") {
    const syncWord = packetData.byteLength >= 8 ? toDataView(packetData).getUint32(4) : null;
    return syncWord === TRUEHD_MAJOR_SYNC_WORD ? "key" : "delta";
  } else {
    return "key";
  }
};
var FlacBlockType;
(function(FlacBlockType2) {
  FlacBlockType2[FlacBlockType2["STREAMINFO"] = 0] = "STREAMINFO";
  FlacBlockType2[FlacBlockType2["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
  FlacBlockType2[FlacBlockType2["PICTURE"] = 6] = "PICTURE";
})(FlacBlockType || (FlacBlockType = {}));
var readVorbisComments = (bytes, metadataTags) => {
  const commentView = toDataView(bytes);
  let commentPos = 0;
  if (bytes.length < 4) {
    return;
  }
  const vendorStringLength = commentView.getUint32(commentPos, true);
  commentPos += 4;
  const vendorString = textDecoder.decode(bytes.subarray(commentPos, commentPos + vendorStringLength));
  commentPos += vendorStringLength;
  if (vendorStringLength > 0) {
    metadataTags.raw ??= {};
    metadataTags.raw["vendor"] ??= vendorString;
  }
  if (commentPos + 4 > bytes.length) {
    return;
  }
  const listLength = commentView.getUint32(commentPos, true);
  commentPos += 4;
  for (let i = 0; i < listLength; i++) {
    if (commentPos + 4 > bytes.length) {
      break;
    }
    const stringLength = commentView.getUint32(commentPos, true);
    commentPos += 4;
    const string = textDecoder.decode(bytes.subarray(commentPos, commentPos + stringLength));
    commentPos += stringLength;
    const separatorIndex = string.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = string.slice(0, separatorIndex).toUpperCase();
    const value = string.slice(separatorIndex + 1);
    metadataTags.raw ??= {};
    if (Array.isArray(metadataTags.raw[key])) {
      metadataTags.raw[key].push(value);
    } else if (typeof metadataTags.raw[key] === "string") {
      metadataTags.raw[key] = [metadataTags.raw[key], value];
    } else {
      metadataTags.raw[key] ??= value;
    }
    switch (key) {
      case "TITLE":
        {
          metadataTags.title ??= value;
        }
        ;
        break;
      case "DESCRIPTION":
        {
          metadataTags.description ??= value;
        }
        ;
        break;
      case "ARTIST":
        {
          metadataTags.artist ??= value;
        }
        ;
        break;
      case "ALBUM":
        {
          metadataTags.album ??= value;
        }
        ;
        break;
      case "ALBUMARTIST":
        {
          metadataTags.albumArtist ??= value;
        }
        ;
        break;
      case "COMMENT":
        {
          metadataTags.comment ??= value;
        }
        ;
        break;
      case "LYRICS":
        {
          metadataTags.lyrics ??= value;
        }
        ;
        break;
      case "TRACKNUMBER":
        {
          const parts = value.split("/");
          const trackNum = Number.parseInt(parts[0], 10);
          const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
          if (Number.isInteger(trackNum) && trackNum > 0) {
            metadataTags.trackNumber ??= trackNum;
          }
          if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
            metadataTags.tracksTotal ??= tracksTotal;
          }
        }
        ;
        break;
      case "TRACKTOTAL":
        {
          const tracksTotal = Number.parseInt(value, 10);
          if (Number.isInteger(tracksTotal) && tracksTotal > 0) {
            metadataTags.tracksTotal ??= tracksTotal;
          }
        }
        ;
        break;
      case "DISCNUMBER":
        {
          const parts = value.split("/");
          const discNum = Number.parseInt(parts[0], 10);
          const discsTotal = parts[1] && Number.parseInt(parts[1], 10);
          if (Number.isInteger(discNum) && discNum > 0) {
            metadataTags.discNumber ??= discNum;
          }
          if (discsTotal && Number.isInteger(discsTotal) && discsTotal > 0) {
            metadataTags.discsTotal ??= discsTotal;
          }
        }
        ;
        break;
      case "DISCTOTAL":
        {
          const discsTotal = Number.parseInt(value, 10);
          if (Number.isInteger(discsTotal) && discsTotal > 0) {
            metadataTags.discsTotal ??= discsTotal;
          }
        }
        ;
        break;
      case "DATE":
        {
          const date = parseIsoSuffix(value);
          if (date) {
            metadataTags.date ??= date;
          }
        }
        ;
        break;
      case "BPM":
        {
          const bpm = Number.parseInt(value, 10);
          if (Number.isInteger(bpm) && bpm > 0) {
            metadataTags.beatsPerMinute ??= bpm;
          }
        }
        ;
        break;
      case "GENRE":
        {
          metadataTags.genre ??= value;
        }
        ;
        break;
      case "METADATA_BLOCK_PICTURE":
        {
          try {
            const decoded = base64ToBytes(value);
            const view = toDataView(decoded);
            const pictureType = view.getUint32(0, false);
            const mediaTypeLength = view.getUint32(4, false);
            const mediaType = textDecoder.decode(decoded.subarray(8, 8 + mediaTypeLength));
            const descriptionLength = view.getUint32(8 + mediaTypeLength, false);
            const description = textDecoder.decode(decoded.subarray(12 + mediaTypeLength, 12 + mediaTypeLength + descriptionLength));
            const dataLength = view.getUint32(mediaTypeLength + descriptionLength + 28);
            const data = decoded.subarray(mediaTypeLength + descriptionLength + 32, mediaTypeLength + descriptionLength + 32 + dataLength);
            metadataTags.images ??= [];
            metadataTags.images.push({
              data,
              mimeType: mediaType,
              kind: pictureType === 3 ? "coverFront" : pictureType === 4 ? "coverBack" : "unknown",
              name: void 0,
              description: description || void 0
            });
          } catch {
          }
        }
        ;
        break;
    }
  }
};
var AC3_ACMOD_CHANNEL_COUNTS = [2, 1, 2, 3, 3, 4, 4, 5];
var parseAc3SyncFrame = (data) => {
  if (data.length < 7) {
    return null;
  }
  if (data[0] !== 11 || data[1] !== 119) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(16);
  bitstream.skipBits(16);
  const fscod = bitstream.readBits(2);
  if (fscod === 3) {
    return null;
  }
  const frmsizecod = bitstream.readBits(6);
  const bsid = bitstream.readBits(5);
  if (bsid > 8) {
    return null;
  }
  const bsmod = bitstream.readBits(3);
  const acmod = bitstream.readBits(3);
  if ((acmod & 1) !== 0 && acmod !== 1) {
    bitstream.skipBits(2);
  }
  if ((acmod & 4) !== 0) {
    bitstream.skipBits(2);
  }
  if (acmod === 2) {
    bitstream.skipBits(2);
  }
  const lfeon = bitstream.readBits(1);
  const bitRateCode = Math.floor(frmsizecod / 2);
  return { fscod, bsid, bsmod, acmod, lfeon, bitRateCode };
};
var AC3_FRAME_SIZES = [
  // frmsizecod, [48kHz, 44.1kHz, 32kHz] in bytes
  64 * 2,
  69 * 2,
  96 * 2,
  64 * 2,
  70 * 2,
  96 * 2,
  80 * 2,
  87 * 2,
  120 * 2,
  80 * 2,
  88 * 2,
  120 * 2,
  96 * 2,
  104 * 2,
  144 * 2,
  96 * 2,
  105 * 2,
  144 * 2,
  112 * 2,
  121 * 2,
  168 * 2,
  112 * 2,
  122 * 2,
  168 * 2,
  128 * 2,
  139 * 2,
  192 * 2,
  128 * 2,
  140 * 2,
  192 * 2,
  160 * 2,
  174 * 2,
  240 * 2,
  160 * 2,
  175 * 2,
  240 * 2,
  192 * 2,
  208 * 2,
  288 * 2,
  192 * 2,
  209 * 2,
  288 * 2,
  224 * 2,
  243 * 2,
  336 * 2,
  224 * 2,
  244 * 2,
  336 * 2,
  256 * 2,
  278 * 2,
  384 * 2,
  256 * 2,
  279 * 2,
  384 * 2,
  320 * 2,
  348 * 2,
  480 * 2,
  320 * 2,
  349 * 2,
  480 * 2,
  384 * 2,
  417 * 2,
  576 * 2,
  384 * 2,
  418 * 2,
  576 * 2,
  448 * 2,
  487 * 2,
  672 * 2,
  448 * 2,
  488 * 2,
  672 * 2,
  512 * 2,
  557 * 2,
  768 * 2,
  512 * 2,
  558 * 2,
  768 * 2,
  640 * 2,
  696 * 2,
  960 * 2,
  640 * 2,
  697 * 2,
  960 * 2,
  768 * 2,
  835 * 2,
  1152 * 2,
  768 * 2,
  836 * 2,
  1152 * 2,
  896 * 2,
  975 * 2,
  1344 * 2,
  896 * 2,
  976 * 2,
  1344 * 2,
  1024 * 2,
  1114 * 2,
  1536 * 2,
  1024 * 2,
  1115 * 2,
  1536 * 2,
  1152 * 2,
  1253 * 2,
  1728 * 2,
  1152 * 2,
  1254 * 2,
  1728 * 2,
  1280 * 2,
  1393 * 2,
  1920 * 2,
  1280 * 2,
  1394 * 2,
  1920 * 2
];
var AC3_SAMPLES_PER_FRAME = 1536;
var AC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 65, 67, 45, 51]);
var EAC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 69, 65, 67, 51]);
var EAC3_NUMBLKS_TABLE = [1, 2, 3, 6];
var parseEac3SyncFrame = (data) => {
  if (data.length < 6) {
    return null;
  }
  if (data[0] !== 11 || data[1] !== 119) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(16);
  const strmtyp = bitstream.readBits(2);
  bitstream.skipBits(3);
  if (strmtyp !== 0 && strmtyp !== 2) {
    return null;
  }
  const frmsiz = bitstream.readBits(11);
  const fscod = bitstream.readBits(2);
  let fscod2 = 0;
  let numblkscod;
  if (fscod === 3) {
    fscod2 = bitstream.readBits(2);
    numblkscod = 3;
  } else {
    numblkscod = bitstream.readBits(2);
  }
  const acmod = bitstream.readBits(3);
  const lfeon = bitstream.readBits(1);
  const bsid = bitstream.readBits(5);
  if (bsid < 11 || bsid > 16) {
    return null;
  }
  const numblks = EAC3_NUMBLKS_TABLE[numblkscod];
  let fs;
  if (fscod < 3) {
    fs = AC3_SAMPLE_RATES[fscod] / 1e3;
  } else {
    fs = EAC3_REDUCED_SAMPLE_RATES[fscod2] / 1e3;
  }
  const dataRate = Math.round((frmsiz + 1) * fs / (numblks * 16));
  const bsmod = 0;
  let numDepSub = 0;
  let chanLoc = 0;
  let offset = 2 * (frmsiz + 1);
  while (offset + 2 <= data.length) {
    bitstream.seekToByte(offset);
    if (bitstream.readBits(16) !== 2935 || bitstream.readBits(2) !== 1) {
      break;
    }
    bitstream.skipBits(3);
    const dependentFrmsiz = bitstream.readBits(11);
    bitstream.skipBits(2 + 2);
    const dependentAcmod = bitstream.readBits(3);
    bitstream.skipBits(1 + 5 + 5);
    if (bitstream.readBits(1)) {
      bitstream.skipBits(8);
    }
    if (dependentAcmod === 0) {
      bitstream.skipBits(5);
      if (bitstream.readBits(1)) {
        bitstream.skipBits(8);
      }
    }
    if (bitstream.readBits(1)) {
      const chanmap = bitstream.readBits(16);
      for (let i = 0; i < 8; i++) {
        if (chanmap & 1 << 10 - i) {
          chanLoc |= 1 << i;
        }
      }
      if (chanmap & 2) {
        chanLoc |= 1 << 8;
      }
    }
    numDepSub++;
    offset += 2 * (dependentFrmsiz + 1);
  }
  const substream = {
    fscod,
    fscod2,
    bsid,
    bsmod,
    acmod,
    lfeon,
    numDepSub,
    chanLoc
  };
  return {
    dataRate,
    substreams: [substream]
  };
};
var splitEac3AudioFrames = (data) => {
  const frames = [];
  let offset = 0;
  while (offset < data.length) {
    if (offset + 6 > data.length || data[offset] !== 11 || data[offset + 1] !== 119) {
      return null;
    }
    const strmtyp = data[offset + 2] >> 6;
    const frmsiz = (data[offset + 2] & 7) << 8 | data[offset + 3];
    const fscod = data[offset + 4] >> 6;
    const numblkscod = fscod === 3 ? 3 : data[offset + 4] >> 4 & 3;
    const bsid = data[offset + 5] >> 3;
    const size = 2 * (frmsiz + 1);
    if (bsid <= 10 || offset + size > data.length) {
      return null;
    }
    if (strmtyp === 1) {
      const lastFrame = last(frames);
      if (!lastFrame) {
        return null;
      }
      lastFrame.size += size;
    } else {
      frames.push({
        offset,
        size,
        blockCount: EAC3_NUMBLKS_TABLE[numblkscod]
      });
    }
    offset += size;
  }
  return frames;
};
var parseEac3Config = (data) => {
  if (data.length < 2) {
    return null;
  }
  const bitstream = new Bitstream(data);
  const dataRate = bitstream.readBits(13);
  const numIndSub = bitstream.readBits(3);
  const substreams = [];
  for (let i = 0; i <= numIndSub; i++) {
    if (Math.ceil(bitstream.pos / 8) + 3 > data.length) {
      break;
    }
    const fscod = bitstream.readBits(2);
    const bsid = bitstream.readBits(5);
    bitstream.skipBits(1);
    bitstream.skipBits(1);
    const bsmod = bitstream.readBits(3);
    const acmod = bitstream.readBits(3);
    const lfeon = bitstream.readBits(1);
    bitstream.skipBits(3);
    const numDepSub = bitstream.readBits(4);
    let chanLoc = 0;
    if (numDepSub > 0) {
      chanLoc = bitstream.readBits(9);
    } else {
      bitstream.skipBits(1);
    }
    substreams.push({
      fscod,
      fscod2: null,
      bsid,
      bsmod,
      acmod,
      lfeon,
      numDepSub,
      chanLoc
    });
  }
  if (substreams.length === 0) {
    return null;
  }
  return { dataRate, substreams };
};
var getEac3SampleRate = (config) => {
  const sub = config.substreams[0];
  assert(sub);
  if (sub.fscod < 3) {
    return AC3_SAMPLE_RATES[sub.fscod];
  } else if (sub.fscod2 !== null && sub.fscod2 < 3) {
    return EAC3_REDUCED_SAMPLE_RATES[sub.fscod2];
  }
  return null;
};
var getEac3ChannelCount = (config) => {
  const sub = config.substreams[0];
  assert(sub);
  let channels = AC3_ACMOD_CHANNEL_COUNTS[sub.acmod] + sub.lfeon;
  if (sub.numDepSub > 0) {
    const CHAN_LOC_COUNTS = [2, 2, 1, 1, 2, 2, 2, 1, 1];
    for (let bit = 0; bit < 9; bit++) {
      if (sub.chanLoc & 1 << bit) {
        channels += CHAN_LOC_COUNTS[bit];
      }
    }
  }
  return channels;
};
var DTS_EXSS_SYNC_WORD = 1683496997;
var DTS_CORE_FRAME_HEADER_SIZE = 18;
var DTS_EXSS_HEADER_PREFIX_SIZE = 10;
var DTS_EXSS_MAX_HEADER_SIZE = 4096;
var DTS_PCM_BLOCK_SAMPLES = 32;
var DTS_SPECIFIC_BOX_SIZE = 20;
var DTS_SUBBAND_SAMPLES = 8;
var DTS_CORE_SAMPLE_RATES = [
  0,
  8e3,
  16e3,
  32e3,
  0,
  0,
  11025,
  22050,
  44100,
  0,
  0,
  12e3,
  24e3,
  48e3,
  96e3,
  192e3
];
var DTS_CORE_BIT_RATES = [
  32e3,
  56e3,
  64e3,
  96e3,
  112e3,
  128e3,
  192e3,
  224e3,
  256e3,
  32e4,
  384e3,
  448e3,
  512e3,
  576e3,
  64e4,
  768e3,
  96e4,
  1024e3,
  1152e3,
  128e4,
  1344e3,
  1408e3,
  1411200,
  1472e3,
  1536e3,
  192e4,
  2048e3,
  3072e3,
  384e4,
  0,
  0,
  0
];
var DTS_PCM_RESOLUTIONS = [16, 16, 20, 20, 0, 24, 24, 0];
var DTS_AMODE_CHANNEL_COUNTS = [1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 6, 7, 8, 8];
var DTS_AMODE_CHANNEL_LAYOUTS = [
  1,
  2,
  2,
  2,
  2,
  3,
  18,
  19,
  6,
  7,
  518,
  323,
  83,
  519,
  582,
  535
];
var DTS_CHANNEL_LAYOUT_LFE1 = 8;
var DTS_CHANNEL_LAYOUT_PAIR_MASK = 44646;
var DTS_EXSS_REF_CLOCKS = [32e3, 44100, 48e3, 0];
var DTS_EXSS_SAMPLE_RATES = [
  8e3,
  16e3,
  32e3,
  64e3,
  128e3,
  22050,
  44100,
  88200,
  176400,
  352800,
  12e3,
  24e3,
  48e3,
  96e3,
  192e3,
  384e3
];
var DTS_SPECIFIC_BOX_FRAME_DURATIONS = [512, 1024, 2048, 4096];
var parseDtsFrame = (data) => {
  const core = parseDtsCoreFrameHeader(data);
  const view = toDataView(data);
  let offset = core ? Math.ceil(core.frameSize / 4) * 4 : 0;
  let firstExss = null;
  while (offset + 4 <= data.length && view.getUint32(offset) === DTS_EXSS_SYNC_WORD) {
    const exss = parseDtsExssHeader(data.subarray(offset));
    if (!exss) {
      break;
    }
    firstExss ??= exss;
    offset += exss.frameSize;
  }
  if (core) {
    return {
      frameSize: firstExss ? offset : core.frameSize,
      sampleRate: core.sampleRate,
      numberOfChannels: core.numberOfChannels,
      sampleCount: core.sampleCount,
      channelLayout: core.channelLayout,
      pcmResolution: core.pcmResolution,
      bitRate: core.bitRate,
      core,
      hasExtensions: firstExss !== null
    };
  }
  if (!firstExss?.asset) {
    return null;
  }
  const { asset } = firstExss;
  return {
    frameSize: offset,
    sampleRate: asset.sampleRate,
    numberOfChannels: asset.numberOfChannels,
    sampleCount: asset.sampleCount,
    channelLayout: asset.channelLayout,
    pcmResolution: asset.pcmResolution,
    bitRate: 0,
    core: null,
    hasExtensions: true
  };
};
var extractDtsFourCcFromPacket = (data) => {
  const frameInfo = parseDtsFrame(data);
  if (!frameInfo?.core) {
    return null;
  }
  return frameInfo.hasExtensions ? "dtsh" : "dtsc";
};
var parseDtsCoreFrameHeader = (data) => {
  if (data.length < DTS_CORE_FRAME_HEADER_SIZE) {
    return null;
  }
  if (data[0] !== 127 || data[1] !== 254 || data[2] !== 128 || data[3] !== 1) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(32);
  bitstream.skipBits(1);
  if (bitstream.readBits(5) !== DTS_PCM_BLOCK_SAMPLES - 1) {
    return null;
  }
  const cpf = bitstream.readBits(1);
  const npcmblocks = bitstream.readBits(7) + 1;
  if (npcmblocks % DTS_SUBBAND_SAMPLES !== 0) {
    return null;
  }
  const frameSize = bitstream.readBits(14) + 1;
  if (frameSize < 96) {
    return null;
  }
  const amode = bitstream.readBits(6);
  if (amode >= DTS_AMODE_CHANNEL_COUNTS.length) {
    return null;
  }
  const sampleRate = DTS_CORE_SAMPLE_RATES[bitstream.readBits(4)];
  if (sampleRate === 0) {
    return null;
  }
  const bitRate = DTS_CORE_BIT_RATES[bitstream.readBits(5)];
  if (bitstream.readBits(1) !== 0) {
    return null;
  }
  bitstream.skipBits(1 + 1 + 1 + 1);
  const extAudioId = bitstream.readBits(3);
  const extAudio = bitstream.readBits(1);
  bitstream.skipBits(1);
  const lff = bitstream.readBits(2);
  if (lff === 3) {
    return null;
  }
  bitstream.skipBits(1);
  if (cpf) {
    bitstream.skipBits(16);
  }
  bitstream.skipBits(1 + 4 + 2);
  const pcmResolution = DTS_PCM_RESOLUTIONS[bitstream.readBits(3)];
  if (pcmResolution === 0) {
    return null;
  }
  const lfePresent = lff !== 0;
  return {
    frameSize,
    sampleRate,
    numberOfChannels: DTS_AMODE_CHANNEL_COUNTS[amode] + (lfePresent ? 1 : 0),
    sampleCount: npcmblocks * DTS_PCM_BLOCK_SAMPLES,
    channelLayout: DTS_AMODE_CHANNEL_LAYOUTS[amode] | (lfePresent ? DTS_CHANNEL_LAYOUT_LFE1 : 0),
    amode,
    lfePresent,
    bitRate,
    pcmResolution,
    extAudioId: extAudio ? extAudioId : null
  };
};
var parseDtsExssHeader = (data) => {
  if (data.length < DTS_EXSS_HEADER_PREFIX_SIZE) {
    return null;
  }
  if (data[0] !== 100 || data[1] !== 88 || data[2] !== 32 || data[3] !== 37) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.skipBits(32);
  bitstream.skipBits(8);
  const extSsIndex = bitstream.readBits(2);
  const wideHeader = bitstream.readBits(1);
  const headerSizeBits = 8 + 4 * wideHeader;
  const frameSizeBits = 16 + 4 * wideHeader;
  bitstream.skipBits(headerSizeBits);
  const frameSize = bitstream.readBits(frameSizeBits) + 1;
  const incomplete = { frameSize, asset: null };
  if (!bitstream.readBits(1)) {
    return incomplete;
  }
  const refClock = DTS_EXSS_REF_CLOCKS[bitstream.readBits(2)];
  const frameDurationCycles = 512 * (bitstream.readBits(3) + 1);
  if (bitstream.readBits(1)) {
    bitstream.skipBits(32 + 4);
  }
  const numAudioPresentations = bitstream.readBits(3) + 1;
  const numAssets = bitstream.readBits(3) + 1;
  const activeExssMasks = [];
  for (let i = 0; i < numAudioPresentations; i++) {
    activeExssMasks.push(bitstream.readBits(extSsIndex + 1));
  }
  for (const mask of activeExssMasks) {
    bitstream.skipBits(8 * popcount(mask));
  }
  if (bitstream.readBits(1)) {
    bitstream.skipBits(2);
    const spkrMaskBits = bitstream.readBits(2) + 1 << 2;
    const numMixOutConfigs = bitstream.readBits(2) + 1;
    bitstream.skipBits(numMixOutConfigs * spkrMaskBits);
  }
  for (let i = 0; i < numAssets; i++) {
    bitstream.skipBits(frameSizeBits);
  }
  bitstream.skipBits(9);
  bitstream.skipBits(3);
  if (bitstream.readBits(1)) {
    bitstream.skipBits(4);
  }
  if (bitstream.readBits(1)) {
    bitstream.skipBits(24);
  }
  if (bitstream.readBits(1)) {
    bitstream.skipBits(8 * (bitstream.readBits(10) + 1));
  }
  const pcmResolution = bitstream.readBits(5) + 1;
  const sampleRate = DTS_EXSS_SAMPLE_RATES[bitstream.readBits(4)];
  const numberOfChannels = bitstream.readBits(8) + 1;
  let channelLayout = 0;
  if (bitstream.readBits(1)) {
    if (numberOfChannels > 2) {
      bitstream.skipBits(1);
    }
    if (numberOfChannels > 6) {
      bitstream.skipBits(1);
    }
    if (bitstream.readBits(1)) {
      const spkrMaskBits = bitstream.readBits(2) + 1 << 2;
      channelLayout = bitstream.readBits(spkrMaskBits);
    }
  }
  if (refClock === 0 || bitstream.getBitsLeft() < 0) {
    return incomplete;
  }
  return {
    frameSize,
    asset: {
      sampleRate,
      numberOfChannels,
      sampleCount: Math.round(frameDurationCycles * sampleRate / refClock),
      channelLayout,
      pcmResolution
    }
  };
};
var parseDtsSpecificBox = (data) => {
  if (data.length < DTS_SPECIFIC_BOX_SIZE) {
    return null;
  }
  const view = toDataView(data);
  const sampleRate = view.getUint32(0);
  if (sampleRate === 0) {
    return null;
  }
  const bitstream = new Bitstream(data);
  bitstream.seekToByte(13);
  const frameDuration = bitstream.readBits(2);
  bitstream.skipBits(5);
  const coreLfePresent = bitstream.readBits(1);
  const coreLayout = bitstream.readBits(6);
  bitstream.skipBits(14);
  bitstream.skipBits(1);
  bitstream.skipBits(3);
  const channelLayout = bitstream.readBits(16);
  let numberOfChannels = null;
  if (channelLayout !== 0) {
    numberOfChannels = getDtsChannelCount(channelLayout);
  } else if (coreLayout < DTS_AMODE_CHANNEL_COUNTS.length) {
    numberOfChannels = DTS_AMODE_CHANNEL_COUNTS[coreLayout] + coreLfePresent;
  }
  return {
    sampleRate,
    maxBitrate: view.getUint32(4),
    avgBitrate: view.getUint32(8),
    pcmSampleDepth: data[12],
    sampleCount: DTS_SPECIFIC_BOX_FRAME_DURATIONS[frameDuration],
    channelLayout,
    numberOfChannels
  };
};
var getDtsChannelCount = (channelLayout) => {
  return popcount(channelLayout) + popcount(channelLayout & DTS_CHANNEL_LAYOUT_PAIR_MASK);
};

// node_modules/mediabunny/dist/modules/src/sample.js
var __addDisposableResource = function(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
};
var __disposeResources = /* @__PURE__ */ (function(SuppressedError2) {
  return function(env) {
    function fail(e) {
      env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
      env.hasError = true;
    }
    var r, s = 0;
    function next() {
      while (r = env.stack.pop()) {
        try {
          if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
          if (r.dispose) {
            var result = r.dispose.call(r.value);
            if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
              fail(e);
              return next();
            });
          } else s |= 1;
        } catch (e) {
          fail(e);
        }
      }
      if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
      if (env.hasError) throw env.error;
    }
    return next();
  };
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
polyfillSymbolDispose();
var lastVideoGcErrorLog = -Infinity;
var lastAudioGcErrorLog = -Infinity;
var finalizationRegistry = null;
if (typeof FinalizationRegistry !== "undefined") {
  finalizationRegistry = new FinalizationRegistry((value) => {
    const now = performance.now();
    if (value.type === "video") {
      if (now - lastVideoGcErrorLog >= 1e3) {
        Logging._error(`A VideoSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your VideoSamples as soon as you're done using them.`);
        lastVideoGcErrorLog = now;
      }
      if (typeof VideoFrame !== "undefined" && value.data instanceof VideoFrame) {
        value.data.close();
      }
    } else {
      if (now - lastAudioGcErrorLog >= 1e3) {
        Logging._error(`An AudioSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your AudioSamples as soon as you're done using them.`);
        lastAudioGcErrorLog = now;
      }
      if (typeof AudioData !== "undefined" && value.data instanceof AudioData) {
        value.data.close();
      }
    }
  });
}
var VideoSampleResource = class {
  constructor() {
    this._referenceCount = 0;
    this._lastAllocationBuffer = null;
  }
};
var VIDEO_SAMPLE_PIXEL_FORMATS = [
  // 4:2:0 Y, U, V
  "I420",
  "I420P10",
  "I420P12",
  // 4:2:0 Y, U, V, A
  "I420A",
  "I420AP10",
  "I420AP12",
  // 4:2:2 Y, U, V
  "I422",
  "I422P10",
  "I422P12",
  // 4:2:2 Y, U, V, A
  "I422A",
  "I422AP10",
  "I422AP12",
  // 4:4:4 Y, U, V
  "I444",
  "I444P10",
  "I444P12",
  // 4:4:4 Y, U, V, A
  "I444A",
  "I444AP10",
  "I444AP12",
  // 4:2:0 Y, UV
  "NV12",
  // 4:4:4 RGBA
  "RGBA",
  // 4:4:4 RGBX (opaque)
  "RGBX",
  // 4:4:4 BGRA
  "BGRA",
  // 4:4:4 BGRX (opaque)
  "BGRX"
];
var VIDEO_SAMPLE_PIXEL_FORMATS_SET = new Set(VIDEO_SAMPLE_PIXEL_FORMATS);
var VideoSample = class _VideoSample {
  /** The width of the frame in pixels. */
  get codedWidth() {
    return this.visibleRect.width;
  }
  /** The height of the frame in pixels. */
  get codedHeight() {
    return this.visibleRect.height;
  }
  /** The display width of the frame in pixels, after aspect ratio adjustment, rotation and flip. */
  get displayWidth() {
    return this.rotation % 180 === 0 ? this.squarePixelWidth : this.squarePixelHeight;
  }
  /** The display height of the frame in pixels, after aspect ratio adjustment, rotation and flip. */
  get displayHeight() {
    return this.rotation % 180 === 0 ? this.squarePixelHeight : this.squarePixelWidth;
  }
  /** The presentation timestamp of the frame in microseconds. */
  get microsecondTimestamp() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.timestamp);
  }
  /** The duration of the frame in microseconds. */
  get microsecondDuration() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.duration);
  }
  /**
   * Whether this sample uses a pixel format that can hold transparency data. Note that this doesn't necessarily mean
   * that the sample is transparent.
   */
  get hasAlpha() {
    return this.format && this.format.includes("A");
  }
  constructor(data, init) {
    this._closed = false;
    if (data instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && data instanceof SharedArrayBuffer || ArrayBuffer.isView(data)) {
      if (!init || typeof init !== "object") {
        throw new TypeError("init must be an object.");
      }
      if (init.format === void 0 || !VIDEO_SAMPLE_PIXEL_FORMATS_SET.has(init.format)) {
        throw new TypeError("init.format must be one of: " + VIDEO_SAMPLE_PIXEL_FORMATS.join(", "));
      }
      if (!Number.isInteger(init.codedWidth) || init.codedWidth <= 0) {
        throw new TypeError("init.codedWidth must be a positive integer.");
      }
      if (!Number.isInteger(init.codedHeight) || init.codedHeight <= 0) {
        throw new TypeError("init.codedHeight must be a positive integer.");
      }
      if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
        throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
      }
      if (init.flip !== void 0 && typeof init.flip !== "boolean") {
        throw new TypeError("init.flip, when provided, must be a boolean.");
      }
      if (!Number.isFinite(init.timestamp)) {
        throw new TypeError("init.timestamp must be a number.");
      }
      if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
        throw new TypeError("init.duration, when provided, must be a non-negative number.");
      }
      if (init.layout !== void 0) {
        if (!Array.isArray(init.layout)) {
          throw new TypeError("init.layout, when provided, must be an array.");
        }
        for (const plane of init.layout) {
          if (!plane || typeof plane !== "object" || Array.isArray(plane)) {
            throw new TypeError("Each entry in init.layout must be an object.");
          }
          if (!Number.isInteger(plane.offset) || plane.offset < 0) {
            throw new TypeError("plane.offset must be a non-negative integer.");
          }
          if (!Number.isInteger(plane.stride) || plane.stride < 0) {
            throw new TypeError("plane.stride must be a non-negative integer.");
          }
        }
        const planeCount = getPlaneConfigs(init.format).length;
        if (init.layout.length !== planeCount) {
          throw new TypeError(`init.layout must have ${planeCount} entries for format ${init.format}.`);
        }
      }
      if (init.visibleRect !== void 0) {
        validateVisibleRect(init.visibleRect);
      }
      if (init.displayWidth !== void 0 && (!Number.isInteger(init.displayWidth) || init.displayWidth <= 0)) {
        throw new TypeError("init.displayWidth, when provided, must be a positive integer.");
      }
      if (init.displayHeight !== void 0 && (!Number.isInteger(init.displayHeight) || init.displayHeight <= 0)) {
        throw new TypeError("init.displayHeight, when provided, must be a positive integer.");
      }
      if (init.displayWidth !== void 0 !== (init.displayHeight !== void 0)) {
        throw new TypeError("init.displayWidth and init.displayHeight must be either both provided or both omitted.");
      }
      this.format = init.format;
      this.rotation = init.rotation ?? 0;
      this.flip = init.flip ?? false;
      this.timestamp = init.timestamp;
      this.duration = init.duration ?? 0;
      const layout = init.layout ?? createDefaultPlaneLayout(init.format, init.codedWidth, init.codedHeight);
      let colorSpaceInit = init.colorSpace ?? null;
      if (colorSpaceInit === null) {
        if (this.format === "RGBA" || this.format === "RGBX" || this.format === "BGRA" || this.format === "BGRX") {
          colorSpaceInit = {
            primaries: "bt709",
            transfer: "iec61966-2-1",
            matrix: "rgb",
            fullRange: true
          };
        } else {
          colorSpaceInit = {
            primaries: "bt709",
            transfer: "bt709",
            matrix: "bt709",
            fullRange: false
          };
        }
      }
      this.visibleRect = {
        left: init.visibleRect?.left ?? 0,
        top: init.visibleRect?.top ?? 0,
        width: init.visibleRect?.width ?? init.codedWidth,
        height: init.visibleRect?.height ?? init.codedHeight
      };
      if (init.displayWidth !== void 0) {
        this.squarePixelWidth = this.rotation % 180 === 0 ? init.displayWidth : init.displayHeight;
        this.squarePixelHeight = this.rotation % 180 === 0 ? init.displayHeight : init.displayWidth;
      } else {
        this.squarePixelWidth = this.visibleRect.width;
        this.squarePixelHeight = this.visibleRect.height;
      }
      this._data = init._doNotCopy ? toUint8Array(data) : toUint8Array(data).slice();
      this._layout = layout;
      this.colorSpace = new VideoSampleColorSpace(colorSpaceInit);
    } else if (typeof VideoFrame !== "undefined" && data instanceof VideoFrame) {
      if (data.codedWidth === 0) {
        throw new TypeError("data must not be a closed VideoFrame.");
      }
      if (init?.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
        throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
      }
      if (init?.flip !== void 0 && typeof init.flip !== "boolean") {
        throw new TypeError("init.flip, when provided, must be a boolean.");
      }
      if (init?.timestamp !== void 0 && !Number.isFinite(init?.timestamp)) {
        throw new TypeError("init.timestamp, when provided, must be a number.");
      }
      if (init?.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
        throw new TypeError("init.duration, when provided, must be a non-negative number.");
      }
      if (init?.visibleRect !== void 0) {
        validateVisibleRect(init.visibleRect);
      }
      this._data = data;
      this._layout = null;
      this.format = data.format;
      this.visibleRect = {
        left: data.visibleRect?.x ?? 0,
        top: data.visibleRect?.y ?? 0,
        width: data.visibleRect?.width ?? data.codedWidth,
        height: data.visibleRect?.height ?? data.codedHeight
      };
      this.rotation = init?.rotation ?? 0;
      this.flip = init?.flip ?? false;
      this.squarePixelWidth = data.displayWidth;
      this.squarePixelHeight = data.displayHeight;
      this.timestamp = init?.timestamp ?? data.timestamp / 1e6;
      this.duration = init?.duration ?? (data.duration ?? 0) / 1e6;
      const { primaries, transfer, matrix, fullRange } = data.colorSpace;
      this.colorSpace = new VideoSampleColorSpace({
        primaries: primaries !== null && primaries in COLOR_PRIMARIES_MAP ? primaries : null,
        transfer: transfer !== null && transfer in TRANSFER_CHARACTERISTICS_MAP ? transfer : null,
        matrix: matrix !== null && matrix in MATRIX_COEFFICIENTS_MAP ? matrix : null,
        fullRange
      });
    } else if (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement || typeof SVGImageElement !== "undefined" && data instanceof SVGImageElement || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) {
      if (!init || typeof init !== "object") {
        throw new TypeError("init must be an object.");
      }
      if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
        throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
      }
      if (init.flip !== void 0 && typeof init.flip !== "boolean") {
        throw new TypeError("init.flip, when provided, must be a boolean.");
      }
      if (!Number.isFinite(init.timestamp)) {
        throw new TypeError("init.timestamp must be a number.");
      }
      if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
        throw new TypeError("init.duration, when provided, must be a non-negative number.");
      }
      if (init.visibleRect !== void 0) {
        validateVisibleRect(init.visibleRect);
      }
      if (typeof VideoFrame !== "undefined") {
        return new _VideoSample(new VideoFrame(data, {
          timestamp: Math.trunc(init.timestamp * SECOND_TO_MICROSECOND_FACTOR),
          // Drag 0 to undefined
          duration: Math.trunc((init.duration ?? 0) * SECOND_TO_MICROSECOND_FACTOR) || void 0,
          // WebCodecs wants DOMRectInit
          visibleRect: init.visibleRect && {
            x: init.visibleRect.left,
            y: init.visibleRect.top,
            width: init.visibleRect.width,
            height: init.visibleRect.height
          }
        }), init);
      }
      let width = 0;
      let height = 0;
      if ("naturalWidth" in data) {
        width = data.naturalWidth;
        height = data.naturalHeight;
      } else if ("videoWidth" in data) {
        width = data.videoWidth;
        height = data.videoHeight;
      } else if ("width" in data) {
        width = Number(data.width);
        height = Number(data.height);
      }
      if (!width || !height) {
        throw new TypeError("Could not determine dimensions.");
      }
      const visibleRect = init.visibleRect ?? { left: 0, top: 0, width, height };
      const canvas = new OffscreenCanvas(visibleRect.width, visibleRect.height);
      const context = canvas.getContext("2d", {
        alpha: isFirefox(),
        // Firefox has VideoFrame glitches with opaque canvases
        willReadFrequently: true
      });
      if (!context) {
        throw new Error("OffscreenCanvas must have support for the '2d' context in order to create a VideoSample from this data.");
      }
      context.drawImage(data, -visibleRect.left, -visibleRect.top);
      this._data = canvas;
      this._layout = null;
      this.format = "RGBX";
      this.visibleRect = { left: 0, top: 0, width: visibleRect.width, height: visibleRect.height };
      this.squarePixelWidth = visibleRect.width;
      this.squarePixelHeight = visibleRect.height;
      this.rotation = init.rotation ?? 0;
      this.flip = init.flip ?? false;
      this.timestamp = init.timestamp;
      this.duration = init.duration ?? 0;
      this.colorSpace = new VideoSampleColorSpace({
        matrix: "rgb",
        primaries: "bt709",
        transfer: "iec61966-2-1",
        fullRange: true
      });
    } else if (data instanceof VideoSampleResource) {
      if (!init || typeof init !== "object") {
        throw new TypeError("init must be an object.");
      }
      if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
        throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
      }
      if (init.flip !== void 0 && typeof init.flip !== "boolean") {
        throw new TypeError("init.flip, when provided, must be a boolean.");
      }
      if (!Number.isFinite(init.timestamp)) {
        throw new TypeError("init.timestamp must be a number.");
      }
      if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
        throw new TypeError("init.duration, when provided, must be a non-negative number.");
      }
      this.format = data.getFormat();
      if (this.format !== null && !VIDEO_SAMPLE_PIXEL_FORMATS.includes(this.format)) {
        throw new TypeError("getFormat() must return a VideoSamplePixelFormat or null.");
      }
      this.visibleRect = {
        left: 0,
        top: 0,
        width: data.getCodedWidth(),
        height: data.getCodedHeight()
      };
      if (!Number.isInteger(this.visibleRect.width) || this.visibleRect.width <= 0) {
        throw new TypeError("getCodedWidth() must return a positive integer.");
      }
      if (!Number.isInteger(this.visibleRect.height) || this.visibleRect.height <= 0) {
        throw new TypeError("getCodedHeight() must return a positive integer.");
      }
      this.squarePixelWidth = data.getSquarePixelWidth();
      if (!Number.isInteger(this.squarePixelWidth) || this.squarePixelWidth <= 0) {
        throw new TypeError("getSquarePixelWidth() must return a positive integer.");
      }
      this.squarePixelHeight = data.getSquarePixelHeight();
      if (!Number.isInteger(this.squarePixelHeight) || this.squarePixelHeight <= 0) {
        throw new TypeError("getSquarePixelHeight() must return a positive integer.");
      }
      this.rotation = init.rotation ?? 0;
      this.flip = init.flip ?? false;
      this.timestamp = init.timestamp;
      this.duration = init.duration ?? 0;
      this.colorSpace = data.getColorSpace();
      this._data = data;
      data._referenceCount++;
    } else {
      throw new TypeError("Invalid data type: Must be a BufferSource, CanvasImageSource, or VideoSampleResource.");
    }
    this.encodeOptions = init?.encodeOptions ?? {};
    this.pixelAspectRatio = simplifyRational({
      num: this.squarePixelWidth * this.codedHeight,
      den: this.squarePixelHeight * this.codedWidth
    });
    finalizationRegistry?.register(this, { type: "video", data: this._data }, this);
  }
  /** Clones this video sample. */
  clone() {
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    assert(this._data !== null);
    if (this._data instanceof VideoSampleResource) {
      return new _VideoSample(this._data, {
        timestamp: this.timestamp,
        duration: this.duration,
        rotation: this.rotation,
        flip: this.flip,
        encodeOptions: this.encodeOptions
      });
    } else if (isVideoFrame(this._data)) {
      return new _VideoSample(this._data.clone(), {
        timestamp: this.timestamp,
        duration: this.duration,
        rotation: this.rotation,
        flip: this.flip,
        encodeOptions: this.encodeOptions
      });
    } else if (this._data instanceof Uint8Array) {
      assert(this._layout);
      return new _VideoSample(this._data, {
        format: this.format,
        layout: this._layout,
        codedWidth: this.codedWidth,
        codedHeight: this.codedHeight,
        timestamp: this.timestamp,
        duration: this.duration,
        colorSpace: this.colorSpace,
        rotation: this.rotation,
        flip: this.flip,
        visibleRect: this.visibleRect,
        displayWidth: this.displayWidth,
        displayHeight: this.displayHeight,
        encodeOptions: this.encodeOptions,
        // It's already been copied, if we copy it again we make the clone unnecessarily expensive
        _doNotCopy: true
      });
    } else {
      return new _VideoSample(this._data, {
        format: this.format,
        codedWidth: this.codedWidth,
        codedHeight: this.codedHeight,
        timestamp: this.timestamp,
        duration: this.duration,
        colorSpace: this.colorSpace,
        rotation: this.rotation,
        flip: this.flip,
        visibleRect: this.visibleRect,
        displayWidth: this.displayWidth,
        displayHeight: this.displayHeight,
        encodeOptions: this.encodeOptions
      });
    }
  }
  /**
   * Closes this video sample, releasing held resources. Video samples should be closed as soon as they are not
   * needed anymore.
   */
  close() {
    if (this._closed) {
      return;
    }
    finalizationRegistry?.unregister(this);
    if (this._data instanceof VideoSampleResource) {
      this._data._referenceCount--;
      if (this._data._referenceCount === 0) {
        this._data.close();
      }
    } else if (isVideoFrame(this._data)) {
      this._data.close();
    } else {
      this._data = null;
    }
    this._closed = true;
  }
  /**
   * Returns the number of bytes required to hold this video sample's pixel data.
   */
  allocationSize(options = {}) {
    validateVideoFrameCopyToOptions(options);
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    if ((options.format ?? this.format) == null) {
      throw new Error("Cannot get allocation size when format is null.");
    }
    if (isVideoFrame(this._data)) {
      return this._data.allocationSize(options);
    }
    const combinedLayout = ParseVideoFrameCopyToOptions(this, options);
    return combinedLayout.allocationSize;
  }
  /**
   * Copies this video sample's pixel data to an ArrayBuffer or ArrayBufferView.
   * @returns The byte layout of the planes of the copied data.
   */
  async copyTo(destination, options = {}) {
    if (!isAllowSharedBufferSource(destination)) {
      throw new TypeError("destination must be an ArrayBuffer or an ArrayBuffer view.");
    }
    validateVideoFrameCopyToOptions(options);
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    if ((options.format ?? this.format) == null) {
      throw new Error("Cannot copy video sample data when format is null.");
    }
    assert(this._data !== null);
    if (isVideoFrame(this._data)) {
      return this._data.copyTo(destination, options);
    }
    if (options.format && !["RGBA", "RGBX", "BGRA", "BGRX"].includes(this.format) && ["RGBA", "RGBX", "BGRA", "BGRX"].includes(options.format)) {
      if (this._data instanceof VideoSampleResource) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
          const rgbSample = __addDisposableResource(env_1, await this._data.toRgbSample({
            timestamp: this.timestamp,
            duration: this.duration,
            rotation: this.rotation,
            flip: this.flip
          }, options.colorSpace ?? "srgb"), false);
          if (!(rgbSample instanceof _VideoSample)) {
            throw new TypeError("toRgbSample() must return a VideoSample.");
          }
          if (!["RGBA", "RGBX", "BGRA", "BGRX"].includes(rgbSample.format)) {
            throw new Error(`Sample returned by toRgbSample was expected to have an RGB format, got '${rgbSample.format}' instead.`);
          }
          return await rgbSample.copyTo(destination, options);
        } catch (e_1) {
          env_1.error = e_1;
          env_1.hasError = true;
        } finally {
          __disposeResources(env_1);
        }
      } else {
        if (typeof VideoFrame === "undefined") {
          throw new Error("For this sample, converting from a non-RGB to an RGB format requires VideoFrame to be defined.");
        }
        const tempFrame = this.toVideoFrame();
        try {
          return await tempFrame.copyTo(destination, options);
        } finally {
          tempFrame.close();
        }
      }
    }
    const combinedLayout = ParseVideoFrameCopyToOptions(this, options);
    assert(this.format);
    const destBytes = toUint8Array(destination);
    if (destBytes.byteLength < combinedLayout.allocationSize) {
      throw new TypeError(`Destination buffer too small. Required: ${combinedLayout.allocationSize}, Available: ${destBytes.byteLength}`);
    }
    const planeConfigs = getPlaneConfigs(this.format);
    let dataPlanes;
    if (this._data instanceof VideoSampleResource) {
      let result = this._data.getDataPlanes();
      if (isThenable(result))
        result = await result;
      if (!Array.isArray(result) || result.some((x) => !(x.data instanceof Uint8Array) || !Number.isInteger(x.stride) || x.stride < 0)) {
        throw new TypeError('getDataPlanes() must return an array of objects with a Uint8Array "data" property and a non-negative integer "stride" property.');
      }
      dataPlanes = result;
    } else if (this._data instanceof Uint8Array) {
      assert(this._layout);
      assert(this._layout.length === planeConfigs.length);
      dataPlanes = this._layout.map((planeLayout, i) => {
        const height = Math.ceil((this.visibleRect.top + this.visibleRect.height) / planeConfigs[i].heightDivisor);
        return {
          data: this._data.subarray(planeLayout.offset, planeLayout.offset + planeLayout.stride * height),
          stride: planeLayout.stride
        };
      });
    } else {
      const canvas = this._data;
      const context = canvas.getContext("2d");
      assert(context);
      const imageData = context.getImageData(0, 0, this.codedWidth, this.codedHeight);
      dataPlanes = [{
        data: toUint8Array(imageData.data),
        stride: 4 * this.codedWidth
      }];
    }
    const planeLayouts = [];
    const numPlanes = planeConfigs.length;
    for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
      const computedLayout = combinedLayout.computedLayouts[planeIndex];
      const sourceStride = dataPlanes[planeIndex].stride;
      const sourceData = dataPlanes[planeIndex].data;
      let sourceOffset = computedLayout.sourceTop * sourceStride;
      sourceOffset += computedLayout.sourceLeftBytes;
      let destinationOffset = computedLayout.destinationOffset;
      const rowBytes = computedLayout.sourceWidthBytes;
      const layout = {
        offset: destinationOffset,
        stride: computedLayout.destinationStride
      };
      for (let row = 0; row < computedLayout.sourceHeight; row++) {
        if (sourceOffset + rowBytes > sourceData.byteLength) {
          throw new Error(`Source buffer OOB read.`);
        }
        if (destinationOffset + rowBytes > destBytes.byteLength) {
          throw new Error(`Destination buffer OOB write.`);
        }
        const srcSub = sourceData.subarray(sourceOffset, sourceOffset + rowBytes);
        destBytes.set(srcSub, destinationOffset);
        sourceOffset += sourceStride;
        destinationOffset += computedLayout.destinationStride;
      }
      planeLayouts.push(layout);
    }
    if (options.format !== void 0) {
      const needsRgbConversion = this.format.startsWith("RGB") !== options.format.startsWith("RGB");
      const needsAlphaConversion = this.format.includes("X") && options.format.includes("A");
      if (needsRgbConversion || needsAlphaConversion) {
        const computedLayout = combinedLayout.computedLayouts[0];
        for (let row = 0; row < computedLayout.sourceHeight; row++) {
          const rowStart = computedLayout.destinationOffset + row * computedLayout.destinationStride;
          const rowEnd = rowStart + computedLayout.sourceWidthBytes;
          for (let i = rowStart; i < rowEnd; i += 4) {
            if (needsRgbConversion) {
              const r = destBytes[i];
              const b = destBytes[i + 2];
              destBytes[i] = b;
              destBytes[i + 2] = r;
            }
            if (needsAlphaConversion) {
              destBytes[i + 3] = 255;
            }
          }
        }
      }
    }
    return planeLayouts;
  }
  /**
   * Converts this video sample to a VideoFrame for use with the WebCodecs API. The VideoFrame returned by this
   * method *must* be closed separately from this video sample.
   */
  toVideoFrame() {
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    assert(this._data !== null);
    if (this._data instanceof VideoSampleResource) {
      if (this.format === null) {
        throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if format is null.");
      }
      const planes = this._data.getDataPlanes();
      if (isThenable(planes)) {
        throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if getDataPlanes() returns a promise.");
      }
      const size = planes.reduce((a, b) => a + b.data.byteLength, 0);
      const buffer = new Uint8Array(size);
      let offset = 0;
      const offsets = [];
      for (const plane of planes) {
        buffer.set(plane.data, offset);
        offsets.push(offset);
        offset += plane.data.byteLength;
      }
      return new VideoFrame(buffer, {
        format: this.format,
        layout: planes.map((x, i) => ({
          offset: offsets[i],
          stride: x.stride
        })),
        codedWidth: this.codedWidth,
        codedHeight: this.codedHeight,
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration || void 0,
        // Drag 0 duration to undefined, glitches some codecs
        colorSpace: this.colorSpace,
        visibleRect: this.visibleRect,
        displayWidth: this.squarePixelWidth,
        // Not display* since we're not passing rotation
        displayHeight: this.squarePixelHeight
      });
    } else if (isVideoFrame(this._data)) {
      return new VideoFrame(this._data, {
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration || void 0
        // Drag 0 duration to undefined, glitches some codecs
      });
    } else if (this._data instanceof Uint8Array) {
      assert(this._layout);
      return new VideoFrame(this._data, {
        format: this.format,
        // The true coded size isn't known, but since we pass the layout (which contains the true strides), the
        // smallest size containing the visible rect is good enough
        codedWidth: this.visibleRect.left + this.visibleRect.width,
        codedHeight: this.visibleRect.top + this.visibleRect.height,
        layout: this._layout,
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration || void 0,
        colorSpace: this.colorSpace,
        visibleRect: {
          x: this.visibleRect.left,
          y: this.visibleRect.top,
          width: this.visibleRect.width,
          height: this.visibleRect.height
        },
        displayWidth: this.squarePixelWidth,
        // Not display* since we're not passing rotation
        displayHeight: this.squarePixelHeight
      });
    } else {
      return new VideoFrame(this._data, {
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration || void 0
      });
    }
  }
  draw(context, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    let sx = 0;
    let sy = 0;
    let sWidth = this.displayWidth;
    let sHeight = this.displayHeight;
    let dx = 0;
    let dy = 0;
    let dWidth = this.displayWidth;
    let dHeight = this.displayHeight;
    if (arg5 !== void 0) {
      sx = arg1;
      sy = arg2;
      sWidth = arg3;
      sHeight = arg4;
      dx = arg5;
      dy = arg6;
      if (arg7 !== void 0) {
        dWidth = arg7;
        dHeight = arg8;
      } else {
        dWidth = sWidth;
        dHeight = sHeight;
      }
    } else {
      dx = arg1;
      dy = arg2;
      if (arg3 !== void 0) {
        dWidth = arg3;
        dHeight = arg4;
      }
    }
    if (!(typeof CanvasRenderingContext2D !== "undefined" && context instanceof CanvasRenderingContext2D || typeof OffscreenCanvasRenderingContext2D !== "undefined" && context instanceof OffscreenCanvasRenderingContext2D)) {
      throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");
    }
    if (!Number.isFinite(sx)) {
      throw new TypeError("sx must be a number.");
    }
    if (!Number.isFinite(sy)) {
      throw new TypeError("sy must be a number.");
    }
    if (!Number.isFinite(sWidth) || sWidth < 0) {
      throw new TypeError("sWidth must be a non-negative number.");
    }
    if (!Number.isFinite(sHeight) || sHeight < 0) {
      throw new TypeError("sHeight must be a non-negative number.");
    }
    if (!Number.isFinite(dx)) {
      throw new TypeError("dx must be a number.");
    }
    if (!Number.isFinite(dy)) {
      throw new TypeError("dy must be a number.");
    }
    if (!Number.isFinite(dWidth) || dWidth < 0) {
      throw new TypeError("dWidth must be a non-negative number.");
    }
    if (!Number.isFinite(dHeight) || dHeight < 0) {
      throw new TypeError("dHeight must be a non-negative number.");
    }
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    ({ sx, sy, sWidth, sHeight } = this._unmapSourceRegion(sx, sy, sWidth, sHeight, this.rotation, this.flip));
    const source = this.toCanvasImageSource();
    context.save();
    const centerX = dx + dWidth / 2;
    const centerY = dy + dHeight / 2;
    context.translate(centerX, centerY);
    if (this.flip) {
      context.scale(-1, 1);
    }
    context.rotate(this.rotation * Math.PI / 180);
    const aspectRatioChange = this.rotation % 180 === 0 ? 1 : dWidth / dHeight;
    context.scale(1 / aspectRatioChange, aspectRatioChange);
    context.drawImage(source, sx, sy, sWidth, sHeight, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
    context.restore();
  }
  /**
   * Draws the sample in the middle of the canvas corresponding to the context with the specified fit behavior.
   */
  drawWithFit(context, options) {
    if (!(typeof CanvasRenderingContext2D !== "undefined" && context instanceof CanvasRenderingContext2D || typeof OffscreenCanvasRenderingContext2D !== "undefined" && context instanceof OffscreenCanvasRenderingContext2D)) {
      throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");
    }
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (!["fill", "contain", "cover"].includes(options.fit)) {
      throw new TypeError("options.fit must be 'fill', 'contain', or 'cover'.");
    }
    if (options.rotation !== void 0 && ![0, 90, 180, 270].includes(options.rotation)) {
      throw new TypeError("options.rotation, when provided, must be 0, 90, 180, or 270.");
    }
    if (options.flip !== void 0 && typeof options.flip !== "boolean") {
      throw new TypeError("options.flip, when provided, must be a boolean.");
    }
    if (options.crop !== void 0) {
      validateCropRectangle(options.crop, "options.");
    }
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;
    const rotation = options.rotation ?? this.rotation;
    const flip = options.flip ?? this.flip;
    const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
    let finalCrop = options.crop;
    if (finalCrop) {
      finalCrop = clampCropRectangle(finalCrop, rotatedWidth, rotatedHeight);
    }
    let dx;
    let dy;
    let newWidth;
    let newHeight;
    const { sx, sy, sWidth, sHeight } = this._unmapSourceRegion(finalCrop?.left ?? 0, finalCrop?.top ?? 0, finalCrop?.width ?? rotatedWidth, finalCrop?.height ?? rotatedHeight, rotation, flip);
    if (options.fit === "fill") {
      dx = 0;
      dy = 0;
      newWidth = canvasWidth;
      newHeight = canvasHeight;
    } else {
      const [sampleWidth, sampleHeight] = finalCrop ? [finalCrop.width, finalCrop.height] : [rotatedWidth, rotatedHeight];
      const scale = options.fit === "contain" ? Math.min(canvasWidth / sampleWidth, canvasHeight / sampleHeight) : Math.max(canvasWidth / sampleWidth, canvasHeight / sampleHeight);
      newWidth = sampleWidth * scale;
      newHeight = sampleHeight * scale;
      dx = (canvasWidth - newWidth) / 2;
      dy = (canvasHeight - newHeight) / 2;
    }
    const source = this.toCanvasImageSource();
    context.save();
    const aspectRatioChange = rotation % 180 === 0 ? 1 : newWidth / newHeight;
    context.translate(canvasWidth / 2, canvasHeight / 2);
    if (flip) {
      context.scale(-1, 1);
    }
    context.rotate(rotation * Math.PI / 180);
    context.scale(1 / aspectRatioChange, aspectRatioChange);
    context.translate(-canvasWidth / 2, -canvasHeight / 2);
    context.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, newWidth, newHeight);
    context.restore();
  }
  /** @internal */
  _unmapSourceRegion(sx, sy, sWidth, sHeight, rotation, flip) {
    if (flip) {
      const rotatedWidth = rotation % 180 === 0 ? this.squarePixelWidth : this.squarePixelHeight;
      sx = rotatedWidth - sx - sWidth;
    }
    if (rotation === 90) {
      [sx, sy, sWidth, sHeight] = [
        sy,
        this.squarePixelHeight - sx - sWidth,
        sHeight,
        sWidth
      ];
    } else if (rotation === 180) {
      [sx, sy] = [
        this.squarePixelWidth - sx - sWidth,
        this.squarePixelHeight - sy - sHeight
      ];
    } else if (rotation === 270) {
      [sx, sy, sWidth, sHeight] = [
        this.squarePixelWidth - sy - sHeight,
        sx,
        sHeight,
        sWidth
      ];
    }
    return { sx, sy, sWidth, sHeight };
  }
  /**
   * Draws the sample onto the target canvas with fit behavior, manually mipmapping on strong downscales for quality.
   * @internal
   */
  _drawWithFitAndMipmapping(targetCanvas, targetContext, options) {
    const targetWidth = targetCanvas.width;
    const targetHeight = targetCanvas.height;
    const [rotatedWidth, rotatedHeight] = options.rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
    const sourceWidth = options.crop ? options.crop.width : rotatedWidth;
    const sourceHeight = options.crop ? options.crop.height : rotatedHeight;
    let mipLevels = 0;
    if (2 * targetWidth < sourceWidth && 2 * targetHeight < sourceHeight) {
      mipLevels = Math.floor(Math.log2(Math.min(sourceWidth / targetWidth, sourceHeight / targetHeight)));
    }
    const drawWidth = targetWidth * 2 ** mipLevels;
    const drawHeight = targetHeight * 2 ** mipLevels;
    const { canvas, context, isNew } = mipLevels > 0 ? getTransformationCanvas(drawWidth, drawHeight) : { canvas: targetCanvas, context: targetContext, isNew: options.targetIsFresh };
    context.imageSmoothingQuality = "high";
    if (options.fillBlack) {
      context.fillStyle = "black";
      context.fillRect(0, 0, drawWidth, drawHeight);
    } else if (!isNew) {
      context.clearRect(0, 0, drawWidth, drawHeight);
    }
    this.drawWithFit(context, {
      fit: options.fit,
      rotation: options.rotation,
      flip: options.flip,
      crop: options.crop
    });
    context.globalCompositeOperation = "copy";
    for (let i = mipLevels; i > 1; i--) {
      const levelWidth = targetWidth * 2 ** i;
      const levelHeight = targetHeight * 2 ** i;
      context.drawImage(canvas, 0, 0, levelWidth, levelHeight, 0, 0, levelWidth / 2, levelHeight / 2);
    }
    context.globalCompositeOperation = "source-over";
    if (mipLevels > 0) {
      targetContext.imageSmoothingQuality = "high";
      targetContext.globalCompositeOperation = "copy";
      targetContext.drawImage(canvas, 0, 0, 2 * targetWidth, 2 * targetHeight, 0, 0, targetWidth, targetHeight);
      targetContext.globalCompositeOperation = "source-over";
    }
  }
  /**
   * Converts this video sample to a
   * [`CanvasImageSource`](https://udn.realityripple.com/docs/Web/API/CanvasImageSource) for drawing to a canvas.
   *
   * You must use the value returned by this method immediately, as any VideoFrame created internally may
   * automatically be closed in the next microtask.
   */
  toCanvasImageSource() {
    if (this._closed) {
      throw new Error("VideoSample is closed.");
    }
    assert(this._data !== null);
    if (this._data instanceof VideoSampleResource || this._data instanceof Uint8Array) {
      const videoFrame = this.toVideoFrame();
      queueMicrotask(() => videoFrame.close());
      return videoFrame;
    } else {
      return this._data;
    }
  }
  /**
   * Transform this video sample to a new video sample given the options. Can be used to resize, rotate, flip, and
   * crop the sample.
   *
   * In non-browser environments, this method will not work by default. To make it work, register a custom
   * transformer function via {@link registerVideoSampleTransformer}.
   */
  async transform(options) {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.width !== void 0 && (!Number.isInteger(options.width) || options.width <= 0)) {
      throw new TypeError("options.width, when provided, must be a positive integer.");
    }
    if (options.height !== void 0 && (!Number.isInteger(options.height) || options.height <= 0)) {
      throw new TypeError("options.height, when provided, must be a positive integer.");
    }
    if (options.roundDimensionsTo !== void 0 && (!Number.isInteger(options.roundDimensionsTo) || options.roundDimensionsTo <= 0)) {
      throw new TypeError("options.roundDimensionsTo, when provided, must be a positive integer.");
    }
    if (options.fit !== void 0 && !["fill", "contain", "cover"].includes(options.fit)) {
      throw new TypeError('options.fit, when provided, must be one of "fill", "contain", or "cover".');
    }
    if (options.width !== void 0 && options.height !== void 0 && options.fit === void 0) {
      throw new TypeError("When both options.width and options.height are provided, options.fit must also be provided.");
    }
    if (options.rotate !== void 0 && ![0, 90, 180, 270].includes(options.rotate)) {
      throw new TypeError("options.rotate, when provided, must be 0, 90, 180 or 270.");
    }
    if (options.flip !== void 0 && typeof options.flip !== "boolean") {
      throw new TypeError("options.flip, when provided, must be a boolean.");
    }
    if (options.crop !== void 0) {
      validateCropRectangle(options.crop, "options.");
    }
    if (options.alpha !== void 0 && !["keep", "discard"].includes(options.alpha)) {
      throw new TypeError("options.alpha, when provided, must be 'keep' or 'discard'.");
    }
    const { rotation, flip } = composeRotationAndFlip(this.rotation, this.flip, options.rotate ?? 0, options.flip ?? false);
    const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
    let finalCrop = options.crop;
    if (finalCrop) {
      finalCrop = clampCropRectangle(finalCrop, rotatedWidth, rotatedHeight);
    }
    const cropWidth = finalCrop ? finalCrop.width : rotatedWidth;
    const cropHeight = finalCrop ? finalCrop.height : rotatedHeight;
    const originalAspectRatio = cropWidth / cropHeight;
    let targetWidth;
    let targetHeight;
    if (options.width !== void 0 && options.height === void 0) {
      targetWidth = options.width;
      targetHeight = targetWidth / originalAspectRatio;
    } else if (options.width === void 0 && options.height !== void 0) {
      targetHeight = options.height;
      targetWidth = targetHeight * originalAspectRatio;
    } else if (options.width !== void 0 && options.height !== void 0) {
      targetWidth = options.width;
      targetHeight = options.height;
    } else {
      targetWidth = cropWidth;
      targetHeight = cropHeight;
    }
    targetWidth = roundToMultiple(targetWidth, options.roundDimensionsTo ?? 1);
    targetHeight = roundToMultiple(targetHeight, options.roundDimensionsTo ?? 1);
    const description = {
      width: targetWidth,
      height: targetHeight,
      fit: options.fit ?? "fill",
      rotation,
      flip,
      crop: finalCrop ?? {
        left: 0,
        top: 0,
        width: rotatedWidth,
        height: rotatedHeight
      },
      alpha: options.alpha ?? "keep"
    };
    for (const transformer of registeredVideoSampleTransformers) {
      let result = transformer(this, description);
      if (isThenable(result))
        result = await result;
      if (result !== null) {
        return result;
      }
    }
    const { canvas, context, isNew } = getTransformationCanvas(description.width, description.height);
    this._drawWithFitAndMipmapping(canvas, context, {
      fit: description.fit,
      rotation: description.rotation,
      flip: description.flip,
      crop: description.crop,
      targetIsFresh: isNew,
      fillBlack: description.alpha === "discard"
    });
    return new _VideoSample(canvas, {
      timestamp: this.timestamp,
      duration: this.duration,
      // Any previous rotation and flip are now baked in
      rotation: 0,
      flip: false,
      encodeOptions: this.encodeOptions
    });
  }
  /** Sets the rotation metadata of this video sample. */
  setRotation(newRotation) {
    if (![0, 90, 180, 270].includes(newRotation)) {
      throw new TypeError("newRotation must be 0, 90, 180, or 270.");
    }
    this.rotation = newRotation;
  }
  /** Sets the flip metadata of this video sample. */
  setFlip(newFlip) {
    if (typeof newFlip !== "boolean") {
      throw new TypeError("newFlip must be a boolean.");
    }
    this.flip = newFlip;
  }
  /** Sets the presentation timestamp of this video sample, in seconds. */
  setTimestamp(newTimestamp) {
    if (!Number.isFinite(newTimestamp)) {
      throw new TypeError("newTimestamp must be a number.");
    }
    this.timestamp = newTimestamp;
  }
  /** Sets the duration of this video sample, in seconds. */
  setDuration(newDuration) {
    if (!Number.isFinite(newDuration) || newDuration < 0) {
      throw new TypeError("newDuration must be a non-negative number.");
    }
    this.duration = newDuration;
  }
  /** Sets the encode options used when this sample is passed to an encoder. */
  setEncodeOptions(newEncodeOptions) {
    if (!newEncodeOptions || typeof newEncodeOptions !== "object") {
      throw new TypeError("newEncodeOptions must be an object.");
    }
    this.encodeOptions = newEncodeOptions;
  }
  /** Calls `.close()`. */
  [Symbol.dispose]() {
    this.close();
  }
};
var registeredVideoSampleTransformers = [];
var TRANSFORMATION_CANVAS_CACHE_MAX_SIZE = 3;
var transformationCanvasCache = [];
var transformationCanvasCacheNextAge = 0;
var getTransformationCanvas = (width, height) => {
  for (const entry of transformationCanvasCache) {
    if (entry.canvas.width === width && entry.canvas.height === height) {
      entry.age = transformationCanvasCacheNextAge++;
      return { canvas: entry.canvas, context: entry.context, isNew: false };
    }
  }
  let canvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
  } else {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("Cannot transform VideoSamples in this environment. Either run in an environment with OffscreenCanvas or HTMLCanvasElement, or supply a custom VideoSample transformer using registerVideoSampleTransformer().");
    }
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: false
  });
  if (!context) {
    throw new Error("The '2d' canvas context is required to transform VideoSamples. Register a custom transformer using registerVideoSampleTransformer to work around this limitation.");
  }
  if (transformationCanvasCache.length >= TRANSFORMATION_CANVAS_CACHE_MAX_SIZE) {
    transformationCanvasCache.splice(arrayArgmin(transformationCanvasCache, (x) => x.age), 1);
  }
  transformationCanvasCache.push({
    canvas,
    context,
    age: transformationCanvasCacheNextAge++
  });
  return { canvas, context, isNew: true };
};
var VideoSampleColorSpace = class {
  /** Creates a new VideoSampleColorSpace. */
  constructor(init) {
    if (init !== void 0) {
      if (!init || typeof init !== "object") {
        throw new TypeError("init.colorSpace, when provided, must be an object.");
      }
      const primariesValues = Object.keys(COLOR_PRIMARIES_MAP);
      if (init.primaries != null && !primariesValues.includes(init.primaries)) {
        throw new TypeError(`init.colorSpace.primaries, when provided, must be one of ${primariesValues.join(", ")}.`);
      }
      const transferValues = Object.keys(TRANSFER_CHARACTERISTICS_MAP);
      if (init.transfer != null && !transferValues.includes(init.transfer)) {
        throw new TypeError(`init.colorSpace.transfer, when provided, must be one of ${transferValues.join(", ")}.`);
      }
      const matrixValues = Object.keys(MATRIX_COEFFICIENTS_MAP);
      if (init.matrix != null && !matrixValues.includes(init.matrix)) {
        throw new TypeError(`init.colorSpace.matrix, when provided, must be one of ${matrixValues.join(", ")}.`);
      }
      if (init.fullRange != null && typeof init.fullRange !== "boolean") {
        throw new TypeError("init.colorSpace.fullRange, when provided, must be a boolean.");
      }
    }
    this.primaries = init?.primaries ?? null;
    this.transfer = init?.transfer ?? null;
    this.matrix = init?.matrix ?? null;
    this.fullRange = init?.fullRange ?? null;
  }
  /** Serializes the color space to a JSON object. */
  toJSON() {
    return {
      primaries: this.primaries,
      transfer: this.transfer,
      matrix: this.matrix,
      fullRange: this.fullRange
    };
  }
};
var isVideoFrame = (x) => {
  return typeof VideoFrame !== "undefined" && x instanceof VideoFrame;
};
var clampCropRectangle = (crop, outerWidth, outerHeight) => {
  const left = Math.min(crop.left, outerWidth);
  const top = Math.min(crop.top, outerHeight);
  const width = Math.min(crop.width, outerWidth - left);
  const height = Math.min(crop.height, outerHeight - top);
  assert(width >= 0);
  assert(height >= 0);
  return { left, top, width, height };
};
var validateCropRectangle = (crop, prefix) => {
  if (!crop || typeof crop !== "object") {
    throw new TypeError(prefix + "crop, when provided, must be an object.");
  }
  if (!Number.isInteger(crop.left) || crop.left < 0) {
    throw new TypeError(prefix + "crop.left must be a non-negative integer.");
  }
  if (!Number.isInteger(crop.top) || crop.top < 0) {
    throw new TypeError(prefix + "crop.top must be a non-negative integer.");
  }
  if (!Number.isInteger(crop.width) || crop.width < 0) {
    throw new TypeError(prefix + "crop.width must be a non-negative integer.");
  }
  if (!Number.isInteger(crop.height) || crop.height < 0) {
    throw new TypeError(prefix + "crop.height must be a non-negative integer.");
  }
};
var validateVisibleRect = (visibleRect) => {
  validateRectangle(visibleRect, "init.visibleRect");
  if (visibleRect.width === 0 || visibleRect.height === 0) {
    throw new TypeError("init.visibleRect must not be empty.");
  }
};
var validateVideoFrameCopyToOptions = (options) => {
  if (!options || typeof options !== "object") {
    throw new TypeError("options must be an object.");
  }
  if (options.colorSpace !== void 0 && !["display-p3", "srgb"].includes(options.colorSpace)) {
    throw new TypeError("options.colorSpace, when provided, must be 'display-p3' or 'srgb'.");
  }
  if (options.format !== void 0 && typeof options.format !== "string") {
    throw new TypeError("options.format, when provided, must be a string.");
  }
  if (options.layout !== void 0) {
    if (!Array.isArray(options.layout)) {
      throw new TypeError("options.layout, when provided, must be an array.");
    }
    for (const plane of options.layout) {
      if (!plane || typeof plane !== "object") {
        throw new TypeError("Each entry in options.layout must be an object.");
      }
      if (!Number.isInteger(plane.offset) || plane.offset < 0) {
        throw new TypeError("plane.offset must be a non-negative integer.");
      }
      if (!Number.isInteger(plane.stride) || plane.stride < 0) {
        throw new TypeError("plane.stride must be a non-negative integer.");
      }
    }
  }
  if (options.rect !== void 0) {
    if (!options.rect || typeof options.rect !== "object") {
      throw new TypeError("options.rect, when provided, must be an object.");
    }
    if (options.rect.x !== void 0 && (!Number.isInteger(options.rect.x) || options.rect.x < 0)) {
      throw new TypeError("options.rect.x, when provided, must be a non-negative integer.");
    }
    if (options.rect.y !== void 0 && (!Number.isInteger(options.rect.y) || options.rect.y < 0)) {
      throw new TypeError("options.rect.y, when provided, must be a non-negative integer.");
    }
    if (options.rect.width !== void 0 && (!Number.isInteger(options.rect.width) || options.rect.width < 0)) {
      throw new TypeError("options.rect.width, when provided, must be a non-negative integer.");
    }
    if (options.rect.height !== void 0 && (!Number.isInteger(options.rect.height) || options.rect.height < 0)) {
      throw new TypeError("options.rect.height, when provided, must be a non-negative integer.");
    }
  }
};
var createDefaultPlaneLayout = (format, codedWidth, codedHeight) => {
  const planes = getPlaneConfigs(format);
  const layouts = [];
  let currentOffset = 0;
  for (const plane of planes) {
    const planeWidth = Math.ceil(codedWidth / plane.widthDivisor);
    const planeHeight = Math.ceil(codedHeight / plane.heightDivisor);
    const stride = planeWidth * plane.sampleBytes;
    const planeSize = stride * planeHeight;
    layouts.push({
      offset: currentOffset,
      stride
    });
    currentOffset += planeSize;
  }
  return layouts;
};
var getPlaneConfigs = (format) => {
  const yuv = (yBytes, uvBytes, subX, subY, hasAlpha) => {
    const configs = [
      { sampleBytes: yBytes, widthDivisor: 1, heightDivisor: 1 },
      { sampleBytes: uvBytes, widthDivisor: subX, heightDivisor: subY },
      { sampleBytes: uvBytes, widthDivisor: subX, heightDivisor: subY }
    ];
    if (hasAlpha) {
      configs.push({ sampleBytes: yBytes, widthDivisor: 1, heightDivisor: 1 });
    }
    return configs;
  };
  switch (format) {
    case "I420":
      return yuv(1, 1, 2, 2, false);
    case "I420P10":
    case "I420P12":
      return yuv(2, 2, 2, 2, false);
    case "I420A":
      return yuv(1, 1, 2, 2, true);
    case "I420AP10":
    case "I420AP12":
      return yuv(2, 2, 2, 2, true);
    case "I422":
      return yuv(1, 1, 2, 1, false);
    case "I422P10":
    case "I422P12":
      return yuv(2, 2, 2, 1, false);
    case "I422A":
      return yuv(1, 1, 2, 1, true);
    case "I422AP10":
    case "I422AP12":
      return yuv(2, 2, 2, 1, true);
    case "I444":
      return yuv(1, 1, 1, 1, false);
    case "I444P10":
    case "I444P12":
      return yuv(2, 2, 1, 1, false);
    case "I444A":
      return yuv(1, 1, 1, 1, true);
    case "I444AP10":
    case "I444AP12":
      return yuv(2, 2, 1, 1, true);
    case "NV12":
      return [
        { sampleBytes: 1, widthDivisor: 1, heightDivisor: 1 },
        { sampleBytes: 2, widthDivisor: 2, heightDivisor: 2 }
        // Interleaved U and V
      ];
    case "RGBA":
    case "RGBX":
    case "BGRA":
    case "BGRX":
      return [
        { sampleBytes: 4, widthDivisor: 1, heightDivisor: 1 }
      ];
    default:
      assertNever(format);
      assert(false);
  }
};
var ParseVideoFrameCopyToOptions = (sample, options) => {
  const defaultRect = {
    x: sample.visibleRect.left,
    y: sample.visibleRect.top,
    width: sample.visibleRect.width,
    height: sample.visibleRect.height
  };
  const overrideRect = options.rect;
  const parsedRect = ParseVisibleRect(
    defaultRect,
    overrideRect,
    // The true coded size isn't known, but it's at least large enough to contain the visible rect
    sample.visibleRect.left + sample.visibleRect.width,
    sample.visibleRect.top + sample.visibleRect.height,
    sample.format
  );
  const optLayout = options.layout;
  let format;
  if (!options.format || options.format === sample.format) {
    format = sample.format;
  } else if (["RGBA", "RGBX", "BGRA", "BGRX"].includes(options.format)) {
    format = options.format;
  } else {
    throw new Error("NotSupportedError: Invalid destination format.");
  }
  return ComputeLayoutAndAllocationSize(parsedRect, format, optLayout);
};
var ParseVisibleRect = (defaultRect, overrideRect, codedWidth, codedHeight, format) => {
  const sourceRect = { ...defaultRect };
  if (overrideRect !== void 0) {
    if (!overrideRect.width || !overrideRect.height) {
      throw new TypeError("visibleRect dimensions cannot be zero.");
    }
    if ((overrideRect.x || 0) + (overrideRect.width || 0) > codedWidth) {
      throw new TypeError("visibleRect exceeds codedWidth.");
    }
    if ((overrideRect.y || 0) + (overrideRect.height || 0) > codedHeight) {
      throw new TypeError("visibleRect exceeds codedHeight.");
    }
    sourceRect.x = overrideRect.x || 0;
    sourceRect.y = overrideRect.y || 0;
    sourceRect.width = overrideRect.width || 0;
    sourceRect.height = overrideRect.height || 0;
  }
  const validAlignment = VerifyRectOffsetAlignment(format, sourceRect);
  if (!validAlignment) {
    throw new TypeError("visibleRect alignment is invalid for the format.");
  }
  return sourceRect;
};
var VerifyRectOffsetAlignment = (format, rect) => {
  if (format === null)
    return true;
  const planes = getPlaneConfigs(format);
  for (let planeIndex = 0; planeIndex < planes.length; planeIndex++) {
    const plane = planes[planeIndex];
    const sampleWidth = plane.widthDivisor;
    const sampleHeight = plane.heightDivisor;
    if ((rect.x || 0) % sampleWidth !== 0)
      return false;
    if ((rect.y || 0) % sampleHeight !== 0)
      return false;
  }
  return true;
};
var ComputeLayoutAndAllocationSize = (parsedRect, format, layout) => {
  const planes = getPlaneConfigs(format);
  const numPlanes = planes.length;
  if (layout !== void 0 && layout.length !== numPlanes) {
    throw new TypeError(`Layout must have ${numPlanes} planes.`);
  }
  let minAllocationSize = 0;
  const computedLayouts = [];
  const endOffsets = [];
  for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
    const plane = planes[planeIndex];
    const sampleBytes = plane.sampleBytes;
    const sampleWidth = plane.widthDivisor;
    const sampleHeight = plane.heightDivisor;
    const computedLayout = {
      destinationOffset: 0,
      destinationStride: 0,
      sourceTop: 0,
      sourceHeight: 0,
      sourceLeftBytes: 0,
      sourceWidthBytes: 0
    };
    computedLayout.sourceTop = Math.ceil(Math.trunc(parsedRect.y || 0) / sampleHeight);
    computedLayout.sourceHeight = Math.ceil(Math.trunc(parsedRect.height || 0) / sampleHeight);
    computedLayout.sourceLeftBytes = Math.floor(Math.trunc(parsedRect.x || 0) / sampleWidth) * sampleBytes;
    computedLayout.sourceWidthBytes = Math.ceil(Math.trunc(parsedRect.width || 0) / sampleWidth) * sampleBytes;
    if (layout !== void 0) {
      const planeLayout = layout[planeIndex];
      if (planeLayout.stride < computedLayout.sourceWidthBytes) {
        throw new TypeError(`Stride for plane ${planeIndex} is too small.`);
      }
      computedLayout.destinationOffset = planeLayout.offset;
      computedLayout.destinationStride = planeLayout.stride;
    } else {
      computedLayout.destinationOffset = minAllocationSize;
      computedLayout.destinationStride = computedLayout.sourceWidthBytes;
    }
    const planeSize = computedLayout.destinationStride * computedLayout.sourceHeight;
    const planeEnd = planeSize + computedLayout.destinationOffset;
    if (planeEnd > 4294967295) {
      throw new TypeError("Allocation size exceeds limit.");
    }
    endOffsets.push(planeEnd);
    minAllocationSize = Math.max(minAllocationSize, planeEnd);
    for (let earlierPlaneIndex = 0; earlierPlaneIndex < planeIndex; earlierPlaneIndex++) {
      const earlierLayout = computedLayouts[earlierPlaneIndex];
      if (endOffsets[planeIndex] <= earlierLayout.destinationOffset || endOffsets[earlierPlaneIndex] <= computedLayout.destinationOffset) {
        continue;
      }
      throw new TypeError("Planes overlap.");
    }
    computedLayouts.push(computedLayout);
  }
  return {
    allocationSize: minAllocationSize,
    computedLayouts
  };
};

// node_modules/mediabunny/dist/modules/src/custom-coder.js
var customVideoDecoders = [];
var customAudioDecoders = [];

// node_modules/mediabunny/dist/modules/src/packet.js
var PLACEHOLDER_DATA = /* @__PURE__ */ new Uint8Array(0);
var EncodedPacket = class _EncodedPacket {
  /** Creates a new {@link EncodedPacket} from raw bytes and timing information. */
  constructor(data, type, timestamp, duration, sequenceNumber = -1, byteLength, sideData) {
    this.data = data;
    this.type = type;
    this.timestamp = timestamp;
    this.duration = duration;
    this.sequenceNumber = sequenceNumber;
    if (data === PLACEHOLDER_DATA && byteLength === void 0) {
      throw new Error("Internal error: byteLength must be explicitly provided when constructing metadata-only packets.");
    }
    if (byteLength === void 0) {
      byteLength = data.byteLength;
    }
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("data must be a Uint8Array.");
    }
    if (type !== "key" && type !== "delta") {
      throw new TypeError('type must be either "key" or "delta".');
    }
    if (!Number.isFinite(timestamp)) {
      throw new TypeError("timestamp must be a number.");
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError("duration must be a non-negative number.");
    }
    if (!Number.isFinite(sequenceNumber)) {
      throw new TypeError("sequenceNumber must be a number.");
    }
    if (!Number.isInteger(byteLength) || byteLength < 0) {
      throw new TypeError("byteLength must be a non-negative integer.");
    }
    if (sideData !== void 0 && (typeof sideData !== "object" || !sideData)) {
      throw new TypeError("sideData, when provided, must be an object.");
    }
    if (sideData?.alpha !== void 0 && !(sideData.alpha instanceof Uint8Array)) {
      throw new TypeError("sideData.alpha, when provided, must be a Uint8Array.");
    }
    if (sideData?.alphaByteLength !== void 0 && (!Number.isInteger(sideData.alphaByteLength) || sideData.alphaByteLength < 0)) {
      throw new TypeError("sideData.alphaByteLength, when provided, must be a non-negative integer.");
    }
    this.byteLength = byteLength;
    this.sideData = sideData ?? {};
    if (this.sideData.alpha && this.sideData.alphaByteLength === void 0) {
      this.sideData.alphaByteLength = this.sideData.alpha.byteLength;
    }
  }
  /**
   * If this packet is a metadata-only packet. Metadata-only packets don't contain their packet data. They are the
   * result of retrieving packets with {@link PacketRetrievalOptions.metadataOnly} set to `true`.
   */
  get isMetadataOnly() {
    return this.data === PLACEHOLDER_DATA;
  }
  /** The timestamp of this packet in microseconds. */
  get microsecondTimestamp() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.timestamp);
  }
  /** The duration of this packet in microseconds. */
  get microsecondDuration() {
    return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.duration);
  }
  /** Converts this packet to an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
   * WebCodecs API. */
  toEncodedVideoChunk() {
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
    }
    if (typeof EncodedVideoChunk === "undefined") {
      throw new Error("EncodedVideoChunk is not available in this environment.");
    }
    return new EncodedVideoChunk({
      data: this.data,
      type: this.type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /**
   * Converts this packet to an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
   * WebCodecs API, using the alpha side data instead of the color data. Throws if no alpha side data is defined.
   */
  alphaToEncodedVideoChunk(type = this.type) {
    if (!this.sideData.alpha) {
      throw new TypeError("This packet does not contain alpha side data.");
    }
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
    }
    if (typeof EncodedVideoChunk === "undefined") {
      throw new Error("EncodedVideoChunk is not available in this environment.");
    }
    return new EncodedVideoChunk({
      data: this.sideData.alpha,
      type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /** Converts this packet to an
   * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk) for use with the
   * WebCodecs API. */
  toEncodedAudioChunk() {
    if (this.isMetadataOnly) {
      throw new TypeError("Metadata-only packets cannot be converted to an audio chunk.");
    }
    if (typeof EncodedAudioChunk === "undefined") {
      throw new Error("EncodedAudioChunk is not available in this environment.");
    }
    return new EncodedAudioChunk({
      data: this.data,
      type: this.type,
      timestamp: this.microsecondTimestamp,
      duration: this.microsecondDuration
    });
  }
  /**
   * Creates an {@link EncodedPacket} from an
   * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) or
   * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk). This method is useful
   * for converting chunks from the WebCodecs API to `EncodedPacket` instances.
   */
  static fromEncodedChunk(chunk, sideData) {
    if (!(chunk instanceof EncodedVideoChunk || chunk instanceof EncodedAudioChunk)) {
      throw new TypeError("chunk must be an EncodedVideoChunk or EncodedAudioChunk.");
    }
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    return new _EncodedPacket(data, chunk.type, chunk.timestamp / 1e6, (chunk.duration ?? 0) / 1e6, void 0, void 0, sideData);
  }
  /** Clones this packet while optionally modifying the new packet's data. */
  clone(options) {
    if (options !== void 0 && (typeof options !== "object" || options === null)) {
      throw new TypeError("options, when provided, must be an object.");
    }
    if (options?.data !== void 0 && !(options.data instanceof Uint8Array)) {
      throw new TypeError("options.data, when provided, must be a Uint8Array.");
    }
    if (options?.type !== void 0 && options.type !== "key" && options.type !== "delta") {
      throw new TypeError('options.type, when provided, must be either "key" or "delta".');
    }
    if (options?.timestamp !== void 0 && !Number.isFinite(options.timestamp)) {
      throw new TypeError("options.timestamp, when provided, must be a number.");
    }
    if (options?.duration !== void 0 && !Number.isFinite(options.duration)) {
      throw new TypeError("options.duration, when provided, must be a number.");
    }
    if (options?.sequenceNumber !== void 0 && !Number.isFinite(options.sequenceNumber)) {
      throw new TypeError("options.sequenceNumber, when provided, must be a number.");
    }
    if (options?.sideData !== void 0 && (typeof options.sideData !== "object" || options.sideData === null)) {
      throw new TypeError("options.sideData, when provided, must be an object.");
    }
    return new _EncodedPacket(options?.data ?? this.data, options?.type ?? this.type, options?.timestamp ?? this.timestamp, options?.duration ?? this.duration, options?.sequenceNumber ?? this.sequenceNumber, options?.data?.byteLength ?? this.byteLength, options?.sideData ?? this.sideData);
  }
};

// node_modules/mediabunny/dist/modules/src/demuxer.js
var Demuxer = class {
  constructor(input2) {
    this.input = input2;
  }
  dispose() {
  }
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-misc.js
var TIMESTAMP_OFFSET = 2082844800;
var buildIsobmffMimeType = (info) => {
  const base = info.hasVideo ? "video/" : info.hasAudio ? "audio/" : "application/";
  let string = base + (info.isQuickTime ? "quicktime" : "mp4");
  if (info.codecStrings.length > 0) {
    const uniqueCodecMimeTypes = [...new Set(info.codecStrings)];
    string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
  }
  return string;
};
var parsePsshBoxContents = (contents) => {
  if (contents.length < 24) {
    throw new Error("Invalid pssh box: too small.");
  }
  const view = toDataView(contents);
  let pos = 0;
  const version = view.getUint8(pos);
  pos += 1;
  pos += 3;
  const systemId = bytesToHexString(contents.subarray(pos, pos + 16));
  pos += 16;
  let keyIds = null;
  if (version > 0) {
    const kidCount = view.getUint32(pos);
    pos += 4;
    if (pos + 16 * kidCount + 4 > contents.length) {
      throw new Error("Invalid pssh box: key ID count exceeds box size.");
    }
    if (kidCount > 0) {
      keyIds = [];
      for (let i = 0; i < kidCount; i++) {
        keyIds.push(bytesToHexString(contents.subarray(pos, pos + 16)));
        pos += 16;
      }
    }
  }
  const dataSize = view.getUint32(pos);
  pos += 4;
  return {
    systemId,
    keyIds,
    data: contents.slice(pos, pos + dataSize)
  };
};
var psshBoxesAreEqual = (a, b) => {
  if (a.systemId !== b.systemId || !uint8ArraysAreEqual(a.data, b.data)) {
    return false;
  }
  const aKeyIds = a.keyIds;
  const bKeyIds = b.keyIds;
  if (!aKeyIds || !bKeyIds) {
    return aKeyIds === bKeyIds;
  }
  return aKeyIds.length === bKeyIds.length && aKeyIds.every((keyId, i) => keyId === bKeyIds[i]);
};

// node_modules/mediabunny/dist/modules/src/aes.js
var AES_128_BLOCK_SIZE = 16;
var Te4 = new Uint32Array(256);
var Td0 = new Uint32Array(256);
var Td1 = new Uint32Array(256);
var Td2 = new Uint32Array(256);
var Td3 = new Uint32Array(256);
var Td4 = new Uint32Array(256);
var rcon = new Uint32Array(10);
var tablesGenerated = false;
var generateAesTables = () => {
  const sbox = new Uint8Array(256);
  const log = new Uint8Array(256);
  const pow = new Uint8Array(256);
  for (let i = 0, p = 1; i < 256; i++) {
    pow[i] = p;
    log[p] = i;
    p = p ^ p << 1 ^ (p & 128 ? 283 : 0);
  }
  const mul = (a, b) => a && b ? pow[(log[a] + log[b]) % 255] : 0;
  sbox[0] = 99;
  for (let i = 1; i < 256; i++) {
    const x = pow[255 - log[i]];
    let s = x ^ x << 1 ^ x << 2 ^ x << 3 ^ x << 4;
    s = s >>> 8 ^ s & 255 ^ 99;
    sbox[i] = s;
  }
  for (let i = 0; i < 256; i++) {
    const s = sbox[i];
    const is = sbox.indexOf(i);
    Te4[i] = s << 24 | s << 16 | s << 8 | s;
    Td4[i] = is << 24 | is << 16 | is << 8 | is;
    const b0 = mul(is, 14);
    const b1 = mul(is, 9);
    const b2 = mul(is, 13);
    const b3 = mul(is, 11);
    const w = b0 << 24 | b1 << 16 | b2 << 8 | b3;
    Td0[i] = w;
    Td1[i] = w >>> 8 | w << 24;
    Td2[i] = w >>> 16 | w << 16;
    Td3[i] = w >>> 24 | w << 8;
  }
  let r = 1;
  for (let i = 0; i < 10; i++) {
    rcon[i] = r << 24;
    r = r << 1 ^ (r & 128 ? 283 : 0);
  }
  tablesGenerated = true;
};
var Aes128CbcContext = class {
  constructor() {
    this.roundkey = new Uint32Array(44);
    this.iv = new Uint32Array(AES_128_BLOCK_SIZE / Uint32Array.BYTES_PER_ELEMENT);
    this.in = new Uint8Array(AES_128_BLOCK_SIZE);
    this.out = new Uint8Array(AES_128_BLOCK_SIZE);
    this.inView = new DataView(this.in.buffer);
    this.outView = new DataView(this.out.buffer);
  }
  init({ key, iv }) {
    assert(key.byteLength === 16);
    assert(iv.byteLength === 16);
    if (!tablesGenerated) {
      generateAesTables();
    }
    const keyView = new DataView(key.buffer, key.byteOffset, key.byteLength);
    const ivView = new DataView(iv.buffer, iv.byteOffset, iv.byteLength);
    this.roundkey[0] = keyView.getUint32(0, false);
    this.roundkey[1] = keyView.getUint32(4, false);
    this.roundkey[2] = keyView.getUint32(8, false);
    this.roundkey[3] = keyView.getUint32(12, false);
    this.iv[0] = ivView.getUint32(0, false);
    this.iv[1] = ivView.getUint32(4, false);
    this.iv[2] = ivView.getUint32(8, false);
    this.iv[3] = ivView.getUint32(12, false);
    for (let index = 4; index < 44; index += 4) {
      const temp = this.roundkey[index - 1];
      this.roundkey[index] = this.roundkey[index - 4] ^ Te4[temp >>> 16 & 255] & 4278190080 ^ Te4[temp >>> 8 & 255] & 16711680 ^ Te4[temp >>> 0 & 255] & 65280 ^ Te4[temp >>> 24 & 255] & 255 ^ rcon[index / 4 - 1];
      this.roundkey[index + 1] = this.roundkey[index - 3] ^ this.roundkey[index];
      this.roundkey[index + 2] = this.roundkey[index - 2] ^ this.roundkey[index + 1];
      this.roundkey[index + 3] = this.roundkey[index - 1] ^ this.roundkey[index + 2];
    }
    for (let i = 0, j = 40; i < j; i += 4, j -= 4) {
      for (let k = 0; k < 4; k++) {
        const temp = this.roundkey[i + k];
        this.roundkey[i + k] = this.roundkey[j + k];
        this.roundkey[j + k] = temp;
      }
    }
    for (let index = 4; index < 40; index += 4) {
      for (let k = 0; k < 4; k++) {
        const rk = this.roundkey[index + k];
        this.roundkey[index + k] = Td0[Te4[rk >>> 24 & 255] & 255] ^ Td1[Te4[rk >>> 16 & 255] & 255] ^ Td2[Te4[rk >>> 8 & 255] & 255] ^ Td3[Te4[rk >>> 0 & 255] & 255];
      }
    }
  }
  decrypt() {
    let s0 = this.inView.getUint32(0, false) ^ this.roundkey[0];
    let s1 = this.inView.getUint32(4, false) ^ this.roundkey[1];
    let s2 = this.inView.getUint32(8, false) ^ this.roundkey[2];
    let s3 = this.inView.getUint32(12, false) ^ this.roundkey[3];
    const temp0 = this.inView.getUint32(0, false);
    const temp1 = this.inView.getUint32(4, false);
    const temp2 = this.inView.getUint32(8, false);
    const temp3 = this.inView.getUint32(12, false);
    let t0, t1, t2, t3;
    for (let round = 1; round < 10; round++) {
      const offset = round * 4;
      t0 = Td0[s0 >>> 24] ^ Td1[s3 >>> 16 & 255] ^ Td2[s2 >>> 8 & 255] ^ Td3[s1 & 255] ^ this.roundkey[offset];
      t1 = Td0[s1 >>> 24] ^ Td1[s0 >>> 16 & 255] ^ Td2[s3 >>> 8 & 255] ^ Td3[s2 & 255] ^ this.roundkey[offset + 1];
      t2 = Td0[s2 >>> 24] ^ Td1[s1 >>> 16 & 255] ^ Td2[s0 >>> 8 & 255] ^ Td3[s3 & 255] ^ this.roundkey[offset + 2];
      t3 = Td0[s3 >>> 24] ^ Td1[s2 >>> 16 & 255] ^ Td2[s1 >>> 8 & 255] ^ Td3[s0 & 255] ^ this.roundkey[offset + 3];
      s0 = t0;
      s1 = t1;
      s2 = t2;
      s3 = t3;
    }
    const f0 = Td4[s0 >>> 24 & 255] & 4278190080 ^ Td4[s3 >>> 16 & 255] & 16711680 ^ Td4[s2 >>> 8 & 255] & 65280 ^ Td4[s1 >>> 0 & 255] & 255 ^ this.roundkey[40];
    const f1 = Td4[s1 >>> 24 & 255] & 4278190080 ^ Td4[s0 >>> 16 & 255] & 16711680 ^ Td4[s3 >>> 8 & 255] & 65280 ^ Td4[s2 >>> 0 & 255] & 255 ^ this.roundkey[41];
    const f2 = Td4[s2 >>> 24 & 255] & 4278190080 ^ Td4[s1 >>> 16 & 255] & 16711680 ^ Td4[s0 >>> 8 & 255] & 65280 ^ Td4[s3 >>> 0 & 255] & 255 ^ this.roundkey[42];
    const f3 = Td4[s3 >>> 24 & 255] & 4278190080 ^ Td4[s2 >>> 16 & 255] & 16711680 ^ Td4[s1 >>> 8 & 255] & 65280 ^ Td4[s0 >>> 0 & 255] & 255 ^ this.roundkey[43];
    this.outView.setUint32(0, f0 ^ this.iv[0], false);
    this.outView.setUint32(4, f1 ^ this.iv[1], false);
    this.outView.setUint32(8, f2 ^ this.iv[2], false);
    this.outView.setUint32(12, f3 ^ this.iv[3], false);
    this.iv[0] = temp0;
    this.iv[1] = temp1;
    this.iv[2] = temp2;
    this.iv[3] = temp3;
  }
};
var createAes128CbcDecryptStream = (reader, getInit, close) => {
  let initted = false;
  let closed = false;
  let pos = 0;
  const CHUNK_SIZE = 2 ** 16;
  const BLOCK_SIZE = 16;
  const aesContext = new Aes128CbcContext();
  const closeOnce = () => {
    if (!closed) {
      closed = true;
      close();
    }
  };
  return new ReadableStream({
    pull: async (controller) => {
      try {
        if (!initted) {
          aesContext.init(await getInit());
          initted = true;
        }
        const requestedLength = CHUNK_SIZE + BLOCK_SIZE;
        let nextSlice = reader.requestSliceRange(pos, 0, requestedLength);
        if (isThenable(nextSlice))
          nextSlice = await nextSlice;
        if (!nextSlice || nextSlice.length === 0) {
          throw new Error("Invalid ciphertext.");
        }
        const sliceLength = nextSlice.length;
        if (sliceLength % 16 !== 0) {
          throw new Error("Invalid ciphertext.");
        }
        const bytesToRead = sliceLength === requestedLength ? sliceLength - BLOCK_SIZE : sliceLength;
        const input2 = readBytes(nextSlice, bytesToRead);
        const output = new Uint8Array(bytesToRead);
        for (let i = 0; i < bytesToRead; i += 16) {
          aesContext.in.set(input2.subarray(i, i + 16));
          aesContext.decrypt();
          output.set(aesContext.out, i);
        }
        if (bytesToRead < sliceLength) {
          controller.enqueue(output);
          pos += bytesToRead;
        } else {
          const paddingLength = output[bytesToRead - 1];
          if (paddingLength === 0 || paddingLength > 16) {
            throw new Error("Invalid PKCS#7 padding. Incorrect key or corrupted data.");
          }
          const trimmedOutput = output.subarray(0, bytesToRead - paddingLength);
          controller.enqueue(trimmedOutput);
          controller.close();
          closeOnce();
        }
      } catch (error) {
        closeOnce();
        throw error;
      }
    },
    cancel: () => {
      closeOnce();
    }
  });
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-demuxer.js
var TRUEHD_CHANNEL_ASSIGNMENT_COUNTS = [2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 1, 1];
var MAX_BOX_NESTING_DEPTH = 64;
var IsobmffDemuxer = class _IsobmffDemuxer extends Demuxer {
  constructor(input2) {
    super(input2);
    this.moovSlice = null;
    this.currentTrack = null;
    this.tracks = [];
    this.idToTrack = /* @__PURE__ */ new Map();
    this.metadataPromise = null;
    this.movieTimescale = -1;
    this.movieDurationInTimescale = -1;
    this.movieMatrix = IDENTITY_MATRIX;
    this.isQuickTime = false;
    this.metadataTags = {};
    this.currentMetadataKeys = null;
    this.isFragmented = false;
    this.fragmentTrackDefaults = /* @__PURE__ */ new Map();
    this.psshBoxes = [];
    this.currentFragment = null;
    this.isReadingTraf = false;
    this.currentFragmentTrackState = null;
    this.lastReadFragment = null;
    this.fragmentSummaries = /* @__PURE__ */ new Map();
    this.decryptionKeyCache = /* @__PURE__ */ new Map();
    this.boxNestingDepth = 0;
    this.reader = input2._reader;
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.tracks.map((track) => track.trackBacking);
  }
  async getMimeType() {
    await this.readMetadata();
    const backings = await this.getTrackBackings();
    const codecStrings = await Promise.all(backings.map((x) => x.getDecoderConfig().then((c) => c?.codec ?? null)));
    return buildIsobmffMimeType({
      isQuickTime: this.isQuickTime,
      hasVideo: this.tracks.some((x) => x.info?.type === "video"),
      hasAudio: this.tracks.some((x) => x.info?.type === "audio"),
      codecStrings: codecStrings.filter(Boolean)
    });
  }
  async getMetadataTags() {
    await this.readMetadata();
    return this.metadataTags;
  }
  readMetadata() {
    return this.metadataPromise ??= (async () => {
      let currentPos = 0;
      let lookForMfraBox = false;
      let foundMovieBoxes = false;
      while (true) {
        let slice = this.reader.requestSliceRange(currentPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const startPos = currentPos;
        const boxInfo = readBoxHeader(slice);
        if (!boxInfo) {
          break;
        }
        if ((boxInfo.name === "ftyp" || boxInfo.name === "styp") && slice.remainingLength >= 4) {
          const majorBrand = readAscii(slice, 4);
          this.isQuickTime = majorBrand === "qt  ";
        } else if (boxInfo.name === "moov") {
          let moovSlice = this.reader.requestSlice(slice.filePos, boxInfo.contentSize);
          if (isThenable(moovSlice))
            moovSlice = await moovSlice;
          if (!moovSlice)
            break;
          this.moovSlice = moovSlice;
          this.readContiguousBoxes(this.moovSlice);
          if (this.movieTimescale === -1) {
            throw new Error("Invalid moov box: missing mvhd box.");
          }
          for (const track of this.tracks) {
            const previousSegmentDurationsInSeconds = track.editListPreviousSegmentDurations / this.movieTimescale;
            track.editListOffset -= Math.round(previousSegmentDurationsInSeconds * track.timescale);
          }
          lookForMfraBox = this.isFragmented && this.reader.fileSize !== null && this.reader.fileSize > startPos + boxInfo.totalSize;
          foundMovieBoxes = true;
          break;
        } else if (boxInfo.name === "moof") {
          if (!this.input._initInput) {
            throw new Error('"moof" box encountered with no "moov" box present; this file is likely a Segment as described in ISO/IEC 14496-12 Section 8.16. A separate init file that contains a "moov" box is required to read this file, please provide it using InputOptions.initInput.');
          }
          await this.copyMetadataFromInitInput(this.input._initInput);
          lookForMfraBox = false;
          foundMovieBoxes = true;
          break;
        }
        currentPos = startPos + boxInfo.totalSize;
      }
      if (!foundMovieBoxes && this.input._initInput) {
        await this.copyMetadataFromInitInput(this.input._initInput);
      }
      if (lookForMfraBox) {
        assert(this.reader.fileSize !== null);
        let lastWordSlice = this.reader.requestSlice(this.reader.fileSize - 4, 4);
        if (isThenable(lastWordSlice))
          lastWordSlice = await lastWordSlice;
        assert(lastWordSlice);
        const lastWord = readU32Be(lastWordSlice);
        const potentialMfraPos = this.reader.fileSize - lastWord;
        if (potentialMfraPos >= 0 && potentialMfraPos <= this.reader.fileSize - MAX_BOX_HEADER_SIZE) {
          let mfraHeaderSlice = this.reader.requestSliceRange(potentialMfraPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
          if (isThenable(mfraHeaderSlice))
            mfraHeaderSlice = await mfraHeaderSlice;
          if (mfraHeaderSlice) {
            const boxInfo = readBoxHeader(mfraHeaderSlice);
            if (boxInfo && boxInfo.name === "mfra") {
              let mfraSlice = this.reader.requestSlice(mfraHeaderSlice.filePos, boxInfo.contentSize);
              if (isThenable(mfraSlice))
                mfraSlice = await mfraSlice;
              if (mfraSlice) {
                this.readContiguousBoxes(mfraSlice);
              }
            }
          }
        }
      }
      for (const track of this.tracks) {
        const table = track.fragmentLookupTable;
        table.sort((a, b) => a.timestamp - b.timestamp);
        let writeIndex = 0;
        for (const entry of table) {
          if (writeIndex === 0 || entry.timestamp !== table[writeIndex - 1].timestamp) {
            table[writeIndex++] = entry;
          }
        }
        table.length = writeIndex;
      }
    })();
  }
  async copyMetadataFromInitInput(initInput) {
    const initDemuxer = await initInput._getDemuxer();
    if (initDemuxer.constructor !== _IsobmffDemuxer) {
      throw new Error("Init input must match the input's format.");
    }
    await initDemuxer.readMetadata();
    this.movieTimescale = initDemuxer.movieTimescale;
    this.movieDurationInTimescale = initDemuxer.movieDurationInTimescale;
    this.movieMatrix = initDemuxer.movieMatrix;
    this.metadataTags = initDemuxer.metadataTags;
    this.isFragmented = true;
    this.fragmentTrackDefaults = initDemuxer.fragmentTrackDefaults;
    this.psshBoxes = initDemuxer.psshBoxes;
    for (const foreignTrack of initDemuxer.tracks) {
      const track = {
        id: foreignTrack.id,
        demuxer: this,
        trackBacking: null,
        disposition: foreignTrack.disposition,
        timescale: foreignTrack.timescale,
        durationInMediaTimescale: foreignTrack.durationInMediaTimescale,
        durationInMovieTimescale: foreignTrack.durationInMovieTimescale,
        matrix: foreignTrack.matrix,
        internalCodecId: foreignTrack.internalCodecId,
        name: foreignTrack.name,
        languageCode: foreignTrack.languageCode,
        sampleTableByteOffset: null,
        sampleTable: null,
        fragmentLookupTable: [],
        fragmentPositionCache: [],
        editListPreviousSegmentDurations: foreignTrack.editListPreviousSegmentDurations,
        editListOffset: foreignTrack.editListOffset,
        encryptionInfo: foreignTrack.encryptionInfo,
        encryptionAuxInfo: null,
        frmaCodecString: null,
        maxBitrate: foreignTrack.maxBitrate,
        avgBitrate: foreignTrack.avgBitrate,
        info: foreignTrack.info
      };
      if (foreignTrack.trackBacking) {
        assert(track.info);
        if (track.info.type === "video" && track.info.width !== -1) {
          const videoTrack = track;
          track.trackBacking = new IsobmffVideoTrackBacking(videoTrack);
          this.tracks.push(track);
          this.idToTrack.set(track.id, track);
        } else if (track.info.type === "audio" && track.info.numberOfChannels !== -1) {
          const audioTrack = track;
          track.trackBacking = new IsobmffAudioTrackBacking(audioTrack);
          this.tracks.push(track);
          this.idToTrack.set(track.id, track);
        }
      } else {
      }
    }
  }
  getSampleTableForTrack(internalTrack) {
    if (internalTrack.sampleTable) {
      return internalTrack.sampleTable;
    }
    const sampleTable = {
      sampleTimingEntries: [],
      sampleCompositionTimeOffsets: [],
      sampleSizes: [],
      sampleCount: 0,
      cumulativeSampleSizes: null,
      keySampleIndices: null,
      chunkOffsets: [],
      sampleToChunk: [],
      sortedCompositionTimeOffsets: null
    };
    internalTrack.sampleTable = sampleTable;
    if (internalTrack.sampleTableByteOffset === null) {
      return sampleTable;
    }
    assert(this.moovSlice);
    const stblContainerSlice = this.moovSlice.slice(internalTrack.sampleTableByteOffset);
    this.currentTrack = internalTrack;
    try {
      this.traverseBox(stblContainerSlice);
    } catch (error) {
      internalTrack.sampleTable = null;
      throw error;
    } finally {
      this.currentTrack = null;
    }
    const lastTimingEntry = last(sampleTable.sampleTimingEntries);
    const lastChunkEntryIndex = binarySearchLessOrEqual(sampleTable.sampleToChunk, sampleTable.chunkOffsets.length - 1, (x) => x.startChunkIndex);
    const lastChunkEntry = sampleTable.sampleToChunk[lastChunkEntryIndex];
    sampleTable.sampleCount = Math.min(sampleTable.sampleCount, lastTimingEntry ? lastTimingEntry.startIndex + lastTimingEntry.count : 0, lastChunkEntry ? lastChunkEntry.startSampleIndex + (sampleTable.chunkOffsets.length - lastChunkEntry.startChunkIndex) * lastChunkEntry.samplesPerChunk : 0);
    capEntryCounts(sampleTable.sampleTimingEntries, sampleTable.sampleCount);
    capEntryCounts(sampleTable.sampleCompositionTimeOffsets, sampleTable.sampleCount);
    const isPcmCodec = internalTrack.info?.type === "audio" && internalTrack.info.codec && PCM_AUDIO_CODECS.includes(internalTrack.info.codec);
    if (isPcmCodec && sampleTable.sampleCompositionTimeOffsets.length === 0 && sampleTable.sampleTimingEntries.length > 0) {
      assert(internalTrack.info?.type === "audio");
      const pcmInfo = parsePcmCodec(internalTrack.info.codec);
      const newSampleTimingEntries = [];
      const newSampleSizes = [];
      for (let i = 0; i < sampleTable.sampleToChunk.length; i++) {
        const chunkEntry = sampleTable.sampleToChunk[i];
        const nextEntry = sampleTable.sampleToChunk[i + 1];
        const chunkCount = Math.min(nextEntry ? nextEntry.startChunkIndex : Infinity, sampleTable.chunkOffsets.length) - chunkEntry.startChunkIndex;
        const newStartSampleIndex = newSampleSizes.length;
        for (let j = 0; j < chunkCount; j++) {
          const startSampleIndex = chunkEntry.startSampleIndex + j * chunkEntry.samplesPerChunk;
          const endSampleIndex = startSampleIndex + chunkEntry.samplesPerChunk;
          const startTimingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, startSampleIndex, (x) => x.startIndex);
          const startTimingEntry = sampleTable.sampleTimingEntries[startTimingEntryIndex];
          const endTimingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, endSampleIndex, (x) => x.startIndex);
          const endTimingEntry = sampleTable.sampleTimingEntries[endTimingEntryIndex];
          const firstSampleTimestamp = startTimingEntry.startDecodeTimestamp + (startSampleIndex - startTimingEntry.startIndex) * startTimingEntry.delta;
          const lastSampleTimestamp = endTimingEntry.startDecodeTimestamp + (endSampleIndex - endTimingEntry.startIndex) * endTimingEntry.delta;
          const delta = lastSampleTimestamp - firstSampleTimestamp;
          const lastSampleTimingEntry = last(newSampleTimingEntries);
          if (lastSampleTimingEntry && lastSampleTimingEntry.delta === delta) {
            lastSampleTimingEntry.count++;
          } else {
            newSampleTimingEntries.push({
              startIndex: newSampleSizes.length,
              startDecodeTimestamp: firstSampleTimestamp,
              count: 1,
              delta
            });
          }
          const frameCount = Math.round(delta * internalTrack.info.sampleRate / internalTrack.timescale);
          const chunkSize = frameCount * pcmInfo.sampleSize * internalTrack.info.numberOfChannels;
          newSampleSizes.push(chunkSize);
        }
        chunkEntry.startSampleIndex = newStartSampleIndex;
        chunkEntry.samplesPerChunk = 1;
      }
      sampleTable.sampleTimingEntries = newSampleTimingEntries;
      sampleTable.sampleSizes = newSampleSizes;
      sampleTable.sampleCount = newSampleSizes.length;
    }
    if (sampleTable.sampleCompositionTimeOffsets.length > 0) {
      const entries = sampleTable.sampleCompositionTimeOffsets;
      const lastEntry = last(entries);
      const coveredSampleCount = lastEntry.startIndex + lastEntry.count;
      if (coveredSampleCount < sampleTable.sampleCount) {
        entries.push({
          startIndex: coveredSampleCount,
          count: sampleTable.sampleCount - coveredSampleCount,
          offset: 0,
          startTimestamp: -1,
          lastTimestamp: -1,
          maxLastTimestamp: -1
        });
      }
      const sortedEntries = entries.filter((entry) => entry.count > 0);
      const timingEntries = sampleTable.sampleTimingEntries;
      let timingEntryIndex = 0;
      const getDecodeTimestampAhead = (sampleIndex) => {
        while (timingEntryIndex + 1 < timingEntries.length && timingEntries[timingEntryIndex + 1].startIndex <= sampleIndex) {
          timingEntryIndex++;
        }
        const timingEntry = timingEntries[timingEntryIndex];
        return timingEntry.startDecodeTimestamp + (sampleIndex - timingEntry.startIndex) * timingEntry.delta;
      };
      for (const entry of sortedEntries) {
        const lastSampleIndex = entry.startIndex + entry.count - 1;
        entry.startTimestamp = getDecodeTimestampAhead(entry.startIndex) + entry.offset;
        entry.lastTimestamp = getDecodeTimestampAhead(lastSampleIndex) + entry.offset;
      }
      sortedEntries.sort((a, b) => a.startTimestamp - b.startTimestamp || a.startIndex - b.startIndex);
      let maxLastTimestamp = -Infinity;
      for (const entry of sortedEntries) {
        maxLastTimestamp = Math.max(maxLastTimestamp, entry.lastTimestamp);
        entry.maxLastTimestamp = maxLastTimestamp;
      }
      sampleTable.sortedCompositionTimeOffsets = sortedEntries;
    } else {
    }
    if (sampleTable.sampleSizes.length > 1) {
      sampleTable.cumulativeSampleSizes = [0];
      for (let i = 0; i < sampleTable.sampleSizes.length; i++) {
        sampleTable.cumulativeSampleSizes.push(sampleTable.cumulativeSampleSizes[i] + sampleTable.sampleSizes[i]);
      }
    }
    return sampleTable;
  }
  readFragment(startPos) {
    if (this.lastReadFragment?.moofOffset === startPos) {
      return this.lastReadFragment.promise;
    }
    const promise = (async () => {
      let headerSlice = this.reader.requestSliceRange(startPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
      if (isThenable(headerSlice))
        headerSlice = await headerSlice;
      assert(headerSlice);
      const moofBoxInfo = readBoxHeader(headerSlice);
      assert(moofBoxInfo?.name === "moof");
      let entireSlice = this.reader.requestSlice(startPos, moofBoxInfo.totalSize);
      if (isThenable(entireSlice))
        entireSlice = await entireSlice;
      if (!entireSlice)
        return null;
      this.traverseBox(entireSlice);
      const fragment = this.currentFragment;
      assert(fragment && fragment.moofOffset === startPos);
      this.currentFragment = null;
      this.fragmentSummaries.set(startPos, {
        moofSize: fragment.moofSize,
        trackIds: new Set(fragment.trackData.keys())
      });
      for (const [, trackData] of fragment.trackData) {
        const track = trackData.track;
        const { fragmentPositionCache } = track;
        if (!trackData.startTimestampIsFinal) {
          const lookupEntryIndex = binarySearchExact(track.fragmentLookupTable, fragment.moofOffset, (x) => x.moofOffset);
          const lookupEntry = track.fragmentLookupTable[lookupEntryIndex];
          const lookupEntryIsValid = lookupEntry && trackData.trunSampleCounts.length >= lookupEntry.trunNumber && trackData.trunSampleCounts[lookupEntry.trunNumber - 1] >= lookupEntry.sampleNumber;
          if (lookupEntryIsValid) {
            let sampleIndex = 0;
            for (let i = 1; i < lookupEntry.trunNumber; i++) {
              sampleIndex += trackData.trunSampleCounts[i - 1];
            }
            sampleIndex += lookupEntry.sampleNumber - 1;
            const sample = trackData.samples[sampleIndex];
            assert(sample);
            const timestampOffset = lookupEntry.timestamp - sample.presentationTimestamp;
            offsetFragmentTrackDataByTimestamp(trackData, timestampOffset);
          } else {
            const lastCacheIndex = binarySearchLessOrEqual(fragmentPositionCache, fragment.moofOffset - 1, (x) => x.moofOffset);
            if (lastCacheIndex !== -1) {
              const lastCache = fragmentPositionCache[lastCacheIndex];
              offsetFragmentTrackDataByTimestamp(trackData, lastCache.endDecodeTimestamp);
            } else {
              const lastTimingEntry = last(this.getSampleTableForTrack(track).sampleTimingEntries);
              if (lastTimingEntry) {
                const { startDecodeTimestamp, count, delta } = lastTimingEntry;
                offsetFragmentTrackDataByTimestamp(trackData, startDecodeTimestamp + count * delta);
              }
            }
          }
          trackData.startTimestampIsFinal = true;
        }
        const insertionIndex = binarySearchLessOrEqual(fragmentPositionCache, trackData.startTimestamp, (x) => x.startTimestamp);
        const previousEntry = fragmentPositionCache[insertionIndex];
        const nextEntry = fragmentPositionCache[insertionIndex + 1];
        if ((!previousEntry || previousEntry.moofOffset < fragment.moofOffset) && (!nextEntry || nextEntry.moofOffset > fragment.moofOffset)) {
          fragmentPositionCache.splice(insertionIndex + 1, 0, {
            moofOffset: fragment.moofOffset,
            startTimestamp: trackData.startTimestamp,
            endDecodeTimestamp: trackData.endDecodeTimestamp,
            hasKeyFrame: trackData.firstKeyFrameTimestamp !== null
          });
        }
        if (trackData.encryptionAuxInfo && track.encryptionInfo) {
          const entries = await resolveEncryptionAuxInfo(this.reader, track.encryptionInfo, trackData.encryptionAuxInfo);
          for (let i = 0; i < Math.min(trackData.samples.length, entries.length); i++) {
            const entry = entries[i];
            trackData.samples[i].encryption = entry;
          }
        }
      }
      return fragment;
    })();
    this.lastReadFragment = {
      moofOffset: startPos,
      promise
    };
    promise.catch(() => {
      if (this.lastReadFragment?.promise === promise) {
        this.lastReadFragment = null;
      }
    });
    return promise;
  }
  readContiguousBoxes(slice) {
    if (this.boxNestingDepth === MAX_BOX_NESTING_DEPTH) {
      throw new Error("Invalid file: boxes are nested too deeply.");
    }
    const startIndex = slice.filePos;
    this.boxNestingDepth++;
    try {
      while (slice.filePos - startIndex <= slice.length - MIN_BOX_HEADER_SIZE) {
        const foundBox = this.traverseBox(slice);
        if (!foundBox) {
          break;
        }
      }
    } finally {
      this.boxNestingDepth--;
    }
  }
  // eslint-disable-next-line @stylistic/generator-star-spacing
  *iterateContiguousBoxes(slice) {
    const startIndex = slice.filePos;
    while (slice.filePos - startIndex <= slice.length - MIN_BOX_HEADER_SIZE) {
      const startPos = slice.filePos;
      const boxInfo = readBoxHeader(slice);
      if (!boxInfo) {
        break;
      }
      yield { boxInfo, slice };
      slice.filePos = startPos + boxInfo.totalSize;
    }
  }
  traverseBox(slice) {
    const startPos = slice.filePos;
    const boxInfo = readBoxHeader(slice);
    if (!boxInfo) {
      return false;
    }
    const contentStartPos = slice.filePos;
    const boxEndPos = startPos + boxInfo.totalSize;
    switch (boxInfo.name) {
      case "mdia":
      case "minf":
      case "dinf":
      case "mfra":
      case "edts":
      case "sinf":
      case "schi":
        {
          this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
        }
        ;
        break;
      case "mvhd":
        {
          const version = readU8(slice);
          slice.skip(3);
          let creationTime;
          if (version === 1) {
            creationTime = readU64Be(slice);
            slice.skip(8);
            this.movieTimescale = readU32Be(slice);
            this.movieDurationInTimescale = readU64Be(slice);
          } else {
            creationTime = readU32Be(slice);
            slice.skip(4);
            this.movieTimescale = readU32Be(slice);
            this.movieDurationInTimescale = readU32Be(slice);
          }
          if (creationTime !== 0) {
            this.metadataTags.creationTime = new Date(1e3 * (creationTime - TIMESTAMP_OFFSET));
          } else {
          }
          if (this.movieTimescale === 0) {
            throw new Error("Invalid mvhd box: timescale must not be 0.");
          }
          slice.skip(4 + 2 + 2 + 2 * 4);
          this.movieMatrix = readMatrix(slice);
        }
        ;
        break;
      case "trak":
        {
          if (this.currentFragment || this.currentTrack) {
            break;
          }
          const track = {
            id: -1,
            demuxer: this,
            trackBacking: null,
            disposition: {
              ...DEFAULT_TRACK_DISPOSITION,
              primary: false
            },
            info: null,
            timescale: -1,
            durationInMovieTimescale: -1,
            durationInMediaTimescale: -1,
            matrix: IDENTITY_MATRIX,
            internalCodecId: null,
            name: null,
            languageCode: UNDETERMINED_LANGUAGE,
            sampleTableByteOffset: -1,
            sampleTable: null,
            fragmentLookupTable: [],
            fragmentPositionCache: [],
            editListPreviousSegmentDurations: 0,
            editListOffset: 0,
            encryptionInfo: null,
            encryptionAuxInfo: null,
            frmaCodecString: null,
            maxBitrate: null,
            avgBitrate: null
          };
          this.currentTrack = track;
          this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          if (track.id !== -1 && track.timescale !== -1 && track.info !== null && track.sampleTableByteOffset !== -1) {
            if (track.info.type === "video" && track.info.width !== -1) {
              const videoTrack = track;
              track.trackBacking = new IsobmffVideoTrackBacking(videoTrack);
              this.tracks.push(track);
              this.idToTrack.set(track.id, track);
            } else if (track.info.type === "audio" && track.info.numberOfChannels !== -1) {
              const audioTrack = track;
              track.trackBacking = new IsobmffAudioTrackBacking(audioTrack);
              this.tracks.push(track);
              this.idToTrack.set(track.id, track);
            }
          }
          this.currentTrack = null;
        }
        ;
        break;
      case "tkhd":
        {
          const track = this.currentTrack;
          if (!track || this.currentFragment) {
            break;
          }
          const version = readU8(slice);
          const flags = readU24Be(slice);
          const trackEnabled = !!(flags & 1);
          track.disposition.default = trackEnabled;
          if (version === 0) {
            slice.skip(8);
            track.id = readU32Be(slice);
            slice.skip(4);
            track.durationInMovieTimescale = readU32Be(slice);
          } else if (version === 1) {
            slice.skip(16);
            track.id = readU32Be(slice);
            slice.skip(4);
            track.durationInMovieTimescale = readU64Be(slice);
          } else {
            throw new Error(`Incorrect track header version ${version}.`);
          }
          slice.skip(2 * 4 + 2 + 2 + 2 + 2);
          const trackMatrix = readMatrix(slice);
          track.matrix = multiplyMatrices(trackMatrix, this.movieMatrix);
        }
        ;
        break;
      case "elst":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          const version = readU8(slice);
          slice.skip(3);
          let relevantEntryFound = false;
          let previousSegmentDurations = 0;
          const entryCount = readU32Be(slice);
          for (let i = 0; i < entryCount; i++) {
            const segmentDuration = version === 1 ? readU64Be(slice) : readU32Be(slice);
            const mediaTime = version === 1 ? readI64Be(slice) : readI32Be(slice);
            const mediaRate = readFixed_16_16(slice);
            if (relevantEntryFound) {
              Logging._warn("Unsupported edit list: multiple edits are not currently supported. Only using first edit.");
              break;
            }
            if (mediaTime === -1) {
              previousSegmentDurations += segmentDuration;
              continue;
            }
            if (mediaRate !== 1) {
              Logging._warn("Unsupported edit list entry: media rate must be 1.");
              break;
            }
            track.editListPreviousSegmentDurations = previousSegmentDurations;
            track.editListOffset = mediaTime;
            relevantEntryFound = true;
          }
        }
        ;
        break;
      case "mdhd":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          const version = readU8(slice);
          slice.skip(3);
          if (version === 0) {
            slice.skip(8);
            track.timescale = readU32Be(slice);
            track.durationInMediaTimescale = readU32Be(slice);
          } else if (version === 1) {
            slice.skip(16);
            track.timescale = readU32Be(slice);
            track.durationInMediaTimescale = readU64Be(slice);
          }
          if (track.durationInMediaTimescale === 2 ** (version === 1 ? 64 : 32) - 1) {
            track.durationInMediaTimescale = -1;
          }
          if (track.timescale === 0) {
            throw new Error("Invalid mdhd box: timescale must not be 0.");
          }
          let language = readU16Be(slice);
          if (language > 0) {
            track.languageCode = "";
            for (let i = 0; i < 3; i++) {
              track.languageCode = String.fromCharCode(96 + (language & 31)) + track.languageCode;
              language >>= 5;
            }
            if (!isIso639Dash2LanguageCode(track.languageCode)) {
              track.languageCode = UNDETERMINED_LANGUAGE;
            }
          }
        }
        ;
        break;
      case "hdlr":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          slice.skip(8);
          const handlerType = readAscii(slice, 4);
          if (handlerType === "vide") {
            track.info = {
              type: "video",
              width: -1,
              height: -1,
              squarePixelWidth: -1,
              squarePixelHeight: -1,
              codec: null,
              codecDescription: null,
              colorSpace: { ...EMPTY_COLOR_SPACE },
              avcType: null,
              avcCodecInfo: null,
              hevcType: null,
              hevcCodecInfo: null,
              vp9CodecInfo: null,
              av1CodecInfo: null,
              proresCodecInfo: null,
              proresFormat: null
            };
          } else if (handlerType === "soun") {
            track.info = {
              type: "audio",
              numberOfChannels: -1,
              sampleRate: -1,
              codec: null,
              codecDescription: null,
              aacCodecInfo: null,
              dtsFormat: null,
              pcmLittleEndian: false,
              pcmSampleSize: null
            };
          }
        }
        ;
        break;
      case "stbl":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          track.sampleTableByteOffset = startPos;
          this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
        }
        ;
        break;
      case "stsd":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (track.info === null || track.sampleTable) {
            break;
          }
          const stsdVersion = readU8(slice);
          slice.skip(3);
          const entries = readU32Be(slice);
          for (let i = 0; i < entries; i++) {
            const sampleBoxStartPos = slice.filePos;
            const sampleBoxInfo = readBoxHeader(slice);
            if (!sampleBoxInfo) {
              break;
            }
            track.internalCodecId = sampleBoxInfo.name;
            const lowercaseBoxName = sampleBoxInfo.name.toLowerCase();
            if (track.info.type === "video") {
              slice.skip(6 * 1 + 2 + 2 + 2 + 3 * 4);
              track.info.width = readU16Be(slice);
              track.info.height = readU16Be(slice);
              track.info.squarePixelWidth = track.info.width;
              track.info.squarePixelHeight = track.info.height;
              slice.skip(4 + 4 + 4 + 2 + 32 + 2 + 2);
              track.frmaCodecString = null;
              this.readContiguousBoxes(slice.slice(slice.filePos, sampleBoxStartPos + sampleBoxInfo.totalSize - slice.filePos));
              const codecName = lowercaseBoxName === "encv" ? track.frmaCodecString : lowercaseBoxName;
              track.frmaCodecString = null;
              if (codecName === "avc1" || codecName === "avc3") {
                track.info.codec = "avc";
                track.info.avcType = codecName === "avc1" ? 1 : 3;
              } else if (codecName === "hvc1" || codecName === "hev1") {
                track.info.codec = "hevc";
                track.info.hevcType = codecName;
              } else if (codecName === "vp08") {
                track.info.codec = "vp8";
              } else if (codecName === "vp09") {
                track.info.codec = "vp9";
              } else if (codecName === "av01") {
                track.info.codec = "av1";
              } else if (PRORES_FOURCCS.includes(lowercaseBoxName)) {
                track.info.codec = "prores";
                track.info.proresFormat = lowercaseBoxName;
              } else if (codecName === null) {
                Logging._warn(`Unknown encrypted video codec due to missing frma box.`);
              } else {
                Logging._warn(`Unsupported video codec (sample entry type '${sampleBoxInfo.name}').`);
              }
            } else {
              slice.skip(6 * 1 + 2);
              const version = readU16Be(slice);
              slice.skip(3 * 2);
              let channelCount = readU16Be(slice);
              let sampleSize = readU16Be(slice);
              slice.skip(2 * 2);
              let sampleRate = readU32Be(slice) / 65536;
              let lpcmFlags = null;
              if (stsdVersion === 0 && version > 0) {
                if (version === 1) {
                  slice.skip(4);
                  sampleSize = 8 * readU32Be(slice);
                  slice.skip(2 * 4);
                } else if (version === 2) {
                  slice.skip(4);
                  sampleRate = readF64Be(slice);
                  channelCount = readU32Be(slice);
                  slice.skip(4);
                  sampleSize = readU32Be(slice);
                  lpcmFlags = readU32Be(slice);
                  slice.skip(2 * 4);
                }
              }
              track.info.numberOfChannels = channelCount;
              track.info.sampleRate = sampleRate || track.timescale;
              track.frmaCodecString = null;
              this.readContiguousBoxes(slice.slice(slice.filePos, sampleBoxStartPos + sampleBoxInfo.totalSize - slice.filePos));
              const codecName = lowercaseBoxName === "enca" ? track.frmaCodecString : lowercaseBoxName;
              track.frmaCodecString = null;
              if (codecName === "mp4a") {
              } else if (codecName === ".mp3") {
                track.info.codec = "mp3";
              } else if (codecName === "opus") {
                track.info.codec = "opus";
                track.info.sampleRate = OPUS_SAMPLE_RATE;
              } else if (codecName === "flac") {
                track.info.codec = "flac";
              } else if (codecName === "ulaw") {
                track.info.codec = "ulaw";
              } else if (codecName === "alaw") {
                track.info.codec = "alaw";
              } else if (codecName === "ac-3") {
                track.info.codec = "ac3";
              } else if (codecName === "ec-3") {
                track.info.codec = "eac3";
              } else if (DTS_FOURCCS.includes(codecName)) {
                track.info.codec = "dts";
                track.info.dtsFormat = codecName;
              } else if (codecName === "mlpa") {
                track.info.codec = "truehd";
              } else if (codecName === "twos") {
                if (sampleSize === 8) {
                  track.info.codec = "pcm-s8";
                } else if (sampleSize === 16) {
                  track.info.codec = track.info.pcmLittleEndian ? "pcm-s16" : "pcm-s16be";
                } else {
                  Logging._warn(`Unsupported sample size ${sampleSize} for codec 'twos'.`);
                  track.info.codec = null;
                }
              } else if (codecName === "sowt") {
                if (sampleSize === 8) {
                  track.info.codec = "pcm-s8";
                } else if (sampleSize === 16) {
                  track.info.codec = "pcm-s16";
                } else {
                  Logging._warn(`Unsupported sample size ${sampleSize} for codec 'sowt'.`);
                  track.info.codec = null;
                }
              } else if (codecName === "raw ") {
                track.info.codec = "pcm-u8";
              } else if (codecName === "in24") {
                track.info.codec = track.info.pcmLittleEndian ? "pcm-s24" : "pcm-s24be";
              } else if (codecName === "in32") {
                track.info.codec = track.info.pcmLittleEndian ? "pcm-s32" : "pcm-s32be";
              } else if (codecName === "fl32") {
                track.info.codec = track.info.pcmLittleEndian ? "pcm-f32" : "pcm-f32be";
              } else if (codecName === "fl64") {
                track.info.codec = track.info.pcmLittleEndian ? "pcm-f64" : "pcm-f64be";
              } else if (codecName === "ipcm") {
                const pcmSampleSize = track.info.pcmSampleSize;
                if (track.info.pcmLittleEndian) {
                  if (pcmSampleSize === 16) {
                    track.info.codec = "pcm-s16";
                  } else if (pcmSampleSize === 24) {
                    track.info.codec = "pcm-s24";
                  } else if (pcmSampleSize === 32) {
                    track.info.codec = "pcm-s32";
                  } else {
                    Logging._warn(`Invalid ipcm sample size ${pcmSampleSize}.`);
                    track.info.codec = null;
                  }
                } else {
                  if (pcmSampleSize === 16) {
                    track.info.codec = "pcm-s16be";
                  } else if (pcmSampleSize === 24) {
                    track.info.codec = "pcm-s24be";
                  } else if (pcmSampleSize === 32) {
                    track.info.codec = "pcm-s32be";
                  } else {
                    Logging._warn(`Invalid ipcm sample size ${pcmSampleSize}.`);
                    track.info.codec = null;
                  }
                }
              } else if (codecName === "fpcm") {
                const pcmSampleSize = track.info.pcmSampleSize;
                if (track.info.pcmLittleEndian) {
                  if (pcmSampleSize === 32) {
                    track.info.codec = "pcm-f32";
                  } else if (pcmSampleSize === 64) {
                    track.info.codec = "pcm-f64";
                  } else {
                    Logging._warn(`Invalid fpcm sample size ${pcmSampleSize}.`);
                    track.info.codec = null;
                  }
                } else {
                  if (pcmSampleSize === 32) {
                    track.info.codec = "pcm-f32be";
                  } else if (pcmSampleSize === 64) {
                    track.info.codec = "pcm-f64be";
                  } else {
                    Logging._warn(`Invalid fpcm sample size ${pcmSampleSize}.`);
                    track.info.codec = null;
                  }
                }
              } else if (codecName === "lpcm" && lpcmFlags !== null) {
                const bytesPerSample = sampleSize + 7 >> 3;
                const isFloat = Boolean(lpcmFlags & 1);
                const isBigEndian = Boolean(lpcmFlags & 2);
                const sFlags = lpcmFlags & 4 ? -1 : 0;
                if (sampleSize > 0 && sampleSize <= 64) {
                  if (isFloat) {
                    if (sampleSize === 32) {
                      track.info.codec = isBigEndian ? "pcm-f32be" : "pcm-f32";
                    } else if (sampleSize === 64) {
                      track.info.codec = isBigEndian ? "pcm-f64be" : "pcm-f64";
                    }
                  } else {
                    if (sFlags & 1 << bytesPerSample - 1) {
                      if (bytesPerSample === 1) {
                        track.info.codec = "pcm-s8";
                      } else if (bytesPerSample === 2) {
                        track.info.codec = isBigEndian ? "pcm-s16be" : "pcm-s16";
                      } else if (bytesPerSample === 3) {
                        track.info.codec = isBigEndian ? "pcm-s24be" : "pcm-s24";
                      } else if (bytesPerSample === 4) {
                        track.info.codec = isBigEndian ? "pcm-s32be" : "pcm-s32";
                      }
                    } else {
                      if (bytesPerSample === 1) {
                        track.info.codec = "pcm-u8";
                      }
                    }
                  }
                }
                if (track.info.codec === null) {
                  Logging._warn("Unsupported PCM format.");
                }
              } else if (codecName === null) {
                Logging._warn(`Unknown encrypted audio codec due to missing frma box.`);
              } else {
                Logging._warn(`Unsupported audio codec (sample entry type '${sampleBoxInfo.name}').`);
              }
            }
            slice.filePos = sampleBoxStartPos + sampleBoxInfo.totalSize;
          }
        }
        ;
        break;
      case "frma":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          const format = readAscii(slice, 4);
          const lowercase = format.toLowerCase();
          track.frmaCodecString = lowercase;
        }
        ;
        break;
      case "schm":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          slice.skip(4);
          const schemeType = readAscii(slice, 4);
          if (schemeType === "cenc" || schemeType === "cens" || schemeType === "cbcs") {
            track.encryptionInfo = {
              scheme: schemeType,
              defaultKid: null,
              defaultIsProtected: null,
              defaultPerSampleIvSize: null,
              defaultConstantIv: null,
              defaultCryptByteBlock: null,
              defaultSkipByteBlock: null
            };
          } else {
            Logging._warn(`Unsupported encryption scheme '${schemeType}'.`);
          }
        }
        ;
        break;
      case "tenc":
        {
          const track = this.currentTrack;
          if (!track || !track.encryptionInfo) {
            break;
          }
          const version = readU8(slice);
          slice.skip(3);
          slice.skip(1);
          const patternByte = readU8(slice);
          if (version > 0) {
            track.encryptionInfo.defaultCryptByteBlock = patternByte >> 4;
            track.encryptionInfo.defaultSkipByteBlock = patternByte & 15;
          } else {
            track.encryptionInfo.defaultCryptByteBlock = 0;
            track.encryptionInfo.defaultSkipByteBlock = 0;
          }
          track.encryptionInfo.defaultIsProtected = readU8(slice) !== 0;
          track.encryptionInfo.defaultPerSampleIvSize = readU8(slice);
          track.encryptionInfo.defaultKid = bytesToHexString(readBytes(slice, 16));
          if (track.encryptionInfo.defaultPerSampleIvSize > 16) {
            throw new Error("Invalid tenc box: IV size must not exceed 16 bytes.");
          }
          if (track.encryptionInfo.defaultIsProtected && track.encryptionInfo.defaultPerSampleIvSize === 0) {
            const constantIvSize = readU8(slice);
            if (constantIvSize > 16) {
              throw new Error("Invalid tenc box: IV size must not exceed 16 bytes.");
            }
            const constantIv = new Uint8Array(16);
            constantIv.set(readBytes(slice, constantIvSize), 0);
            track.encryptionInfo.defaultConstantIv = constantIv;
          }
        }
        ;
        break;
      case "avcC":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          if (boxInfo.contentSize === 0) {
            break;
          }
          track.info.codecDescription = readBytes(slice, boxInfo.contentSize);
          const sps = deserializeAvcDecoderConfigurationRecord(track.info.codecDescription)?.sequenceParameterSets[0];
          const spsInfo = sps && parseAvcSps(sps);
          if (spsInfo) {
            applySpsPixelAspectRatio(track, spsInfo.pixelAspectRatio);
          }
        }
        ;
        break;
      case "hvcC":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          if (boxInfo.contentSize === 0) {
            break;
          }
          track.info.codecDescription = readBytes(slice, boxInfo.contentSize);
          const sps = deserializeHevcDecoderConfigurationRecord(track.info.codecDescription)?.arrays.find((x) => x.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
          const spsInfo = sps && parseHevcSps(sps);
          if (spsInfo) {
            applySpsPixelAspectRatio(track, spsInfo.pixelAspectRatio);
          }
        }
        ;
        break;
      case "vpcC":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          slice.skip(4);
          const profile = readU8(slice);
          const level = readU8(slice);
          const thirdByte = readU8(slice);
          const bitDepth = thirdByte >> 4;
          const chromaSubsampling = thirdByte >> 1 & 7;
          const videoFullRangeFlag = thirdByte & 1;
          const colourPrimaries = readU8(slice);
          const transferCharacteristics = readU8(slice);
          const matrixCoefficients = readU8(slice);
          track.info.vp9CodecInfo = {
            profile,
            level,
            bitDepth,
            chromaSubsampling,
            videoFullRangeFlag,
            colourPrimaries,
            transferCharacteristics,
            matrixCoefficients
          };
        }
        ;
        break;
      case "av1C":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          slice.skip(1);
          const secondByte = readU8(slice);
          const profile = secondByte >> 5;
          const level = secondByte & 31;
          const thirdByte = readU8(slice);
          const tier = thirdByte >> 7;
          const highBitDepth = thirdByte >> 6 & 1;
          const twelveBit = thirdByte >> 5 & 1;
          const monochrome = thirdByte >> 4 & 1;
          const chromaSubsamplingX = thirdByte >> 3 & 1;
          const chromaSubsamplingY = thirdByte >> 2 & 1;
          const chromaSamplePosition = thirdByte & 3;
          const bitDepth = profile === 2 && highBitDepth ? twelveBit ? 12 : 10 : highBitDepth ? 10 : 8;
          slice.skip(1);
          const configObus = readBytes(slice, boxInfo.contentSize - 4);
          const configObuInfo = extractAv1CodecInfoFromPacket(configObus);
          track.info.av1CodecInfo = {
            profile,
            level,
            tier,
            bitDepth,
            monochrome,
            chromaSubsamplingX,
            chromaSubsamplingY,
            chromaSamplePosition,
            videoFullRangeFlag: configObuInfo?.videoFullRangeFlag ?? 0,
            colourPrimaries: configObuInfo?.colourPrimaries ?? 2,
            transferCharacteristics: configObuInfo?.transferCharacteristics ?? 2,
            matrixCoefficients: configObuInfo?.matrixCoefficients ?? 2
          };
        }
        ;
        break;
      case "colr":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          const colourType = readAscii(slice, 4);
          if (colourType !== "nclx" && colourType !== "nclc") {
            break;
          }
          const colourPrimaries = readU16Be(slice);
          const transferCharacteristics = readU16Be(slice);
          const matrixCoefficients = readU16Be(slice);
          let fullRange = void 0;
          if (colourType === "nclx") {
            fullRange = Boolean(readU8(slice) & 128);
          }
          track.info.colorSpace = {
            primaries: COLOR_PRIMARIES_MAP_INVERSE[colourPrimaries],
            transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[transferCharacteristics],
            matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[matrixCoefficients],
            fullRange
          };
        }
        ;
        break;
      case "pasp":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "video") {
            break;
          }
          const num = readU32Be(slice);
          const den = readU32Be(slice);
          if (num > 0 && den > 0) {
            track.info.squarePixelWidth = track.info.width;
            track.info.squarePixelHeight = track.info.height;
            if (num > den) {
              track.info.squarePixelWidth = Math.round(track.info.width * num / den);
            } else {
              track.info.squarePixelHeight = Math.round(track.info.height * den / num);
            }
          }
        }
        ;
        break;
      case "btrt":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          slice.skip(4);
          const maxBitrate = readU32Be(slice);
          const avgBitrate = readU32Be(slice);
          track.maxBitrate = maxBitrate > 0 ? maxBitrate : null;
          track.avgBitrate = avgBitrate > 0 ? avgBitrate : null;
        }
        ;
        break;
      case "wave":
        {
          this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
        }
        ;
        break;
      case "esds":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          slice.skip(4);
          const { objectTypeIndication, decoderSpecificInfo } = readEsDescriptor(slice);
          if (objectTypeIndication === 64 || objectTypeIndication === 103) {
            track.info.codec = "aac";
            track.info.aacCodecInfo = {
              isMpeg2: objectTypeIndication === 103,
              objectType: null
            };
          } else if (objectTypeIndication === 105 || objectTypeIndication === 107) {
            track.info.codec = "mp3";
          } else if (objectTypeIndication === 221) {
            track.info.codec = "vorbis";
          } else if (objectTypeIndication === 169) {
            track.info.codec = "dts";
          } else {
            Logging._warn(`Unsupported audio codec (objectTypeIndication ${objectTypeIndication}) - discarding track.`);
          }
          if (decoderSpecificInfo) {
            track.info.codecDescription = decoderSpecificInfo;
            if (track.info.codec === "aac") {
              const audioSpecificConfig = parseAacAudioSpecificConfig(track.info.codecDescription);
              if (audioSpecificConfig.outputNumberOfChannels !== null) {
                track.info.numberOfChannels = audioSpecificConfig.outputNumberOfChannels;
              }
              if (audioSpecificConfig.outputSampleRate !== null) {
                track.info.sampleRate = audioSpecificConfig.outputSampleRate;
              }
            }
          }
        }
        ;
        break;
      case "enda":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          track.info.pcmLittleEndian = !!(readU16Be(slice) & 255);
        }
        ;
        break;
      case "pcmC":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          slice.skip(1 + 3);
          const formatFlags = readU8(slice);
          track.info.pcmLittleEndian = Boolean(formatFlags & 1);
          track.info.pcmSampleSize = readU8(slice);
        }
        ;
        break;
      case "srat":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          slice.skip(4);
          track.info.sampleRate = readU32Be(slice);
        }
        ;
        break;
      case "dOps":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          slice.skip(1);
          const outputChannelCount = readU8(slice);
          const preSkip = readU16Be(slice);
          const inputSampleRate = readU32Be(slice);
          const outputGain = readI16Be(slice);
          const channelMappingFamily = readU8(slice);
          const channelMappingTable = channelMappingFamily !== 0 ? readBytes(slice, boxInfo.contentSize - 11) : new Uint8Array(0);
          const description = new Uint8Array(8 + 1 + 1 + 2 + 4 + 2 + 1 + channelMappingTable.byteLength);
          const view = new DataView(description.buffer);
          view.setUint32(0, 1332770163, false);
          view.setUint32(4, 1214603620, false);
          view.setUint8(8, 1);
          view.setUint8(9, outputChannelCount);
          view.setUint16(10, preSkip, true);
          view.setUint32(12, inputSampleRate, true);
          view.setInt16(16, outputGain, true);
          view.setUint8(18, channelMappingFamily);
          description.set(channelMappingTable, 19);
          track.info.codecDescription = description;
          track.info.numberOfChannels = outputChannelCount;
        }
        ;
        break;
      case "dfLa":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          slice.skip(4);
          const BLOCK_TYPE_MASK = 127;
          const LAST_METADATA_BLOCK_FLAG_MASK = 128;
          const startPos2 = slice.filePos;
          while (slice.filePos < boxEndPos) {
            const flagAndType = readU8(slice);
            const metadataBlockLength = readU24Be(slice);
            const type = flagAndType & BLOCK_TYPE_MASK;
            if (type === FlacBlockType.STREAMINFO) {
              slice.skip(10);
              const word = readU32Be(slice);
              const sampleRate = word >>> 12;
              const numberOfChannels = (word >> 9 & 7) + 1;
              track.info.sampleRate = sampleRate;
              track.info.numberOfChannels = numberOfChannels;
              slice.skip(20);
            } else {
              slice.skip(metadataBlockLength);
            }
            if (flagAndType & LAST_METADATA_BLOCK_FLAG_MASK) {
              break;
            }
          }
          const endPos = slice.filePos;
          slice.filePos = startPos2;
          const bytes = readBytes(slice, endPos - startPos2);
          const description = new Uint8Array(4 + bytes.byteLength);
          const view = new DataView(description.buffer);
          view.setUint32(0, 1716281667, false);
          description.set(bytes, 4);
          track.info.codecDescription = description;
        }
        ;
        break;
      case "dac3":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          const bytes = readBytes(slice, 3);
          const bitstream = new Bitstream(bytes);
          const fscod = bitstream.readBits(2);
          bitstream.skipBits(5 + 3);
          const acmod = bitstream.readBits(3);
          const lfeon = bitstream.readBits(1);
          if (fscod < 3) {
            track.info.sampleRate = AC3_SAMPLE_RATES[fscod];
          }
          track.info.numberOfChannels = AC3_ACMOD_CHANNEL_COUNTS[acmod] + lfeon;
        }
        ;
        break;
      case "dec3":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          const bytes = readBytes(slice, boxInfo.contentSize);
          const config = parseEac3Config(bytes);
          if (!config) {
            Logging._warn("Invalid dec3 box contents, ignoring.");
            break;
          }
          const sampleRate = getEac3SampleRate(config);
          if (sampleRate !== null) {
            track.info.sampleRate = sampleRate;
          }
          track.info.numberOfChannels = getEac3ChannelCount(config);
        }
        ;
        break;
      case "ddts":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          const bytes = readBytes(slice, Math.min(boxInfo.contentSize, DTS_SPECIFIC_BOX_SIZE));
          const config = parseDtsSpecificBox(bytes);
          if (!config) {
            Logging._warn("Invalid ddts box contents, ignoring.");
            break;
          }
          track.info.sampleRate = config.sampleRate;
          if (config.numberOfChannels !== null) {
            track.info.numberOfChannels = config.numberOfChannels;
          }
        }
        ;
        break;
      case "dmlp":
        {
          const track = this.currentTrack;
          if (!track || track.info?.type !== "audio") {
            break;
          }
          const formatInfo = readU32Be(slice);
          const rateBits = formatInfo >>> 28;
          if (rateBits === 15) {
            Logging._warn("Invalid dmlp box contents, ignoring.");
            break;
          }
          track.info.sampleRate = (rateBits & 8 ? 44100 : 48e3) << (rateBits & 7);
          const sixChannelAssignment = formatInfo >>> 15 & 31;
          const eightChannelAssignment = formatInfo & 8191;
          const channelAssignment = eightChannelAssignment || sixChannelAssignment;
          let numberOfChannels = 0;
          for (let i = 0; i < TRUEHD_CHANNEL_ASSIGNMENT_COUNTS.length; i++) {
            if (channelAssignment & 1 << i) {
              numberOfChannels += TRUEHD_CHANNEL_ASSIGNMENT_COUNTS[i];
            }
          }
          track.info.numberOfChannels = numberOfChannels;
        }
        ;
        break;
      case "stts":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          const entryCount = readU32Be(slice);
          let currentIndex = 0;
          let currentTimestamp = 0;
          for (let i = 0; i < entryCount; i++) {
            const sampleCount = readU32Be(slice);
            const sampleDelta = readU32Be(slice);
            track.sampleTable.sampleTimingEntries.push({
              startIndex: currentIndex,
              startDecodeTimestamp: currentTimestamp,
              count: sampleCount,
              delta: sampleDelta
            });
            currentIndex += sampleCount;
            currentTimestamp += sampleCount * sampleDelta;
          }
        }
        ;
        break;
      case "ctts":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(1 + 3);
          const entryCount = readU32Be(slice);
          let sampleIndex = 0;
          for (let i = 0; i < entryCount; i++) {
            const sampleCount = readU32Be(slice);
            const sampleOffset = readI32Be(slice);
            track.sampleTable.sampleCompositionTimeOffsets.push({
              startIndex: sampleIndex,
              count: sampleCount,
              offset: sampleOffset,
              startTimestamp: -1,
              lastTimestamp: -1,
              maxLastTimestamp: -1
            });
            sampleIndex += sampleCount;
          }
        }
        ;
        break;
      case "stsz":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          const sampleSize = readU32Be(slice);
          const sampleCount = readU32Be(slice);
          if (sampleSize === 0) {
            for (let i = 0; i < sampleCount; i++) {
              const sampleSize2 = readU32Be(slice);
              track.sampleTable.sampleSizes.push(sampleSize2);
            }
          } else {
            track.sampleTable.sampleSizes.push(sampleSize);
          }
          track.sampleTable.sampleCount = sampleCount;
        }
        ;
        break;
      case "stz2":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          slice.skip(3);
          const fieldSize = readU8(slice);
          const sampleCount = readU32Be(slice);
          if (fieldSize !== 4 && fieldSize !== 8 && fieldSize !== 16) {
            throw new Error(`Invalid stz2 box: unsupported field size ${fieldSize}.`);
          }
          const bytes = readBytes(slice, Math.ceil(sampleCount * fieldSize / 8));
          const bitstream = new Bitstream(bytes);
          for (let i = 0; i < sampleCount; i++) {
            const sampleSize = bitstream.readBits(fieldSize);
            track.sampleTable.sampleSizes.push(sampleSize);
          }
          track.sampleTable.sampleCount = sampleCount;
        }
        ;
        break;
      case "stss":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          track.sampleTable.keySampleIndices = [];
          const entryCount = readU32Be(slice);
          for (let i = 0; i < entryCount; i++) {
            const sampleIndex = readU32Be(slice) - 1;
            track.sampleTable.keySampleIndices.push(sampleIndex);
          }
          track.sampleTable.keySampleIndices.sort((a, b) => a - b);
          if (track.sampleTable.keySampleIndices[0] !== 0) {
            track.sampleTable.keySampleIndices.unshift(0);
          }
        }
        ;
        break;
      case "stsc":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          const entryCount = readU32Be(slice);
          let skippedEntryCount = 0;
          for (let i = 0; i < entryCount; i++) {
            const startChunkIndex = readU32Be(slice) - 1;
            const samplesPerChunk = readU32Be(slice);
            const sampleDescriptionIndex = readU32Be(slice);
            const lastEntry = last(track.sampleTable.sampleToChunk);
            if (lastEntry && startChunkIndex <= lastEntry.startChunkIndex) {
              skippedEntryCount++;
              continue;
            }
            track.sampleTable.sampleToChunk.push({
              startSampleIndex: -1,
              startChunkIndex,
              samplesPerChunk,
              sampleDescriptionIndex
            });
          }
          if (skippedEntryCount > 0) {
            Logging._warn(`Skipped ${skippedEntryCount} invalid stsc entries whose chunk indices weren't strictly increasing.`);
          }
          let startSampleIndex = 0;
          for (let i = 0; i < track.sampleTable.sampleToChunk.length; i++) {
            track.sampleTable.sampleToChunk[i].startSampleIndex = startSampleIndex;
            if (i < track.sampleTable.sampleToChunk.length - 1) {
              const nextChunk = track.sampleTable.sampleToChunk[i + 1];
              const chunkCount = nextChunk.startChunkIndex - track.sampleTable.sampleToChunk[i].startChunkIndex;
              startSampleIndex += chunkCount * track.sampleTable.sampleToChunk[i].samplesPerChunk;
            }
          }
        }
        ;
        break;
      case "stco":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          const entryCount = readU32Be(slice);
          for (let i = 0; i < entryCount; i++) {
            const chunkOffset = readU32Be(slice);
            track.sampleTable.chunkOffsets.push(chunkOffset);
          }
        }
        ;
        break;
      case "co64":
        {
          const track = this.currentTrack;
          if (!track) {
            break;
          }
          if (!track.sampleTable) {
            break;
          }
          slice.skip(4);
          const entryCount = readU32Be(slice);
          for (let i = 0; i < entryCount; i++) {
            const chunkOffset = readU64Be(slice);
            track.sampleTable.chunkOffsets.push(chunkOffset);
          }
        }
        ;
        break;
      case "mvex":
        {
          this.isFragmented = true;
          this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
        }
        ;
        break;
      case "mehd":
        {
          const version = readU8(slice);
          slice.skip(3);
          const fragmentDuration = version === 1 ? readU64Be(slice) : readU32Be(slice);
          this.movieDurationInTimescale = fragmentDuration;
        }
        ;
        break;
      case "trex":
        {
          slice.skip(4);
          const trackId = readU32Be(slice);
          const defaultSampleDescriptionIndex = readU32Be(slice);
          const defaultSampleDuration = readU32Be(slice);
          const defaultSampleSize = readU32Be(slice);
          const defaultSampleFlags = readU32Be(slice);
          this.fragmentTrackDefaults.set(trackId, {
            trackId,
            defaultSampleDescriptionIndex,
            defaultSampleDuration,
            defaultSampleSize,
            defaultSampleFlags
          });
        }
        ;
        break;
      case "tfra":
        {
          const version = readU8(slice);
          slice.skip(3);
          const trackId = readU32Be(slice);
          const track = this.idToTrack.get(trackId);
          if (!track) {
            break;
          }
          const word = readU32Be(slice);
          const lengthSizeOfTrafNum = (word & 48) >> 4;
          const lengthSizeOfTrunNum = (word & 12) >> 2;
          const lengthSizeOfSampleNum = word & 3;
          const functions = [readU8, readU16Be, readU24Be, readU32Be];
          const readTrafNum = functions[lengthSizeOfTrafNum];
          const readTrunNum = functions[lengthSizeOfTrunNum];
          const readSampleNum = functions[lengthSizeOfSampleNum];
          const numberOfEntries = readU32Be(slice);
          for (let i = 0; i < numberOfEntries; i++) {
            const time = version === 1 ? readU64Be(slice) : readU32Be(slice);
            const moofOffset = version === 1 ? readU64Be(slice) : readU32Be(slice);
            readTrafNum(slice);
            const trunNumber = readTrunNum(slice);
            const sampleNumber = readSampleNum(slice);
            if (trunNumber >= 1 && sampleNumber >= 1) {
              track.fragmentLookupTable.push({
                timestamp: time,
                moofOffset,
                trunNumber,
                sampleNumber
              });
            } else {
            }
          }
        }
        ;
        break;
      case "moof":
        {
          if (this.currentFragment) {
            break;
          }
          this.currentFragment = {
            moofOffset: startPos,
            moofSize: boxInfo.totalSize,
            implicitBaseDataOffset: startPos,
            trackData: /* @__PURE__ */ new Map(),
            psshBoxes: [],
            sampleCount: 0
          };
          try {
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          } catch (error) {
            this.currentFragment = null;
            throw error;
          } finally {
            this.currentTrack = null;
            this.currentFragmentTrackState = null;
          }
        }
        ;
        break;
      case "traf":
        {
          if (!this.currentFragment || this.isReadingTraf) {
            break;
          }
          this.isReadingTraf = true;
          try {
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          } finally {
            this.isReadingTraf = false;
          }
          const fragmentTrackState = this.currentFragmentTrackState;
          this.currentFragmentTrackState = null;
          if (this.currentTrack) {
            assert(fragmentTrackState);
            const trackData = this.currentFragment.trackData.get(this.currentTrack.id);
            cond: if (trackData) {
              if (trackData.samples.length === 0) {
                this.currentFragment.trackData.delete(this.currentTrack.id);
                break cond;
              }
              trackData.presentationTimestamps = trackData.samples.map((x, i) => ({ presentationTimestamp: x.presentationTimestamp, sampleIndex: i })).sort((a, b) => a.presentationTimestamp - b.presentationTimestamp);
              for (let i = 0; i < trackData.presentationTimestamps.length; i++) {
                const currentEntry = trackData.presentationTimestamps[i];
                const currentSample = trackData.samples[currentEntry.sampleIndex];
                if (trackData.firstKeyFrameTimestamp === null && currentSample.isKeyFrame) {
                  trackData.firstKeyFrameTimestamp = currentSample.presentationTimestamp;
                }
                if (i < trackData.presentationTimestamps.length - 1) {
                  const nextEntry = trackData.presentationTimestamps[i + 1];
                  const duration = nextEntry.presentationTimestamp - currentEntry.presentationTimestamp;
                  currentSample.duration = duration;
                }
              }
              const firstSample = trackData.samples[trackData.presentationTimestamps[0].sampleIndex];
              const lastSample = trackData.samples[last(trackData.presentationTimestamps).sampleIndex];
              trackData.startTimestamp = firstSample.presentationTimestamp;
              trackData.endTimestamp = lastSample.presentationTimestamp + lastSample.duration;
              trackData.endDecodeTimestamp = fragmentTrackState.currentTimestamp;
              if (fragmentTrackState.startTimestamp !== null) {
                offsetFragmentTrackDataByTimestamp(trackData, fragmentTrackState.startTimestamp);
                trackData.startTimestampIsFinal = true;
              }
              if (fragmentTrackState.encryptionAuxInfo && !trackData.samples[0].encryption) {
                trackData.encryptionAuxInfo = fragmentTrackState.encryptionAuxInfo;
              }
            }
            this.currentTrack = null;
          }
        }
        ;
        break;
      case "pssh":
        {
          if (this.input._formatOptions.isobmff?._suppressPsshParsing) {
            break;
          }
          const psshBox = parsePsshBoxContents(readBytes(slice, boxInfo.contentSize));
          if (this.currentFragment) {
            this.currentFragment.psshBoxes.push(psshBox);
          } else if (!this.currentTrack) {
            this.psshBoxes.push(psshBox);
          }
        }
        ;
        break;
      case "tfhd":
        {
          if (!this.currentFragment || !this.isReadingTraf || this.currentFragmentTrackState) {
            break;
          }
          slice.skip(1);
          const flags = readU24Be(slice);
          const baseDataOffsetPresent = Boolean(flags & 1);
          const sampleDescriptionIndexPresent = Boolean(flags & 2);
          const defaultSampleDurationPresent = Boolean(flags & 8);
          const defaultSampleSizePresent = Boolean(flags & 16);
          const defaultSampleFlagsPresent = Boolean(flags & 32);
          const durationIsEmpty = Boolean(flags & 65536);
          const defaultBaseIsMoof = Boolean(flags & 131072);
          const trackId = readU32Be(slice);
          const defaults = this.fragmentTrackDefaults.get(trackId);
          const fragmentTrackState = {
            baseDataOffset: this.currentFragment.implicitBaseDataOffset,
            sampleDescriptionIndex: defaults?.defaultSampleDescriptionIndex ?? null,
            defaultSampleDuration: defaults?.defaultSampleDuration ?? null,
            defaultSampleSize: defaults?.defaultSampleSize ?? null,
            defaultSampleFlags: defaults?.defaultSampleFlags ?? null,
            startTimestamp: null,
            encryptionAuxInfo: null,
            currentOffset: null,
            currentTimestamp: 0
          };
          this.currentFragmentTrackState = fragmentTrackState;
          if (baseDataOffsetPresent) {
            fragmentTrackState.baseDataOffset = readU64Be(slice);
          } else if (defaultBaseIsMoof) {
            fragmentTrackState.baseDataOffset = this.currentFragment.moofOffset;
          }
          if (sampleDescriptionIndexPresent) {
            fragmentTrackState.sampleDescriptionIndex = readU32Be(slice);
          }
          if (defaultSampleDurationPresent) {
            fragmentTrackState.defaultSampleDuration = readU32Be(slice);
          }
          if (defaultSampleSizePresent) {
            fragmentTrackState.defaultSampleSize = readU32Be(slice);
          }
          if (defaultSampleFlagsPresent) {
            fragmentTrackState.defaultSampleFlags = readU32Be(slice);
          }
          if (durationIsEmpty) {
            fragmentTrackState.defaultSampleDuration = 0;
          }
          const track = this.idToTrack.get(trackId);
          if (!track) {
            break;
          }
          if (this.currentFragment.trackData.has(trackId)) {
            Logging._warn(`Multiple traf boxes for track ${trackId} in the same moof box; ignoring the samples of all but the first.`);
            break;
          }
          this.currentTrack = track;
        }
        ;
        break;
      case "tfdt":
        {
          if (!this.currentFragmentTrackState) {
            break;
          }
          const version = readU8(slice);
          slice.skip(3);
          const baseMediaDecodeTime = version === 0 ? readU32Be(slice) : readU64Be(slice);
          this.currentFragmentTrackState.startTimestamp = baseMediaDecodeTime;
        }
        ;
        break;
      case "trun":
        {
          const fragmentTrackState = this.currentFragmentTrackState;
          if (!fragmentTrackState || !this.currentFragment) {
            break;
          }
          const track = this.currentTrack;
          slice.skip(1);
          const flags = readU24Be(slice);
          const dataOffsetPresent = Boolean(flags & 1);
          const firstSampleFlagsPresent = Boolean(flags & 4);
          const sampleDurationPresent = Boolean(flags & 256);
          const sampleSizePresent = Boolean(flags & 512);
          const sampleFlagsPresent = Boolean(flags & 1024);
          const sampleCompositionTimeOffsetsPresent = Boolean(flags & 2048);
          const sampleCount = readU32Be(slice);
          const { defaultSampleDuration, defaultSampleSize, defaultSampleFlags } = fragmentTrackState;
          if (sampleCount > 0 && (!sampleDurationPresent && defaultSampleDuration === null || !sampleSizePresent && defaultSampleSize === null || !sampleFlagsPresent && defaultSampleFlags === null)) {
            throw new Error("Invalid trun box: sample values are missing and there are no defaults.");
          }
          this.currentFragment.sampleCount += sampleCount;
          if (this.currentFragment.sampleCount > 2 ** 20) {
            throw new Error("Too many (> 2^20) samples in fragment.");
          }
          let dataOffset = null;
          if (dataOffsetPresent) {
            dataOffset = readI32Be(slice);
          }
          let firstSampleFlags = null;
          if (firstSampleFlagsPresent) {
            firstSampleFlags = readU32Be(slice);
          }
          let currentOffset = dataOffset !== null ? fragmentTrackState.baseDataOffset + dataOffset : fragmentTrackState.currentOffset ?? fragmentTrackState.baseDataOffset;
          let trackData = null;
          if (track) {
            trackData = this.currentFragment.trackData.get(track.id) ?? null;
            if (!trackData) {
              trackData = {
                track,
                startTimestamp: 0,
                endTimestamp: 0,
                endDecodeTimestamp: 0,
                firstKeyFrameTimestamp: null,
                samples: [],
                presentationTimestamps: [],
                startTimestampIsFinal: false,
                trunSampleCounts: [],
                encryptionAuxInfo: null
              };
              this.currentFragment.trackData.set(track.id, trackData);
            }
            trackData.trunSampleCounts.push(sampleCount);
          }
          for (let i = 0; i < sampleCount; i++) {
            let sampleDuration;
            if (sampleDurationPresent) {
              sampleDuration = readU32Be(slice);
            } else {
              sampleDuration = defaultSampleDuration;
            }
            let sampleSize;
            if (sampleSizePresent) {
              sampleSize = readU32Be(slice);
            } else {
              sampleSize = defaultSampleSize;
            }
            let sampleFlags;
            if (sampleFlagsPresent) {
              sampleFlags = readU32Be(slice);
            } else {
              sampleFlags = defaultSampleFlags;
            }
            if (i === 0 && firstSampleFlags !== null) {
              sampleFlags = firstSampleFlags;
            }
            let sampleCompositionTimeOffset = 0;
            if (sampleCompositionTimeOffsetsPresent) {
              sampleCompositionTimeOffset = readI32Be(slice);
            }
            trackData?.samples.push({
              presentationTimestamp: fragmentTrackState.currentTimestamp + sampleCompositionTimeOffset,
              duration: sampleDuration,
              byteOffset: currentOffset,
              byteSize: sampleSize,
              isKeyFrame: !(sampleFlags & 65536),
              encryption: null
            });
            currentOffset += sampleSize;
            fragmentTrackState.currentTimestamp += sampleDuration;
          }
          fragmentTrackState.currentOffset = currentOffset;
          this.currentFragment.implicitBaseDataOffset = currentOffset;
        }
        ;
        break;
      case "saiz":
        {
          const track = this.currentTrack;
          if (!track || !track.encryptionInfo) {
            break;
          }
          slice.skip(1);
          const flags = readU24Be(slice);
          if (flags & 1) {
            const auxInfoType = readAscii(slice, 4);
            const auxInfoTypeParam = readU32Be(slice);
            if (auxInfoType !== track.encryptionInfo.scheme || auxInfoTypeParam !== 0) {
              break;
            }
          }
          const defaultSampleInfoSize = readU8(slice);
          const sampleCount = readU32Be(slice);
          let sampleSizes = null;
          if (defaultSampleInfoSize === 0 && sampleCount > 0) {
            sampleSizes = readBytes(slice, sampleCount);
          }
          const aux = getOrCreateEncryptionAuxInfo(track, this.currentFragmentTrackState);
          aux.defaultSampleInfoSize = defaultSampleInfoSize;
          aux.sampleSizes = sampleSizes;
          aux.sampleCount = sampleCount;
        }
        ;
        break;
      case "saio":
        {
          const track = this.currentTrack;
          if (!track || !track.encryptionInfo) {
            break;
          }
          const version = readU8(slice);
          const flags = readU24Be(slice);
          if (flags & 1) {
            const auxInfoType = readAscii(slice, 4);
            const auxInfoTypeParam = readU32Be(slice);
            if (auxInfoType !== track.encryptionInfo.scheme || auxInfoTypeParam !== 0) {
              break;
            }
          }
          const entryCount = readU32Be(slice);
          if (entryCount === 0) {
            break;
          }
          if (entryCount > 1) {
            Logging._warn("Multiple saio entries are not supported; using the first offset only.");
          }
          let offset = version === 0 ? readU32Be(slice) : Number(readU64Be(slice));
          if (this.currentFragment) {
            assert(this.currentFragmentTrackState);
            offset += this.currentFragmentTrackState.baseDataOffset;
          }
          const aux = getOrCreateEncryptionAuxInfo(track, this.currentFragmentTrackState);
          aux.offset = offset;
        }
        ;
        break;
      case "senc":
        {
          const track = this.currentTrack;
          if (!track || !track.encryptionInfo) {
            break;
          }
          const trackData = this.currentFragment?.trackData.get(track.id);
          if (!trackData) {
            break;
          }
          slice.skip(1);
          const flags = readU24Be(slice);
          const useSubsamples = Boolean(flags & 2);
          const sampleCount = readU32Be(slice);
          const ivSize = track.encryptionInfo.defaultPerSampleIvSize;
          if (ivSize === null) {
            throw new Error("Invalid file: encrypted track is missing its tenc box.");
          }
          for (let i = 0; i < Math.min(sampleCount, trackData.samples.length); i++) {
            const iv = new Uint8Array(16);
            if (ivSize > 0) {
              iv.set(readBytes(slice, ivSize), 0);
            } else if (track.encryptionInfo.defaultConstantIv) {
              iv.set(track.encryptionInfo.defaultConstantIv, 0);
            } else {
              throw new Error("Invalid file: encrypted sample has no IV.");
            }
            let subsamples = null;
            if (useSubsamples) {
              const subsampleCount = readU16Be(slice);
              subsamples = [];
              for (let j = 0; j < subsampleCount; j++) {
                const clearLen = readU16Be(slice);
                const protectedLen = readU32Be(slice);
                subsamples.push({ clearLen, protectedLen });
              }
            }
            const sample = trackData.samples[i];
            sample.encryption = { iv, subsamples };
          }
        }
        ;
        break;
      // Metadata section
      // https://exiftool.org/TagNames/QuickTime.html
      // https://mp4workshop.com/about
      case "udta":
        {
          const iterator = this.iterateContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          for (const { boxInfo: boxInfo2, slice: slice2 } of iterator) {
            if (boxInfo2.name !== "meta" && !this.currentTrack) {
              const startPos2 = slice2.filePos;
              this.metadataTags.raw ??= {};
              if (boxInfo2.name[0] === "\xA9") {
                this.metadataTags.raw[boxInfo2.name] ??= readMetadataStringShort(slice2);
              } else {
                this.metadataTags.raw[boxInfo2.name] ??= readBytes(slice2, boxInfo2.contentSize);
              }
              slice2.filePos = startPos2;
            }
            switch (boxInfo2.name) {
              case "meta":
                {
                  slice2.skip(-boxInfo2.headerSize);
                  this.traverseBox(slice2);
                }
                ;
                break;
              case "\xA9nam":
                {
                  if (this.currentTrack) {
                    this.currentTrack.name = readMetadataStringShort(slice2);
                  } else {
                    this.metadataTags.title ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "name":
                {
                  if (this.currentTrack) {
                    this.currentTrack.name = textDecoder.decode(readBytes(slice2, boxInfo2.contentSize));
                  } else {
                    this.metadataTags.title ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9des":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.description ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9ART":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.artist ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9alb":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.album ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "albr":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.albumArtist ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9gen":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.genre ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9day":
                {
                  if (!this.currentTrack) {
                    const date = parseIsoSuffix(readMetadataStringShort(slice2));
                    if (date) {
                      this.metadataTags.date ??= date;
                    }
                  }
                }
                ;
                break;
              case "\xA9cmt":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.comment ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
              case "\xA9lyr":
                {
                  if (!this.currentTrack) {
                    this.metadataTags.lyrics ??= readMetadataStringShort(slice2);
                  }
                }
                ;
                break;
            }
          }
        }
        ;
        break;
      case "meta":
        {
          if (this.currentTrack) {
            break;
          }
          const word = readU32Be(slice);
          const isQuickTime = word !== 0;
          this.currentMetadataKeys = /* @__PURE__ */ new Map();
          if (isQuickTime) {
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          } else {
            this.readContiguousBoxes(slice.slice(contentStartPos + 4, boxInfo.contentSize - 4));
          }
          this.currentMetadataKeys = null;
        }
        ;
        break;
      case "keys":
        {
          if (!this.currentMetadataKeys) {
            break;
          }
          slice.skip(4);
          const entryCount = readU32Be(slice);
          for (let i = 0; i < entryCount; i++) {
            const keySize = readU32Be(slice);
            if (keySize < 8) {
              throw new Error("Invalid keys box: key size must be at least 8.");
            }
            slice.skip(4);
            const keyName = textDecoder.decode(readBytes(slice, keySize - 8));
            this.currentMetadataKeys.set(i + 1, keyName);
          }
        }
        ;
        break;
      case "ilst":
        {
          if (!this.currentMetadataKeys) {
            break;
          }
          const iterator = this.iterateContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          for (const { boxInfo: boxInfo2, slice: slice2 } of iterator) {
            let metadataKey = boxInfo2.name;
            const nameAsNumber = (metadataKey.charCodeAt(0) << 24) + (metadataKey.charCodeAt(1) << 16) + (metadataKey.charCodeAt(2) << 8) + metadataKey.charCodeAt(3);
            if (this.currentMetadataKeys.has(nameAsNumber)) {
              metadataKey = this.currentMetadataKeys.get(nameAsNumber);
            }
            const data = readDataBox(slice2);
            this.metadataTags.raw ??= {};
            this.metadataTags.raw[metadataKey] ??= data;
            switch (metadataKey) {
              case "\xA9nam":
              case "titl":
              case "com.apple.quicktime.title":
              case "title":
                {
                  if (typeof data === "string") {
                    this.metadataTags.title ??= data;
                  }
                }
                ;
                break;
              case "\xA9des":
              case "desc":
              case "dscp":
              case "com.apple.quicktime.description":
              case "description":
                {
                  if (typeof data === "string") {
                    this.metadataTags.description ??= data;
                  }
                }
                ;
                break;
              case "\xA9ART":
              case "com.apple.quicktime.artist":
              case "artist":
                {
                  if (typeof data === "string") {
                    this.metadataTags.artist ??= data;
                  }
                }
                ;
                break;
              case "\xA9alb":
              case "albm":
              case "com.apple.quicktime.album":
              case "album":
                {
                  if (typeof data === "string") {
                    this.metadataTags.album ??= data;
                  }
                }
                ;
                break;
              case "aART":
              case "album_artist":
                {
                  if (typeof data === "string") {
                    this.metadataTags.albumArtist ??= data;
                  }
                }
                ;
                break;
              case "\xA9cmt":
              case "com.apple.quicktime.comment":
              case "comment":
                {
                  if (typeof data === "string") {
                    this.metadataTags.comment ??= data;
                  }
                }
                ;
                break;
              case "\xA9gen":
              case "gnre":
              case "com.apple.quicktime.genre":
              case "genre":
                {
                  if (typeof data === "string") {
                    this.metadataTags.genre ??= data;
                  }
                }
                ;
                break;
              case "\xA9lyr":
              case "lyrics":
                {
                  if (typeof data === "string") {
                    this.metadataTags.lyrics ??= data;
                  }
                }
                ;
                break;
              case "\xA9day":
              case "rldt":
              case "com.apple.quicktime.creationdate":
              case "date":
                {
                  if (typeof data === "string") {
                    const date = parseIsoSuffix(data);
                    if (date) {
                      this.metadataTags.date ??= date;
                    }
                  }
                }
                ;
                break;
              case "tmpo":
                {
                  if (data instanceof Uint8Array && data.length >= 2) {
                    const bpm = toDataView(data).getInt16(0, false);
                    if (bpm > 0) {
                      this.metadataTags.beatsPerMinute ??= bpm;
                    }
                  }
                }
                ;
                break;
              case "covr":
              case "com.apple.quicktime.artwork":
                {
                  if (data instanceof RichImageData) {
                    this.metadataTags.images ??= [];
                    this.metadataTags.images.push({
                      data: data.data,
                      kind: "coverFront",
                      mimeType: data.mimeType
                    });
                  } else if (data instanceof Uint8Array) {
                    this.metadataTags.images ??= [];
                    this.metadataTags.images.push({
                      data,
                      kind: "coverFront",
                      mimeType: "image/*"
                    });
                  }
                }
                ;
                break;
              case "track":
                {
                  if (typeof data === "string") {
                    const parts = data.split("/");
                    const trackNum = Number.parseInt(parts[0], 10);
                    const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
                    if (Number.isInteger(trackNum) && trackNum > 0) {
                      this.metadataTags.trackNumber ??= trackNum;
                    }
                    if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
                      this.metadataTags.tracksTotal ??= tracksTotal;
                    }
                  }
                }
                ;
                break;
              case "trkn":
                {
                  if (data instanceof Uint8Array && data.length >= 6) {
                    const view = toDataView(data);
                    const trackNumber = view.getUint16(2, false);
                    const tracksTotal = view.getUint16(4, false);
                    if (trackNumber > 0) {
                      this.metadataTags.trackNumber ??= trackNumber;
                    }
                    if (tracksTotal > 0) {
                      this.metadataTags.tracksTotal ??= tracksTotal;
                    }
                  }
                }
                ;
                break;
              case "disc":
              case "disk":
                {
                  if (data instanceof Uint8Array && data.length >= 6) {
                    const view = toDataView(data);
                    const discNumber = view.getUint16(2, false);
                    const discNumberMax = view.getUint16(4, false);
                    if (discNumber > 0) {
                      this.metadataTags.discNumber ??= discNumber;
                    }
                    if (discNumberMax > 0) {
                      this.metadataTags.discsTotal ??= discNumberMax;
                    }
                  }
                }
                ;
                break;
            }
          }
        }
        ;
        break;
    }
    slice.filePos = boxEndPos;
    return true;
  }
};
var IsobmffTrackBacking = class {
  constructor(internalTrack) {
    this.internalTrack = internalTrack;
    this.packetToSampleIndex = /* @__PURE__ */ new WeakMap();
    this.packetToFragmentLocation = /* @__PURE__ */ new WeakMap();
    this.nextEac3Frames = /* @__PURE__ */ new WeakMap();
  }
  getNumber() {
    const demuxer = this.internalTrack.demuxer;
    const trackType = this.internalTrack.trackBacking.getType();
    let number = 0;
    for (const track of demuxer.tracks) {
      if (track.trackBacking.getType() === trackType) {
        number++;
      }
      if (track === this.internalTrack) {
        break;
      }
    }
    return number;
  }
  getCodec() {
    throw new Error("Not implemented on base class.");
  }
  getInternalCodecId() {
    return this.internalTrack.internalCodecId;
  }
  getName() {
    return this.internalTrack.name;
  }
  getLanguageCode() {
    return this.internalTrack.languageCode;
  }
  getTimeResolution() {
    return this.internalTrack.timescale;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getDisposition() {
    return this.internalTrack.disposition;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return this.internalTrack.maxBitrate;
  }
  getAverageBitrate() {
    return this.internalTrack.avgBitrate;
  }
  async getDurationFromMetadata() {
    const track = this.internalTrack;
    if (track.durationInMediaTimescale <= 0) {
      return null;
    }
    if (track.demuxer.isFragmented && track.demuxer.getSampleTableForTrack(track).sampleCount > 0) {
      return null;
    }
    assert(track.trackBacking);
    const firstPacket = await track.trackBacking.getFirstPacket({ metadataOnly: true });
    return (firstPacket?.timestamp ?? 0) + track.durationInMediaTimescale / track.timescale;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  async getFirstPacket(options) {
    const regularPacket = await this.fetchPacketForSampleIndex(0, options);
    if (regularPacket || !this.internalTrack.demuxer.isFragmented) {
      return regularPacket;
    }
    return this.fetchFirstFragmentedPacket(false, options);
  }
  mapTimestampIntoTimescale(timestamp) {
    return roundIfAlmostInteger(timestamp * this.internalTrack.timescale) + this.internalTrack.editListOffset;
  }
  async getPacket(timestamp, options) {
    const timestampInTimescale = this.mapTimestampIntoTimescale(timestamp);
    const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
    const sampleIndex = getSampleIndexForTimestamp(sampleTable, timestampInTimescale);
    const regularPacket = await this.fetchPacketForSampleIndex(sampleIndex, options, timestampInTimescale);
    if (!this.internalTrack.demuxer.isFragmented) {
      return regularPacket;
    }
    const fragmentedPacket = await this.performFragmentedLookup(null, (fragment) => {
      const trackData = fragment.trackData.get(this.internalTrack.id);
      if (!trackData) {
        return { sampleIndex: -1, correctSampleFound: false };
      }
      const index = binarySearchLessOrEqual(trackData.presentationTimestamps, timestampInTimescale, (x) => x.presentationTimestamp);
      const sampleIndex2 = index !== -1 ? trackData.presentationTimestamps[index].sampleIndex : -1;
      const correctSampleFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
      return { sampleIndex: sampleIndex2, correctSampleFound };
    }, timestampInTimescale, timestampInTimescale, options);
    if (!regularPacket || !fragmentedPacket) {
      return regularPacket ?? fragmentedPacket;
    }
    return regularPacket.timestamp > fragmentedPacket.timestamp ? regularPacket : fragmentedPacket;
  }
  async getNextPacket(packet, options) {
    const nextEac3Frame = this.nextEac3Frames.get(packet);
    if (nextEac3Frame) {
      return nextEac3Frame;
    }
    const regularSampleIndex = this.packetToSampleIndex.get(packet);
    if (regularSampleIndex !== void 0) {
      const regularPacket = await this.fetchPacketForSampleIndex(regularSampleIndex + 1, options);
      if (regularPacket || !this.internalTrack.demuxer.isFragmented) {
        return regularPacket;
      }
      return this.fetchFirstFragmentedPacket(false, options);
    }
    const locationInFragment = this.packetToFragmentLocation.get(packet);
    if (locationInFragment === void 0) {
      throw new Error("Packet was not created from this track.");
    }
    return this.performFragmentedLookup(
      locationInFragment.fragment,
      (fragment) => {
        if (fragment === locationInFragment.fragment) {
          const trackData = fragment.trackData.get(this.internalTrack.id);
          if (locationInFragment.sampleIndex + 1 < trackData.samples.length) {
            return {
              sampleIndex: locationInFragment.sampleIndex + 1,
              correctSampleFound: true
            };
          }
        } else {
          const trackData = fragment.trackData.get(this.internalTrack.id);
          if (trackData) {
            return {
              sampleIndex: 0,
              correctSampleFound: true
            };
          }
        }
        return {
          sampleIndex: -1,
          correctSampleFound: false
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the lookup entries
      Infinity,
      options
    );
  }
  async getKeyPacket(timestamp, options) {
    const timestampInTimescale = this.mapTimestampIntoTimescale(timestamp);
    const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
    const sampleIndex = getKeyframeSampleIndexForTimestamp(sampleTable, timestampInTimescale);
    const regularPacket = await this.fetchPacketForSampleIndex(sampleIndex, options, timestampInTimescale);
    if (!this.internalTrack.demuxer.isFragmented) {
      return regularPacket;
    }
    const fragmentedPacket = await this.performFragmentedLookup(null, (fragment) => {
      const trackData = fragment.trackData.get(this.internalTrack.id);
      if (!trackData) {
        return { sampleIndex: -1, correctSampleFound: false };
      }
      const index = findLastIndex(trackData.presentationTimestamps, (x) => {
        const sample = trackData.samples[x.sampleIndex];
        return sample.isKeyFrame && x.presentationTimestamp <= timestampInTimescale;
      });
      const sampleIndex2 = index !== -1 ? trackData.presentationTimestamps[index].sampleIndex : -1;
      const correctSampleFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
      return { sampleIndex: sampleIndex2, correctSampleFound };
    }, timestampInTimescale, timestampInTimescale, options, true);
    if (!regularPacket || !fragmentedPacket) {
      return regularPacket ?? fragmentedPacket;
    }
    return regularPacket.timestamp > fragmentedPacket.timestamp ? regularPacket : fragmentedPacket;
  }
  async getNextKeyPacket(packet, options) {
    const nextEac3Frame = this.nextEac3Frames.get(packet);
    if (nextEac3Frame) {
      return nextEac3Frame;
    }
    const regularSampleIndex = this.packetToSampleIndex.get(packet);
    if (regularSampleIndex !== void 0) {
      const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
      const nextKeyFrameSampleIndex = getNextKeyframeIndexForSample(sampleTable, regularSampleIndex);
      const regularPacket = await this.fetchPacketForSampleIndex(nextKeyFrameSampleIndex, options);
      if (regularPacket || !this.internalTrack.demuxer.isFragmented) {
        return regularPacket;
      }
      return this.fetchFirstFragmentedPacket(true, options);
    }
    const locationInFragment = this.packetToFragmentLocation.get(packet);
    if (locationInFragment === void 0) {
      throw new Error("Packet was not created from this track.");
    }
    return this.performFragmentedLookup(
      locationInFragment.fragment,
      (fragment) => {
        if (fragment === locationInFragment.fragment) {
          const trackData = fragment.trackData.get(this.internalTrack.id);
          for (let i = locationInFragment.sampleIndex + 1; i < trackData.samples.length; i++) {
            if (trackData.samples[i].isKeyFrame) {
              return {
                sampleIndex: i,
                correctSampleFound: true
              };
            }
          }
        } else {
          const trackData = fragment.trackData.get(this.internalTrack.id);
          if (trackData && trackData.firstKeyFrameTimestamp !== null) {
            const keyFrameIndex = trackData.samples.findIndex((x) => x.isKeyFrame);
            assert(keyFrameIndex !== -1);
            return {
              sampleIndex: keyFrameIndex,
              correctSampleFound: true
            };
          }
        }
        return {
          sampleIndex: -1,
          correctSampleFound: false
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the lookup entries
      Infinity,
      options
    );
  }
  fetchFirstFragmentedPacket(keyPacketsOnly, options) {
    return this.performFragmentedLookup(
      null,
      (fragment) => {
        const trackData = fragment.trackData.get(this.internalTrack.id);
        const sampleIndex = trackData?.samples.findIndex((x) => !keyPacketsOnly || x.isKeyFrame) ?? -1;
        return {
          sampleIndex,
          correctSampleFound: sampleIndex !== -1
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the lookup entries
      Infinity,
      options
    );
  }
  async fetchPacketForSampleIndex(sampleIndex, options, searchTimestamp = -Infinity) {
    if (sampleIndex === -1) {
      return null;
    }
    const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
    const sampleInfo = getSampleInfo(sampleTable, sampleIndex);
    if (!sampleInfo) {
      return null;
    }
    let data;
    if (options.metadataOnly && this.internalTrack.info?.codec !== "eac3") {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.internalTrack.demuxer.reader.requestSlice(sampleInfo.sampleOffset, sampleInfo.sampleSize);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        return null;
      }
      data = readBytes(slice, sampleInfo.sampleSize);
      if (this.internalTrack.encryptionInfo) {
        let sampleEncryption = null;
        if (this.internalTrack.encryptionAuxInfo) {
          const entries = await resolveEncryptionAuxInfo(this.internalTrack.demuxer.reader, this.internalTrack.encryptionInfo, this.internalTrack.encryptionAuxInfo);
          if (sampleIndex < entries.length) {
            sampleEncryption = entries[sampleIndex];
          }
        }
        sampleEncryption ??= getDefaultSampleEncryption(this.internalTrack.encryptionInfo);
        if (sampleEncryption) {
          data = await decryptSample(this.internalTrack, sampleEncryption, data, null);
        }
      }
    }
    const timestamp = (sampleInfo.presentationTimestamp - this.internalTrack.editListOffset) / this.internalTrack.timescale;
    const duration = sampleInfo.duration / this.internalTrack.timescale;
    const packet = new EncodedPacket(data, sampleInfo.isKeyFrame ? "key" : "delta", timestamp, duration, sampleIndex, sampleInfo.sampleSize);
    if (this.internalTrack.info?.codec === "eac3") {
      return this.splitEac3Sample(packet, options, searchTimestamp, this.packetToSampleIndex, sampleIndex);
    }
    this.packetToSampleIndex.set(packet, sampleIndex);
    return packet;
  }
  async fetchPacketInFragment(fragment, sampleIndex, options, searchTimestamp) {
    if (sampleIndex === -1) {
      return null;
    }
    const trackData = fragment.trackData.get(this.internalTrack.id);
    const fragmentSample = trackData.samples[sampleIndex];
    assert(fragmentSample);
    let data;
    if (options.metadataOnly && this.internalTrack.info?.codec !== "eac3") {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.internalTrack.demuxer.reader.requestSlice(fragmentSample.byteOffset, fragmentSample.byteSize);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        return null;
      }
      data = readBytes(slice, fragmentSample.byteSize);
      if (this.internalTrack.encryptionInfo) {
        const sampleEncryption = fragmentSample.encryption ?? getDefaultSampleEncryption(this.internalTrack.encryptionInfo);
        if (sampleEncryption) {
          data = await decryptSample(this.internalTrack, sampleEncryption, data, fragment);
        }
      }
    }
    const timestamp = (fragmentSample.presentationTimestamp - this.internalTrack.editListOffset) / this.internalTrack.timescale;
    const duration = fragmentSample.duration / this.internalTrack.timescale;
    const packet = new EncodedPacket(data, fragmentSample.isKeyFrame ? "key" : "delta", timestamp, duration, fragment.moofOffset + sampleIndex, fragmentSample.byteSize);
    if (this.internalTrack.info?.codec === "eac3") {
      return this.splitEac3Sample(packet, options, searchTimestamp, this.packetToFragmentLocation, {
        fragment,
        sampleIndex
      });
    }
    this.packetToFragmentLocation.set(packet, { fragment, sampleIndex });
    return packet;
  }
  /** Looks for a packet in the fragments while trying to load as few fragments as possible to retrieve it. */
  async performFragmentedLookup(startFragment, getMatchInFragment, searchTimestamp, latestTimestamp, options, requireKeyFrame = false) {
    const { demuxer, fragmentLookupTable, fragmentPositionCache } = this.internalTrack;
    let bestFragment = null;
    let bestSampleIndex = -1;
    if (startFragment) {
      const { sampleIndex, correctSampleFound } = getMatchInFragment(startFragment);
      if (correctSampleFound) {
        return this.fetchPacketInFragment(startFragment, sampleIndex, options, searchTimestamp);
      }
      if (sampleIndex !== -1) {
        bestFragment = startFragment;
        bestSampleIndex = sampleIndex;
      }
    }
    let lookupEntryIndex = binarySearchLessOrEqual(fragmentLookupTable, searchTimestamp, (x) => x.timestamp);
    let positionCacheIndex = binarySearchLessOrEqual(fragmentPositionCache, searchTimestamp, (x) => x.startTimestamp);
    let stopPos = Infinity;
    while (true) {
      while (lookupEntryIndex !== -1 && fragmentLookupTable[lookupEntryIndex].moofOffset >= stopPos) {
        lookupEntryIndex--;
      }
      while (positionCacheIndex !== -1 && (fragmentPositionCache[positionCacheIndex].moofOffset >= stopPos || requireKeyFrame && !fragmentPositionCache[positionCacheIndex].hasKeyFrame)) {
        positionCacheIndex--;
      }
      const lookupEntryPosition = Math.max(fragmentLookupTable[lookupEntryIndex]?.moofOffset ?? 0, fragmentPositionCache[positionCacheIndex]?.moofOffset ?? 0) || null;
      let currentPos;
      let currentFragment = null;
      if (!startFragment) {
        currentPos = lookupEntryPosition ?? 0;
      } else {
        if (lookupEntryPosition === null || startFragment.moofOffset >= lookupEntryPosition) {
          currentPos = startFragment.moofOffset + startFragment.moofSize;
          currentFragment = startFragment;
        } else {
          currentPos = lookupEntryPosition;
        }
      }
      const scanStartPos = currentFragment ? currentFragment.moofOffset : currentPos;
      while (currentPos < stopPos) {
        if (currentFragment) {
          const trackData = currentFragment.trackData.get(this.internalTrack.id);
          if (trackData && trackData.startTimestamp > latestTimestamp) {
            break;
          }
          currentFragment = null;
        }
        const summary = demuxer.fragmentSummaries.get(currentPos);
        if (summary && !summary.trackIds.has(this.internalTrack.id)) {
          currentPos += summary.moofSize;
          continue;
        }
        let slice = demuxer.reader.requestSliceRange(currentPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const boxStartPos = currentPos;
        const boxInfo = readBoxHeader(slice);
        if (!boxInfo) {
          break;
        }
        if (boxInfo.name === "moof") {
          currentFragment = await demuxer.readFragment(boxStartPos);
          if (!currentFragment) {
            break;
          }
          const { sampleIndex, correctSampleFound } = getMatchInFragment(currentFragment);
          if (correctSampleFound) {
            return this.fetchPacketInFragment(currentFragment, sampleIndex, options, searchTimestamp);
          }
          if (sampleIndex !== -1) {
            bestFragment = currentFragment;
            bestSampleIndex = sampleIndex;
          }
        }
        currentPos = boxStartPos + boxInfo.totalSize;
      }
      if (lookupEntryPosition === null || bestFragment && bestFragment.moofOffset >= lookupEntryPosition) {
        break;
      }
      stopPos = scanStartPos;
      startFragment = null;
    }
    if (bestFragment) {
      return this.fetchPacketInFragment(bestFragment, bestSampleIndex, options, searchTimestamp);
    }
    return null;
  }
  splitEac3Sample(samplePacket, options, searchTimestamp, locations, location) {
    const info = this.internalTrack.info;
    assert(info?.type === "audio");
    const frames = splitEac3AudioFrames(samplePacket.data) ?? [{
      offset: 0,
      size: samplePacket.data.byteLength,
      blockCount: 6
    }];
    const searchTimestampInSeconds = (searchTimestamp - this.internalTrack.editListOffset) / this.internalTrack.timescale;
    let match = null;
    let previousPacket = null;
    let blocksBefore = 0;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const timestamp = samplePacket.timestamp + 256 * blocksBefore / info.sampleRate;
      const duration = frames.length === 1 ? samplePacket.duration : 256 * frame.blockCount / info.sampleRate;
      const packet = new EncodedPacket(options.metadataOnly ? PLACEHOLDER_DATA : samplePacket.data.subarray(frame.offset, frame.offset + frame.size), "key", timestamp, duration, 8 * samplePacket.sequenceNumber + i, frame.size);
      locations.set(packet, location);
      if (previousPacket) {
        this.nextEac3Frames.set(previousPacket, packet);
      }
      if (i === 0 || timestamp <= searchTimestampInSeconds) {
        match = packet;
      }
      previousPacket = packet;
      blocksBefore += frame.blockCount;
    }
    assert(match);
    return match;
  }
};
var IsobmffVideoTrackBacking = class extends IsobmffTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
    this.decoderConfigPromise = null;
  }
  getType() {
    return "video";
  }
  getCodec() {
    return this.internalTrack.info.codec;
  }
  getCodedWidth() {
    return this.internalTrack.info.width;
  }
  getCodedHeight() {
    return this.internalTrack.info.height;
  }
  getSquarePixelWidth() {
    return this.internalTrack.info.squarePixelWidth;
  }
  getSquarePixelHeight() {
    return this.internalTrack.info.squarePixelHeight;
  }
  getTransformationMatrix() {
    return [...this.internalTrack.matrix];
  }
  async getColorSpace() {
    const decoderConfig = await this.getDecoderConfig();
    if (!decoderConfig) {
      return this.internalTrack.info.colorSpace;
    }
    return {
      primaries: decoderConfig.colorSpace?.primaries,
      transfer: decoderConfig.colorSpace?.transfer,
      matrix: decoderConfig.colorSpace?.matrix,
      fullRange: decoderConfig.colorSpace?.fullRange
    };
  }
  async canBeTransparent() {
    return this.internalTrack.info.codec === "prores" && (this.internalTrack.info.proresFormat === "ap4h" || this.internalTrack.info.proresFormat === "ap4x");
  }
  async getDecoderConfig() {
    if (!this.internalTrack.info.codec) {
      return null;
    }
    return this.decoderConfigPromise ??= (async () => {
      if (this.internalTrack.info.codec === "avc" && !this.internalTrack.info.codecDescription) {
        const firstPacket = await this.getFirstPacket({});
        this.internalTrack.info.avcCodecInfo = firstPacket && extractAvcDecoderConfigurationRecord(firstPacket.data);
      } else if (this.internalTrack.info.codec === "hevc" && !this.internalTrack.info.codecDescription) {
        const firstPacket = await this.getFirstPacket({});
        this.internalTrack.info.hevcCodecInfo = firstPacket && extractHevcDecoderConfigurationRecord(firstPacket.data);
      } else if (this.internalTrack.info.codec === "vp9" && (!this.internalTrack.info.vp9CodecInfo || !vp9CodecInfoHasColorInfo(this.internalTrack.info.vp9CodecInfo))) {
        const firstPacket = await this.getFirstPacket({});
        const packetInfo = firstPacket && extractVp9CodecInfoFromPacket(firstPacket.data);
        if (packetInfo) {
          this.internalTrack.info.vp9CodecInfo = {
            ...this.internalTrack.info.vp9CodecInfo ?? packetInfo,
            videoFullRangeFlag: packetInfo.videoFullRangeFlag,
            colourPrimaries: packetInfo.colourPrimaries,
            transferCharacteristics: packetInfo.transferCharacteristics,
            matrixCoefficients: packetInfo.matrixCoefficients
          };
        }
      } else if (this.internalTrack.info.codec === "av1" && (!this.internalTrack.info.av1CodecInfo || !av1CodecInfoHasColorInfo(this.internalTrack.info.av1CodecInfo))) {
        const firstPacket = await this.getFirstPacket({});
        const packetInfo = firstPacket && extractAv1CodecInfoFromPacket(firstPacket.data);
        if (packetInfo) {
          this.internalTrack.info.av1CodecInfo = packetInfo;
        }
      } else if (this.internalTrack.info.codec === "prores" && !this.internalTrack.info.proresCodecInfo) {
        const firstPacket = await this.getFirstPacket({});
        this.internalTrack.info.proresCodecInfo = firstPacket && extractProresCodecInfoFromPacket(firstPacket.data);
      }
      if (!colorSpaceIsComplete(this.internalTrack.info.colorSpace)) {
        const colorSpace = extractColorSpace(this.internalTrack.info);
        this.internalTrack.info.colorSpace.primaries ??= colorSpace.primaries;
        this.internalTrack.info.colorSpace.transfer ??= colorSpace.transfer;
        this.internalTrack.info.colorSpace.matrix ??= colorSpace.matrix;
        this.internalTrack.info.colorSpace.fullRange ??= colorSpace.fullRange;
      }
      const config = {
        codec: extractVideoCodecString(this.internalTrack.info),
        codedWidth: this.internalTrack.info.width,
        codedHeight: this.internalTrack.info.height,
        description: this.internalTrack.info.codecDescription ?? void 0,
        colorSpace: this.internalTrack.info.colorSpace
      };
      if (this.internalTrack.info.width !== this.internalTrack.info.squarePixelWidth || this.internalTrack.info.height !== this.internalTrack.info.squarePixelHeight) {
        config.displayAspectWidth = this.internalTrack.info.squarePixelWidth;
        config.displayAspectHeight = this.internalTrack.info.squarePixelHeight;
      }
      return config;
    })();
  }
};
var IsobmffAudioTrackBacking = class extends IsobmffTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
    this.decoderConfigPromise = null;
  }
  getType() {
    return "audio";
  }
  getCodec() {
    return this.internalTrack.info.codec;
  }
  getNumberOfChannels() {
    return this.internalTrack.info.numberOfChannels;
  }
  getSampleRate() {
    return this.internalTrack.info.sampleRate;
  }
  async getDecoderConfig() {
    if (!this.internalTrack.info.codec) {
      return null;
    }
    return this.decoderConfigPromise ??= (async () => {
      if (this.internalTrack.info.codec === "dts" && !this.internalTrack.info.dtsFormat) {
        const firstPacket = await this.getFirstPacket({});
        this.internalTrack.info.dtsFormat = firstPacket && extractDtsFourCcFromPacket(firstPacket.data);
      }
      return {
        codec: extractAudioCodecString(this.internalTrack.info),
        numberOfChannels: this.internalTrack.info.numberOfChannels,
        sampleRate: this.internalTrack.info.sampleRate,
        description: this.internalTrack.info.codecDescription ?? void 0
      };
    })();
  }
};
var getSampleIndexForTimestamp = (sampleTable, timescaleUnits) => {
  if (sampleTable.sortedCompositionTimeOffsets) {
    return performPresentationTimeLookup(sampleTable, timescaleUnits, false);
  } else {
    const index = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, timescaleUnits, (x) => x.startDecodeTimestamp);
    if (index === -1) {
      return -1;
    }
    const entry = sampleTable.sampleTimingEntries[index];
    if (entry.delta === 0) {
      return entry.startIndex + entry.count - 1;
    }
    return entry.startIndex + Math.min(Math.floor((timescaleUnits - entry.startDecodeTimestamp) / entry.delta), entry.count - 1);
  }
};
var getKeyframeSampleIndexForTimestamp = (sampleTable, timescaleUnits) => {
  if (!sampleTable.keySampleIndices) {
    return getSampleIndexForTimestamp(sampleTable, timescaleUnits);
  }
  if (sampleTable.sortedCompositionTimeOffsets) {
    return performPresentationTimeLookup(sampleTable, timescaleUnits, true);
  } else {
    const sampleIndex = getSampleIndexForTimestamp(sampleTable, timescaleUnits);
    const index = binarySearchLessOrEqual(sampleTable.keySampleIndices, sampleIndex, (x) => x);
    return sampleTable.keySampleIndices[index] ?? -1;
  }
};
var getSampleInfo = (sampleTable, sampleIndex) => {
  if (sampleIndex >= sampleTable.sampleCount) {
    return null;
  }
  const timingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, sampleIndex, (x) => x.startIndex);
  const timingEntry = sampleTable.sampleTimingEntries[timingEntryIndex];
  const decodeTimestamp = timingEntry.startDecodeTimestamp + (sampleIndex - timingEntry.startIndex) * timingEntry.delta;
  let presentationTimestamp = decodeTimestamp;
  const offsetEntryIndex = binarySearchLessOrEqual(sampleTable.sampleCompositionTimeOffsets, sampleIndex, (x) => x.startIndex);
  const offsetEntry = sampleTable.sampleCompositionTimeOffsets[offsetEntryIndex];
  if (offsetEntry && sampleIndex - offsetEntry.startIndex < offsetEntry.count) {
    presentationTimestamp += offsetEntry.offset;
  }
  const sampleSize = sampleTable.sampleSizes[Math.min(sampleIndex, sampleTable.sampleSizes.length - 1)];
  const chunkEntryIndex = binarySearchLessOrEqual(sampleTable.sampleToChunk, sampleIndex, (x) => x.startSampleIndex);
  const chunkEntry = sampleTable.sampleToChunk[chunkEntryIndex];
  const chunkIndex = chunkEntry.startChunkIndex + Math.floor((sampleIndex - chunkEntry.startSampleIndex) / chunkEntry.samplesPerChunk);
  const chunkOffset = sampleTable.chunkOffsets[chunkIndex];
  const startSampleIndexOfChunk = chunkEntry.startSampleIndex + (chunkIndex - chunkEntry.startChunkIndex) * chunkEntry.samplesPerChunk;
  let sampleOffset = chunkOffset;
  if (sampleTable.sampleSizes.length === 1) {
    sampleOffset += sampleSize * (sampleIndex - startSampleIndexOfChunk);
  } else {
    sampleOffset += sampleTable.cumulativeSampleSizes[sampleIndex] - sampleTable.cumulativeSampleSizes[startSampleIndexOfChunk];
  }
  let duration = timingEntry.delta;
  if (sampleTable.sortedCompositionTimeOffsets) {
    const nextPresentationTimestamp = getNextPresentationTimestamp(sampleTable, sampleIndex, presentationTimestamp);
    if (nextPresentationTimestamp !== null) {
      duration = nextPresentationTimestamp - presentationTimestamp;
    }
  }
  return {
    presentationTimestamp,
    duration,
    sampleOffset,
    sampleSize,
    chunkOffset,
    isKeyFrame: sampleTable.keySampleIndices ? binarySearchExact(sampleTable.keySampleIndices, sampleIndex, (x) => x) !== -1 : true
  };
};
var performPresentationTimeLookup = (sampleTable, timestamp, keyFramesOnly) => {
  const entries = sampleTable.sortedCompositionTimeOffsets;
  let bestSampleIndex = -1;
  let bestTimestamp = -Infinity;
  const startIndex = binarySearchLessOrEqual(entries, timestamp, (x) => x.startTimestamp);
  for (let i = startIndex; i >= 0; i--) {
    const entry = entries[i];
    if (entry.maxLastTimestamp < bestTimestamp) {
      break;
    }
    let sampleIndex = entry.lastTimestamp <= timestamp ? entry.startIndex + entry.count - 1 : findFirstSampleInEntry(sampleTable, entry, (_, otherTimestamp) => otherTimestamp > timestamp) - 1;
    if (keyFramesOnly) {
      const keySampleIndex = binarySearchLessOrEqual(sampleTable.keySampleIndices, sampleIndex, (x) => x);
      sampleIndex = sampleTable.keySampleIndices[keySampleIndex] ?? -1;
    }
    if (sampleIndex < entry.startIndex) {
      continue;
    }
    const presentationTimestamp = getDecodeTimestamp(sampleTable, sampleIndex) + entry.offset;
    if (presentationTimestamp > bestTimestamp || presentationTimestamp === bestTimestamp && sampleIndex > bestSampleIndex) {
      bestSampleIndex = sampleIndex;
      bestTimestamp = presentationTimestamp;
    }
  }
  return bestSampleIndex;
};
var getNextPresentationTimestamp = (sampleTable, sampleIndex, presentationTimestamp) => {
  const entries = sampleTable.sortedCompositionTimeOffsets;
  const lastStartedEntryIndex = binarySearchLessOrEqual(entries, presentationTimestamp, (x) => x.startTimestamp);
  let nextTimestamp = entries[lastStartedEntryIndex + 1]?.startTimestamp ?? null;
  for (let i = lastStartedEntryIndex; i >= 0; i--) {
    const entry = entries[i];
    if (entry.maxLastTimestamp < presentationTimestamp) {
      break;
    }
    const nextSampleIndex = findFirstSampleInEntry(sampleTable, entry, (otherSampleIndex, otherTimestamp) => otherTimestamp > presentationTimestamp || otherTimestamp === presentationTimestamp && otherSampleIndex > sampleIndex);
    if (nextSampleIndex === entry.startIndex + entry.count) {
      continue;
    }
    const timestamp = getDecodeTimestamp(sampleTable, nextSampleIndex) + entry.offset;
    if (nextTimestamp === null || timestamp < nextTimestamp) {
      nextTimestamp = timestamp;
    }
  }
  return nextTimestamp;
};
var findFirstSampleInEntry = (sampleTable, entry, predicate) => {
  let low = entry.startIndex;
  let high = entry.startIndex + entry.count;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (predicate(mid, getDecodeTimestamp(sampleTable, mid) + entry.offset)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};
var getDecodeTimestamp = (sampleTable, sampleIndex) => {
  const timingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, sampleIndex, (x) => x.startIndex);
  const timingEntry = sampleTable.sampleTimingEntries[timingEntryIndex];
  return timingEntry.startDecodeTimestamp + (sampleIndex - timingEntry.startIndex) * timingEntry.delta;
};
var getNextKeyframeIndexForSample = (sampleTable, sampleIndex) => {
  if (!sampleTable.keySampleIndices) {
    return sampleIndex + 1;
  }
  const index = binarySearchLessOrEqual(sampleTable.keySampleIndices, sampleIndex, (x) => x);
  return sampleTable.keySampleIndices[index + 1] ?? -1;
};
var offsetFragmentTrackDataByTimestamp = (trackData, timestamp) => {
  trackData.startTimestamp += timestamp;
  trackData.endTimestamp += timestamp;
  trackData.endDecodeTimestamp += timestamp;
  for (const sample of trackData.samples) {
    sample.presentationTimestamp += timestamp;
  }
  for (const entry of trackData.presentationTimestamps) {
    entry.presentationTimestamp += timestamp;
  }
};
var readMatrix = (slice) => {
  return [
    readFixed_16_16(slice),
    readFixed_16_16(slice),
    readFixed_2_30(slice),
    readFixed_16_16(slice),
    readFixed_16_16(slice),
    readFixed_2_30(slice),
    readFixed_16_16(slice),
    readFixed_16_16(slice),
    readFixed_2_30(slice)
  ];
};
var applySpsPixelAspectRatio = (track, pixelAspectRatio) => {
  const info = track.info;
  if (info.type !== "video") {
    return;
  }
  const { num, den } = pixelAspectRatio;
  if (!(num > 0 && den > 0) || num === den) {
    return;
  }
  if (num > den) {
    info.squarePixelWidth = Math.round(info.width * num / den);
    info.squarePixelHeight = info.height;
  } else {
    info.squarePixelWidth = info.width;
    info.squarePixelHeight = Math.round(info.height * den / num);
  }
};
var capEntryCounts = (entries, sampleCount) => {
  while (entries.length > 0 && last(entries).startIndex >= sampleCount) {
    entries.pop();
  }
  const lastEntry = last(entries);
  if (lastEntry) {
    lastEntry.count = Math.min(lastEntry.count, sampleCount - lastEntry.startIndex);
  }
};
var getOrCreateEncryptionAuxInfo = (track, fragmentTrackState) => {
  if (fragmentTrackState) {
    return fragmentTrackState.encryptionAuxInfo ??= {
      defaultSampleInfoSize: 0,
      sampleSizes: null,
      sampleCount: 0,
      offset: null,
      resolved: null
    };
  } else {
    return track.encryptionAuxInfo ??= {
      defaultSampleInfoSize: 0,
      sampleSizes: null,
      sampleCount: 0,
      offset: null,
      resolved: null
    };
  }
};
var resolveEncryptionAuxInfo = async (reader, encryptionInfo, aux) => {
  if (aux.resolved) {
    return aux.resolved;
  }
  if (aux.offset === null || aux.sampleCount === 0) {
    throw new Error("Incomplete saiz/saio info; cannot resolve encryption data.");
  }
  let totalSize = 0;
  if (aux.defaultSampleInfoSize > 0) {
    totalSize = aux.defaultSampleInfoSize * aux.sampleCount;
  } else {
    assert(aux.sampleSizes);
    for (let i = 0; i < aux.sampleCount; i++) {
      totalSize += aux.sampleSizes[i];
    }
  }
  let slice = reader.requestSlice(aux.offset, totalSize);
  if (isThenable(slice))
    slice = await slice;
  if (!slice) {
    throw new Error("Failed to read auxiliary encryption info.");
  }
  const ivSize = encryptionInfo.defaultPerSampleIvSize;
  if (ivSize === null) {
    throw new Error("Invalid file: encrypted track is missing its tenc box.");
  }
  const entries = [];
  for (let i = 0; i < aux.sampleCount; i++) {
    const entrySize = aux.defaultSampleInfoSize > 0 ? aux.defaultSampleInfoSize : aux.sampleSizes[i];
    const iv = new Uint8Array(16);
    if (ivSize > 0) {
      iv.set(readBytes(slice, ivSize), 0);
    } else if (encryptionInfo.defaultConstantIv) {
      iv.set(encryptionInfo.defaultConstantIv, 0);
    } else {
      throw new Error("Invalid file: encrypted sample has no IV.");
    }
    let subsamples = null;
    if (entrySize > ivSize) {
      const subsampleCount = readU16Be(slice);
      subsamples = [];
      for (let j = 0; j < subsampleCount; j++) {
        const clearLen = readU16Be(slice);
        const protectedLen = readU32Be(slice);
        subsamples.push({ clearLen, protectedLen });
      }
    }
    entries.push({ iv, subsamples });
  }
  aux.resolved = entries;
  return entries;
};
var getDefaultSampleEncryption = (encryptionInfo) => {
  if (!encryptionInfo.defaultConstantIv) {
    return null;
  }
  return {
    iv: encryptionInfo.defaultConstantIv,
    subsamples: null
  };
};
var decryptSample = async (track, sampleEncryption, data, fragment) => {
  assert(track.encryptionInfo);
  const encryptionInfo = track.encryptionInfo;
  if (encryptionInfo.defaultKid === null) {
    throw new Error("Invalid file: encrypted track is missing its tenc box.");
  }
  const keyId = encryptionInfo.defaultKid;
  let keyBytes;
  const cacheEntry = track.demuxer.decryptionKeyCache.get(keyId);
  if (cacheEntry) {
    keyBytes = await cacheEntry;
  } else {
    if (!track.demuxer.input._formatOptions.isobmff?.resolveKeyId) {
      throw new Error("Encrypted media samples encountered. To decrypt them, please provide a callback for InputOptions.formatOptions.isobmff.resolveKeyId.");
    }
    const promise = (async () => {
      let psshBoxes = track.demuxer.psshBoxes;
      if (fragment) {
        psshBoxes = [
          ...psshBoxes,
          ...fragment.psshBoxes
        ].filter((x) => x.keyIds === null || x.keyIds.includes(keyId));
        for (let i = 0; i < psshBoxes.length - 1; i++) {
          for (let j = i + 1; j < psshBoxes.length; j++) {
            if (psshBoxesAreEqual(psshBoxes[i], psshBoxes[j])) {
              psshBoxes.splice(j, 1);
              j--;
            }
          }
        }
      }
      const keyResult = await track.demuxer.input._formatOptions.isobmff.resolveKeyId({ keyId, psshBoxes });
      if (!(typeof keyResult === "string" && keyResult.length === 32 && HEX_STRING_REGEX.test(keyResult) || keyResult instanceof Uint8Array && keyResult.byteLength === 16)) {
        throw new TypeError("resolveKeyId must return a 32-character hex string or a 16-byte Uint8Array containing the decryption key.");
      }
      return keyResult instanceof Uint8Array ? keyResult : hexStringToBytes(keyResult);
    })();
    track.demuxer.decryptionKeyCache.set(keyId, promise);
    keyBytes = await promise;
  }
  if (encryptionInfo.scheme === "cenc" || encryptionInfo.scheme === "cens") {
    return decryptCtr(keyBytes, encryptionInfo, sampleEncryption, data);
  } else {
    return decryptCbcs(keyBytes, encryptionInfo, sampleEncryption, data);
  }
};
var decryptCtr = async (key, encryptionInfo, sampleEncryption, data) => {
  const counter = new Uint8Array(16);
  counter.set(sampleEncryption.iv, 0);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["decrypt"]);
  const cryptApply = async (input2) => {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-CTR", counter, length: 64 }, cryptoKey, input2);
    return new Uint8Array(plaintext);
  };
  if (!sampleEncryption.subsamples) {
    return cryptApply(data);
  }
  assert(encryptionInfo.defaultCryptByteBlock !== null && encryptionInfo.defaultSkipByteBlock !== null);
  const cryptRanges = collectCryptRanges(sampleEncryption.subsamples, encryptionInfo.defaultCryptByteBlock, encryptionInfo.defaultSkipByteBlock, data.length);
  let totalCryptLen = 0;
  for (const range of cryptRanges) {
    for (const seg of range.perSubsample) {
      totalCryptLen += seg.length;
    }
  }
  const cryptBuffer = new Uint8Array(totalCryptLen);
  let writePos = 0;
  for (const range of cryptRanges) {
    for (const seg of range.perSubsample) {
      cryptBuffer.set(data.subarray(seg.offset, seg.offset + seg.length), writePos);
      writePos += seg.length;
    }
  }
  const plain = await cryptApply(cryptBuffer);
  const output = new Uint8Array(data);
  let readPos = 0;
  for (const range of cryptRanges) {
    for (const seg of range.perSubsample) {
      output.set(plain.subarray(readPos, readPos + seg.length), seg.offset);
      readPos += seg.length;
    }
  }
  return output;
};
var decryptCbcs = (key, encryptionInfo, sampleEncryption, data) => {
  const ctx2 = new Aes128CbcContext();
  ctx2.init({ key, iv: sampleEncryption.iv });
  const cryptByteBlock = encryptionInfo.defaultCryptByteBlock;
  const skipByteBlock = encryptionInfo.defaultSkipByteBlock;
  assert(cryptByteBlock !== null && skipByteBlock !== null);
  if (!sampleEncryption.subsamples) {
    const output2 = new Uint8Array(data);
    const numBlocks = Math.floor(data.length / 16);
    for (let b = 0; b < numBlocks; b++) {
      const off = b * 16;
      ctx2.in.set(data.subarray(off, off + 16));
      ctx2.decrypt();
      output2.set(ctx2.out, off);
    }
    return output2;
  }
  if (cryptByteBlock === 0 && skipByteBlock === 0) {
    throw new Error("cbcs with subsamples requires pattern encryption.");
  }
  const output = new Uint8Array(data);
  const cryptRanges = collectCryptRanges(sampleEncryption.subsamples, cryptByteBlock, skipByteBlock, data.length);
  const ivView = new DataView(sampleEncryption.iv.buffer, sampleEncryption.iv.byteOffset, 16);
  for (const range of cryptRanges) {
    ctx2.iv[0] = ivView.getUint32(0, false);
    ctx2.iv[1] = ivView.getUint32(4, false);
    ctx2.iv[2] = ivView.getUint32(8, false);
    ctx2.iv[3] = ivView.getUint32(12, false);
    for (const seg of range.perSubsample) {
      const numBlocks = seg.length / 16;
      for (let b = 0; b < numBlocks; b++) {
        const offset = seg.offset + b * 16;
        ctx2.in.set(data.subarray(offset, offset + 16));
        ctx2.decrypt();
        output.set(ctx2.out, offset);
      }
    }
  }
  return output;
};
var collectCryptRanges = (subsamples, cryptByteBlock, skipByteBlock, dataLength) => {
  const ranges = [];
  const hasPattern = cryptByteBlock !== 0 || skipByteBlock !== 0;
  let cursor = 0;
  for (const subsample of subsamples) {
    if (cursor + subsample.clearLen + subsample.protectedLen > dataLength) {
      throw new Error("Invalid encryption info: subsamples exceed the sample size.");
    }
    cursor += subsample.clearLen;
    const perSubsample = [];
    if (!hasPattern) {
      if (subsample.protectedLen > 0) {
        perSubsample.push({ offset: cursor, length: subsample.protectedLen });
      }
      cursor += subsample.protectedLen;
    } else {
      let remaining = subsample.protectedLen;
      let pos = cursor;
      while (remaining > 0) {
        if (remaining < 16 * cryptByteBlock) {
          break;
        }
        const cryptBytes = 16 * cryptByteBlock;
        perSubsample.push({ offset: pos, length: cryptBytes });
        pos += cryptBytes;
        remaining -= cryptBytes;
        const skipBytes = Math.min(16 * skipByteBlock, remaining);
        pos += skipBytes;
        remaining -= skipBytes;
      }
      cursor += subsample.protectedLen;
    }
    ranges.push({ perSubsample });
  }
  return ranges;
};

// node_modules/mediabunny/dist/modules/src/matroska/ebml.js
var EBMLId;
(function(EBMLId2) {
  EBMLId2[EBMLId2["EBML"] = 440786851] = "EBML";
  EBMLId2[EBMLId2["EBMLVersion"] = 17030] = "EBMLVersion";
  EBMLId2[EBMLId2["EBMLReadVersion"] = 17143] = "EBMLReadVersion";
  EBMLId2[EBMLId2["EBMLMaxIDLength"] = 17138] = "EBMLMaxIDLength";
  EBMLId2[EBMLId2["EBMLMaxSizeLength"] = 17139] = "EBMLMaxSizeLength";
  EBMLId2[EBMLId2["DocType"] = 17026] = "DocType";
  EBMLId2[EBMLId2["DocTypeVersion"] = 17031] = "DocTypeVersion";
  EBMLId2[EBMLId2["DocTypeReadVersion"] = 17029] = "DocTypeReadVersion";
  EBMLId2[EBMLId2["Void"] = 236] = "Void";
  EBMLId2[EBMLId2["Segment"] = 408125543] = "Segment";
  EBMLId2[EBMLId2["SeekHead"] = 290298740] = "SeekHead";
  EBMLId2[EBMLId2["Seek"] = 19899] = "Seek";
  EBMLId2[EBMLId2["SeekID"] = 21419] = "SeekID";
  EBMLId2[EBMLId2["SeekPosition"] = 21420] = "SeekPosition";
  EBMLId2[EBMLId2["Duration"] = 17545] = "Duration";
  EBMLId2[EBMLId2["Info"] = 357149030] = "Info";
  EBMLId2[EBMLId2["TimestampScale"] = 2807729] = "TimestampScale";
  EBMLId2[EBMLId2["DateUTC"] = 17505] = "DateUTC";
  EBMLId2[EBMLId2["Title"] = 31657] = "Title";
  EBMLId2[EBMLId2["MuxingApp"] = 19840] = "MuxingApp";
  EBMLId2[EBMLId2["WritingApp"] = 22337] = "WritingApp";
  EBMLId2[EBMLId2["Tracks"] = 374648427] = "Tracks";
  EBMLId2[EBMLId2["TrackEntry"] = 174] = "TrackEntry";
  EBMLId2[EBMLId2["TrackNumber"] = 215] = "TrackNumber";
  EBMLId2[EBMLId2["TrackUID"] = 29637] = "TrackUID";
  EBMLId2[EBMLId2["TrackType"] = 131] = "TrackType";
  EBMLId2[EBMLId2["FlagEnabled"] = 185] = "FlagEnabled";
  EBMLId2[EBMLId2["FlagDefault"] = 136] = "FlagDefault";
  EBMLId2[EBMLId2["FlagForced"] = 21930] = "FlagForced";
  EBMLId2[EBMLId2["FlagOriginal"] = 21934] = "FlagOriginal";
  EBMLId2[EBMLId2["FlagHearingImpaired"] = 21931] = "FlagHearingImpaired";
  EBMLId2[EBMLId2["FlagVisualImpaired"] = 21932] = "FlagVisualImpaired";
  EBMLId2[EBMLId2["FlagCommentary"] = 21935] = "FlagCommentary";
  EBMLId2[EBMLId2["FlagLacing"] = 156] = "FlagLacing";
  EBMLId2[EBMLId2["MaxBlockAdditionID"] = 21998] = "MaxBlockAdditionID";
  EBMLId2[EBMLId2["Name"] = 21358] = "Name";
  EBMLId2[EBMLId2["Language"] = 2274716] = "Language";
  EBMLId2[EBMLId2["LanguageBCP47"] = 2274717] = "LanguageBCP47";
  EBMLId2[EBMLId2["CodecID"] = 134] = "CodecID";
  EBMLId2[EBMLId2["CodecPrivate"] = 25506] = "CodecPrivate";
  EBMLId2[EBMLId2["CodecDelay"] = 22186] = "CodecDelay";
  EBMLId2[EBMLId2["SeekPreRoll"] = 22203] = "SeekPreRoll";
  EBMLId2[EBMLId2["DefaultDuration"] = 2352003] = "DefaultDuration";
  EBMLId2[EBMLId2["Video"] = 224] = "Video";
  EBMLId2[EBMLId2["PixelWidth"] = 176] = "PixelWidth";
  EBMLId2[EBMLId2["PixelHeight"] = 186] = "PixelHeight";
  EBMLId2[EBMLId2["DisplayWidth"] = 21680] = "DisplayWidth";
  EBMLId2[EBMLId2["DisplayHeight"] = 21690] = "DisplayHeight";
  EBMLId2[EBMLId2["DisplayUnit"] = 21682] = "DisplayUnit";
  EBMLId2[EBMLId2["StereoMode"] = 21432] = "StereoMode";
  EBMLId2[EBMLId2["AlphaMode"] = 21440] = "AlphaMode";
  EBMLId2[EBMLId2["Audio"] = 225] = "Audio";
  EBMLId2[EBMLId2["SamplingFrequency"] = 181] = "SamplingFrequency";
  EBMLId2[EBMLId2["OutputSamplingFrequency"] = 30901] = "OutputSamplingFrequency";
  EBMLId2[EBMLId2["Channels"] = 159] = "Channels";
  EBMLId2[EBMLId2["BitDepth"] = 25188] = "BitDepth";
  EBMLId2[EBMLId2["SimpleBlock"] = 163] = "SimpleBlock";
  EBMLId2[EBMLId2["BlockGroup"] = 160] = "BlockGroup";
  EBMLId2[EBMLId2["Block"] = 161] = "Block";
  EBMLId2[EBMLId2["BlockAdditions"] = 30113] = "BlockAdditions";
  EBMLId2[EBMLId2["BlockMore"] = 166] = "BlockMore";
  EBMLId2[EBMLId2["BlockAdditional"] = 165] = "BlockAdditional";
  EBMLId2[EBMLId2["BlockAddID"] = 238] = "BlockAddID";
  EBMLId2[EBMLId2["BlockDuration"] = 155] = "BlockDuration";
  EBMLId2[EBMLId2["ReferenceBlock"] = 251] = "ReferenceBlock";
  EBMLId2[EBMLId2["Cluster"] = 524531317] = "Cluster";
  EBMLId2[EBMLId2["Timestamp"] = 231] = "Timestamp";
  EBMLId2[EBMLId2["Cues"] = 475249515] = "Cues";
  EBMLId2[EBMLId2["CuePoint"] = 187] = "CuePoint";
  EBMLId2[EBMLId2["CueTime"] = 179] = "CueTime";
  EBMLId2[EBMLId2["CueTrackPositions"] = 183] = "CueTrackPositions";
  EBMLId2[EBMLId2["CueTrack"] = 247] = "CueTrack";
  EBMLId2[EBMLId2["CueClusterPosition"] = 241] = "CueClusterPosition";
  EBMLId2[EBMLId2["CueRelativePosition"] = 240] = "CueRelativePosition";
  EBMLId2[EBMLId2["Colour"] = 21936] = "Colour";
  EBMLId2[EBMLId2["MatrixCoefficients"] = 21937] = "MatrixCoefficients";
  EBMLId2[EBMLId2["TransferCharacteristics"] = 21946] = "TransferCharacteristics";
  EBMLId2[EBMLId2["Primaries"] = 21947] = "Primaries";
  EBMLId2[EBMLId2["Range"] = 21945] = "Range";
  EBMLId2[EBMLId2["Projection"] = 30320] = "Projection";
  EBMLId2[EBMLId2["ProjectionType"] = 30321] = "ProjectionType";
  EBMLId2[EBMLId2["ProjectionPoseYaw"] = 30323] = "ProjectionPoseYaw";
  EBMLId2[EBMLId2["ProjectionPosePitch"] = 30324] = "ProjectionPosePitch";
  EBMLId2[EBMLId2["ProjectionPoseRoll"] = 30325] = "ProjectionPoseRoll";
  EBMLId2[EBMLId2["Attachments"] = 423732329] = "Attachments";
  EBMLId2[EBMLId2["AttachedFile"] = 24999] = "AttachedFile";
  EBMLId2[EBMLId2["FileDescription"] = 18046] = "FileDescription";
  EBMLId2[EBMLId2["FileName"] = 18030] = "FileName";
  EBMLId2[EBMLId2["FileMediaType"] = 18016] = "FileMediaType";
  EBMLId2[EBMLId2["FileData"] = 18012] = "FileData";
  EBMLId2[EBMLId2["FileUID"] = 18094] = "FileUID";
  EBMLId2[EBMLId2["Chapters"] = 272869232] = "Chapters";
  EBMLId2[EBMLId2["Tags"] = 307544935] = "Tags";
  EBMLId2[EBMLId2["Tag"] = 29555] = "Tag";
  EBMLId2[EBMLId2["Targets"] = 25536] = "Targets";
  EBMLId2[EBMLId2["TargetTypeValue"] = 26826] = "TargetTypeValue";
  EBMLId2[EBMLId2["TargetType"] = 25546] = "TargetType";
  EBMLId2[EBMLId2["TagTrackUID"] = 25541] = "TagTrackUID";
  EBMLId2[EBMLId2["TagEditionUID"] = 25545] = "TagEditionUID";
  EBMLId2[EBMLId2["TagChapterUID"] = 25540] = "TagChapterUID";
  EBMLId2[EBMLId2["TagAttachmentUID"] = 25542] = "TagAttachmentUID";
  EBMLId2[EBMLId2["SimpleTag"] = 26568] = "SimpleTag";
  EBMLId2[EBMLId2["TagName"] = 17827] = "TagName";
  EBMLId2[EBMLId2["TagLanguage"] = 17530] = "TagLanguage";
  EBMLId2[EBMLId2["TagString"] = 17543] = "TagString";
  EBMLId2[EBMLId2["TagBinary"] = 17541] = "TagBinary";
  EBMLId2[EBMLId2["ContentEncodings"] = 28032] = "ContentEncodings";
  EBMLId2[EBMLId2["ContentEncoding"] = 25152] = "ContentEncoding";
  EBMLId2[EBMLId2["ContentEncodingOrder"] = 20529] = "ContentEncodingOrder";
  EBMLId2[EBMLId2["ContentEncodingScope"] = 20530] = "ContentEncodingScope";
  EBMLId2[EBMLId2["ContentCompression"] = 20532] = "ContentCompression";
  EBMLId2[EBMLId2["ContentCompAlgo"] = 16980] = "ContentCompAlgo";
  EBMLId2[EBMLId2["ContentCompSettings"] = 16981] = "ContentCompSettings";
  EBMLId2[EBMLId2["ContentEncryption"] = 20533] = "ContentEncryption";
})(EBMLId || (EBMLId = {}));
var LEVEL_0_EBML_IDS = [
  EBMLId.EBML,
  EBMLId.Segment
];
var LEVEL_1_EBML_IDS = [
  EBMLId.SeekHead,
  EBMLId.Info,
  EBMLId.Cluster,
  EBMLId.Tracks,
  EBMLId.Cues,
  EBMLId.Attachments,
  EBMLId.Chapters,
  EBMLId.Tags
];
var LEVEL_0_AND_1_EBML_IDS = [
  ...LEVEL_0_EBML_IDS,
  ...LEVEL_1_EBML_IDS
];
var EBML_DATE_EPOCH = Date.UTC(2001, 0, 1);
var MAX_VAR_INT_SIZE = 8;
var MIN_HEADER_SIZE = 2;
var MAX_HEADER_SIZE = 2 * MAX_VAR_INT_SIZE;
var readVarIntSize = (slice) => {
  if (slice.remainingLength < 1) {
    return null;
  }
  const firstByte = readU8(slice);
  slice.skip(-1);
  if (firstByte === 0) {
    return null;
  }
  let width = 1;
  let mask = 128;
  while ((firstByte & mask) === 0) {
    width++;
    mask >>= 1;
  }
  if (slice.remainingLength < width) {
    return null;
  }
  return width;
};
var readVarInt = (slice) => {
  if (slice.remainingLength < 1) {
    return null;
  }
  const firstByte = readU8(slice);
  if (firstByte === 0) {
    return null;
  }
  let width = 1;
  let mask = 1 << 7;
  while ((firstByte & mask) === 0) {
    width++;
    mask >>= 1;
  }
  if (slice.remainingLength < width - 1) {
    return null;
  }
  let value = firstByte & mask - 1;
  for (let i = 1; i < width; i++) {
    value *= 1 << 8;
    value += readU8(slice);
  }
  return value;
};
var readUnsignedInt = (slice, width) => {
  if (width > 8) {
    throw new Error("Bad unsigned int size " + width);
  }
  let value = 0;
  for (let i = 0; i < width; i++) {
    value *= 1 << 8;
    value += readU8(slice);
  }
  return value;
};
var readUnsignedBigInt = (slice, width) => {
  if (width > 8) {
    throw new Error("Bad unsigned int size " + width);
  }
  let value = 0n;
  for (let i = 0; i < width; i++) {
    value <<= 8n;
    value += BigInt(readU8(slice));
  }
  return value;
};
var readSignedBigInt = (slice, width) => {
  if (width === 0) {
    return 0n;
  }
  return BigInt.asIntN(8 * width, readUnsignedBigInt(slice, width));
};
var readElementId = (slice) => {
  const size = readVarIntSize(slice);
  if (size === null) {
    return null;
  }
  if (slice.remainingLength < size) {
    return null;
  }
  const id = readUnsignedInt(slice, size);
  return id;
};
var readElementSize = (slice) => {
  const startPos = slice.filePos;
  const size = readVarInt(slice);
  if (size === null) {
    return null;
  }
  const width = slice.filePos - startPos;
  if (size === 2 ** (7 * width) - 1) {
    return void 0;
  }
  return size;
};
var readElementHeader = (slice) => {
  assert(slice.remainingLength >= MIN_HEADER_SIZE);
  const id = readElementId(slice);
  if (id === null) {
    return null;
  }
  const size = readElementSize(slice);
  if (size === null) {
    return null;
  }
  return { id, size };
};
var readAsciiString = (slice, length) => {
  const bytes = readBytes(slice, length);
  let str = "";
  for (let i = 0; i < length && bytes[i] !== 0; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
};
var readUnicodeString = (slice, length) => {
  const bytes = readBytes(slice, length);
  let strLength = 0;
  while (strLength < length && bytes[strLength] !== 0) {
    strLength += 1;
  }
  return textDecoder.decode(bytes.subarray(0, strLength));
};
var readFloat = (slice, width) => {
  if (width === 0) {
    return 0;
  }
  if (width !== 4 && width !== 8) {
    throw new Error("Bad float size " + width);
  }
  return width === 4 ? readF32Be(slice) : readF64Be(slice);
};
var searchForNextElementId = async (reader, startPos, ids, until) => {
  const idsSet = new Set(ids);
  let currentPos = startPos;
  while (until === null || currentPos < until) {
    let slice = reader.requestSliceRange(currentPos, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      break;
    const elementHeader = readElementHeader(slice);
    if (!elementHeader) {
      break;
    }
    if (idsSet.has(elementHeader.id)) {
      return { pos: currentPos, found: true };
    }
    assertDefinedSize(elementHeader.size);
    currentPos = slice.filePos + elementHeader.size;
  }
  return { pos: until !== null && until > currentPos ? until : currentPos, found: false };
};
var resync = async (reader, startPos, ids, until) => {
  const CHUNK_SIZE = 2 ** 16;
  const idsSet = new Set(ids);
  let currentPos = startPos;
  while (currentPos < until) {
    let slice = reader.requestSliceRange(currentPos, 0, Math.min(CHUNK_SIZE, until - currentPos));
    if (isThenable(slice))
      slice = await slice;
    if (!slice || slice.length === 0)
      break;
    const positionsToCheck = Math.max(slice.length - MAX_VAR_INT_SIZE, 1);
    for (let i = 0; i < positionsToCheck; i++) {
      slice.filePos = currentPos;
      const elementId = readElementId(slice);
      if (elementId !== null && idsSet.has(elementId)) {
        return currentPos;
      }
      currentPos++;
    }
  }
  return null;
};
var CODEC_STRING_MAP = {
  "avc": "V_MPEG4/ISO/AVC",
  "hevc": "V_MPEGH/ISO/HEVC",
  "vp8": "V_VP8",
  "vp9": "V_VP9",
  "av1": "V_AV1",
  "prores": "V_PRORES",
  "aac": "A_AAC",
  "mp3": "A_MPEG/L3",
  "opus": "A_OPUS",
  "vorbis": "A_VORBIS",
  "flac": "A_FLAC",
  "ac3": "A_AC3",
  "eac3": "A_EAC3",
  "dts": "A_DTS",
  "truehd": "A_TRUEHD",
  "pcm-u8": "A_PCM/INT/LIT",
  "pcm-s16": "A_PCM/INT/LIT",
  "pcm-s16be": "A_PCM/INT/BIG",
  "pcm-s24": "A_PCM/INT/LIT",
  "pcm-s24be": "A_PCM/INT/BIG",
  "pcm-s32": "A_PCM/INT/LIT",
  "pcm-s32be": "A_PCM/INT/BIG",
  "pcm-f32": "A_PCM/FLOAT/IEEE",
  "pcm-f64": "A_PCM/FLOAT/IEEE",
  "webvtt": "S_TEXT/WEBVTT"
};
function assertDefinedSize(size) {
  if (size === void 0) {
    throw new Error("Undefined element size is used in a place where it is not supported.");
  }
}

// node_modules/mediabunny/dist/modules/src/matroska/matroska-misc.js
var buildMatroskaMimeType = (info) => {
  const base = info.hasVideo ? "video/" : info.hasAudio ? "audio/" : "application/";
  let string = base + (info.isWebM ? "webm" : "x-matroska");
  if (info.codecStrings.length > 0) {
    const uniqueCodecMimeTypes = [...new Set(info.codecStrings.filter(Boolean))];
    string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
  }
  return string;
};

// node_modules/mediabunny/dist/modules/src/matroska/matroska-demuxer.js
var BlockLacing;
(function(BlockLacing2) {
  BlockLacing2[BlockLacing2["None"] = 0] = "None";
  BlockLacing2[BlockLacing2["Xiph"] = 1] = "Xiph";
  BlockLacing2[BlockLacing2["FixedSize"] = 2] = "FixedSize";
  BlockLacing2[BlockLacing2["Ebml"] = 3] = "Ebml";
})(BlockLacing || (BlockLacing = {}));
var ContentEncodingScope;
(function(ContentEncodingScope2) {
  ContentEncodingScope2[ContentEncodingScope2["Block"] = 1] = "Block";
  ContentEncodingScope2[ContentEncodingScope2["Private"] = 2] = "Private";
  ContentEncodingScope2[ContentEncodingScope2["Next"] = 4] = "Next";
})(ContentEncodingScope || (ContentEncodingScope = {}));
var ContentCompAlgo;
(function(ContentCompAlgo2) {
  ContentCompAlgo2[ContentCompAlgo2["Zlib"] = 0] = "Zlib";
  ContentCompAlgo2[ContentCompAlgo2["Bzlib"] = 1] = "Bzlib";
  ContentCompAlgo2[ContentCompAlgo2["lzo1x"] = 2] = "lzo1x";
  ContentCompAlgo2[ContentCompAlgo2["HeaderStripping"] = 3] = "HeaderStripping";
})(ContentCompAlgo || (ContentCompAlgo = {}));
var METADATA_ELEMENTS = [
  { id: EBMLId.SeekHead, flag: "seekHeadSeen" },
  { id: EBMLId.Info, flag: "infoSeen" },
  { id: EBMLId.Tracks, flag: "tracksSeen" },
  { id: EBMLId.Cues, flag: "cuesSeen" }
];
var MAX_RESYNC_LENGTH = 10 * 2 ** 20;
var MAX_ELEMENT_NESTING_DEPTH = 64;
var MatroskaDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.readMetadataPromise = null;
    this.segments = [];
    this.currentSegment = null;
    this.currentTrack = null;
    this.currentCluster = null;
    this.currentBlock = null;
    this.currentBlockAdditional = null;
    this.currentCueTime = null;
    this.currentDecodingInstruction = null;
    this.currentProjection = null;
    this.currentTagTargetIsMovie = true;
    this.currentSimpleTagName = null;
    this.currentAttachedFile = null;
    this.isWebM = false;
    this.claimedSeekTargets = /* @__PURE__ */ new Set();
    this.elementNestingDepth = 0;
    this.reader = input2._reader;
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.segments.flatMap((segment) => segment.tracks.map((track) => track.trackBacking));
  }
  async getMimeType() {
    await this.readMetadata();
    const backings = await this.getTrackBackings();
    const codecStrings = await Promise.all(backings.map((x) => x.getDecoderConfig().then((c) => c?.codec ?? null)));
    return buildMatroskaMimeType({
      isWebM: this.isWebM,
      hasVideo: this.segments.some((segment) => segment.tracks.some((x) => x.info?.type === "video")),
      hasAudio: this.segments.some((segment) => segment.tracks.some((x) => x.info?.type === "audio")),
      codecStrings: codecStrings.filter(Boolean)
    });
  }
  async getMetadataTags() {
    await this.readMetadata();
    for (const segment of this.segments) {
      if (!segment.metadataTagsPromise) {
        if (this.reader.fileSize !== null) {
          segment.metadataTagsPromise = this.loadSegmentMetadata(segment);
        } else {
          segment.metadataTagsPromise = Promise.resolve();
        }
      }
      await segment.metadataTagsPromise;
    }
    let metadataTags = {};
    for (const segment of this.segments) {
      metadataTags = { ...metadataTags, ...segment.metadataTags };
    }
    return metadataTags;
  }
  readMetadata() {
    return this.readMetadataPromise ??= (async () => {
      let currentPos = 0;
      while (true) {
        let slice = this.reader.requestSliceRange(currentPos, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const header = readElementHeader(slice);
        if (!header) {
          break;
        }
        const id = header.id;
        let size = header.size;
        const dataStartPos = slice.filePos;
        if (id === EBMLId.EBML) {
          assertDefinedSize(size);
          let slice2 = this.reader.requestSlice(dataStartPos, size);
          if (isThenable(slice2))
            slice2 = await slice2;
          if (!slice2)
            break;
          this.readContiguousElements(slice2);
        } else if (id === EBMLId.Segment) {
          await this.readSegment(dataStartPos, size);
          if (size === void 0) {
            break;
          }
          if (this.reader.fileSize === null) {
            break;
          }
        } else if (id === EBMLId.Cluster) {
          if (this.reader.fileSize === null) {
            break;
          }
          if (size === void 0) {
            const nextElementPos = await searchForNextElementId(this.reader, dataStartPos, LEVEL_0_AND_1_EBML_IDS, this.reader.fileSize);
            size = nextElementPos.pos - dataStartPos;
          }
          const lastSegment = last(this.segments);
          if (lastSegment) {
            lastSegment.elementEndPos = dataStartPos + size;
          }
        }
        assertDefinedSize(size);
        currentPos = dataStartPos + size;
      }
    })();
  }
  async readSegment(segmentDataStart, dataSize) {
    this.currentSegment = {
      seekHeadSeen: false,
      infoSeen: false,
      tracksSeen: false,
      cuesSeen: false,
      tagsSeen: false,
      attachmentsSeen: false,
      timestampScale: -1,
      timestampFactor: -1,
      duration: -1,
      seekEntries: [],
      tracks: [],
      idToTrack: /* @__PURE__ */ new Map(),
      cuePoints: [],
      dataStartPos: segmentDataStart,
      elementEndPos: dataSize === void 0 ? null : segmentDataStart + dataSize,
      clusterSeekStartPos: segmentDataStart,
      lastReadCluster: null,
      clusterSummaries: /* @__PURE__ */ new Map(),
      metadataTags: {},
      metadataTagsPromise: null
    };
    this.segments.push(this.currentSegment);
    let currentPos = segmentDataStart;
    const visitedSeekHeadPositions = /* @__PURE__ */ new Set();
    while (this.currentSegment.elementEndPos === null || currentPos < this.currentSegment.elementEndPos) {
      let slice = this.reader.requestSliceRange(currentPos, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
      if (isThenable(slice))
        slice = await slice;
      if (!slice)
        break;
      const elementStartPos = currentPos;
      const header = readElementHeader(slice);
      if (!header || !LEVEL_1_EBML_IDS.includes(header.id) && header.id !== EBMLId.Void) {
        const nextPos = await resync(this.reader, elementStartPos + 1, LEVEL_1_EBML_IDS, Math.min(this.currentSegment.elementEndPos ?? Infinity, elementStartPos + MAX_RESYNC_LENGTH));
        if (nextPos) {
          currentPos = nextPos;
          continue;
        } else {
          break;
        }
      }
      const { id, size } = header;
      const dataStartPos = slice.filePos;
      const metadataElementIndex = METADATA_ELEMENTS.findIndex((x) => x.id === id);
      if (metadataElementIndex !== -1) {
        const field = METADATA_ELEMENTS[metadataElementIndex].flag;
        this.currentSegment[field] = true;
        if (id === EBMLId.SeekHead) {
          visitedSeekHeadPositions.add(elementStartPos - segmentDataStart);
        }
        assertDefinedSize(size);
        let slice2 = this.reader.requestSlice(dataStartPos, size);
        if (isThenable(slice2))
          slice2 = await slice2;
        if (slice2) {
          this.readContiguousElements(slice2);
        }
      } else if (id === EBMLId.Tags || id === EBMLId.Attachments) {
        if (id === EBMLId.Tags) {
          this.currentSegment.tagsSeen = true;
        } else {
          this.currentSegment.attachmentsSeen = true;
        }
        assertDefinedSize(size);
        let slice2 = this.reader.requestSlice(dataStartPos, size);
        if (isThenable(slice2))
          slice2 = await slice2;
        if (slice2) {
          this.readContiguousElements(slice2);
        }
      } else if (id === EBMLId.Cluster) {
        this.currentSegment.clusterSeekStartPos = elementStartPos;
        break;
      }
      if (size === void 0) {
        break;
      } else {
        currentPos = dataStartPos + size;
      }
    }
    if (this.reader.fileSize !== null) {
      for (let i = 0; i < this.currentSegment.seekEntries.length; i++) {
        const seekEntry = this.currentSegment.seekEntries[i];
        if (seekEntry.id !== EBMLId.SeekHead || visitedSeekHeadPositions.has(seekEntry.segmentPosition)) {
          continue;
        }
        visitedSeekHeadPositions.add(seekEntry.segmentPosition);
        if (!this.claimSeekTarget(segmentDataStart + seekEntry.segmentPosition)) {
          continue;
        }
        let slice = this.reader.requestSliceRange(segmentDataStart + seekEntry.segmentPosition, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          continue;
        const header = readElementHeader(slice);
        if (!header || header.id !== EBMLId.SeekHead)
          continue;
        const { size } = header;
        assertDefinedSize(size);
        let dataSlice = this.reader.requestSlice(slice.filePos, size);
        if (isThenable(dataSlice))
          dataSlice = await dataSlice;
        if (!dataSlice)
          continue;
        this.readContiguousElements(dataSlice);
      }
    }
    this.currentSegment.seekEntries.sort((a, b) => a.segmentPosition - b.segmentPosition);
    if (this.reader.fileSize !== null) {
      for (const seekEntry of this.currentSegment.seekEntries) {
        const target = METADATA_ELEMENTS.find((x) => x.id === seekEntry.id);
        if (!target) {
          continue;
        }
        if (this.currentSegment[target.flag])
          continue;
        if (!this.claimSeekTarget(segmentDataStart + seekEntry.segmentPosition))
          continue;
        let slice = this.reader.requestSliceRange(segmentDataStart + seekEntry.segmentPosition, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          continue;
        const header = readElementHeader(slice);
        if (!header)
          continue;
        const { id, size } = header;
        if (id !== target.id)
          continue;
        assertDefinedSize(size);
        this.currentSegment[target.flag] = true;
        let dataSlice = this.reader.requestSlice(slice.filePos, size);
        if (isThenable(dataSlice))
          dataSlice = await dataSlice;
        if (!dataSlice)
          continue;
        this.readContiguousElements(dataSlice);
      }
    }
    if (this.currentSegment.timestampScale === -1) {
      this.currentSegment.timestampScale = 1e6;
      this.currentSegment.timestampFactor = 1e9 / 1e6;
    }
    for (const track of this.currentSegment.tracks) {
      if (track.defaultDurationNs !== null) {
        track.defaultDuration = this.currentSegment.timestampFactor * track.defaultDurationNs / 1e9;
      }
      track.codecDelay = Math.round(this.currentSegment.timestampFactor * track.codecDelayNs / 1e9);
    }
    for (const cuePoint of this.currentSegment.cuePoints) {
      const track = this.currentSegment.idToTrack.get(cuePoint.trackId);
      if (track) {
        track.cuePoints.push(cuePoint);
      }
    }
    for (const track of this.currentSegment.tracks) {
      const cuePoints = track.cuePoints;
      cuePoints.sort((a, b) => a.time - b.time);
      let writeIndex = 0;
      for (const cuePoint of cuePoints) {
        if (writeIndex === 0 || cuePoint.time !== cuePoints[writeIndex - 1].time) {
          cuePoints[writeIndex++] = cuePoint;
        }
      }
      cuePoints.length = writeIndex;
    }
    let trackWithMostCuePoints = null;
    let maxCuePointCount = -Infinity;
    for (const track of this.currentSegment.tracks) {
      if (track.cuePoints.length > maxCuePointCount) {
        maxCuePointCount = track.cuePoints.length;
        trackWithMostCuePoints = track;
      }
    }
    for (const track of this.currentSegment.tracks) {
      if (track.cuePoints.length === 0) {
        track.cuePoints = trackWithMostCuePoints.cuePoints;
      }
    }
    this.currentSegment = null;
  }
  async readCluster(startPos, segment) {
    if (segment.lastReadCluster?.elementStartPos === startPos) {
      return segment.lastReadCluster;
    }
    let headerSlice = this.reader.requestSliceRange(startPos, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
    if (isThenable(headerSlice))
      headerSlice = await headerSlice;
    assert(headerSlice);
    const elementStartPos = startPos;
    const elementHeader = readElementHeader(headerSlice);
    assert(elementHeader);
    const id = elementHeader.id;
    assert(id === EBMLId.Cluster);
    let size = elementHeader.size;
    const dataStartPos = headerSlice.filePos;
    if (size === void 0) {
      const nextElementPos = await searchForNextElementId(this.reader, dataStartPos, LEVEL_0_AND_1_EBML_IDS, segment.elementEndPos);
      size = nextElementPos.pos - dataStartPos;
    }
    let dataSlice = this.reader.requestSliceRange(dataStartPos, 0, size);
    if (isThenable(dataSlice))
      dataSlice = await dataSlice;
    const cluster = {
      segment,
      elementStartPos,
      elementEndPos: dataStartPos + size,
      dataStartPos,
      timestamp: -1,
      trackData: /* @__PURE__ */ new Map()
    };
    if (dataSlice) {
      this.currentCluster = cluster;
      try {
        const endPos = this.readContiguousElements(dataSlice, LEVEL_0_AND_1_EBML_IDS);
        cluster.elementEndPos = endPos;
      } finally {
        this.currentCluster = null;
        this.currentBlock = null;
      }
    }
    for (const [, trackData] of cluster.trackData) {
      const track = trackData.track;
      assert(trackData.blocks.length > 0);
      let hasLacedBlocks = false;
      for (let i = 0; i < trackData.blocks.length; i++) {
        const block = trackData.blocks[i];
        block.timestamp += cluster.timestamp;
        hasLacedBlocks ||= block.lacing !== BlockLacing.None;
      }
      trackData.presentationTimestamps = trackData.blocks.map((block, i) => ({ timestamp: block.timestamp, blockIndex: i })).sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i < trackData.presentationTimestamps.length; i++) {
        const currentEntry = trackData.presentationTimestamps[i];
        const currentBlock = trackData.blocks[currentEntry.blockIndex];
        if (i < trackData.presentationTimestamps.length - 1) {
          const nextEntry2 = trackData.presentationTimestamps[i + 1];
          currentBlock.duration = nextEntry2.timestamp - currentBlock.timestamp;
        } else if (currentBlock.duration === 0) {
          if (track.defaultDuration != null) {
            if (currentBlock.lacing === BlockLacing.None) {
              currentBlock.duration = Math.round(track.defaultDuration);
            } else {
            }
          }
        }
      }
      if (hasLacedBlocks) {
        trackData.blocks = this.expandLacedBlocks(trackData.blocks, track);
        trackData.presentationTimestamps = trackData.blocks.map((block, i) => ({ timestamp: block.timestamp, blockIndex: i })).sort((a, b) => a.timestamp - b.timestamp);
      }
      if (track.info?.type === "audio" && track.info.codec) {
        const hasDeltaPackets = AUDIO_CODECS_WITH_DELTA_PACKETS.includes(track.info.codec);
        for (const block of trackData.blocks) {
          if (block.decoded || !hasDeltaPackets) {
            block.isKeyFrame = determineAudioPacketType(track.info.codec, block.data) === "key";
          }
        }
      }
      const firstKeyEntry = trackData.presentationTimestamps.find((x) => trackData.blocks[x.blockIndex].isKeyFrame);
      if (firstKeyEntry) {
        trackData.firstKeyFrameTimestamp = firstKeyEntry.timestamp;
      }
      const firstBlock = trackData.blocks[trackData.presentationTimestamps[0].blockIndex];
      const lastBlock = trackData.blocks[last(trackData.presentationTimestamps).blockIndex];
      trackData.startTimestamp = firstBlock.timestamp;
      trackData.endTimestamp = lastBlock.timestamp + lastBlock.duration;
      const insertionIndex = binarySearchLessOrEqual(track.clusterPositionCache, trackData.startTimestamp, (x) => x.startTimestamp);
      const previousEntry = track.clusterPositionCache[insertionIndex];
      const nextEntry = track.clusterPositionCache[insertionIndex + 1];
      if ((!previousEntry || previousEntry.elementStartPos < elementStartPos) && (!nextEntry || nextEntry.elementStartPos > elementStartPos)) {
        track.clusterPositionCache.splice(insertionIndex + 1, 0, {
          elementStartPos: cluster.elementStartPos,
          startTimestamp: trackData.startTimestamp,
          hasKeyFrame: trackData.firstKeyFrameTimestamp !== null
        });
      }
    }
    segment.lastReadCluster = cluster;
    segment.clusterSummaries.set(startPos, {
      elementEndPos: cluster.elementEndPos,
      trackIds: new Set(cluster.trackData.keys())
    });
    return cluster;
  }
  getTrackDataInCluster(cluster, trackNumber) {
    let trackData = cluster.trackData.get(trackNumber);
    if (!trackData) {
      const track = cluster.segment.idToTrack.get(trackNumber);
      if (!track) {
        return null;
      }
      trackData = {
        track,
        startTimestamp: 0,
        endTimestamp: 0,
        firstKeyFrameTimestamp: null,
        blocks: [],
        presentationTimestamps: []
      };
      cluster.trackData.set(trackNumber, trackData);
    }
    return trackData;
  }
  expandLacedBlocks(blocks, track) {
    const expandedBlocks = [];
    for (const originalBlock of blocks) {
      if (originalBlock.lacing === BlockLacing.None) {
        expandedBlocks.push(originalBlock);
        continue;
      }
      const slice = FileSlice.tempFromBytes(originalBlock.data);
      if (slice.length === 0) {
        throw new Error("Invalid laced block: no data.");
      }
      const frameSizes = [];
      const frameCount = readU8(slice) + 1;
      switch (originalBlock.lacing) {
        case BlockLacing.Xiph:
          {
            let totalUsedSize = 0;
            for (let i = 0; i < frameCount - 1; i++) {
              let frameSize = 0;
              while (slice.bufferPos < slice.length) {
                const value = readU8(slice);
                frameSize += value;
                if (value < 255) {
                  frameSizes.push(frameSize);
                  totalUsedSize += frameSize;
                  break;
                }
              }
            }
            frameSizes.push(slice.length - (slice.bufferPos + totalUsedSize));
          }
          ;
          break;
        case BlockLacing.FixedSize:
          {
            const totalDataSize = slice.length - 1;
            const frameSize = Math.floor(totalDataSize / frameCount);
            for (let i = 0; i < frameCount; i++) {
              frameSizes.push(frameSize);
            }
          }
          ;
          break;
        case BlockLacing.Ebml:
          {
            if (frameCount === 1) {
              frameSizes.push(slice.length - slice.bufferPos);
              break;
            }
            const firstResult = readVarInt(slice);
            if (firstResult === null) {
              throw new Error("Invalid EBML lacing: bad frame size.");
            }
            let currentSize = firstResult;
            frameSizes.push(currentSize);
            let totalUsedSize = currentSize;
            for (let i = 1; i < frameCount - 1; i++) {
              const startPos = slice.bufferPos;
              const diffResult = readVarInt(slice);
              if (diffResult === null) {
                throw new Error("Invalid EBML lacing: bad frame size.");
              }
              const unsignedDiff = diffResult;
              const width = slice.bufferPos - startPos;
              const bias = (1 << width * 7 - 1) - 1;
              const diff = unsignedDiff - bias;
              currentSize += diff;
              frameSizes.push(currentSize);
              totalUsedSize += currentSize;
            }
            frameSizes.push(slice.length - (slice.bufferPos + totalUsedSize));
          }
          ;
          break;
        default:
          assert(false);
      }
      if (frameSizes.length !== frameCount || frameSizes.some((x) => x <= 0)) {
        throw new Error("Invalid block lacing: frame sizes don't match the block.");
      }
      const blockDuration = originalBlock.duration || Math.round(frameCount * (track.defaultDuration ?? 0));
      for (let i = 0; i < frameCount; i++) {
        const frameSize = frameSizes[i];
        const frameData = readBytes(slice, frameSize);
        const frameStart = Math.floor(blockDuration * i / frameCount);
        const frameEnd = Math.floor(blockDuration * (i + 1) / frameCount);
        expandedBlocks.push({
          timestamp: originalBlock.timestamp + frameStart,
          duration: frameEnd - frameStart,
          isKeyFrame: originalBlock.isKeyFrame,
          data: frameData,
          lacing: BlockLacing.None,
          decoded: originalBlock.decoded,
          postProcessed: false,
          mainAdditional: originalBlock.mainAdditional
        });
      }
    }
    return expandedBlocks;
  }
  async loadSegmentMetadata(segment) {
    for (const seekEntry of segment.seekEntries) {
      if (seekEntry.id === EBMLId.Tags && !segment.tagsSeen) {
      } else if (seekEntry.id === EBMLId.Attachments && !segment.attachmentsSeen) {
      } else {
        continue;
      }
      if (!this.claimSeekTarget(segment.dataStartPos + seekEntry.segmentPosition)) {
        continue;
      }
      let slice = this.reader.requestSliceRange(segment.dataStartPos + seekEntry.segmentPosition, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
      if (isThenable(slice))
        slice = await slice;
      if (!slice)
        continue;
      const header = readElementHeader(slice);
      if (!header || header.id !== seekEntry.id)
        continue;
      const { size } = header;
      assertDefinedSize(size);
      let dataSlice = this.reader.requestSlice(slice.filePos, size);
      if (isThenable(dataSlice))
        dataSlice = await dataSlice;
      if (dataSlice) {
        assert(!this.currentSegment);
        this.currentSegment = segment;
        try {
          this.readContiguousElements(dataSlice);
        } finally {
          this.currentSegment = null;
        }
      }
      if (seekEntry.id === EBMLId.Tags) {
        segment.tagsSeen = true;
      } else if (seekEntry.id === EBMLId.Attachments) {
        segment.attachmentsSeen = true;
      }
    }
  }
  claimSeekTarget(position) {
    if (this.claimedSeekTargets.has(position)) {
      return false;
    }
    this.claimedSeekTargets.add(position);
    return true;
  }
  readContiguousElements(slice, stopIds) {
    if (this.elementNestingDepth === MAX_ELEMENT_NESTING_DEPTH) {
      throw new Error("Invalid file: elements are nested too deeply.");
    }
    this.elementNestingDepth++;
    try {
      while (slice.remainingLength >= MIN_HEADER_SIZE) {
        const startPos = slice.filePos;
        const foundElement = this.traverseElement(slice, stopIds);
        if (!foundElement) {
          return startPos;
        }
      }
      return slice.filePos;
    } finally {
      this.elementNestingDepth--;
    }
  }
  traverseElement(slice, stopIds) {
    const header = readElementHeader(slice);
    if (!header) {
      return false;
    }
    if (stopIds && stopIds.includes(header.id)) {
      return false;
    }
    const { id, size } = header;
    const dataStartPos = slice.filePos;
    assertDefinedSize(size);
    if (dataStartPos + size > slice.end) {
      return false;
    }
    switch (id) {
      case EBMLId.DocType:
        {
          this.isWebM = readAsciiString(slice, size) === "webm";
        }
        ;
        break;
      case EBMLId.Seek:
        {
          if (!this.currentSegment)
            break;
          const seekEntry = { id: -1, segmentPosition: -1 };
          this.currentSegment.seekEntries.push(seekEntry);
          this.readContiguousElements(slice.slice(dataStartPos, size));
          if (seekEntry.id === -1 || seekEntry.segmentPosition === -1) {
            this.currentSegment.seekEntries.pop();
          }
        }
        ;
        break;
      case EBMLId.SeekID:
        {
          const lastSeekEntry = this.currentSegment?.seekEntries[this.currentSegment.seekEntries.length - 1];
          if (!lastSeekEntry)
            break;
          lastSeekEntry.id = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.SeekPosition:
        {
          const lastSeekEntry = this.currentSegment?.seekEntries[this.currentSegment.seekEntries.length - 1];
          if (!lastSeekEntry)
            break;
          lastSeekEntry.segmentPosition = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.TimestampScale:
        {
          if (!this.currentSegment)
            break;
          const timestampScale = size === 0 ? 1e6 : readUnsignedInt(slice, size);
          if (timestampScale === 0) {
            throw new Error("Invalid TimestampScale element: must not be 0.");
          }
          this.currentSegment.timestampScale = timestampScale;
          this.currentSegment.timestampFactor = 1e9 / timestampScale;
        }
        ;
        break;
      case EBMLId.Duration:
        {
          if (!this.currentSegment)
            break;
          this.currentSegment.duration = readFloat(slice, size);
        }
        ;
        break;
      case EBMLId.DateUTC:
        {
          if (!this.currentSegment)
            break;
          const nanoseconds = readSignedBigInt(slice, size);
          this.currentSegment.metadataTags.creationTime = new Date(EBML_DATE_EPOCH + Number(nanoseconds / 1000000n));
        }
        ;
        break;
      case EBMLId.Title:
        {
          if (!this.currentSegment)
            break;
          this.currentSegment.metadataTags.title ??= readUnicodeString(slice, size);
        }
        ;
        break;
      case EBMLId.TrackEntry:
        {
          if (!this.currentSegment)
            break;
          this.currentTrack = {
            id: -1,
            segment: this.currentSegment,
            demuxer: this,
            clusterPositionCache: [],
            cuePoints: [],
            disposition: {
              ...DEFAULT_TRACK_DISPOSITION,
              primary: false
            },
            trackBacking: null,
            codecId: null,
            codecPrivate: null,
            defaultDuration: null,
            defaultDurationNs: null,
            codecDelay: 0,
            codecDelayNs: 0,
            name: null,
            languageCode: "eng",
            // The default in Matroska
            hasLanguageBcp47: false,
            decodingInstructions: [],
            info: null
          };
          this.readContiguousElements(slice.slice(dataStartPos, size));
          if (!this.currentTrack) {
            break;
          }
          if (this.currentTrack.decodingInstructions.some((instruction) => {
            return instruction.data?.type !== "decompress" || instruction.scope !== ContentEncodingScope.Block || instruction.data.algorithm !== ContentCompAlgo.HeaderStripping;
          })) {
            Logging._warn(`Track #${this.currentTrack.id} has an unsupported content encoding; dropping.`);
            this.currentTrack = null;
          }
          if (this.currentTrack && this.currentSegment.idToTrack.has(this.currentTrack.id)) {
            Logging._warn(`Track #${this.currentTrack.id} is defined more than once; dropping.`);
            this.currentTrack = null;
          }
          if (this.currentTrack && this.currentTrack.id !== -1 && this.currentTrack.codecId && this.currentTrack.info) {
            const slashIndex = this.currentTrack.codecId.indexOf("/");
            const codecIdWithoutSuffix = slashIndex === -1 ? this.currentTrack.codecId : this.currentTrack.codecId.slice(0, slashIndex);
            if (this.currentTrack.info.type === "video" && this.currentTrack.info.width !== -1 && this.currentTrack.info.height !== -1) {
              this.currentTrack.info.squarePixelWidth = this.currentTrack.info.width;
              this.currentTrack.info.squarePixelHeight = this.currentTrack.info.height;
              let displayWidth = this.currentTrack.info.displayWidth;
              let displayHeight = this.currentTrack.info.displayHeight;
              const stereoMode = this.currentTrack.info.stereoMode;
              if (displayWidth !== null && [1, 8, 9, 11].includes(stereoMode)) {
                displayWidth *= 2;
              }
              if (displayHeight !== null && [2, 3, 6, 7].includes(stereoMode)) {
                displayHeight *= 2;
              }
              if (this.currentTrack.info.displayUnit === 0) {
                displayWidth ??= this.currentTrack.info.width;
                displayHeight ??= this.currentTrack.info.height;
              }
              if (this.currentTrack.info.displayUnit !== 4 && displayWidth !== null && displayHeight !== null) {
                const num = displayWidth * this.currentTrack.info.height;
                const den = displayHeight * this.currentTrack.info.width;
                if (num > 0 && den > 0) {
                  if (num > den) {
                    this.currentTrack.info.squarePixelWidth = Math.round(this.currentTrack.info.width * num / den);
                  } else {
                    this.currentTrack.info.squarePixelHeight = Math.round(this.currentTrack.info.height * den / num);
                  }
                }
              }
              if (this.currentTrack.codecId === CODEC_STRING_MAP.avc) {
                this.currentTrack.info.codec = "avc";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (this.currentTrack.codecId === CODEC_STRING_MAP.hevc) {
                this.currentTrack.info.codec = "hevc";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vp8) {
                this.currentTrack.info.codec = "vp8";
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vp9) {
                this.currentTrack.info.codec = "vp9";
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.av1) {
                this.currentTrack.info.codec = "av1";
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.prores) {
                const format = this.currentTrack.codecPrivate ? textDecoder.decode(this.currentTrack.codecPrivate) : "";
                if (PRORES_FOURCCS.includes(format)) {
                  this.currentTrack.info.codec = "prores";
                  this.currentTrack.info.proresFormat = format;
                } else {
                }
              }
              const videoTrack = this.currentTrack;
              this.currentTrack.trackBacking = new MatroskaVideoTrackBacking(videoTrack);
              this.currentSegment.tracks.push(this.currentTrack);
              this.currentSegment.idToTrack.set(this.currentTrack.id, this.currentTrack);
            } else if (this.currentTrack.info.type === "audio") {
              if (this.currentTrack.info.outputSampleRate !== null) {
                this.currentTrack.info.sampleRate = this.currentTrack.info.outputSampleRate;
              }
              if (codecIdWithoutSuffix === CODEC_STRING_MAP.aac) {
                this.currentTrack.info.codec = "aac";
                this.currentTrack.info.aacCodecInfo = {
                  isMpeg2: this.currentTrack.codecId.includes("MPEG2"),
                  objectType: null
                };
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
                if (!this.currentTrack.codecPrivate && this.currentTrack.codecId !== CODEC_STRING_MAP.aac) {
                  const profile = this.currentTrack.codecId.split("/")[2] ?? "";
                  const objectType = ["MAIN", "LC", "SSR", "LTP"].indexOf(profile) + 1;
                  if (objectType === 0) {
                    throw new Error(`Unknown Matroska AAC codec ID '${this.currentTrack.codecId}'.`);
                  }
                  const usesSbr = this.currentTrack.codecId.endsWith("/SBR");
                  if (usesSbr && this.currentTrack.info.outputSampleRate === null) {
                    this.currentTrack.info.sampleRate *= 2;
                  }
                  this.currentTrack.info.codecDescription = buildAacAudioSpecificConfig({
                    objectType: usesSbr ? 5 : objectType,
                    outputSampleRate: this.currentTrack.info.sampleRate,
                    outputNumberOfChannels: this.currentTrack.info.numberOfChannels,
                    programConfigElement: null
                  });
                }
              } else if (this.currentTrack.codecId === CODEC_STRING_MAP.mp3) {
                this.currentTrack.info.codec = "mp3";
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.opus) {
                this.currentTrack.info.codec = "opus";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
                this.currentTrack.info.sampleRate = OPUS_SAMPLE_RATE;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vorbis) {
                this.currentTrack.info.codec = "vorbis";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.flac) {
                this.currentTrack.info.codec = "flac";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.ac3) {
                this.currentTrack.info.codec = "ac3";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.eac3) {
                this.currentTrack.info.codec = "eac3";
                this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.dts) {
                this.currentTrack.info.codec = "dts";
                if (this.currentTrack.codecId === "A_DTS/EXPRESS") {
                  this.currentTrack.info.dtsFormat = "dtse";
                } else if (this.currentTrack.codecId === "A_DTS/LOSSLESS") {
                  this.currentTrack.info.dtsFormat = "dtsl";
                }
              } else if (codecIdWithoutSuffix === CODEC_STRING_MAP.truehd) {
                this.currentTrack.info.codec = "truehd";
              } else if (this.currentTrack.codecId === "A_PCM/INT/LIT") {
                if (this.currentTrack.info.bitDepth === 8) {
                  this.currentTrack.info.codec = "pcm-u8";
                } else if (this.currentTrack.info.bitDepth === 16) {
                  this.currentTrack.info.codec = "pcm-s16";
                } else if (this.currentTrack.info.bitDepth === 24) {
                  this.currentTrack.info.codec = "pcm-s24";
                } else if (this.currentTrack.info.bitDepth === 32) {
                  this.currentTrack.info.codec = "pcm-s32";
                }
              } else if (this.currentTrack.codecId === "A_PCM/INT/BIG") {
                if (this.currentTrack.info.bitDepth === 8) {
                  this.currentTrack.info.codec = "pcm-u8";
                } else if (this.currentTrack.info.bitDepth === 16) {
                  this.currentTrack.info.codec = "pcm-s16be";
                } else if (this.currentTrack.info.bitDepth === 24) {
                  this.currentTrack.info.codec = "pcm-s24be";
                } else if (this.currentTrack.info.bitDepth === 32) {
                  this.currentTrack.info.codec = "pcm-s32be";
                }
              } else if (this.currentTrack.codecId === "A_PCM/FLOAT/IEEE") {
                if (this.currentTrack.info.bitDepth === 32) {
                  this.currentTrack.info.codec = "pcm-f32";
                } else if (this.currentTrack.info.bitDepth === 64) {
                  this.currentTrack.info.codec = "pcm-f64";
                }
              }
              const audioTrack = this.currentTrack;
              this.currentTrack.trackBacking = new MatroskaAudioTrackBacking(audioTrack);
              this.currentSegment.tracks.push(this.currentTrack);
              this.currentSegment.idToTrack.set(this.currentTrack.id, this.currentTrack);
            }
          }
          this.currentTrack = null;
        }
        ;
        break;
      case EBMLId.TrackNumber:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.id = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.TrackType:
        {
          if (!this.currentTrack)
            break;
          const type = readUnsignedInt(slice, size);
          if (type === 1) {
            this.currentTrack.info = {
              type: "video",
              width: -1,
              height: -1,
              displayWidth: null,
              displayHeight: null,
              displayUnit: 0,
              // Pixels
              stereoMode: 0,
              // Mono
              squarePixelWidth: -1,
              squarePixelHeight: -1,
              horizontalScale: 1,
              verticalScale: 1,
              rotation: 0,
              codec: null,
              codecDescription: null,
              colorSpace: { ...EMPTY_COLOR_SPACE },
              alphaMode: false,
              proresFormat: null
            };
          } else if (type === 2) {
            this.currentTrack.info = {
              type: "audio",
              numberOfChannels: 1,
              // Default value
              sampleRate: 8e3,
              // Default value
              outputSampleRate: null,
              bitDepth: -1,
              codec: null,
              codecDescription: null,
              aacCodecInfo: null,
              dtsFormat: null
            };
          }
        }
        ;
        break;
      case EBMLId.FlagEnabled:
        {
          if (!this.currentTrack)
            break;
          const enabled = size === 0 ? 1 : readUnsignedInt(slice, size);
          if (!enabled) {
            this.currentTrack = null;
          }
        }
        ;
        break;
      case EBMLId.FlagDefault:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.default = size === 0 || !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.FlagForced:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.forced = !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.FlagOriginal:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.original = !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.FlagHearingImpaired:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.hearingImpaired = !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.FlagVisualImpaired:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.visuallyImpaired = !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.FlagCommentary:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.disposition.commentary = !!readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.CodecID:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.codecId = readAsciiString(slice, size);
        }
        ;
        break;
      case EBMLId.CodecPrivate:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.codecPrivate = readBytes(slice, size);
        }
        ;
        break;
      case EBMLId.DefaultDuration:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.defaultDurationNs = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.CodecDelay:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.codecDelayNs = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.Name:
        {
          if (!this.currentTrack)
            break;
          this.currentTrack.name = readUnicodeString(slice, size);
        }
        ;
        break;
      case EBMLId.Language:
        {
          if (!this.currentTrack)
            break;
          if (this.currentTrack.hasLanguageBcp47) {
            break;
          }
          this.currentTrack.languageCode = size === 0 ? "eng" : readAsciiString(slice, size);
          if (!isIso639Dash2LanguageCode(this.currentTrack.languageCode)) {
            this.currentTrack.languageCode = UNDETERMINED_LANGUAGE;
          }
        }
        ;
        break;
      case EBMLId.LanguageBCP47:
        {
          if (!this.currentTrack)
            break;
          const bcp47 = readAsciiString(slice, size);
          const languageSubtag = bcp47.split("-")[0];
          if (languageSubtag) {
            this.currentTrack.languageCode = languageSubtag;
          } else {
            this.currentTrack.languageCode = UNDETERMINED_LANGUAGE;
          }
          this.currentTrack.hasLanguageBcp47 = true;
        }
        ;
        break;
      case EBMLId.Video:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.PixelWidth:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.width = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.PixelHeight:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.height = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.DisplayWidth:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.displayWidth = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.DisplayHeight:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.displayHeight = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.DisplayUnit:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.displayUnit = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.StereoMode:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.stereoMode = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.AlphaMode:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.currentTrack.info.alphaMode = readUnsignedInt(slice, size) === 1;
        }
        ;
        break;
      case EBMLId.Colour:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.MatrixCoefficients:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          const matrixCoefficients = size === 0 ? 2 : readUnsignedInt(slice, size);
          const mapped = MATRIX_COEFFICIENTS_MAP_INVERSE[matrixCoefficients];
          this.currentTrack.info.colorSpace.matrix = mapped;
        }
        ;
        break;
      case EBMLId.Range:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          const range = readUnsignedInt(slice, size);
          this.currentTrack.info.colorSpace.fullRange = range === 1 || range === 2 ? range === 2 : void 0;
        }
        ;
        break;
      case EBMLId.TransferCharacteristics:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          const transferCharacteristics = size === 0 ? 2 : readUnsignedInt(slice, size);
          const mapped = TRANSFER_CHARACTERISTICS_MAP_INVERSE[transferCharacteristics];
          this.currentTrack.info.colorSpace.transfer = mapped;
        }
        ;
        break;
      case EBMLId.Primaries:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          const primaries = size === 0 ? 2 : readUnsignedInt(slice, size);
          const mapped = COLOR_PRIMARIES_MAP_INVERSE[primaries];
          this.currentTrack.info.colorSpace.primaries = mapped;
        }
        ;
        break;
      case EBMLId.Projection:
        {
          if (this.currentTrack?.info?.type !== "video")
            break;
          const info = this.currentTrack.info;
          const projection = {
            type: 0,
            // Rectangular
            yaw: 0,
            pitch: 0,
            roll: 0
          };
          this.currentProjection = projection;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          this.currentProjection = null;
          if (projection.type !== 0)
            break;
          const angleToScale = (angle) => {
            try {
              return Math.round(Math.cos(normalizeRotation(angle) * DEG_TO_RAD));
            } catch {
              return 1;
            }
          };
          info.horizontalScale = angleToScale(projection.yaw);
          info.verticalScale = angleToScale(projection.pitch);
          try {
            info.rotation = normalizeRotation(-projection.roll);
          } catch {
          }
        }
        ;
        break;
      case EBMLId.ProjectionType:
        {
          if (!this.currentProjection)
            break;
          this.currentProjection.type = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.ProjectionPoseYaw:
        {
          if (!this.currentProjection)
            break;
          this.currentProjection.yaw = readFloat(slice, size);
        }
        ;
        break;
      case EBMLId.ProjectionPosePitch:
        {
          if (!this.currentProjection)
            break;
          this.currentProjection.pitch = readFloat(slice, size);
        }
        ;
        break;
      case EBMLId.ProjectionPoseRoll:
        {
          if (!this.currentProjection)
            break;
          this.currentProjection.roll = readFloat(slice, size);
        }
        ;
        break;
      case EBMLId.Audio:
        {
          if (this.currentTrack?.info?.type !== "audio")
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.SamplingFrequency:
        {
          if (this.currentTrack?.info?.type !== "audio")
            break;
          const sampleRate = size === 0 ? 8e3 : readFloat(slice, size);
          if (!(sampleRate > 0) || !Number.isFinite(sampleRate)) {
            throw new Error("Invalid SamplingFrequency element: must be a positive, finite number.");
          }
          this.currentTrack.info.sampleRate = sampleRate;
        }
        ;
        break;
      case EBMLId.OutputSamplingFrequency:
        {
          if (this.currentTrack?.info?.type !== "audio")
            break;
          const outputSampleRate = readFloat(slice, size);
          if (!(outputSampleRate > 0) || !Number.isFinite(outputSampleRate)) {
            throw new Error("Invalid OutputSamplingFrequency element: must be a positive, finite number.");
          }
          this.currentTrack.info.outputSampleRate = outputSampleRate;
        }
        ;
        break;
      case EBMLId.Channels:
        {
          if (this.currentTrack?.info?.type !== "audio")
            break;
          const numberOfChannels = size === 0 ? 1 : readUnsignedInt(slice, size);
          if (numberOfChannels === 0) {
            throw new Error("Invalid Channels element: must not be 0.");
          }
          this.currentTrack.info.numberOfChannels = numberOfChannels;
        }
        ;
        break;
      case EBMLId.BitDepth:
        {
          if (this.currentTrack?.info?.type !== "audio")
            break;
          this.currentTrack.info.bitDepth = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.CuePoint:
        {
          if (!this.currentSegment)
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          this.currentCueTime = null;
        }
        ;
        break;
      case EBMLId.CueTime:
        {
          this.currentCueTime = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.CueTrackPositions:
        {
          if (this.currentCueTime === null || !this.currentSegment)
            break;
          const cuePoint = { time: this.currentCueTime, trackId: -1, clusterPosition: -1 };
          this.currentSegment.cuePoints.push(cuePoint);
          this.readContiguousElements(slice.slice(dataStartPos, size));
          if (cuePoint.trackId === -1 || cuePoint.clusterPosition === -1) {
            this.currentSegment.cuePoints.pop();
          }
        }
        ;
        break;
      case EBMLId.CueTrack:
        {
          const lastCuePoint = this.currentSegment?.cuePoints[this.currentSegment.cuePoints.length - 1];
          if (!lastCuePoint)
            break;
          lastCuePoint.trackId = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.CueClusterPosition:
        {
          const lastCuePoint = this.currentSegment?.cuePoints[this.currentSegment.cuePoints.length - 1];
          if (!lastCuePoint)
            break;
          assert(this.currentSegment);
          lastCuePoint.clusterPosition = this.currentSegment.dataStartPos + readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.Timestamp:
        {
          if (!this.currentCluster)
            break;
          this.currentCluster.timestamp = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.SimpleBlock:
        {
          if (!this.currentCluster)
            break;
          const blockSlice = slice.slice(dataStartPos, size);
          const trackNumber = readVarInt(blockSlice);
          if (trackNumber === null || blockSlice.remainingLength < 3)
            break;
          const trackData = this.getTrackDataInCluster(this.currentCluster, trackNumber);
          if (!trackData)
            break;
          const relativeTimestamp = readI16Be(blockSlice);
          const flags = readU8(blockSlice);
          const lacing = flags >> 1 & 3;
          const isKeyFrame = !!(flags & 128);
          const blockData = readBytes(blockSlice, blockSlice.remainingLength);
          const hasDecodingInstructions = trackData.track.decodingInstructions.length > 0;
          trackData.blocks.push({
            timestamp: relativeTimestamp,
            // We'll add the cluster's timestamp to this later
            duration: 0,
            // Will set later
            isKeyFrame,
            data: blockData,
            lacing,
            decoded: !hasDecodingInstructions,
            postProcessed: false,
            mainAdditional: null
          });
        }
        ;
        break;
      case EBMLId.BlockGroup:
        {
          if (!this.currentCluster)
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          this.currentBlock = null;
        }
        ;
        break;
      case EBMLId.Block:
        {
          if (!this.currentCluster)
            break;
          const blockSlice = slice.slice(dataStartPos, size);
          const trackNumber = readVarInt(blockSlice);
          if (trackNumber === null || blockSlice.remainingLength < 3)
            break;
          const trackData = this.getTrackDataInCluster(this.currentCluster, trackNumber);
          if (!trackData)
            break;
          const relativeTimestamp = readI16Be(blockSlice);
          const flags = readU8(blockSlice);
          const lacing = flags >> 1 & 3;
          const blockData = readBytes(blockSlice, blockSlice.remainingLength);
          const hasDecodingInstructions = trackData.track.decodingInstructions.length > 0;
          this.currentBlock = {
            timestamp: relativeTimestamp,
            // We'll add the cluster's timestamp to this later
            duration: 0,
            // Will set later
            isKeyFrame: true,
            data: blockData,
            lacing,
            decoded: !hasDecodingInstructions,
            postProcessed: false,
            mainAdditional: null
          };
          trackData.blocks.push(this.currentBlock);
        }
        ;
        break;
      case EBMLId.BlockAdditions:
        {
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.BlockMore:
        {
          const block = this.currentBlock;
          if (!block)
            break;
          const blockAdditional = {
            addId: 1,
            data: null
          };
          this.currentBlockAdditional = blockAdditional;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          if (blockAdditional.data && blockAdditional.addId === 1) {
            block.mainAdditional = blockAdditional.data;
          }
          this.currentBlockAdditional = null;
        }
        ;
        break;
      case EBMLId.BlockAdditional:
        {
          if (!this.currentBlockAdditional)
            break;
          this.currentBlockAdditional.data = readBytes(slice, size);
        }
        ;
        break;
      case EBMLId.BlockAddID:
        {
          if (!this.currentBlockAdditional)
            break;
          this.currentBlockAdditional.addId = size === 0 ? 1 : readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.BlockDuration:
        {
          if (!this.currentBlock)
            break;
          this.currentBlock.duration = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.ReferenceBlock:
        {
          if (!this.currentBlock)
            break;
          this.currentBlock.isKeyFrame = false;
        }
        ;
        break;
      case EBMLId.Tag:
        {
          this.currentTagTargetIsMovie = true;
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.Targets:
        {
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.TargetTypeValue:
        {
          const targetTypeValue = size === 0 ? 50 : readUnsignedInt(slice, size);
          if (targetTypeValue !== 50) {
            this.currentTagTargetIsMovie = false;
          }
        }
        ;
        break;
      case EBMLId.TagTrackUID:
      case EBMLId.TagEditionUID:
      case EBMLId.TagChapterUID:
      case EBMLId.TagAttachmentUID:
        {
          this.currentTagTargetIsMovie = false;
        }
        ;
        break;
      case EBMLId.SimpleTag:
        {
          if (!this.currentTagTargetIsMovie)
            break;
          this.currentSimpleTagName = null;
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.TagName:
        {
          this.currentSimpleTagName = readUnicodeString(slice, size);
        }
        ;
        break;
      case EBMLId.TagString:
        {
          if (!this.currentSimpleTagName)
            break;
          const value = readUnicodeString(slice, size);
          this.processTagValue(this.currentSimpleTagName, value);
        }
        ;
        break;
      case EBMLId.TagBinary:
        {
          if (!this.currentSimpleTagName)
            break;
          const value = readBytes(slice, size);
          this.processTagValue(this.currentSimpleTagName, value);
        }
        ;
        break;
      case EBMLId.AttachedFile:
        {
          if (!this.currentSegment || this.currentAttachedFile)
            break;
          this.currentAttachedFile = {
            fileUid: null,
            fileName: null,
            fileMediaType: null,
            fileData: null,
            fileDescription: null
          };
          this.readContiguousElements(slice.slice(dataStartPos, size));
          const tags = this.currentSegment.metadataTags;
          if (this.currentAttachedFile.fileUid && this.currentAttachedFile.fileData) {
            tags.raw ??= {};
            tags.raw[this.currentAttachedFile.fileUid.toString()] = new AttachedFile(this.currentAttachedFile.fileData, this.currentAttachedFile.fileMediaType ?? void 0, this.currentAttachedFile.fileName ?? void 0, this.currentAttachedFile.fileDescription ?? void 0);
          }
          if (this.currentAttachedFile.fileMediaType?.startsWith("image/") && this.currentAttachedFile.fileData) {
            const fileName = this.currentAttachedFile.fileName;
            let kind = "unknown";
            if (fileName) {
              const lowerName = fileName.toLowerCase();
              if (lowerName.startsWith("cover.")) {
                kind = "coverFront";
              } else if (lowerName.startsWith("back.")) {
                kind = "coverBack";
              }
            }
            tags.images ??= [];
            tags.images.push({
              data: this.currentAttachedFile.fileData,
              mimeType: this.currentAttachedFile.fileMediaType,
              kind,
              name: this.currentAttachedFile.fileName ?? void 0,
              description: this.currentAttachedFile.fileDescription ?? void 0
            });
          }
          this.currentAttachedFile = null;
        }
        ;
        break;
      case EBMLId.FileUID:
        {
          if (!this.currentAttachedFile)
            break;
          this.currentAttachedFile.fileUid = readUnsignedBigInt(slice, size);
        }
        ;
        break;
      case EBMLId.FileName:
        {
          if (!this.currentAttachedFile)
            break;
          this.currentAttachedFile.fileName = readUnicodeString(slice, size);
        }
        ;
        break;
      case EBMLId.FileMediaType:
        {
          if (!this.currentAttachedFile)
            break;
          this.currentAttachedFile.fileMediaType = readAsciiString(slice, size);
        }
        ;
        break;
      case EBMLId.FileData:
        {
          if (!this.currentAttachedFile)
            break;
          this.currentAttachedFile.fileData = readBytes(slice, size);
        }
        ;
        break;
      case EBMLId.FileDescription:
        {
          if (!this.currentAttachedFile)
            break;
          this.currentAttachedFile.fileDescription = readUnicodeString(slice, size);
        }
        ;
        break;
      case EBMLId.ContentEncodings:
        {
          const track = this.currentTrack;
          if (!track)
            break;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          track.decodingInstructions.sort((a, b) => b.order - a.order);
        }
        ;
        break;
      case EBMLId.ContentEncoding:
        {
          const track = this.currentTrack;
          if (!track)
            break;
          const instruction = {
            order: 0,
            scope: ContentEncodingScope.Block,
            data: null
          };
          this.currentDecodingInstruction = instruction;
          this.readContiguousElements(slice.slice(dataStartPos, size));
          if (instruction.data) {
            track.decodingInstructions.push(instruction);
          }
          this.currentDecodingInstruction = null;
        }
        ;
        break;
      case EBMLId.ContentEncodingOrder:
        {
          if (!this.currentDecodingInstruction)
            break;
          this.currentDecodingInstruction.order = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.ContentEncodingScope:
        {
          if (!this.currentDecodingInstruction)
            break;
          this.currentDecodingInstruction.scope = size === 0 ? ContentEncodingScope.Block : readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.ContentCompression:
        {
          if (!this.currentDecodingInstruction)
            break;
          this.currentDecodingInstruction.data = {
            type: "decompress",
            algorithm: ContentCompAlgo.Zlib,
            settings: null
          };
          this.readContiguousElements(slice.slice(dataStartPos, size));
        }
        ;
        break;
      case EBMLId.ContentCompAlgo:
        {
          if (this.currentDecodingInstruction?.data?.type !== "decompress")
            break;
          this.currentDecodingInstruction.data.algorithm = readUnsignedInt(slice, size);
        }
        ;
        break;
      case EBMLId.ContentCompSettings:
        {
          if (this.currentDecodingInstruction?.data?.type !== "decompress")
            break;
          this.currentDecodingInstruction.data.settings = readBytes(slice, size);
        }
        ;
        break;
      case EBMLId.ContentEncryption:
        {
          if (!this.currentDecodingInstruction)
            break;
          this.currentDecodingInstruction.data = {
            type: "decrypt"
          };
        }
        ;
        break;
    }
    slice.filePos = dataStartPos + size;
    return true;
  }
  decodeBlockData(track, rawData) {
    assert(track.decodingInstructions.length > 0);
    let currentData = rawData;
    for (const instruction of track.decodingInstructions) {
      assert(instruction.data);
      switch (instruction.data.type) {
        case "decompress":
          {
            switch (instruction.data.algorithm) {
              case ContentCompAlgo.HeaderStripping:
                {
                  if (instruction.data.settings && instruction.data.settings.length > 0) {
                    const prefix = instruction.data.settings;
                    const newData = new Uint8Array(prefix.length + currentData.length);
                    newData.set(prefix, 0);
                    newData.set(currentData, prefix.length);
                    currentData = newData;
                  }
                }
                ;
                break;
              default:
                {
                }
                ;
            }
          }
          ;
          break;
        default:
          {
          }
          ;
      }
    }
    return currentData;
  }
  processTagValue(name, value) {
    if (!this.currentSegment?.metadataTags)
      return;
    const metadataTags = this.currentSegment.metadataTags;
    metadataTags.raw ??= {};
    metadataTags.raw[name] ??= value;
    if (typeof value === "string") {
      switch (name.toLowerCase()) {
        case "title":
          {
            metadataTags.title ??= value;
          }
          ;
          break;
        case "description":
          {
            metadataTags.description ??= value;
          }
          ;
          break;
        case "artist":
          {
            metadataTags.artist ??= value;
          }
          ;
          break;
        case "album":
          {
            metadataTags.album ??= value;
          }
          ;
          break;
        case "album_artist":
          {
            metadataTags.albumArtist ??= value;
          }
          ;
          break;
        case "genre":
          {
            metadataTags.genre ??= value;
          }
          ;
          break;
        case "bpm":
          {
            const bpm = Number.parseInt(value, 10);
            if (Number.isInteger(bpm) && bpm > 0) {
              metadataTags.beatsPerMinute ??= bpm;
            }
          }
          ;
          break;
        case "comment":
          {
            metadataTags.comment ??= value;
          }
          ;
          break;
        case "lyrics":
          {
            metadataTags.lyrics ??= value;
          }
          ;
          break;
        case "date":
          {
            const date = parseIsoSuffix(value);
            if (date) {
              metadataTags.date ??= date;
            }
          }
          ;
          break;
        case "track_number":
        case "part_number":
          {
            const parts = value.split("/");
            const trackNum = Number.parseInt(parts[0], 10);
            const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
            if (Number.isInteger(trackNum) && trackNum > 0) {
              metadataTags.trackNumber ??= trackNum;
            }
            if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
              metadataTags.tracksTotal ??= tracksTotal;
            }
          }
          ;
          break;
        case "disc_number":
        case "disc":
          {
            const discParts = value.split("/");
            const discNum = Number.parseInt(discParts[0], 10);
            const discsTotal = discParts[1] && Number.parseInt(discParts[1], 10);
            if (Number.isInteger(discNum) && discNum > 0) {
              metadataTags.discNumber ??= discNum;
            }
            if (discsTotal && Number.isInteger(discsTotal) && discsTotal > 0) {
              metadataTags.discsTotal ??= discsTotal;
            }
          }
          ;
          break;
      }
    }
  }
  getDurationFromMetadata(segment) {
    if (segment.duration <= 0) {
      return null;
    }
    const minCodecDelay = Math.min(...segment.tracks.map((x) => x.codecDelay));
    return (segment.duration - minCodecDelay) / segment.timestampFactor;
  }
};
var MatroskaTrackBacking = class {
  constructor(internalTrack) {
    this.internalTrack = internalTrack;
    this.packetToClusterLocation = /* @__PURE__ */ new WeakMap();
  }
  getNumber() {
    const demuxer = this.internalTrack.demuxer;
    const trackType = this.internalTrack.trackBacking.getType();
    let number = 0;
    for (const segment of demuxer.segments) {
      for (const track of segment.tracks) {
        if (track.trackBacking.getType() === trackType) {
          number++;
        }
        if (track === this.internalTrack) {
          return number;
        }
      }
    }
    assert(false);
  }
  getCodec() {
    throw new Error("Not implemented on base class.");
  }
  getInternalCodecId() {
    return this.internalTrack.codecId;
  }
  getName() {
    return this.internalTrack.name;
  }
  getLanguageCode() {
    return this.internalTrack.languageCode;
  }
  getTimeResolution() {
    return this.internalTrack.segment.timestampFactor;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getDisposition() {
    return this.internalTrack.disposition;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    return this.internalTrack.demuxer.getDurationFromMetadata(this.internalTrack.segment);
  }
  async getLiveRefreshInterval() {
    return null;
  }
  async getFirstPacket(options) {
    return this.performClusterLookup(
      null,
      (cluster) => {
        const trackData = cluster.trackData.get(this.internalTrack.id);
        if (trackData) {
          return {
            blockIndex: 0,
            correctBlockFound: true
          };
        }
        return {
          blockIndex: -1,
          correctBlockFound: false
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the cues
      Infinity,
      options
    );
  }
  intoTimescale(timestamp) {
    return roundIfAlmostInteger(timestamp * this.internalTrack.segment.timestampFactor) + this.internalTrack.codecDelay;
  }
  async getPacket(timestamp, options) {
    const timestampInTimescale = this.intoTimescale(timestamp);
    return this.performClusterLookup(null, (cluster) => {
      const trackData = cluster.trackData.get(this.internalTrack.id);
      if (!trackData) {
        return { blockIndex: -1, correctBlockFound: false };
      }
      const index = binarySearchLessOrEqual(trackData.presentationTimestamps, timestampInTimescale, (x) => x.timestamp);
      const blockIndex = index !== -1 ? trackData.presentationTimestamps[index].blockIndex : -1;
      const correctBlockFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
      return { blockIndex, correctBlockFound };
    }, timestampInTimescale, timestampInTimescale, options);
  }
  async getNextPacket(packet, options) {
    const locationInCluster = this.packetToClusterLocation.get(packet);
    if (locationInCluster === void 0) {
      throw new Error("Packet was not created from this track.");
    }
    return this.performClusterLookup(
      locationInCluster.cluster,
      (cluster) => {
        if (cluster === locationInCluster.cluster) {
          const trackData = cluster.trackData.get(this.internalTrack.id);
          if (locationInCluster.blockIndex + 1 < trackData.blocks.length) {
            return {
              blockIndex: locationInCluster.blockIndex + 1,
              correctBlockFound: true
            };
          }
        } else {
          const trackData = cluster.trackData.get(this.internalTrack.id);
          if (trackData) {
            return {
              blockIndex: 0,
              correctBlockFound: true
            };
          }
        }
        return {
          blockIndex: -1,
          correctBlockFound: false
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the cues
      Infinity,
      options
    );
  }
  async getKeyPacket(timestamp, options) {
    const timestampInTimescale = this.intoTimescale(timestamp);
    return this.performClusterLookup(null, (cluster) => {
      const trackData = cluster.trackData.get(this.internalTrack.id);
      if (!trackData) {
        return { blockIndex: -1, correctBlockFound: false };
      }
      const index = findLastIndex(trackData.presentationTimestamps, (x) => {
        const block = trackData.blocks[x.blockIndex];
        return block.isKeyFrame && x.timestamp <= timestampInTimescale;
      });
      const blockIndex = index !== -1 ? trackData.presentationTimestamps[index].blockIndex : -1;
      const correctBlockFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
      return { blockIndex, correctBlockFound };
    }, timestampInTimescale, timestampInTimescale, options, true);
  }
  async getNextKeyPacket(packet, options) {
    const locationInCluster = this.packetToClusterLocation.get(packet);
    if (locationInCluster === void 0) {
      throw new Error("Packet was not created from this track.");
    }
    return this.performClusterLookup(
      locationInCluster.cluster,
      (cluster) => {
        if (cluster === locationInCluster.cluster) {
          const trackData = cluster.trackData.get(this.internalTrack.id);
          for (let i = locationInCluster.blockIndex + 1; i < trackData.blocks.length; i++) {
            if (trackData.blocks[i].isKeyFrame) {
              return {
                blockIndex: i,
                correctBlockFound: true
              };
            }
          }
        } else {
          const trackData = cluster.trackData.get(this.internalTrack.id);
          if (trackData && trackData.firstKeyFrameTimestamp !== null) {
            const keyFrameIndex = trackData.blocks.findIndex((x) => x.isKeyFrame);
            assert(keyFrameIndex !== -1);
            return {
              blockIndex: keyFrameIndex,
              correctBlockFound: true
            };
          }
        }
        return {
          blockIndex: -1,
          correctBlockFound: false
        };
      },
      -Infinity,
      // Use -Infinity as a search timestamp to avoid using the cues
      Infinity,
      options
    );
  }
  async fetchPacketInCluster(cluster, blockIndex, options) {
    if (blockIndex === -1) {
      return null;
    }
    const trackData = cluster.trackData.get(this.internalTrack.id);
    const block = trackData.blocks[blockIndex];
    assert(block);
    if (!block.decoded) {
      block.data = this.internalTrack.demuxer.decodeBlockData(this.internalTrack, block.data);
      block.decoded = true;
    }
    if (!block.postProcessed) {
      if (this.internalTrack.info?.codec === "prores") {
        const hasFrameContainer = block.data.length >= 8 && block.data[4] === 105 && block.data[5] === 99 && block.data[6] === 112 && block.data[7] === 102;
        if (!hasFrameContainer) {
          const newData = new Uint8Array(block.data.length + 8);
          const newDataView = toDataView(newData);
          newDataView.setUint32(0, newData.length, false);
          newData[4] = 105;
          newData[5] = 99;
          newData[6] = 112;
          newData[7] = 102;
          newData.set(block.data, 8);
          block.data = newData;
        }
      }
      block.postProcessed = true;
    }
    const data = options.metadataOnly ? PLACEHOLDER_DATA : block.data;
    const { codecDelay, segment } = this.internalTrack;
    const timestamp = (block.timestamp - codecDelay) / segment.timestampFactor;
    const duration = block.duration / segment.timestampFactor;
    const sideData = {};
    if (block.mainAdditional && this.internalTrack.info?.type === "video" && this.internalTrack.info.alphaMode) {
      sideData.alpha = options.metadataOnly ? PLACEHOLDER_DATA : block.mainAdditional;
      sideData.alphaByteLength = block.mainAdditional.byteLength;
    }
    const packet = new EncodedPacket(data, block.isKeyFrame ? "key" : "delta", timestamp, duration, cluster.dataStartPos + blockIndex, block.data.byteLength, sideData);
    this.packetToClusterLocation.set(packet, { cluster, blockIndex });
    return packet;
  }
  /** Looks for a packet in the clusters while trying to load as few clusters as possible to retrieve it. */
  async performClusterLookup(startCluster, getMatchInCluster, searchTimestamp, latestTimestamp, options, requireKeyFrame = false) {
    const { demuxer, segment, cuePoints, clusterPositionCache } = this.internalTrack;
    let bestCluster = null;
    let bestBlockIndex = -1;
    if (startCluster) {
      const { blockIndex, correctBlockFound } = getMatchInCluster(startCluster);
      if (correctBlockFound) {
        return this.fetchPacketInCluster(startCluster, blockIndex, options);
      }
      if (blockIndex !== -1) {
        bestCluster = startCluster;
        bestBlockIndex = blockIndex;
      }
    }
    let cuePointIndex = binarySearchLessOrEqual(cuePoints, searchTimestamp, (x) => x.time);
    let positionCacheIndex = binarySearchLessOrEqual(clusterPositionCache, searchTimestamp, (x) => x.startTimestamp);
    let stopPos = Infinity;
    while (true) {
      while (cuePointIndex !== -1 && cuePoints[cuePointIndex].clusterPosition >= stopPos) {
        cuePointIndex--;
      }
      while (positionCacheIndex !== -1 && (clusterPositionCache[positionCacheIndex].elementStartPos >= stopPos || requireKeyFrame && !clusterPositionCache[positionCacheIndex].hasKeyFrame)) {
        positionCacheIndex--;
      }
      const lookupEntryPosition = Math.max(cuePoints[cuePointIndex]?.clusterPosition ?? 0, clusterPositionCache[positionCacheIndex]?.elementStartPos ?? 0) || null;
      let currentPos;
      let currentCluster = null;
      if (!startCluster) {
        currentPos = lookupEntryPosition ?? segment.clusterSeekStartPos;
      } else {
        if (lookupEntryPosition === null || startCluster.elementStartPos >= lookupEntryPosition) {
          currentPos = startCluster.elementEndPos;
          currentCluster = startCluster;
        } else {
          currentPos = lookupEntryPosition;
        }
      }
      const scanStartPos = currentCluster ? currentCluster.elementStartPos : currentPos;
      while ((segment.elementEndPos === null || currentPos <= segment.elementEndPos - MIN_HEADER_SIZE) && currentPos < stopPos) {
        if (currentCluster) {
          const trackData = currentCluster.trackData.get(this.internalTrack.id);
          if (trackData && trackData.startTimestamp > latestTimestamp) {
            break;
          }
          currentCluster = null;
        }
        const summary = segment.clusterSummaries.get(currentPos);
        if (summary && !summary.trackIds.has(this.internalTrack.id)) {
          currentPos = summary.elementEndPos;
          continue;
        }
        let slice = demuxer.reader.requestSliceRange(currentPos, MIN_HEADER_SIZE, MAX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const elementStartPos = currentPos;
        const elementHeader = readElementHeader(slice);
        if (segment.elementEndPos === null && elementHeader && LEVEL_0_EBML_IDS.includes(elementHeader.id)) {
          segment.elementEndPos = elementStartPos;
          break;
        }
        if (!elementHeader || !LEVEL_1_EBML_IDS.includes(elementHeader.id) && elementHeader.id !== EBMLId.Void) {
          const nextPos = await resync(demuxer.reader, elementStartPos + 1, LEVEL_1_EBML_IDS, Math.min(segment.elementEndPos ?? Infinity, elementStartPos + MAX_RESYNC_LENGTH));
          if (nextPos) {
            currentPos = nextPos;
            continue;
          } else {
            break;
          }
        }
        const id = elementHeader.id;
        let size = elementHeader.size;
        const dataStartPos = slice.filePos;
        if (id === EBMLId.Cluster) {
          currentCluster = await demuxer.readCluster(elementStartPos, segment);
          size = currentCluster.elementEndPos - dataStartPos;
          const { blockIndex, correctBlockFound } = getMatchInCluster(currentCluster);
          if (correctBlockFound) {
            return this.fetchPacketInCluster(currentCluster, blockIndex, options);
          }
          if (blockIndex !== -1) {
            bestCluster = currentCluster;
            bestBlockIndex = blockIndex;
          }
        }
        if (size === void 0) {
          assert(id !== EBMLId.Cluster);
          const nextElementPos = await searchForNextElementId(demuxer.reader, dataStartPos, LEVEL_0_AND_1_EBML_IDS, segment.elementEndPos);
          size = nextElementPos.pos - dataStartPos;
        }
        currentPos = dataStartPos + size;
      }
      if (lookupEntryPosition === null || bestCluster && bestCluster.elementStartPos >= lookupEntryPosition) {
        break;
      }
      stopPos = scanStartPos;
      startCluster = null;
    }
    if (bestCluster) {
      return this.fetchPacketInCluster(bestCluster, bestBlockIndex, options);
    }
    return null;
  }
};
var MatroskaVideoTrackBacking = class extends MatroskaTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
    this.decoderConfigPromise = null;
  }
  getType() {
    return "video";
  }
  getCodec() {
    return this.internalTrack.info.codec;
  }
  getCodedWidth() {
    return this.internalTrack.info.width;
  }
  getCodedHeight() {
    return this.internalTrack.info.height;
  }
  getSquarePixelWidth() {
    return this.internalTrack.info.squarePixelWidth;
  }
  getSquarePixelHeight() {
    return this.internalTrack.info.squarePixelHeight;
  }
  getTransformationMatrix() {
    const info = this.internalTrack.info;
    const linear = multiplyMatrices(scaleMatrix(info.horizontalScale, info.verticalScale), rotationMatrix(info.rotation));
    return centeredTransformationMatrix(linear, info.width, info.height);
  }
  async getColorSpace() {
    const decoderConfig = await this.getDecoderConfig();
    if (!decoderConfig) {
      return this.internalTrack.info.colorSpace;
    }
    return {
      primaries: decoderConfig.colorSpace?.primaries,
      transfer: decoderConfig.colorSpace?.transfer,
      matrix: decoderConfig.colorSpace?.matrix,
      fullRange: decoderConfig.colorSpace?.fullRange
    };
  }
  async canBeTransparent() {
    return this.internalTrack.info.alphaMode || this.internalTrack.info.codec === "prores" && (this.internalTrack.info.proresFormat === "ap4h" || this.internalTrack.info.proresFormat === "ap4x");
  }
  async getDecoderConfig() {
    if (!this.internalTrack.info.codec) {
      return null;
    }
    return this.decoderConfigPromise ??= (async () => {
      const codecPrivate = this.internalTrack.codecPrivate;
      let av1CodecInfo = this.internalTrack.info.codec === "av1" && codecPrivate ? extractAv1CodecInfoFromPacket(codecPrivate.subarray(4)) : null;
      let firstPacket = null;
      const needsPacketForAdditionalInfo = this.internalTrack.info.codec === "vp9" || this.internalTrack.info.codec === "av1" && !av1CodecInfo || this.internalTrack.info.codec === "prores" || this.internalTrack.info.codec === "avc" && !this.internalTrack.info.codecDescription || this.internalTrack.info.codec === "hevc" && !this.internalTrack.info.codecDescription;
      if (needsPacketForAdditionalInfo) {
        firstPacket = await this.getFirstPacket({});
      }
      if (this.internalTrack.info.codec === "av1" && firstPacket) {
        av1CodecInfo = extractAv1CodecInfoFromPacket(firstPacket.data);
      }
      const codecInfo = {
        width: this.internalTrack.info.width,
        height: this.internalTrack.info.height,
        codec: this.internalTrack.info.codec,
        codecDescription: this.internalTrack.info.codecDescription,
        colorSpace: this.internalTrack.info.colorSpace,
        avcType: 1,
        // We don't know better (or do we?) so just assume 'avc1'
        avcCodecInfo: this.internalTrack.info.codec === "avc" && firstPacket ? extractAvcDecoderConfigurationRecord(firstPacket.data) : null,
        hevcType: "hev1",
        // Matroska doesn't promise that parameter sets stay out of the blocks
        hevcCodecInfo: this.internalTrack.info.codec === "hevc" && firstPacket ? extractHevcDecoderConfigurationRecord(firstPacket.data) : null,
        vp9CodecInfo: this.internalTrack.info.codec === "vp9" && firstPacket ? extractVp9CodecInfoFromPacket(firstPacket.data) : null,
        av1CodecInfo,
        proresCodecInfo: this.internalTrack.info.codec === "prores" && firstPacket ? extractProresCodecInfoFromPacket(firstPacket.data) : null,
        proresFormat: this.internalTrack.info.proresFormat
      };
      if (!colorSpaceIsComplete(this.internalTrack.info.colorSpace)) {
        const colorSpace = extractColorSpace(codecInfo);
        this.internalTrack.info.colorSpace.primaries ??= colorSpace.primaries;
        this.internalTrack.info.colorSpace.transfer ??= colorSpace.transfer;
        this.internalTrack.info.colorSpace.matrix ??= colorSpace.matrix;
        this.internalTrack.info.colorSpace.fullRange ??= colorSpace.fullRange;
      }
      const config = {
        codec: extractVideoCodecString(codecInfo),
        codedWidth: this.internalTrack.info.width,
        codedHeight: this.internalTrack.info.height,
        description: this.internalTrack.info.codecDescription ?? void 0,
        colorSpace: this.internalTrack.info.colorSpace
      };
      if (this.internalTrack.info.width !== this.internalTrack.info.squarePixelWidth || this.internalTrack.info.height !== this.internalTrack.info.squarePixelHeight) {
        config.displayAspectWidth = this.internalTrack.info.squarePixelWidth;
        config.displayAspectHeight = this.internalTrack.info.squarePixelHeight;
      }
      return config;
    })();
  }
};
var MatroskaAudioTrackBacking = class extends MatroskaTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
    this.decoderConfigPromise = null;
  }
  getType() {
    return "audio";
  }
  getCodec() {
    return this.internalTrack.info.codec;
  }
  getNumberOfChannels() {
    return this.internalTrack.info.numberOfChannels;
  }
  getSampleRate() {
    return this.internalTrack.info.sampleRate;
  }
  async getDecoderConfig() {
    if (!this.internalTrack.info.codec) {
      return null;
    }
    return this.decoderConfigPromise ??= (async () => {
      if (this.internalTrack.info.codec === "dts" && !this.internalTrack.info.dtsFormat) {
        const firstPacket = await this.getFirstPacket({});
        this.internalTrack.info.dtsFormat = firstPacket && extractDtsFourCcFromPacket(firstPacket.data);
      }
      return {
        codec: extractAudioCodecString({
          codec: this.internalTrack.info.codec,
          codecDescription: this.internalTrack.info.codecDescription,
          aacCodecInfo: this.internalTrack.info.aacCodecInfo,
          dtsFormat: this.internalTrack.info.dtsFormat
        }),
        numberOfChannels: this.internalTrack.info.numberOfChannels,
        sampleRate: this.internalTrack.info.sampleRate,
        description: this.internalTrack.info.codecDescription ?? void 0
      };
    })();
  }
};

// node_modules/mediabunny/dist/modules/src/id3.js
var Id3V2HeaderFlags;
(function(Id3V2HeaderFlags2) {
  Id3V2HeaderFlags2[Id3V2HeaderFlags2["Unsynchronisation"] = 128] = "Unsynchronisation";
  Id3V2HeaderFlags2[Id3V2HeaderFlags2["ExtendedHeader"] = 64] = "ExtendedHeader";
  Id3V2HeaderFlags2[Id3V2HeaderFlags2["ExperimentalIndicator"] = 32] = "ExperimentalIndicator";
  Id3V2HeaderFlags2[Id3V2HeaderFlags2["Footer"] = 16] = "Footer";
})(Id3V2HeaderFlags || (Id3V2HeaderFlags = {}));
var Id3V2TextEncoding;
(function(Id3V2TextEncoding2) {
  Id3V2TextEncoding2[Id3V2TextEncoding2["ISO_8859_1"] = 0] = "ISO_8859_1";
  Id3V2TextEncoding2[Id3V2TextEncoding2["UTF_16_WITH_BOM"] = 1] = "UTF_16_WITH_BOM";
  Id3V2TextEncoding2[Id3V2TextEncoding2["UTF_16_BE_NO_BOM"] = 2] = "UTF_16_BE_NO_BOM";
  Id3V2TextEncoding2[Id3V2TextEncoding2["UTF_8"] = 3] = "UTF_8";
})(Id3V2TextEncoding || (Id3V2TextEncoding = {}));
var ID3_V1_TAG_SIZE = 128;
var ID3_V2_HEADER_SIZE = 10;
var ID3_V1_GENRES = [
  "Blues",
  "Classic rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-hop",
  "Jazz",
  "Metal",
  "New age",
  "Oldies",
  "Other",
  "Pop",
  "Rhythm and blues",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death metal",
  "Pranks",
  "Soundtrack",
  "Euro-techno",
  "Ambient",
  "Trip-hop",
  "Vocal",
  "Jazz & funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound clip",
  "Gospel",
  "Noise",
  "Alternative rock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental pop",
  "Instrumental rock",
  "Ethnic",
  "Gothic",
  "Darkwave",
  "Techno-industrial",
  "Electronic",
  "Pop-folk",
  "Eurodance",
  "Dream",
  "Southern rock",
  "Comedy",
  "Cult",
  "Gangsta",
  "Top 40",
  "Christian rap",
  "Pop/funk",
  "Jungle music",
  "Native US",
  "Cabaret",
  "New wave",
  "Psychedelic",
  "Rave",
  "Showtunes",
  "Trailer",
  "Lo-fi",
  "Tribal",
  "Acid punk",
  "Acid jazz",
  "Polka",
  "Retro",
  "Musical",
  "Rock 'n' roll",
  "Hard rock",
  "Folk",
  "Folk rock",
  "National folk",
  "Swing",
  "Fast fusion",
  "Bebop",
  "Latin",
  "Revival",
  "Celtic",
  "Bluegrass",
  "Avantgarde",
  "Gothic rock",
  "Progressive rock",
  "Psychedelic rock",
  "Symphonic rock",
  "Slow rock",
  "Big band",
  "Chorus",
  "Easy listening",
  "Acoustic",
  "Humour",
  "Speech",
  "Chanson",
  "Opera",
  "Chamber music",
  "Sonata",
  "Symphony",
  "Booty bass",
  "Primus",
  "Porn groove",
  "Satire",
  "Slow jam",
  "Club",
  "Tango",
  "Samba",
  "Folklore",
  "Ballad",
  "Power ballad",
  "Rhythmic Soul",
  "Freestyle",
  "Duet",
  "Punk rock",
  "Drum solo",
  "A cappella",
  "Euro-house",
  "Dance hall",
  "Goa music",
  "Drum & bass",
  "Club-house",
  "Hardcore techno",
  "Terror",
  "Indie",
  "Britpop",
  "Negerpunk",
  "Polsk punk",
  "Beat",
  "Christian gangsta rap",
  "Heavy metal",
  "Black metal",
  "Crossover",
  "Contemporary Christian",
  "Christian rock",
  "Merengue",
  "Salsa",
  "Thrash metal",
  "Anime",
  "Jpop",
  "Synthpop",
  "Christmas",
  "Art rock",
  "Baroque",
  "Bhangra",
  "Big beat",
  "Breakbeat",
  "Chillout",
  "Downtempo",
  "Dub",
  "EBM",
  "Eclectic",
  "Electro",
  "Electroclash",
  "Emo",
  "Experimental",
  "Garage",
  "Global",
  "IDM",
  "Illbient",
  "Industro-Goth",
  "Jam Band",
  "Krautrock",
  "Leftfield",
  "Lounge",
  "Math rock",
  "New romantic",
  "Nu-breakz",
  "Post-punk",
  "Post-rock",
  "Psytrance",
  "Shoegaze",
  "Space rock",
  "Trop rock",
  "World music",
  "Neoclassical",
  "Audiobook",
  "Audio theatre",
  "Neue Deutsche Welle",
  "Podcast",
  "Indie rock",
  "G-Funk",
  "Dubstep",
  "Garage rock",
  "Psybient"
];
var parseId3V1Tag = (slice, tags) => {
  const startPos = slice.filePos;
  tags.raw ??= {};
  tags.raw["TAG"] ??= readBytes(slice, ID3_V1_TAG_SIZE - 3);
  slice.filePos = startPos;
  const title = readId3V1String(slice, 30);
  if (title)
    tags.title ??= title;
  const artist = readId3V1String(slice, 30);
  if (artist)
    tags.artist ??= artist;
  const album = readId3V1String(slice, 30);
  if (album)
    tags.album ??= album;
  const yearText = readId3V1String(slice, 4);
  const year = Number.parseInt(yearText, 10);
  if (Number.isInteger(year) && year > 0) {
    tags.date ??= createUtcDate(year);
  }
  const commentBytes = readBytes(slice, 30);
  let comment;
  if (commentBytes[28] === 0 && commentBytes[29] !== 0) {
    const trackNum = commentBytes[29];
    if (trackNum > 0) {
      tags.trackNumber ??= trackNum;
    }
    slice.skip(-30);
    comment = readId3V1String(slice, 28);
    slice.skip(2);
  } else {
    slice.skip(-30);
    comment = readId3V1String(slice, 30);
  }
  if (comment)
    tags.comment ??= comment;
  const genreIndex = readU8(slice);
  if (genreIndex < ID3_V1_GENRES.length) {
    tags.genre ??= ID3_V1_GENRES[genreIndex];
  }
};
var readId3V1String = (slice, length) => {
  const bytes = readBytes(slice, length);
  const endIndex = coalesceIndex(bytes.indexOf(0), bytes.length);
  const relevantBytes = bytes.subarray(0, endIndex);
  let str = "";
  for (let i = 0; i < relevantBytes.length; i++) {
    str += String.fromCharCode(relevantBytes[i]);
  }
  return str.trimEnd();
};
var skipId3V2Tags = async (reader, startPos) => {
  let currentPos = startPos;
  while (true) {
    let slice = reader.requestSlice(currentPos, ID3_V2_HEADER_SIZE);
    if (isThenable(slice))
      slice = await slice;
    if (!slice) {
      return currentPos;
    }
    const id3V2Header = readId3V2Header(slice);
    if (!id3V2Header) {
      return currentPos;
    }
    currentPos = slice.filePos + id3V2Header.size;
  }
};
var readId3V2Header = (slice) => {
  const startPos = slice.filePos;
  const tag = readAscii(slice, 3);
  const majorVersion = readU8(slice);
  const revision = readU8(slice);
  const flags = readU8(slice);
  const sizeRaw = readU32Be(slice);
  if (tag !== "ID3" || majorVersion === 255 || revision === 255 || (sizeRaw & 2155905152) !== 0) {
    slice.filePos = startPos;
    return null;
  }
  let size = decodeSynchsafe(sizeRaw);
  if (majorVersion === 4 && flags & Id3V2HeaderFlags.Footer) {
    size += ID3_V2_HEADER_SIZE;
  }
  return { majorVersion, revision, flags, size };
};
var parseId3V2Tag = (slice, header, tags) => {
  if (![2, 3, 4].includes(header.majorVersion)) {
    Logging._warn(`Unsupported ID3v2 major version: ${header.majorVersion}`);
    return;
  }
  if (header.majorVersion === 2 && header.flags & Id3V2HeaderFlags.ExtendedHeader) {
    Logging._warn("Skipping compressed ID3v2.2 tag");
    return;
  }
  const dataSize = header.majorVersion === 4 && header.flags & Id3V2HeaderFlags.Footer ? header.size - ID3_V2_HEADER_SIZE : header.size;
  const bytes = readBytes(slice, dataSize);
  const reader = new Id3V2Reader(header, bytes);
  if (header.flags & Id3V2HeaderFlags.Unsynchronisation && header.majorVersion <= 3) {
    reader.ununsynchronizeAll();
  }
  if (header.flags & Id3V2HeaderFlags.ExtendedHeader) {
    if (reader.bytes.length < 4) {
      return;
    }
    const extendedHeaderSize = reader.readU32();
    if (header.majorVersion === 3) {
      reader.pos += extendedHeaderSize;
    } else {
      reader.pos += decodeSynchsafe(extendedHeaderSize) - 4;
    }
  }
  let year = null;
  let dayAndMonth = null;
  while (reader.pos <= reader.bytes.length - reader.frameHeaderSize()) {
    const frame = reader.readId3V2Frame();
    if (!frame) {
      break;
    }
    const nextFramePos = Math.min(reader.pos + frame.size, reader.bytes.length);
    let frameEndPos = nextFramePos;
    let frameEncrypted = false;
    let frameCompressed = false;
    let frameUnsynchronized = false;
    let frameHasGroupingIdentity = false;
    let frameHasDataLengthIndicator = false;
    if (header.majorVersion === 3) {
      frameEncrypted = !!(frame.flags & 1 << 6);
      frameCompressed = !!(frame.flags & 1 << 7);
      frameHasGroupingIdentity = !!(frame.flags & 1 << 5);
    } else if (header.majorVersion === 4) {
      frameHasGroupingIdentity = !!(frame.flags & 1 << 6);
      frameEncrypted = !!(frame.flags & 1 << 2);
      frameCompressed = !!(frame.flags & 1 << 3);
      frameUnsynchronized = !!(frame.flags & 1 << 1) || !!(header.flags & Id3V2HeaderFlags.Unsynchronisation);
      frameHasDataLengthIndicator = !!(frame.flags & 1 << 0);
    }
    if (frameEncrypted) {
      Logging._warn(`Skipping encrypted ID3v2 frame ${frame.id}`);
      reader.pos = nextFramePos;
      continue;
    }
    if (frameCompressed) {
      Logging._warn(`Skipping compressed ID3v2 frame ${frame.id}`);
      reader.pos = nextFramePos;
      continue;
    }
    if (frameHasGroupingIdentity) {
      reader.pos += 1;
    }
    if (frameHasDataLengthIndicator) {
      reader.pos += 4;
    }
    if (frameUnsynchronized) {
      frameEndPos = reader.ununsynchronizeRegion(reader.pos, frameEndPos);
    }
    const frameStartPos = reader.pos;
    const ensureFrameHasBytes = (byteCount) => {
      if (frameEndPos - reader.pos < byteCount) {
        throw new Error(`Invalid ID3v2 ${frame.id} frame: too short.`);
      }
    };
    tags.raw ??= {};
    if (frame.id === "TXXX" || frame.id === "TXX") {
      const txxx = tags.raw[frame.id] ??= {};
      ensureFrameHasBytes(1);
      const encoding = reader.readId3V2TextEncoding();
      const description = reader.readId3V2Text(encoding, frameEndPos);
      const value = reader.readId3V2Text(encoding, frameEndPos);
      txxx[description] ??= value;
    } else if (frame.id[0] === "T") {
      tags.raw[frame.id] ??= reader.readId3V2EncodingAndText(frameEndPos);
    } else {
      const bytes2 = reader.readBytes(frameEndPos - reader.pos);
      const existing = tags.raw[frame.id];
      if (existing instanceof Uint8Array) {
        tags.raw[frame.id] = [existing, bytes2];
      } else if (Array.isArray(existing)) {
        existing.push(bytes2);
      } else {
        tags.raw[frame.id] ??= bytes2;
      }
    }
    reader.pos = frameStartPos;
    switch (frame.id) {
      case "TIT2":
      case "TT2":
        {
          tags.title ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TIT3":
      case "TT3":
        {
          tags.description ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TPE1":
      case "TP1":
        {
          tags.artist ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TALB":
      case "TAL":
        {
          tags.album ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TPE2":
      case "TP2":
        {
          tags.albumArtist ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TRCK":
      case "TRK":
        {
          const trackText = reader.readId3V2EncodingAndText(frameEndPos);
          const parts = trackText.split("/");
          const trackNum = Number.parseInt(parts[0], 10);
          const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
          if (Number.isInteger(trackNum) && trackNum > 0) {
            tags.trackNumber ??= trackNum;
          }
          if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
            tags.tracksTotal ??= tracksTotal;
          }
        }
        ;
        break;
      case "TPOS":
      case "TPA":
        {
          const discText = reader.readId3V2EncodingAndText(frameEndPos);
          const parts = discText.split("/");
          const discNum = Number.parseInt(parts[0], 10);
          const discsTotal = parts[1] && Number.parseInt(parts[1], 10);
          if (Number.isInteger(discNum) && discNum > 0) {
            tags.discNumber ??= discNum;
          }
          if (discsTotal && Number.isInteger(discsTotal) && discsTotal > 0) {
            tags.discsTotal ??= discsTotal;
          }
        }
        ;
        break;
      case "TCON":
      case "TCO":
        {
          const genreText = reader.readId3V2EncodingAndText(frameEndPos);
          let match = /^\((\d+)\)/.exec(genreText);
          if (match) {
            const genreNumber = Number.parseInt(match[1]);
            if (ID3_V1_GENRES[genreNumber] !== void 0) {
              tags.genre ??= ID3_V1_GENRES[genreNumber];
              break;
            }
          }
          match = /^\d+$/.exec(genreText);
          if (match) {
            const genreNumber = Number.parseInt(match[0]);
            if (ID3_V1_GENRES[genreNumber] !== void 0) {
              tags.genre ??= ID3_V1_GENRES[genreNumber];
              break;
            }
          }
          tags.genre ??= genreText;
        }
        ;
        break;
      case "TDRC":
        {
          const date = parseIsoSuffix(reader.readId3V2EncodingAndText(frameEndPos));
          if (date) {
            tags.date ??= date;
          }
        }
        ;
        break;
      case "TYER":
      case "TYE":
        {
          const yearText = reader.readId3V2EncodingAndText(frameEndPos);
          const parsedYear = Number.parseInt(yearText, 10);
          if (Number.isInteger(parsedYear)) {
            year ??= parsedYear;
          }
        }
        ;
        break;
      case "TDAT":
      case "TDA":
        {
          dayAndMonth ??= reader.readId3V2EncodingAndText(frameEndPos);
        }
        ;
        break;
      case "TBPM":
      case "TBP":
        {
          const bpmText = reader.readId3V2EncodingAndText(frameEndPos);
          const bpm = Number.parseInt(bpmText, 10);
          if (Number.isInteger(bpm) && bpm > 0) {
            tags.beatsPerMinute ??= bpm;
          }
        }
        ;
        break;
      case "USLT":
      case "ULT":
        {
          ensureFrameHasBytes(4);
          const encoding = reader.readId3V2TextEncoding();
          reader.pos += 3;
          reader.readId3V2Text(encoding, frameEndPos);
          tags.lyrics ??= reader.readId3V2Text(encoding, frameEndPos);
        }
        ;
        break;
      case "COMM":
      case "COM":
        {
          ensureFrameHasBytes(4);
          const encoding = reader.readId3V2TextEncoding();
          reader.pos += 3;
          const description = reader.readId3V2Text(encoding, frameEndPos);
          if (description === "") {
            tags.comment ??= reader.readId3V2Text(encoding, frameEndPos);
          } else {
          }
        }
        ;
        break;
      case "APIC":
      case "PIC":
        {
          ensureFrameHasBytes(1);
          const encoding = reader.readId3V2TextEncoding();
          let mimeType;
          if (header.majorVersion === 2) {
            ensureFrameHasBytes(3);
            const imageFormat = reader.readAscii(3);
            mimeType = imageFormat === "PNG" ? "image/png" : imageFormat === "JPG" ? "image/jpeg" : "image/*";
          } else {
            mimeType = reader.readId3V2Text(Id3V2TextEncoding.ISO_8859_1, frameEndPos);
          }
          ensureFrameHasBytes(1);
          const pictureType = reader.readU8();
          const description = reader.readId3V2Text(encoding, frameEndPos).trimEnd();
          const imageDataSize = frameEndPos - reader.pos;
          if (imageDataSize >= 0) {
            const imageData = reader.readBytes(imageDataSize);
            if (!tags.images)
              tags.images = [];
            tags.images.push({
              data: imageData,
              mimeType,
              kind: pictureType === 3 ? "coverFront" : pictureType === 4 ? "coverBack" : "unknown",
              description
            });
          }
        }
        ;
        break;
      default:
        {
          reader.pos += frame.size;
        }
        ;
        break;
    }
    reader.pos = nextFramePos;
  }
  if (year !== null) {
    let date = createUtcDate(year);
    const dayAndMonthMatch = /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])$/.exec(dayAndMonth ?? "");
    if (dayAndMonthMatch) {
      const day = Number(dayAndMonthMatch[1]);
      const fullDate = createUtcDate(year, Number(dayAndMonthMatch[2]) - 1, day);
      if (fullDate.getUTCDate() === day) {
        date = fullDate;
      }
    }
    if (!Number.isNaN(date.getTime())) {
      tags.date ??= date;
    }
  }
};
var Id3V2Reader = class {
  constructor(header, bytes) {
    this.header = header;
    this.bytes = bytes;
    this.pos = 0;
    this.ownsBytes = false;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  frameHeaderSize() {
    return this.header.majorVersion === 2 ? 6 : 10;
  }
  ununsynchronizeAll() {
    const newBytes = new Uint8Array(this.bytes.length);
    let newLength = 0;
    for (let i = 0; i < this.bytes.length; i++) {
      const value1 = this.bytes[i];
      newBytes[newLength++] = value1;
      if (value1 === 255 && i !== this.bytes.length - 1) {
        const value2 = this.bytes[i + 1];
        if (value2 === 0) {
          i++;
        }
      }
    }
    this.bytes = newBytes.subarray(0, newLength);
    this.view = toDataView(this.bytes);
  }
  ununsynchronizeRegion(start, end) {
    if (!this.ownsBytes) {
      this.bytes = this.bytes.slice();
      this.view = toDataView(this.bytes);
      this.ownsBytes = true;
    }
    let writePos = start;
    for (let i = start; i < end; i++) {
      const value1 = this.bytes[i];
      this.bytes[writePos++] = value1;
      if (value1 === 255 && i !== end - 1) {
        const value2 = this.bytes[i + 1];
        if (value2 === 0) {
          i++;
        }
      }
    }
    return writePos;
  }
  readBytes(length) {
    const slice = this.bytes.subarray(this.pos, this.pos + length);
    this.pos += length;
    return slice;
  }
  readU8() {
    const value = this.view.getUint8(this.pos);
    this.pos += 1;
    return value;
  }
  readU16() {
    const value = this.view.getUint16(this.pos, false);
    this.pos += 2;
    return value;
  }
  readU24() {
    const high = this.view.getUint16(this.pos, false);
    const low = this.view.getUint8(this.pos + 2);
    this.pos += 3;
    return high * 256 + low;
  }
  readU32() {
    const value = this.view.getUint32(this.pos, false);
    this.pos += 4;
    return value;
  }
  readAscii(length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.view.getUint8(this.pos + i));
    }
    this.pos += length;
    return str;
  }
  readId3V2Frame() {
    if (this.header.majorVersion === 2) {
      const id = this.readAscii(3);
      if (id === "\0\0\0") {
        return null;
      }
      const size = this.readU24();
      return { id, size, flags: 0 };
    } else {
      const id = this.readAscii(4);
      if (id === "\0\0\0\0") {
        return null;
      }
      const sizeRaw = this.readU32();
      const canBeSynchsafe = (sizeRaw & 2155905152) === 0;
      let size = this.header.majorVersion === 4 && canBeSynchsafe ? decodeSynchsafe(sizeRaw) : sizeRaw;
      const flags = this.readU16();
      const headerEndPos = this.pos;
      const isSizeValid = (size2) => {
        const nextPos = headerEndPos + size2;
        if (nextPos > this.bytes.length) {
          return false;
        }
        if (nextPos <= this.bytes.length - this.frameHeaderSize()) {
          this.pos = nextPos;
          const nextId = this.readAscii(4);
          if (nextId !== "\0\0\0\0" && !/[0-9A-Z]{4}/.test(nextId)) {
            return false;
          }
        }
        return true;
      };
      if (canBeSynchsafe && !isSizeValid(size)) {
        const otherSize = this.header.majorVersion === 4 ? sizeRaw : decodeSynchsafe(sizeRaw);
        if (isSizeValid(otherSize)) {
          size = otherSize;
        }
      }
      this.pos = headerEndPos;
      return { id, size, flags };
    }
  }
  readId3V2TextEncoding() {
    const number = this.readU8();
    if (number > 3) {
      throw new Error(`Unsupported text encoding: ${number}`);
    }
    return number;
  }
  readId3V2Text(encoding, until) {
    const startPos = this.pos;
    const data = this.readBytes(until - this.pos);
    switch (encoding) {
      case Id3V2TextEncoding.ISO_8859_1: {
        let str = "";
        for (let i = 0; i < data.length; i++) {
          const value = data[i];
          if (value === 0) {
            this.pos = startPos + i + 1;
            break;
          }
          str += String.fromCharCode(value);
        }
        return str;
      }
      case Id3V2TextEncoding.UTF_16_WITH_BOM: {
        if (data[0] === 255 && data[1] === 254) {
          const decoder = new TextDecoder("utf-16le");
          const endIndex = coalesceIndex(data.findIndex((x, i) => x === 0 && data[i + 1] === 0 && i % 2 === 0), data.length);
          this.pos = startPos + Math.min(endIndex + 2, data.length);
          return decoder.decode(data.subarray(2, endIndex));
        } else if (data[0] === 254 && data[1] === 255) {
          const decoder = new TextDecoder("utf-16be");
          const endIndex = coalesceIndex(data.findIndex((x, i) => x === 0 && data[i + 1] === 0 && i % 2 === 0), data.length);
          this.pos = startPos + Math.min(endIndex + 2, data.length);
          return decoder.decode(data.subarray(2, endIndex));
        } else if (data[0] === 0 && data[1] === 0) {
          this.pos = startPos + 2;
          return "";
        } else {
          const endIndex = coalesceIndex(data.findIndex((x) => x === 0), data.length);
          this.pos = startPos + Math.min(endIndex + 1, data.length);
          return textDecoder.decode(data.subarray(0, endIndex));
        }
      }
      case Id3V2TextEncoding.UTF_16_BE_NO_BOM: {
        const decoder = new TextDecoder("utf-16be");
        const endIndex = coalesceIndex(data.findIndex((x, i) => x === 0 && data[i + 1] === 0 && i % 2 === 0), data.length);
        this.pos = startPos + Math.min(endIndex + 2, data.length);
        return decoder.decode(data.subarray(0, endIndex));
      }
      case Id3V2TextEncoding.UTF_8: {
        const endIndex = coalesceIndex(data.findIndex((x) => x === 0), data.length);
        this.pos = startPos + Math.min(endIndex + 1, data.length);
        return textDecoder.decode(data.subarray(0, endIndex));
      }
    }
  }
  readId3V2EncodingAndText(until) {
    if (this.pos >= until) {
      return "";
    }
    const encoding = this.readId3V2TextEncoding();
    return this.readId3V2Text(encoding, until);
  }
};

// node_modules/mediabunny/dist/modules/src/mp3/mp3-reader.js
var readConfirmedMp3FrameHeader = async (reader, startPos, searchLength, ref) => {
  let currentPos = startPos;
  while (true) {
    const result = await readNextMp3FrameHeader(reader, currentPos, startPos + searchLength, ref);
    if (!result) {
      return null;
    }
    const { header } = result;
    const xingOffset = getXingOffset(header.mpegVersionId, header.channel);
    let xingSlice = reader.requestSlice(result.startPos + xingOffset, 4);
    if (isThenable(xingSlice))
      xingSlice = await xingSlice;
    if (xingSlice) {
      const word = readU32Be(xingSlice);
      if (word === XING || word === INFO) {
        return result;
      }
    }
    const frameEndPos = result.startPos + header.totalSize;
    if (frameEndPos === reader.fileSize) {
      return result;
    }
    if (frameEndPos + ID3_V1_TAG_SIZE === reader.fileSize) {
      let tagSlice = reader.requestSlice(frameEndPos, 3);
      if (isThenable(tagSlice))
        tagSlice = await tagSlice;
      if (tagSlice && readAscii(tagSlice, 3) === "TAG") {
        return result;
      }
    }
    const nextResult = await readNextMp3FrameHeader(reader, frameEndPos, frameEndPos + MP3_FRAME_HEADER_SIZE);
    if (nextResult && nextResult.header.channel === header.channel && nextResult.header.sampleRate === header.sampleRate) {
      return result;
    }
    currentPos = result.startPos + 1;
  }
};
var readNextMp3FrameHeader = async (reader, startPos, until, ref = null) => {
  const CHUNK_SIZE = 2 ** 16;
  let currentPos = startPos;
  while (until === null || currentPos < until) {
    const maxLength = until !== null ? Math.min(CHUNK_SIZE, until - currentPos) : CHUNK_SIZE;
    let slice = reader.requestSliceRange(currentPos, MP3_FRAME_HEADER_SIZE, maxLength);
    if (isThenable(slice))
      slice = await slice;
    if (!slice || slice.length < MP3_FRAME_HEADER_SIZE)
      break;
    while (slice.remainingLength >= MP3_FRAME_HEADER_SIZE) {
      const posBeforeRead = slice.filePos;
      const word = readU32Be(slice);
      const remainingBytes = reader.fileSize !== null ? reader.fileSize - currentPos : null;
      const result = readMp3FrameHeader(word, remainingBytes);
      if (result.header && (!ref || // This condition helps us recover malformed streams
      // https://stackoverflow.com/a/20884944
      result.header.sampleRate === ref.sampleRate && result.header.mpegVersionId === ref.mpegVersionId && result.header.layer === ref.layer && getMp3ChannelCount(result.header.channel) === getMp3ChannelCount(ref.channel))) {
        return { header: result.header, startPos: currentPos };
      }
      slice.filePos = posBeforeRead + result.bytesAdvanced;
      currentPos = slice.filePos;
    }
  }
  return null;
};

// node_modules/mediabunny/dist/modules/src/mp3/mp3-demuxer.js
var APE_TAG_FOOTER_SIZE = 32;
var Mp3Demuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.firstFrameHeader = null;
    this.firstFrameHeaderPos = null;
    this.xingFrameHeader = null;
    this.xingFrameHeaderPos = null;
    this.loadedSamples = [];
    this.metadataTags = null;
    this.xingData = null;
    this.trackBackings = [];
    this.readingMutex = new AsyncMutex();
    this.lastSampleLoaded = false;
    this.lastLoadedPos = 0;
    this.nextTimestampInSamples = 0;
    this.primingDelay = 0;
    this.reader = input2._reader;
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      while (!this.firstFrameHeader && !this.lastSampleLoaded) {
        await this.advanceReader();
      }
      if (!this.firstFrameHeader && this.xingFrameHeader) {
        this.firstFrameHeader = this.xingFrameHeader;
        this.firstFrameHeaderPos = this.xingFrameHeaderPos;
      }
      if (!this.firstFrameHeader) {
        throw new Error("No valid MP3 frame found.");
      }
      this.trackBackings = [new Mp3AudioTrackBacking(this)];
    })();
  }
  async advanceReader() {
    let result;
    if (this.lastLoadedPos === 0) {
      const startPos = await skipId3V2Tags(this.reader, 0);
      result = await readConfirmedMp3FrameHeader(this.reader, startPos, 4096, null);
    } else {
      result = await readNextMp3FrameHeader(this.reader, this.lastLoadedPos, this.lastLoadedPos + 2, this.firstFrameHeader);
      if (!result) {
        if (this.firstFrameHeader) {
          let slice2 = this.reader.requestSlice(this.lastLoadedPos, MP3_FRAME_HEADER_SIZE + 1);
          if (isThenable(slice2))
            slice2 = await slice2;
          if (slice2) {
            for (let i = 0; i < 2; i++) {
              slice2.filePos = this.lastLoadedPos + i;
              const { header: header2 } = readMp3FrameHeader(readU32Be(slice2), null);
              if (header2 && header2.sampleRate !== this.firstFrameHeader.sampleRate) {
                Logging._warn(`The sample rate changes mid-stream (from ${this.firstFrameHeader.sampleRate} Hz to ${header2.sampleRate} Hz), which isn't properly supported or handled by Mediabunny.`);
                this.lastSampleLoaded = true;
                return;
              }
            }
          }
        }
        const startPos = await skipId3V2Tags(this.reader, this.lastLoadedPos + 1);
        result = await readConfirmedMp3FrameHeader(this.reader, startPos, 2 ** 16, this.firstFrameHeader);
      }
    }
    if (!result) {
      this.lastSampleLoaded = true;
      return;
    }
    const header = result.header;
    this.lastLoadedPos = result.startPos + header.totalSize - 1;
    const xingOffset = getXingOffset(header.mpegVersionId, header.channel);
    let slice = this.reader.requestSlice(result.startPos + xingOffset, 4);
    if (isThenable(slice))
      slice = await slice;
    if (slice) {
      const word = readU32Be(slice);
      const isXing = word === XING || word === INFO;
      if (isXing) {
        if (!this.xingFrameHeader) {
          this.xingFrameHeader = header;
          this.xingFrameHeaderPos = result.startPos;
        }
        if (!this.xingData) {
          let xingDataSlice = this.reader.requestSlice(result.startPos + xingOffset + 4, 8);
          if (isThenable(xingDataSlice))
            xingDataSlice = await xingDataSlice;
          if (xingDataSlice) {
            const xingData = readBytes(xingDataSlice, 8);
            const view = toDataView(xingData);
            const flags = view.getUint32(0, false);
            this.xingData = {
              // LAME and FFmpeg write the same header with 'Info' in place of 'Xing' for CBR streams
              isVbr: word === XING,
              frameCount: flags & XingFlags.FrameCount ? view.getUint32(4, false) : null
            };
            const lameOffset = result.startPos + xingOffset + 8 + (flags & XingFlags.FrameCount ? 4 : 0) + (flags & XingFlags.FileSize ? 4 : 0) + (flags & XingFlags.Toc ? 100 : 0) + (flags & XingFlags.Quality ? 4 : 0);
            if (!this.firstFrameHeader && lameOffset + 24 <= result.startPos + header.totalSize) {
              let lameSlice = this.reader.requestSlice(lameOffset, 24);
              if (isThenable(lameSlice))
                lameSlice = await lameSlice;
              if (lameSlice) {
                const lame = readBytes(lameSlice, 24);
                const encoder = String.fromCharCode(...lame.subarray(0, 4));
                if (encoder === "LAME" || encoder === "Lavf" || encoder === "Lavc") {
                  this.primingDelay = (lame[21] << 4 | lame[22] >> 4) + MP3_DECODER_DELAY;
                  this.nextTimestampInSamples = -this.primingDelay;
                }
              }
            }
          }
        }
        return;
      }
    }
    let vbriSlice = header.layer === 1 ? this.reader.requestSlice(result.startPos + MP3_FRAME_HEADER_SIZE + 32, 18) : null;
    if (isThenable(vbriSlice))
      vbriSlice = await vbriSlice;
    if (vbriSlice) {
      const word = readU32Be(vbriSlice);
      const version = readU16Be(vbriSlice);
      if (word === VBRI && version === 1) {
        if (!this.xingFrameHeader) {
          this.xingFrameHeader = header;
          this.xingFrameHeaderPos = result.startPos;
        }
        if (!this.xingData) {
          vbriSlice.skip(8);
          const frameCount = readU32Be(vbriSlice);
          this.xingData = {
            isVbr: true,
            frameCount
          };
        }
        return;
      }
    }
    if (!this.firstFrameHeader) {
      this.firstFrameHeader = header;
      this.firstFrameHeaderPos = result.startPos;
    }
    const sampleDuration = header.audioSamplesInFrame / this.firstFrameHeader.sampleRate;
    const sample = {
      timestamp: this.nextTimestampInSamples / this.firstFrameHeader.sampleRate,
      duration: sampleDuration,
      dataStart: result.startPos,
      dataSize: header.totalSize
    };
    this.loadedSamples.push(sample);
    this.nextTimestampInSamples += header.audioSamplesInFrame;
    return;
  }
  async getMimeType() {
    return "audio/mpeg";
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.trackBackings;
  }
  async getMetadataTags() {
    const release = await this.readingMutex.acquire();
    try {
      await this.readMetadata();
      if (this.metadataTags) {
        return this.metadataTags;
      }
      this.metadataTags = {};
      let currentPos = 0;
      let id3V2HeaderFound = false;
      while (true) {
        let headerSlice = this.reader.requestSlice(currentPos, ID3_V2_HEADER_SIZE);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        if (!headerSlice)
          break;
        const id3V2Header = readId3V2Header(headerSlice);
        if (!id3V2Header) {
          break;
        }
        id3V2HeaderFound = true;
        let contentSlice = this.reader.requestSlice(headerSlice.filePos, id3V2Header.size);
        if (isThenable(contentSlice))
          contentSlice = await contentSlice;
        if (!contentSlice)
          break;
        parseId3V2Tag(contentSlice, id3V2Header, this.metadataTags);
        currentPos = headerSlice.filePos + id3V2Header.size;
      }
      if (!id3V2HeaderFound && this.reader.fileSize !== null && this.reader.fileSize >= ID3_V1_TAG_SIZE) {
        let slice = this.reader.requestSlice(this.reader.fileSize - ID3_V1_TAG_SIZE, ID3_V1_TAG_SIZE);
        if (isThenable(slice))
          slice = await slice;
        assert(slice);
        const tag = readAscii(slice, 3);
        if (tag === "TAG") {
          parseId3V1Tag(slice, this.metadataTags);
        }
      }
      return this.metadataTags;
    } finally {
      release();
    }
  }
};
var Mp3AudioTrackBacking = class {
  constructor(demuxer) {
    this.demuxer = demuxer;
  }
  getType() {
    return "audio";
  }
  getNumber() {
    return 1;
  }
  getTimeResolution() {
    assert(this.demuxer.firstFrameHeader);
    return this.demuxer.firstFrameHeader.sampleRate;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    const demuxer = this.demuxer;
    assert(demuxer.firstFrameHeader !== null);
    assert(demuxer.firstFrameHeaderPos !== null);
    if (demuxer.xingData && demuxer.xingData.frameCount !== null) {
      return (demuxer.xingData.frameCount * demuxer.firstFrameHeader.audioSamplesInFrame - demuxer.primingDelay) / demuxer.firstFrameHeader.sampleRate;
    } else if (!demuxer.xingData?.isVbr) {
      if (demuxer.reader.fileSize !== null) {
        let audioEndPos = demuxer.reader.fileSize;
        if (audioEndPos - demuxer.firstFrameHeaderPos >= ID3_V1_TAG_SIZE) {
          let slice = demuxer.reader.requestSlice(audioEndPos - ID3_V1_TAG_SIZE, 3);
          if (isThenable(slice))
            slice = await slice;
          assert(slice);
          if (readAscii(slice, 3) === "TAG") {
            audioEndPos -= ID3_V1_TAG_SIZE;
          }
        }
        if (audioEndPos - demuxer.firstFrameHeaderPos >= APE_TAG_FOOTER_SIZE) {
          let slice = demuxer.reader.requestSlice(audioEndPos - APE_TAG_FOOTER_SIZE, APE_TAG_FOOTER_SIZE);
          if (isThenable(slice))
            slice = await slice;
          assert(slice);
          if (readAscii(slice, 8) === "APETAGEX") {
            slice.skip(4);
            const tagSize = readU32Le(slice);
            slice.skip(4);
            const flags = readU32Le(slice);
            const hasHeader = (flags & 1 << 31) !== 0;
            audioEndPos -= tagSize + (hasHeader ? APE_TAG_FOOTER_SIZE : 0);
            if (audioEndPos < demuxer.firstFrameHeaderPos) {
              throw new Error("Invalid APE tag size.");
            }
          }
        }
        const averageFrameSize = computeAverageMp3FrameSize(demuxer.firstFrameHeader.lowSamplingFrequency, demuxer.firstFrameHeader.layer, demuxer.firstFrameHeader.bitrate, demuxer.firstFrameHeader.sampleRate);
        const frameCount = (audioEndPos - demuxer.firstFrameHeaderPos) / averageFrameSize;
        return (Math.round(frameCount) * demuxer.firstFrameHeader.audioSamplesInFrame - demuxer.primingDelay) / demuxer.firstFrameHeader.sampleRate;
      }
    }
    return null;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getCodec() {
    return "mp3";
  }
  getInternalCodecId() {
    return null;
  }
  getNumberOfChannels() {
    assert(this.demuxer.firstFrameHeader);
    return getMp3ChannelCount(this.demuxer.firstFrameHeader.channel);
  }
  getSampleRate() {
    assert(this.demuxer.firstFrameHeader);
    return this.demuxer.firstFrameHeader.sampleRate;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION
    };
  }
  async getDecoderConfig() {
    assert(this.demuxer.firstFrameHeader);
    return {
      codec: "mp3",
      numberOfChannels: getMp3ChannelCount(this.demuxer.firstFrameHeader.channel),
      sampleRate: this.demuxer.firstFrameHeader.sampleRate
    };
  }
  async getPacketAtIndex(sampleIndex, options) {
    if (sampleIndex === -1) {
      return null;
    }
    const rawSample = this.demuxer.loadedSamples[sampleIndex];
    if (!rawSample) {
      return null;
    }
    let data;
    if (options.metadataOnly) {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.demuxer.reader.requestSlice(rawSample.dataStart, rawSample.dataSize);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        return null;
      }
      data = readBytes(slice, rawSample.dataSize);
    }
    return new EncodedPacket(data, "key", rawSample.timestamp, rawSample.duration, sampleIndex, rawSample.dataSize);
  }
  getFirstPacket(options) {
    return this.getPacketAtIndex(0, options);
  }
  async getNextPacket(packet, options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const sampleIndex = binarySearchExact(this.demuxer.loadedSamples, packet.timestamp, (x) => x.timestamp);
      if (sampleIndex === -1) {
        throw new Error("Packet was not created from this track.");
      }
      const nextIndex = sampleIndex + 1;
      while (nextIndex >= this.demuxer.loadedSamples.length && !this.demuxer.lastSampleLoaded) {
        await this.demuxer.advanceReader();
      }
      return this.getPacketAtIndex(nextIndex, options);
    } finally {
      release();
    }
  }
  async getPacket(timestamp, options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const sampleRate = this.getSampleRate();
      const snappedTimestamp = roundIfAlmostInteger(timestamp * sampleRate) / sampleRate;
      while (true) {
        const index = binarySearchLessOrEqual(this.demuxer.loadedSamples, snappedTimestamp, (x) => x.timestamp);
        if (index === -1 && this.demuxer.loadedSamples.length > 0) {
          return null;
        }
        if (this.demuxer.lastSampleLoaded) {
          return this.getPacketAtIndex(index, options);
        }
        if (index >= 0 && index + 1 < this.demuxer.loadedSamples.length) {
          return this.getPacketAtIndex(index, options);
        }
        await this.demuxer.advanceReader();
      }
    } finally {
      release();
    }
  }
  getKeyPacket(timestamp, options) {
    return this.getPacket(timestamp, options);
  }
  getNextKeyPacket(packet, options) {
    return this.getNextPacket(packet, options);
  }
};

// node_modules/mediabunny/dist/modules/src/ogg/ogg-misc.js
var OGGS = 1399285583;
var OGG_CRC_POLYNOMIAL = 79764919;
var OGG_CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let crc = n << 24;
  for (let k = 0; k < 8; k++) {
    crc = crc & 2147483648 ? crc << 1 ^ OGG_CRC_POLYNOMIAL : crc << 1;
  }
  OGG_CRC_TABLE[n] = crc >>> 0 & 4294967295;
}
var extractSampleMetadata = (data, codecInfo, vorbisLastBlocksize) => {
  let durationInSamples = 0;
  let currentBlocksize = null;
  if (data.length > 0) {
    if (codecInfo.codec === "vorbis") {
      assert(codecInfo.vorbisInfo);
      const vorbisModeCount = codecInfo.vorbisInfo.modeBlockflags.length;
      const bitCount = ilog(vorbisModeCount - 1);
      const modeMask = (1 << bitCount) - 1 << 1;
      const modeNumber = (data[0] & modeMask) >> 1;
      if (modeNumber >= codecInfo.vorbisInfo.modeBlockflags.length) {
        throw new Error("Invalid mode number.");
      }
      let prevBlocksize = vorbisLastBlocksize ?? codecInfo.vorbisInfo.blocksizes[0];
      const blockflag = codecInfo.vorbisInfo.modeBlockflags[modeNumber];
      currentBlocksize = codecInfo.vorbisInfo.blocksizes[blockflag];
      if (blockflag === 1) {
        const prevMask = (modeMask | 1) + 1;
        const flag = data[0] & prevMask ? 1 : 0;
        prevBlocksize = codecInfo.vorbisInfo.blocksizes[flag];
      }
      durationInSamples = prevBlocksize + currentBlocksize >> 2;
    } else if (codecInfo.codec === "opus") {
      const toc = parseOpusTocByte(data);
      durationInSamples = toc.durationInSamples;
    }
  }
  return {
    durationInSamples,
    vorbisBlockSize: currentBlocksize
  };
};
var buildOggMimeType = (info) => {
  let string = "audio/ogg";
  if (info.codecStrings.length > 0) {
    const uniqueCodecMimeTypes = [...new Set(info.codecStrings)];
    string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
  }
  return string;
};

// node_modules/mediabunny/dist/modules/src/ogg/ogg-reader.js
var MIN_PAGE_HEADER_SIZE = 27;
var MAX_PAGE_HEADER_SIZE = 27 + 255;
var MAX_PAGE_SIZE = MAX_PAGE_HEADER_SIZE + 255 * 255;
var readPageHeader = (slice) => {
  const startPos = slice.filePos;
  const capturePattern = readU32Le(slice);
  if (capturePattern !== OGGS) {
    return null;
  }
  slice.skip(1);
  const headerType = readU8(slice);
  const granulePosition = readI64Le(slice);
  const serialNumber = readU32Le(slice);
  const sequenceNumber = readU32Le(slice);
  const checksum = readU32Le(slice);
  const numberPageSegments = readU8(slice);
  if (numberPageSegments === 0 || slice.remainingLength < numberPageSegments) {
    return null;
  }
  const lacingValues = new Uint8Array(numberPageSegments);
  for (let i = 0; i < numberPageSegments; i++) {
    lacingValues[i] = readU8(slice);
  }
  const headerSize = 27 + numberPageSegments;
  const dataSize = lacingValues.reduce((a, b) => a + b, 0);
  const totalSize = headerSize + dataSize;
  return {
    headerStartPos: startPos,
    totalSize,
    dataStartPos: startPos + headerSize,
    dataSize,
    headerType,
    granulePosition,
    serialNumber,
    sequenceNumber,
    checksum,
    lacingValues
  };
};
var findNextPageHeader = (slice, until, serialNumber) => {
  while (slice.filePos < until - (4 - 1)) {
    const word = readU32Le(slice);
    const firstByte = word & 255;
    const secondByte = word >>> 8 & 255;
    const thirdByte = word >>> 16 & 255;
    const fourthByte = word >>> 24 & 255;
    const O = 79;
    if (firstByte !== O && secondByte !== O && thirdByte !== O && fourthByte !== O) {
      continue;
    }
    slice.skip(-4);
    if (word === OGGS) {
      if (serialNumber === void 0 || slice.filePos + 18 > slice.end) {
        return true;
      }
      slice.skip(14);
      const pageSerialNumber = readU32Le(slice);
      slice.skip(-18);
      if (pageSerialNumber === serialNumber) {
        return true;
      }
    }
    slice.skip(1);
  }
  return false;
};

// node_modules/mediabunny/dist/modules/src/ogg/ogg-demuxer.js
var MAX_LOGICAL_BITSTREAMS = 64;
var VORBIS_IDENTIFICATION_HEADER_SIZE = 30;
var OPUS_IDENTIFICATION_HEADER_MIN_SIZE = 19;
var OggDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.bitstreams = [];
    this.trackBackings = [];
    this.metadataTags = {};
    this.reader = input2._reader;
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      let currentPos = 0;
      while (true) {
        let slice = this.reader.requestSliceRange(currentPos, MIN_PAGE_HEADER_SIZE, MAX_PAGE_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const page = readPageHeader(slice);
        if (!page) {
          break;
        }
        const isBos = !!(page.headerType & 2);
        if (!isBos) {
          break;
        }
        if (this.bitstreams.length === MAX_LOGICAL_BITSTREAMS) {
          throw new Error(`Too many (> ${MAX_LOGICAL_BITSTREAMS}) logical bitstreams.`);
        }
        this.bitstreams.push({
          serialNumber: page.serialNumber,
          bosPage: page,
          description: null,
          numberOfChannels: -1,
          sampleRate: -1,
          codecInfo: {
            codec: null,
            vorbisInfo: null,
            opusInfo: null
          },
          lastMetadataPacket: null
        });
        currentPos = page.headerStartPos + page.totalSize;
      }
      for (const bitstream of this.bitstreams) {
        const firstPacket = await this.readPacket(bitstream.bosPage, 0);
        if (!firstPacket) {
          continue;
        }
        if (
          // Check for Vorbis
          firstPacket.data.byteLength >= VORBIS_IDENTIFICATION_HEADER_SIZE && firstPacket.data[0] === 1 && firstPacket.data[1] === 118 && firstPacket.data[2] === 111 && firstPacket.data[3] === 114 && firstPacket.data[4] === 98 && firstPacket.data[5] === 105 && firstPacket.data[6] === 115
        ) {
          await this.readVorbisMetadata(firstPacket, bitstream);
        } else if (
          // Check for Opus
          firstPacket.data.byteLength >= OPUS_IDENTIFICATION_HEADER_MIN_SIZE && firstPacket.data[0] === 79 && firstPacket.data[1] === 112 && firstPacket.data[2] === 117 && firstPacket.data[3] === 115 && firstPacket.data[4] === 72 && firstPacket.data[5] === 101 && firstPacket.data[6] === 97 && firstPacket.data[7] === 100
        ) {
          await this.readOpusMetadata(firstPacket, bitstream);
        }
        if (bitstream.codecInfo.codec !== null) {
          this.trackBackings.push(new OggAudioTrackBacking(bitstream, this));
        }
      }
    })();
  }
  async readVorbisMetadata(firstPacket, bitstream) {
    let nextPacketPosition = await this.findNextPacketStart(firstPacket);
    if (!nextPacketPosition) {
      return;
    }
    const secondPacket = await this.readPacket(nextPacketPosition.startPage, nextPacketPosition.startSegmentIndex);
    if (!secondPacket) {
      return;
    }
    nextPacketPosition = await this.findNextPacketStart(secondPacket);
    if (!nextPacketPosition) {
      return;
    }
    const thirdPacket = await this.readPacket(nextPacketPosition.startPage, nextPacketPosition.startSegmentIndex);
    if (!thirdPacket) {
      return;
    }
    if (secondPacket.data[0] !== 3 || thirdPacket.data[0] !== 5) {
      return;
    }
    const view = toDataView(firstPacket.data);
    const numberOfChannels = view.getUint8(11);
    const sampleRate = view.getUint32(12, true);
    if (numberOfChannels === 0 || sampleRate === 0) {
      throw new Error("Invalid Vorbis identification header: channel count and sample rate must not be 0.");
    }
    const lacingValues = [];
    const addBytesToSegmentTable = (bytes) => {
      while (true) {
        lacingValues.push(Math.min(255, bytes));
        if (bytes < 255) {
          break;
        }
        bytes -= 255;
      }
    };
    addBytesToSegmentTable(firstPacket.data.length);
    addBytesToSegmentTable(secondPacket.data.length);
    const description = new Uint8Array(1 + lacingValues.length + firstPacket.data.length + secondPacket.data.length + thirdPacket.data.length);
    description[0] = 2;
    description.set(lacingValues, 1);
    description.set(firstPacket.data, 1 + lacingValues.length);
    description.set(secondPacket.data, 1 + lacingValues.length + firstPacket.data.length);
    description.set(thirdPacket.data, 1 + lacingValues.length + firstPacket.data.length + secondPacket.data.length);
    bitstream.codecInfo.codec = "vorbis";
    bitstream.description = description;
    bitstream.lastMetadataPacket = thirdPacket;
    bitstream.numberOfChannels = numberOfChannels;
    bitstream.sampleRate = sampleRate;
    const blockSizeByte = view.getUint8(28);
    bitstream.codecInfo.vorbisInfo = {
      blocksizes: [
        1 << (blockSizeByte & 15),
        1 << (blockSizeByte >> 4)
      ],
      modeBlockflags: parseModesFromVorbisSetupPacket(thirdPacket.data).modeBlockflags
    };
    readVorbisComments(secondPacket.data.subarray(7), this.metadataTags);
  }
  async readOpusMetadata(firstPacket, bitstream) {
    const nextPacketPosition = await this.findNextPacketStart(firstPacket);
    if (!nextPacketPosition) {
      return;
    }
    const secondPacket = await this.readPacket(nextPacketPosition.startPage, nextPacketPosition.startSegmentIndex);
    if (!secondPacket) {
      return;
    }
    bitstream.codecInfo.codec = "opus";
    bitstream.description = firstPacket.data;
    bitstream.lastMetadataPacket = secondPacket;
    const header = parseOpusIdentificationHeader(firstPacket.data);
    bitstream.numberOfChannels = header.outputChannelCount;
    bitstream.sampleRate = OPUS_SAMPLE_RATE;
    bitstream.codecInfo.opusInfo = {
      preSkip: header.preSkip
    };
    readVorbisComments(secondPacket.data.subarray(8), this.metadataTags);
  }
  async readPacket(startPage, startSegmentIndex) {
    assert(startSegmentIndex < startPage.lacingValues.length);
    let startDataOffset = 0;
    for (let i = 0; i < startSegmentIndex; i++) {
      startDataOffset += startPage.lacingValues[i];
    }
    let currentPage = startPage;
    let currentDataOffset = startDataOffset;
    let currentSegmentIndex = startSegmentIndex;
    const chunks = [];
    outer: while (true) {
      let pageSlice = this.reader.requestSlice(currentPage.dataStartPos, currentPage.dataSize);
      if (isThenable(pageSlice))
        pageSlice = await pageSlice;
      if (!pageSlice) {
        return null;
      }
      const pageData = readBytes(pageSlice, currentPage.dataSize);
      while (true) {
        if (currentSegmentIndex === currentPage.lacingValues.length) {
          chunks.push(pageData.subarray(startDataOffset, currentDataOffset));
          break;
        }
        const lacingValue = currentPage.lacingValues[currentSegmentIndex];
        currentDataOffset += lacingValue;
        if (lacingValue < 255) {
          chunks.push(pageData.subarray(startDataOffset, currentDataOffset));
          break outer;
        }
        currentSegmentIndex++;
      }
      let currentPos = currentPage.headerStartPos + currentPage.totalSize;
      while (true) {
        let headerSlice = this.reader.requestSliceRange(currentPos, MIN_PAGE_HEADER_SIZE, MAX_PAGE_HEADER_SIZE);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        if (!headerSlice) {
          return null;
        }
        const nextPage = readPageHeader(headerSlice);
        if (!nextPage) {
          return null;
        }
        currentPage = nextPage;
        if (currentPage.serialNumber === startPage.serialNumber) {
          break;
        }
        currentPos = currentPage.headerStartPos + currentPage.totalSize;
      }
      startDataOffset = 0;
      currentDataOffset = 0;
      currentSegmentIndex = 0;
    }
    const totalPacketSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalPacketSize === 0) {
      throw new Error("Invalid Ogg stream: empty packets are only allowed at the very end of a stream.");
    }
    const packetData = new Uint8Array(totalPacketSize);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      packetData.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      data: packetData,
      endPage: currentPage,
      endSegmentIndex: currentSegmentIndex
    };
  }
  async findNextPacketStart(lastPacket) {
    let startPage = lastPacket.endPage;
    let startSegmentIndex = lastPacket.endSegmentIndex + 1;
    if (startSegmentIndex === startPage.lacingValues.length) {
      const isEos = !!(startPage.headerType & 4);
      if (isEos) {
        return null;
      }
      let currentPos = startPage.headerStartPos + startPage.totalSize;
      while (true) {
        let slice = this.reader.requestSliceRange(currentPos, MIN_PAGE_HEADER_SIZE, MAX_PAGE_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice) {
          return null;
        }
        const nextPage = readPageHeader(slice);
        if (!nextPage) {
          return null;
        }
        if (nextPage.serialNumber === startPage.serialNumber) {
          startPage = nextPage;
          startSegmentIndex = 0;
          break;
        }
        currentPos = nextPage.headerStartPos + nextPage.totalSize;
      }
    }
    const isFinalEmptyPacket = !!(startPage.headerType & 4) && startSegmentIndex === startPage.lacingValues.length - 1 && startPage.lacingValues[startSegmentIndex] === 0;
    if (isFinalEmptyPacket) {
      return null;
    }
    return {
      startPage,
      startSegmentIndex
    };
  }
  async getMimeType() {
    await this.readMetadata();
    const codecStrings = await Promise.all(this.trackBackings.map((x) => x.getDecoderConfig().then((c) => c?.codec ?? null)));
    return buildOggMimeType({
      codecStrings: codecStrings.filter(Boolean)
    });
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.trackBackings;
  }
  async getMetadataTags() {
    await this.readMetadata();
    return this.metadataTags;
  }
};
var OggAudioTrackBacking = class {
  constructor(bitstream, demuxer) {
    this.bitstream = bitstream;
    this.demuxer = demuxer;
    this.encodedPacketToMetadata = /* @__PURE__ */ new WeakMap();
    this.sequentialScanCache = [];
    this.sequentialScanMutex = new AsyncMutex();
    this.firstTimestampInSamplesPromise = null;
    const codec = bitstream.codecInfo.codec;
    assert(codec);
    if (codec === "vorbis") {
      this.internalSampleRate = bitstream.sampleRate;
    } else if (codec === "opus") {
      this.internalSampleRate = OPUS_SAMPLE_RATE;
    } else {
      assertNever(codec);
      assert(false);
    }
  }
  getType() {
    return "audio";
  }
  getNumber() {
    const index = this.demuxer.trackBackings.findIndex((x) => x.bitstream === this.bitstream);
    assert(index !== -1);
    return index + 1;
  }
  getNumberOfChannels() {
    return this.bitstream.numberOfChannels;
  }
  getSampleRate() {
    return this.bitstream.sampleRate;
  }
  getTimeResolution() {
    return this.bitstream.sampleRate;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    return null;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  getCodec() {
    return this.bitstream.codecInfo.codec;
  }
  getInternalCodecId() {
    return null;
  }
  async getDecoderConfig() {
    assert(this.bitstream.codecInfo.codec);
    return {
      codec: this.bitstream.codecInfo.codec,
      numberOfChannels: this.bitstream.numberOfChannels,
      sampleRate: this.bitstream.sampleRate,
      description: this.bitstream.description ?? void 0
    };
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION,
      primary: false
    };
  }
  granulePositionToTimestampInSamples(granulePosition) {
    const codec = this.bitstream.codecInfo.codec;
    assert(codec);
    if (codec === "vorbis") {
      return granulePosition;
    } else if (codec === "opus") {
      assert(this.bitstream.codecInfo.opusInfo);
      return granulePosition - this.bitstream.codecInfo.opusInfo.preSkip;
    } else {
      assertNever(codec);
      assert(false);
    }
  }
  createEncodedPacketFromOggPacket(packet, additional, options) {
    if (!packet) {
      return null;
    }
    const { durationInSamples, vorbisBlockSize } = extractSampleMetadata(packet.data, this.bitstream.codecInfo, additional.vorbisLastBlocksize);
    const encodedPacket = new EncodedPacket(options.metadataOnly ? PLACEHOLDER_DATA : packet.data, "key", additional.timestampInSamples / this.internalSampleRate, durationInSamples / this.internalSampleRate, packet.endPage.headerStartPos + packet.endSegmentIndex, packet.data.byteLength);
    this.encodedPacketToMetadata.set(encodedPacket, {
      packet,
      timestampInSamples: additional.timestampInSamples,
      durationInSamples,
      vorbisLastBlockSize: additional.vorbisLastBlocksize,
      vorbisBlockSize
    });
    return encodedPacket;
  }
  getFirstTimestampInSamples() {
    return this.firstTimestampInSamplesPromise ??= (async () => {
      const defaultTimestampInSamples = this.granulePositionToTimestampInSamples(0);
      assert(this.bitstream.lastMetadataPacket);
      let position = await this.demuxer.findNextPacketStart(this.bitstream.lastMetadataPacket);
      if (!position) {
        return defaultTimestampInSamples;
      }
      let firstEndPage = null;
      let totalDurationInSamples = 0;
      let firstPacketDurationInSamples = null;
      let vorbisLastBlocksize = null;
      while (position) {
        const packet = await this.demuxer.readPacket(position.startPage, position.startSegmentIndex);
        if (!packet) {
          break;
        }
        firstEndPage ??= packet.endPage;
        if (packet.endPage.headerStartPos !== firstEndPage.headerStartPos) {
          break;
        }
        const { durationInSamples, vorbisBlockSize } = extractSampleMetadata(packet.data, this.bitstream.codecInfo, vorbisLastBlocksize);
        totalDurationInSamples += durationInSamples;
        firstPacketDurationInSamples ??= durationInSamples;
        vorbisLastBlocksize = vorbisBlockSize;
        position = await this.demuxer.findNextPacketStart(packet);
      }
      if (!firstEndPage) {
        return defaultTimestampInSamples;
      }
      assert(firstPacketDurationInSamples !== null);
      const startInSamples = firstEndPage.granulePosition - totalDurationInSamples;
      if (firstEndPage.granulePosition !== -1 && !(firstEndPage.headerType & 4)) {
        return defaultTimestampInSamples + startInSamples;
      }
      const codec = this.bitstream.codecInfo.codec;
      assert(codec);
      let minStartInSamples;
      if (codec === "vorbis") {
        minStartInSamples = -firstPacketDurationInSamples;
      } else if (codec === "opus") {
        minStartInSamples = 0;
      } else {
        assertNever(codec);
        assert(false);
      }
      return defaultTimestampInSamples + Math.max(startInSamples, minStartInSamples);
    })();
  }
  async getFirstPacket(options) {
    assert(this.bitstream.lastMetadataPacket);
    const packetPosition = await this.demuxer.findNextPacketStart(this.bitstream.lastMetadataPacket);
    if (!packetPosition) {
      return null;
    }
    const timestampInSamples = await this.getFirstTimestampInSamples();
    const packet = await this.demuxer.readPacket(packetPosition.startPage, packetPosition.startSegmentIndex);
    return this.createEncodedPacketFromOggPacket(packet, {
      timestampInSamples,
      vorbisLastBlocksize: null
    }, options);
  }
  async getNextPacket(prevPacket, options) {
    const prevMetadata = this.encodedPacketToMetadata.get(prevPacket);
    if (!prevMetadata) {
      throw new Error("Packet was not created from this track.");
    }
    const packetPosition = await this.demuxer.findNextPacketStart(prevMetadata.packet);
    if (!packetPosition) {
      return null;
    }
    const timestampInSamples = prevMetadata.timestampInSamples + prevMetadata.durationInSamples;
    const packet = await this.demuxer.readPacket(packetPosition.startPage, packetPosition.startSegmentIndex);
    return this.createEncodedPacketFromOggPacket(packet, {
      timestampInSamples,
      vorbisLastBlocksize: prevMetadata.vorbisBlockSize
    }, options);
  }
  async getPacket(timestamp, options) {
    if (this.demuxer.reader.fileSize === null) {
      return this.getPacketSequential(timestamp, options);
    }
    const timestampInSamples = roundIfAlmostInteger(timestamp * this.internalSampleRate);
    const firstTimestampInSamples = await this.getFirstTimestampInSamples();
    if (timestampInSamples === firstTimestampInSamples) {
      return this.getFirstPacket(options);
    }
    if (timestampInSamples < firstTimestampInSamples) {
      return null;
    }
    assert(this.bitstream.lastMetadataPacket);
    const startPosition = await this.demuxer.findNextPacketStart(this.bitstream.lastMetadataPacket);
    if (!startPosition) {
      return null;
    }
    let lowPage = startPosition.startPage;
    let high = this.demuxer.reader.fileSize;
    const lowPages = [lowPage];
    outer: while (lowPage.headerStartPos + lowPage.totalSize < high) {
      const low = lowPage.headerStartPos;
      const mid = Math.floor((low + high) / 2);
      let searchStartPos = mid;
      while (true) {
        const until = Math.min(searchStartPos + MAX_PAGE_SIZE, high - MIN_PAGE_HEADER_SIZE);
        let searchSlice = this.demuxer.reader.requestSlice(searchStartPos, Math.max(until - searchStartPos, 0));
        if (isThenable(searchSlice))
          searchSlice = await searchSlice;
        if (!searchSlice || !findNextPageHeader(searchSlice, until, this.bitstream.serialNumber)) {
          if (high <= mid + MIN_PAGE_HEADER_SIZE) {
            break outer;
          }
          high = mid + MIN_PAGE_HEADER_SIZE;
          continue outer;
        }
        const pageStartPos = searchSlice.filePos;
        let headerSlice = this.demuxer.reader.requestSliceRange(pageStartPos, MIN_PAGE_HEADER_SIZE, MAX_PAGE_HEADER_SIZE);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        const page = headerSlice && readPageHeader(headerSlice);
        if (!page || page.serialNumber !== this.bitstream.serialNumber) {
          searchStartPos = pageStartPos + 4;
          continue;
        }
        const isContinuationPage = page.granulePosition === -1;
        if (isContinuationPage) {
          searchStartPos = page.headerStartPos + page.totalSize;
          continue;
        }
        if (this.granulePositionToTimestampInSamples(page.granulePosition) > timestampInSamples || page.headerStartPos + page.totalSize > this.demuxer.reader.fileSize) {
          high = page.headerStartPos;
        } else {
          lowPage = page;
          lowPages.push(page);
        }
        continue outer;
      }
    }
    let lowerPage = startPosition.startPage;
    for (const otherLowPage of lowPages) {
      if (otherLowPage.granulePosition === lowPage.granulePosition) {
        break;
      }
      if (!lowerPage || otherLowPage.headerStartPos > lowerPage.headerStartPos) {
        lowerPage = otherLowPage;
      }
    }
    let currentPage = lowerPage;
    const previousPages = [currentPage];
    while (true) {
      if (currentPage.serialNumber === this.bitstream.serialNumber && currentPage.granulePosition === lowPage.granulePosition) {
        break;
      }
      const nextPos = currentPage.headerStartPos + currentPage.totalSize;
      let slice = this.demuxer.reader.requestSliceRange(nextPos, MIN_PAGE_HEADER_SIZE, MAX_PAGE_HEADER_SIZE);
      if (isThenable(slice))
        slice = await slice;
      const nextPage = slice && readPageHeader(slice);
      if (!nextPage) {
        currentPage = lowPage;
        previousPages.push(lowPage);
        break;
      }
      currentPage = nextPage;
      if (currentPage.serialNumber === this.bitstream.serialNumber) {
        previousPages.push(currentPage);
      }
    }
    let currentSegmentIndex = null;
    let currentTimestampInSamples;
    let currentTimestampIsCorrect;
    let endPage = currentPage;
    let endSegmentIndex = 0;
    if (currentPage.headerStartPos === startPosition.startPage.headerStartPos) {
      currentTimestampInSamples = firstTimestampInSamples;
      currentTimestampIsCorrect = true;
      currentSegmentIndex = 0;
    } else {
      assert(currentPage.granulePosition !== -1);
      currentTimestampInSamples = 0;
      currentTimestampIsCorrect = false;
      for (let i = currentPage.lacingValues.length - 1; i >= 0; i--) {
        const value = currentPage.lacingValues[i];
        if (value < 255) {
          currentSegmentIndex = i + 1;
          break;
        }
      }
      if (currentSegmentIndex === null) {
        throw new Error("Invalid page with granule position: no packets end on this page.");
      }
      endSegmentIndex = currentSegmentIndex - 1;
      const pseudopacket = {
        data: PLACEHOLDER_DATA,
        endPage,
        endSegmentIndex
      };
      const nextPosition = await this.demuxer.findNextPacketStart(pseudopacket);
      if (nextPosition) {
        const endPosition = findPreviousPacketEndPosition(previousPages, currentPage, currentSegmentIndex);
        assert(endPosition);
        const startPosition2 = findPacketStartPosition(previousPages, endPosition.page, endPosition.segmentIndex);
        if (startPosition2) {
          currentPage = startPosition2.page;
          currentSegmentIndex = startPosition2.segmentIndex;
        } else {
          currentPage = nextPosition.startPage;
          currentSegmentIndex = nextPosition.startSegmentIndex;
          currentTimestampInSamples = this.granulePositionToTimestampInSamples(endPage.granulePosition);
          currentTimestampIsCorrect = true;
        }
      } else {
        while (true) {
          const endPosition = findPreviousPacketEndPosition(previousPages, currentPage, currentSegmentIndex);
          if (!endPosition) {
            break;
          }
          const startPosition2 = findPacketStartPosition(previousPages, endPosition.page, endPosition.segmentIndex);
          if (!startPosition2) {
            break;
          }
          currentPage = startPosition2.page;
          currentSegmentIndex = startPosition2.segmentIndex;
          if (endPosition.page.headerStartPos !== endPage.headerStartPos) {
            endPage = endPosition.page;
            endSegmentIndex = endPosition.segmentIndex;
            break;
          }
        }
      }
    }
    let lastEncodedPacket = null;
    let lastEncodedPacketMetadata = null;
    while (currentPage !== null) {
      assert(currentSegmentIndex !== null);
      const packet = await this.demuxer.readPacket(currentPage, currentSegmentIndex);
      if (!packet) {
        break;
      }
      const skipPacket = currentPage.headerStartPos === startPosition.startPage.headerStartPos && currentSegmentIndex < startPosition.startSegmentIndex;
      if (!skipPacket) {
        let encodedPacket = this.createEncodedPacketFromOggPacket(packet, {
          timestampInSamples: currentTimestampInSamples,
          vorbisLastBlocksize: lastEncodedPacketMetadata?.vorbisBlockSize ?? null
        }, options);
        assert(encodedPacket);
        let encodedPacketMetadata = this.encodedPacketToMetadata.get(encodedPacket);
        assert(encodedPacketMetadata);
        if (!currentTimestampIsCorrect && packet.endPage.headerStartPos === endPage.headerStartPos && packet.endSegmentIndex === endSegmentIndex) {
          currentTimestampInSamples = this.granulePositionToTimestampInSamples(endPage.granulePosition);
          currentTimestampIsCorrect = true;
          encodedPacket = this.createEncodedPacketFromOggPacket(packet, {
            timestampInSamples: currentTimestampInSamples - encodedPacketMetadata.durationInSamples,
            vorbisLastBlocksize: lastEncodedPacketMetadata?.vorbisBlockSize ?? null
          }, options);
          assert(encodedPacket);
          encodedPacketMetadata = this.encodedPacketToMetadata.get(encodedPacket);
          assert(encodedPacketMetadata);
        } else {
          currentTimestampInSamples += encodedPacketMetadata.durationInSamples;
        }
        lastEncodedPacket = encodedPacket;
        lastEncodedPacketMetadata = encodedPacketMetadata;
        if (currentTimestampIsCorrect && // Next timestamp will be too late
        (currentTimestampInSamples > timestampInSamples || encodedPacketMetadata.timestampInSamples === timestampInSamples)) {
          break;
        }
      }
      const nextPosition = await this.demuxer.findNextPacketStart(packet);
      if (!nextPosition) {
        break;
      }
      currentPage = nextPosition.startPage;
      currentSegmentIndex = nextPosition.startSegmentIndex;
    }
    return lastEncodedPacket;
  }
  // A slower but simpler and sequential algorithm for finding a packet in a file
  async getPacketSequential(timestamp, options) {
    const release = await this.sequentialScanMutex.acquire();
    try {
      const timestampInSamples = roundIfAlmostInteger(timestamp * this.internalSampleRate);
      timestamp = timestampInSamples / this.internalSampleRate;
      const index = binarySearchLessOrEqual(this.sequentialScanCache, timestampInSamples, (x) => x.timestampInSamples);
      let currentPacket;
      if (index !== -1) {
        const cacheEntry = this.sequentialScanCache[index];
        currentPacket = this.createEncodedPacketFromOggPacket(cacheEntry.packet, {
          timestampInSamples: cacheEntry.timestampInSamples,
          vorbisLastBlocksize: cacheEntry.vorbisLastBlockSize
        }, options);
      } else {
        currentPacket = await this.getFirstPacket(options);
        if (currentPacket && currentPacket.timestamp > timestamp) {
          return null;
        }
      }
      let i = 0;
      while (currentPacket && currentPacket.timestamp < timestamp) {
        const nextPacket = await this.getNextPacket(currentPacket, options);
        if (!nextPacket || nextPacket.timestamp > timestamp) {
          break;
        }
        currentPacket = nextPacket;
        i++;
        if (i === 100) {
          i = 0;
          const metadata = this.encodedPacketToMetadata.get(currentPacket);
          assert(metadata);
          if (this.sequentialScanCache.length > 0) {
            assert(last(this.sequentialScanCache).timestampInSamples <= metadata.timestampInSamples);
          }
          this.sequentialScanCache.push(metadata);
        }
      }
      return currentPacket;
    } finally {
      release();
    }
  }
  getKeyPacket(timestamp, options) {
    return this.getPacket(timestamp, options);
  }
  getNextKeyPacket(packet, options) {
    return this.getNextPacket(packet, options);
  }
};
var findPacketStartPosition = (pageList, endPage, endSegmentIndex) => {
  let page = endPage;
  let segmentIndex = endSegmentIndex;
  outer: while (true) {
    segmentIndex--;
    for (segmentIndex; segmentIndex >= 0; segmentIndex--) {
      const lacingValue = page.lacingValues[segmentIndex];
      if (lacingValue < 255) {
        segmentIndex++;
        break outer;
      }
    }
    assert(segmentIndex === -1);
    const pageStartsWithFreshPacket = !(page.headerType & 1);
    if (pageStartsWithFreshPacket) {
      segmentIndex = 0;
      break;
    }
    const previousPage = findLast(pageList, (x) => x.headerStartPos < page.headerStartPos);
    if (!previousPage) {
      return null;
    }
    page = previousPage;
    segmentIndex = page.lacingValues.length;
  }
  assert(segmentIndex !== -1);
  if (segmentIndex === page.lacingValues.length) {
    const nextPage = pageList[pageList.indexOf(page) + 1];
    assert(nextPage);
    page = nextPage;
    segmentIndex = 0;
  }
  return { page, segmentIndex };
};
var findPreviousPacketEndPosition = (pageList, startPage, startSegmentIndex) => {
  if (startSegmentIndex > 0) {
    return { page: startPage, segmentIndex: startSegmentIndex - 1 };
  }
  const previousPage = findLast(pageList, (x) => x.headerStartPos < startPage.headerStartPos);
  if (!previousPage) {
    return null;
  }
  return { page: previousPage, segmentIndex: previousPage.lacingValues.length - 1 };
};

// node_modules/mediabunny/dist/modules/src/wave/wave-demuxer.js
var WaveFormat;
(function(WaveFormat2) {
  WaveFormat2[WaveFormat2["PCM"] = 1] = "PCM";
  WaveFormat2[WaveFormat2["IEEE_FLOAT"] = 3] = "IEEE_FLOAT";
  WaveFormat2[WaveFormat2["ALAW"] = 6] = "ALAW";
  WaveFormat2[WaveFormat2["MULAW"] = 7] = "MULAW";
  WaveFormat2[WaveFormat2["EXTENSIBLE"] = 65534] = "EXTENSIBLE";
})(WaveFormat || (WaveFormat = {}));
var WaveDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.dataStart = -1;
    this.dataSize = -1;
    this.dataSizeCapped = false;
    this.dataSizeIsPlaceholder = false;
    this.audioInfo = null;
    this.trackBackings = [];
    this.metadataTags = {};
    this.reader = input2._reader;
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      let slice = this.reader.requestSlice(0, 12);
      if (isThenable(slice))
        slice = await slice;
      assert(slice);
      const riffType = readAscii(slice, 4);
      const littleEndian = riffType !== "RIFX";
      const isRf64 = riffType === "RF64";
      const outerChunkSize = readU32(slice, littleEndian);
      let sizesUnfinalized = !isRf64 && outerChunkSize === 0;
      let totalFileSize = isRf64 || sizesUnfinalized || outerChunkSize === 4294967295 ? this.reader.fileSize : Math.min(outerChunkSize + 8, this.reader.fileSize ?? Infinity);
      const format = readAscii(slice, 4);
      if (format !== "WAVE") {
        throw new Error("Invalid WAVE file - wrong format");
      }
      let chunksRead = 0;
      let dataChunkSize = null;
      let currentPos = slice.filePos;
      while (totalFileSize === null || currentPos < totalFileSize) {
        let slice2 = this.reader.requestSlice(currentPos, 8);
        if (isThenable(slice2))
          slice2 = await slice2;
        if (!slice2)
          break;
        const chunkId = readAscii(slice2, 4);
        let chunkSize = readU32(slice2, littleEndian);
        const startPos = slice2.filePos;
        if (isRf64 && chunksRead === 0 && chunkId !== "ds64") {
          throw new Error('Invalid RF64 file: First chunk must be "ds64".');
        }
        if (chunkId === "fmt ") {
          await this.parseFmtChunk(startPos, chunkSize, littleEndian);
        } else if (chunkId === "data") {
          dataChunkSize ??= chunkSize;
          if (sizesUnfinalized && dataChunkSize === 0 || !isRf64 && dataChunkSize === 4294967295) {
            dataChunkSize = Number.MAX_SAFE_INTEGER;
            chunkSize = dataChunkSize;
          }
          this.dataSizeIsPlaceholder = dataChunkSize === Number.MAX_SAFE_INTEGER;
          if (isRf64) {
            chunkSize = dataChunkSize;
          }
          this.dataStart = slice2.filePos;
          this.dataSize = Math.max(Math.min(dataChunkSize, (totalFileSize ?? Infinity) - this.dataStart), 0);
          if (this.reader.fileSize === null) {
            break;
          }
        } else if (chunkId === "ds64") {
          let ds64Slice = this.reader.requestSlice(startPos, chunkSize);
          if (isThenable(ds64Slice))
            ds64Slice = await ds64Slice;
          if (!ds64Slice)
            break;
          if (chunkSize < 16) {
            throw new Error('Invalid RF64 file: "ds64" chunk is too small.');
          }
          const riffChunkSize = Math.min(readU64(ds64Slice, littleEndian), Number.MAX_SAFE_INTEGER);
          dataChunkSize = Math.min(readU64(ds64Slice, littleEndian), Number.MAX_SAFE_INTEGER);
          sizesUnfinalized = riffChunkSize === 0;
          totalFileSize = sizesUnfinalized ? this.reader.fileSize : Math.min(riffChunkSize + 8, this.reader.fileSize ?? Infinity);
        } else if (chunkId === "LIST") {
          await this.parseListChunk(startPos, chunkSize, littleEndian);
        } else if (chunkId === "ID3 " || chunkId === "id3 ") {
          await this.parseId3Chunk(startPos, chunkSize);
        }
        currentPos = startPos + chunkSize + (chunkSize & 1);
        chunksRead++;
      }
      if (!this.audioInfo) {
        throw new Error('Invalid WAVE file - missing "fmt " chunk');
      }
      if (this.dataStart === -1) {
        throw new Error('Invalid WAVE file - missing "data" chunk');
      }
      const blockSize = this.audioInfo.blockSizeInBytes;
      this.dataSize = Math.floor(this.dataSize / blockSize) * blockSize;
      this.maybeCapDataSize();
      this.trackBackings.push(new WaveAudioTrackBacking(this));
    })();
  }
  async parseFmtChunk(startPos, size, littleEndian) {
    let slice = this.reader.requestSlice(startPos, size);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return;
    if (size < 14) {
      throw new Error('Invalid WAVE file - "fmt " chunk is too small');
    }
    let formatTag = readU16(slice, littleEndian);
    const numChannels = readU16(slice, littleEndian);
    const sampleRate = readU32(slice, littleEndian);
    slice.skip(4);
    const blockAlign = readU16(slice, littleEndian);
    if (numChannels === 0 || sampleRate === 0 || blockAlign === 0) {
      throw new Error("Invalid WAVE file - channel count, sample rate and block align must be positive");
    }
    let bitsPerSample;
    if (size < 16) {
      bitsPerSample = 8;
    } else {
      bitsPerSample = readU16(slice, littleEndian);
    }
    if (size >= 18 && formatTag !== 357) {
      const cbSize = readU16(slice, littleEndian);
      const remainingSize = size - 18;
      const extensionSize = Math.min(remainingSize, cbSize);
      if (extensionSize >= 22 && formatTag === WaveFormat.EXTENSIBLE) {
        slice.skip(2 + 4);
        const subFormat = readBytes(slice, 16);
        formatTag = subFormat[0] | subFormat[1] << 8;
      }
    }
    if (formatTag === WaveFormat.MULAW || formatTag === WaveFormat.ALAW) {
      bitsPerSample = 8;
    }
    if (formatTag !== WaveFormat.PCM && formatTag !== WaveFormat.IEEE_FLOAT && formatTag !== WaveFormat.ALAW && formatTag !== WaveFormat.MULAW) {
      throw new Error(`Unsupported WAVE codec (format tag ${formatTag}). Only integer/float PCM, A-law, and \u03BC-law are supported.`);
    }
    if (formatTag === WaveFormat.PCM && ![8, 16, 24, 32].includes(bitsPerSample)) {
      throw new Error(`Unsupported WAVE PCM bit depth (${bitsPerSample}). Only 8, 16, 24, and 32 bits are supported.`);
    }
    if (formatTag === WaveFormat.IEEE_FLOAT && ![32, 64].includes(bitsPerSample)) {
      throw new Error(`Unsupported WAVE float bit depth (${bitsPerSample}). Only 32 and 64 bits are supported.`);
    }
    this.audioInfo = {
      format: formatTag,
      numberOfChannels: numChannels,
      sampleRate,
      sampleSizeInBytes: Math.ceil(bitsPerSample / 8),
      blockSizeInBytes: blockAlign
    };
  }
  async parseListChunk(startPos, size, littleEndian) {
    if (size < 4)
      return;
    let slice = this.reader.requestSlice(startPos, size);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return;
    const infoType = readAscii(slice, 4);
    if (infoType !== "INFO" && infoType !== "INF0") {
      return;
    }
    let currentPos = slice.filePos;
    while (currentPos <= startPos + size - 8) {
      slice.filePos = currentPos;
      const chunkName = readAscii(slice, 4);
      const chunkSize = readU32(slice, littleEndian);
      if (chunkSize > slice.remainingLength) {
        break;
      }
      const bytes = readBytes(slice, chunkSize);
      const nullIndex = bytes.indexOf(0);
      const stringBytes = bytes.subarray(0, nullIndex === -1 ? bytes.length : nullIndex);
      let value;
      try {
        value = strictTextDecoder.decode(stringBytes);
      } catch {
        value = "";
        for (const byte of stringBytes) {
          value += String.fromCharCode(byte);
        }
      }
      this.metadataTags.raw ??= {};
      this.metadataTags.raw[chunkName] = value;
      switch (chunkName) {
        case "INAM":
        case "TITL":
          {
            this.metadataTags.title ??= value;
          }
          ;
          break;
        case "TIT3":
          {
            this.metadataTags.description ??= value;
          }
          ;
          break;
        case "IART":
          {
            this.metadataTags.artist ??= value;
          }
          ;
          break;
        case "IPRD":
          {
            this.metadataTags.album ??= value;
          }
          ;
          break;
        case "IPRT":
        case "ITRK":
        case "TRCK":
          {
            const parts = value.split("/");
            const trackNum = Number.parseInt(parts[0], 10);
            const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
            if (Number.isInteger(trackNum) && trackNum > 0) {
              this.metadataTags.trackNumber ??= trackNum;
            }
            if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
              this.metadataTags.tracksTotal ??= tracksTotal;
            }
          }
          ;
          break;
        case "ICRD":
          {
            const date = parseIsoSuffix(value);
            if (date) {
              this.metadataTags.date ??= date;
            }
          }
          ;
          break;
        case "YEAR":
          {
            const year = Number.parseInt(value, 10);
            const date = createUtcDate(year);
            if (year > 0 && !Number.isNaN(date.getTime())) {
              this.metadataTags.date ??= date;
            }
          }
          ;
          break;
        case "IGNR":
        case "GENR":
          {
            this.metadataTags.genre ??= value;
          }
          ;
          break;
        case "ICMT":
        case "CMNT":
        case "COMM":
          {
            this.metadataTags.comment ??= value;
          }
          ;
          break;
      }
      currentPos += 8 + chunkSize + (chunkSize & 1);
    }
  }
  async parseId3Chunk(startPos, size) {
    if (size < ID3_V2_HEADER_SIZE)
      return;
    let slice = this.reader.requestSlice(startPos, size);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return;
    const id3V2Header = readId3V2Header(slice);
    if (id3V2Header) {
      const availableSize = size - ID3_V2_HEADER_SIZE;
      id3V2Header.size = Math.min(id3V2Header.size, availableSize);
      if (id3V2Header.size > 0) {
        const contentSlice = slice.slice(startPos + ID3_V2_HEADER_SIZE, id3V2Header.size);
        parseId3V2Tag(contentSlice, id3V2Header, this.metadataTags);
      }
    }
  }
  getCodec() {
    assert(this.audioInfo);
    if (this.audioInfo.format === WaveFormat.MULAW) {
      return "ulaw";
    }
    if (this.audioInfo.format === WaveFormat.ALAW) {
      return "alaw";
    }
    if (this.audioInfo.format === WaveFormat.PCM) {
      if (this.audioInfo.sampleSizeInBytes === 1) {
        return "pcm-u8";
      } else if (this.audioInfo.sampleSizeInBytes === 2) {
        return "pcm-s16";
      } else if (this.audioInfo.sampleSizeInBytes === 3) {
        return "pcm-s24";
      } else if (this.audioInfo.sampleSizeInBytes === 4) {
        return "pcm-s32";
      }
    }
    if (this.audioInfo.format === WaveFormat.IEEE_FLOAT) {
      if (this.audioInfo.sampleSizeInBytes === 4) {
        return "pcm-f32";
      } else if (this.audioInfo.sampleSizeInBytes === 8) {
        return "pcm-f64";
      }
    }
    assert(false);
  }
  maybeCapDataSize() {
    assert(this.audioInfo);
    if (this.dataSizeCapped) {
      return;
    }
    const fileSize = this.reader.fileSize;
    if (fileSize !== null) {
      this.dataSize = Math.min(this.dataSize, floorToMultiple(fileSize - this.dataStart, this.audioInfo.blockSizeInBytes));
      this.dataSizeCapped = true;
    }
  }
  async getMimeType() {
    return "audio/wav";
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.trackBackings;
  }
  async getMetadataTags() {
    await this.readMetadata();
    return this.metadataTags;
  }
};
var PACKET_SIZE_IN_FRAMES = 2048;
var WaveAudioTrackBacking = class {
  constructor(demuxer) {
    this.demuxer = demuxer;
  }
  getType() {
    return "audio";
  }
  getNumber() {
    return 1;
  }
  getCodec() {
    return this.demuxer.getCodec();
  }
  getInternalCodecId() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.format;
  }
  async getDecoderConfig() {
    const codec = this.demuxer.getCodec();
    if (!codec) {
      return null;
    }
    assert(this.demuxer.audioInfo);
    return {
      codec,
      numberOfChannels: this.demuxer.audioInfo.numberOfChannels,
      sampleRate: this.demuxer.audioInfo.sampleRate
    };
  }
  getNumberOfChannels() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.numberOfChannels;
  }
  getSampleRate() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.sampleRate;
  }
  getTimeResolution() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.sampleRate;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    assert(this.demuxer.dataSize !== -1);
    this.demuxer.maybeCapDataSize();
    if (this.demuxer.dataSizeIsPlaceholder && !this.demuxer.dataSizeCapped) {
      return null;
    }
    return this.demuxer.dataSize / this.demuxer.audioInfo.blockSizeInBytes / this.demuxer.audioInfo.sampleRate;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION
    };
  }
  async getPacketAtIndex(packetIndex, options) {
    assert(packetIndex >= 0);
    assert(this.demuxer.audioInfo);
    const blockSize = this.demuxer.audioInfo.blockSizeInBytes;
    this.demuxer.maybeCapDataSize();
    const fileSize = this.demuxer.reader.fileSize;
    const startOffset = packetIndex * PACKET_SIZE_IN_FRAMES * blockSize;
    if (startOffset >= this.demuxer.dataSize) {
      return null;
    }
    const sizeInBytes = Math.min(PACKET_SIZE_IN_FRAMES * blockSize, this.demuxer.dataSize - startOffset);
    if (fileSize === null) {
      let slice = this.demuxer.reader.requestSlice(this.demuxer.dataStart + startOffset, sizeInBytes);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        assert(this.demuxer.reader.fileSize !== null);
        return this.getPacketAtIndex(packetIndex, options);
      }
    }
    let data;
    if (options.metadataOnly) {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.demuxer.reader.requestSlice(this.demuxer.dataStart + startOffset, sizeInBytes);
      if (isThenable(slice))
        slice = await slice;
      assert(slice);
      data = readBytes(slice, sizeInBytes);
    }
    const timestamp = packetIndex * PACKET_SIZE_IN_FRAMES / this.demuxer.audioInfo.sampleRate;
    const duration = sizeInBytes / blockSize / this.demuxer.audioInfo.sampleRate;
    return new EncodedPacket(data, "key", timestamp, duration, packetIndex, sizeInBytes);
  }
  getFirstPacket(options) {
    return this.getPacketAtIndex(0, options);
  }
  async getPacket(timestamp, options) {
    assert(this.demuxer.audioInfo);
    const packetIndex = Math.floor(Math.min(roundIfAlmostInteger(timestamp * this.demuxer.audioInfo.sampleRate) / PACKET_SIZE_IN_FRAMES, (this.demuxer.dataSize - 1) / (PACKET_SIZE_IN_FRAMES * this.demuxer.audioInfo.blockSizeInBytes)));
    if (packetIndex < 0) {
      return null;
    }
    const packet = await this.getPacketAtIndex(packetIndex, options);
    if (packet) {
      return packet;
    }
    return this.getPacket(timestamp, options);
  }
  getNextPacket(packet, options) {
    assert(this.demuxer.audioInfo);
    const packetIndex = Math.round(packet.timestamp * this.demuxer.audioInfo.sampleRate / PACKET_SIZE_IN_FRAMES);
    return this.getPacketAtIndex(packetIndex + 1, options);
  }
  getKeyPacket(timestamp, options) {
    return this.getPacket(timestamp, options);
  }
  getNextKeyPacket(packet, options) {
    return this.getNextPacket(packet, options);
  }
};

// node_modules/mediabunny/dist/modules/src/adts/adts-reader.js
var MIN_ADTS_FRAME_HEADER_SIZE = 7;
var MAX_ADTS_FRAME_HEADER_SIZE = 9;
var readConfirmedAdtsFrameHeader = async (reader, startPos, searchLength, ref) => {
  const headersMatch = (a, b) => a.objectType === b.objectType && a.samplingFrequencyIndex === b.samplingFrequencyIndex && a.channelConfiguration === b.channelConfiguration;
  let slice = reader.requestSliceRange(startPos, MIN_ADTS_FRAME_HEADER_SIZE, searchLength + MAX_ADTS_FRAME_HEADER_SIZE);
  if (isThenable(slice))
    slice = await slice;
  if (!slice) {
    return null;
  }
  for (let pos = startPos; pos < Math.min(startPos + searchLength, slice.end); pos++) {
    slice.filePos = pos;
    if (readU8(slice) !== 255) {
      continue;
    }
    slice.filePos = pos;
    const header = readAdtsFrameHeader(slice);
    if (!header || ref && !headersMatch(header, ref)) {
      continue;
    }
    const frameEndPos = pos + header.frameLength;
    if (frameEndPos === reader.fileSize) {
      return header;
    }
    let nextSlice = reader.requestSliceRange(frameEndPos, MIN_ADTS_FRAME_HEADER_SIZE, MAX_ADTS_FRAME_HEADER_SIZE);
    if (isThenable(nextSlice))
      nextSlice = await nextSlice;
    const nextHeader = nextSlice && readAdtsFrameHeader(nextSlice);
    if (nextHeader && headersMatch(header, nextHeader)) {
      return header;
    }
  }
  return null;
};
var readAdtsFrameHeader = (slice) => {
  const startPos = slice.filePos;
  if (slice.remainingLength < MIN_ADTS_FRAME_HEADER_SIZE) {
    return null;
  }
  const bytes = readBytes(slice, MIN_ADTS_FRAME_HEADER_SIZE);
  const bitstream = new Bitstream(bytes);
  const syncword = bitstream.readBits(12);
  if (syncword !== 4095) {
    return null;
  }
  bitstream.skipBits(1);
  const layer = bitstream.readBits(2);
  if (layer !== 0) {
    return null;
  }
  const protectionAbsence = bitstream.readBits(1);
  const objectType = bitstream.readBits(2) + 1;
  const samplingFrequencyIndex = bitstream.readBits(4);
  if (samplingFrequencyIndex >= aacFrequencyTable.length) {
    return null;
  }
  bitstream.skipBits(1);
  const channelConfiguration = bitstream.readBits(3);
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  bitstream.skipBits(1);
  const frameLength = bitstream.readBits(13);
  bitstream.skipBits(11);
  const numberOfAacFrames = bitstream.readBits(2) + 1;
  if (numberOfAacFrames !== 1) {
    return null;
  }
  let crcCheck = null;
  if (protectionAbsence === 0) {
    if (slice.remainingLength < 2) {
      return null;
    }
    crcCheck = readU16Be(slice);
  }
  if (frameLength < slice.filePos - startPos) {
    return null;
  }
  return {
    objectType,
    samplingFrequencyIndex,
    channelConfiguration,
    frameLength,
    numberOfAacFrames,
    crcCheck,
    startPos
  };
};

// node_modules/mediabunny/dist/modules/src/adts/adts-demuxer.js
var SAMPLES_PER_AAC_FRAME = 1024;
var AdtsDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.firstFrameHeader = null;
    this.numberOfChannels = null;
    this.loadedSamples = [];
    this.metadataTags = null;
    this.trackBackings = [];
    this.readingMutex = new AsyncMutex();
    this.lastSampleLoaded = false;
    this.lastLoadedPos = 0;
    this.nextTimestampInSamples = 0;
    this.reader = input2._reader;
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      while (!this.firstFrameHeader && !this.lastSampleLoaded) {
        await this.advanceReader();
      }
      const header = this.firstFrameHeader;
      assert(header);
      if (header.channelConfiguration === 0) {
        const headerSize = header.crcCheck === null ? MIN_ADTS_FRAME_HEADER_SIZE : MAX_ADTS_FRAME_HEADER_SIZE;
        let slice = this.reader.requestSlice(header.startPos + headerSize, header.frameLength - headerSize);
        if (isThenable(slice))
          slice = await slice;
        if (!slice) {
          throw new Error("Invalid ADTS file: the first frame is cut off.");
        }
        const result = readAdtsProgramConfigElement(readBytes(slice, header.frameLength - headerSize));
        if (!result) {
          throw new Error("Invalid ADTS file: frames with channel configuration 0 must begin with a program config element.");
        }
        this.numberOfChannels = getAacProgramConfigElementChannelCount(result.programConfigElement);
      } else {
        this.numberOfChannels = aacChannelMap[header.channelConfiguration];
      }
      this.trackBackings = [new AdtsAudioTrackBacking(this)];
    })();
  }
  async advanceReader() {
    let header;
    if (this.lastLoadedPos === 0) {
      const startPos = await skipId3V2Tags(this.reader, 0);
      header = await readConfirmedAdtsFrameHeader(this.reader, startPos, 4096, null);
    } else {
      let slice = this.reader.requestSliceRange(this.lastLoadedPos, MIN_ADTS_FRAME_HEADER_SIZE, MAX_ADTS_FRAME_HEADER_SIZE);
      if (isThenable(slice))
        slice = await slice;
      header = slice && readAdtsFrameHeader(slice);
      if (!header) {
        assert(this.firstFrameHeader);
        const startPos = await skipId3V2Tags(this.reader, this.lastLoadedPos);
        header = await readConfirmedAdtsFrameHeader(this.reader, startPos, 2 ** 16, this.firstFrameHeader);
      }
    }
    if (!header) {
      this.lastSampleLoaded = true;
      return;
    }
    if (this.reader.fileSize !== null && header.startPos + header.frameLength > this.reader.fileSize) {
      this.lastSampleLoaded = true;
      return;
    }
    this.firstFrameHeader ??= header;
    const sampleRate = aacFrequencyTable[this.firstFrameHeader.samplingFrequencyIndex];
    assert(sampleRate !== void 0);
    if (header.samplingFrequencyIndex !== this.firstFrameHeader.samplingFrequencyIndex) {
      Logging._warn(`The sample rate changes mid-stream (from ${sampleRate} Hz to ${aacFrequencyTable[header.samplingFrequencyIndex]} Hz), which isn't properly supported or handled by Mediabunny.`);
      this.lastSampleLoaded = true;
      return;
    }
    const sample = {
      timestamp: this.nextTimestampInSamples / sampleRate,
      duration: SAMPLES_PER_AAC_FRAME / sampleRate,
      dataStart: header.startPos,
      dataSize: header.frameLength
    };
    this.loadedSamples.push(sample);
    this.nextTimestampInSamples += SAMPLES_PER_AAC_FRAME;
    this.lastLoadedPos = header.startPos + header.frameLength;
  }
  async getMimeType() {
    return "audio/aac";
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.trackBackings;
  }
  async getMetadataTags() {
    const release = await this.readingMutex.acquire();
    try {
      await this.readMetadata();
      if (this.metadataTags) {
        return this.metadataTags;
      }
      this.metadataTags = {};
      let currentPos = 0;
      while (true) {
        let headerSlice = this.reader.requestSlice(currentPos, ID3_V2_HEADER_SIZE);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        if (!headerSlice)
          break;
        const id3V2Header = readId3V2Header(headerSlice);
        if (!id3V2Header) {
          break;
        }
        let contentSlice = this.reader.requestSlice(headerSlice.filePos, id3V2Header.size);
        if (isThenable(contentSlice))
          contentSlice = await contentSlice;
        if (!contentSlice)
          break;
        parseId3V2Tag(contentSlice, id3V2Header, this.metadataTags);
        currentPos = headerSlice.filePos + id3V2Header.size;
      }
      return this.metadataTags;
    } finally {
      release();
    }
  }
};
var AdtsAudioTrackBacking = class {
  constructor(demuxer) {
    this.demuxer = demuxer;
  }
  getType() {
    return "audio";
  }
  getNumber() {
    return 1;
  }
  getTimeResolution() {
    return this.getSampleRate();
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    return null;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getCodec() {
    return "aac";
  }
  getInternalCodecId() {
    assert(this.demuxer.firstFrameHeader);
    return this.demuxer.firstFrameHeader.objectType;
  }
  getNumberOfChannels() {
    assert(this.demuxer.numberOfChannels !== null);
    return this.demuxer.numberOfChannels;
  }
  getSampleRate() {
    assert(this.demuxer.firstFrameHeader);
    const sampleRate = aacFrequencyTable[this.demuxer.firstFrameHeader.samplingFrequencyIndex];
    assert(sampleRate !== void 0);
    return sampleRate;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION
    };
  }
  async getDecoderConfig() {
    assert(this.demuxer.firstFrameHeader);
    return {
      codec: `mp4a.40.${this.demuxer.firstFrameHeader.objectType}`,
      numberOfChannels: this.getNumberOfChannels(),
      sampleRate: this.getSampleRate()
    };
  }
  async getPacketAtIndex(sampleIndex, options) {
    if (sampleIndex === -1) {
      return null;
    }
    const rawSample = this.demuxer.loadedSamples[sampleIndex];
    if (!rawSample) {
      return null;
    }
    let data;
    if (options.metadataOnly) {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.demuxer.reader.requestSlice(rawSample.dataStart, rawSample.dataSize);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        return null;
      }
      data = readBytes(slice, rawSample.dataSize);
    }
    return new EncodedPacket(data, "key", rawSample.timestamp, rawSample.duration, sampleIndex, rawSample.dataSize);
  }
  getFirstPacket(options) {
    return this.getPacketAtIndex(0, options);
  }
  async getNextPacket(packet, options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const sampleIndex = binarySearchExact(this.demuxer.loadedSamples, packet.timestamp, (x) => x.timestamp);
      if (sampleIndex === -1) {
        throw new Error("Packet was not created from this track.");
      }
      const nextIndex = sampleIndex + 1;
      while (nextIndex >= this.demuxer.loadedSamples.length && !this.demuxer.lastSampleLoaded) {
        await this.demuxer.advanceReader();
      }
      return this.getPacketAtIndex(nextIndex, options);
    } finally {
      release();
    }
  }
  async getPacket(timestamp, options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const sampleRate = this.getSampleRate();
      const snappedTimestamp = roundIfAlmostInteger(timestamp * sampleRate) / sampleRate;
      while (true) {
        const index = binarySearchLessOrEqual(this.demuxer.loadedSamples, snappedTimestamp, (x) => x.timestamp);
        if (index === -1 && this.demuxer.loadedSamples.length > 0) {
          return null;
        }
        if (this.demuxer.lastSampleLoaded) {
          return this.getPacketAtIndex(index, options);
        }
        if (index >= 0 && index + 1 < this.demuxer.loadedSamples.length) {
          return this.getPacketAtIndex(index, options);
        }
        await this.demuxer.advanceReader();
      }
    } finally {
      release();
    }
  }
  getKeyPacket(timestamp, options) {
    return this.getPacket(timestamp, options);
  }
  getNextKeyPacket(packet, options) {
    return this.getNextPacket(packet, options);
  }
};

// node_modules/mediabunny/dist/modules/src/flac/flac-misc.js
var getBlockSizeOrUncommon = (bits) => {
  if (bits === 0) {
    return null;
  } else if (bits === 1) {
    return 192;
  } else if (bits >= 2 && bits <= 5) {
    return 144 * 2 ** bits;
  } else if (bits === 6) {
    return "uncommon-u8";
  } else if (bits === 7) {
    return "uncommon-u16";
  } else if (bits >= 8 && bits <= 15) {
    return 2 ** bits;
  } else {
    return null;
  }
};
var getSampleRateOrUncommon = (sampleRateBits, streamInfoSampleRate) => {
  switch (sampleRateBits) {
    case 0:
      return streamInfoSampleRate;
    case 1:
      return 88200;
    case 2:
      return 176400;
    case 3:
      return 192e3;
    case 4:
      return 8e3;
    case 5:
      return 16e3;
    case 6:
      return 22050;
    case 7:
      return 24e3;
    case 8:
      return 32e3;
    case 9:
      return 44100;
    case 10:
      return 48e3;
    case 11:
      return 96e3;
    case 12:
      return "uncommon-u8";
    case 13:
      return "uncommon-u16";
    case 14:
      return "uncommon-u16-10";
    default:
      return null;
  }
};
var readCodedNumber = (fileSlice) => {
  let ones = 0;
  const bitstream1 = new Bitstream(readBytes(fileSlice, 1));
  while (bitstream1.readBits(1) === 1) {
    ones++;
  }
  if (ones === 0) {
    return bitstream1.readBits(7);
  }
  const bitArray = [];
  const extraBytes = ones - 1;
  const bitstream2 = new Bitstream(readBytes(fileSlice, extraBytes));
  const firstByteBits = 8 - ones - 1;
  for (let i = 0; i < firstByteBits; i++) {
    bitArray.unshift(bitstream1.readBits(1));
  }
  for (let i = 0; i < extraBytes; i++) {
    for (let j = 0; j < 8; j++) {
      const val = bitstream2.readBits(1);
      if (j < 2) {
        continue;
      }
      bitArray.unshift(val);
    }
  }
  const encoded = bitArray.reduce((acc, bit, index) => {
    return acc + bit * 2 ** index;
  }, 0);
  return encoded;
};
var readBlockSize = (slice, blockSizeBits) => {
  if (blockSizeBits === "uncommon-u16") {
    return readU16Be(slice) + 1;
  } else if (blockSizeBits === "uncommon-u8") {
    return readU8(slice) + 1;
  } else if (typeof blockSizeBits === "number") {
    return blockSizeBits;
  } else {
    assertNever(blockSizeBits);
    assert(false);
  }
};
var readSampleRate = (slice, sampleRateOrUncommon) => {
  if (sampleRateOrUncommon === "uncommon-u16") {
    return readU16Be(slice);
  }
  if (sampleRateOrUncommon === "uncommon-u16-10") {
    return readU16Be(slice) * 10;
  }
  if (sampleRateOrUncommon === "uncommon-u8") {
    return 1e3 * readU8(slice);
  }
  if (typeof sampleRateOrUncommon === "number") {
    return sampleRateOrUncommon;
  }
  return null;
};
var calculateCrc8 = (data) => {
  const polynomial = 7;
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      if ((crc & 128) !== 0) {
        crc = crc << 1 ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 255;
    }
  }
  return crc;
};

// node_modules/mediabunny/dist/modules/src/flac/flac-demuxer.js
var FlacDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.loadedSamples = [];
    this.metadataPromise = null;
    this.trackBacking = null;
    this.metadataTags = {};
    this.audioInfo = null;
    this.lastLoadedPos = null;
    this.blockingBit = null;
    this.readingMutex = new AsyncMutex();
    this.lastSampleLoaded = false;
    this.reader = input2._reader;
  }
  async getMetadataTags() {
    await this.readMetadata();
    return this.metadataTags;
  }
  async getTrackBackings() {
    await this.readMetadata();
    assert(this.trackBacking);
    return [this.trackBacking];
  }
  async getMimeType() {
    return "audio/flac";
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      let currentPos = 0;
      while (true) {
        let headerSlice = this.reader.requestSlice(currentPos, ID3_V2_HEADER_SIZE);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        if (!headerSlice) {
          break;
        }
        const id3V2Header = readId3V2Header(headerSlice);
        if (!id3V2Header) {
          break;
        }
        let contentSlice = this.reader.requestSlice(headerSlice.filePos, id3V2Header.size);
        if (isThenable(contentSlice))
          contentSlice = await contentSlice;
        assert(contentSlice);
        parseId3V2Tag(contentSlice, id3V2Header, this.metadataTags);
        currentPos = headerSlice.filePos + id3V2Header.size;
      }
      currentPos += 4;
      while (this.reader.fileSize === null || currentPos < this.reader.fileSize) {
        let sizeSlice = this.reader.requestSlice(currentPos, 4);
        if (isThenable(sizeSlice))
          sizeSlice = await sizeSlice;
        currentPos += 4;
        if (sizeSlice === null) {
          throw new Error(`Metadata block at position ${currentPos} is too small! Corrupted file.`);
        }
        assert(sizeSlice);
        const byte = readU8(sizeSlice);
        const size = readU24Be(sizeSlice);
        const isLastMetadata = (byte & 128) !== 0;
        const metaBlockType = byte & 127;
        switch (metaBlockType) {
          case FlacBlockType.STREAMINFO: {
            if (size < 34) {
              throw new Error(`StreamInfo block at position ${currentPos} is too small! Corrupted file.`);
            }
            let streamInfoBlock = this.reader.requestSlice(currentPos, size);
            if (isThenable(streamInfoBlock))
              streamInfoBlock = await streamInfoBlock;
            if (streamInfoBlock === null) {
              throw new Error(`StreamInfo block at position ${currentPos} is too small! Corrupted file.`);
            }
            const streamInfoBytes = readBytes(streamInfoBlock, 34);
            const bitstream = new Bitstream(streamInfoBytes);
            const minimumBlockSize = bitstream.readBits(16);
            const maximumBlockSize = bitstream.readBits(16);
            const minimumFrameSize = bitstream.readBits(24);
            const maximumFrameSize = bitstream.readBits(24);
            const sampleRate = bitstream.readBits(20);
            if (sampleRate === 0) {
              throw new Error("Invalid StreamInfo block: sample rate is 0. Corrupted file.");
            }
            const numberOfChannels = bitstream.readBits(3) + 1;
            bitstream.readBits(5);
            const totalSamples = bitstream.readBits(36);
            bitstream.skipBits(16 * 8);
            const description = new Uint8Array(42);
            description.set(new Uint8Array([102, 76, 97, 67]), 0);
            description.set(new Uint8Array([128, 0, 0, 34]), 4);
            description.set(streamInfoBytes, 8);
            this.audioInfo = {
              numberOfChannels,
              sampleRate,
              totalSamples,
              minimumBlockSize,
              maximumBlockSize,
              minimumFrameSize,
              maximumFrameSize,
              description
            };
            this.trackBacking = new FlacAudioTrackBacking(this);
            break;
          }
          case FlacBlockType.VORBIS_COMMENT: {
            let vorbisCommentBlock = this.reader.requestSlice(currentPos, size);
            if (isThenable(vorbisCommentBlock))
              vorbisCommentBlock = await vorbisCommentBlock;
            if (!vorbisCommentBlock) {
              throw new Error(`Vorbis comment block at position ${currentPos} exceeds the file. Corrupted file.`);
            }
            readVorbisComments(readBytes(vorbisCommentBlock, size), this.metadataTags);
            break;
          }
          case FlacBlockType.PICTURE: {
            let pictureBlock = this.reader.requestSlice(currentPos, size);
            if (isThenable(pictureBlock))
              pictureBlock = await pictureBlock;
            if (!pictureBlock) {
              throw new Error(`Picture block at position ${currentPos} exceeds the file. Corrupted file.`);
            }
            try {
              const pictureType = readU32Be(pictureBlock);
              const mediaTypeLength = readU32Be(pictureBlock);
              const mediaType = textDecoder.decode(readBytes(pictureBlock, mediaTypeLength));
              const descriptionLength = readU32Be(pictureBlock);
              const description = textDecoder.decode(readBytes(pictureBlock, descriptionLength));
              pictureBlock.skip(4 + 4 + 4 + 4);
              const dataLength = readU32Be(pictureBlock);
              const data = readBytes(pictureBlock, dataLength);
              this.metadataTags.images ??= [];
              this.metadataTags.images.push({
                data,
                mimeType: mediaType,
                // https://www.rfc-editor.org/rfc/rfc9639.html#table13
                kind: pictureType === 3 ? "coverFront" : pictureType === 4 ? "coverBack" : "unknown",
                description
              });
            } catch {
            }
            break;
          }
          default:
            break;
        }
        currentPos += size;
        if (isLastMetadata) {
          break;
        }
      }
      this.lastLoadedPos = currentPos;
      if (!this.audioInfo) {
        throw new Error("Missing STREAMINFO metadata block! Corrupted FLAC file.");
      }
    })();
  }
  async readNextFlacFrame(startPos) {
    assert(this.audioInfo);
    const minimumHeaderLength = 6;
    const maximumHeaderLength = 16;
    const minimumFrameLength = 10;
    const maximumFrameLength = this.audioInfo.maximumBlockSize * this.audioInfo.numberOfChannels * 4 + maximumHeaderLength + 2;
    const effectiveMinFrameSize = this.audioInfo.minimumFrameSize || minimumFrameLength;
    const effectiveMaxFrameSize = this.audioInfo.maximumFrameSize || maximumFrameLength;
    const maximumSliceLength = effectiveMaxFrameSize + maximumHeaderLength;
    const slice = await this.reader.requestSliceRange(startPos, minimumHeaderLength, maximumSliceLength);
    if (!slice) {
      return null;
    }
    const frameHeader = this.readFlacFrameHeader(slice);
    if (!frameHeader) {
      return null;
    }
    slice.filePos = startPos + effectiveMinFrameSize;
    while (true) {
      if (slice.filePos > slice.end - minimumHeaderLength) {
        return {
          num: frameHeader.num,
          blockSize: frameHeader.blockSize,
          sampleRate: frameHeader.sampleRate,
          size: slice.end - startPos,
          isLastFrame: true
        };
      }
      const nextByte = readU8(slice);
      if (nextByte === 255) {
        const positionBeforeReading = slice.filePos;
        const byteAfterNextByte = readU8(slice);
        const expected = this.blockingBit === 1 ? 249 : 248;
        if (byteAfterNextByte !== expected) {
          slice.filePos = positionBeforeReading;
          continue;
        }
        slice.skip(-2);
        const lengthIfNextFlacFrameHeaderIsLegit = slice.filePos - startPos;
        const nextFrameHeader = this.readFlacFrameHeader(slice);
        if (!nextFrameHeader) {
          slice.filePos = positionBeforeReading;
          continue;
        }
        if (this.blockingBit === 0) {
          if (nextFrameHeader.num - frameHeader.num !== 1) {
            slice.filePos = positionBeforeReading;
            continue;
          }
        } else {
          if (nextFrameHeader.num - frameHeader.num !== frameHeader.blockSize) {
            slice.filePos = positionBeforeReading;
            continue;
          }
        }
        return {
          num: frameHeader.num,
          blockSize: frameHeader.blockSize,
          sampleRate: frameHeader.sampleRate,
          size: lengthIfNextFlacFrameHeaderIsLegit,
          isLastFrame: false
        };
      }
    }
  }
  readFlacFrameHeader(slice) {
    const startOffset = slice.filePos;
    const bytes = readBytes(slice, 4);
    const bitstream = new Bitstream(bytes);
    const bits = bitstream.readBits(15);
    if (bits !== 32764) {
      return null;
    }
    const blockingBit = bitstream.readBits(1);
    if (this.blockingBit !== null && blockingBit !== this.blockingBit) {
      return null;
    }
    const blockSizeOrUncommon = getBlockSizeOrUncommon(bitstream.readBits(4));
    if (!blockSizeOrUncommon) {
      return null;
    }
    assert(this.audioInfo);
    const sampleRateOrUncommon = getSampleRateOrUncommon(bitstream.readBits(4), this.audioInfo.sampleRate);
    if (!sampleRateOrUncommon) {
      return null;
    }
    bitstream.readBits(4);
    bitstream.readBits(3);
    const reservedZero = bitstream.readBits(1);
    if (reservedZero !== 0) {
      return null;
    }
    const codedNumberFirstByte = readU8(slice);
    slice.skip(-1);
    const codedNumberLength = Math.max(Math.clz32(~codedNumberFirstByte << 24), 1);
    const headerLength = 4 + codedNumberLength + (blockSizeOrUncommon === "uncommon-u16" ? 2 : blockSizeOrUncommon === "uncommon-u8" ? 1 : 0) + (sampleRateOrUncommon === "uncommon-u8" ? 1 : typeof sampleRateOrUncommon === "number" ? 0 : 2) + 1;
    if (startOffset + headerLength > slice.end) {
      return null;
    }
    const num = readCodedNumber(slice);
    const blockSize = readBlockSize(slice, blockSizeOrUncommon);
    const sampleRate = readSampleRate(slice, sampleRateOrUncommon);
    if (sampleRate === null) {
      return null;
    }
    if (sampleRate !== this.audioInfo.sampleRate) {
      return null;
    }
    const size = slice.filePos - startOffset;
    const crc = readU8(slice);
    slice.skip(-size);
    slice.skip(-1);
    const crcCalculated = calculateCrc8(readBytes(slice, size));
    if (crc !== crcCalculated) {
      return null;
    }
    this.blockingBit = blockingBit;
    return { num, blockSize, sampleRate };
  }
  async advanceReader() {
    await this.readMetadata();
    assert(this.lastLoadedPos !== null);
    assert(this.audioInfo);
    const startPos = this.lastLoadedPos;
    const frame = await this.readNextFlacFrame(startPos);
    if (!frame) {
      this.lastSampleLoaded = true;
      return;
    }
    const lastSample = this.loadedSamples[this.loadedSamples.length - 1];
    const blockOffset = lastSample ? lastSample.blockOffset + lastSample.blockSize : 0;
    const sample = {
      blockOffset,
      blockSize: frame.blockSize,
      byteOffset: startPos,
      byteSize: frame.size
    };
    this.lastLoadedPos = this.lastLoadedPos + frame.size;
    this.loadedSamples.push(sample);
    if (frame.isLastFrame) {
      this.lastSampleLoaded = true;
      return;
    }
  }
};
var FlacAudioTrackBacking = class {
  constructor(demuxer) {
    this.demuxer = demuxer;
  }
  getType() {
    return "audio";
  }
  getNumber() {
    return 1;
  }
  getCodec() {
    return "flac";
  }
  getInternalCodecId() {
    return null;
  }
  getNumberOfChannels() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.numberOfChannels;
  }
  getSampleRate() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.sampleRate;
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getTimeResolution() {
    assert(this.demuxer.audioInfo);
    return this.demuxer.audioInfo.sampleRate;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    assert(this.demuxer.audioInfo);
    if (this.demuxer.audioInfo.totalSamples === 0) {
      return null;
    }
    return this.demuxer.audioInfo.totalSamples / this.demuxer.audioInfo.sampleRate;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION
    };
  }
  async getDecoderConfig() {
    assert(this.demuxer.audioInfo);
    return {
      codec: "flac",
      numberOfChannels: this.demuxer.audioInfo.numberOfChannels,
      sampleRate: this.demuxer.audioInfo.sampleRate,
      description: this.demuxer.audioInfo.description
    };
  }
  async getPacket(timestamp, options) {
    assert(this.demuxer.audioInfo);
    if (timestamp < 0) {
      return null;
    }
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const timestampInSamples = roundIfAlmostInteger(timestamp * this.demuxer.audioInfo.sampleRate);
      while (true) {
        const packetIndex = binarySearchLessOrEqual(this.demuxer.loadedSamples, timestampInSamples, (x) => x.blockOffset);
        if (packetIndex === -1) {
          if (this.demuxer.lastSampleLoaded) {
            return null;
          }
          await this.demuxer.advanceReader();
          continue;
        }
        const packet = this.demuxer.loadedSamples[packetIndex];
        if (packet.blockOffset + packet.blockSize <= timestampInSamples) {
          if (this.demuxer.lastSampleLoaded) {
            return this.getPacketAtIndex(this.demuxer.loadedSamples.length - 1, options);
          }
          await this.demuxer.advanceReader();
          continue;
        }
        return this.getPacketAtIndex(packetIndex, options);
      }
    } finally {
      release();
    }
  }
  async getNextPacket(packet, options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      const nextIndex = packet.sequenceNumber + 1;
      if (this.demuxer.lastSampleLoaded && nextIndex >= this.demuxer.loadedSamples.length) {
        return null;
      }
      while (nextIndex >= this.demuxer.loadedSamples.length && !this.demuxer.lastSampleLoaded) {
        await this.demuxer.advanceReader();
      }
      return this.getPacketAtIndex(nextIndex, options);
    } finally {
      release();
    }
  }
  getKeyPacket(timestamp, options) {
    return this.getPacket(timestamp, options);
  }
  getNextKeyPacket(packet, options) {
    return this.getNextPacket(packet, options);
  }
  async getPacketAtIndex(sampleIndex, options) {
    const rawSample = this.demuxer.loadedSamples[sampleIndex];
    if (!rawSample) {
      return null;
    }
    let data;
    if (options.metadataOnly) {
      data = PLACEHOLDER_DATA;
    } else {
      let slice = this.demuxer.reader.requestSlice(rawSample.byteOffset, rawSample.byteSize);
      if (isThenable(slice))
        slice = await slice;
      if (!slice) {
        return null;
      }
      data = readBytes(slice, rawSample.byteSize);
    }
    assert(this.demuxer.audioInfo);
    const timestamp = rawSample.blockOffset / this.demuxer.audioInfo.sampleRate;
    const duration = rawSample.blockSize / this.demuxer.audioInfo.sampleRate;
    return new EncodedPacket(data, "key", timestamp, duration, sampleIndex, rawSample.byteSize);
  }
  async getFirstPacket(options) {
    const release = await this.demuxer.readingMutex.acquire();
    try {
      while (this.demuxer.loadedSamples.length === 0 && !this.demuxer.lastSampleLoaded) {
        await this.demuxer.advanceReader();
      }
      return this.getPacketAtIndex(0, options);
    } finally {
      release();
    }
  }
};

// node_modules/mediabunny/dist/modules/src/mpeg-ts/mpeg-ts-misc.js
var MPEG_TS_TIMESCALE = 9e4;
var TIMESTAMP_MODULUS = 2 ** 33;
var TS_PACKET_SIZE = 188;
var buildMpegTsMimeType = (codecStrings) => {
  let string = "video/MP2T";
  const uniqueCodecStrings = [...new Set(codecStrings.filter(Boolean))];
  if (uniqueCodecStrings.length > 0) {
    string += `; codecs="${uniqueCodecStrings.join(", ")}"`;
  }
  return string;
};
var createTimestampWrapInfo = (firstTimestamp) => {
  const tolerance = 60 * MPEG_TS_TIMESCALE;
  return {
    reference: firstTimestamp >= TIMESTAMP_MODULUS - tolerance ? firstTimestamp - tolerance - TIMESTAMP_MODULUS : firstTimestamp - tolerance
  };
};
var normalizeWrappedTimestamp = (timestamp, wrapInfo) => {
  return wrapInfo.reference + modEuclid(timestamp - wrapInfo.reference, TIMESTAMP_MODULUS);
};

// node_modules/mediabunny/dist/modules/src/mpeg-ts/mpeg-ts-demuxer.js
var MISSING_PTS_ERROR_MESSAGE = "PES packet is missing PTS where it was expected. PES packets without PTS are not currently supported. If you think this file should be supported, please report it.";
var REGISTRATION_DESCRIPTOR_TAG = 5;
var HDMV_FORMAT_IDENTIFIER = 1212435798;
var HDPR_FORMAT_IDENTIFIER = 1212436562;
var DTS_FORMAT_IDENTIFIER_PREFIX = 1146376960;
var BLU_RAY_DTS_STREAM_TYPES = /* @__PURE__ */ new Set([
  133,
  134,
  162
]);
var ignoredStreamTypes = /* @__PURE__ */ new Set();
var MpegTsDemuxer = class _MpegTsDemuxer extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.elementaryStreams = [];
    this.trackBackingEntries = [];
    this.packetOffset = 0;
    this.packetStride = -1;
    this.sectionEndPositions = [];
    this.seekChunkSize = 5 * 1024 * 1024;
    this.minReferencePointByteDistance = -1;
    this.timestampWrapInfo = null;
    this.reader = input2._reader;
  }
  async readMetadata() {
    return this.metadataPromise ??= (async () => {
      const lengthToCheck = TS_PACKET_SIZE + 16 + 1;
      let startingSlice = this.reader.requestSlice(0, lengthToCheck);
      if (isThenable(startingSlice))
        startingSlice = await startingSlice;
      assert(startingSlice);
      const startingBytes = readBytes(startingSlice, lengthToCheck);
      if (startingBytes[0] === 71 && startingBytes[TS_PACKET_SIZE] === 71) {
        this.packetOffset = 0;
        this.packetStride = TS_PACKET_SIZE;
      } else if (startingBytes[0] === 71 && startingBytes[TS_PACKET_SIZE + 16] === 71) {
        this.packetOffset = 0;
        this.packetStride = TS_PACKET_SIZE + 16;
      } else if (startingBytes[4] === 71 && startingBytes[4 + TS_PACKET_SIZE + 4] === 71) {
        this.packetOffset = 4;
        this.packetStride = TS_PACKET_SIZE + 4;
      } else {
        throw new Error("Unreachable.");
      }
      const MIN_REFERENCE_POINT_PACKET_DISTANCE = 256;
      this.minReferencePointByteDistance = MIN_REFERENCE_POINT_PACKET_DISTANCE * this.packetStride;
      let currentPos = this.packetOffset;
      let programMapPid = null;
      let hasProgramAssociationTable = false;
      let hasProgramMap = false;
      while (true) {
        const packetHeader = await this.readPacketHeader(currentPos);
        if (!packetHeader) {
          break;
        }
        if (packetHeader.payloadUnitStartIndicator === 0) {
          currentPos += this.packetStride;
          continue;
        }
        if (hasProgramMap && !this.elementaryStreams.some((x) => x.pid === packetHeader.pid && !x.initialized)) {
          currentPos += this.packetStride;
          continue;
        }
        const isElementaryStreamPid = this.elementaryStreams.some((x) => x.pid === packetHeader.pid);
        const section = await this.readSection(currentPos, !isElementaryStreamPid, !hasProgramMap);
        if (!section) {
          break;
        }
        const BITS_IN_CRC_32 = 32;
        let isProgramMap = false;
        if (!hasProgramMap && section.pid !== 0 && (programMapPid === null || section.pid === programMapPid)) {
          const isPesPacket = section.payload[0] === 0 && section.payload[1] === 0 && section.payload[2] === 1;
          if (!isPesPacket) {
            const bitstream = new Bitstream(section.payload);
            const pointerField = bitstream.readAlignedByte();
            bitstream.skipBits(8 * pointerField);
            const tableId = bitstream.readBits(8);
            isProgramMap = tableId === 2;
          }
        }
        if (section.pid === 0 && !hasProgramAssociationTable) {
          const bitstream = new Bitstream(section.payload);
          const pointerField = bitstream.readAlignedByte();
          bitstream.skipBits(8 * pointerField);
          bitstream.skipBits(14);
          const sectionLength = bitstream.readBits(10);
          const sectionEndPos = bitstream.pos + 8 * sectionLength;
          bitstream.skipBits(40);
          while (sectionEndPos - bitstream.pos > BITS_IN_CRC_32) {
            const programNumber = bitstream.readBits(16);
            bitstream.skipBits(3);
            const id = bitstream.readBits(13);
            if (programNumber !== 0) {
              if (programMapPid !== null) {
                throw new Error("Only files with a single program are supported.");
              } else {
                programMapPid = id;
              }
            }
          }
          if (programMapPid === null) {
            throw new Error("Program Association Table must link to a Program Map Table.");
          }
          hasProgramAssociationTable = true;
        } else if (isProgramMap) {
          const bitstream = new Bitstream(section.payload);
          const pointerField = bitstream.readAlignedByte();
          bitstream.skipBits(8 * pointerField);
          bitstream.skipBits(12);
          const sectionLength = bitstream.readBits(12);
          const sectionEndPos = bitstream.pos + 8 * sectionLength;
          bitstream.skipBits(43);
          const pcrPid = bitstream.readBits(13);
          bitstream.skipBits(6);
          const programInfoLength = bitstream.readBits(10);
          const programInfoEndPos = bitstream.pos + 8 * programInfoLength;
          let isBluRayProgram = false;
          while (bitstream.pos < programInfoEndPos) {
            const descriptorTag = bitstream.readBits(8);
            const descriptorLength = bitstream.readBits(8);
            const descriptorEndPos = bitstream.pos + 8 * descriptorLength;
            if (descriptorTag === REGISTRATION_DESCRIPTOR_TAG && descriptorLength >= 4) {
              const formatIdentifier = bitstream.readBits(32);
              isBluRayProgram ||= formatIdentifier === HDMV_FORMAT_IDENTIFIER || formatIdentifier === HDPR_FORMAT_IDENTIFIER;
            }
            bitstream.pos = descriptorEndPos;
          }
          bitstream.pos = programInfoEndPos;
          while (sectionEndPos - bitstream.pos > BITS_IN_CRC_32) {
            const streamType = bitstream.readBits(8);
            bitstream.skipBits(3);
            const elementaryPid = bitstream.readBits(13);
            bitstream.skipBits(6);
            const esInfoLength = bitstream.readBits(10);
            const esInfoEndPos = bitstream.pos + 8 * esInfoLength;
            let hasAc3Descriptor = false;
            let hasEac3Descriptor = false;
            let hasDtsDescriptor = false;
            while (bitstream.pos < esInfoEndPos) {
              const descriptorTag = bitstream.readBits(8);
              const descriptorLength = bitstream.readBits(8);
              const descriptorEndPos = bitstream.pos + 8 * descriptorLength;
              if (descriptorTag === 106) {
                hasAc3Descriptor = true;
              } else if (descriptorTag === 122 || descriptorTag === 204) {
                hasEac3Descriptor = true;
              } else if (descriptorTag === 123) {
                hasDtsDescriptor = true;
              } else if (descriptorTag === REGISTRATION_DESCRIPTOR_TAG && descriptorLength >= 4) {
                const formatIdentifier = bitstream.readBits(32);
                hasDtsDescriptor ||= (formatIdentifier & 4294967040) === DTS_FORMAT_IDENTIFIER_PREFIX;
              }
              bitstream.pos = descriptorEndPos;
            }
            let info = null;
            const effectiveStreamType = isBluRayProgram && BLU_RAY_DTS_STREAM_TYPES.has(streamType) ? 130 : streamType;
            switch (effectiveStreamType) {
              case 27:
              case 36:
                {
                  const codec = streamType === 27 ? "avc" : "hevc";
                  info = {
                    type: "video",
                    codec,
                    decoderConfig: null,
                    avcCodecInfo: null,
                    hevcCodecInfo: null,
                    colorSpace: {
                      primaries: null,
                      transfer: null,
                      matrix: null,
                      fullRange: null
                    },
                    width: -1,
                    height: -1,
                    squarePixelWidth: -1,
                    squarePixelHeight: -1,
                    reorderSize: -1
                  };
                }
                ;
                break;
              case 3:
              case 4:
              case 15:
              case 129:
              case 135:
              case 130:
              case 138:
                {
                  let codec;
                  if (effectiveStreamType === 3 || effectiveStreamType === 4) {
                    codec = "mp3";
                  } else if (effectiveStreamType === 15) {
                    codec = "aac";
                  } else if (effectiveStreamType === 129) {
                    codec = "ac3";
                  } else if (effectiveStreamType === 135) {
                    codec = "eac3";
                  } else {
                    codec = "dts";
                  }
                  info = {
                    type: "audio",
                    codec,
                    decoderConfig: null,
                    aacCodecInfo: null,
                    dtsFormat: null,
                    numberOfChannels: -1,
                    sampleRate: -1
                  };
                }
                ;
                break;
              case 6:
                {
                  if (hasEac3Descriptor) {
                    info = {
                      type: "audio",
                      codec: "eac3",
                      decoderConfig: null,
                      aacCodecInfo: null,
                      dtsFormat: null,
                      numberOfChannels: -1,
                      sampleRate: -1
                    };
                  } else if (hasAc3Descriptor) {
                    info = {
                      type: "audio",
                      codec: "ac3",
                      decoderConfig: null,
                      aacCodecInfo: null,
                      dtsFormat: null,
                      numberOfChannels: -1,
                      sampleRate: -1
                    };
                  } else if (hasDtsDescriptor) {
                    info = {
                      type: "audio",
                      codec: "dts",
                      decoderConfig: null,
                      aacCodecInfo: null,
                      dtsFormat: null,
                      numberOfChannels: -1,
                      sampleRate: -1
                    };
                  }
                }
                ;
                break;
              default: {
                if (!ignoredStreamTypes.has(streamType)) {
                  Logging._warn(`Note: MPEG-TS streams with stream_type 0x${streamType.toString(16)} are not currently supported.`);
                  ignoredStreamTypes.add(streamType);
                }
              }
            }
            if (info) {
              this.elementaryStreams.push({
                demuxer: this,
                pid: elementaryPid,
                streamType,
                initialized: false,
                firstSection: null,
                canBeTrustedWithKeyPackets: false,
                info,
                referencePesPackets: []
              });
            }
          }
          hasProgramMap = true;
        } else {
          const elementaryStream = this.elementaryStreams.find((x) => x.pid === section.pid);
          outer: if (elementaryStream && !elementaryStream.initialized) {
            const pesPacketHeader = readPesPacketHeader(this, section, true);
            if (!pesPacketHeader) {
              throw new Error(`Couldn't read first PES packet for Elementary Stream with PID ${elementaryStream.pid}`);
            }
            elementaryStream.firstSection = section;
            elementaryStream.canBeTrustedWithKeyPackets = section.randomAccessIndicator === 1;
            if (this.input._initInput) {
              const initDemuxer = await this.input._initInput._getDemuxer();
              if (initDemuxer.constructor !== _MpegTsDemuxer) {
                throw new Error("Init input must match the input's format.");
              }
              await initDemuxer.readMetadata();
              const matchingStream = initDemuxer.elementaryStreams.find((x) => x.pid === section.pid && x.info.codec === elementaryStream.info.codec && x.initialized);
              if (matchingStream) {
                elementaryStream.info = matchingStream.info;
                elementaryStream.initialized = true;
                break outer;
              }
            }
            const context = new PacketReadingContext(elementaryStream, section.startPos);
            if (elementaryStream.info.type === "video") {
              while (true) {
                const contextAlias = context;
                contextAlias.suppliedPacket = null;
                await context.markNextPacket();
                if (elementaryStream.info.codec === "avc") {
                  if (!context.suppliedPacket) {
                    throw new Error("Invalid AVC video stream; could not extract AVCDecoderConfigurationRecord from any packet.");
                  }
                  elementaryStream.info.avcCodecInfo = extractAvcDecoderConfigurationRecord(context.suppliedPacket.data);
                  if (!elementaryStream.info.avcCodecInfo) {
                    continue;
                  }
                  const spsUnit = elementaryStream.info.avcCodecInfo.sequenceParameterSets[0];
                  assert(spsUnit);
                  const spsInfo = parseAvcSps(spsUnit);
                  elementaryStream.info.width = spsInfo.displayWidth;
                  elementaryStream.info.height = spsInfo.displayHeight;
                  const num = spsInfo.pixelAspectRatio.num;
                  const den = spsInfo.pixelAspectRatio.den;
                  elementaryStream.info.squarePixelWidth = elementaryStream.info.width;
                  elementaryStream.info.squarePixelHeight = elementaryStream.info.height;
                  if (num > 0 && den > 0) {
                    if (num > den) {
                      elementaryStream.info.squarePixelWidth = Math.round(elementaryStream.info.width * num / den);
                    } else {
                      elementaryStream.info.squarePixelHeight = Math.round(elementaryStream.info.height * den / num);
                    }
                  }
                  elementaryStream.info.colorSpace = {
                    primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
                    transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
                    matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
                    fullRange: !!spsInfo.fullRangeFlag
                  };
                  elementaryStream.info.reorderSize = spsInfo.maxDecFrameBuffering;
                  break;
                } else if (elementaryStream.info.codec === "hevc") {
                  if (!context.suppliedPacket) {
                    throw new Error("Invalid HEVC video stream; could not extract HVCDecoderConfigurationRecord from first packet.");
                  }
                  elementaryStream.info.hevcCodecInfo = extractHevcDecoderConfigurationRecord(context.suppliedPacket.data);
                  if (!elementaryStream.info.hevcCodecInfo) {
                    continue;
                  }
                  const spsArray = elementaryStream.info.hevcCodecInfo.arrays.find((a) => a.nalUnitType === HevcNalUnitType.SPS_NUT);
                  const spsUnit = spsArray.nalUnits[0];
                  assert(spsUnit);
                  const spsInfo = parseHevcSps(spsUnit);
                  elementaryStream.info.width = spsInfo.displayWidth;
                  elementaryStream.info.height = spsInfo.displayHeight;
                  const num = spsInfo.pixelAspectRatio.num;
                  const den = spsInfo.pixelAspectRatio.den;
                  elementaryStream.info.squarePixelWidth = elementaryStream.info.width;
                  elementaryStream.info.squarePixelHeight = elementaryStream.info.height;
                  if (num > 0 && den > 0) {
                    if (num > den) {
                      elementaryStream.info.squarePixelWidth = Math.round(elementaryStream.info.width * num / den);
                    } else {
                      elementaryStream.info.squarePixelHeight = Math.round(elementaryStream.info.height * den / num);
                    }
                  }
                  elementaryStream.info.colorSpace = {
                    primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
                    transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
                    matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
                    fullRange: !!spsInfo.fullRangeFlag
                  };
                  elementaryStream.info.reorderSize = spsInfo.maxDecFrameBuffering;
                  break;
                } else {
                  throw new Error("Unhandled.");
                }
              }
              elementaryStream.info.decoderConfig = {
                codec: extractVideoCodecString({
                  width: elementaryStream.info.width,
                  height: elementaryStream.info.height,
                  codec: elementaryStream.info.codec,
                  codecDescription: null,
                  colorSpace: elementaryStream.info.colorSpace,
                  avcType: 1,
                  avcCodecInfo: elementaryStream.info.avcCodecInfo,
                  hevcType: "hev1",
                  hevcCodecInfo: elementaryStream.info.hevcCodecInfo,
                  vp9CodecInfo: null,
                  av1CodecInfo: null,
                  proresFormat: null
                }),
                codedWidth: elementaryStream.info.width,
                codedHeight: elementaryStream.info.height,
                colorSpace: elementaryStream.info.colorSpace
              };
              if (elementaryStream.info.width !== elementaryStream.info.squarePixelWidth || elementaryStream.info.height !== elementaryStream.info.squarePixelHeight) {
                elementaryStream.info.decoderConfig.displayAspectWidth = elementaryStream.info.squarePixelWidth;
                elementaryStream.info.decoderConfig.displayAspectHeight = elementaryStream.info.squarePixelHeight;
              }
              elementaryStream.initialized = true;
            } else {
              await context.markNextPacket();
              if (!context.suppliedPacket) {
                throw new Error(`Couldn't parse first media packet for Elementary Stream with PID ${elementaryStream.pid}`);
              }
              if (elementaryStream.info.codec === "aac") {
                const slice = FileSlice.tempFromBytes(context.suppliedPacket.data);
                const header = readAdtsFrameHeader(slice);
                if (!header) {
                  throw new Error("Invalid AAC audio stream; could not read ADTS frame header from first packet.");
                }
                elementaryStream.info.aacCodecInfo = {
                  isMpeg2: false,
                  objectType: header.objectType
                };
                if (header.channelConfiguration === 0) {
                  const headerSize = header.crcCheck === null ? MIN_ADTS_FRAME_HEADER_SIZE : MAX_ADTS_FRAME_HEADER_SIZE;
                  const result = readAdtsProgramConfigElement(context.suppliedPacket.data.subarray(headerSize, header.frameLength));
                  if (!result) {
                    throw new Error("Invalid AAC audio stream; ADTS frames with channel configuration 0 must begin with a program config element.");
                  }
                  elementaryStream.info.numberOfChannels = getAacProgramConfigElementChannelCount(result.programConfigElement);
                } else {
                  elementaryStream.info.numberOfChannels = aacChannelMap[header.channelConfiguration];
                }
                elementaryStream.info.sampleRate = aacFrequencyTable[header.samplingFrequencyIndex];
              } else if (elementaryStream.info.codec === "mp3") {
                const word = readU32Be(FileSlice.tempFromBytes(context.suppliedPacket.data));
                const result = readMp3FrameHeader(word, context.suppliedPacket.data.byteLength);
                if (!result.header) {
                  throw new Error("Invalid MP3 audio stream; could not read frame header from first packet.");
                }
                elementaryStream.info.numberOfChannels = getMp3ChannelCount(result.header.channel);
                elementaryStream.info.sampleRate = result.header.sampleRate;
              } else if (elementaryStream.info.codec === "ac3") {
                const frameInfo = parseAc3SyncFrame(context.suppliedPacket.data);
                if (!frameInfo) {
                  throw new Error("Invalid AC-3 audio stream; could not read sync frame from first packet.");
                }
                if (frameInfo.fscod === 3) {
                  throw new Error("Invalid AC-3 audio stream; reserved sample rate code found in first packet.");
                }
                elementaryStream.info.numberOfChannels = AC3_ACMOD_CHANNEL_COUNTS[frameInfo.acmod] + frameInfo.lfeon;
                elementaryStream.info.sampleRate = AC3_SAMPLE_RATES[frameInfo.fscod];
              } else if (elementaryStream.info.codec === "eac3") {
                const frameInfo = parseEac3SyncFrame(context.suppliedPacket.data);
                if (!frameInfo) {
                  throw new Error("Invalid E-AC-3 audio stream; could not read sync frame from first packet.");
                }
                const sampleRate = getEac3SampleRate(frameInfo);
                if (sampleRate === null) {
                  throw new Error("Invalid E-AC-3 audio stream; reserved sample rate code found in first packet.");
                }
                elementaryStream.info.numberOfChannels = getEac3ChannelCount(frameInfo);
                elementaryStream.info.sampleRate = sampleRate;
              } else if (elementaryStream.info.codec === "dts") {
                const frameInfo = parseDtsFrame(context.suppliedPacket.data);
                if (!frameInfo) {
                  throw new Error("Invalid DTS audio stream; could not read frame header from first packet.");
                }
                elementaryStream.info.numberOfChannels = frameInfo.numberOfChannels;
                elementaryStream.info.sampleRate = frameInfo.sampleRate;
                if (frameInfo.core) {
                  elementaryStream.info.dtsFormat = frameInfo.hasExtensions ? "dtsh" : "dtsc";
                }
              } else {
                throw new Error("Unhandled.");
              }
              elementaryStream.info.decoderConfig = {
                codec: extractAudioCodecString({
                  codec: elementaryStream.info.codec,
                  codecDescription: null,
                  aacCodecInfo: elementaryStream.info.aacCodecInfo,
                  dtsFormat: elementaryStream.info.dtsFormat
                }),
                numberOfChannels: elementaryStream.info.numberOfChannels,
                sampleRate: elementaryStream.info.sampleRate
              };
              elementaryStream.initialized = true;
            }
          }
        }
        const isDone = hasProgramMap && this.elementaryStreams.every((x) => x.initialized);
        if (isDone) {
          break;
        }
        currentPos += this.packetStride;
      }
      if (!hasProgramMap) {
        if (!hasProgramAssociationTable) {
          throw new Error("No Program Association Table found in the file.");
        }
        throw new Error("No Program Map Table found in the file.");
      }
      for (const stream of this.elementaryStreams) {
        if (!stream.initialized) {
          continue;
        }
        if (stream.info.type === "video") {
          this.trackBackingEntries.push(new MpegTsVideoTrackBacking(stream));
        } else {
          this.trackBackingEntries.push(new MpegTsAudioTrackBacking(stream));
        }
      }
    })();
  }
  async getTrackBackings() {
    await this.readMetadata();
    return this.trackBackingEntries;
  }
  async getMetadataTags() {
    return {};
  }
  async getMimeType() {
    await this.readMetadata();
    const codecStrings = await Promise.all(this.trackBackingEntries.map((x) => x.getDecoderConfig().then((c) => c?.codec ?? null)));
    return buildMpegTsMimeType(codecStrings);
  }
  async readSection(startPos, full, contiguous = false) {
    let endPos = startPos;
    let currentPos = startPos;
    const chunks = [];
    let chunksByteLength = 0;
    let firstPacket = null;
    let mustAddSectionEnd = true;
    let randomAccessIndicator = 0;
    while (true) {
      const packet = await this.readPacket(currentPos);
      currentPos += this.packetStride;
      if (!packet) {
        break;
      }
      if (!firstPacket) {
        assert(packet.payloadUnitStartIndicator === 1);
        firstPacket = packet;
      } else {
        if (packet.pid !== firstPacket.pid) {
          if (contiguous) {
            mustAddSectionEnd = false;
            break;
          } else {
            continue;
          }
        }
        if (packet.payloadUnitStartIndicator === 1) {
          break;
        }
      }
      const hasAdaptationField = !!(packet.adaptationFieldControl & 2);
      const hasPayload = !!(packet.adaptationFieldControl & 1);
      let adaptationFieldLength = 0;
      if (hasAdaptationField) {
        adaptationFieldLength = 1 + packet.body[0];
        if (packet === firstPacket && adaptationFieldLength > 1) {
          randomAccessIndicator = packet.body[1] >> 6 & 1;
        }
      }
      if (hasPayload) {
        if (adaptationFieldLength === 0) {
          chunks.push(packet.body);
          chunksByteLength += packet.body.byteLength;
        } else {
          chunks.push(packet.body.subarray(adaptationFieldLength));
          chunksByteLength += packet.body.byteLength - adaptationFieldLength;
        }
      }
      endPos = currentPos;
      if (!full && chunksByteLength >= 64) {
        mustAddSectionEnd = false;
        break;
      }
      const isKnownSectionEnd = binarySearchExact(this.sectionEndPositions, endPos, (x) => x) !== -1;
      if (isKnownSectionEnd) {
        mustAddSectionEnd = false;
        break;
      }
    }
    if (mustAddSectionEnd) {
      const index = binarySearchLessOrEqual(this.sectionEndPositions, endPos, (x) => x);
      this.sectionEndPositions.splice(index + 1, 0, endPos);
    }
    if (!firstPacket) {
      return null;
    }
    let merged;
    if (chunks.length === 1) {
      merged = chunks[0];
    } else {
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
    }
    return {
      startPos,
      pid: firstPacket.pid,
      payload: merged,
      randomAccessIndicator
    };
  }
  async readPacketHeader(pos) {
    let slice = this.reader.requestSlice(pos, 4);
    if (isThenable(slice))
      slice = await slice;
    if (!slice) {
      return null;
    }
    const syncByte = readU8(slice);
    if (syncByte !== 71) {
      throw new Error("Invalid TS packet sync byte; the file is likely corrupted.");
    }
    const nextTwoBytes = readU16Be(slice);
    const transportErrorIndicator = nextTwoBytes >> 15;
    const payloadUnitStartIndicator = nextTwoBytes >> 14 & 1;
    const transportPriority = nextTwoBytes >> 13 & 1;
    const pid = nextTwoBytes & 8191;
    const nextByte = readU8(slice);
    const transportScramblingControl = nextByte >> 6;
    const adaptationFieldControl = nextByte >> 4 & 3;
    const continuityCounter = nextByte & 15;
    return {
      payloadUnitStartIndicator,
      pid,
      adaptationFieldControl
    };
  }
  async readPacket(pos) {
    let slice = this.reader.requestSlice(pos, TS_PACKET_SIZE);
    if (isThenable(slice))
      slice = await slice;
    if (!slice) {
      return null;
    }
    const bytes = readBytes(slice, TS_PACKET_SIZE);
    const syncByte = bytes[0];
    if (syncByte !== 71) {
      throw new Error("Invalid TS packet sync byte; the file is likely corrupted.");
    }
    const nextTwoBytes = (bytes[1] << 8) + bytes[2];
    const transportErrorIndicator = nextTwoBytes >> 15;
    const payloadUnitStartIndicator = nextTwoBytes >> 14 & 1;
    const transportPriority = nextTwoBytes >> 13 & 1;
    const pid = nextTwoBytes & 8191;
    const nextByte = bytes[3];
    const transportScramblingControl = nextByte >> 6;
    const adaptationFieldControl = nextByte >> 4 & 3;
    const continuityCounter = nextByte & 15;
    return {
      payloadUnitStartIndicator,
      pid,
      adaptationFieldControl,
      body: bytes.subarray(4)
    };
  }
  normalizeTimestamp(timestamp) {
    this.timestampWrapInfo ??= createTimestampWrapInfo(timestamp);
    return normalizeWrappedTimestamp(timestamp, this.timestampWrapInfo);
  }
};
var readPesPacketHeader = (demuxer, section, expectPts) => {
  if (section.payload.byteLength < 3) {
    return null;
  }
  const bitstream = new Bitstream(section.payload);
  const startCodePrefix = bitstream.readBits(24);
  if (startCodePrefix !== 1) {
    return null;
  }
  const streamId = bitstream.readBits(8);
  bitstream.skipBits(16);
  if (streamId === 188 || streamId === 190 || streamId === 191 || streamId === 240 || streamId === 241 || streamId === 255 || streamId === 242 || streamId === 248) {
    return null;
  }
  bitstream.skipBits(8);
  const ptsDtsFlags = bitstream.readBits(2);
  bitstream.skipBits(14);
  let pts = null;
  if (ptsDtsFlags === 2 || ptsDtsFlags === 3) {
    pts = 0;
    bitstream.skipBits(4);
    pts += bitstream.readBits(3) * (1 << 30);
    bitstream.skipBits(1);
    pts += bitstream.readBits(15) * (1 << 15);
    bitstream.skipBits(1);
    pts += bitstream.readBits(15);
    pts = demuxer.normalizeTimestamp(pts);
  } else {
    if (expectPts) {
      throw new Error(MISSING_PTS_ERROR_MESSAGE);
    }
  }
  return {
    sectionStartPos: section.startPos,
    pts,
    randomAccessIndicator: section.randomAccessIndicator
  };
};
var MpegTsTrackBacking = class _MpegTsTrackBacking {
  constructor(elementaryStream) {
    this.elementaryStream = elementaryStream;
    this.packetBuffers = /* @__PURE__ */ new WeakMap();
    this.packetSectionStarts = /* @__PURE__ */ new WeakMap();
  }
  getNumber() {
    const demuxer = this.elementaryStream.demuxer;
    const trackType = this.elementaryStream.info.type;
    let number = 0;
    for (const backing of demuxer.trackBackingEntries) {
      if (backing.getType() === trackType) {
        number++;
      }
      assert(backing instanceof _MpegTsTrackBacking);
      if (backing.elementaryStream === this.elementaryStream) {
        break;
      }
    }
    return number;
  }
  getCodec() {
    throw new Error("Not implemented on base class.");
  }
  getInternalCodecId() {
    return this.elementaryStream.streamType;
  }
  getName() {
    return null;
  }
  getLanguageCode() {
    return UNDETERMINED_LANGUAGE;
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION,
      primary: false
    };
  }
  getTimeResolution() {
    return MPEG_TS_TIMESCALE;
  }
  isRelativeToUnixEpoch() {
    return false;
  }
  getUnixTimeForTimestamp() {
    return null;
  }
  getPairingMask() {
    return 1n;
  }
  getBitrate() {
    return null;
  }
  getAverageBitrate() {
    return null;
  }
  async getDurationFromMetadata() {
    return null;
  }
  async getLiveRefreshInterval() {
    return null;
  }
  createEncodedPacket(suppliedPacket, duration, options) {
    let packetType;
    if (this.allPacketsAreKeyPackets()) {
      packetType = "key";
    } else {
      packetType = suppliedPacket.randomAccessIndicator === 1 ? "key" : "delta";
    }
    return new EncodedPacket(options.metadataOnly ? PLACEHOLDER_DATA : suppliedPacket.data, packetType, suppliedPacket.pts / MPEG_TS_TIMESCALE, Math.max(duration / MPEG_TS_TIMESCALE, 0), suppliedPacket.sequenceNumber, suppliedPacket.data.byteLength);
  }
  async getFirstPacket(options) {
    const section = this.elementaryStream.firstSection;
    assert(section);
    const context = new PacketReadingContext(this.elementaryStream, section.startPos);
    const buffer = new PacketBuffer(this, context);
    const result = await buffer.readNext();
    if (!result) {
      return null;
    }
    const packet = this.createEncodedPacket(result.packet, result.duration, options);
    this.packetBuffers.set(packet, buffer);
    this.packetSectionStarts.set(packet, result.packet.sectionStartPos);
    return packet;
  }
  async getNextPacket(packet, options) {
    let buffer = this.packetBuffers.get(packet);
    if (buffer) {
      this.packetBuffers.delete(packet);
      const result = await buffer.readNext();
      if (!result) {
        return null;
      }
      const newPacket = this.createEncodedPacket(result.packet, result.duration, options);
      this.packetBuffers.set(newPacket, buffer);
      this.packetSectionStarts.set(newPacket, result.packet.sectionStartPos);
      return newPacket;
    }
    const sectionStartPos = this.packetSectionStarts.get(packet);
    if (sectionStartPos === void 0) {
      throw new Error("Packet was not created from this track.");
    }
    const demuxer = this.elementaryStream.demuxer;
    let startPos = sectionStartPos;
    let pesPacketsToRewind = this.getReorderSize();
    let pos = sectionStartPos - demuxer.packetStride;
    while (pesPacketsToRewind > 0 && pos >= demuxer.packetOffset) {
      const packetHeader = await demuxer.readPacketHeader(pos);
      assert(packetHeader);
      if (packetHeader.pid === this.elementaryStream.pid && packetHeader.payloadUnitStartIndicator === 1) {
        const pesSection = await demuxer.readSection(pos, false);
        assert(pesSection);
        const pesHeader = readPesPacketHeader(demuxer, pesSection, false);
        if (pesHeader && pesHeader.pts !== null) {
          startPos = pos;
          pesPacketsToRewind--;
        }
      }
      pos -= demuxer.packetStride;
    }
    const context = new PacketReadingContext(this.elementaryStream, startPos);
    buffer = new PacketBuffer(this, context);
    const targetSequenceNumber = packet.sequenceNumber;
    while (true) {
      const result = await buffer.readNext();
      if (!result) {
        return null;
      }
      if (result.packet.sequenceNumber > targetSequenceNumber) {
        const newPacket = this.createEncodedPacket(result.packet, result.duration, options);
        this.packetBuffers.set(newPacket, buffer);
        this.packetSectionStarts.set(newPacket, result.packet.sectionStartPos);
        return newPacket;
      }
    }
  }
  async getNextKeyPacket(packet, options) {
    let currentPacket = packet;
    while (true) {
      currentPacket = await this.getNextPacket(currentPacket, options);
      if (!currentPacket) {
        return null;
      }
      if (currentPacket.type === "key") {
        return currentPacket;
      }
    }
  }
  getPacket(timestamp, options) {
    return this.doPacketLookup(timestamp, false, options);
  }
  getKeyPacket(timestamp, options) {
    return this.doPacketLookup(timestamp, true, options);
  }
  /**
   * Searches for the packet with the largest timestamp not larger than `timestamp` in the file, using a combination
   * of chunk-based binary search and linear refinement. The reason the coarse search is done in large chunks is to
   * make it more performant for small files and over high-latency readers such as the network.
   */
  async doPacketLookup(timestamp, keyframesOnly, options) {
    const searchPts = roundIfAlmostInteger(timestamp * MPEG_TS_TIMESCALE);
    const demuxer = this.elementaryStream.demuxer;
    const { reader, seekChunkSize } = demuxer;
    const pid = this.elementaryStream.pid;
    const findFirstPesPacketHeaderInChunk = async (startPos, endPos) => {
      let currentPos = startPos;
      while (currentPos < endPos) {
        const packetHeader = await demuxer.readPacketHeader(currentPos);
        if (!packetHeader) {
          return null;
        }
        if (packetHeader.pid === pid && packetHeader.payloadUnitStartIndicator === 1) {
          const section = await demuxer.readSection(currentPos, false);
          if (!section) {
            return null;
          }
          const pesPacketHeader = readPesPacketHeader(demuxer, section, false);
          if (pesPacketHeader && pesPacketHeader.pts !== null) {
            return pesPacketHeader;
          }
        }
        currentPos += demuxer.packetStride;
      }
      return null;
    };
    const firstSection = this.elementaryStream.firstSection;
    assert(firstSection);
    const firstPesPacketHeader = readPesPacketHeader(demuxer, firstSection, true);
    assert(firstPesPacketHeader);
    let scanStartPos;
    const referencePesPackets = this.elementaryStream.referencePesPackets;
    const referencePointIndex = binarySearchLessOrEqual(referencePesPackets, searchPts, (x) => x.pts);
    const referencePoint = referencePointIndex !== -1 ? referencePesPackets[referencePointIndex] : null;
    if (referencePoint && searchPts - referencePoint.pts < MPEG_TS_TIMESCALE / 2) {
      scanStartPos = referencePoint.sectionStartPos;
    } else {
      let startChunkIndex = 0;
      if (reader.fileSize !== null && searchPts >= firstPesPacketHeader.pts) {
        const numChunks = Math.ceil(reader.fileSize / seekChunkSize);
        if (numChunks > 1) {
          let low = 0;
          let high = numChunks - 1;
          startChunkIndex = low;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const chunkStartPos = floorToMultiple(mid * seekChunkSize, demuxer.packetStride) + firstPesPacketHeader.sectionStartPos;
            const chunkEndPos = chunkStartPos + seekChunkSize;
            const pesPacketHeader = await findFirstPesPacketHeaderInChunk(chunkStartPos, chunkEndPos);
            if (!pesPacketHeader) {
              high = mid - 1;
              continue;
            }
            if (pesPacketHeader.pts <= searchPts) {
              startChunkIndex = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
        }
      }
      scanStartPos = floorToMultiple(startChunkIndex * seekChunkSize, demuxer.packetStride) + firstPesPacketHeader.sectionStartPos;
    }
    let currentPesHeader = await findFirstPesPacketHeaderInChunk(scanStartPos, reader.fileSize ?? Infinity);
    if (!currentPesHeader) {
      currentPesHeader = firstPesPacketHeader;
    }
    const reorderSize = this.getReorderSize();
    const retrieveEncodedPacket = async (sectionStartPos, predicate) => {
      const context = new PacketReadingContext(this.elementaryStream, sectionStartPos);
      const buffer = new PacketBuffer(this, context);
      while (true) {
        const topPts = last(buffer.presentationOrderPackets)?.pts ?? -Infinity;
        if (topPts >= searchPts) {
          break;
        }
        const didRead = await buffer.readNextPacket();
        if (!didRead) {
          break;
        }
      }
      const targetIndex = findLastIndex(buffer.presentationOrderPackets, predicate);
      if (targetIndex === -1) {
        return null;
      }
      const targetPacket = buffer.presentationOrderPackets[targetIndex];
      buffer.decodeOrderPackets.splice(0, buffer.decodeOrderPackets.indexOf(targetPacket));
      const result = await buffer.readNext();
      assert(result);
      const packet = this.createEncodedPacket(result.packet, result.duration, options);
      this.packetBuffers.set(packet, buffer);
      this.packetSectionStarts.set(packet, result.packet.sectionStartPos);
      return packet;
    };
    if (!keyframesOnly || this.allPacketsAreKeyPackets()) {
      outer: while (true) {
        let currentPos = currentPesHeader.sectionStartPos + demuxer.packetStride;
        while (true) {
          const packetHeader = await demuxer.readPacketHeader(currentPos);
          if (!packetHeader) {
            break outer;
          }
          if (packetHeader.pid === pid && packetHeader.payloadUnitStartIndicator === 1) {
            const section = await demuxer.readSection(currentPos, false);
            if (section) {
              const nextPesHeader = readPesPacketHeader(demuxer, section, false);
              if (nextPesHeader && nextPesHeader.pts !== null) {
                if (nextPesHeader.pts > searchPts) {
                  break outer;
                }
                currentPesHeader = nextPesHeader;
                maybeInsertReferencePacket(this.elementaryStream, currentPesHeader);
                break;
              }
            }
          }
          currentPos += demuxer.packetStride;
        }
      }
      outer: for (let i = 0; i < reorderSize + 1; i++) {
        let pos = currentPesHeader.sectionStartPos - demuxer.packetStride;
        while (pos >= firstPesPacketHeader.sectionStartPos) {
          const packetHeader = await demuxer.readPacketHeader(pos);
          if (!packetHeader) {
            break outer;
          }
          if (packetHeader.pid === pid && packetHeader.payloadUnitStartIndicator === 1) {
            const section = await demuxer.readSection(pos, false);
            if (section) {
              const header = readPesPacketHeader(demuxer, section, false);
              if (header && header.pts !== null) {
                currentPesHeader = header;
                break;
              }
            }
          }
          pos -= demuxer.packetStride;
        }
        if (pos < firstPesPacketHeader.sectionStartPos) {
          break;
        }
      }
      return retrieveEncodedPacket(currentPesHeader.sectionStartPos, (p) => p.pts <= searchPts);
    } else {
      let currentChunkStartPos = scanStartPos;
      let nextChunkStartPos = null;
      while (true) {
        let bestKeyPesHeader = null;
        const isFirstChunk = currentChunkStartPos <= firstPesPacketHeader.sectionStartPos;
        let pesHeader;
        if (isFirstChunk) {
          pesHeader = firstPesPacketHeader;
        } else {
          pesHeader = await findFirstPesPacketHeaderInChunk(currentChunkStartPos, nextChunkStartPos ?? reader.fileSize ?? Infinity);
        }
        let passedSearchPts = false;
        let lookaheadCount = 0;
        let context = null;
        outer: while (pesHeader) {
          if (nextChunkStartPos !== null && pesHeader.sectionStartPos >= nextChunkStartPos) {
            break;
          }
          if (pesHeader.pts <= searchPts) {
            let isKeyPacket;
            if (this.elementaryStream.canBeTrustedWithKeyPackets) {
              isKeyPacket = pesHeader.randomAccessIndicator === 1;
            } else {
              context ??= new PacketReadingContext(this.elementaryStream, pesHeader.sectionStartPos);
              while (!context.suppliedPacket || context.suppliedPacket.sectionStartPos < pesHeader.sectionStartPos) {
                context.suppliedPacket = null;
                await context.markNextPacket();
                if (!context.suppliedPacket) {
                  break;
                }
              }
              isKeyPacket = context.suppliedPacket?.sectionStartPos === pesHeader.sectionStartPos && context.suppliedPacket.randomAccessIndicator === 1;
            }
            if (isKeyPacket) {
              bestKeyPesHeader = pesHeader;
            }
          }
          if (pesHeader.pts > searchPts) {
            passedSearchPts = true;
          }
          if (passedSearchPts) {
            lookaheadCount++;
            if (lookaheadCount > reorderSize) {
              break;
            }
          }
          let currentPos = pesHeader.sectionStartPos + demuxer.packetStride;
          while (true) {
            const packetHeader = await demuxer.readPacketHeader(currentPos);
            if (!packetHeader) {
              break outer;
            }
            if (packetHeader.pid === pid && packetHeader.payloadUnitStartIndicator === 1) {
              const section = await demuxer.readSection(currentPos, false);
              if (section) {
                const nextPesHeader = readPesPacketHeader(demuxer, section, false);
                if (nextPesHeader && nextPesHeader.pts !== null) {
                  pesHeader = nextPesHeader;
                  maybeInsertReferencePacket(this.elementaryStream, pesHeader);
                  break;
                }
              }
            }
            currentPos += demuxer.packetStride;
          }
        }
        if (bestKeyPesHeader) {
          let startPesHeader = bestKeyPesHeader;
          if (lookaheadCount === 0) {
            outer: for (let i = 0; i < reorderSize + 1; i++) {
              let pos = startPesHeader.sectionStartPos - demuxer.packetStride;
              while (pos >= firstPesPacketHeader.sectionStartPos) {
                const packetHeader = await demuxer.readPacketHeader(pos);
                if (!packetHeader) {
                  break outer;
                }
                if (packetHeader.pid === pid && packetHeader.payloadUnitStartIndicator === 1) {
                  const section = await demuxer.readSection(pos, false);
                  if (section) {
                    const header = readPesPacketHeader(demuxer, section, false);
                    if (header && header.pts !== null) {
                      startPesHeader = header;
                      break;
                    }
                  }
                }
                pos -= demuxer.packetStride;
              }
              if (pos < firstPesPacketHeader.sectionStartPos) {
                break;
              }
            }
          }
          const encodedPacket = await retrieveEncodedPacket(startPesHeader.sectionStartPos, (p) => p.pts <= searchPts && p.randomAccessIndicator === 1);
          if (encodedPacket) {
            return encodedPacket;
          } else {
          }
        }
        if (isFirstChunk) {
          return null;
        }
        nextChunkStartPos = currentChunkStartPos;
        currentChunkStartPos = Math.max(floorToMultiple(currentChunkStartPos - firstPesPacketHeader.sectionStartPos - seekChunkSize, demuxer.packetStride) + firstPesPacketHeader.sectionStartPos, firstPesPacketHeader.sectionStartPos);
      }
    }
  }
};
var MpegTsVideoTrackBacking = class extends MpegTsTrackBacking {
  getType() {
    return "video";
  }
  getCodec() {
    return this.elementaryStream.info.codec;
  }
  getCodedWidth() {
    return this.elementaryStream.info.width;
  }
  getCodedHeight() {
    return this.elementaryStream.info.height;
  }
  getSquarePixelWidth() {
    return this.elementaryStream.info.squarePixelWidth;
  }
  getSquarePixelHeight() {
    return this.elementaryStream.info.squarePixelHeight;
  }
  getTransformationMatrix() {
    return [...IDENTITY_MATRIX];
  }
  async getColorSpace() {
    return this.elementaryStream.info.colorSpace;
  }
  async canBeTransparent() {
    return false;
  }
  async getDecoderConfig() {
    assert(this.elementaryStream.info.decoderConfig);
    return this.elementaryStream.info.decoderConfig;
  }
  allPacketsAreKeyPackets() {
    return false;
  }
  getReorderSize() {
    return this.elementaryStream.info.reorderSize;
  }
};
var MpegTsAudioTrackBacking = class extends MpegTsTrackBacking {
  getType() {
    return "audio";
  }
  getCodec() {
    return this.elementaryStream.info.codec;
  }
  getNumberOfChannels() {
    return this.elementaryStream.info.numberOfChannels;
  }
  getSampleRate() {
    return this.elementaryStream.info.sampleRate;
  }
  async getDecoderConfig() {
    assert(this.elementaryStream.info.decoderConfig);
    return this.elementaryStream.info.decoderConfig;
  }
  allPacketsAreKeyPackets() {
    return true;
  }
  getReorderSize() {
    return 0;
  }
};
var maybeInsertReferencePacket = (elementaryStream, pesPacketHeader) => {
  const referencePesPackets = elementaryStream.referencePesPackets;
  const index = binarySearchLessOrEqual(referencePesPackets, pesPacketHeader.sectionStartPos, (x) => x.sectionStartPos);
  const minByteDistance = elementaryStream.demuxer.minReferencePointByteDistance;
  if (index >= 0) {
    const entry = referencePesPackets[index];
    if (pesPacketHeader.pts <= entry.pts) {
      return false;
    }
    if (pesPacketHeader.sectionStartPos - entry.sectionStartPos < minByteDistance) {
      return false;
    }
  }
  if (index < referencePesPackets.length - 1) {
    const nextEntry = referencePesPackets[index + 1];
    if (nextEntry.pts < pesPacketHeader.pts) {
      return false;
    }
    if (nextEntry.sectionStartPos - pesPacketHeader.sectionStartPos < minByteDistance) {
      return false;
    }
  }
  referencePesPackets.splice(index + 1, 0, {
    sectionStartPos: pesPacketHeader.sectionStartPos,
    pts: pesPacketHeader.pts,
    randomAccessIndicator: pesPacketHeader.randomAccessIndicator
  });
  return true;
};
var PacketReadingContext = class {
  constructor(elementaryStream, pesPacketStartPos) {
    this.reachedEnd = false;
    this.isInPesPacket = false;
    this.pesHeaderBytesLeft = 0;
    this.pesDataBytesLeft = 0;
    this.currentPos = 0;
    this.endPos = 0;
    this.scratch = new Uint8Array(2 ** 16);
    this.scratchStartPos = 0;
    this.pesPackets = [];
    this.pesPacketDataStartPositions = [];
    this.lastSuppliedPesPacket = null;
    this.nextPts = null;
    this.suppliedPacket = null;
    this.elementaryStream = elementaryStream;
    this.pid = elementaryStream.pid;
    this.demuxer = elementaryStream.demuxer;
    this.nextTsPacketPos = pesPacketStartPos;
  }
  ensureBuffered(length) {
    const remaining = this.endPos - this.currentPos;
    if (remaining >= length) {
      return length;
    }
    return this.bufferData(length - remaining).then(() => Math.min(this.endPos - this.currentPos, length));
  }
  async bufferData(length) {
    const targetEndPos = this.endPos + length;
    while (this.endPos < targetEndPos && !this.reachedEnd) {
      const pos = this.nextTsPacketPos;
      const packet = await this.demuxer.readPacket(pos);
      if (!packet) {
        this.reachedEnd = true;
        break;
      }
      this.nextTsPacketPos += this.demuxer.packetStride;
      if (packet.pid !== this.pid) {
        continue;
      }
      if (packet.payloadUnitStartIndicator === 1) {
        this.isInPesPacket = false;
        const section = await this.demuxer.readSection(pos, false);
        assert(section);
        const header = readPesPacketHeader(this.demuxer, section, false);
        if (!header) {
          continue;
        }
        const bitstream = new Bitstream(section.payload);
        bitstream.skipBits(32);
        const pesPacketLength = bitstream.readBits(16);
        const BYTES_UNTIL_END_OF_PES_PACKET_LENGTH = 6;
        bitstream.skipBits(16);
        const pesHeaderDataLength = bitstream.readBits(8);
        this.pesHeaderBytesLeft = bitstream.pos / 8 + pesHeaderDataLength;
        this.pesDataBytesLeft = pesPacketLength > 0 ? Math.max(BYTES_UNTIL_END_OF_PES_PACKET_LENGTH + pesPacketLength - this.pesHeaderBytesLeft, 0) : Infinity;
        this.isInPesPacket = true;
        this.pesPackets.push(header);
        this.pesPacketDataStartPositions.push(this.endPos);
      }
      if (!this.isInPesPacket || !(packet.adaptationFieldControl & 1)) {
        continue;
      }
      const body = packet.body;
      let start = packet.adaptationFieldControl & 2 ? 1 + body[0] : 0;
      const skippedHeaderBytes = Math.min(this.pesHeaderBytesLeft, Math.max(body.byteLength - start, 0));
      this.pesHeaderBytesLeft -= skippedHeaderBytes;
      start += skippedHeaderBytes;
      const end = Math.min(body.byteLength, start + this.pesDataBytesLeft);
      if (end <= start) {
        continue;
      }
      const byteCount = end - start;
      this.pesDataBytesLeft -= byteCount;
      const scratchLength = this.endPos - this.scratchStartPos;
      if (scratchLength + byteCount > this.scratch.byteLength) {
        const scratch = new Uint8Array(2 * this.scratch.byteLength);
        scratch.set(this.scratch.subarray(0, scratchLength));
        this.scratch = scratch;
      }
      this.scratch.set(body.subarray(start, end), scratchLength);
      this.endPos += byteCount;
    }
  }
  readBytes(length) {
    const start = this.currentPos - this.scratchStartPos;
    this.currentPos += length;
    return this.scratch.subarray(start, start + length);
  }
  readU8() {
    return this.scratch[this.currentPos++ - this.scratchStartPos];
  }
  seekTo(pos) {
    assert(pos >= this.scratchStartPos);
    this.currentPos = pos;
  }
  skip(n) {
    this.seekTo(this.currentPos + n);
  }
  async markNextPacket() {
    assert(!this.suppliedPacket);
    const elementaryStream = this.elementaryStream;
    if (elementaryStream.info.type === "video") {
      const codec = elementaryStream.info.codec;
      const CHUNK_SIZE = 1024;
      if (codec !== "avc" && codec !== "hevc") {
        throw new Error("Unhandled.");
      }
      const nalHeaderSize = codec === "avc" ? 1 : 2;
      let packetStartPos = null;
      let frameStartFound = false;
      let lastFirstMacroblockInSlice = 0;
      while (true) {
        let remaining = this.ensureBuffered(CHUNK_SIZE);
        if (isThenable(remaining))
          remaining = await remaining;
        if (remaining === 0) {
          break;
        }
        const chunkStartPos = this.currentPos;
        const chunk = this.readBytes(remaining);
        const length = chunk.byteLength;
        let i = 0;
        while (i < length) {
          const zeroIndex = chunk.indexOf(0, i);
          if (zeroIndex === -1 || zeroIndex >= length) {
            break;
          }
          i = zeroIndex;
          const posBeforeZero = chunkStartPos + i;
          if (i + 3 >= length) {
            this.seekTo(posBeforeZero);
            break;
          }
          const b1 = chunk[i + 1];
          const b2 = chunk[i + 2];
          const b3 = chunk[i + 3];
          let startCodeLength = 0;
          if (b1 === 0 && b2 === 0 && b3 === 1) {
            startCodeLength = 4;
          } else if (b1 === 0 && b2 === 1) {
            startCodeLength = 3;
          }
          if (startCodeLength === 0) {
            i++;
            continue;
          }
          const startCodePos = posBeforeZero;
          packetStartPos ??= startCodePos;
          const nalHeaderStart = i + startCodeLength;
          const payloadStart = nalHeaderStart + nalHeaderSize;
          if (payloadStart + 1 > length) {
            this.seekTo(posBeforeZero);
            break;
          }
          const headerByte0 = chunk[nalHeaderStart];
          let nalUnitType;
          let isSlice;
          let isAccessUnitStart;
          let isAccessUnitDelimiter;
          if (codec === "avc") {
            nalUnitType = extractNalUnitTypeForAvc(headerByte0);
            isSlice = nalUnitType === AvcNalUnitType.NON_IDR_SLICE || nalUnitType === AvcNalUnitType.SLICE_DPA || nalUnitType === AvcNalUnitType.IDR;
            isAccessUnitStart = nalUnitType === AvcNalUnitType.SEI || nalUnitType === AvcNalUnitType.SPS || nalUnitType === AvcNalUnitType.PPS || nalUnitType === AvcNalUnitType.AUD;
            isAccessUnitDelimiter = nalUnitType === AvcNalUnitType.AUD;
          } else {
            nalUnitType = extractNalUnitTypeForHevc(headerByte0);
            const layerId = (headerByte0 & 1) << 5 | chunk[nalHeaderStart + 1] >> 3;
            if (layerId > 0) {
              i += startCodeLength;
              continue;
            }
            isSlice = nalUnitType <= HevcNalUnitType.RASL_R || nalUnitType >= HevcNalUnitType.BLA_W_LP && nalUnitType <= 21;
            isAccessUnitStart = nalUnitType >= HevcNalUnitType.VPS_NUT && nalUnitType <= 35 || nalUnitType === HevcNalUnitType.PREFIX_SEI_NUT || nalUnitType >= 41 && nalUnitType <= 44 || nalUnitType >= 48 && nalUnitType <= 55;
            isAccessUnitDelimiter = nalUnitType === HevcNalUnitType.AUD_NUT;
          }
          let isFrameBoundary = false;
          if (isSlice) {
            let startsNewPicture;
            if (codec === "avc") {
              const bitstream = new Bitstream(chunk.subarray(payloadStart));
              let firstMacroblockInSlice;
              try {
                firstMacroblockInSlice = readExpGolomb(bitstream);
              } catch {
                firstMacroblockInSlice = null;
              }
              if (firstMacroblockInSlice === null || bitstream.getBitsLeft() < 0) {
                this.seekTo(posBeforeZero);
                break;
              }
              startsNewPicture = !frameStartFound || firstMacroblockInSlice <= lastFirstMacroblockInSlice;
              lastFirstMacroblockInSlice = firstMacroblockInSlice;
            } else {
              startsNewPicture = chunk[payloadStart] >> 7 === 1;
            }
            if (startsNewPicture) {
              if (frameStartFound) {
                isFrameBoundary = true;
              } else {
                frameStartFound = true;
              }
            }
          } else if (isAccessUnitStart && frameStartFound) {
            isFrameBoundary = true;
          } else if (isAccessUnitDelimiter) {
            packetStartPos = startCodePos;
          }
          if (isFrameBoundary) {
            const packetLength = startCodePos - packetStartPos;
            this.seekTo(packetStartPos);
            return this.supplyPacket(packetLength, 0);
          }
          i += startCodeLength;
        }
        if (remaining < CHUNK_SIZE) {
          break;
        }
      }
      if (frameStartFound) {
        assert(packetStartPos !== null);
        const packetLength = this.endPos - packetStartPos;
        this.seekTo(packetStartPos);
        return this.supplyPacket(packetLength, 0);
      }
    } else {
      const codec = elementaryStream.info.codec;
      const CHUNK_SIZE = 128;
      while (true) {
        let remaining = this.ensureBuffered(CHUNK_SIZE);
        if (isThenable(remaining))
          remaining = await remaining;
        const startPos = this.currentPos;
        while (this.currentPos - startPos < remaining) {
          const byte = this.readU8();
          if (codec === "aac") {
            if (byte !== 255) {
              continue;
            }
            this.skip(-1);
            const possibleHeaderStartPos = this.currentPos;
            let remaining2 = this.ensureBuffered(MAX_ADTS_FRAME_HEADER_SIZE);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            if (remaining2 < MAX_ADTS_FRAME_HEADER_SIZE) {
              return;
            }
            const headerBytes = this.readBytes(MAX_ADTS_FRAME_HEADER_SIZE);
            const header = readAdtsFrameHeader(FileSlice.tempFromBytes(headerBytes));
            if (header) {
              this.seekTo(possibleHeaderStartPos);
              let remaining3 = this.ensureBuffered(header.frameLength);
              if (isThenable(remaining3))
                remaining3 = await remaining3;
              return this.supplyPacket(remaining3, SAMPLES_PER_AAC_FRAME * MPEG_TS_TIMESCALE / elementaryStream.info.sampleRate);
            } else {
              this.seekTo(possibleHeaderStartPos + 1);
            }
          } else if (codec === "mp3") {
            if (byte !== 255) {
              continue;
            }
            this.skip(-1);
            const possibleHeaderStartPos = this.currentPos;
            let remaining2 = this.ensureBuffered(MP3_FRAME_HEADER_SIZE);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            if (remaining2 < MP3_FRAME_HEADER_SIZE) {
              return;
            }
            const headerBytes = this.readBytes(MP3_FRAME_HEADER_SIZE);
            const word = toDataView(headerBytes).getUint32(0);
            const result = readMp3FrameHeader(word, null);
            if (result.header) {
              this.seekTo(possibleHeaderStartPos);
              let remaining3 = this.ensureBuffered(result.header.totalSize);
              if (isThenable(remaining3))
                remaining3 = await remaining3;
              const duration = result.header.audioSamplesInFrame * MPEG_TS_TIMESCALE / elementaryStream.info.sampleRate;
              return this.supplyPacket(remaining3, duration);
            } else {
              this.seekTo(possibleHeaderStartPos + 1);
            }
          } else if (codec === "ac3") {
            if (byte !== 11) {
              continue;
            }
            this.skip(-1);
            const possibleSyncPos = this.currentPos;
            let remaining2 = this.ensureBuffered(5);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            if (remaining2 < 5) {
              return;
            }
            const headerBytes = this.readBytes(5);
            if (headerBytes[0] !== 11 || headerBytes[1] !== 119) {
              this.seekTo(possibleSyncPos + 1);
              continue;
            }
            const fscod = headerBytes[4] >> 6;
            const frmsizecod = headerBytes[4] & 63;
            if (fscod === 3 || frmsizecod > 37) {
              this.seekTo(possibleSyncPos + 1);
              continue;
            }
            const frameSize = AC3_FRAME_SIZES[3 * frmsizecod + fscod];
            assert(frameSize !== void 0);
            this.seekTo(possibleSyncPos);
            remaining2 = this.ensureBuffered(frameSize);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            const duration = AC3_SAMPLES_PER_FRAME * MPEG_TS_TIMESCALE / elementaryStream.info.sampleRate;
            return this.supplyPacket(remaining2, duration);
          } else if (codec === "eac3") {
            if (byte !== 11) {
              continue;
            }
            this.skip(-1);
            const possibleSyncPos = this.currentPos;
            let remaining2 = this.ensureBuffered(5);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            if (remaining2 < 5) {
              return;
            }
            const headerBytes = this.readBytes(5);
            if (headerBytes[0] !== 11 || headerBytes[1] !== 119) {
              this.seekTo(possibleSyncPos + 1);
              continue;
            }
            const frmsiz = (headerBytes[2] & 7) << 8 | headerBytes[3];
            let frameSize = (frmsiz + 1) * 2;
            const fscod = headerBytes[4] >> 6;
            const numblkscod = fscod === 3 ? 3 : headerBytes[4] >> 4 & 3;
            const numblks = EAC3_NUMBLKS_TABLE[numblkscod];
            while (true) {
              this.seekTo(possibleSyncPos);
              const neededBytes = frameSize + 4;
              let remaining3 = this.ensureBuffered(neededBytes);
              if (isThenable(remaining3))
                remaining3 = await remaining3;
              if (remaining3 < neededBytes) {
                break;
              }
              this.seekTo(possibleSyncPos + frameSize);
              const nextHeaderBytes = this.readBytes(4);
              if (nextHeaderBytes[0] !== 11 || nextHeaderBytes[1] !== 119 || nextHeaderBytes[2] >> 6 !== 1) {
                break;
              }
              frameSize += 2 * (((nextHeaderBytes[2] & 7) << 8 | nextHeaderBytes[3]) + 1);
            }
            this.seekTo(possibleSyncPos);
            remaining2 = this.ensureBuffered(frameSize);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            const samplesPerFrame = numblks * 256;
            const duration = samplesPerFrame * MPEG_TS_TIMESCALE / elementaryStream.info.sampleRate;
            return this.supplyPacket(remaining2, duration);
          } else if (codec === "dts") {
            if (byte !== 127 && byte !== 100) {
              continue;
            }
            this.skip(-1);
            const possibleSyncPos = this.currentPos;
            let remaining2 = this.ensureBuffered(DTS_CORE_FRAME_HEADER_SIZE);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            if (remaining2 < DTS_CORE_FRAME_HEADER_SIZE) {
              return;
            }
            const headerBytes = this.readBytes(DTS_CORE_FRAME_HEADER_SIZE);
            const core = parseDtsCoreFrameHeader(headerBytes);
            let leadingExss = core ? null : parseDtsExssHeader(headerBytes);
            if (!core && !leadingExss) {
              this.seekTo(possibleSyncPos + 1);
              continue;
            }
            if (leadingExss && !leadingExss.asset) {
              this.seekTo(possibleSyncPos);
              const headerBound = Math.min(leadingExss.frameSize, DTS_EXSS_MAX_HEADER_SIZE);
              let remaining3 = this.ensureBuffered(headerBound);
              if (isThenable(remaining3))
                remaining3 = await remaining3;
              leadingExss = parseDtsExssHeader(this.readBytes(remaining3)) ?? leadingExss;
            }
            let frameSize = core ? core.frameSize : leadingExss.frameSize;
            if (core) {
              let nextSubstreamPos = Math.ceil(core.frameSize / 4) * 4;
              while (true) {
                this.seekTo(possibleSyncPos);
                const neededBytes = nextSubstreamPos + DTS_EXSS_HEADER_PREFIX_SIZE;
                let remaining3 = this.ensureBuffered(neededBytes);
                if (isThenable(remaining3))
                  remaining3 = await remaining3;
                if (remaining3 < neededBytes) {
                  break;
                }
                this.seekTo(possibleSyncPos + nextSubstreamPos);
                const exss = parseDtsExssHeader(this.readBytes(DTS_EXSS_HEADER_PREFIX_SIZE));
                if (!exss) {
                  break;
                }
                nextSubstreamPos += exss.frameSize;
                frameSize = nextSubstreamPos;
              }
            }
            const sampleCount = core?.sampleCount ?? leadingExss.asset?.sampleCount;
            if (sampleCount === void 0) {
              this.seekTo(possibleSyncPos + 1);
              continue;
            }
            this.seekTo(possibleSyncPos);
            remaining2 = this.ensureBuffered(frameSize);
            if (isThenable(remaining2))
              remaining2 = await remaining2;
            const duration = sampleCount * MPEG_TS_TIMESCALE / elementaryStream.info.sampleRate;
            return this.supplyPacket(remaining2, duration);
          } else {
            throw new Error("Unhandled.");
          }
        }
        if (remaining < CHUNK_SIZE) {
          break;
        }
      }
    }
  }
  /** Supplies the context with a new encoded packet, beginning at the current position. */
  supplyPacket(packetLength, intrinsicDuration) {
    const pesPacketIndex = findLastIndex(this.pesPacketDataStartPositions, (x) => x <= this.currentPos);
    assert(pesPacketIndex !== -1);
    const currentPesPacket = this.pesPackets[pesPacketIndex];
    const currentPesPacketDataStartPos = this.pesPacketDataStartPositions[pesPacketIndex];
    let pts;
    if (this.lastSuppliedPesPacket === currentPesPacket) {
      assert(this.nextPts !== null);
      pts = this.nextPts;
    } else {
      if (currentPesPacket.pts === null) {
        throw new Error(MISSING_PTS_ERROR_MESSAGE);
      }
      pts = currentPesPacket.pts;
      maybeInsertReferencePacket(this.elementaryStream, currentPesPacket);
    }
    this.lastSuppliedPesPacket = currentPesPacket;
    this.nextPts = pts + intrinsicDuration;
    const sectionStartPos = currentPesPacket.sectionStartPos;
    const sequenceNumber = sectionStartPos + (this.currentPos - currentPesPacketDataStartPos);
    const data = this.readBytes(packetLength).slice();
    let randomAccessIndicator = currentPesPacket.randomAccessIndicator;
    if (randomAccessIndicator === 0 && !this.elementaryStream.canBeTrustedWithKeyPackets) {
      if (this.elementaryStream.info.type === "audio") {
        randomAccessIndicator = 1;
      } else {
        if (this.elementaryStream.info.decoderConfig) {
          const isKey = determineVideoPacketType(this.elementaryStream.info.codec, this.elementaryStream.info.decoderConfig, data) === "key";
          randomAccessIndicator = Number(isKey);
        } else {
        }
      }
    }
    const roundedPts = Math.round(pts);
    this.suppliedPacket = {
      pts: roundedPts,
      intrinsicDuration: Math.round(pts + intrinsicDuration) - roundedPts,
      data,
      sequenceNumber,
      sectionStartPos,
      randomAccessIndicator
    };
    const keptStart = this.currentPos - this.scratchStartPos;
    this.scratch.copyWithin(0, keptStart, this.endPos - this.scratchStartPos);
    this.scratchStartPos = this.currentPos;
    const keptPesPacketIndex = findLastIndex(this.pesPacketDataStartPositions, (x) => x <= this.currentPos);
    this.pesPackets.splice(0, keptPesPacketIndex);
    this.pesPacketDataStartPositions.splice(0, keptPesPacketIndex);
  }
};
var PacketBuffer = class {
  constructor(backing, context) {
    this.decodeOrderPackets = [];
    this.reorderBuffer = [];
    this.presentationOrderPackets = [];
    this.reachedEnd = false;
    this.lastDuration = 0;
    this.backing = backing;
    this.context = context;
    this.reorderSize = backing.getReorderSize();
    assert(this.reorderSize >= 0);
  }
  async readNext() {
    if (this.decodeOrderPackets.length === 0) {
      const didRead = await this.readNextPacket();
      if (!didRead) {
        return null;
      }
    }
    await this.ensureCurrentPacketHasNext();
    const packet = this.decodeOrderPackets[0];
    const presentationIndex = this.presentationOrderPackets.indexOf(packet);
    let duration;
    if (presentationIndex !== -1 && presentationIndex < this.presentationOrderPackets.length - 1) {
      const nextPacket = this.presentationOrderPackets[presentationIndex + 1];
      duration = nextPacket.pts - packet.pts;
      this.lastDuration = duration;
    } else if (packet.intrinsicDuration > 0) {
      duration = packet.intrinsicDuration;
    } else if (presentationIndex > 0) {
      duration = packet.pts - this.presentationOrderPackets[presentationIndex - 1].pts;
    } else {
      duration = this.lastDuration;
    }
    this.decodeOrderPackets.shift();
    while (this.presentationOrderPackets.length > 0) {
      const first = this.presentationOrderPackets[0];
      if (this.decodeOrderPackets.includes(first)) {
        break;
      }
      this.presentationOrderPackets.shift();
    }
    return { packet, duration };
  }
  async readNextPacket() {
    if (this.reachedEnd) {
      return false;
    }
    let suppliedPacket;
    if (this.context.suppliedPacket) {
      suppliedPacket = this.context.suppliedPacket;
    } else {
      await this.context.markNextPacket();
      suppliedPacket = this.context.suppliedPacket;
    }
    this.context.suppliedPacket = null;
    if (!suppliedPacket) {
      this.reachedEnd = true;
      this.flushReorderBuffer();
      return false;
    }
    this.decodeOrderPackets.push(suppliedPacket);
    this.processPacketThroughReorderBuffer(suppliedPacket);
    return true;
  }
  async ensureCurrentPacketHasNext() {
    const current = this.decodeOrderPackets[0];
    assert(current);
    while (true) {
      const presentationIndex = this.presentationOrderPackets.indexOf(current);
      if (presentationIndex !== -1 && presentationIndex <= this.presentationOrderPackets.length - 2) {
        break;
      }
      if (this.decodeOrderPackets.length > 4 * (this.reorderSize + 1)) {
        break;
      }
      const didRead = await this.readNextPacket();
      if (!didRead) {
        break;
      }
    }
  }
  processPacketThroughReorderBuffer(packet) {
    this.reorderBuffer.push(packet);
    if (this.reorderBuffer.length > this.reorderSize) {
      let minIndex = 0;
      for (let i = 1; i < this.reorderBuffer.length; i++) {
        if (this.reorderBuffer[i].pts < this.reorderBuffer[minIndex].pts) {
          minIndex = i;
        }
      }
      const packet2 = this.reorderBuffer[minIndex];
      this.presentationOrderPackets.push(packet2);
      this.reorderBuffer.splice(minIndex, 1);
    }
  }
  flushReorderBuffer() {
    this.reorderBuffer.sort((a, b) => a.pts - b.pts);
    this.presentationOrderPackets.push(...this.reorderBuffer);
    this.reorderBuffer.length = 0;
  }
};

// node_modules/mediabunny/dist/modules/src/hls/hls-misc.js
var HLS_MIME_TYPE = "application/vnd.apple.mpegurl";
var TAG_STREAM_INF = "#EXT-X-STREAM-INF:";
var TAG_I_FRAME_STREAM_INF = "#EXT-X-I-FRAME-STREAM-INF:";
var TAG_MEDIA = "#EXT-X-MEDIA:";
var TAG_DEFINE = "#EXT-X-DEFINE:";
var TAG_EXTINF = "#EXTINF:";
var TAG_MAP = "#EXT-X-MAP:";
var TAG_KEY = "#EXT-X-KEY:";
var TAG_MEDIA_SEQUENCE = "#EXT-X-MEDIA-SEQUENCE:";
var TAG_BYTERANGE = "#EXT-X-BYTERANGE:";
var TAG_PROGRAM_DATE_TIME = "#EXT-X-PROGRAM-DATE-TIME:";
var TAG_DISCONTINUITY = "#EXT-X-DISCONTINUITY";
var TAG_DISCONTINUITY_SEQUENCE = "#EXT-X-DISCONTINUITY-SEQUENCE:";
var TAG_TARGETDURATION = "#EXT-X-TARGETDURATION:";
var TAG_ENDLIST = "#EXT-X-ENDLIST";
var TAG_PLAYLIST_TYPE = "#EXT-X-PLAYLIST-TYPE:";
var TAG_I_FRAMES_ONLY = "#EXT-X-I-FRAMES-ONLY";
var TIMESTAMP_PRIV_OWNER = "com.apple.streaming.transportStreamTimestamp";
var canIgnoreLine = (line) => line.length === 0 || line.startsWith("#") && !line.startsWith("#EXT");
var AttributeList = class {
  constructor(str, variables) {
    this._attributes = {};
    let key = "";
    let value = "";
    let inValue = false;
    let inQuotes = false;
    let quotedValue = false;
    const flushAttribute = () => {
      if (!key) {
        return;
      }
      const attributeName = key.trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(this._attributes, attributeName)) {
        Logging._warn(`Duplicate AttributeName "${attributeName}"; using last value`);
      }
      const shouldSubstitute = quotedValue || value.startsWith("0x") || value.startsWith("0X");
      this._attributes[attributeName] = shouldSubstitute && variables ? variables.substitute(value) : value;
      key = "";
      value = "";
      inValue = false;
      quotedValue = false;
    };
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"') {
        if (inValue && !inQuotes && value.length === 0) {
          quotedValue = true;
        }
        inQuotes = !inQuotes;
      } else if (char === "=" && !inValue && !inQuotes) {
        inValue = true;
      } else if (char === "," && !inQuotes) {
        flushAttribute();
      } else if (inValue) {
        value += char;
      } else {
        key += char;
      }
    }
    if (inQuotes) {
      throw new Error("Invalid M3U8 file; unterminated quoted-string AttributeValue.");
    }
    flushAttribute();
  }
  get(name) {
    return this._attributes[name.toLowerCase()] ?? null;
  }
  getAsNumber(name) {
    const value = this.get(name);
    if (value === null) {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  merge(other) {
    Object.assign(this._attributes, other._attributes);
  }
};
var VARIABLE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
var VARIABLE_REFERENCE_PATTERN = /\{\$([A-Za-z0-9_-]+)\}/g;
var MAX_TOTAL_SUBSTITUTED_LENGTH = 2 ** 26;
var HlsPlaylistVariables = class {
  constructor(playlistPath, importedVariables) {
    this.playlistPath = playlistPath;
    this.importedVariables = importedVariables;
    this.variables = /* @__PURE__ */ new Map();
    this.totalSubstitutedLength = 0;
  }
  define(str) {
    const attributes = new AttributeList(str, this);
    const name = attributes.get("name");
    const importedName = attributes.get("import");
    const queryParameterName = attributes.get("queryparam");
    const declarationCount = [name, importedName, queryParameterName].filter((value) => value !== null).length;
    if (declarationCount !== 1) {
      throw new Error("Invalid #EXT-X-DEFINE tag; exactly one of NAME, IMPORT, or QUERYPARAM must be present.");
    }
    if (name !== null) {
      const value = attributes.get("value");
      if (value === null) {
        throw new Error("Invalid #EXT-X-DEFINE tag; NAME requires VALUE.");
      }
      this.set(name, value);
    } else if (importedName !== null) {
      const value = this.importedVariables?.get(importedName);
      if (value === void 0) {
        throw new Error(`Invalid #EXT-X-DEFINE tag; cannot import undefined variable "${importedName}".`);
      }
      this.set(importedName, value);
    } else if (queryParameterName !== null) {
      const value = getQueryParameter(this.playlistPath, queryParameterName);
      if (value === null) {
        throw new Error(`Invalid #EXT-X-DEFINE tag; query parameter "${queryParameterName}" is missing.`);
      }
      this.set(queryParameterName, value);
    }
  }
  substitute(value) {
    return value.replaceAll(VARIABLE_REFERENCE_PATTERN, (_reference, name) => {
      const replacement = this.variables.get(name);
      if (replacement === void 0) {
        throw new Error(`Invalid M3U8 file; variable "${name}" is referenced before being defined.`);
      }
      this.totalSubstitutedLength += replacement.length;
      if (this.totalSubstitutedLength > MAX_TOTAL_SUBSTITUTED_LENGTH) {
        throw new Error("Invalid M3U8 file; variable substitution produces an excessive amount of data.");
      }
      return replacement;
    });
  }
  get(name) {
    return this.variables.get(name);
  }
  set(name, value) {
    if (!VARIABLE_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid #EXT-X-DEFINE tag; invalid variable name "${name}".`);
    }
    if (this.variables.has(name)) {
      throw new Error(`Invalid #EXT-X-DEFINE tag; variable "${name}" is already defined.`);
    }
    this.variables.set(name, value);
  }
};

// node_modules/mediabunny/dist/modules/src/segmented-input.js
var SegmentedInput = class {
  constructor(input2, path, trackDeclarations) {
    this.nextInputCacheAge = 0;
    this.inputCache = [];
    this.trackBackingsPromise = null;
    this.firstSegment = null;
    this.hasOnlyKeyPackets = false;
    this.learnedSegmentTimestampOffset = null;
    this.segmentMediaOffsets = /* @__PURE__ */ new WeakMap();
    this.input = input2;
    this.path = path;
    this.trackDeclarations = trackDeclarations;
  }
  async getDurationFromMetadata(options) {
    const lastSegment = await this.getSegmentAt(Infinity, {
      skipLiveWait: options.skipLiveWait
    });
    if (!lastSegment) {
      return null;
    }
    return lastSegment.timestamp + await this.getFirstSegmentTimestampOffset() + lastSegment.duration;
  }
  async getUnixTimeForTimestamp(timestamp) {
    let segment = await this.getSegmentAt(timestamp, { skipLiveWait: true });
    segment ??= await this.getFirstSegment({});
    if (!segment || segment.unixEpochTimestamp === null) {
      return null;
    }
    const elapsed = timestamp - (segment.timestamp + await this.getFirstSegmentTimestampOffset());
    return segment.unixEpochTimestamp + elapsed;
  }
  async getTrackBackings() {
    return this.trackBackingsPromise ??= (async () => {
      const backings = [];
      if (this.trackDeclarations) {
        for (const decl of this.trackDeclarations) {
          if (decl.type === "video") {
            const number = arrayCount(backings, (x) => x.getType() === "video") + 1;
            backings.push(new SegmentedInputInputVideoTrackBacking(this, decl, number));
          } else if (decl.type === "audio") {
            const number = arrayCount(backings, (x) => x.getType() === "audio") + 1;
            backings.push(new SegmentedInputInputAudioTrackBacking(this, decl, number));
          }
        }
      } else {
        this.firstSegment = await this.getFirstSegment({});
        if (!this.firstSegment) {
          return [];
        }
        const input2 = this.getInputForSegment(this.firstSegment);
        const inputTracks = await input2.getTracks();
        for (const track of inputTracks) {
          if (track.type === "video") {
            const number = arrayCount(backings, (x) => x.getType() === "video") + 1;
            backings.push(new SegmentedInputInputVideoTrackBacking(this, { type: "video" }, number));
          } else if (track.type === "audio") {
            const number = arrayCount(backings, (x) => x.getType() === "audio") + 1;
            backings.push(new SegmentedInputInputAudioTrackBacking(this, { type: "audio" }, number));
          }
        }
      }
      return backings;
    })();
  }
  getMediaOffset(segment, input2) {
    let promise = this.segmentMediaOffsets.get(segment);
    if (promise) {
      return promise;
    }
    promise = (async () => {
      const rawTimestampOffset = await this.getRawTimestampOffset(input2);
      if (rawTimestampOffset === null) {
        return segment.timestamp;
      }
      let mediaOffset = rawTimestampOffset + await this.getMediaOffsetForDiscontinuity(segment.discontinuityNumber);
      const period = this.getTimestampWrapPeriod();
      if (period < Infinity) {
        const firstTimestamp = await getReferenceFirstTimestamp(input2);
        if (firstTimestamp !== null) {
          const mediaStart = firstTimestamp + mediaOffset;
          mediaOffset += period * Math.round((segment.timestamp - mediaStart) / period);
        }
      }
      return mediaOffset;
    })();
    this.segmentMediaOffsets.set(segment, promise);
    return promise;
  }
  dispose() {
    for (const entry of this.inputCache) {
      entry.input.dispose();
    }
    this.inputCache.length = 0;
  }
};
var getReferenceFirstTimestamp = async (input2) => {
  const tracks = await input2.getTracks();
  const orderedTracks = [
    ...tracks.filter((x) => x.type === "video"),
    ...tracks.filter((x) => x.type !== "video")
  ];
  for (const track of orderedTracks) {
    const firstTimestamp = await track.getFirstTimestampOrNull();
    if (firstTimestamp !== null) {
      return firstTimestamp;
    }
  }
  return null;
};
var SegmentedInputInputTrackBacking = class {
  constructor(segmentedInput, decl, number) {
    this.packetInfos = /* @__PURE__ */ new WeakMap();
    this.hydrationPromise = null;
    this.firstInputTrack = null;
    this.firstSegment = null;
    this.segmentedInput = segmentedInput;
    this.decl = decl;
    this.number = number;
  }
  hydrate() {
    return this.hydrationPromise ??= (async () => {
      this.segmentedInput.firstSegment ??= await this.segmentedInput.getFirstSegment({});
      if (!this.segmentedInput.firstSegment) {
        throw new Error("Missing first segment, can't retrieve track.");
      }
      let currentSegment = this.segmentedInput.firstSegment;
      let track = null;
      while (currentSegment) {
        const input2 = this.segmentedInput.getInputForSegment(currentSegment);
        const inputTracks = await input2.getTracks();
        track = inputTracks.find((x) => x.type === this.decl.type && x.number === this.number) ?? null;
        if (track) {
          break;
        }
        currentSegment = await this.segmentedInput.getNextSegment(currentSegment, {});
      }
      if (!track) {
        throw new Error("No matching track found in underlying media data.");
      }
      this.firstInputTrack = track;
      this.firstSegment = currentSegment;
    })();
  }
  getType() {
    return this.decl.type;
  }
  getNumber() {
    return this.number;
  }
  /** If the backing track is already present, delegate synchronously; otherwise, hydrate first. */
  delegate(fn) {
    if (this.firstInputTrack) {
      return fn();
    }
    return this.hydrate().then(fn);
  }
  async getDecoderConfig() {
    return this.delegate(() => this.firstInputTrack._backing.getDecoderConfig());
  }
  getHasOnlyKeyPackets() {
    return this.delegate(() => {
      return this.segmentedInput.hasOnlyKeyPackets || (this.firstInputTrack._backing.getHasOnlyKeyPackets?.() ?? null);
    });
  }
  getPairingMask() {
    return 1n;
  }
  getCodec() {
    return this.delegate(() => this.firstInputTrack._backing.getCodec());
  }
  getInternalCodecId() {
    return this.delegate(() => this.firstInputTrack._backing.getInternalCodecId());
  }
  getDisposition() {
    return this.delegate(() => this.firstInputTrack._backing.getDisposition());
  }
  getLanguageCode() {
    return this.delegate(() => this.firstInputTrack._backing.getLanguageCode());
  }
  getName() {
    return this.delegate(() => this.firstInputTrack._backing.getName());
  }
  getTimeResolution() {
    return this.delegate(() => this.firstInputTrack._backing.getTimeResolution());
  }
  async isRelativeToUnixEpoch() {
    await this.hydrate();
    assert(this.segmentedInput.firstSegment);
    return this.segmentedInput.firstSegment.unixEpochTimestamp === this.segmentedInput.firstSegment.timestamp;
  }
  getUnixTimeForTimestamp(timestamp) {
    return this.segmentedInput.getUnixTimeForTimestamp(timestamp);
  }
  getBitrate() {
    return this.delegate(() => this.firstInputTrack._backing.getBitrate());
  }
  getAverageBitrate() {
    return this.delegate(() => this.firstInputTrack._backing.getAverageBitrate());
  }
  getDurationFromMetadata(options) {
    return this.segmentedInput.getDurationFromMetadata(options);
  }
  getLiveRefreshInterval() {
    return this.segmentedInput.getLiveRefreshInterval();
  }
  async createAdjustedPacket(packet, segment, track) {
    assert(packet.sequenceNumber >= 0);
    assert(this.segmentedInput.firstSegment);
    const mediaOffset = await this.segmentedInput.getMediaOffset(segment, track.input);
    const segmentTimestampRelativeToFirst = segment.timestamp - this.segmentedInput.firstSegment.timestamp;
    const modified = packet.clone({
      timestamp: roundToDivisor(packet.timestamp + mediaOffset, await track.getTimeResolution()),
      // The 1e8 assumes a max of 100 MB per second, highly unlikely to be hit, so this should guarantee
      // monotonically increasing sequence numbers across segments.
      sequenceNumber: Math.floor(1e8 * segmentTimestampRelativeToFirst) + packet.sequenceNumber
    });
    this.packetInfos.set(modified, {
      segment,
      track,
      sourcePacket: packet
    });
    return modified;
  }
  async getFirstPacket(options) {
    await this.hydrate();
    assert(this.firstInputTrack);
    assert(this.firstSegment);
    let currentTrack = this.firstInputTrack;
    let currentSegment = this.firstSegment;
    while (true) {
      if (currentTrack) {
        const packet = await currentTrack._backing.getFirstPacket(options);
        if (packet) {
          return this.createAdjustedPacket(packet, currentSegment, currentTrack);
        }
      }
      currentSegment = await this.segmentedInput.getNextSegment(currentSegment, {
        skipLiveWait: options.skipLiveWait
      });
      if (!currentSegment) {
        break;
      }
      const nextInput = this.segmentedInput.getInputForSegment(currentSegment);
      const nextTracks = await nextInput.getTracks();
      currentTrack = nextTracks.find((t) => t.type === this.firstInputTrack.type && t.number === this.firstInputTrack.number) ?? null;
    }
    return null;
  }
  getNextPacket(packet, options) {
    return this._getNextInternal(packet, options, false);
  }
  getNextKeyPacket(packet, options) {
    return this._getNextInternal(packet, options, true);
  }
  async _getNextInternal(packet, options, keyframesOnly) {
    const info = this.packetInfos.get(packet);
    if (!info) {
      throw new Error("Packet was not created from this track.");
    }
    const nextPacket = keyframesOnly ? await info.track._backing.getNextKeyPacket(info.sourcePacket, options) : await info.track._backing.getNextPacket(info.sourcePacket, options);
    if (nextPacket) {
      return this.createAdjustedPacket(nextPacket, info.segment, info.track);
    }
    let currentSegment = info.segment;
    while (true) {
      const nextSegment = await this.segmentedInput.getNextSegment(currentSegment, {
        skipLiveWait: options.skipLiveWait
      });
      if (!nextSegment) {
        return null;
      }
      const nextInput = this.segmentedInput.getInputForSegment(nextSegment);
      const nextTracks = await nextInput.getTracks();
      const nextTrack = nextTracks.find((t) => t.type === info.track.type && t.number === info.track.number);
      if (!nextTrack) {
        currentSegment = nextSegment;
        continue;
      }
      let packet2 = await nextTrack._backing.getFirstPacket(options);
      if (packet2 && keyframesOnly && packet2.type !== "key") {
        packet2 = await nextTrack._backing.getNextKeyPacket(packet2, options);
      }
      if (!packet2) {
        currentSegment = nextSegment;
        continue;
      }
      return this.createAdjustedPacket(packet2, nextSegment, nextTrack);
    }
  }
  getPacket(timestamp, options) {
    return this._getPacketInternal(timestamp, options, false);
  }
  getKeyPacket(timestamp, options) {
    return this._getPacketInternal(timestamp, options, true);
  }
  async _getPacketInternal(timestamp, options, keyframesOnly) {
    let currentSegment = await this.segmentedInput.getSegmentAt(timestamp, {
      skipLiveWait: options.skipLiveWait
    });
    currentSegment ??= await this.segmentedInput.getFirstSegment({});
    if (!currentSegment) {
      return null;
    }
    await this.hydrate();
    while (currentSegment) {
      const input2 = this.segmentedInput.getInputForSegment(currentSegment);
      const tracks = await input2.getTracks();
      const track = tracks.find((t) => t.type === this.firstInputTrack.type && t.number === this.firstInputTrack.number);
      if (!track) {
        currentSegment = await this.segmentedInput.getPreviousSegment(currentSegment, {
          skipLiveWait: options.skipLiveWait
        });
        continue;
      }
      const mediaOffset = await this.segmentedInput.getMediaOffset(currentSegment, input2);
      const firstPacket = this.segmentedInput.learnedSegmentTimestampOffset === null ? await track._backing.getFirstPacket({ ...options, metadataOnly: true }) : null;
      if (firstPacket) {
        const segmentStart = firstPacket.timestamp + mediaOffset;
        this.segmentedInput.learnedSegmentTimestampOffset = segmentStart - currentSegment.timestamp;
        const distance = timestamp - segmentStart;
        if (distance < -currentSegment.duration || distance >= 2 * currentSegment.duration) {
          const segment = await this.segmentedInput.getSegmentAt(timestamp, {
            skipLiveWait: options.skipLiveWait
          });
          if (segment !== currentSegment) {
            currentSegment = segment;
            continue;
          }
        }
      }
      const offsetTimestamp = toSegmentTimestamp(timestamp, mediaOffset, await track.getTimeResolution());
      const packet = keyframesOnly ? await track._backing.getKeyPacket(offsetTimestamp, options) : await track._backing.getPacket(offsetTimestamp, options);
      if (!packet) {
        currentSegment = await this.segmentedInput.getPreviousSegment(currentSegment, {
          skipLiveWait: options.skipLiveWait
        });
        continue;
      }
      const lastPacket = keyframesOnly ? await track._backing.getPacket(offsetTimestamp, { ...options, metadataOnly: true }) : packet;
      assert(lastPacket);
      if (offsetTimestamp >= lastPacket.timestamp + lastPacket.duration) {
        const nextSegment = await this.segmentedInput.getNextSegment(currentSegment, {
          skipLiveWait: options.skipLiveWait
        });
        if (nextSegment) {
          const nextInput = this.segmentedInput.getInputForSegment(nextSegment);
          const nextTracks = await nextInput.getTracks();
          const nextTrack = nextTracks.find((t) => t.type === this.firstInputTrack.type && t.number === this.firstInputTrack.number);
          let nextPacket = nextTrack ? await nextTrack._backing.getFirstPacket({ ...options, metadataOnly: true }) : null;
          if (nextPacket && keyframesOnly && nextPacket.type !== "key") {
            nextPacket = await nextTrack._backing.getNextKeyPacket(nextPacket, {
              ...options,
              metadataOnly: true
            });
          }
          if (nextPacket) {
            const nextMediaOffset = await this.segmentedInput.getMediaOffset(nextSegment, nextInput);
            const nextOffsetTimestamp = toSegmentTimestamp(timestamp, nextMediaOffset, await nextTrack.getTimeResolution());
            if (nextPacket.timestamp <= nextOffsetTimestamp) {
              currentSegment = nextSegment;
              continue;
            }
          }
        }
      }
      return this.createAdjustedPacket(packet, currentSegment, track);
    }
    return null;
  }
};
var toSegmentTimestamp = (timestamp, mediaOffset, timeResolution) => {
  const tick = Math.floor(roundIfAlmostInteger(timeResolution * timestamp));
  return (tick - Math.round(timeResolution * mediaOffset)) / timeResolution;
};
var SegmentedInputInputVideoTrackBacking = class extends SegmentedInputInputTrackBacking {
  getType() {
    return "video";
  }
  getCodec() {
    return this.delegate(() => this.firstInputTrack._backing.getCodec());
  }
  getCodedWidth() {
    return this.delegate(() => this.firstInputTrack._backing.getCodedWidth());
  }
  getCodedHeight() {
    return this.delegate(() => this.firstInputTrack._backing.getCodedHeight());
  }
  getSquarePixelWidth() {
    return this.delegate(() => this.firstInputTrack._backing.getSquarePixelWidth());
  }
  getSquarePixelHeight() {
    return this.delegate(() => this.firstInputTrack._backing.getSquarePixelHeight());
  }
  getTransformationMatrix() {
    return this.delegate(() => this.firstInputTrack._backing.getTransformationMatrix());
  }
  async getColorSpace() {
    return this.delegate(() => this.firstInputTrack._backing.getColorSpace());
  }
  async canBeTransparent() {
    return this.delegate(() => this.firstInputTrack._backing.canBeTransparent());
  }
  async getDecoderConfig() {
    return this.delegate(() => this.firstInputTrack._backing.getDecoderConfig());
  }
};
var SegmentedInputInputAudioTrackBacking = class extends SegmentedInputInputTrackBacking {
  getType() {
    return "audio";
  }
  getCodec() {
    return this.delegate(() => this.firstInputTrack._backing.getCodec());
  }
  getNumberOfChannels() {
    return this.delegate(() => this.firstInputTrack._backing.getNumberOfChannels());
  }
  getSampleRate() {
    return this.delegate(() => this.firstInputTrack._backing.getSampleRate());
  }
  async getDecoderConfig() {
    return this.delegate(() => this.firstInputTrack._backing.getDecoderConfig());
  }
};

// node_modules/mediabunny/dist/modules/src/source.js
polyfillSymbolDispose();
var DEFAULT_MIN_READ_POSITION = 0;
var DEFAULT_MAX_READ_POSITION = Infinity;
var Source = class extends EventEmitter {
  constructor() {
    super();
    this._disposed = false;
    this._refCount = 0;
    this._usedForHls = false;
    this._refFinalizationRegistry = null;
    this._sizePromise = null;
    this.onread = null;
    if (typeof FinalizationRegistry !== "undefined") {
      this._refFinalizationRegistry = new FinalizationRegistry((source) => {
        source._decrementRefCount();
      });
    }
  }
  /**
   * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
   * will retrieve the size.
   *
   * Returns null if the source is unsized.
   */
  async getSizeOrNull() {
    if (this._disposed) {
      throw new InputDisposedError();
    }
    return this._sizePromise ??= (async () => {
      let size = this._getFileSize();
      if (size !== void 0) {
        return size;
      }
      await this._read(0, 1, DEFAULT_MIN_READ_POSITION, DEFAULT_MAX_READ_POSITION);
      size = this._getFileSize();
      assert(size !== void 0);
      return size;
    })();
  }
  /**
   * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
   * will retrieve the size.
   *
   * Throws an error if the source is unsized.
   */
  async getSize() {
    if (this._disposed) {
      throw new InputDisposedError();
    }
    const result = await this.getSizeOrNull();
    if (result === null) {
      throw new Error("Cannot determine the size of an unsized source.");
    }
    return result;
  }
  /**
   * Returns a new {@link RangedSource} that maps data onto this source using the given offset and length. If a length
   * is not provided, the ranged source spans until the end of this source's data.
   *
   * Useful for reading files that are embedded within larger files.
   */
  slice(offset, length) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TypeError("offset must be a non-negative integer.");
    }
    if (length !== void 0 && (!Number.isInteger(length) || length < 0)) {
      throw new TypeError("length, when provided, must be a non-negative integer.");
    }
    return new RangedSource(this, offset, length);
  }
  /** @internal */
  _dispatchRead(start, end) {
    this.onread?.(start, end);
    this._emit("read", { start, end });
  }
  /**
   * Creates a new `SourceRef` pointing to this source. You are expected to call `.free()` on said `SourceRef` when
   * you're done with it.
   */
  ref() {
    return new SourceRef(this);
  }
  /** @internal */
  _incrementRefCount() {
    this._refCount++;
  }
  /** @internal */
  _decrementRefCount() {
    this._refCount--;
    if (this._refCount === 0) {
      this._dispose();
      this._disposed = true;
    }
  }
};
var SourceRef = class {
  /** @internal */
  constructor(source) {
    this._freed = false;
    if (source._disposed) {
      throw new Error("Cannot ref a disposed source.");
    }
    source._incrementRefCount();
    source._refFinalizationRegistry?.register(this, source, this);
    this._source = source;
  }
  /** The {@link Source} this ref references. Accessing this field throws an error after having freed the ref. */
  get source() {
    if (!this._source) {
      throw new Error("Can't get source; ref has already been freed.");
    }
    return this._source;
  }
  /** Whether or not this reference has been freed via {@link SourceRef.free}. */
  get freed() {
    return this._freed;
  }
  /**
   * Frees the ref, decrementing the source's internal reference count. If the source's internal reference count
   * reaches zero, it gets disposed. To catch bugs, this method throws if the ref is already freed.
   */
  free() {
    if (this._freed) {
      throw new Error("Illegal operation: double free on SourceRef.");
    }
    const source = this.source;
    assert(source._refCount > 0);
    source._decrementRefCount();
    source._refFinalizationRegistry?.unregister(this);
    this._freed = true;
    this._source = null;
  }
  /**
   * Calls {@link SourceRef.free}.
   */
  [Symbol.dispose]() {
    if (!this.freed) {
      this.free();
    }
  }
};
var PathedSource = class extends Source {
  constructor(rootPath, requestHandler) {
    if (typeof rootPath !== "string") {
      throw new TypeError("rootPath must be a string.");
    }
    if (typeof requestHandler !== "function") {
      throw new TypeError("requestHandler must be a function.");
    }
    super();
    this.rootPath = rootPath;
    this.requestHandler = requestHandler;
  }
  /** @internal */
  _resolveRequest(request) {
    const result = this.requestHandler(request);
    const handle = (result2) => {
      if (!(result2 instanceof Source || result2 instanceof SourceRef)) {
        throw new TypeError("requestHandler must return or resolve to a Source or SourceRef.");
      }
      const ref = result2 instanceof Source ? result2.ref() : result2;
      ref.source._usedForHls ||= this._usedForHls;
      return ref;
    };
    if (isThenable(result)) {
      return result.then(handle);
    } else {
      return handle(result);
    }
  }
};
var sourceRequestsAreEqual = (a, b) => {
  return a.path === b.path;
};
var CustomPathedSource = class extends PathedSource {
  constructor() {
    super(...arguments);
    this._root = null;
    this._rootRequest = null;
    this._removeRootReadListener = null;
  }
  /** @internal */
  _read(start, end, minReadPosition, maxReadPosition) {
    if (!this._root) {
      if (!this._rootRequest) {
        const result = this._resolveRequest({ path: this.rootPath, isRoot: true });
        const handle = (result2) => {
          const ref = result2 instanceof Source ? result2.ref() : result2;
          this._root = ref;
          this._rootRequest = null;
          this._removeRootReadListener = ref.source.on("read", ({ start: start2, end: end2 }) => {
            this._dispatchRead(start2, end2);
          });
          return ref;
        };
        if (isThenable(result)) {
          this._rootRequest = result.then(handle);
        } else {
          handle(result);
          assert(this._root);
        }
      }
      if (this._rootRequest) {
        return this._rootRequest.then(() => this._read(start, end, minReadPosition, maxReadPosition));
      }
    }
    const root = this._root.source;
    if (end > (root._getFileSize() ?? Infinity)) {
      return null;
    }
    return root._read(start, end, minReadPosition, maxReadPosition);
  }
  /** @internal */
  _getFileSize() {
    if (this._root) {
      return this._root.source._getFileSize();
    }
    return void 0;
  }
  /** @internal */
  _dispose() {
    if (this._root) {
      this._removeRootReadListener();
      this._root.free();
    } else if (this._rootRequest) {
      void this._rootRequest.then((ref) => {
        this._removeRootReadListener();
        ref.free();
      }).catch(() => {
      });
    }
  }
};
var blobReaderRegistry = typeof FinalizationRegistry !== "undefined" ? new FinalizationRegistry((reader) => {
  void reader.cancel().catch(() => {
  });
}) : null;
var BlobSource = class extends Source {
  /**
   * Creates a new {@link BlobSource} backed by the specified
   * [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
   */
  constructor(blob, options = {}) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("blob must be a Blob.");
    }
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.maxCacheSize !== void 0 && (!isNumber(options.maxCacheSize) || options.maxCacheSize < 0)) {
      throw new TypeError("options.maxCacheSize, when provided, must be a non-negative number.");
    }
    if (options.useStreamReader !== void 0 && typeof options.useStreamReader !== "boolean") {
      throw new TypeError("options.useStreamReader, when provided, must be a boolean.");
    }
    if (options.handleUnhandledError !== void 0 && typeof options.handleUnhandledError !== "function") {
      throw new TypeError("options.handleUnhandledError, when provided, must be a function.");
    }
    super();
    this._readers = /* @__PURE__ */ new WeakMap();
    this._blob = blob;
    this._options = options;
    this._orchestrator = new ReadOrchestrator({
      maxCacheSize: options.maxCacheSize ?? 8 * 2 ** 20,
      maxWorkerCount: 4,
      runWorker: this._runWorker.bind(this),
      onIdleWorkerRemoved: (worker) => {
        const reader = this._readers.get(worker);
        if (reader) {
          this._readers.delete(worker);
          blobReaderRegistry?.unregister(worker);
          void reader.cancel().catch(() => {
          });
        }
      },
      prefetchProfile: PREFETCH_PROFILES.fileSystem,
      handleUnhandledError: options.handleUnhandledError
    });
    this._orchestrator.fileSize = blob.size;
  }
  /** @internal */
  _getFileSize() {
    return this._orchestrator.fileSize;
  }
  /** @internal */
  _read(start, end, minReadPosition, maxReadPosition) {
    return this._orchestrator.read(start, end, minReadPosition, maxReadPosition);
  }
  /** @internal */
  async _runWorker(worker) {
    assert(worker.strictTarget);
    let reader = this._readers.get(worker);
    if (reader === void 0) {
      if ("stream" in this._blob && !isWebKit() && this._options.useStreamReader !== false) {
        const slice = this._blob.slice(worker.currentPos);
        reader = slice.stream().getReader();
        blobReaderRegistry?.register(worker, reader, worker);
      } else {
        reader = null;
      }
      this._readers.set(worker, reader);
    }
    while (worker.currentPos < worker.targetPos && !worker.aborted) {
      if (reader) {
        const { done, value } = await reader.read();
        if (done) {
          this._orchestrator.onWorkerFinished(worker);
          throw new Error("Blob reader stopped unexpectedly before all requested data was read.");
        }
        if (worker.aborted) {
          break;
        }
        this._dispatchRead(worker.currentPos, worker.currentPos + value.length);
        this._orchestrator.supplyWorkerData(worker, value);
      } else {
        const data = await this._blob.slice(worker.currentPos, worker.targetPos).arrayBuffer();
        if (worker.aborted) {
          break;
        }
        this._dispatchRead(worker.currentPos, worker.currentPos + data.byteLength);
        this._orchestrator.supplyWorkerData(worker, new Uint8Array(data));
      }
    }
    this._orchestrator.signalWorkerStoppedRunning(worker);
    if (worker.aborted) {
      await reader?.cancel().catch(() => {
      });
    }
  }
  /** @internal */
  _dispose() {
    this._orchestrator.dispose();
  }
};
var URL_SOURCE_MIN_LOAD_AMOUNT = 0.5 * 2 ** 20;
var filePathSourceFinalizationRegistry = null;
if (typeof FinalizationRegistry !== "undefined") {
  filePathSourceFinalizationRegistry = new FinalizationRegistry((fileHandle) => {
    void fileHandle.close();
  });
}
var ReadableStreamSource = class extends Source {
  /** Creates a new {@link ReadableStreamSource} backed by the specified `ReadableStream<Uint8Array>`. */
  constructor(stream, options = {}) {
    if (!(stream instanceof ReadableStream)) {
      throw new TypeError("stream must be a ReadableStream.");
    }
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.handleUnhandledError !== void 0 && typeof options.handleUnhandledError !== "function") {
      throw new TypeError("options.handleUnhandledError, when provided, must be a function.");
    }
    if (options.maxCacheSize !== void 0 && (!isNumber(options.maxCacheSize) || options.maxCacheSize < 0)) {
      throw new TypeError("options.maxCacheSize, when provided, must be a non-negative number.");
    }
    super();
    this._reader = null;
    this._cache = [];
    this._pendingSlices = [];
    this._currentIndex = 0;
    this._targetIndex = 0;
    this._maxRequestedIndex = 0;
    this._endIndex = null;
    this._pulling = false;
    this._cacheMissErrorMessage = "Attempted to read data from an already-evicted part of the cache. With ReadableStreamSource, you must access the data more sequentially or increase the size of its cache.";
    this._stream = stream;
    this._maxCacheSize = options.maxCacheSize ?? 32 * 2 ** 20;
    this._handleUnhandledError = options.handleUnhandledError;
  }
  /** @internal */
  _getFileSize() {
    return this._endIndex;
  }
  /** @internal */
  _read(start, end) {
    if (this._endIndex !== null && end > this._endIndex) {
      return null;
    }
    this._maxRequestedIndex = Math.max(this._maxRequestedIndex, end);
    const cacheStartIndex = binarySearchLessOrEqual(this._cache, start, (x) => x.start);
    const cacheStartEntry = cacheStartIndex !== -1 ? this._cache[cacheStartIndex] : null;
    if (cacheStartEntry && cacheStartEntry.start <= start && end <= cacheStartEntry.end) {
      return {
        bytes: cacheStartEntry.bytes,
        view: cacheStartEntry.view,
        offset: cacheStartEntry.start
      };
    }
    let lastEnd = start;
    const parts = [];
    if (cacheStartIndex !== -1) {
      for (let i = cacheStartIndex; i < this._cache.length; i++) {
        const cacheEntry = this._cache[i];
        if (cacheEntry.start >= end) {
          break;
        }
        const cappedStart = Math.max(start, cacheEntry.start);
        if (cappedStart > lastEnd) {
          this._throwDueToCacheMiss();
        }
        const cappedEnd = Math.min(end, cacheEntry.end);
        if (cappedStart < cappedEnd) {
          parts.push({
            start: cappedStart,
            bytes: cacheEntry.bytes.subarray(cappedStart - cacheEntry.start, cappedEnd - cacheEntry.start)
          });
          lastEnd = cappedEnd;
        }
      }
    }
    if (lastEnd === end) {
      return assembleSlice(start, end, parts);
    }
    if (this._currentIndex > lastEnd) {
      this._throwDueToCacheMiss();
    }
    const { promise, resolve, reject } = promiseWithResolvers();
    this._pendingSlices.push({
      start,
      end,
      parts,
      resolve,
      reject
    });
    this._targetIndex = Math.max(this._targetIndex, end);
    if (!this._pulling) {
      this._pulling = true;
      void this._pull().catch((error) => {
        this._pulling = false;
        if (this._pendingSlices.length > 0) {
          this._pendingSlices.forEach((x) => x.reject(error));
          this._pendingSlices.length = 0;
        } else if (this._handleUnhandledError) {
          this._handleUnhandledError(error);
        } else {
          throw error;
        }
      });
    }
    return promise;
  }
  /** @internal */
  _throwDueToCacheMiss() {
    throw new Error(this._cacheMissErrorMessage);
  }
  /** @internal */
  async _pull() {
    this._reader ??= this._stream.getReader();
    while (this._currentIndex < this._targetIndex && !this._disposed) {
      const { done, value } = await this._reader.read();
      if (done) {
        for (const pendingSlice of this._pendingSlices) {
          pendingSlice.resolve(null);
        }
        this._pendingSlices.length = 0;
        this._endIndex = this._currentIndex;
        break;
      }
      const startIndex = this._currentIndex;
      const endIndex = this._currentIndex + value.byteLength;
      this._dispatchRead(startIndex, endIndex);
      for (let i = 0; i < this._pendingSlices.length; i++) {
        const pendingSlice = this._pendingSlices[i];
        const cappedStart = Math.max(startIndex, pendingSlice.start);
        const cappedEnd = Math.min(endIndex, pendingSlice.end);
        if (cappedStart < cappedEnd) {
          pendingSlice.parts.push({
            start: cappedStart,
            bytes: value.subarray(cappedStart - startIndex, cappedEnd - startIndex)
          });
          if (cappedEnd === pendingSlice.end) {
            pendingSlice.resolve(assembleSlice(pendingSlice.start, pendingSlice.end, pendingSlice.parts));
            this._pendingSlices.splice(i, 1);
            i--;
          }
        }
      }
      this._cache.push({
        start: startIndex,
        end: endIndex,
        bytes: value,
        view: toDataView(value),
        age: 0
        // Unused
      });
      while (this._cache.length > 0) {
        const firstEntry = this._cache[0];
        const distance = this._maxRequestedIndex - firstEntry.end;
        if (distance <= this._maxCacheSize) {
          break;
        }
        this._cache.shift();
      }
      this._currentIndex += value.byteLength;
    }
    this._pulling = false;
  }
  /** @internal */
  _dispose() {
    for (const pendingSlice of this._pendingSlices) {
      pendingSlice.reject(new InputDisposedError());
    }
    this._pendingSlices.length = 0;
    this._cache.length = 0;
    void (this._reader ?? this._stream).cancel().catch(() => {
    });
  }
};
var assembleSlice = (start, end, parts) => {
  const bytes = new Uint8Array(end - start);
  for (const part of parts) {
    bytes.set(part.bytes, part.start - start);
  }
  return {
    bytes,
    view: toDataView(bytes),
    offset: start
  };
};
var PREFETCH_PROFILES = {
  none: (start, end) => ({ start, end }),
  fileSystem: (start, end) => {
    const padding = 2 ** 16;
    start = Math.floor((start - padding) / padding) * padding;
    end = Math.ceil((end + padding) / padding) * padding;
    return { start, end };
  },
  network: (start, end, workers) => {
    const paddingStart = 2 ** 16;
    start = Math.max(0, Math.floor((start - paddingStart) / paddingStart) * paddingStart);
    for (const worker of workers) {
      const maxExtensionAmount = 8 * 2 ** 20;
      const thresholdPoint = Math.max((worker.startPos + worker.targetPos) / 2, worker.targetPos - maxExtensionAmount);
      if (closedIntervalsOverlap(start, end, thresholdPoint, worker.targetPos)) {
        const size = worker.targetPos - worker.startPos;
        const a = Math.ceil((size + 1) / maxExtensionAmount) * maxExtensionAmount;
        const b = 2 ** Math.ceil(Math.log2(size + 1));
        const extent = Math.min(b, a);
        end = Math.max(end, worker.startPos + extent);
      }
    }
    end = Math.max(end, start + URL_SOURCE_MIN_LOAD_AMOUNT);
    return {
      start,
      end
    };
  }
};
var ReadOrchestrator = class {
  constructor(options) {
    this.options = options;
    this.fileSize = null;
    this.nextAge = 0;
    this.workers = [];
    this.cache = [];
    this.currentCacheSize = 0;
    this.disposed = false;
    this.queuedReads = [];
  }
  read(innerStart, innerEnd, minReadPosition, maxReadPosition) {
    assert(!this.disposed);
    const prefetchRange = this.options.prefetchProfile(innerStart, innerEnd, this.workers);
    const outerStart = Math.max(prefetchRange.start, minReadPosition);
    const outerEnd = Math.min(prefetchRange.end, this.fileSize ?? Infinity, maxReadPosition);
    assert(outerStart <= innerStart && innerEnd <= outerEnd);
    let result = null;
    const innerCacheStartIndex = binarySearchLessOrEqual(this.cache, innerStart, (x) => x.start);
    const innerStartEntry = innerCacheStartIndex !== -1 ? this.cache[innerCacheStartIndex] : null;
    if (innerStartEntry && innerStartEntry.start <= innerStart && innerEnd <= innerStartEntry.end) {
      innerStartEntry.age = this.nextAge++;
      result = {
        bytes: innerStartEntry.bytes,
        view: innerStartEntry.view,
        offset: innerStartEntry.start
      };
    }
    const outerCacheStartIndex = binarySearchLessOrEqual(this.cache, outerStart, (x) => x.start);
    const bytes = result ? null : new Uint8Array(innerEnd - innerStart);
    let contiguousBytesWriteEnd = 0;
    let lastEnd = outerStart;
    const outerHoles = [];
    if (outerCacheStartIndex !== -1) {
      for (let i = outerCacheStartIndex; i < this.cache.length; i++) {
        const entry = this.cache[i];
        if (entry.start >= outerEnd) {
          break;
        }
        if (entry.end <= outerStart) {
          continue;
        }
        const cappedOuterStart = Math.max(outerStart, entry.start);
        const cappedOuterEnd = Math.min(outerEnd, entry.end);
        assert(cappedOuterStart <= cappedOuterEnd);
        if (lastEnd < cappedOuterStart) {
          outerHoles.push({ start: lastEnd, end: cappedOuterStart });
        }
        lastEnd = cappedOuterEnd;
        if (bytes) {
          const cappedInnerStart = Math.max(innerStart, entry.start);
          const cappedInnerEnd = Math.min(innerEnd, entry.end);
          if (cappedInnerStart < cappedInnerEnd) {
            const relativeOffset = cappedInnerStart - innerStart;
            bytes.set(entry.bytes.subarray(cappedInnerStart - entry.start, cappedInnerEnd - entry.start), relativeOffset);
            if (relativeOffset === contiguousBytesWriteEnd) {
              contiguousBytesWriteEnd = cappedInnerEnd - innerStart;
            }
          }
        }
        entry.age = this.nextAge++;
      }
      if (lastEnd < outerEnd) {
        outerHoles.push({ start: lastEnd, end: outerEnd });
      }
    } else {
      outerHoles.push({ start: outerStart, end: outerEnd });
    }
    if (bytes && contiguousBytesWriteEnd >= bytes.length) {
      result = {
        bytes,
        view: toDataView(bytes),
        offset: innerStart
      };
    }
    if (outerHoles.length === 0) {
      assert(result);
      return result;
    }
    const { promise, resolve, reject } = promiseWithResolvers();
    const innerHoles = [];
    for (const outerHole of outerHoles) {
      const cappedStart = Math.max(innerStart, outerHole.start);
      const cappedEnd = Math.min(innerEnd, outerHole.end);
      if (cappedStart === outerHole.start && cappedEnd === outerHole.end) {
        innerHoles.push(outerHole);
      } else if (cappedStart < cappedEnd) {
        innerHoles.push({ start: cappedStart, end: cappedEnd });
      }
    }
    const pendingSlice = bytes && {
      start: innerStart,
      bytes,
      holes: innerHoles,
      resolve,
      reject
    };
    outer: for (const outerHole of outerHoles) {
      for (const worker of this.workers) {
        const addedToWorker = this.checkHoleAgainstWorker(worker, outerHole, pendingSlice ? [pendingSlice] : []);
        if (addedToWorker) {
          this.checkQueuedReadsAgainstWorker(worker);
          continue outer;
        }
      }
      const strictTarget = outerHole.end < outerEnd || this.fileSize !== null;
      const newWorker = this.createWorker(outerHole.start, outerHole.end, strictTarget);
      if (newWorker) {
        if (pendingSlice) {
          newWorker.pendingSlices = [pendingSlice];
        }
        this.runWorker(newWorker);
      } else {
        let index = binarySearchLessOrEqual(this.queuedReads, outerHole.start, (x) => x.hole.start);
        let entry = index !== -1 ? this.queuedReads[index] : null;
        if (entry && outerHole.start <= entry.hole.end) {
          entry.hole.end = Math.max(entry.hole.end, outerHole.end);
          entry.strictTarget &&= strictTarget;
          if (pendingSlice) {
            entry.pendingSlices.push(pendingSlice);
          }
        } else {
          index++;
          entry = {
            hole: {
              // Clone the hole because it might be mutated later
              start: outerHole.start,
              end: outerHole.end
            },
            strictTarget,
            pendingSlices: pendingSlice ? [pendingSlice] : [],
            age: this.nextAge++
          };
          this.queuedReads.splice(index, 0, entry);
        }
        while (index + 1 < this.queuedReads.length) {
          const nextEntry = this.queuedReads[index + 1];
          if (nextEntry.hole.start > entry.hole.end) {
            break;
          }
          entry.hole.end = Math.max(entry.hole.end, nextEntry.hole.end);
          entry.pendingSlices.push(...nextEntry.pendingSlices);
          entry.strictTarget &&= nextEntry.strictTarget;
          entry.age = Math.min(entry.age, nextEntry.age);
          this.queuedReads.splice(index + 1, 1);
        }
      }
    }
    if (!result) {
      assert(bytes);
      result = promise.then((bytes2) => bytes2 && {
        bytes: bytes2,
        view: toDataView(bytes2),
        offset: innerStart
      });
    } else {
      promise.catch((error) => {
        if (this.disposed) {
          return;
        }
        if (this.options.handleUnhandledError) {
          this.options.handleUnhandledError(error);
        } else {
          throw error;
        }
      });
    }
    return result;
  }
  checkHoleAgainstWorker(worker, hole, pendingSlices) {
    const gapTolerance = 2 ** 17;
    if (closedIntervalsOverlap(hole.start - gapTolerance, hole.start, worker.currentPos, worker.targetPos)) {
      worker.targetPos = Math.max(worker.targetPos, hole.end);
      for (let i = 0; i < pendingSlices.length; i++) {
        const pendingSlice = pendingSlices[i];
        if (!worker.pendingSlices.includes(pendingSlice)) {
          worker.pendingSlices.push(pendingSlice);
        }
      }
      if (!worker.running) {
        this.runWorker(worker);
      }
      return true;
    }
    return false;
  }
  checkQueuedReadsAgainstWorker(worker) {
    let wasTrueOnce = false;
    for (let i = 0; i < this.queuedReads.length; i++) {
      const queuedRead = this.queuedReads[i];
      const result = this.checkHoleAgainstWorker(worker, queuedRead.hole, queuedRead.pendingSlices);
      if (result) {
        this.queuedReads.splice(i, 1);
        i--;
        wasTrueOnce = true;
      } else if (wasTrueOnce) {
        break;
      }
    }
  }
  createWorker(startPos, targetPos, strictTarget) {
    if (this.workers.length >= this.options.maxWorkerCount) {
      let oldestWorker = null;
      let oldestIndex = null;
      for (let i = 0; i < this.workers.length; i++) {
        const worker2 = this.workers[i];
        if (!worker2.running && worker2.pendingSlices.length === 0 && (!oldestWorker || worker2.age < oldestWorker.age)) {
          oldestIndex = i;
          oldestWorker = worker2;
        }
      }
      if (oldestWorker) {
        assert(oldestIndex !== null);
        assert(oldestWorker.pendingSlices.length === 0);
        this.workers.splice(oldestIndex, 1);
        this.options.onIdleWorkerRemoved?.(oldestWorker);
      } else {
        return null;
      }
    }
    const worker = {
      startPos,
      currentPos: startPos,
      targetPos,
      strictTarget,
      running: false,
      // Due to async shenanigans, it can happen that workers are started after disposal. In this case, instead of
      // simply not creating the worker, we allow it to run but immediately label it as aborted, so it can then
      // shut itself down.
      aborted: this.disposed,
      pendingSlices: [],
      age: this.nextAge++
    };
    this.workers.push(worker);
    return worker;
  }
  runWorker(worker) {
    assert(!worker.running);
    assert(worker.currentPos < worker.targetPos);
    worker.running = true;
    worker.age = this.nextAge++;
    void this.options.runWorker(worker).catch((error) => {
      worker.running = false;
      if (worker.pendingSlices.length > 0) {
        worker.pendingSlices.forEach((x) => x.reject(error));
        worker.pendingSlices.length = 0;
      } else if (!worker.aborted && !this.disposed) {
        if (this.options.handleUnhandledError) {
          this.options.handleUnhandledError(error);
        } else {
          throw error;
        }
      }
    }).finally(() => {
      if (worker.running) {
        return;
      }
      if (this.queuedReads.length > 0) {
        let oldestIndex = 0;
        for (let i = 1; i < this.queuedReads.length; i++) {
          const queuedRead2 = this.queuedReads[i];
          if (queuedRead2.age < this.queuedReads[oldestIndex].age) {
            oldestIndex = i;
          }
        }
        const queuedRead = this.queuedReads[oldestIndex];
        const newWorker = this.createWorker(queuedRead.hole.start, queuedRead.hole.end, queuedRead.strictTarget);
        if (!newWorker) {
          return;
        }
        this.queuedReads.splice(oldestIndex, 1);
        newWorker.pendingSlices = queuedRead.pendingSlices;
        this.runWorker(newWorker);
      }
    });
  }
  /** Called by a worker when it has read some data. */
  supplyWorkerData(worker, bytes) {
    assert(!worker.aborted);
    const start = worker.currentPos;
    const end = start + bytes.length;
    this.insertIntoCache({
      start,
      end,
      bytes,
      view: toDataView(bytes),
      age: this.nextAge++
    });
    worker.currentPos += bytes.length;
    if (worker.currentPos > worker.targetPos) {
      worker.targetPos = worker.currentPos;
      this.checkQueuedReadsAgainstWorker(worker);
    }
    for (let i = 0; i < worker.pendingSlices.length; i++) {
      const pendingSlice = worker.pendingSlices[i];
      const clampedStart = Math.max(start, pendingSlice.start);
      const clampedEnd = Math.min(end, pendingSlice.start + pendingSlice.bytes.length);
      if (clampedStart < clampedEnd) {
        pendingSlice.bytes.set(bytes.subarray(clampedStart - start, clampedEnd - start), clampedStart - pendingSlice.start);
      }
      for (let j = 0; j < pendingSlice.holes.length; j++) {
        const hole = pendingSlice.holes[j];
        if (start <= hole.start && end > hole.start) {
          hole.start = end;
        }
        if (hole.end <= hole.start) {
          pendingSlice.holes.splice(j, 1);
          j--;
        }
      }
      if (pendingSlice.holes.length === 0) {
        pendingSlice.resolve(pendingSlice.bytes);
        worker.pendingSlices.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < this.workers.length; i++) {
      const otherWorker = this.workers[i];
      if (worker === otherWorker || otherWorker.running) {
        continue;
      }
      if (closedIntervalsOverlap(start, end, otherWorker.currentPos, otherWorker.targetPos)) {
        this.workers.splice(i, 1);
        this.options.onIdleWorkerRemoved?.(otherWorker);
        i--;
      }
    }
  }
  supplyFileSize(size) {
    assert(this.fileSize === null);
    this.fileSize = size;
    for (const worker of this.workers) {
      worker.targetPos = Math.min(worker.targetPos, size);
      worker.strictTarget = true;
      for (let i = 0; i < worker.pendingSlices.length; i++) {
        const pendingSlice = worker.pendingSlices[i];
        for (const hole of pendingSlice.holes) {
          if (hole.end > size) {
            pendingSlice.resolve(null);
            worker.pendingSlices.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }
    for (let i = 0; i < this.queuedReads.length; i++) {
      const queuedRead = this.queuedReads[i];
      for (let j = 0; j < queuedRead.pendingSlices.length; j++) {
        const slice = queuedRead.pendingSlices[j];
        if (slice.start + slice.bytes.length > size) {
          slice.resolve(null);
          queuedRead.pendingSlices.splice(j, 1);
          j--;
        }
      }
      if (queuedRead.hole.start >= size) {
        this.queuedReads.splice(i, 1);
        i--;
      } else {
        queuedRead.hole.end = Math.min(queuedRead.hole.end, size);
        queuedRead.strictTarget = true;
      }
    }
  }
  signalWorkerStoppedRunning(worker) {
    worker.running = false;
    if (!worker.aborted) {
      worker.pendingSlices.length = 0;
    }
  }
  /** Called when a worker reaches the end of the underlying data and must be cleaned up. */
  onWorkerFinished(worker) {
    const index = this.workers.indexOf(worker);
    assert(index !== -1);
    worker.running = false;
    this.workers.splice(index, 1);
    this.options.onIdleWorkerRemoved?.(worker);
    if (this.fileSize === null) {
      this.supplyFileSize(worker.currentPos);
    }
    for (const pendingSlice of worker.pendingSlices) {
      if (pendingSlice.start + pendingSlice.bytes.length > worker.currentPos) {
        pendingSlice.resolve(null);
      }
    }
  }
  insertIntoCache(entry) {
    if (this.options.maxCacheSize === 0) {
      return;
    }
    let insertionIndex = binarySearchLessOrEqual(this.cache, entry.start, (x) => x.start) + 1;
    if (insertionIndex > 0) {
      const previous = this.cache[insertionIndex - 1];
      if (previous.end >= entry.end) {
        return;
      }
      if (previous.end > entry.start) {
        const joined = new Uint8Array(entry.end - previous.start);
        joined.set(previous.bytes, 0);
        joined.set(entry.bytes, entry.start - previous.start);
        this.currentCacheSize += entry.end - previous.end;
        previous.bytes = joined;
        previous.view = toDataView(joined);
        previous.end = entry.end;
        insertionIndex--;
        entry = previous;
      } else {
        this.cache.splice(insertionIndex, 0, entry);
        this.currentCacheSize += entry.bytes.length;
      }
    } else {
      this.cache.splice(insertionIndex, 0, entry);
      this.currentCacheSize += entry.bytes.length;
    }
    for (let i = insertionIndex + 1; i < this.cache.length; i++) {
      const next = this.cache[i];
      if (entry.end <= next.start) {
        break;
      }
      if (entry.end >= next.end) {
        this.cache.splice(i, 1);
        this.currentCacheSize -= next.bytes.length;
        i--;
        continue;
      }
      const joined = new Uint8Array(next.end - entry.start);
      joined.set(entry.bytes, 0);
      joined.set(next.bytes, next.start - entry.start);
      this.currentCacheSize -= entry.end - next.start;
      entry.bytes = joined;
      entry.view = toDataView(joined);
      entry.end = next.end;
      this.cache.splice(i, 1);
      break;
    }
    while (this.currentCacheSize > this.options.maxCacheSize) {
      let oldestIndex = 0;
      let oldestEntry = this.cache[0];
      for (let i = 1; i < this.cache.length; i++) {
        const entry2 = this.cache[i];
        if (entry2.age < oldestEntry.age) {
          oldestIndex = i;
          oldestEntry = entry2;
        }
      }
      if (this.currentCacheSize - oldestEntry.bytes.length <= this.options.maxCacheSize) {
        break;
      }
      this.cache.splice(oldestIndex, 1);
      this.currentCacheSize -= oldestEntry.bytes.length;
    }
  }
  dispose() {
    for (const worker of this.workers) {
      for (const slice of worker.pendingSlices) {
        slice.reject(new InputDisposedError());
      }
      worker.pendingSlices.length = 0;
      worker.aborted = true;
      if (!worker.running) {
        this.options.onIdleWorkerRemoved?.(worker);
      }
    }
    for (const queuedRead of this.queuedReads) {
      for (const slice of queuedRead.pendingSlices) {
        slice.reject(new InputDisposedError());
      }
    }
    this.workers.length = 0;
    this.cache.length = 0;
    this.queuedReads.length = 0;
    this.disposed = true;
  }
};
var RangedSource = class extends Source {
  /** @internal */
  constructor(baseSource, offset, length) {
    super();
    this._ref = null;
    this._removeReadListener = null;
    if (baseSource._disposed) {
      throw new Error("Cannot create a slice of a disposed source.");
    }
    this._baseSource = baseSource;
    this._offset = offset;
    this._length = length ?? null;
  }
  /** @internal */
  _getFileSize() {
    if (this._length !== null) {
      return this._length;
    }
    const baseSize = this._baseSource._getFileSize();
    if (baseSize === void 0 || baseSize === null) {
      return baseSize;
    }
    return Math.max(baseSize - this._offset, 0);
  }
  /** @internal */
  _read(start, end, minReadPosition, maxReadPosition) {
    if (this._length !== null && end > this._length) {
      return null;
    }
    const baseSize = this._baseSource._getFileSize();
    const result = typeof baseSize === "number" && this._offset + end > baseSize ? null : this._baseSource._read(this._offset + start, this._offset + end, this._offset + minReadPosition, this._offset + maxReadPosition);
    const processResult = (result2) => {
      if (!result2) {
        if (this._length !== null) {
          const expectedLength = this._offset + this._length;
          throw new Error(`Underlying data too short, expected a length of at least ${expectedLength} bytes.`);
        }
        return null;
      }
      result2.offset -= this._offset;
      return result2;
    };
    if (isThenable(result)) {
      return result.then(processResult);
    } else {
      return processResult(result);
    }
  }
  /** @internal */
  _dispose() {
    this._ref?.free();
    this._removeReadListener?.();
  }
  ref() {
    if (!this._ref) {
      this._ref = this._baseSource.ref();
      this._removeReadListener = this._baseSource.on("read", ({ start, end }) => {
        const sliceStart = Math.max(start - this._offset, 0);
        const sliceEnd = Math.min(end - this._offset, this._length ?? Infinity);
        if (sliceStart < sliceEnd) {
          this._dispatchRead(sliceStart, sliceEnd);
        }
      });
    }
    return super.ref();
  }
};

// node_modules/mediabunny/dist/modules/src/hls/hls-segmented-input.js
var __addDisposableResource2 = function(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
};
var __disposeResources2 = /* @__PURE__ */ (function(SuppressedError2) {
  return function(env) {
    function fail(e) {
      env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
      env.hasError = true;
    }
    var r, s = 0;
    function next() {
      while (r = env.stack.pop()) {
        try {
          if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
          if (r.dispose) {
            var result = r.dispose.call(r.value);
            if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
              fail(e);
              return next();
            });
          } else s |= 1;
        } catch (e) {
          fail(e);
        }
      }
      if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
      if (env.hasError) throw env.error;
    }
    return next();
  };
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
var IV_STRING_REGEX = /^0[xX][0-9a-fA-F]+$/;
var BASE64_DATA_URI_REGEX = /^data:.*;base64,/i;
var MAX_DURATION = 1e9;
var HlsSegmentedInput = class extends SegmentedInput {
  constructor(demuxer, path, trackDeclarations, lines) {
    super(demuxer.input, path, trackDeclarations);
    this.segments = [];
    this.nextLines = null;
    this.currentUpdateSegmentsPromise = null;
    this.streamHasEnded = false;
    this.neverRemovesSegments = false;
    this.lastSegmentUpdateTime = -Infinity;
    this.refreshInterval = 5;
    this.segmentTimestampOffsetPromise = null;
    this.rootPath = path;
    this.demuxer = demuxer;
    this.nextLines = lines;
  }
  runUpdateSegments() {
    return this.currentUpdateSegmentsPromise ??= (async () => {
      try {
        const remainingWaitTimeMs = this.getRemainingWaitTimeMs();
        if (remainingWaitTimeMs > 0) {
          await wait(remainingWaitTimeMs);
        }
        this.lastSegmentUpdateTime = performance.now();
        await this.updateSegments();
      } finally {
        this.currentUpdateSegmentsPromise = null;
      }
    })();
  }
  getRemainingWaitTimeMs() {
    const elapsed = performance.now() - this.lastSegmentUpdateTime;
    const result = Math.max(0, 1e3 * this.refreshInterval - elapsed);
    if (result <= 50) {
      return 0;
    }
    return result;
  }
  /**
   * Reads and parses the segment info from the playlist file. When called more than one, it updates the existing
   * segments by appending the new ones. Existing segments are never removed.
   */
  async updateSegments() {
    let lines = this.nextLines;
    this.nextLines = null;
    if (!lines) {
      const env_1 = { stack: [], error: void 0, hasError: false };
      try {
        const ref = __addDisposableResource2(env_1, await this.demuxer.input._getSourceUncached({ path: this.rootPath, isRoot: false }), false);
        const reader = new Reader(ref.source);
        let headerSlice = reader.requestSliceRange(0, 0, 64);
        if (isThenable(headerSlice))
          headerSlice = await headerSlice;
        if (headerSlice) {
          const header = textDecoder.decode(readBytes(headerSlice, headerSlice.length));
          if (!header.trimStart().startsWith("#EXTM3U")) {
            throw new Error("Invalid M3U8 file; expected first line to be #EXTM3U.");
          }
        }
        const slice = await reader.requestEntireFile();
        assert(slice);
        lines = readAllLines(slice, slice.length, { ignore: canIgnoreLine });
        if (ref.source instanceof PathedSource) {
          this.rootPath = ref.source.rootPath;
        }
      } catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
      } finally {
        __disposeResources2(env_1);
      }
    }
    const offsetTimestampsByDateTime = this.input._formatOptions.hls?.offsetTimestampsByDateTime !== false && (this.segments.length === 0 || this.segments[0].unixEpochTimestamp === this.segments[0].timestamp);
    const variables = new HlsPlaylistVariables(this.rootPath, this.demuxer.hasMasterPlaylist ? this.demuxer.masterPlaylistVariables : null);
    let headerRead = false;
    let accumulatedTime = 0;
    let accumulatedUnixTime = null;
    let nextSegmentDuration = null;
    let currentKey = null;
    let nextSequenceNumber = 0;
    let nextDiscontinuityNumber = 0;
    let currentFirstSegment = null;
    let currentInitSegment = null;
    let lastByteRangeEnd = null;
    let nextByteRange = null;
    let lastProgramDateTimeSeconds = null;
    let prevLastSegment = last(this.segments) ?? null;
    const parseByteRange = (content) => {
      const atIndex = content.indexOf("@");
      const length = Number(atIndex === -1 ? content : content.slice(0, atIndex));
      if (!Number.isInteger(length) || length < 0) {
        throw new Error(`Invalid #EXT-X-BYTERANGE length '${content}'.`);
      }
      let offset = null;
      if (atIndex !== -1) {
        offset = Number(content.slice(atIndex + 1));
        if (!Number.isInteger(offset) || offset < 0) {
          throw new Error(`Invalid #EXT-X-BYTERANGE offset '${content}'.`);
        }
      }
      return { length, offset };
    };
    const setNextSequenceNumber = (number) => {
      nextSequenceNumber = number;
      if (prevLastSegment) {
        assert(prevLastSegment.sequenceNumber !== null);
        if (prevLastSegment.sequenceNumber < number) {
          const elapsed = (number - prevLastSegment.sequenceNumber) * prevLastSegment.duration;
          accumulatedTime = prevLastSegment.timestamp + elapsed;
          currentFirstSegment = prevLastSegment.firstSegment ?? prevLastSegment;
          currentInitSegment = prevLastSegment.initSegment;
          lastProgramDateTimeSeconds = prevLastSegment.lastProgramDateTimeSeconds;
          accumulatedUnixTime = prevLastSegment.unixEpochTimestamp !== null ? prevLastSegment.unixEpochTimestamp + elapsed : null;
          prevLastSegment = null;
        }
      }
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!headerRead) {
        if (line !== "#EXTM3U") {
          throw new Error("Invalid M3U8 file; expected first line to be #EXTM3U.");
        }
        headerRead = true;
        continue;
      }
      if (!line.startsWith("#")) {
        if (!prevLastSegment) {
          if (nextSegmentDuration === null) {
            throw new Error("Invalid M3U8 file; a segment must be preceded by an #EXTINF tag.");
          }
          let key = currentKey;
          if (key && key.method === "AES-128" && !key.iv) {
            const iv = new Uint8Array(AES_128_BLOCK_SIZE);
            const view = toDataView(iv);
            view.setUint32(8, Math.floor(nextSequenceNumber / 2 ** 32));
            view.setUint32(12, nextSequenceNumber);
            key = { ...key, iv };
          }
          const fullPath = joinPaths(this.rootPath, variables.substitute(line));
          const location = {
            path: fullPath,
            offset: nextByteRange?.offset ?? 0,
            length: nextByteRange?.length ?? null
          };
          if (currentFirstSegment && currentFirstSegment.discontinuityNumber !== nextDiscontinuityNumber) {
            currentFirstSegment = null;
          }
          const segment = {
            index: this.segments.length,
            timestamp: accumulatedTime,
            unixEpochTimestamp: accumulatedUnixTime,
            discontinuityNumber: nextDiscontinuityNumber,
            firstSegment: currentFirstSegment,
            sequenceNumber: nextSequenceNumber,
            location,
            duration: nextSegmentDuration,
            encryption: key,
            initSegment: currentInitSegment,
            lastProgramDateTimeSeconds
          };
          currentFirstSegment ??= segment;
          accumulatedTime += nextSegmentDuration;
          if (accumulatedUnixTime !== null) {
            accumulatedUnixTime += nextSegmentDuration;
          }
          this.segments.push(segment);
        } else {
        }
        nextSegmentDuration = null;
        if (nextByteRange === null) {
          lastByteRangeEnd = null;
        } else {
          nextByteRange = null;
        }
        setNextSequenceNumber(nextSequenceNumber + 1);
      }
      if (line.startsWith(TAG_EXTINF)) {
        if (prevLastSegment) {
          continue;
        }
        const extinfContent = line.slice(TAG_EXTINF.length);
        const commaIndex = extinfContent.indexOf(",");
        const durationStr = commaIndex === -1 ? extinfContent : extinfContent.slice(0, commaIndex);
        const duration = Number(durationStr);
        if (!Number.isFinite(duration) || duration < 0 || duration > MAX_DURATION) {
          throw new Error(`Invalid #EXTINF tag duration '${durationStr}'.`);
        }
        nextSegmentDuration = duration;
      } else if (line.startsWith(TAG_DEFINE)) {
        variables.define(line.slice(TAG_DEFINE.length));
      } else if (line.startsWith(TAG_MAP)) {
        const attributes = new AttributeList(line.slice(TAG_MAP.length), variables);
        const uri = attributes.get("uri");
        if (!uri) {
          throw new Error("Invalid #EXT-X-MAP tag; missing URI attribute.");
        }
        const byteRange = attributes.get("byterange");
        let parsedByteRange = null;
        if (byteRange !== null) {
          parsedByteRange = parseByteRange(byteRange);
        }
        if (parsedByteRange && parsedByteRange.offset === null) {
          throw new Error("Invalid #EXT-X-MAP tag; BYTERANGE attribute must have a specified offset.");
        }
        if (!prevLastSegment) {
          const fullPath = joinPaths(this.rootPath, uri);
          const location = {
            path: fullPath,
            offset: parsedByteRange?.offset ?? 0,
            length: parsedByteRange?.length ?? null
          };
          if (currentKey?.method === "AES-128" && !currentKey.iv) {
            throw new Error("IV attribute must be set on #EXT-X-KEY tag preceding the #EXT-X-MAP tag.");
          }
          const segment = {
            index: -1,
            timestamp: accumulatedTime,
            unixEpochTimestamp: accumulatedUnixTime,
            discontinuityNumber: nextDiscontinuityNumber,
            firstSegment: null,
            sequenceNumber: null,
            location,
            duration: 0,
            encryption: currentKey,
            initSegment: null,
            lastProgramDateTimeSeconds
          };
          currentInitSegment = segment;
        } else {
        }
      } else if (line.startsWith(TAG_KEY)) {
        const attributes = new AttributeList(line.slice(TAG_KEY.length), variables);
        const method = attributes.get("method");
        if (method === "NONE") {
          currentKey = null;
        } else if (method === "AES-128") {
          const uri = attributes.get("uri");
          if (!uri) {
            throw new Error("Invalid #EXT-X-KEY: AES-128 requires a URI attribute.");
          }
          let iv = null;
          const ivString = attributes.get("iv");
          if (ivString) {
            if (!IV_STRING_REGEX.test(ivString)) {
              throw new Error(`Unsupported IV format '${ivString}'.`);
            }
            let hex = ivString.slice(2);
            hex = hex.padStart(2 * AES_128_BLOCK_SIZE, "0");
            hex = hex.slice(-2 * AES_128_BLOCK_SIZE);
            iv = new Uint8Array(AES_128_BLOCK_SIZE);
            for (let i2 = 0; i2 < AES_128_BLOCK_SIZE; i2++) {
              const startIndex = 2 * i2;
              iv[i2] = parseInt(hex.slice(startIndex, startIndex + 2), 16);
            }
          }
          const keyFormat = attributes.get("keyformat") ?? "identity";
          if (keyFormat !== "identity") {
            throw new Error("For AES-128 encryption, only the 'identity' KEYFORMAT is currently supported. If you think other formats should be supported, please raise an issue.");
          }
          currentKey = {
            method: "AES-128",
            keyUri: joinPaths(this.rootPath, uri),
            iv,
            keyFormat
          };
        } else if (method === "SAMPLE-AES" || method === "SAMPLE-AES-CTR") {
          const uri = attributes.get("uri");
          if (!uri) {
            throw new Error(`Invalid #EXT-X-KEY: ${method} requires a URI attribute.`);
          }
          const keyFormat = attributes.get("keyformat") ?? "identity";
          if (keyFormat === "identity") {
            throw new Error("For SAMPLE-AES and SAMPLE-AES-CTR encryption, the 'identity' KEYFORMAT is not supported. If you think this format should be supported, please raise an issue.");
          }
          let psshBox = null;
          if (BASE64_DATA_URI_REGEX.test(uri)) {
            const commaIndex = uri.indexOf(",");
            const bytes = base64ToBytes(uri.slice(commaIndex + 1));
            if (bytes.length >= 8 && bytes[4] === 112 && bytes[5] === 115 && bytes[6] === 115 && bytes[7] === 104) {
              const size = toDataView(bytes).getUint32(0);
              psshBox = parsePsshBoxContents(bytes.subarray(8, Math.min(size, bytes.length)));
            }
          }
          currentKey = {
            method,
            psshBox
          };
        } else {
          throw new Error(`Unsupported encryption method '${method}'. If you think this method should be supported, please raise an issue.`);
        }
      } else if (line.startsWith(TAG_MEDIA_SEQUENCE)) {
        const value = line.slice(TAG_MEDIA_SEQUENCE.length);
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 0) {
          throw new Error(`Invalid EXT-X-MEDIA-SEQUENCE value '${value}'.`);
        }
        setNextSequenceNumber(number);
      } else if (line.startsWith(TAG_BYTERANGE)) {
        const parsed = parseByteRange(line.slice(TAG_BYTERANGE.length));
        if (parsed.offset === null) {
          if (lastByteRangeEnd === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-BYTERANGE without offset requires a previous byte range.");
          }
          parsed.offset = lastByteRangeEnd;
        }
        nextByteRange = parsed;
        lastByteRangeEnd = parsed.offset + parsed.length;
      } else if (line.startsWith(TAG_PROGRAM_DATE_TIME)) {
        if (prevLastSegment) {
          continue;
        }
        const dateTime = line.slice(TAG_PROGRAM_DATE_TIME.length);
        const dateTimeMs = Date.parse(dateTime);
        if (!Number.isFinite(dateTimeMs)) {
          continue;
        }
        const dateTimeSeconds = dateTimeMs / 1e3;
        if (lastProgramDateTimeSeconds === dateTimeSeconds) {
          continue;
        }
        if (lastProgramDateTimeSeconds === null && this.segments.length > 0) {
          const offset = dateTimeSeconds - accumulatedTime;
          for (const segment of this.segments) {
            segment.unixEpochTimestamp = segment.timestamp + offset;
            if (offsetTimestampsByDateTime) {
              segment.timestamp = segment.unixEpochTimestamp;
            }
          }
        }
        lastProgramDateTimeSeconds = dateTimeSeconds;
        accumulatedUnixTime = dateTimeSeconds;
        if (offsetTimestampsByDateTime) {
          accumulatedTime = dateTimeSeconds;
        }
      } else if (line === TAG_DISCONTINUITY) {
        currentFirstSegment = null;
        nextDiscontinuityNumber++;
      } else if (line.startsWith(TAG_DISCONTINUITY_SEQUENCE)) {
        const value = line.slice(TAG_DISCONTINUITY_SEQUENCE.length);
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 0) {
          throw new Error(`Invalid EXT-X-DISCONTINUITY-SEQUENCE value '${value}'.`);
        }
        nextDiscontinuityNumber = number;
      } else if (line.startsWith(TAG_TARGETDURATION)) {
        const value = line.slice(TAG_TARGETDURATION.length);
        const duration = Number(value);
        if (!Number.isFinite(duration) || duration < 0 || duration > MAX_DURATION) {
          throw new Error(`Invalid EXT-X-TARGETDURATION value '${value}'.`);
        }
        this.refreshInterval = clamp(duration, 0.5, 3600);
      } else if (line === TAG_I_FRAMES_ONLY) {
        this.hasOnlyKeyPackets = true;
      } else if (line === TAG_ENDLIST) {
        this.streamHasEnded = true;
        break;
      } else if (line.startsWith(TAG_PLAYLIST_TYPE)) {
        const type = line.slice(TAG_PLAYLIST_TYPE.length).toLowerCase();
        if (type === "vod") {
          this.streamHasEnded = true;
        }
        if (type === "vod" || type === "event") {
          this.neverRemovesSegments = true;
        }
      }
    }
    if (!headerRead) {
      throw new Error("Invalid M3U8 file; no #EXTM3U header.");
    }
  }
  async getFirstSegment() {
    if (this.segments.length === 0 && !this.streamHasEnded) {
      await this.runUpdateSegments();
    }
    return this.segments[0] ?? null;
  }
  async getSegmentAt(timestamp, options) {
    if (this.segments.length === 0 && !this.streamHasEnded && !(options.skipLiveWait && this.getRemainingWaitTimeMs() > 0)) {
      await this.runUpdateSegments();
    }
    const playlistTimestamp = timestamp - (this.learnedSegmentTimestampOffset ?? 0);
    let isLazy = !!options.skipLiveWait && this.getRemainingWaitTimeMs() > 0;
    while (true) {
      const index = binarySearchLessOrEqual(this.segments, playlistTimestamp, (x) => x.timestamp);
      if (index === -1) {
        return null;
      }
      if (index < this.segments.length - 1 || this.streamHasEnded || isLazy) {
        return this.segments[index];
      }
      const segment = this.segments[index];
      if (playlistTimestamp < segment.timestamp + segment.duration) {
        return segment;
      }
      await this.runUpdateSegments();
      if (options.skipLiveWait) {
        isLazy = true;
      }
    }
  }
  async getNextSegment(segment, options) {
    const index = segment.index;
    assert(index !== -1);
    const nextIndex = index + 1;
    let isLazy = !!options.skipLiveWait && this.getRemainingWaitTimeMs() > 0;
    while (true) {
      if (nextIndex < this.segments.length) {
        return this.segments[nextIndex];
      }
      if (this.streamHasEnded || isLazy) {
        return null;
      }
      await this.runUpdateSegments();
      if (options.skipLiveWait) {
        isLazy = true;
      }
    }
  }
  async getPreviousSegment(segment) {
    const index = segment.index;
    assert(index !== -1);
    return this.segments[index - 1] ?? null;
  }
  getInputForSegment(segment) {
    const hlsSegment = segment;
    const cacheEntry = this.inputCache.find((x) => x.segment === hlsSegment);
    if (cacheEntry) {
      cacheEntry.age = this.nextInputCacheAge++;
      return cacheEntry.input;
    }
    let initInput = null;
    if (hlsSegment.initSegment || hlsSegment.firstSegment) {
      initInput = this.getInputForSegment(hlsSegment.initSegment ?? hlsSegment.firstSegment);
    }
    const formatOptions = {
      ...this.input._formatOptions,
      isobmff: {
        ...this.input._formatOptions.isobmff,
        // Intercept calls to resolveKeyId to inject our psshBox knowledge into it
        resolveKeyId: this.input._formatOptions.isobmff?.resolveKeyId && ((options) => {
          if (!hlsSegment.encryption || !(hlsSegment.encryption.method === "SAMPLE-AES" || hlsSegment.encryption.method === "SAMPLE-AES-CTR") || !hlsSegment.encryption.psshBox) {
            return this.input._formatOptions.isobmff.resolveKeyId(options);
          }
          let psshBoxes = options.psshBoxes;
          const { psshBox } = hlsSegment.encryption;
          if ((psshBox.keyIds === null || psshBox.keyIds.includes(options.keyId)) && !psshBoxes.some((x) => psshBoxesAreEqual(x, psshBox))) {
            psshBoxes = [...psshBoxes, psshBox];
          }
          return this.input._formatOptions.isobmff.resolveKeyId({ ...options, psshBoxes });
        })
      }
    };
    const input2 = new Input({
      source: new CustomPathedSource(hlsSegment.location.path, async (request) => {
        assert(request.isRoot);
        const proxiedRequest = {
          ...request,
          isRoot: false
        };
        let ref;
        const needsSlice = hlsSegment.location.offset > 0 || hlsSegment.location.length !== null;
        if (!hlsSegment.encryption || hlsSegment.encryption.method === "SAMPLE-AES" || hlsSegment.encryption.method === "SAMPLE-AES-CTR") {
          ref = await this.input._getSourceCached(proxiedRequest);
          if (needsSlice) {
            const slice = ref.source.slice(hlsSegment.location.offset, hlsSegment.location.length ?? void 0);
            const sliceRef = slice.ref();
            ref.free();
            ref = sliceRef;
          }
        } else if (hlsSegment.encryption.method === "AES-128") {
          const encryption = hlsSegment.encryption;
          assert(encryption.iv);
          let ciphertextRef = await this.input._getSourceCached(proxiedRequest);
          if (needsSlice) {
            const slice = ciphertextRef.source.slice(hlsSegment.location.offset, hlsSegment.location.length ?? void 0);
            const sliceRef = slice.ref();
            ciphertextRef.free();
            ciphertextRef = sliceRef;
          }
          const ciphertextReader = new Reader(ciphertextRef.source);
          const stream = createAes128CbcDecryptStream(ciphertextReader, async () => {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
              const keyRef = __addDisposableResource2(env_2, await this.input._getSourceCached({ path: encryption.keyUri, isRoot: false }, ENCRYPTION_KEY_CACHE_GROUP), false);
              const keyReader = new Reader(keyRef.source);
              const keySlice = await keyReader.requestSlice(0, AES_128_BLOCK_SIZE);
              if (!keySlice) {
                throw new Error("Invalid AES-128 key; expected at least 16 bytes of data.");
              }
              const key = readBytes(keySlice, AES_128_BLOCK_SIZE);
              return { key, iv: encryption.iv };
            } catch (e_2) {
              env_2.error = e_2;
              env_2.hasError = true;
            } finally {
              __disposeResources2(env_2);
            }
          }, () => {
            ciphertextRef.free();
          });
          ref = new ReadableStreamSource(stream).ref();
        } else {
          assert(false);
        }
        return ref;
      }),
      // Do not allow recursive HLS. Cool on paper, but allows for nasty infinite-depth request trees.
      formats: this.input._formats.filter((x) => !(x instanceof HlsInputFormat)),
      initInput: initInput ?? void 0,
      formatOptions
    });
    input2._onFormatDetermined = (format) => {
      if ((hlsSegment.encryption?.method === "SAMPLE-AES" || hlsSegment.encryption?.method === "SAMPLE-AES-CTR") && !format._isIsobmff) {
        throw new Error("The SAMPLE-AES and SAMPLE-AES-CTR encryption methods are currently only supported for ISOBMFF files.");
      }
    };
    this.inputCache.push({
      segment: hlsSegment,
      input: input2,
      age: this.nextInputCacheAge++
    });
    const MAX_INPUT_CACHE_SIZE = 4;
    if (this.inputCache.length > MAX_INPUT_CACHE_SIZE) {
      const minAgeIndex = arrayArgmin(this.inputCache, (x) => x.age);
      assert(minAgeIndex !== -1);
      this.inputCache.splice(minAgeIndex, 1);
    }
    return input2;
  }
  async getLiveRefreshInterval() {
    if (!this.streamHasEnded && this.getRemainingWaitTimeMs() === 0) {
      await this.runUpdateSegments();
    }
    return this.streamHasEnded ? null : this.refreshInterval;
  }
  getMediaOffsetForDiscontinuity(discontinuityNumber) {
    return this.demuxer.getMediaOffsetForDiscontinuity(discontinuityNumber);
  }
  getFirstSegmentTimestampOffset() {
    return this.segmentTimestampOffsetPromise ??= (async () => {
      const firstSegment = await this.getFirstSegment();
      assert(firstSegment);
      const referenceSegmentedInput = this.demuxer.getReferenceSegmentedInput();
      if (this === referenceSegmentedInput) {
        return 0;
      }
      const referenceFirstSegment = await referenceSegmentedInput.getFirstSegment();
      if (referenceFirstSegment && (this.listsAllSegments() && referenceSegmentedInput.listsAllSegments() || firstSegment.unixEpochTimestamp === firstSegment.timestamp && referenceFirstSegment.unixEpochTimestamp === referenceFirstSegment.timestamp)) {
        return 0;
      }
      const input2 = this.getInputForSegment(firstSegment);
      if (await this.getRawTimestampOffset(input2) === null) {
        return 0;
      }
      const firstTimestamp = await getReferenceFirstTimestamp(input2);
      if (firstTimestamp === null) {
        throw new Error("The playlist's first segment contains no media.");
      }
      const mediaOffset = await this.getMediaOffset(firstSegment, input2);
      const offset = firstTimestamp + mediaOffset - firstSegment.timestamp;
      this.learnedSegmentTimestampOffset ??= offset;
      return offset;
    })();
  }
  listsAllSegments() {
    return this.segments[0].sequenceNumber === 0 || this.neverRemovesSegments;
  }
  async getRawTimestampOffset(input2) {
    const format = await input2.getFormat();
    if (format.supportsTimestampedMediaData) {
      return 0;
    }
    const tags = await input2.getMetadataTags();
    const priv = tags.raw?.["PRIV"];
    for (const frame of toArray(priv)) {
      if (!(frame instanceof Uint8Array) || frame.length !== TIMESTAMP_PRIV_OWNER.length + 1 + 8 || textDecoder.decode(frame.subarray(0, TIMESTAMP_PRIV_OWNER.length)) !== TIMESTAMP_PRIV_OWNER || frame[TIMESTAMP_PRIV_OWNER.length] !== 0) {
        continue;
      }
      const view = toDataView(frame);
      const timestampHigh = view.getUint32(TIMESTAMP_PRIV_OWNER.length + 1);
      const timestampLow = view.getUint32(TIMESTAMP_PRIV_OWNER.length + 5);
      if (timestampHigh > 1) {
        continue;
      }
      const timestamp = 2 ** 32 * timestampHigh + timestampLow;
      const privTimestamp = normalizeWrappedTimestamp(timestamp, createTimestampWrapInfo(timestamp)) / MPEG_TS_TIMESCALE;
      return privTimestamp - await input2.getFirstTimestamp();
    }
    return null;
  }
  getTimestampWrapPeriod() {
    return TIMESTAMP_MODULUS / MPEG_TS_TIMESCALE;
  }
};

// node_modules/mediabunny/dist/modules/src/hls/hls-demuxer.js
var MAX_VARIANT_STREAMS = 256;
var MAX_MEDIA_TAGS = 256;
var HlsDemuxer = class extends Demuxer {
  constructor(input2) {
    super(input2);
    this.metadataPromise = null;
    this.trackBackings = null;
    this.internalTracks = null;
    this.segmentedInputs = [];
    this.hasMasterPlaylist = true;
    this.masterPlaylistVariables = null;
    this.mediaOffsets = /* @__PURE__ */ new Map();
  }
  readMetadata() {
    return this.metadataPromise ??= (async () => {
      assert(this.input._rootSource instanceof PathedSource);
      const slice = await this.input._reader.requestEntireFile();
      assert(slice);
      const lines = readAllLines(slice, slice.length, { ignore: canIgnoreLine });
      const { rootPath } = this.input._rootSource;
      const variables = new HlsPlaylistVariables(rootPath, null);
      const variantStreams = [];
      const mediaTags = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith(TAG_DEFINE)) {
          variables.define(line.slice(TAG_DEFINE.length));
        } else if (line.startsWith(TAG_STREAM_INF)) {
          const streamInfLineNumber = i;
          let playlistPath = lines[++i];
          if (playlistPath === void 0) {
            throw new Error("Incorrect M3U8 file; a line must follow the #EXT-X-STREAM-INF tag.");
          }
          playlistPath = variables.substitute(playlistPath);
          const fullPath = joinPaths(rootPath, playlistPath);
          const attributes = new AttributeList(line.slice(TAG_STREAM_INF.length), variables);
          const bandwidth = attributes.getAsNumber("bandwidth");
          if (bandwidth === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-STREAM-INF tag requires a BANDWIDTH attribute with a valid numerical value.");
          }
          variantStreams.push({
            fullPath,
            attributes,
            lineNumber: streamInfLineNumber,
            hasOnlyKeyPackets: false
          });
        } else if (line.startsWith(TAG_I_FRAME_STREAM_INF)) {
          const attributes = new AttributeList(line.slice(TAG_I_FRAME_STREAM_INF.length), variables);
          const playlistPath = attributes.get("uri");
          if (playlistPath === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-I-FRAME-STREAM-INF tag requires a URI attribute.");
          }
          const bandwidth = attributes.getAsNumber("bandwidth");
          if (bandwidth === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-I-FRAME-STREAM-INF tag requires a BANDWIDTH attribute with a valid numerical value.");
          }
          const fullPath = joinPaths(rootPath, playlistPath);
          variantStreams.push({
            fullPath,
            attributes,
            lineNumber: i,
            hasOnlyKeyPackets: true
          });
        } else if (line.startsWith(TAG_MEDIA)) {
          const attributes = new AttributeList(line.slice(TAG_MEDIA.length), variables);
          const type = attributes.get("type");
          if (type === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-MEDIA tag requires a TYPE attribute.");
          }
          const groupId = attributes.get("group-id");
          if (groupId === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-MEDIA tag requires a GROUP-ID attribute.");
          }
          let fullPath = null;
          const uri = attributes.get("uri");
          if (uri !== null) {
            fullPath = joinPaths(rootPath, uri);
          }
          mediaTags.push({ fullPath, attributes, lineNumber: i });
        } else if (line.startsWith(TAG_EXTINF)) {
          const segmentedInput = new HlsSegmentedInput(this, rootPath, null, lines);
          this.segmentedInputs = [segmentedInput];
          this.hasMasterPlaylist = false;
          this.trackBackings = await segmentedInput.getTrackBackings();
          return;
        }
      }
      if (variantStreams.length > MAX_VARIANT_STREAMS || mediaTags.length > MAX_MEDIA_TAGS) {
        throw new Error("Unsupported M3U8 file; too many variant streams or media tags.");
      }
      this.masterPlaylistVariables = variables;
      const internalTracksByVariant = await Promise.all(variantStreams.map(async (variantStream, i) => {
        const result = [];
        const codecsList = variantStream.attributes.get("codecs");
        let codecStrings;
        if (codecsList) {
          codecStrings = codecsList.split(",").map((x) => x.trim());
        } else {
          const segmentedInput = this.getSegmentedInputForPath(variantStream.fullPath);
          const trackBackings = await segmentedInput.getTrackBackings();
          const tracksWithCodec = await Promise.all(trackBackings.map(async (t) => ({ track: t, codec: await t.getCodec() })));
          codecStrings = await Promise.all(tracksWithCodec.filter((x) => x.codec !== null).map((x) => x.track.getDecoderConfig().then((x2) => x2.codec)));
        }
        const videoGroupId = variantStream.attributes.get("video");
        const audioGroupId = variantStream.attributes.get("audio");
        const containsVideoCodecs = codecStrings.some((x) => VIDEO_CODECS.includes(inferCodecFromCodecString(x)));
        const containsAudioCodecs = codecStrings.some((x) => AUDIO_CODECS.includes(inferCodecFromCodecString(x)));
        if (videoGroupId !== null && !containsVideoCodecs) {
          const matchingVideoMediaTag = mediaTags.find((mediaTag) => {
            const groupId = mediaTag.attributes.get("group-id");
            const type = mediaTag.attributes.get("type");
            return groupId === videoGroupId && type.toLowerCase() === "video";
          });
          outer: if (matchingVideoMediaTag) {
            const uri = matchingVideoMediaTag.attributes.get("uri");
            if (uri === null) {
              break outer;
            }
            const fullPath = joinPaths(rootPath, uri);
            const segmentedInput = this.getSegmentedInputForPath(fullPath);
            const trackBackings = await segmentedInput.getTrackBackings();
            const videoTrack = trackBackings.find((x) => x.getType() === "video");
            if (!videoTrack || await videoTrack.getCodec() === null) {
              break outer;
            }
            const additionalCodecString = await videoTrack.getDecoderConfig().then((x) => x?.codec ?? null);
            assert(additionalCodecString !== null);
            codecStrings.push(additionalCodecString);
          }
        }
        if (audioGroupId !== null && !containsAudioCodecs) {
          const matchingAudioMediaTag = mediaTags.find((tag) => {
            const groupId = tag.attributes.get("group-id");
            const type = tag.attributes.get("type");
            return groupId === audioGroupId && type.toLowerCase() === "audio";
          });
          outer: if (matchingAudioMediaTag) {
            const uri = matchingAudioMediaTag.attributes.get("uri");
            if (uri === null) {
              break outer;
            }
            const fullPath = joinPaths(rootPath, uri);
            const segmentedInput = this.getSegmentedInputForPath(fullPath);
            const trackBackings = await segmentedInput.getTrackBackings();
            const audioTrack = trackBackings.find((x) => x.getType() === "audio");
            if (!audioTrack || await audioTrack.getCodec() === null) {
              break outer;
            }
            const additionalCodecString = await audioTrack.getDecoderConfig().then((x) => x?.codec ?? null);
            assert(additionalCodecString !== null);
            codecStrings.push(additionalCodecString);
          }
        }
        codecStrings = [...new Set(codecStrings)];
        const bandwidth = variantStream.attributes.getAsNumber("bandwidth");
        assert(bandwidth !== null);
        const averageBandwidth = variantStream.attributes.getAsNumber("average-bandwidth");
        const name = variantStream.attributes.get("name");
        const resolveCodec = async (typeCodecStrings, fullPath, type) => {
          const codecs = new Set(typeCodecStrings.map((x) => inferCodecFromCodecString(x)));
          if (codecs.size === 1) {
            const [codec2] = codecs;
            assert(codec2);
            return {
              codec: codec2,
              // With several strings for the same codec, we can't tell which one belongs to this track
              fullCodecString: typeCodecStrings.length === 1 ? typeCodecStrings[0] : null
            };
          }
          const segmentedInput = this.getSegmentedInputForPath(fullPath);
          const trackBackings = (await segmentedInput.getTrackBackings()).filter((x) => x.getType() === type);
          if (trackBackings.length !== 1) {
            throw new Error(`Unsupported M3U8 file; a variant stream lists several ${type} codecs, but its media doesn't contain exactly one ${type} track.`);
          }
          const codec = await trackBackings[0].getCodec();
          if (codec === null) {
            return null;
          }
          const decoderConfig = await trackBackings[0].getDecoderConfig();
          assert(decoderConfig);
          return {
            codec,
            fullCodecString: decoderConfig.codec
          };
        };
        const videoCodecStrings = codecStrings.filter((x) => VIDEO_CODECS.includes(inferCodecFromCodecString(x)));
        const audioCodecStrings = codecStrings.filter((x) => AUDIO_CODECS.includes(inferCodecFromCodecString(x)));
        for (const codecString of codecStrings) {
          if (codecString === videoCodecStrings[0]) {
            const referencedVideoMediaTags = mediaTags.filter((mediaTag) => mediaTag.attributes.get("group-id") === videoGroupId && mediaTag.attributes.get("type").toLowerCase() === "video");
            if (referencedVideoMediaTags.length === 0) {
              const resolution = variantStream.attributes.get("resolution");
              let width = null;
              let height = null;
              if (resolution) {
                const match = resolution.match(/^(\d+)x(\d+)$/);
                if (match) {
                  width = Number(match[1]);
                  height = Number(match[2]);
                }
              }
              const resolvedCodec = await resolveCodec(videoCodecStrings, variantStream.fullPath, "video");
              if (resolvedCodec) {
                result.push({
                  demuxer: this,
                  backingTrack: null,
                  default: true,
                  autoselect: true,
                  languageCode: UNDETERMINED_LANGUAGE,
                  lineNumber: variantStream.lineNumber,
                  fullPath: variantStream.fullPath,
                  codec: resolvedCodec.codec,
                  fullCodecString: resolvedCodec.fullCodecString,
                  pairingMask: 1n << BigInt(i),
                  peakBitrate: bandwidth,
                  averageBitrate: averageBandwidth,
                  name,
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "video",
                    width,
                    height
                  }
                });
              }
            } else {
              const resolvedCodecs = await Promise.all(referencedVideoMediaTags.map((mediaTag) => resolveCodec(videoCodecStrings, mediaTag.fullPath ?? variantStream.fullPath, "video")));
              for (let j = 0; j < referencedVideoMediaTags.length; j++) {
                const mediaTag = referencedVideoMediaTags[j];
                const resolvedCodec = resolvedCodecs[j];
                if (!resolvedCodec) {
                  continue;
                }
                const resolution = mediaTag.attributes.get("resolution") ?? variantStream.attributes.get("resolution");
                let width = null;
                let height = null;
                if (resolution) {
                  const match = resolution.match(/^(\d+)x(\d+)$/);
                  if (match) {
                    width = Number(match[1]);
                    height = Number(match[2]);
                  }
                }
                result.push({
                  demuxer: this,
                  backingTrack: null,
                  default: getMediaTagDefault(mediaTag.attributes),
                  // Autoselect is inferred to be true if the default is true
                  autoselect: getMediaTagDefault(mediaTag.attributes) || getMediaTagAutoselect(mediaTag.attributes),
                  languageCode: preprocessLanguageCode(mediaTag.attributes.get("language")),
                  lineNumber: mediaTag.lineNumber,
                  fullPath: mediaTag.fullPath ?? variantStream.fullPath,
                  codec: resolvedCodec.codec,
                  fullCodecString: resolvedCodec.fullCodecString,
                  pairingMask: 1n << BigInt(i),
                  peakBitrate: mediaTag.fullPath === null ? bandwidth : null,
                  averageBitrate: mediaTag.fullPath === null ? averageBandwidth : null,
                  name: mediaTag.attributes.get("name"),
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "video",
                    width,
                    height
                  }
                });
              }
            }
          } else if (codecString === audioCodecStrings[0]) {
            const referencedAudioMediaTags = mediaTags.filter((mediaTag) => mediaTag.attributes.get("group-id") === audioGroupId && mediaTag.attributes.get("type").toLowerCase() === "audio");
            if (referencedAudioMediaTags.length === 0) {
              const resolvedCodec = await resolveCodec(audioCodecStrings, variantStream.fullPath, "audio");
              if (resolvedCodec) {
                const channels = variantStream.attributes.get("channels");
                result.push({
                  demuxer: this,
                  backingTrack: null,
                  default: true,
                  autoselect: true,
                  languageCode: UNDETERMINED_LANGUAGE,
                  lineNumber: variantStream.lineNumber,
                  fullPath: variantStream.fullPath,
                  codec: resolvedCodec.codec,
                  fullCodecString: resolvedCodec.fullCodecString,
                  pairingMask: 1n << BigInt(i),
                  peakBitrate: bandwidth,
                  averageBitrate: averageBandwidth,
                  name,
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "audio",
                    numberOfChannels: parseChannelCount(channels)
                  }
                });
              }
            } else {
              const resolvedCodecs = await Promise.all(referencedAudioMediaTags.map((mediaTag) => resolveCodec(audioCodecStrings, mediaTag.fullPath ?? variantStream.fullPath, "audio")));
              for (let j = 0; j < referencedAudioMediaTags.length; j++) {
                const mediaTag = referencedAudioMediaTags[j];
                const resolvedCodec = resolvedCodecs[j];
                if (!resolvedCodec) {
                  continue;
                }
                const channels = mediaTag.attributes.get("channels") ?? variantStream.attributes.get("channels");
                result.push({
                  demuxer: this,
                  backingTrack: null,
                  default: getMediaTagDefault(mediaTag.attributes),
                  // Autoselect is inferred to be true if the default is true
                  autoselect: getMediaTagDefault(mediaTag.attributes) || getMediaTagAutoselect(mediaTag.attributes),
                  languageCode: preprocessLanguageCode(mediaTag.attributes.get("language")),
                  lineNumber: mediaTag.lineNumber,
                  fullPath: mediaTag.fullPath ?? variantStream.fullPath,
                  codec: resolvedCodec.codec,
                  fullCodecString: resolvedCodec.fullCodecString,
                  pairingMask: 1n << BigInt(i),
                  peakBitrate: mediaTag.fullPath === null ? bandwidth : null,
                  averageBitrate: mediaTag.fullPath === null ? averageBandwidth : null,
                  name: mediaTag.attributes.get("name"),
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "audio",
                    numberOfChannels: parseChannelCount(channels)
                  }
                });
              }
            }
          }
        }
        return result;
      }));
      const internalTracks = [];
      const addInternalTrack = (track) => {
        const existingTrack = internalTracks.find((x) => x.fullPath === track.fullPath && x.info.type === track.info.type);
        if (existingTrack) {
          existingTrack.pairingMask |= track.pairingMask;
          existingTrack.default ||= track.default;
          existingTrack.autoselect ||= track.autoselect;
          existingTrack.lineNumber = Math.min(existingTrack.lineNumber, track.lineNumber);
          if (track.peakBitrate !== null) {
            existingTrack.peakBitrate = Math.max(existingTrack.peakBitrate ?? -Infinity, track.peakBitrate);
          }
          if (track.averageBitrate !== null) {
            existingTrack.averageBitrate = Math.max(existingTrack.averageBitrate ?? -Infinity, track.averageBitrate);
          }
          if (existingTrack.languageCode === UNDETERMINED_LANGUAGE) {
            existingTrack.languageCode = track.languageCode;
          }
        } else {
          internalTracks.push(track);
        }
      };
      for (const variantInternalTracks of internalTracksByVariant) {
        for (const trackEntry of variantInternalTracks) {
          addInternalTrack(trackEntry);
        }
      }
      internalTracks.sort((a, b) => a.lineNumber - b.lineNumber);
      this.trackBackings = [];
      for (const internalTrack of internalTracks) {
        if (internalTrack.info.type === "video") {
          this.trackBackings.push(new HlsInputVideoTrackBacking(internalTrack));
        } else {
          this.trackBackings.push(new HlsInputAudioTrackBacking(internalTrack));
        }
      }
      this.internalTracks = internalTracks;
    })();
  }
  async getTrackBackings() {
    await this.readMetadata();
    assert(this.trackBackings);
    return this.trackBackings;
  }
  getMediaOffsetForDiscontinuity(discontinuityNumber) {
    let promise = this.mediaOffsets.get(discontinuityNumber);
    if (promise) {
      return promise;
    }
    promise = (async () => {
      const referenceSegmentedInput = this.getReferenceSegmentedInput();
      let segment = await referenceSegmentedInput.getFirstSegment();
      while (segment && segment.discontinuityNumber < discontinuityNumber) {
        segment = await referenceSegmentedInput.getNextSegment(segment, {});
      }
      if (!segment || segment.discontinuityNumber !== discontinuityNumber) {
        throw new Error(`The reference playlist contains no segment in discontinuity ${discontinuityNumber}, so the discontinuity can't be synchronized across tracks. If you think this is a bug, please raise an issue and include the playlist.`);
      }
      const input2 = referenceSegmentedInput.getInputForSegment(segment);
      const rawTimestampOffset = await referenceSegmentedInput.getRawTimestampOffset(input2) ?? 0;
      const firstTimestamp = await getReferenceFirstTimestamp(input2);
      if (firstTimestamp === null) {
        throw new Error("The reference playlist's segment contains no media.");
      }
      return segment.timestamp - (rawTimestampOffset + firstTimestamp);
    })();
    this.mediaOffsets.set(discontinuityNumber, promise);
    return promise;
  }
  getReferenceSegmentedInput() {
    if (!this.hasMasterPlaylist) {
      return this.segmentedInputs[0];
    }
    assert(this.internalTracks);
    const regularTracks = this.internalTracks.filter((x) => !x.hasOnlyKeyPackets);
    const candidates = regularTracks.length > 0 ? regularTracks : this.internalTracks;
    const videoCandidates = candidates.filter((x) => x.info.type === "video");
    const pool = videoCandidates.length > 0 ? videoCandidates : candidates;
    const index = arrayArgmin(pool, (x) => x.peakBitrate ?? Infinity);
    assert(index !== -1);
    return this.getSegmentedInputForPath(pool[index].fullPath);
  }
  getSegmentedInputForPath(path) {
    let segmentedInput = this.segmentedInputs.find((x) => x.path === path);
    if (segmentedInput) {
      return segmentedInput;
    }
    let decls = null;
    if (this.internalTracks) {
      const tracks = this.internalTracks.filter((x) => x.fullPath === path);
      decls = tracks.map((x) => ({ type: x.info.type }));
    }
    segmentedInput = new HlsSegmentedInput(this, path, decls, null);
    this.segmentedInputs.push(segmentedInput);
    return segmentedInput;
  }
  async getMetadataTags() {
    return {};
  }
  async getMimeType() {
    return HLS_MIME_TYPE;
  }
  dispose() {
    if (this.segmentedInputs) {
      for (const segInput of this.segmentedInputs) {
        segInput.dispose();
      }
      this.segmentedInputs.length = 0;
    }
  }
};
var HlsInputTrackBacking = class {
  constructor(internalTrack) {
    this.internalTrack = internalTrack;
    this.hydrationPromise = null;
  }
  hydrate() {
    return this.hydrationPromise ??= (async () => {
      const segmentedInput = this.internalTrack.demuxer.getSegmentedInputForPath(this.internalTrack.fullPath);
      let trackBacking = null;
      const trackBackings = await segmentedInput.getTrackBackings();
      const matchingType = trackBackings.filter((x) => x.getType() === this.getType());
      if (matchingType.length === 1) {
        trackBacking = matchingType[0];
      } else {
        if (this instanceof HlsInputVideoTrackBacking) {
          for (const backing of matchingType) {
            if (await backing.getCodec() === this.getCodec()) {
              trackBacking = backing;
              break;
            }
          }
        } else {
          assert(this instanceof HlsInputAudioTrackBacking);
          for (const backing of matchingType) {
            if (await backing.getCodec() === this.getCodec()) {
              trackBacking = backing;
              break;
            }
          }
        }
      }
      if (!trackBacking) {
        throw new Error("Could not find matching track in underlying media data.");
      }
      this.internalTrack.backingTrack = trackBacking;
    })();
  }
  /** If the backing track is already present, delegate synchronously; otherwise, hydrate first. */
  delegate(fn) {
    if (this.internalTrack.backingTrack) {
      return fn();
    }
    return this.hydrate().then(fn);
  }
  getCodec() {
    throw new Error("Not implemented on base class.");
  }
  getDisposition() {
    return {
      ...DEFAULT_TRACK_DISPOSITION,
      // Meanings are swapped in HLS: "Default" means that a track is the primary track.
      default: this.internalTrack.autoselect,
      primary: this.internalTrack.default
    };
  }
  getPairingMask() {
    return this.internalTrack.pairingMask;
  }
  getInternalCodecId() {
    return null;
  }
  getLanguageCode() {
    return this.internalTrack.languageCode;
  }
  getName() {
    return this.internalTrack.name;
  }
  getNumber() {
    assert(this.internalTrack.demuxer.internalTracks);
    const trackType = this.internalTrack.info.type;
    let number = 0;
    for (const track of this.internalTrack.demuxer.internalTracks) {
      if (track.info.type === trackType) {
        number++;
      }
      if (track === this.internalTrack) {
        break;
      }
    }
    return number;
  }
  getTimeResolution() {
    return this.delegate(() => this.internalTrack.backingTrack.getTimeResolution());
  }
  isRelativeToUnixEpoch() {
    return this.delegate(() => this.internalTrack.backingTrack.isRelativeToUnixEpoch());
  }
  getUnixTimeForTimestamp(timestamp) {
    return this.delegate(() => this.internalTrack.backingTrack.getUnixTimeForTimestamp(timestamp));
  }
  getBitrate() {
    return this.internalTrack.peakBitrate;
  }
  getAverageBitrate() {
    return this.internalTrack.averageBitrate;
  }
  async getDurationFromMetadata(options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getDurationFromMetadata(options);
  }
  async getLiveRefreshInterval() {
    await this.hydrate();
    return this.internalTrack.backingTrack.getLiveRefreshInterval();
  }
  getHasOnlyKeyPackets() {
    return this.internalTrack.hasOnlyKeyPackets || null;
  }
  async getFirstPacket(options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getFirstPacket(options);
  }
  async getPacket(timestamp, options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getPacket(timestamp, options);
  }
  async getKeyPacket(timestamp, options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getKeyPacket(timestamp, options);
  }
  async getNextPacket(packet, options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getNextPacket(packet, options);
  }
  async getNextKeyPacket(packet, options) {
    await this.hydrate();
    return this.internalTrack.backingTrack.getNextKeyPacket(packet, options);
  }
};
var HlsInputVideoTrackBacking = class extends HlsInputTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
  }
  get backingVideoTrack() {
    return this.internalTrack.backingTrack;
  }
  getType() {
    return "video";
  }
  getCodec() {
    return this.internalTrack.codec;
  }
  getCodedWidth() {
    return this.delegate(() => this.backingVideoTrack.getCodedWidth());
  }
  getCodedHeight() {
    return this.delegate(() => this.backingVideoTrack.getCodedHeight());
  }
  getSquarePixelWidth() {
    return this.delegate(() => this.backingVideoTrack.getSquarePixelWidth());
  }
  getSquarePixelHeight() {
    return this.delegate(() => this.backingVideoTrack.getSquarePixelHeight());
  }
  getMetadataDisplayWidth() {
    if (this.backingVideoTrack) {
      return null;
    }
    return this.internalTrack.info.width;
  }
  getMetadataDisplayHeight() {
    if (this.backingVideoTrack) {
      return null;
    }
    return this.internalTrack.info.height;
  }
  getTransformationMatrix() {
    return this.delegate(() => this.backingVideoTrack.getTransformationMatrix());
  }
  async getColorSpace() {
    await this.hydrate();
    return this.backingVideoTrack.getColorSpace();
  }
  async canBeTransparent() {
    await this.hydrate();
    return this.backingVideoTrack.canBeTransparent();
  }
  getMetadataCodecParameterString() {
    if (this.backingVideoTrack) {
      return null;
    }
    return this.internalTrack.fullCodecString;
  }
  async getDecoderConfig() {
    await this.hydrate();
    if (await this.backingVideoTrack.getCodec() !== this.getCodec()) {
      throw new Error("The codec in the playlist doesn't match the codec of the media data.");
    }
    return this.backingVideoTrack.getDecoderConfig();
  }
};
var HlsInputAudioTrackBacking = class extends HlsInputTrackBacking {
  constructor(internalTrack) {
    super(internalTrack);
  }
  get backingAudioTrack() {
    return this.internalTrack.backingTrack;
  }
  getType() {
    return "audio";
  }
  getCodec() {
    return this.internalTrack.codec;
  }
  getNumberOfChannels() {
    if (this.internalTrack.info.numberOfChannels !== null) {
      return this.internalTrack.info.numberOfChannels;
    }
    return this.delegate(() => this.backingAudioTrack.getNumberOfChannels());
  }
  getSampleRate() {
    return this.delegate(() => this.backingAudioTrack.getSampleRate());
  }
  getMetadataCodecParameterString() {
    if (this.backingAudioTrack) {
      return null;
    }
    return this.internalTrack.fullCodecString;
  }
  async getDecoderConfig() {
    await this.hydrate();
    if (await this.backingAudioTrack.getCodec() !== this.getCodec()) {
      throw new Error("The codec in the playlist doesn't match the codec of the media data.");
    }
    return this.backingAudioTrack.getDecoderConfig();
  }
};
var getMediaTagDefault = (attributes) => {
  const value = attributes.get("default");
  if (value === null) {
    return false;
  }
  const normalized = value.toUpperCase();
  if (normalized === "YES") {
    return true;
  }
  if (normalized === "NO") {
    return false;
  }
  throw new Error(`Invalid M3U8 file; #EXT-X-MEDIA DEFAULT attribute must be YES or NO, got "${value}".`);
};
var getMediaTagAutoselect = (attributes) => {
  const value = attributes.get("autoselect");
  if (value === null) {
    return false;
  }
  const normalized = value.toUpperCase();
  if (normalized === "YES") {
    return true;
  }
  if (normalized === "NO") {
    return false;
  }
  throw new Error(`Invalid M3U8 file; #EXT-X-MEDIA AUTOSELECT attribute must be YES or NO, got "${value}".`);
};
var preprocessLanguageCode = (code) => {
  if (code === null) {
    return UNDETERMINED_LANGUAGE;
  }
  const languageSubtag = code.split("-")[0];
  if (!languageSubtag) {
    return UNDETERMINED_LANGUAGE;
  }
  return languageSubtag;
};
var parseChannelCount = (channels) => {
  if (channels === null) {
    return null;
  }
  const [count, objectCodingIdentifiers] = channels.split("/");
  if (objectCodingIdentifiers !== void 0 && objectCodingIdentifiers !== "-") {
    return null;
  }
  const number = Number(count);
  return Number.isInteger(number) && number > 0 ? number : null;
};

// node_modules/mediabunny/dist/modules/src/input-format.js
var InputFormat = class {
  constructor() {
    this._isIsobmff = false;
  }
};
var IsobmffInputFormat = class extends InputFormat {
  constructor() {
    super(...arguments);
    this._isIsobmff = true;
  }
  /** @internal */
  async _getMajorBrand(input2) {
    let slice = input2._reader.requestSlice(0, 12);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    const size = readU32Be(slice);
    const fourCc = readAscii(slice, 4);
    if (fourCc !== "ftyp" && fourCc !== "styp") {
      return null;
    }
    if (size === 1) {
      let brandSlice = input2._reader.requestSlice(16, 4);
      if (isThenable(brandSlice))
        brandSlice = await brandSlice;
      if (!brandSlice) {
        return null;
      }
      return readAscii(brandSlice, 4);
    }
    return readAscii(slice, 4);
  }
  /** @internal */
  _createDemuxer(input2) {
    return new IsobmffDemuxer(input2);
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var Mp4InputFormat = class extends IsobmffInputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const majorBrand = await this._getMajorBrand(input2);
    if (majorBrand !== null) {
      return majorBrand !== "qt  " ? 0 : null;
    }
    let pos = 0;
    for (let iter = 0; iter < 10; iter++) {
      let slice = input2._reader.requestSlice(pos, 8);
      if (isThenable(slice))
        slice = await slice;
      if (!slice)
        return null;
      let size = readU32Be(slice);
      let headerSize = 8;
      if (size === 1) {
        let sizeExtensionSlice = input2._reader.requestSlice(pos + 8, 8);
        if (isThenable(sizeExtensionSlice))
          sizeExtensionSlice = await sizeExtensionSlice;
        if (!sizeExtensionSlice)
          return null;
        size = readU64Be(sizeExtensionSlice);
        headerSize = 16;
      }
      if (size < headerSize) {
        return null;
      }
      const fourCc = readAscii(slice, 4);
      if (
        // Seen in HLS for example, or in normal files without an ftyp box
        fourCc === "moof" || fourCc === "sidx" || fourCc === "moov" || fourCc === "mdat"
      ) {
        return 0;
      } else if (fourCc === "emsg" || fourCc === "prft" || fourCc === "free" || fourCc === "skip" || fourCc === "wide") {
        pos += size;
      } else {
        return null;
      }
    }
    return null;
  }
  get name() {
    return "MP4";
  }
  get mimeType() {
    return "video/mp4";
  }
};
var QuickTimeInputFormat = class extends IsobmffInputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const majorBrand = await this._getMajorBrand(input2);
    return majorBrand === "qt  " ? 0 : null;
  }
  get name() {
    return "QuickTime File Format";
  }
  get mimeType() {
    return "video/quicktime";
  }
};
var MatroskaInputFormat = class extends InputFormat {
  /** @internal */
  async isSupportedEBMLOfDocType(input2, desiredDocType) {
    let headerSlice = input2._reader.requestSlice(0, MAX_HEADER_SIZE);
    if (isThenable(headerSlice))
      headerSlice = await headerSlice;
    if (!headerSlice)
      return false;
    const varIntSize = readVarIntSize(headerSlice);
    if (varIntSize === null) {
      return false;
    }
    if (varIntSize < 1 || varIntSize > 8) {
      return false;
    }
    const id = readUnsignedInt(headerSlice, varIntSize);
    if (id !== EBMLId.EBML) {
      return false;
    }
    const dataSize = readElementSize(headerSlice);
    if (typeof dataSize !== "number") {
      return false;
    }
    let dataSlice = input2._reader.requestSlice(headerSlice.filePos, dataSize);
    if (isThenable(dataSlice))
      dataSlice = await dataSlice;
    if (!dataSlice)
      return false;
    const startPos = headerSlice.filePos;
    while (dataSlice.filePos <= startPos + dataSize - MIN_HEADER_SIZE) {
      const header = readElementHeader(dataSlice);
      if (!header)
        break;
      const { id: id2, size } = header;
      const dataStartPos = dataSlice.filePos;
      if (size === void 0)
        return false;
      if (dataStartPos + size > startPos + dataSize || size > 8 && id2 !== EBMLId.DocType) {
        return false;
      }
      switch (id2) {
        case EBMLId.EBMLReadVersion:
          {
            const ebmlReadVersion = readUnsignedInt(dataSlice, size);
            if (ebmlReadVersion !== 1) {
              return false;
            }
          }
          ;
          break;
        case EBMLId.DocType:
          {
            const docType = readAsciiString(dataSlice, size);
            if (docType !== desiredDocType) {
              return false;
            }
          }
          ;
          break;
        case EBMLId.DocTypeReadVersion:
          {
            const docTypeReadVersion = readUnsignedInt(dataSlice, size);
            if (docTypeReadVersion > 4) {
              return false;
            }
          }
          ;
          break;
      }
      dataSlice.filePos = dataStartPos + size;
    }
    return true;
  }
  /** @internal */
  async _getMatchPosition(input2) {
    return await this.isSupportedEBMLOfDocType(input2, "matroska") ? 0 : null;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new MatroskaDemuxer(input2);
  }
  get name() {
    return "Matroska";
  }
  get mimeType() {
    return "video/x-matroska";
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var WebMInputFormat = class extends MatroskaInputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    return await this.isSupportedEBMLOfDocType(input2, "webm") ? 0 : null;
  }
  get name() {
    return "WebM";
  }
  get mimeType() {
    return "video/webm";
  }
};
var Mp3InputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const startPos = await skipId3V2Tags(input2._reader, 0);
    const result = await readConfirmedMp3FrameHeader(input2._reader, startPos, 4096, null);
    if (!result) {
      return null;
    }
    return result.startPos === startPos ? 0 : result.startPos;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new Mp3Demuxer(input2);
  }
  get name() {
    return "MP3";
  }
  get mimeType() {
    return "audio/mpeg";
  }
  get supportsTimestampedMediaData() {
    return false;
  }
};
var WaveInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    let slice = input2._reader.requestSlice(0, 12);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    const riffType = readAscii(slice, 4);
    if (riffType !== "RIFF" && riffType !== "RIFX" && riffType !== "RF64") {
      return null;
    }
    slice.skip(4);
    const format = readAscii(slice, 4);
    return format === "WAVE" ? 0 : null;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new WaveDemuxer(input2);
  }
  get name() {
    return "WAVE";
  }
  get mimeType() {
    return "audio/wav";
  }
  get supportsTimestampedMediaData() {
    return false;
  }
};
var OggInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    let slice = input2._reader.requestSlice(0, 4);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    return readAscii(slice, 4) === "OggS" ? 0 : null;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new OggDemuxer(input2);
  }
  get name() {
    return "Ogg";
  }
  get mimeType() {
    return "application/ogg";
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var FlacInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const startPos = await skipId3V2Tags(input2._reader, 0);
    let slice = input2._reader.requestSlice(startPos, 4);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    return readAscii(slice, 4) === "fLaC" ? 0 : null;
  }
  get name() {
    return "FLAC";
  }
  get mimeType() {
    return "audio/flac";
  }
  get supportsTimestampedMediaData() {
    return false;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new FlacDemuxer(input2);
  }
};
var AdtsInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const startPos = await skipId3V2Tags(input2._reader, 0);
    const header = await readConfirmedAdtsFrameHeader(input2._reader, startPos, 4096, null);
    if (!header) {
      return null;
    }
    return header.startPos === startPos ? 0 : header.startPos;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new AdtsDemuxer(input2);
  }
  get name() {
    return "ADTS";
  }
  get mimeType() {
    return "audio/aac";
  }
  get supportsTimestampedMediaData() {
    return false;
  }
};
var MpegTsInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    const lengthToCheck = TS_PACKET_SIZE + 16 + 1;
    let slice = input2._reader.requestSlice(0, lengthToCheck);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    const bytes = readBytes(slice, lengthToCheck);
    if (bytes[0] === 71 && bytes[TS_PACKET_SIZE] === 71) {
      return 0;
    } else if (bytes[0] === 71 && bytes[TS_PACKET_SIZE + 16] === 71) {
      return 0;
    } else if (bytes[4] === 71 && bytes[4 + TS_PACKET_SIZE + 4] === 71) {
      return 0;
    }
    return null;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new MpegTsDemuxer(input2);
  }
  get name() {
    return "MPEG Transport Stream";
  }
  get mimeType() {
    return "video/MP2T";
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var HlsInputFormat = class extends InputFormat {
  /** @internal */
  async _getMatchPosition(input2) {
    let slice = input2._reader.requestSlice(0, 7);
    if (isThenable(slice))
      slice = await slice;
    if (!slice)
      return null;
    const isM3u8 = readAscii(slice, 7) === "#EXTM3U";
    if (!isM3u8) {
      return null;
    }
    if (!(input2._rootSource instanceof PathedSource)) {
      throw new TypeError("HLS inputs require `InputOptions.source` to be a PathedSource or a ref to one.");
    }
    input2._rootSource._usedForHls = true;
    return 0;
  }
  /** @internal */
  _createDemuxer(input2) {
    return new HlsDemuxer(input2);
  }
  get name() {
    return "HTTP Live Streaming (HLS)";
  }
  get mimeType() {
    return HLS_MIME_TYPE;
  }
  get supportsTimestampedMediaData() {
    return true;
  }
};
var MP4 = /* @__PURE__ */ new Mp4InputFormat();
var QTFF = /* @__PURE__ */ new QuickTimeInputFormat();
var MATROSKA = /* @__PURE__ */ new MatroskaInputFormat();
var WEBM = /* @__PURE__ */ new WebMInputFormat();
var MP3 = /* @__PURE__ */ new Mp3InputFormat();
var WAVE = /* @__PURE__ */ new WaveInputFormat();
var OGG = /* @__PURE__ */ new OggInputFormat();
var ADTS = /* @__PURE__ */ new AdtsInputFormat();
var FLAC = /* @__PURE__ */ new FlacInputFormat();
var MPEG_TS = /* @__PURE__ */ new MpegTsInputFormat();
var HLS = /* @__PURE__ */ new HlsInputFormat();
var ALL_FORMATS = [HLS, MP4, QTFF, MATROSKA, WEBM, WAVE, OGG, FLAC, MP3, ADTS, MPEG_TS];
var validateInputFormatOptions = (options, prefix) => {
  if (!options || typeof options !== "object") {
    throw new TypeError(`${prefix}, when provided, must be an object.`);
  }
  if (options.isobmff !== void 0) {
    if (!options.isobmff || typeof options.isobmff !== "object") {
      throw new TypeError(`${prefix}.isobmff, when provided, must be an object.`);
    }
    if (options.isobmff.resolveKeyId !== void 0 && typeof options.isobmff.resolveKeyId !== "function") {
      throw new TypeError(`${prefix}.isobmff.resolveKeyId, when provided, must be a function.`);
    }
  }
  if (options.hls !== void 0) {
    if (!options.hls || typeof options.hls !== "object") {
      throw new TypeError(`${prefix}.hls, when provided, must be an object.`);
    }
    if (options.hls.offsetTimestampsByDateTime !== void 0 && typeof options.hls.offsetTimestampsByDateTime !== "boolean") {
      throw new TypeError(`${prefix}.hls.offsetTimestampsByDateTime, when provided, must be a boolean.`);
    }
  }
};

// node_modules/mediabunny/dist/modules/src/media-sink.js
var validatePacketRetrievalOptions = (options) => {
  if (!options || typeof options !== "object") {
    throw new TypeError("options must be an object.");
  }
  if (options.metadataOnly !== void 0 && typeof options.metadataOnly !== "boolean") {
    throw new TypeError("options.metadataOnly, when defined, must be a boolean.");
  }
  if (options.verifyKeyPackets !== void 0 && typeof options.verifyKeyPackets !== "boolean") {
    throw new TypeError("options.verifyKeyPackets, when defined, must be a boolean.");
  }
  if (options.verifyKeyPackets && options.metadataOnly) {
    throw new TypeError("options.verifyKeyPackets and options.metadataOnly cannot be enabled together.");
  }
  if (options.skipLiveWait !== void 0 && typeof options.skipLiveWait !== "boolean") {
    throw new TypeError("options.skipLiveWait, when defined, must be a boolean.");
  }
};
var validateTimestamp = (timestamp) => {
  if (!isNumber(timestamp)) {
    throw new TypeError("timestamp must be a number.");
  }
};
var maybeFixPacketType = (track, promise, options) => {
  if (options.verifyKeyPackets) {
    return promise.then(async (packet) => {
      if (!packet || packet.type === "delta") {
        return packet;
      }
      const determinedType = await track.determinePacketType(packet);
      if (determinedType) {
        packet.type = determinedType;
      }
      return packet;
    });
  } else {
    return promise;
  }
};
var EncodedPacketSink = class {
  /** Creates a new {@link EncodedPacketSink} for the given {@link InputTrack}. */
  constructor(track) {
    if (!(track instanceof InputTrack)) {
      throw new TypeError("track must be an InputTrack.");
    }
    this._track = track;
  }
  /**
   * Retrieves the track's first packet (in decode order), or null if it has no packets. The first packet is very
   * likely to be a key packet, but it doesn't have to be.
   */
  async getFirstPacket(options = {}) {
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    return maybeFixPacketType(this._track, this._track._backing.getFirstPacket(options), options);
  }
  /** Retrieves the track's first key packet (in decode order), or null if it has no key packets. */
  async getFirstKeyPacket(options = {}) {
    validatePacketRetrievalOptions(options);
    const firstPacket = await this.getFirstPacket(options);
    if (!firstPacket) {
      return null;
    }
    if (firstPacket.type === "key") {
      return firstPacket;
    }
    return this.getNextKeyPacket(firstPacket, options);
  }
  /**
   * Retrieves the packet corresponding to the given timestamp, in seconds. More specifically, returns the last packet
   * (in presentation order) with a start timestamp less than or equal to the given timestamp. This method can be
   * used to retrieve a track's last packet using `getPacket(Infinity)`. The method returns null if the timestamp
   * is before the first packet in the track.
   *
   * @param timestamp - The timestamp used for retrieval, in seconds.
   */
  async getPacket(timestamp, options = {}) {
    validateTimestamp(timestamp);
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    return maybeFixPacketType(this._track, this._track._backing.getPacket(timestamp, options), options);
  }
  /**
   * Retrieves the packet following the given packet (in decode order), or null if the given packet is the
   * last packet.
   */
  async getNextPacket(packet, options = {}) {
    if (!(packet instanceof EncodedPacket)) {
      throw new TypeError("packet must be an EncodedPacket.");
    }
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    return maybeFixPacketType(this._track, this._track._backing.getNextPacket(packet, options), options);
  }
  /**
   * Retrieves the key packet corresponding to the given timestamp, in seconds. More specifically, returns the last
   * key packet (in presentation order) with a start timestamp less than or equal to the given timestamp. A key packet
   * is a packet that doesn't require previous packets to be decoded. This method can be used to retrieve a track's
   * last key packet using `getKeyPacket(Infinity)`. The method returns null if the timestamp is before the first
   * key packet in the track.
   *
   * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
   *
   * @param timestamp - The timestamp used for retrieval, in seconds.
   */
  async getKeyPacket(timestamp, options = {}) {
    validateTimestamp(timestamp);
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    if (!options.verifyKeyPackets) {
      return this._track._backing.getKeyPacket(timestamp, options);
    }
    let packet = await this._track._backing.getKeyPacket(timestamp, options);
    while (packet) {
      assert(packet.type === "key");
      const determinedType = await this._track.determinePacketType(packet);
      if (determinedType !== "delta") {
        return packet;
      }
      let step = 1 / await this._track.getTimeResolution();
      let previousPacket;
      while (true) {
        previousPacket = await this._track._backing.getKeyPacket(packet.timestamp - step, options);
        if (!previousPacket || previousPacket.timestamp < packet.timestamp) {
          break;
        }
        step *= 2;
      }
      packet = previousPacket;
    }
    return null;
  }
  /**
   * Retrieves the key packet following the given packet (in decode order), or null if the given packet is the last
   * key packet.
   *
   * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
   */
  async getNextKeyPacket(packet, options = {}) {
    if (!(packet instanceof EncodedPacket)) {
      throw new TypeError("packet must be an EncodedPacket.");
    }
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    if (!options.verifyKeyPackets) {
      return this._track._backing.getNextKeyPacket(packet, options);
    }
    let nextPacket = await this._track._backing.getNextKeyPacket(packet, options);
    while (nextPacket) {
      assert(nextPacket.type === "key");
      const determinedType = await this._track.determinePacketType(nextPacket);
      if (determinedType !== "delta") {
        return nextPacket;
      }
      nextPacket = await this._track._backing.getNextKeyPacket(nextPacket, options);
    }
    return null;
  }
  /**
   * Creates an async iterator that yields the packets in this track in decode order. To enable fast iteration, this
   * method will intelligently preload packets based on the speed of the consumer.
   *
   * @param startPacket - (optional) The packet from which iteration should begin. This packet will also be yielded.
   * @param endPacket - (optional) The packet at which iteration should end. This packet will _not_ be yielded.
   */
  packets(startPacket, endPacket, options = {}) {
    if (startPacket !== void 0 && !(startPacket instanceof EncodedPacket)) {
      throw new TypeError("startPacket must be an EncodedPacket.");
    }
    if (startPacket !== void 0 && startPacket.isMetadataOnly && !options?.metadataOnly) {
      throw new TypeError("startPacket can only be metadata-only if options.metadataOnly is enabled.");
    }
    if (endPacket !== void 0 && !(endPacket instanceof EncodedPacket)) {
      throw new TypeError("endPacket must be an EncodedPacket.");
    }
    validatePacketRetrievalOptions(options);
    if (this._track.input._disposed) {
      throw new InputDisposedError();
    }
    const packetQueue = [];
    let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
    let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
    let ended = false;
    let terminated = false;
    let outOfBandError = null;
    let hasOutOfBandError = false;
    const timestamps = [];
    const maxQueueSize = () => Math.max(2, timestamps.length);
    (async () => {
      let packet = startPacket ?? await this.getFirstPacket(options);
      while (packet && !terminated && !this._track.input._disposed) {
        if (endPacket && packet.sequenceNumber >= endPacket?.sequenceNumber) {
          break;
        }
        if (packetQueue.length > maxQueueSize()) {
          ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
          await queueDequeue;
          continue;
        }
        packetQueue.push(packet);
        onQueueNotEmpty();
        ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
        packet = await this.getNextPacket(packet, options);
      }
      ended = true;
      onQueueNotEmpty();
    })().catch((error) => {
      if (!hasOutOfBandError) {
        outOfBandError = error;
        hasOutOfBandError = true;
        onQueueNotEmpty();
      }
    });
    const track = this._track;
    return {
      async next() {
        while (true) {
          if (track.input._disposed) {
            throw new InputDisposedError();
          } else if (terminated) {
            return { value: void 0, done: true };
          } else if (hasOutOfBandError) {
            throw outOfBandError;
          } else if (packetQueue.length > 0) {
            const value = packetQueue.shift();
            const now = performance.now();
            timestamps.push(now);
            while (timestamps.length > 0 && now - timestamps[0] >= 1e3) {
              timestamps.shift();
            }
            onQueueDequeue();
            return { value, done: false };
          } else if (ended) {
            return { value: void 0, done: true };
          } else {
            await queueNotEmpty;
          }
        }
      },
      async return() {
        terminated = true;
        onQueueDequeue();
        onQueueNotEmpty();
        return { value: void 0, done: true };
      },
      async throw(error) {
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
};
var MAX_QUEUE_SIZE = 4;
var DecoderWrapper = class {
  constructor(onSample, onError) {
    this.onSample = onSample;
    this.onError = onError;
    this.onDequeue = null;
  }
};
var BaseMediaSampleSink = class {
  /** @internal */
  mediaSamplesInRange(startTimestamp = -Infinity, endTimestamp = Infinity, options) {
    validateTimestamp(startTimestamp);
    validateTimestamp(endTimestamp);
    const sampleQueue = [];
    let firstSampleQueued = false;
    let lastSample = null;
    let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
    let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
    let decoderIsFlushed = false;
    let ended = false;
    let terminated = false;
    let decoder = null;
    let outOfBandError = null;
    let hasOutOfBandError = false;
    const packetRetrievalOptions = {
      ...options,
      verifyKeyPackets: true,
      metadataOnly: false
    };
    (async () => {
      decoder = await this._createDecoder((sample) => {
        onQueueDequeue();
        if (sample.timestamp >= endTimestamp) {
          ended = true;
        }
        if (ended) {
          sample.close();
          return;
        }
        if (lastSample) {
          if (sample.timestamp > startTimestamp) {
            sampleQueue.push(lastSample);
            firstSampleQueued = true;
          } else {
            lastSample.close();
          }
        }
        if (sample.timestamp >= startTimestamp) {
          sampleQueue.push(sample);
          firstSampleQueued = true;
        }
        lastSample = firstSampleQueued ? null : sample;
        if (sampleQueue.length > 0) {
          onQueueNotEmpty();
          ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
        }
      }, (error) => {
        if (!hasOutOfBandError) {
          outOfBandError = error;
          hasOutOfBandError = true;
          onQueueNotEmpty();
        }
      });
      decoder.onDequeue = () => onQueueDequeue();
      const packetSink = this._createPacketSink();
      const preRollDuration = await this._getPreRollDuration();
      const startPacket = await packetSink.getPacket(startTimestamp, packetRetrievalOptions);
      const keyPacket = await packetSink.getKeyPacket((startPacket?.timestamp ?? startTimestamp) - preRollDuration, packetRetrievalOptions) ?? await packetSink.getFirstKeyPacket(packetRetrievalOptions);
      let currentPacket = keyPacket;
      const endPacket = void 0;
      const packets = packetSink.packets(keyPacket ?? void 0, endPacket, packetRetrievalOptions);
      await packets.next();
      while (currentPacket && !ended && !this._track.input._disposed) {
        if (sampleQueue.length + decoder.getDecodeQueueSize() >= MAX_QUEUE_SIZE) {
          ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
          await queueDequeue;
          continue;
        }
        decoder.decode(currentPacket);
        const packetResult = await packets.next();
        if (packetResult.done) {
          break;
        }
        currentPacket = packetResult.value;
      }
      await packets.return();
      if (!terminated && !this._track.input._disposed) {
        await decoder.flush();
      }
      if (!firstSampleQueued && lastSample) {
        sampleQueue.push(lastSample);
        lastSample = null;
      }
      decoderIsFlushed = true;
      onQueueNotEmpty();
    })().catch((error) => {
      if (!hasOutOfBandError) {
        outOfBandError = error;
        hasOutOfBandError = true;
        onQueueNotEmpty();
      }
    }).finally(() => {
      decoder?.close();
    });
    const track = this._track;
    const closeSamples = () => {
      lastSample?.close();
      for (const sample of sampleQueue) {
        sample.close();
      }
    };
    return {
      async next() {
        while (true) {
          if (track.input._disposed) {
            terminated = true;
            ended = true;
            onQueueDequeue();
            closeSamples();
            throw new InputDisposedError();
          } else if (terminated) {
            return { value: void 0, done: true };
          } else if (hasOutOfBandError) {
            terminated = true;
            ended = true;
            onQueueDequeue();
            closeSamples();
            throw outOfBandError;
          } else if (sampleQueue.length > 0) {
            const value = sampleQueue.shift();
            onQueueDequeue();
            return { value, done: false };
          } else if (!decoderIsFlushed) {
            await queueNotEmpty;
          } else {
            return { value: void 0, done: true };
          }
        }
      },
      async return() {
        terminated = true;
        ended = true;
        onQueueDequeue();
        onQueueNotEmpty();
        closeSamples();
        return { value: void 0, done: true };
      },
      async throw(error) {
        await this.return();
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  /** @internal */
  mediaSamplesAtTimestamps(timestamps, options) {
    validateAnyIterable(timestamps);
    const timestampIterator = toAsyncIterator(timestamps);
    const timestampsOfInterest = [];
    const sampleQueue = [];
    let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
    let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
    let decoderIsFlushed = false;
    let terminated = false;
    const { promise: terminatedPromise, resolve: onTerminated } = promiseWithResolvers();
    let decoder = null;
    let outOfBandError = null;
    let hasOutOfBandError = false;
    const pushToQueue = (sample) => {
      sampleQueue.push(sample);
      onQueueNotEmpty();
      ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
    };
    let heldSample = null;
    const emitHeldSample = (count) => {
      for (let i = 0; i < count; i++) {
        pushToQueue(heldSample && (i < count - 1 ? heldSample.clone() : heldSample));
      }
      if (count === 0) {
        heldSample?.close();
      }
      heldSample = null;
    };
    const retrievalOptions = {
      ...options,
      verifyKeyPackets: true,
      metadataOnly: false
    };
    (async () => {
      decoder = await this._createDecoder((sample) => {
        onQueueDequeue();
        if (terminated) {
          sample.close();
          return;
        }
        let heldSampleUses = 0;
        while (timestampsOfInterest.length > 0 && sample.timestamp - timestampsOfInterest[0] > 1e-10) {
          heldSampleUses++;
          timestampsOfInterest.shift();
        }
        emitHeldSample(heldSampleUses);
        heldSample = sample;
      }, (error) => {
        if (!hasOutOfBandError) {
          outOfBandError = error;
          hasOutOfBandError = true;
          onQueueNotEmpty();
        }
      });
      decoder.onDequeue = () => onQueueDequeue();
      const packetSink = this._createPacketSink();
      const preRollDuration = await this._getPreRollDuration();
      let lastPacket = null;
      let lastTimestamp = -Infinity;
      let lastKeyPacket = null;
      let lastDecodedPacket = null;
      let maxSequenceNumber = -1;
      const decodePackets = async () => {
        assert(lastKeyPacket);
        assert(decoder);
        let currentPacket = lastDecodedPacket;
        if (!currentPacket) {
          currentPacket = lastKeyPacket;
          decoder.decode(currentPacket);
        }
        while (currentPacket.sequenceNumber < maxSequenceNumber) {
          while (sampleQueue.length + decoder.getDecodeQueueSize() >= MAX_QUEUE_SIZE && !terminated) {
            ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
            await queueDequeue;
          }
          if (terminated) {
            break;
          }
          const nextPacket = await packetSink.getNextPacket(currentPacket, retrievalOptions);
          if (!nextPacket) {
            throw new Error("Internal error: couldn't get next packet when one was expected.");
          }
          decoder.decode(nextPacket);
          currentPacket = nextPacket;
        }
        lastDecodedPacket = currentPacket;
      };
      const flushDecoder = async () => {
        assert(decoder);
        await decoder.flush();
        emitHeldSample(timestampsOfInterest.length);
        timestampsOfInterest.length = 0;
      };
      try {
        while (true) {
          const nextTimestamp = timestampIterator.next();
          nextTimestamp.catch(() => {
          });
          const result = await Promise.race([nextTimestamp, terminatedPromise]);
          if (!result || result.done) {
            break;
          }
          const timestamp = result.value;
          validateTimestamp(timestamp);
          if (terminated || this._track.input._disposed) {
            break;
          }
          const targetPacket = await packetSink.getPacket(timestamp, retrievalOptions);
          let keyPacket = targetPacket && await packetSink.getKeyPacket(targetPacket.timestamp - preRollDuration, retrievalOptions);
          if (targetPacket && !keyPacket) {
            const firstKeyPacket = await packetSink.getFirstKeyPacket(retrievalOptions);
            if (firstKeyPacket && firstKeyPacket.timestamp <= targetPacket.timestamp) {
              keyPacket = firstKeyPacket;
            }
          }
          if (!targetPacket || !keyPacket) {
            if (lastPacket) {
              await flushDecoder();
            }
            pushToQueue(null);
            lastPacket = null;
            continue;
          }
          if (!lastPacket || keyPacket.sequenceNumber > maxSequenceNumber + 1 || timestamp < lastTimestamp) {
            if (lastPacket) {
              await flushDecoder();
            }
            lastKeyPacket = keyPacket;
            lastDecodedPacket = null;
            maxSequenceNumber = -1;
          }
          timestampsOfInterest.push(timestamp);
          maxSequenceNumber = Math.max(targetPacket.sequenceNumber, maxSequenceNumber);
          lastPacket = targetPacket;
          lastTimestamp = timestamp;
          await decodePackets();
        }
      } finally {
        timestampIterator.return().catch(() => {
        });
      }
      if (!terminated && !this._track.input._disposed) {
        await flushDecoder();
      }
      decoderIsFlushed = true;
      onQueueNotEmpty();
    })().catch((error) => {
      if (!hasOutOfBandError) {
        outOfBandError = error;
        hasOutOfBandError = true;
        onQueueNotEmpty();
      }
    }).finally(() => {
      decoder?.close();
    });
    const track = this._track;
    const closeSamples = () => {
      heldSample?.close();
      heldSample = null;
      for (const sample of sampleQueue) {
        sample?.close();
      }
    };
    return {
      async next() {
        while (true) {
          if (track.input._disposed) {
            terminated = true;
            onTerminated();
            onQueueDequeue();
            closeSamples();
            throw new InputDisposedError();
          } else if (terminated) {
            return { value: void 0, done: true };
          } else if (hasOutOfBandError) {
            terminated = true;
            onTerminated();
            onQueueDequeue();
            closeSamples();
            throw outOfBandError;
          } else if (sampleQueue.length > 0) {
            const value = sampleQueue.shift();
            assert(value !== void 0);
            onQueueDequeue();
            return { value, done: false };
          } else if (!decoderIsFlushed) {
            await queueNotEmpty;
          } else {
            return { value: void 0, done: true };
          }
        }
      },
      async return() {
        terminated = true;
        onTerminated();
        onQueueDequeue();
        onQueueNotEmpty();
        closeSamples();
        return { value: void 0, done: true };
      },
      async throw(error) {
        await this.return();
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
};
var VideoDecoderWrapper = class extends DecoderWrapper {
  constructor(onSample, onError, codec, decoderConfig, rotation, flip, timeResolution) {
    super(onSample, onError);
    this.codec = codec;
    this.decoderConfig = decoderConfig;
    this.rotation = rotation;
    this.flip = flip;
    this.timeResolution = timeResolution;
    this.decoder = null;
    this.customDecoder = null;
    this.customDecoderCallSerializer = new CallSerializer();
    this.customDecoderQueueSize = 0;
    this.inputTimestamps = [];
    this.sampleQueue = [];
    this.currentPacketIndex = 0;
    this.raslSkipped = false;
    this.alphaDecoder = null;
    this.alphaHadKeyframe = false;
    this.colorQueue = [];
    this.alphaQueue = [];
    this.merger = null;
    this.decodedAlphaChunkCount = 0;
    this.alphaDecoderQueueSize = 0;
    this.nullAlphaFrameQueue = [];
    this.currentAlphaPacketIndex = 0;
    this.alphaRaslSkipped = false;
    this.finalSamples = [];
    this.mergeAlphaPromises = [];
    this.flushing = false;
    this.frameCopyContext = null;
    const MatchingCustomDecoder = customVideoDecoders.find((x) => x.supports(codec, decoderConfig));
    if (MatchingCustomDecoder) {
      this.customDecoder = new MatchingCustomDecoder();
      this.customDecoder.codec = codec;
      this.customDecoder.config = decoderConfig;
      this.customDecoder.onSample = (sample) => {
        if (!(sample instanceof VideoSample)) {
          throw new TypeError("The argument passed to onSample must be a VideoSample.");
        }
        this.finalizeAndEmitSample(sample);
      };
      this.customDecoder.onError = (error) => {
        onError(error);
      };
      void this.customDecoderCallSerializer.call(() => this.customDecoder.init()).catch((error) => onError(error));
    } else {
      const colorHandler = (frame) => {
        if (this.alphaQueue.length > 0) {
          const alphaFrame = this.alphaQueue.shift();
          assert(alphaFrame !== void 0);
          void this.mergeAlpha(frame, alphaFrame);
        } else {
          this.colorQueue.push(frame);
        }
      };
      if (isChromium()) {
        if (codec === "avc" && this.decoderConfig.description) {
          const record = deserializeAvcDecoderConfigurationRecord(toUint8Array(this.decoderConfig.description));
          if (record && record.sequenceParameterSets.length > 0) {
            const firstSps = parseAvcSps(record.sequenceParameterSets[0]);
            if (firstSps && firstSps.frameMbsOnlyFlag === 0) {
              this.decoderConfig = {
                ...this.decoderConfig,
                hardwareAcceleration: "prefer-software"
              };
            }
            let recordModified = false;
            for (let i = 0; i < record.sequenceParameterSets.length; i++) {
              const sps = parseAvcSps(record.sequenceParameterSets[i]);
              if (sps && sps.maxDecFrameBuffering !== 0 && sps.bitstreamRestrictionFlag !== 1) {
                record.sequenceParameterSets[i] = addAvcBitstreamRestriction(sps);
                recordModified = true;
              }
            }
            if (recordModified) {
              this.decoderConfig = {
                ...this.decoderConfig,
                description: serializeAvcDecoderConfigurationRecord(record)
              };
            }
          }
        }
        if (!colorSpaceIsComplete(this.decoderConfig.colorSpace)) {
          this.decoderConfig = {
            ...this.decoderConfig,
            colorSpace: {
              primaries: this.decoderConfig.colorSpace?.primaries ?? "bt709",
              matrix: this.decoderConfig.colorSpace?.matrix ?? "bt709",
              transfer: this.decoderConfig.colorSpace?.transfer ?? "bt709",
              fullRange: this.decoderConfig.colorSpace?.fullRange ?? false
            }
          };
        }
      }
      const stack = new Error("Decoding error").stack;
      this.decoder = new VideoDecoder({
        output: (frame) => {
          try {
            colorHandler(this.copyFrameIfNeeded(frame));
          } catch (error) {
            this.onError(error);
          }
        },
        error: (error) => {
          error.stack = stack;
          this.onError(error);
        }
      });
      this.decoder.addEventListener("dequeue", () => {
        this.onDequeue?.();
      });
      this.decoder.configure(this.decoderConfig);
    }
  }
  getDecodeQueueSize() {
    if (this.customDecoder) {
      return this.customDecoderQueueSize;
    } else {
      assert(this.decoder);
      return Math.max(this.decoder.decodeQueueSize, this.alphaDecoder?.decodeQueueSize ?? 0) + this.finalSamples.length;
    }
  }
  decode(packet) {
    if (this.codec === "hevc" && this.currentPacketIndex > 0 && !this.raslSkipped) {
      if (this.hasHevcRaslPicture(packet.data)) {
        return;
      }
      this.raslSkipped = true;
    }
    if (this.customDecoder) {
      this.customDecoderQueueSize++;
      void this.customDecoderCallSerializer.call(() => this.customDecoder.decode(packet)).catch((error) => this.onError(error)).finally(() => {
        this.customDecoderQueueSize--;
        this.onDequeue?.();
      });
    } else {
      assert(this.decoder);
      if (!isWebKit()) {
        const shownFrameCount = countShownVideoFrames(this.codec, packet.data);
        for (let i = 0; i < shownFrameCount; i++) {
          insertSorted(this.inputTimestamps, packet.timestamp, (x) => x);
        }
      }
      if (isChromium() && this.currentPacketIndex === 0) {
        const fixedData = this.fixFirstPacketDataForChromium(packet.data);
        if (fixedData) {
          packet = packet.clone({ data: fixedData });
        }
      }
      this.decoder.decode(packet.toEncodedVideoChunk());
      this.decodeAlphaData(packet);
    }
    this.currentPacketIndex++;
  }
  decodeAlphaData(packet) {
    if (!packet.sideData.alpha) {
      this.pushNullAlphaFrame();
      return;
    }
    if (!this.merger) {
      this.merger = new ColorAlphaMerger();
    }
    if (!this.alphaDecoder) {
      const alphaHandler = (frame) => {
        if (this.colorQueue.length > 0) {
          const colorFrame = this.colorQueue.shift();
          assert(colorFrame !== void 0);
          void this.mergeAlpha(colorFrame, frame);
        } else {
          this.alphaQueue.push(frame);
        }
        this.decodedAlphaChunkCount++;
        while (this.nullAlphaFrameQueue.length > 0 && this.nullAlphaFrameQueue[0] === this.decodedAlphaChunkCount) {
          this.nullAlphaFrameQueue.shift();
          if (this.colorQueue.length > 0) {
            const colorFrame = this.colorQueue.shift();
            assert(colorFrame !== void 0);
            void this.mergeAlpha(colorFrame, null);
          } else {
            this.alphaQueue.push(null);
          }
        }
        this.alphaDecoderQueueSize--;
      };
      const stack = new Error("Decoding error").stack;
      this.alphaDecoder = new VideoDecoder({
        output: (frame) => {
          try {
            alphaHandler(this.copyFrameIfNeeded(frame));
          } catch (error) {
            this.onError(error);
          }
        },
        error: (error) => {
          error.stack = stack;
          this.onError(error);
        }
      });
      this.alphaDecoder.addEventListener("dequeue", () => {
        this.onDequeue?.();
      });
      this.alphaDecoder.configure({
        ...this.decoderConfig,
        // Alpha is always full range, regardless of what the color track says. The decoder only honors the
        // override if all fields are set tho.
        colorSpace: {
          fullRange: true,
          // These fields are irrelevant:
          matrix: "bt709",
          primaries: "bt709",
          transfer: "bt709"
        }
      });
    }
    const type = determineVideoPacketType(this.codec, this.decoderConfig, packet.sideData.alpha);
    if (!this.alphaHadKeyframe) {
      this.alphaHadKeyframe = type === "key";
    }
    if (this.alphaHadKeyframe) {
      if (this.codec === "hevc" && this.currentAlphaPacketIndex > 0 && !this.alphaRaslSkipped) {
        if (this.hasHevcRaslPicture(packet.sideData.alpha)) {
          this.pushNullAlphaFrame();
          return;
        }
        this.alphaRaslSkipped = true;
      }
      if (isChromium() && this.currentAlphaPacketIndex === 0) {
        const fixedData = this.fixFirstPacketDataForChromium(packet.sideData.alpha);
        if (fixedData) {
          packet = packet.clone({
            sideData: {
              ...packet.sideData,
              alpha: fixedData
            }
          });
        }
      }
      this.currentAlphaPacketIndex++;
      this.alphaDecoder.decode(packet.alphaToEncodedVideoChunk(type ?? packet.type));
      this.alphaDecoderQueueSize++;
    } else {
      this.pushNullAlphaFrame();
    }
  }
  fixFirstPacketDataForChromium(data) {
    if (this.codec === "avc") {
      const filteredNalUnits = [];
      let hasFrameData = false;
      for (const loc of iterateAvcNalUnits(data, this.decoderConfig)) {
        const type = extractNalUnitTypeForAvc(data[loc.offset]);
        hasFrameData ||= type >= 1 && type <= 5;
        if (type === AvcNalUnitType.AUD) {
          if (hasFrameData) {
            break;
          } else {
            filteredNalUnits.length = 0;
          }
        }
        if (!(type >= 20 && type <= 31)) {
          filteredNalUnits.push(data.subarray(loc.offset, loc.offset + loc.length));
        }
      }
      if (!this.decoderConfig.description) {
        for (let i = 0; i < filteredNalUnits.length; i++) {
          const nalUnit = filteredNalUnits[i];
          if (extractNalUnitTypeForAvc(nalUnit[0]) !== AvcNalUnitType.SPS) {
            continue;
          }
          const sps = parseAvcSps(nalUnit);
          if (sps && sps.maxDecFrameBuffering !== 0 && sps.bitstreamRestrictionFlag !== 1) {
            filteredNalUnits[i] = addAvcBitstreamRestriction(sps);
          }
        }
      }
      return concatAvcNalUnits(filteredNalUnits, this.decoderConfig);
    } else if (this.codec === "hevc") {
      return sanitizeHevcPacketForChromium(data, this.decoderConfig);
    } else {
      return null;
    }
  }
  pushNullAlphaFrame() {
    if (this.alphaDecoderQueueSize === 0) {
      this.alphaQueue.push(null);
    } else {
      this.nullAlphaFrameQueue.push(this.decodedAlphaChunkCount + this.alphaDecoderQueueSize);
    }
  }
  /**
   * If we're using HEVC, we need to make sure to skip any RASL slices that follow a non-IDR key frame such as
   * CRA_NUT. This is because RASL slices cannot be decoded without data before the CRA_NUT. Browsers behave
   * differently here: Chromium drops the packets, Safari throws a decoder error. Either way, it's not good
   * and causes bugs upstream. So, let's take the dropping into our own hands.
   */
  hasHevcRaslPicture(packetData) {
    for (const loc of iterateHevcNalUnits(packetData, this.decoderConfig)) {
      const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
      if (type === HevcNalUnitType.RASL_N || type === HevcNalUnitType.RASL_R) {
        return true;
      }
    }
    return false;
  }
  /** Handler for the WebCodecs VideoDecoder for ironing out browser differences. */
  sampleHandler(sample) {
    if (isWebKit()) {
      if (this.sampleQueue.length > 0 && sample.timestamp >= last(this.sampleQueue).timestamp) {
        for (const sample2 of this.sampleQueue) {
          this.finalizeAndEmitSample(sample2);
        }
        this.sampleQueue.length = 0;
      }
      insertSorted(this.sampleQueue, sample, (x) => x.timestamp);
    } else {
      const timestamp = this.inputTimestamps.shift();
      assert(timestamp !== void 0);
      sample.setTimestamp(timestamp);
      this.finalizeAndEmitSample(sample);
    }
  }
  finalizeAndEmitSample(sample) {
    sample.setTimestamp(Math.round(sample.timestamp * this.timeResolution) / this.timeResolution);
    sample.setDuration(Math.round(sample.duration * this.timeResolution) / this.timeResolution);
    sample.setRotation(this.rotation);
    sample.setFlip(this.flip);
    this.onSample(sample);
  }
  async mergeAlpha(color, alpha) {
    const resolver = promiseWithResolvers();
    this.mergeAlphaPromises.push(resolver.promise);
    const result = { sample: null };
    this.finalSamples.push(result);
    try {
      if (!alpha) {
        result.sample = new VideoSample(color);
      } else {
        assert(this.merger);
        const finalFrame = await this.merger.merge(color, alpha);
        result.sample = new VideoSample(finalFrame);
      }
      while (this.finalSamples.length > 0 && this.finalSamples[0].sample !== null) {
        const next = this.finalSamples.shift();
        this.sampleHandler(next.sample);
      }
    } catch (error) {
      removeItem(this.finalSamples, result);
      while (this.finalSamples.length > 0 && this.finalSamples[0].sample !== null) {
        this.finalSamples.shift().sample.close();
      }
      this.onError(error);
    } finally {
      removeItem(this.mergeAlphaPromises, resolver.promise);
      resolver.resolve();
    }
  }
  /**
   * This is a workaround for https://issues.chromium.org/issues/579043455. It circumvents the problem by instantly
   * drawing a frame to a new region of GPU memory (a canvas), which we know for certain won't get fucked up by
   * other draws.
   * Also see: https://github.com/Vanilagy/mediabunny/issues/573
   */
  copyFrameIfNeeded(frame) {
    if (!isChromium() || !isAndroid()) {
      return frame;
    }
    const visibleRect = frame.visibleRect;
    const width = visibleRect.width;
    const height = visibleRect.height;
    if (!this.frameCopyContext) {
      let context;
      if (typeof OffscreenCanvas !== "undefined") {
        context = new OffscreenCanvas(width, height).getContext("2d", { alpha: false });
      } else {
        context = document.createElement("canvas").getContext("2d", { alpha: false });
      }
      if (!context) {
        throw new Error("The '2d' canvas context is required to decode video on Chromium for Android.");
      }
      this.frameCopyContext = context;
    }
    const canvas = this.frameCopyContext.canvas;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    this.frameCopyContext.drawImage(frame, 0, 0, width, height);
    if (this.flushing) {
      this.frameCopyContext.getImageData(0, 0, 1, 1);
    }
    const copy = new VideoFrame(canvas, {
      timestamp: frame.timestamp,
      duration: frame.duration ?? void 0,
      displayWidth: frame.displayWidth,
      displayHeight: frame.displayHeight
    });
    frame.close();
    return copy;
  }
  async flush() {
    if (this.customDecoder) {
      await this.customDecoderCallSerializer.call(() => this.customDecoder.flush());
    } else {
      assert(this.decoder);
      this.flushing = true;
      await Promise.all([
        this.decoder.flush(),
        this.alphaDecoder?.flush()
      ]);
      this.flushing = false;
      await Promise.all(this.mergeAlphaPromises);
      this.inputTimestamps.length = 0;
      this.colorQueue.forEach((x) => x.close());
      this.colorQueue.length = 0;
      this.alphaQueue.forEach((x) => x?.close());
      this.alphaQueue.length = 0;
      this.alphaHadKeyframe = false;
      this.decodedAlphaChunkCount = 0;
      this.alphaDecoderQueueSize = 0;
      this.nullAlphaFrameQueue.length = 0;
      this.currentAlphaPacketIndex = 0;
      this.alphaRaslSkipped = false;
    }
    if (isWebKit()) {
      for (const sample of this.sampleQueue) {
        this.finalizeAndEmitSample(sample);
      }
      this.sampleQueue.length = 0;
    }
    this.currentPacketIndex = 0;
    this.raslSkipped = false;
  }
  close() {
    if (this.customDecoder) {
      void this.customDecoderCallSerializer.call(() => this.customDecoder.close()).catch((error) => this.onError(error));
    } else {
      assert(this.decoder);
      if (this.decoder.state !== "closed") {
        this.decoder.close();
      }
      if (this.alphaDecoder && this.alphaDecoder.state !== "closed") {
        this.alphaDecoder.close();
      }
      this.colorQueue.forEach((x) => x.close());
      this.colorQueue.length = 0;
      this.alphaQueue.forEach((x) => x?.close());
      this.alphaQueue.length = 0;
      this.merger?.close();
    }
    for (const sample of this.sampleQueue) {
      sample.close();
    }
    this.sampleQueue.length = 0;
  }
};
var mergerWorkerUrl = null;
var ColorAlphaMerger = class {
  constructor() {
    this.workers = [];
    this.nextWorkerIndex = 0;
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.nextRequestId = 0;
  }
  merge(color, alpha) {
    if (this.workers.length === 0) {
      if (!mergerWorkerUrl) {
        const blob = new Blob([`(${colorAlphaMergerWorkerCode.toString()})()`], { type: "application/javascript" });
        mergerWorkerUrl = URL.createObjectURL(blob);
      }
      const poolSize = clamp(navigator.hardwareConcurrency, 1, 4);
      for (let i = 0; i < poolSize; i++) {
        const worker2 = new Worker(mergerWorkerUrl);
        worker2.addEventListener("message", (event) => {
          const data = event.data;
          const pending2 = this.pendingRequests.get(data.id);
          if (!pending2) {
            if ("frame" in data) {
              data.frame.close();
            }
            return;
          }
          this.pendingRequests.delete(data.id);
          if ("error" in data) {
            pending2.reject(new Error(data.error));
          } else {
            pending2.resolve(data.frame);
          }
        });
        worker2.addEventListener("error", (event) => {
          const error = new Error(event.message || "Color/alpha merge worker error.");
          for (const pending2 of this.pendingRequests.values()) {
            pending2.reject(error);
          }
          this.pendingRequests.clear();
        });
        this.workers.push(worker2);
      }
    }
    const id = this.nextRequestId++;
    const pending = promiseWithResolvers();
    this.pendingRequests.set(id, pending);
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    worker.postMessage({ id, color, alpha }, { transfer: [color, alpha] });
    return pending.promise;
  }
  close() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
    const error = new Error("Color/alpha merger closed.");
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
};
var colorAlphaMergerWorkerCode = () => {
  let cpuAlphaBuffer = null;
  let cpuColorBuffer = null;
  let chain = Promise.resolve();
  self.addEventListener("message", (event) => {
    const { id, color, alpha } = event.data;
    chain = chain.then(async () => {
      try {
        const frame = await merge(color, alpha);
        self.postMessage({ id, frame }, { transfer: [frame] });
      } catch (error) {
        self.postMessage({ id, error: error.message });
      } finally {
        color.close();
        alpha.close();
      }
    });
  });
  const merge = async (color, alpha) => {
    const format = color.format;
    const alphaFormat = alpha.format;
    if (!format || !alphaFormat) {
      throw new Error("CPU color/alpha merging requires a known VideoFrame format.");
    }
    const colorIs10 = format.includes("P10");
    const colorIs12 = format.includes("P12");
    const alphaIs10 = alphaFormat.includes("P10");
    const alphaIs12 = alphaFormat.includes("P12");
    if (alphaIs10 !== colorIs10 || alphaIs12 !== colorIs12) {
      throw new Error(`CPU color/alpha merging requires the alpha frame to have the same bit depth as the color frame (color: '${format}', alpha: '${alphaFormat}').`);
    }
    if (format === "RGBX" || format === "RGBA" || format === "BGRX" || format === "BGRA") {
      return await mergeInterleavedRgba(color, alpha, format);
    } else if (format === "I420" || format === "I420P10" || format === "I420P12" || format === "I422" || format === "I422P10" || format === "I422P12" || format === "I444" || format === "I444P10" || format === "I444P12") {
      return await mergePlanarYuv(color, alpha, format);
    } else if (format === "NV12") {
      return await mergeNv12(color, alpha);
    }
    throw new Error(`CPU color/alpha merging does not support format '${format}'.`);
  };
  const mergeInterleavedRgba = async (color, alpha, format) => {
    const width = color.visibleRect?.width ?? color.codedWidth;
    const height = color.visibleRect?.height ?? color.codedHeight;
    const pixelCount = width * height;
    const output = new Uint8Array(pixelCount * 4);
    await color.copyTo(output);
    const alphaY = await readAlpha(alpha, width, height, 1);
    for (let i = 0, j = 3; i < pixelCount; i++, j += 4) {
      output[j] = alphaY[i];
    }
    const outputFormat = format === "RGBX" || format === "RGBA" ? "RGBA" : "BGRA";
    const init = {
      format: outputFormat,
      codedWidth: width,
      codedHeight: height,
      displayWidth: color.displayWidth,
      displayHeight: color.displayHeight,
      colorSpace: color.colorSpace.toJSON(),
      timestamp: color.timestamp,
      duration: color.duration ?? void 0,
      transfer: [output.buffer]
    };
    return new VideoFrame(output, init);
  };
  const mergePlanarYuv = async (color, alpha, format) => {
    const width = color.visibleRect?.width ?? color.codedWidth;
    const height = color.visibleRect?.height ?? color.codedHeight;
    const is10 = format.includes("P10");
    const is12 = format.includes("P12");
    const bytesPerSample = is10 || is12 ? 2 : 1;
    let chromaW;
    let chromaH;
    if (format.startsWith("I420")) {
      chromaW = Math.ceil(width / 2);
      chromaH = Math.ceil(height / 2);
    } else if (format.startsWith("I422")) {
      chromaW = Math.ceil(width / 2);
      chromaH = height;
    } else {
      chromaW = width;
      chromaH = height;
    }
    const ySamples = width * height;
    const uvSamples = chromaW * chromaH;
    const yBytes = ySamples * bytesPerSample;
    const uvBytes = uvSamples * bytesPerSample;
    const aBytes = ySamples * bytesPerSample;
    const outputBytes = yBytes + 2 * uvBytes + aBytes;
    const output = new Uint8Array(outputBytes);
    await color.copyTo(output);
    const alphaY = await readAlpha(alpha, width, height, bytesPerSample);
    const aOffset = yBytes + 2 * uvBytes;
    output.set(alphaY, aOffset);
    const outputFormat = format.slice(0, 4) + "A" + format.slice(4);
    const init = {
      format: outputFormat,
      codedWidth: width,
      codedHeight: height,
      displayWidth: color.displayWidth,
      displayHeight: color.displayHeight,
      colorSpace: color.colorSpace.toJSON(),
      timestamp: color.timestamp,
      duration: color.duration ?? void 0,
      transfer: [output.buffer]
    };
    return new VideoFrame(output, init);
  };
  const mergeNv12 = async (color, alpha) => {
    const width = color.visibleRect?.width ?? color.codedWidth;
    const height = color.visibleRect?.height ?? color.codedHeight;
    const ySize = width * height;
    const chromaW = Math.ceil(width / 2);
    const chromaH = Math.ceil(height / 2);
    const uvSize = chromaW * chromaH;
    const sourceSize = color.allocationSize();
    if (!cpuColorBuffer || cpuColorBuffer.byteLength !== sourceSize) {
      cpuColorBuffer = new Uint8Array(sourceSize);
    }
    await color.copyTo(cpuColorBuffer);
    const output = new Uint8Array(ySize + 2 * uvSize + ySize);
    output.set(cpuColorBuffer.subarray(0, ySize), 0);
    const uOffset = ySize;
    const vOffset = ySize + uvSize;
    const uvStart = ySize;
    for (let i = 0; i < uvSize; i++) {
      output[uOffset + i] = cpuColorBuffer[uvStart + i * 2];
      output[vOffset + i] = cpuColorBuffer[uvStart + i * 2 + 1];
    }
    const alphaY = await readAlpha(alpha, width, height, 1);
    output.set(alphaY, ySize + 2 * uvSize);
    const init = {
      format: "I420A",
      codedWidth: width,
      codedHeight: height,
      displayWidth: color.displayWidth,
      displayHeight: color.displayHeight,
      colorSpace: color.colorSpace.toJSON(),
      timestamp: color.timestamp,
      duration: color.duration ?? void 0,
      transfer: [output.buffer]
    };
    return new VideoFrame(output, init);
  };
  const readAlpha = async (alpha, width, height, bytesPerSample) => {
    const size = alpha.allocationSize();
    if (!cpuAlphaBuffer || cpuAlphaBuffer.byteLength !== size) {
      cpuAlphaBuffer = new Uint8Array(size);
    }
    await alpha.copyTo(cpuAlphaBuffer);
    const format = alpha.format;
    if (format === "RGBA" || format === "BGRA" || format === "RGBX" || format === "BGRX") {
      const rOffset = format === "RGBA" || format === "RGBX" ? 0 : 2;
      const pixelCount = width * height;
      for (let i = 0; i < pixelCount; i++) {
        cpuAlphaBuffer[i] = cpuAlphaBuffer[i * 4 + rOffset];
      }
      return cpuAlphaBuffer.subarray(0, pixelCount);
    } else {
      const yPlane = cpuAlphaBuffer.subarray(0, width * height * bytesPerSample);
      if (alpha.colorSpace.fullRange === false) {
        const bitDepth = format.includes("P12") ? 12 : format.includes("P10") ? 10 : 8;
        const low = 16 << bitDepth - 8;
        const high = 235 << bitDepth - 8;
        const max = (1 << bitDepth) - 1;
        const samples = bytesPerSample === 2 ? new Uint16Array(yPlane.buffer, 0, width * height) : yPlane;
        for (let i = 0; i < samples.length; i++) {
          const value = Math.round((samples[i] - low) * max / (high - low));
          samples[i] = Math.min(Math.max(value, 0), max);
        }
      }
      return yPlane;
    }
  };
};
var validateVideoSinkDecoderOptions = (decoderOptions) => {
  if (!decoderOptions || typeof decoderOptions !== "object") {
    throw new TypeError("decoderOptions must be an object.");
  }
  if (decoderOptions.hardwareAcceleration !== void 0 && !["no-preference", "prefer-hardware", "prefer-software"].includes(decoderOptions.hardwareAcceleration)) {
    throw new TypeError("decoderOptions.hardwareAcceleration, when provided, must be 'no-preference', 'prefer-hardware' or 'prefer-software'.");
  }
  if (decoderOptions.optimizeForLatency !== void 0 && typeof decoderOptions.optimizeForLatency !== "boolean") {
    throw new TypeError("decoderOptions.optimizeForLatency, when provided, must be a boolean.");
  }
};
var VideoSampleSink = class extends BaseMediaSampleSink {
  /** Creates a new {@link VideoSampleSink} for the given {@link InputVideoTrack}. */
  constructor(videoTrack, decoderOptions = {}) {
    if (!(videoTrack instanceof InputVideoTrack)) {
      throw new TypeError("videoTrack must be an InputVideoTrack.");
    }
    validateVideoSinkDecoderOptions(decoderOptions);
    super();
    this._track = videoTrack;
    this._decoderOptions = decoderOptions;
  }
  /** @internal */
  async _createDecoder(onSample, onError) {
    if (!await this._track.canDecode()) {
      if (typeof VideoDecoder === "undefined") {
        throw new Error(missingWebCodecsClassMessage("VideoDecoder"));
      }
      throw new Error("This video track cannot be decoded in this environment. Make sure to check decodability before using a track.");
    }
    const codec = await this._track.getCodec();
    const rotation = await this._track.getRotation();
    const flip = await this._track.getFlip();
    let decoderConfig = await this._track.getDecoderConfig();
    const timeResolution = await this._track.getTimeResolution();
    assert(codec && decoderConfig);
    decoderConfig = {
      ...decoderConfig,
      hardwareAcceleration: this._decoderOptions.hardwareAcceleration,
      optimizeForLatency: this._decoderOptions.optimizeForLatency
    };
    return new VideoDecoderWrapper(onSample, onError, codec, decoderConfig, rotation, flip, timeResolution);
  }
  /** @internal */
  _createPacketSink() {
    return new EncodedPacketSink(this._track);
  }
  /** @internal */
  async _getPreRollDuration() {
    return 0;
  }
  /**
   * Retrieves the video sample (frame) corresponding to the given timestamp, in seconds. More specifically, returns
   * the last video sample (in presentation order) with a start timestamp less than or equal to the given timestamp.
   * Returns null if the timestamp is before the track's first timestamp.
   *
   * @param timestamp - The timestamp used for retrieval, in seconds.
   * @param options - Options used for the underlying packet retrieval.
   */
  async getSample(timestamp, options = {}) {
    validateTimestamp(timestamp);
    for await (const sample of this.mediaSamplesAtTimestamps([timestamp], options)) {
      return sample;
    }
    throw new Error("Internal error: Iterator returned nothing.");
  }
  /**
   * Creates an async iterator that yields the video samples (frames) of this track in presentation order. This method
   * will intelligently pre-decode a few frames ahead to enable fast iteration.
   *
   * @param startTimestamp - The timestamp in seconds at which to start yielding samples (inclusive).
   * @param endTimestamp - The timestamp in seconds at which to stop yielding samples (exclusive).
   * @param options - Options used for the underlying packet retrieval.
   */
  samples(startTimestamp, endTimestamp, options = {}) {
    return this.mediaSamplesInRange(startTimestamp, endTimestamp, options);
  }
  /**
   * Creates an async iterator that yields a video sample (frame) for each timestamp in the argument. This method
   * uses an optimized decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most
   * once, and is therefore more efficient than manually getting the sample for every timestamp. The iterator may
   * yield null if no frame is available for a given timestamp.
   *
   * This method is good for sparse access of media data. If you want primarily sequential media access, prefer
   * {@link VideoSampleSink.samples} instead.
   *
   * @param timestamps - An iterable or async iterable of timestamps in seconds.
   * @param options - Options used for the underlying packet retrieval.
   */
  samplesAtTimestamps(timestamps, options = {}) {
    return this.mediaSamplesAtTimestamps(timestamps, options);
  }
};
var CanvasSink = class {
  /** Creates a new {@link CanvasSink} for the given {@link InputVideoTrack}. */
  constructor(videoTrack, options = {}) {
    this._rotation = 0;
    this._flip = false;
    this._initPromise = null;
    this._nextCanvasIndex = 0;
    if (!(videoTrack instanceof InputVideoTrack)) {
      throw new TypeError("videoTrack must be an InputVideoTrack.");
    }
    if (options && typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.alpha !== void 0 && typeof options.alpha !== "boolean") {
      throw new TypeError("options.alpha, when provided, must be a boolean.");
    }
    if (options.width !== void 0 && (!Number.isInteger(options.width) || options.width <= 0)) {
      throw new TypeError("options.width, when defined, must be a positive integer.");
    }
    if (options.height !== void 0 && (!Number.isInteger(options.height) || options.height <= 0)) {
      throw new TypeError("options.height, when defined, must be a positive integer.");
    }
    if (options.fit !== void 0 && !["fill", "contain", "cover"].includes(options.fit)) {
      throw new TypeError('options.fit, when provided, must be one of "fill", "contain", or "cover".');
    }
    if (options.width !== void 0 && options.height !== void 0 && options.fit === void 0) {
      throw new TypeError("When both options.width and options.height are provided, options.fit must also be provided.");
    }
    if (options.rotation !== void 0 && ![0, 90, 180, 270].includes(options.rotation)) {
      throw new TypeError("options.rotation, when provided, must be 0, 90, 180 or 270.");
    }
    if (options.flip !== void 0 && typeof options.flip !== "boolean") {
      throw new TypeError("options.flip, when provided, must be a boolean.");
    }
    if (options.crop !== void 0) {
      validateCropRectangle(options.crop, "options.");
    }
    if (options.poolSize !== void 0 && (typeof options.poolSize !== "number" || !Number.isInteger(options.poolSize) || options.poolSize < 0)) {
      throw new TypeError("poolSize must be a non-negative integer.");
    }
    if (options.decoderOptions !== void 0) {
      validateVideoSinkDecoderOptions(options.decoderOptions);
    }
    this._videoTrack = videoTrack;
    this._alpha = options.alpha ?? false;
    this._options = options;
    this._fit = options.fit ?? "fill";
    this._videoSampleSink = new VideoSampleSink(videoTrack, options.decoderOptions);
    this._canvasPool = Array.from({ length: options.poolSize ?? 0 }, () => null);
  }
  /** @internal */
  _ensureInit() {
    return this._initPromise ??= (async () => {
      const options = this._options;
      const videoTrack = this._videoTrack;
      const rotation = options.rotation ?? await videoTrack.getRotation();
      const flip = options.flip ?? await videoTrack.getFlip();
      const squarePixelWidth = await videoTrack.getSquarePixelWidth();
      const squarePixelHeight = await videoTrack.getSquarePixelHeight();
      const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [squarePixelWidth, squarePixelHeight] : [squarePixelHeight, squarePixelWidth];
      let crop = options.crop;
      if (crop) {
        crop = clampCropRectangle(crop, rotatedWidth, rotatedHeight);
      }
      let [width, height] = crop ? [crop.width, crop.height] : [rotatedWidth, rotatedHeight];
      const originalAspectRatio = width / height;
      if (options.width !== void 0 && options.height === void 0) {
        width = options.width;
        height = Math.round(width / originalAspectRatio);
      } else if (options.width === void 0 && options.height !== void 0) {
        height = options.height;
        width = Math.round(height * originalAspectRatio);
      } else if (options.width !== void 0 && options.height !== void 0) {
        width = options.width;
        height = options.height;
      }
      this._width = width;
      this._height = height;
      this._rotation = rotation;
      this._flip = flip;
      this._crop = crop;
    })();
  }
  /** @internal */
  _videoSampleToWrappedCanvas(sample) {
    const width = this._width;
    const height = this._height;
    let canvas = this._canvasPool[this._nextCanvasIndex];
    let canvasIsNew = false;
    if (!canvas) {
      if (typeof document !== "undefined") {
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
      } else {
        canvas = new OffscreenCanvas(width, height);
      }
      if (this._canvasPool.length > 0) {
        this._canvasPool[this._nextCanvasIndex] = canvas;
      }
      canvasIsNew = true;
    }
    if (this._canvasPool.length > 0) {
      this._nextCanvasIndex = (this._nextCanvasIndex + 1) % this._canvasPool.length;
    }
    const context = canvas.getContext("2d", {
      alpha: this._alpha || isFirefox()
      // Firefox has VideoFrame glitches with opaque canvases
    });
    assert(context);
    try {
      sample._drawWithFitAndMipmapping(canvas, context, {
        fit: this._fit,
        rotation: this._rotation,
        flip: this._flip,
        crop: this._crop,
        targetIsFresh: canvasIsNew,
        fillBlack: !this._alpha && isFirefox()
      });
      return {
        canvas,
        timestamp: sample.timestamp,
        duration: sample.duration
      };
    } finally {
      sample.close();
    }
  }
  /**
   * Retrieves a canvas with the video frame corresponding to the given timestamp, in seconds. More specifically,
   * returns the last video frame (in presentation order) with a start timestamp less than or equal to the given
   * timestamp. Returns null if the timestamp is before the track's first timestamp.
   *
   * @param timestamp - The timestamp used for retrieval, in seconds.
   * @param options - Options used for the underlying packet retrieval.
   */
  async getCanvas(timestamp, options) {
    validateTimestamp(timestamp);
    await this._ensureInit();
    const sample = await this._videoSampleSink.getSample(timestamp, options);
    return sample && this._videoSampleToWrappedCanvas(sample);
  }
  /**
   * Creates an async iterator that yields canvases with the video frames of this track in presentation order. This
   * method will intelligently pre-decode a few frames ahead to enable fast iteration.
   *
   * @param startTimestamp - The timestamp in seconds at which to start yielding canvases (inclusive).
   * @param endTimestamp - The timestamp in seconds at which to stop yielding canvases (exclusive).
   * @param options - Options used for the underlying packet retrieval.
   */
  async *canvases(startTimestamp, endTimestamp, options) {
    await this._ensureInit();
    yield* mapAsyncGenerator(this._videoSampleSink.samples(startTimestamp, endTimestamp, options), (sample) => this._videoSampleToWrappedCanvas(sample));
  }
  /**
   * Creates an async iterator that yields a canvas for each timestamp in the argument. This method uses an optimized
   * decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most once, and is
   * therefore more efficient than manually getting the canvas for every timestamp. The iterator may yield null if
   * no frame is available for a given timestamp.
   *
   * This method is good for sparse access of media data. If you want primarily sequential media access, prefer
   * {@link CanvasSink.canvases} instead.
   *
   * @param timestamps - An iterable or async iterable of timestamps in seconds.
   * @param options - Options used for the underlying packet retrieval.
   */
  async *canvasesAtTimestamps(timestamps, options) {
    await this._ensureInit();
    yield* mapAsyncGenerator(this._videoSampleSink.samplesAtTimestamps(timestamps, options), (sample) => sample && this._videoSampleToWrappedCanvas(sample));
  }
};

// node_modules/mediabunny/dist/modules/src/input-track.js
var InputTrack = class _InputTrack {
  /** @internal */
  constructor(input2, backing) {
    this.input = input2;
    this._backing = backing;
  }
  /** Returns true if and only if this track is a video track. */
  isVideoTrack() {
    return this instanceof InputVideoTrack;
  }
  /** Returns true if and only if this track is an audio track. */
  isAudioTrack() {
    return this instanceof InputAudioTrack;
  }
  /**
   * The unique ID of this track in the input file, which is its 1-based index in the list of tracks returned by
   * {@link Input.getTracks}.
   */
  get id() {
    const backings = this.input._trackBackingsCache;
    assert(backings);
    const index = backings.indexOf(this._backing);
    assert(index !== -1);
    return index + 1;
  }
  /**
   * The 1-based index of this track among all tracks of the same type in the input file. For example, the first
   * video track has number 1, the second video track has number 2, and so on. The index refers to the order in
   * which the tracks are returned by {@link Input.getTracks}.
   */
  get number() {
    return this._backing.getNumber();
  }
  /**
   * Returns the identifier of the codec used internally by the container. It is not homogenized by Mediabunny
   * and depends entirely on the container format.
   *
   * This method can be used to determine the codec of a track in case Mediabunny doesn't know that codec.
   *
   * - For ISOBMFF files, this resolves to the name of the Sample Description Box (e.g. `'avc1'`).
   * - For Matroska files, this resolves to the value of the `CodecID` element.
   * - For WAVE files, this resolves to the value of the format tag in the `'fmt '` chunk.
   * - For ADTS files, this resolves to the `MPEG-4 Audio Object Type`.
   * - For MPEG-TS files, this resolves to the `streamType` value from the Program Map Table.
   * - In all other cases, this resolves to `null`.
   */
  async getInternalCodecId() {
    return this._backing.getInternalCodecId();
  }
  /**
   * See {@link InputTrack.getInternalCodecId}.
   * @deprecated Use {@link InputTrack.getInternalCodecId} instead.
   */
  get internalCodecId() {
    return requireSync(this._backing.getInternalCodecId(), "internalCodecId", "getInternalCodecId");
  }
  /**
   * Returns the ISO 639-2/T language code for this track. If the language is unknown, this resolves to `'und'`
   * (undetermined).
   */
  async getLanguageCode() {
    return this._backing.getLanguageCode();
  }
  /**
   * The ISO 639-2/T language code for this track. If the language is unknown, this field is `'und'` (undetermined).
   * @deprecated Use {@link InputTrack.getLanguageCode} instead.
   */
  get languageCode() {
    return requireSync(this._backing.getLanguageCode(), "languageCode", "getLanguageCode");
  }
  /** Returns the user-defined name for this track. */
  async getName() {
    return this._backing.getName();
  }
  /**
   * A user-defined name for this track.
   * @deprecated Use {@link InputTrack.getName} instead.
   */
  get name() {
    return requireSync(this._backing.getName(), "name", "getName");
  }
  /**
   * Returns a positive number x such that all timestamps and durations of all packets of this track are
   * integer multiples of 1/x.
   */
  async getTimeResolution() {
    return this._backing.getTimeResolution();
  }
  /**
   * A positive number x such that all timestamps and durations of all packets of this track are
   * integer multiples of 1/x.
   * @deprecated Use {@link InputTrack.getTimeResolution} instead.
   */
  get timeResolution() {
    return requireSync(this._backing.getTimeResolution(), "timeResolution", "getTimeResolution");
  }
  /**
   * Returns whether the timestamps of this track are relative to the Unix epoch (January 1, 1970 00:00:00 UTC).
   * When `true`, each timestamp maps to a definitive point in time.
   */
  async isRelativeToUnixEpoch() {
    return this._backing.isRelativeToUnixEpoch();
  }
  /**
   * Returns the Unix time (in seconds since January 1, 1970 00:00:00 UTC) that the given track timestamp (in seconds)
   * maps to, or `null` if there is no such mapping. This provides a piecewise-continuous mapping from this track's
   * timestamp space into wall-clock time. Such mapping exists, for example, for HLS playlists with
   * `#EXT-X-PROGRAM-DATE-TIME` tags present.
   *
   * This mapping can be available even when {@link InputTrack.isRelativeToUnixEpoch} is `false`, for example for HLS
   * streams with program date time information but with {@link HlsInputFormatOptions.offsetTimestampsByDateTime}
   * set to `false`.
   */
  async getUnixTimeForTimestamp(timestamp) {
    return this._backing.getUnixTimeForTimestamp(timestamp);
  }
  /**
   * Whether the track's timestamps can be mapped to Unix wall clock time via
   * {@link InputTrack.getUnixTimeForTimestamp}.
   */
  async hasUnixTimeMapping() {
    return await this._backing.getUnixTimeForTimestamp(await this.getFirstTimestamp()) !== null;
  }
  /** Returns the track's disposition, i.e. information about its intended usage. */
  async getDisposition() {
    return this._backing.getDisposition();
  }
  /**
   * The track's disposition, i.e. information about its intended usage.
   * @deprecated Use {@link InputTrack.getDisposition} instead.
   */
  get disposition() {
    return requireSync(this._backing.getDisposition(), "disposition", "getDisposition");
  }
  /**
   * Returns the peak bitrate of the track in bits per second, as specified in the track's metadata. This might not
   * match the actual media data's bitrate.
   */
  async getBitrate() {
    return this._backing.getBitrate();
  }
  /**
   * Returns the average bitrate of the track in bits per second, as specified in the track's metadata. This might
   * not match the actual media data's bitrate.
   */
  async getAverageBitrate() {
    return this._backing.getAverageBitrate();
  }
  /**
   * Returns the start timestamp of the first packet of this track, in seconds. While often near zero, this value
   * may be positive or even negative. A negative starting timestamp means the track's timing has been offset. Samples
   * with a negative timestamp should not be presented.
   *
   * Returns 0 if the track has no packets. Use {@link InputTrack.getFirstTimestampOrNull} to have it
   * return `null` instead.
   */
  async getFirstTimestamp() {
    return await this.getFirstTimestampOrNull() ?? 0;
  }
  /**
   * Like {@link InputTrack.getFirstTimestamp}, but returns `null` when the track has no packets.
   */
  async getFirstTimestampOrNull() {
    const firstPacket = await this._backing.getFirstPacket({ metadataOnly: true });
    return firstPacket?.timestamp ?? null;
  }
  /**
   * Returns the end timestamp of the last packet of this track, in seconds.
   *
   * By default, when the underlying media is live, this method will only resolve once the live stream ends. If you
   * want to query the current end timestamp of the stream, set {@link PacketRetrievalOptions.skipLiveWait} to `true`
   * in the options.
   *
   * Returns 0 if the track has no packets. Use {@link InputTrack.computeDurationOrNull} to have it
   * return `null` instead.
   */
  async computeDuration(options) {
    return await this.computeDurationOrNull(options) ?? 0;
  }
  /**
   * Like {@link InputTrack.computeDuration}, but returns `null` when the track has no packets.
   */
  async computeDurationOrNull(options) {
    const lastPacket = await this._backing.getPacket(Infinity, { metadataOnly: true, ...options });
    if (!lastPacket) {
      return null;
    }
    return roundToDivisor(lastPacket.timestamp + lastPacket.duration, await this.getTimeResolution());
  }
  /**
   * Gets the duration (end timestamp) in seconds of this track from metadata stored in the file. This value may be
   * approximate or diverge from the actual, precise duration returned by `.computeDuration()`, but compared to that
   * method, this method is cheaper. When the duration cannot be determined from the file metadata, `null`
   * is returned.
   *
   * By default, when the underlying media is live, this method will only resolve once the live stream
   * ends. If you want to query the current duration of the media, set
   * {@link DurationMetadataRequestOptions.skipLiveWait} to `true` in the options.
   */
  async getDurationFromMetadata(options = {}) {
    return this._backing.getDurationFromMetadata(options);
  }
  /**
   * Computes aggregate packet statistics for this track, such as average packet rate or bitrate.
   *
   * @param targetPacketCount - This optional parameter sets a target for how many packets this method must have
   * looked at before it can return early; this means, you can use it to aggregate only a subset (prefix) of all
   * packets. This is very useful for getting a great estimate of video frame rate without having to scan through the
   * entire file.
   *
   * By default, when the underlying media is live and `targetPacketCount` is not set, this method will only resolve
   * once the live stream ends. If you want to query the current packet statistics of the stream, set
   * {@link PacketRetrievalOptions.skipLiveWait} to `true` in the options.
   */
  async computePacketStats(targetPacketCount = Infinity, options) {
    const sink2 = new EncodedPacketSink(this);
    let startTimestamp = Infinity;
    let endTimestamp = -Infinity;
    let packetCount = 0;
    let totalPacketBytes = 0;
    for await (const packet of sink2.packets(void 0, void 0, { metadataOnly: true, ...options })) {
      if (packetCount >= targetPacketCount && packet.timestamp >= endTimestamp && endTimestamp > startTimestamp) {
        break;
      }
      startTimestamp = Math.min(startTimestamp, packet.timestamp);
      endTimestamp = Math.max(endTimestamp, packet.timestamp + packet.duration);
      packetCount++;
      totalPacketBytes += packet.byteLength;
    }
    const timeSpan = endTimestamp - startTimestamp;
    return {
      packetCount,
      averagePacketRate: packetCount > 0 ? Number((packetCount / timeSpan).toPrecision(16)) : 0,
      averageBitrate: totalPacketBytes > 0 ? Number((8 * totalPacketBytes / timeSpan).toPrecision(16)) : 0
    };
  }
  /**
   * Whether or not this track is currently live, meaning the media's end is still unknown.
   *
   * The value returned by this method may change over time as the track stops being live. To keep track of the
   * track's live status, poll this method at the track's refresh interval
   * via {@link InputTrack.getLiveRefreshInterval}.
   */
  async isLive() {
    return await this._backing.getLiveRefreshInterval() !== null;
  }
  /**
   * Returns the track's live refresh interval in seconds, or `null` if the track is not live. This interval describes
   * the time it takes, on average, for new live media data to become available.
   */
  async getLiveRefreshInterval() {
    return this._backing.getLiveRefreshInterval();
  }
  /**
   * Returns `true` if this track can be paired with the given track. Two tracks being pairable means they can be
   * presented (displayed) together.
   *
   * Returns `false` if `other` equals `this`.
   */
  canBePairedWith(other) {
    if (!(other instanceof _InputTrack)) {
      throw new TypeError("other must be an InputTrack.");
    }
    if (this.input !== other.input || this === other) {
      return false;
    }
    return (this._backing.getPairingMask() & other._backing.getPairingMask()) !== 0n;
  }
  /**
   * Gets the list of other tracks that can be paired with this track. An optional query can be provided to narrow
   * down the results.
   */
  async getPairableTracks(query) {
    return this.input.getTracks(mergeInputTrackQueries({
      filter: (t) => t.canBePairedWith(this)
    }, query));
  }
  /**
   * Gets the list of other video tracks that can be paired with this track. An optional query can be provided to
   * narrow down the results.
   */
  async getPairableVideoTracks(query) {
    return this.input.getVideoTracks(mergeInputTrackQueries({
      filter: (t) => t.canBePairedWith(this)
    }, query));
  }
  /**
   * Gets the list of other audio tracks that can be paired with this track. An optional query can be provided to
   * narrow down the results.
   */
  async getPairableAudioTracks(query) {
    return this.input.getAudioTracks(mergeInputTrackQueries({
      filter: (t) => t.canBePairedWith(this)
    }, query));
  }
  /** Returns the primary track that can be paired with this track, optionally steered by the provided query. */
  async getPrimaryPairableVideoTrack(query) {
    return this.input.getPrimaryVideoTrack(mergeInputTrackQueries({
      filter: (t) => t.canBePairedWith(this)
    }, query));
  }
  /** Returns the primary track that can be paired with this track, optionally steered by the provided query. */
  async getPrimaryPairableAudioTrack(query) {
    return this.input.getPrimaryAudioTrack(mergeInputTrackQueries({
      filter: (t) => t.canBePairedWith(this)
    }, query));
  }
  /** Returns `true` if there is another track that can be paired with this track. */
  async hasPairableTrack(predicate) {
    predicate &&= toValidatedPredicate(predicate);
    const tracks = await this.input.getTracks();
    for (const track of tracks) {
      if (!this.canBePairedWith(track)) {
        continue;
      }
      if (!predicate || await predicate(track)) {
        return true;
      }
    }
    return false;
  }
  /** Returns `true` if there is a video track that can be paired with this track. */
  hasPairableVideoTrack(predicate) {
    predicate &&= toValidatedPredicate(predicate);
    return this.hasPairableTrack(async (x) => x.isVideoTrack() && (!predicate || await predicate(x)));
  }
  /** Returns `true` if there is an audio track that can be paired with this track. */
  hasPairableAudioTrack(predicate) {
    predicate &&= toValidatedPredicate(predicate);
    return this.hasPairableTrack(async (x) => x.isAudioTrack() && (!predicate || await predicate(x)));
  }
};
var requireSync = (value, getterName, asyncName) => {
  if (isThenable(value)) {
    throw new Error(`'${getterName}' is deprecated and not available synchronously for this track. Use the preferred '${asyncName}()' instead.`);
  }
  return value;
};
var toValidatedPredicate = (predicate) => {
  if (predicate !== void 0 && typeof predicate !== "function") {
    throw new TypeError("predicate, when provided, must be a function.");
  }
  return predicate ? (track) => {
    const handle = (result2) => {
      if (typeof result2 !== "boolean") {
        throw new TypeError("predicate must return or resolve to a boolean value.");
      }
      return result2;
    };
    const result = predicate(track);
    if (isThenable(result)) {
      return result.then(handle);
    }
    return handle(result);
  } : void 0;
};
var InputVideoTrack = class extends InputTrack {
  /** @internal */
  constructor(input2, backing) {
    super(input2, backing);
    this._pixelAspectRatioCache = null;
  }
  get type() {
    return "video";
  }
  /** The codec of the track's packets. */
  async getCodec() {
    return this._backing.getCodec();
  }
  /**
   * The codec of the track's packets.
   * @deprecated Use {@link InputVideoTrack.getCodec} instead.
   */
  get codec() {
    return requireSync(this._backing.getCodec(), "codec", "getCodec");
  }
  async hasOnlyKeyPackets() {
    return await this._backing.getHasOnlyKeyPackets?.() ?? await this._backing.getCodec() === "prores";
  }
  /** Returns the width in pixels of the track's coded samples, before any transformations or rotations. */
  async getCodedWidth() {
    return this._backing.getCodedWidth();
  }
  /**
   * The width in pixels of the track's coded samples, before any transformations or rotations.
   * @deprecated Use {@link InputVideoTrack.getCodedWidth} instead.
   */
  get codedWidth() {
    return requireSync(this._backing.getCodedWidth(), "codedWidth", "getCodedWidth");
  }
  /** Returns the height in pixels of the track's coded samples, before any transformations or rotations. */
  async getCodedHeight() {
    return this._backing.getCodedHeight();
  }
  /**
   * The height in pixels of the track's coded samples, before any transformations or rotations.
   * @deprecated Use {@link InputVideoTrack.getCodedHeight} instead.
   */
  get codedHeight() {
    return requireSync(this._backing.getCodedHeight(), "codedHeight", "getCodedHeight");
  }
  /**
   * Returns the row-major 3x3 affine transformation matrix that is used to transform the raw video frames before they
   * are displayed. The raw frames are assumed to be placed with their top-left corner at the origin (0,0).
   *
   * Usually, this matrix models a rotation and a flip. Depending on the file, it may also contain a translation
   * component. When displaying video, you should typically ignore the translation component and display the center of
   * the transformed frame in the center of the viewport.
   */
  async getTransformationMatrix() {
    return this._backing.getTransformationMatrix();
  }
  /**
   * Returns the angle in degrees by which the track's frames should be rotated (clockwise). The rotation is
   * applied before flipping.
   */
  async getRotation() {
    return extractRotationFromMatrix(await this._backing.getTransformationMatrix());
  }
  /**
   * The angle in degrees by which the track's frames should be rotated (clockwise).
   * @deprecated Use {@link InputVideoTrack.getRotation} instead.
   */
  get rotation() {
    return extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "rotation", "getRotation"));
  }
  /**
   * Returns whether the track's frames should be flipped horizontally (about the vertical axis), after rotation.
   */
  async getFlip() {
    return matrixIsFlipped(await this._backing.getTransformationMatrix());
  }
  /**
   * Returns the width of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
   */
  async getSquarePixelWidth() {
    return this._backing.getSquarePixelWidth();
  }
  /**
   * The width of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
   * @deprecated Use {@link InputVideoTrack.getSquarePixelWidth} instead.
   */
  get squarePixelWidth() {
    return requireSync(this._backing.getSquarePixelWidth(), "squarePixelWidth", "getSquarePixelWidth");
  }
  /**
   * Returns the height of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
   */
  async getSquarePixelHeight() {
    return this._backing.getSquarePixelHeight();
  }
  /**
   * The height of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
   * @deprecated Use {@link InputVideoTrack.getSquarePixelHeight} instead.
   */
  get squarePixelHeight() {
    return requireSync(this._backing.getSquarePixelHeight(), "squarePixelHeight", "getSquarePixelHeight");
  }
  /**
   * Returns the pixel aspect ratio of the track's frames as a rational number in its reduced form. Most videos use
   * square pixels (1:1).
   */
  async getPixelAspectRatio() {
    return this._pixelAspectRatioCache ??= toPixelAspectRatio(await this.getSquarePixelWidth() * await this.getCodedHeight(), await this.getSquarePixelHeight() * await this.getCodedWidth());
  }
  /**
   * The pixel aspect ratio of the track's frames, as a rational number in its reduced form. Most videos use
   * square pixels (1:1).
   * @deprecated Use {@link InputVideoTrack.getPixelAspectRatio} instead.
   */
  get pixelAspectRatio() {
    return this._pixelAspectRatioCache ??= toPixelAspectRatio(requireSync(this._backing.getSquarePixelWidth(), "pixelAspectRatio", "getPixelAspectRatio") * requireSync(this._backing.getCodedHeight(), "pixelAspectRatio", "getPixelAspectRatio"), requireSync(this._backing.getSquarePixelHeight(), "pixelAspectRatio", "getPixelAspectRatio") * requireSync(this._backing.getCodedWidth(), "pixelAspectRatio", "getPixelAspectRatio"));
  }
  /** Returns the display width of the track's frames in pixels, after aspect ratio adjustment and rotation. */
  async getDisplayWidth() {
    const metadata = await this._backing.getMetadataDisplayWidth?.();
    if (metadata != null) {
      return metadata;
    }
    const rotation = await this.getRotation();
    return rotation % 180 === 0 ? this.getSquarePixelWidth() : this.getSquarePixelHeight();
  }
  /**
   * The display width of the track's frames in pixels, after aspect ratio adjustment and rotation.
   * @deprecated Use {@link InputVideoTrack.getDisplayWidth} instead.
   */
  get displayWidth() {
    const metadataRaw = this._backing.getMetadataDisplayWidth?.();
    if (metadataRaw !== void 0) {
      const metadata = requireSync(metadataRaw, "displayWidth", "getDisplayWidth");
      if (metadata !== null) {
        return metadata;
      }
    }
    const rotation = extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "displayWidth", "getDisplayWidth"));
    const value = rotation % 180 === 0 ? this._backing.getSquarePixelWidth() : this._backing.getSquarePixelHeight();
    return requireSync(value, "displayWidth", "getDisplayWidth");
  }
  /** Returns the display height of the track's frames in pixels, after aspect ratio adjustment and rotation. */
  async getDisplayHeight() {
    const metadata = await this._backing.getMetadataDisplayHeight?.();
    if (metadata != null) {
      return metadata;
    }
    const rotation = await this.getRotation();
    return rotation % 180 === 0 ? this.getSquarePixelHeight() : this.getSquarePixelWidth();
  }
  /**
   * The display height of the track's frames in pixels, after aspect ratio adjustment and rotation.
   * @deprecated Use {@link InputVideoTrack.getDisplayHeight} instead.
   */
  get displayHeight() {
    const metadataRaw = this._backing.getMetadataDisplayHeight?.();
    if (metadataRaw !== void 0) {
      const metadata = requireSync(metadataRaw, "displayHeight", "getDisplayHeight");
      if (metadata !== null) {
        return metadata;
      }
    }
    const rotation = extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "displayHeight", "getDisplayHeight"));
    const value = rotation % 180 === 0 ? this._backing.getSquarePixelHeight() : this._backing.getSquarePixelWidth();
    return requireSync(value, "displayHeight", "getDisplayHeight");
  }
  /** Returns the color space of the track's samples. */
  async getColorSpace() {
    return this._backing.getColorSpace();
  }
  /** If this method returns true, the track's samples use a high dynamic range (HDR). */
  async hasHighDynamicRange() {
    const colorSpace = await this._backing.getColorSpace();
    return colorSpace.transfer === "pq" || colorSpace.transfer === "hlg";
  }
  /** Checks if this track may contain transparent samples with alpha data. */
  async canBeTransparent() {
    return this._backing.canBeTransparent();
  }
  /**
   * Returns the [decoder configuration](https://www.w3.org/TR/webcodecs/#video-decoder-config) for decoding the
   * track's packets using a [`VideoDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder). Returns
   * null if the track's codec is unknown.
   */
  async getDecoderConfig() {
    return this._backing.getDecoderConfig();
  }
  async getCodecParameterString() {
    const fromMetadata = await this._backing.getMetadataCodecParameterString?.();
    if (fromMetadata != null) {
      return fromMetadata;
    }
    const decoderConfig = await this._backing.getDecoderConfig();
    return decoderConfig?.codec ?? null;
  }
  async canDecode() {
    try {
      const decoderConfig = await this._backing.getDecoderConfig();
      if (!decoderConfig) {
        return false;
      }
      const codec = await this._backing.getCodec();
      assert(codec !== null);
      if (customVideoDecoders.some((x) => x.supports(codec, decoderConfig))) {
        return true;
      }
      if (typeof VideoDecoder === "undefined") {
        return false;
      }
      const support = await VideoDecoder.isConfigSupported(decoderConfig);
      return support.supported === true;
    } catch (error) {
      Logging._error("Error during decodability check:", error);
      return false;
    }
  }
  async determinePacketType(packet) {
    if (!(packet instanceof EncodedPacket)) {
      throw new TypeError("packet must be an EncodedPacket.");
    }
    if (packet.isMetadataOnly) {
      throw new TypeError("packet must not be metadata-only to determine its type.");
    }
    const codec = await this.getCodec();
    if (codec === null) {
      return null;
    }
    const decoderConfig = await this.getDecoderConfig();
    assert(decoderConfig);
    return determineVideoPacketType(codec, decoderConfig, packet.data);
  }
  /**
   * Computes frame rate metrics for this video track, i.e. estimates the video's frame rate. Frame rate is never
   * determined from file metadata (which is unreliable) but is always deduced directly from the actual frame
   * timestamps.
   */
  async computeFrameRateMetrics(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.targetPacketCount !== void 0 && (!isNumber(options.targetPacketCount) || options.targetPacketCount < 0)) {
      throw new TypeError("options.targetPacketCount must be a non-negative number.");
    }
    const timeResolution = await this.getTimeResolution();
    const targetPacketCount = options.targetPacketCount ?? 256;
    const sink2 = new EncodedPacketSink(this);
    const timestamps = [];
    let maxTimestamp = -Infinity;
    let probedPacketCount = 0;
    for await (const packet of sink2.packets(void 0, void 0, { metadataOnly: true })) {
      if (timestamps.length >= targetPacketCount && packet.timestamp >= maxTimestamp) {
        break;
      }
      timestamps.push(packet.timestamp);
      maxTimestamp = Math.max(maxTimestamp, packet.timestamp);
      probedPacketCount++;
    }
    const ticks = new Float64Array(timestamps.length);
    for (let i = 0; i < timestamps.length; i++) {
      ticks[i] = Math.round(timestamps[i] * timeResolution);
    }
    ticks.sort();
    let n = 1;
    for (let i = 1; i < ticks.length; i++) {
      if (ticks[i] !== ticks[n - 1]) {
        ticks[n++] = ticks[i];
      }
    }
    if (n < 2) {
      return {
        underlyingFrameRate: null,
        bestGuessFrameRate: timeResolution,
        minFrameRate: timeResolution,
        maxFrameRate: timeResolution,
        averageFrameRate: timeResolution,
        medianFrameRate: timeResolution,
        frameRateIsConstant: true,
        probedPacketCount
      };
    }
    const activeTicks = ticks.subarray(0, n);
    const underlyingFrameRate = findUnderlyingFrameRate(activeTicks, timeResolution);
    const unitRate = underlyingFrameRate ?? timeResolution;
    const ticksPerFrame = underlyingFrameRate !== null ? timeResolution / underlyingFrameRate : null;
    const histogram = /* @__PURE__ */ new Map();
    let minDifference = Infinity;
    let maxDifference = -Infinity;
    let totalDifference = 0;
    for (let i = 1; i < n; i++) {
      const tickDifference = activeTicks[i] - activeTicks[i - 1];
      const difference = ticksPerFrame !== null ? Math.max(1, Math.round(tickDifference / ticksPerFrame)) : tickDifference;
      histogram.set(difference, (histogram.get(difference) ?? 0) + 1);
      minDifference = Math.min(minDifference, difference);
      maxDifference = Math.max(maxDifference, difference);
      totalDifference += difference;
    }
    const differenceCount = n - 1;
    const sortedDifferences = [...histogram.keys()].sort((a, b) => a - b);
    const middleA = differenceCount - 1 >> 1;
    const middleB = differenceCount >> 1;
    let medianDifferenceA = 0;
    let medianDifferenceB = 0;
    let cumulativeCount = 0;
    for (const difference of sortedDifferences) {
      cumulativeCount += histogram.get(difference);
      if (medianDifferenceA === 0 && cumulativeCount > middleA) {
        medianDifferenceA = difference;
      }
      if (cumulativeCount > middleB) {
        medianDifferenceB = difference;
        break;
      }
    }
    const medianFrameRate = (unitRate / medianDifferenceA + unitRate / medianDifferenceB) / 2;
    return {
      underlyingFrameRate,
      bestGuessFrameRate: underlyingFrameRate !== null ? underlyingFrameRate : getBestGuessFrameRate(medianFrameRate),
      minFrameRate: unitRate / maxDifference,
      maxFrameRate: unitRate / minDifference,
      averageFrameRate: unitRate * differenceCount / totalDifference,
      medianFrameRate,
      frameRateIsConstant: underlyingFrameRate !== null && minDifference === 1 && maxDifference === 1,
      probedPacketCount
    };
  }
};
var toPixelAspectRatio = (num, den) => {
  if (num === 0 || den === 0) {
    return { num: 1, den: 1 };
  }
  return simplifyRational({ num, den });
};
var InputAudioTrack = class extends InputTrack {
  /** @internal */
  constructor(input2, backing) {
    super(input2, backing);
  }
  get type() {
    return "audio";
  }
  /** The codec of the track's packets. */
  async getCodec() {
    return this._backing.getCodec();
  }
  /**
   * The codec of the track's packets.
   * @deprecated Use {@link InputAudioTrack.getCodec} instead.
   */
  get codec() {
    return requireSync(this._backing.getCodec(), "codec", "getCodec");
  }
  async hasOnlyKeyPackets() {
    const codec = await this._backing.getCodec();
    return await this._backing.getHasOnlyKeyPackets?.() ?? (codec === null || !AUDIO_CODECS_WITH_DELTA_PACKETS.includes(codec));
  }
  /** Returns the number of audio channels in the track. */
  async getNumberOfChannels() {
    return this._backing.getNumberOfChannels();
  }
  /**
   * The number of audio channels in the track.
   * @deprecated Use {@link InputAudioTrack.getNumberOfChannels} instead.
   */
  get numberOfChannels() {
    return requireSync(this._backing.getNumberOfChannels(), "numberOfChannels", "getNumberOfChannels");
  }
  /** Returns the track's audio sample rate in hertz. */
  async getSampleRate() {
    return this._backing.getSampleRate();
  }
  /**
   * The track's audio sample rate in hertz.
   * @deprecated Use {@link InputAudioTrack.getSampleRate} instead.
   */
  get sampleRate() {
    return requireSync(this._backing.getSampleRate(), "sampleRate", "getSampleRate");
  }
  /**
   * Returns the [decoder configuration](https://www.w3.org/TR/webcodecs/#audio-decoder-config) for decoding the
   * track's packets using an [`AudioDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder). Returns
   * null if the track's codec is unknown.
   */
  async getDecoderConfig() {
    return this._backing.getDecoderConfig();
  }
  async getCodecParameterString() {
    const fromMetadata = await this._backing.getMetadataCodecParameterString?.();
    if (fromMetadata != null) {
      return fromMetadata;
    }
    const decoderConfig = await this._backing.getDecoderConfig();
    return decoderConfig?.codec ?? null;
  }
  /**
   * Returns the decoder pre-roll duration for this track. It specifies how far ahead of any given timestamp,
   * in seconds, decoding must start so that the audio at that timestamp comes out correctly and the codec state has
   * properly converged. Returns `null` if the track's codec is unknown.
   */
  async getPreRollDuration() {
    const codec = await this._backing.getCodec();
    if (codec === null) {
      return null;
    }
    const decoderConfig = await this._backing.getDecoderConfig();
    assert(decoderConfig);
    return getAudioPreRollDuration(codec, decoderConfig);
  }
  async canDecode() {
    try {
      const decoderConfig = await this._backing.getDecoderConfig();
      if (!decoderConfig) {
        return false;
      }
      const codec = await this._backing.getCodec();
      assert(codec !== null);
      if (customAudioDecoders.some((x) => x.supports(codec, decoderConfig))) {
        return true;
      }
      if (PCM_AUDIO_CODECS.includes(decoderConfig.codec)) {
        return true;
      } else {
        if (typeof AudioDecoder === "undefined") {
          return false;
        }
        const support = await AudioDecoder.isConfigSupported(decoderConfig);
        return support.supported === true;
      }
    } catch (error) {
      Logging._error("Error during decodability check:", error);
      return false;
    }
  }
  async determinePacketType(packet) {
    if (!(packet instanceof EncodedPacket)) {
      throw new TypeError("packet must be an EncodedPacket.");
    }
    if (packet.isMetadataOnly) {
      throw new TypeError("packet must not be metadata-only to determine its type.");
    }
    const codec = await this.getCodec();
    if (codec === null) {
      return null;
    }
    return determineAudioPacketType(codec, packet.data);
  }
};
var desc = (value) => {
  return -(value ?? -Infinity);
};
var prefer = (value) => {
  return -value;
};
var toValidatedInputTrackQuery = (query) => {
  if (typeof query !== "object" || !query) {
    throw new TypeError("query must be an object.");
  }
  if (query.filter !== void 0 && typeof query.filter !== "function") {
    throw new TypeError("query.filter, when provided, must be a function.");
  }
  if (query.sortBy !== void 0 && typeof query.sortBy !== "function") {
    throw new TypeError("query.sortBy, when provided, must be a function.");
  }
  return {
    filter: query.filter ? (track) => {
      const handle = (bool) => {
        if (typeof bool !== "boolean") {
          throw new TypeError("query.filter must return or resolve to a boolean.");
        }
        return bool;
      };
      const result = query.filter(track);
      if (isThenable(result)) {
        return result.then(handle);
      } else {
        return handle(result);
      }
    } : void 0,
    sortBy: query.sortBy ? (track) => {
      const handle = (value) => {
        if (typeof value !== "number" && (!Array.isArray(value) || !value.every((x) => typeof x === "number"))) {
          throw new TypeError("query.sortBy must return or resolve to a number or an array of numbers.");
        }
        return value;
      };
      const result = query.sortBy(track);
      if (isThenable(result)) {
        return result.then(handle);
      } else {
        return handle(result);
      }
    } : void 0
  };
};
var mergeInputTrackQueries = (queryA, queryB) => {
  return {
    filter: queryA?.filter || queryB?.filter ? (track) => {
      const resultA = queryA?.filter?.(track) ?? true;
      const handleResultA = (resultA2) => {
        if (resultA2 === false) {
          return false;
        }
        return queryB?.filter?.(track) ?? true;
      };
      if (isThenable(resultA)) {
        return resultA.then(handleResultA);
      } else {
        return handleResultA(resultA);
      }
    } : void 0,
    sortBy: queryA?.sortBy || queryB?.sortBy ? (track) => {
      const resultA = queryA?.sortBy?.(track) ?? [];
      const resultB = queryB?.sortBy?.(track) ?? [];
      const join = (resultA2, resultB2) => {
        return [
          ...Array.isArray(resultA2) ? resultA2 : [resultA2],
          ...Array.isArray(resultB2) ? resultB2 : [resultB2]
        ];
      };
      if (isThenable(resultA) || isThenable(resultB)) {
        return Promise.all([resultA, resultB]).then(([resultA2, resultB2]) => {
          return join(resultA2, resultB2);
        });
      } else {
        return join(resultA, resultB);
      }
    } : void 0
  };
};
var queryInputTracks = async (tracks, query) => {
  let matched = tracks;
  if (query?.filter) {
    const filterMatches = tracks.map((t) => query.filter(t));
    const hasAsyncFilter = filterMatches.some((x) => isThenable(x));
    if (hasAsyncFilter) {
      const resolvedFilterMatches = await Promise.all(filterMatches);
      matched = tracks.filter((_, i) => resolvedFilterMatches[i]);
    } else {
      matched = tracks.filter((_, i) => filterMatches[i]);
    }
  }
  if (!query?.sortBy) {
    return matched;
  }
  const sortValues = matched.map((t) => query.sortBy(t));
  const hasAsyncSort = sortValues.some((x) => isThenable(x));
  const resolvedSortValues = hasAsyncSort ? await Promise.all(sortValues) : sortValues;
  return matched.map((track, i) => ({ track, sortValue: resolvedSortValues[i] })).sort((a, b) => {
    const aValues = Array.isArray(a.sortValue) ? a.sortValue : [a.sortValue];
    const bValues = Array.isArray(b.sortValue) ? b.sortValue : [b.sortValue];
    const maxLength = Math.max(aValues.length, bValues.length);
    for (let i = 0; i < maxLength; i++) {
      const aValue = aValues[i] ?? 0;
      const bValue = bValues[i] ?? 0;
      if (aValue === bValue) {
        continue;
      }
      return aValue - bValue;
    }
    return 0;
  }).map((x) => x.track);
};
var findUnderlyingFrameRate = (ticks, resolution) => {
  const MAX_DENOMINATOR = 1e6;
  const MIN_INLIER_RATIO = 0.98;
  const DELTA_TOLERANCE = 1 + 1e-9;
  const MAX_EFFECTIVE_FRAME_SPAN = 1e3;
  const KNOWN_FRAME_RATES = [
    12,
    15,
    20,
    24e3 / 1001,
    24,
    25,
    3e4 / 1001,
    30,
    48,
    50,
    6e4 / 1001,
    60,
    100,
    12e4 / 1001,
    120,
    144,
    240
  ];
  if (ticks.length < 2) {
    return null;
  }
  const gaps = new Float64Array(ticks.length - 1);
  for (let i = 1; i < ticks.length; i++) {
    const gap = ticks[i] - ticks[i - 1];
    if (!(gap > 0)) {
      return null;
    }
    gaps[i - 1] = gap;
  }
  const sortedGaps = gaps.slice();
  sortedGaps.sort();
  let period = sortedGaps[Math.floor(sortedGaps.length * 0.05)];
  let periodUncertainty = 1;
  for (let iteration = 0; iteration < 6; iteration++) {
    let totalTicks2 = 0;
    let totalFrames2 = 0;
    for (const gap of gaps) {
      const multiple = Math.max(1, Math.round(gap / period));
      if (Math.abs(gap - multiple * period) >= DELTA_TOLERANCE + multiple * periodUncertainty) {
        continue;
      }
      totalTicks2 += gap;
      totalFrames2 += multiple;
    }
    if (totalFrames2 === 0) {
      return null;
    }
    const refinedPeriod = totalTicks2 / totalFrames2;
    periodUncertainty = 1 / Math.min(totalFrames2, MAX_EFFECTIVE_FRAME_SPAN);
    if (Math.abs(refinedPeriod - period) <= 1e-12 * Math.max(1, period)) {
      period = refinedPeriod;
      break;
    }
    period = refinedPeriod;
  }
  let inlierCount = 0;
  let totalTicks = 0;
  let totalFrames = 0;
  for (const gap of gaps) {
    const multiple = Math.max(1, Math.round(gap / period));
    if (Math.abs(gap - multiple * period) >= DELTA_TOLERANCE + multiple * periodUncertainty) {
      continue;
    }
    inlierCount++;
    totalTicks += gap;
    totalFrames += multiple;
  }
  if (inlierCount / gaps.length < MIN_INLIER_RATIO) {
    return null;
  }
  period = totalTicks / totalFrames;
  const uncertainty = 1 / Math.min(totalFrames, MAX_EFFECTIVE_FRAME_SPAN);
  const periodLo = Math.max(Number.EPSILON, period - uncertainty);
  const periodHi = period + uncertainty;
  const fpsLo = resolution / periodHi;
  const fpsHi = resolution / periodLo;
  const fittedFps = resolution / period;
  let fps = null;
  let bestKnownError = Infinity;
  for (const candidate of KNOWN_FRAME_RATES) {
    if (candidate < fpsLo || candidate > fpsHi) {
      continue;
    }
    const error = Math.abs(candidate / fittedFps - 1);
    if (error < bestKnownError) {
      fps = candidate;
      bestKnownError = error;
    }
  }
  if (fps === null) {
    const periodFraction = simplestFractionBetween(periodLo, periodHi, MAX_DENOMINATOR);
    const fpsFraction = simplestFractionBetween(fpsLo, fpsHi, MAX_DENOMINATOR);
    if (fpsFraction && (!periodFraction || fpsFraction.den < periodFraction.den || fpsFraction.den === periodFraction.den && fpsFraction.num <= periodFraction.num)) {
      fps = fpsFraction.num / fpsFraction.den;
    } else if (periodFraction) {
      fps = resolution * periodFraction.den / periodFraction.num;
    } else {
      return null;
    }
  }
  const finalPeriod = resolution / fps;
  let finalInlierCount = 0;
  for (const gap of gaps) {
    const multiple = Math.max(1, Math.round(gap / finalPeriod));
    if (Math.abs(gap - multiple * finalPeriod) < DELTA_TOLERANCE) {
      finalInlierCount++;
    }
  }
  if (finalInlierCount / gaps.length < MIN_INLIER_RATIO) {
    return null;
  }
  return fps;
};
var simplestFractionBetween = (lo, hi, maxDenominator) => {
  for (let den = 1; den <= maxDenominator; den++) {
    const num = Math.floor(lo * den) + 1;
    if (num / den < hi) {
      return simplifyRational({ num, den });
    }
  }
  return null;
};
var getBestGuessFrameRate = (frameRate) => {
  const SPECIAL_FRAME_RATES = [
    24 / 1.001,
    30 / 1.001,
    60 / 1.001,
    120 / 1.001
  ];
  const COMMON_FRAME_RATES = [
    12,
    15,
    20,
    24,
    25,
    30,
    48,
    50,
    60,
    100,
    120,
    144,
    240
  ];
  const SPECIAL_TOLERANCE = 5e-4;
  const COMMON_TOLERANCE = 0.025;
  for (const candidate of SPECIAL_FRAME_RATES) {
    if (Math.abs(candidate / frameRate - 1) <= SPECIAL_TOLERANCE) {
      return candidate;
    }
  }
  let best = frameRate;
  let bestError = Infinity;
  for (const candidate of COMMON_FRAME_RATES) {
    const error = Math.abs(candidate / frameRate - 1);
    if (error <= COMMON_TOLERANCE && error < bestError) {
      best = candidate;
      bestError = error;
    }
  }
  return best;
};

// node_modules/mediabunny/dist/modules/src/input.js
polyfillSymbolDispose();
var DEFAULT_SOURCE_CACHE_GROUP = 1;
var ENCRYPTION_KEY_CACHE_GROUP = 2;
var Input = class _Input extends EventEmitter {
  /** True if the input has been disposed. */
  get disposed() {
    return this._disposed;
  }
  /**
   * Creates a new input file from the specified options. No reading operations will be performed until methods are
   * called on this instance.
   */
  constructor(options) {
    super();
    this._demuxerPromise = null;
    this._format = null;
    this._trackBackingsCache = null;
    this._backingToTrack = /* @__PURE__ */ new Map();
    this._disposed = false;
    this._nextSourceCacheAge = 0;
    this._sourceRefs = [];
    this._sourceCache = [];
    this._sourceCachePromises = [];
    this._onFormatDetermined = null;
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (!Array.isArray(options.formats) || options.formats.some((x) => !(x instanceof InputFormat))) {
      throw new TypeError("options.formats must be an array of InputFormat.");
    }
    if (!(options.source instanceof Source || options.source instanceof SourceRef)) {
      throw new TypeError("options.source must be a Source or SourceRef.");
    }
    if (options.source instanceof Source && options.source._disposed) {
      throw new TypeError("options.source must not be a disposed Source.");
    }
    if (options.initInput !== void 0 && !(options.initInput instanceof _Input)) {
      throw new TypeError("options.initInput, when provided, must be an Input.");
    }
    if (options.formatOptions !== void 0) {
      validateInputFormatOptions(options.formatOptions, "formatOptions");
    }
    this._formats = options.formats;
    this._initInput = options.initInput ?? null;
    this._formatOptions = options.formatOptions ?? {};
    if (options.source instanceof Source) {
      this._rootRef = options.source.ref();
    } else {
      this._rootRef = options.source;
    }
    this._sourceRefs.push(this._rootRef);
  }
  /** @internal */
  get _rootSource() {
    if (this._disposed) {
      throw new InputDisposedError();
    }
    return this._rootRef.source;
  }
  /** @internal */
  async _getSourceUncached(request) {
    assert(this._rootSource instanceof PathedSource);
    const ref = await this._rootSource._resolveRequest(request);
    this._emit("source", { source: ref.source, request, isRoot: request.isRoot });
    return ref;
  }
  /** @internal */
  _getSourceCached(request, cacheGroup = DEFAULT_SOURCE_CACHE_GROUP) {
    const cachedEntry = this._sourceCache.find((x) => x.cacheGroup === cacheGroup && sourceRequestsAreEqual(x.request, request));
    if (cachedEntry) {
      cachedEntry.age = this._nextSourceCacheAge++;
      return Promise.resolve(cachedEntry.sourceRef.source.ref());
    }
    const cachedPromiseEntry = this._sourceCachePromises.find((x) => x.cacheGroup === cacheGroup && sourceRequestsAreEqual(x.request, request));
    if (cachedPromiseEntry) {
      return cachedPromiseEntry.promise.then((x) => x.sourceRef.source.ref());
    }
    const promise = (async () => {
      let sourceRef;
      try {
        sourceRef = await this._getSourceUncached(request);
      } finally {
        const promiseIndex = this._sourceCachePromises.findIndex((x) => x.request === request);
        assert(promiseIndex !== -1);
        this._sourceCachePromises.splice(promiseIndex, 1);
      }
      if (this._disposed) {
        sourceRef.free();
        throw new InputDisposedError();
      }
      const MAX_SOURCE_CACHE_SIZE = 4;
      const count = arrayCount(this._sourceCache, (x) => x.cacheGroup === cacheGroup && x.sourceRef.source._refCount === 1);
      if (count >= MAX_SOURCE_CACHE_SIZE) {
        const minAgeIndex = arrayArgmin(this._sourceCache, (x) => x.cacheGroup === cacheGroup && x.sourceRef.source._refCount === 1 ? x.age : Infinity);
        assert(minAgeIndex !== -1);
        const entry = this._sourceCache[minAgeIndex];
        this._sourceCache.splice(minAgeIndex, 1);
        entry.sourceRef.free();
        removeItem(this._sourceRefs, entry.sourceRef);
      }
      this._sourceRefs.push(sourceRef);
      const cacheEntry = {
        request,
        sourceRef,
        age: this._nextSourceCacheAge++,
        cacheGroup
      };
      return cacheEntry;
    })();
    this._sourceCachePromises.push({
      request,
      cacheGroup,
      promise
    });
    return promise.then((entry) => {
      const ref = entry.sourceRef.source.ref();
      this._sourceCache.push(entry);
      return ref;
    });
  }
  /** @internal */
  _getDemuxer() {
    return this._demuxerPromise ??= (async () => {
      this._reader = new Reader(this._rootSource);
      this._emit("source", { source: this._rootSource, request: null, isRoot: true });
      let bestFormat = null;
      let bestMatchPosition = Infinity;
      for (const format of this._formats) {
        const matchPosition = await format._getMatchPosition(this);
        if (matchPosition !== null && matchPosition < bestMatchPosition) {
          bestFormat = format;
          bestMatchPosition = matchPosition;
          if (matchPosition === 0) {
            break;
          }
        }
      }
      if (!bestFormat) {
        throw new UnsupportedInputFormatError();
      }
      this._format = bestFormat;
      this._onFormatDetermined?.(bestFormat);
      return bestFormat._createDemuxer(this);
    })();
  }
  /**
   * Returns the source from which this input file reads data for the root path.
   */
  get source() {
    return this._rootSource;
  }
  /**
   * Returns the format of the input file. You can compare this result directly to the {@link InputFormat} singletons
   * or use `instanceof` checks for subset-aware logic (for example, `format instanceof MatroskaInputFormat` is true
   * for both MKV and WebM).
   */
  async getFormat() {
    await this._getDemuxer();
    assert(this._format);
    return this._format;
  }
  /** Returns `true` if the format of the input file is known and the file can be read, `false` otherwise. */
  async canRead() {
    try {
      await this._getDemuxer();
      return true;
    } catch (error) {
      if (error instanceof UnsupportedInputFormatError) {
        return false;
      }
      throw error;
    }
  }
  /**
   * Returns the timestamp at which the input file starts. More precisely, returns the smallest starting timestamp
   * among all tracks.
   *
   * Optionally, you can pass in the list of tracks for which you want to compute the starting timestamp.
   *
   * Note that this method is potentially expensive for inputs with many tracks (such as HLS manifests), since it
   * probes every track.
   */
  async getFirstTimestamp(tracks) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x) => x !== null);
    if (filtered.length === 0) {
      return 0;
    }
    const firstTimestamps = await Promise.all(filtered.map((x) => x.getFirstTimestampOrNull()));
    const result = Math.min(...firstTimestamps.map((x) => x ?? Infinity));
    return result === Infinity ? 0 : result;
  }
  /**
   * Computes the duration of the input file, in seconds. More precisely, returns the largest end timestamp among
   * all tracks.
   *
   * Optionally, you can pass in the list of tracks for which you want to compute the duration.
   *
   * This method can be potentially expensive depending on the underlying file format, because it returns the most
   * accurate duration possible and must check all tracks. Use {@link Input.getDurationFromMetadata} for a faster but
   * less accurate estimate of duration.
   *
   * By default, when any track in the underlying media is live, this method will only resolve once the live stream
   * ends. If you want to query the current duration of the media, set {@link PacketRetrievalOptions.skipLiveWait}
   * to `true` in the options.
   */
  async computeDuration(tracks, options) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x) => x !== null);
    if (filtered.length === 0) {
      return 0;
    }
    const tracksDurations = await Promise.all(filtered.map((x) => x.computeDurationOrNull(options)));
    const result = Math.max(...tracksDurations.map((x) => x ?? -Infinity));
    return result === -Infinity ? 0 : result;
  }
  /**
   * Gets the duration (end timestamp) in seconds of the input file from metadata stored in the file. This value may
   * be approximate or diverge from the actual, precise duration returned by `.computeDuration()`, but compared to
   * that method, this method is cheaper. When the duration cannot be determined from the file metadata, `null`
   * is returned.
   *
   * Optionally, you can pass in the list of tracks for which you want to get the duration from metadata.
   *
   * By default, when the underlying media is live, this method will only resolve once the live stream
   * ends. If you want to query the current duration of the media, set
   * {@link DurationMetadataRequestOptions.skipLiveWait} to `true` in the options.
   */
  async getDurationFromMetadata(tracks, options) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x) => x !== null);
    const tracksDurations = await Promise.all(filtered.map((x) => x.getDurationFromMetadata(options)));
    const nonNullDurations = tracksDurations.filter((x) => x !== null);
    if (nonNullDurations.length === 0) {
      return null;
    }
    return Math.max(...nonNullDurations);
  }
  /**
   * Returns the list of all tracks of this input file in the order in which they appear in the file. An optional
   * query can be provided.
   */
  async getTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const backings = await this._getTrackBackings();
    const tracks = backings.map((backing) => this._wrapBackingAsTrack(backing));
    return queryInputTracks(tracks, query);
  }
  /** Returns the list of all video tracks of this input file. An optional query can be provided. */
  async getVideoTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const tracks = await this.getTracks();
    const videoTracks = tracks.filter((x) => x.isVideoTrack());
    return queryInputTracks(videoTracks, query);
  }
  /** Returns the list of all audio tracks of this input file. An optional query can be provided. */
  async getAudioTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const tracks = await this.getTracks();
    const audioTracks = tracks.filter((x) => x.isAudioTrack());
    return queryInputTracks(audioTracks, query);
  }
  /**
   * Returns the primary video track of this input file, or null if there are no video tracks.
   *
   * Multiple factors determine which track is considered primary, including its position in the file, disposition,
   * bitrate (higher bitrate is preferred), and if it can be paired with an audio track.
   */
  async getPrimaryVideoTrack(query) {
    query &&= toValidatedInputTrackQuery(query);
    const merged = mergeInputTrackQueries(query, {
      sortBy: async (t) => [
        prefer((await t.getDisposition()).default),
        prefer(await t.hasPairableAudioTrack()),
        prefer(!await t.hasOnlyKeyPackets()),
        desc(await t.getBitrate())
      ]
    });
    const sorted = await this.getVideoTracks(merged);
    return sorted[0] ?? null;
  }
  /**
   * Returns the primary audio track of this input file, or null if there are no audio tracks.
   *
   * Multiple factors determine which track is considered primary, including its position in the file, disposition,
   * bitrate (higher bitrate is preferred), and if it can be paired with the primary video track.
   */
  async getPrimaryAudioTrack(query) {
    query &&= toValidatedInputTrackQuery(query);
    const primaryVideoTrack = await this.getPrimaryVideoTrack();
    const merged = mergeInputTrackQueries(query, {
      sortBy: async (t) => [
        prefer(!primaryVideoTrack || t.canBePairedWith(primaryVideoTrack)),
        prefer((await t.getDisposition()).default),
        desc(await t.getBitrate())
      ]
    });
    const sorted = await this.getAudioTracks(merged);
    return sorted[0] ?? null;
  }
  /** @internal */
  async _getTrackBackings() {
    const demuxer = await this._getDemuxer();
    return this._trackBackingsCache ??= await demuxer.getTrackBackings();
  }
  /** @internal */
  _wrapBackingAsTrack(backing) {
    const existing = this._backingToTrack.get(backing);
    if (existing) {
      return existing;
    }
    const type = backing.getType();
    const track = type === "video" ? new InputVideoTrack(this, backing) : new InputAudioTrack(this, backing);
    this._backingToTrack.set(backing, track);
    return track;
  }
  /** Returns the full MIME type of this input file, including track codecs. */
  async getMimeType() {
    const demuxer = await this._getDemuxer();
    return demuxer.getMimeType();
  }
  /**
   * Returns descriptive metadata tags about the media file, such as title, author, date, cover art, or other
   * attached files.
   */
  async getMetadataTags() {
    const demuxer = await this._getDemuxer();
    return demuxer.getMetadataTags();
  }
  /**
   * Disposes this input and frees connected resources. When an input is disposed, ongoing read operations will be
   * canceled, all future read operations will fail, any open decoders will be closed, and all ongoing media sink
   * operations will be canceled. Disallowed and canceled operations will throw an {@link InputDisposedError}.
   *
   * You are expected not to use an input after disposing it. While some operations may still work, it is not
   * specified and may change in any future update.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    for (const ref of this._sourceRefs) {
      ref.free();
    }
    this._sourceRefs.length = 0;
    this._sourceCache.length = 0;
    if (this._demuxerPromise) {
      void this._demuxerPromise.then((demuxer) => demuxer.dispose()).catch(() => {
      });
    }
  }
  /**
   * Calls `.dispose()` on the input, implementing the `Disposable` interface for use with
   * JavaScript Explicit Resource Management features.
   */
  [Symbol.dispose]() {
    this.dispose();
  }
};
var UnsupportedInputFormatError = class extends Error {
  /** Creates a new {@link UnsupportedInputFormatError}. */
  constructor(message = "Input has an unsupported or unrecognizable format.") {
    super(message);
    this.name = "UnsupportedInputFormatError";
  }
};
var InputDisposedError = class extends Error {
  /** Creates a new {@link InputDisposedError}. */
  constructor(message = "Input has been disposed.") {
    super(message);
    this.name = "InputDisposedError";
  }
};

// node_modules/mediabunny/dist/modules/src/reader.js
var Reader = class {
  constructor(source) {
    this.source = source;
  }
  get fileSize() {
    const size = this.source._getFileSize();
    if (size === void 0) {
      throw new Error("Reading file size too early; read required first.");
    }
    return size;
  }
  get fileSizeNonStrict() {
    return this.source._getFileSize() ?? null;
  }
  requestSlice(start, length) {
    if (this.source._disposed) {
      throw new InputDisposedError();
    }
    if (start < 0) {
      return null;
    }
    if (this.fileSizeNonStrict !== null && start + length > this.fileSizeNonStrict) {
      return null;
    }
    if (length === 0) {
      const buffer = new Uint8Array(0);
      return new FileSlice(buffer, toDataView(buffer), 0, start, start);
    }
    const end = start + length;
    const result = this.source._read(start, end, DEFAULT_MIN_READ_POSITION, DEFAULT_MAX_READ_POSITION);
    if (isThenable(result)) {
      return result.then((x) => {
        if (!x) {
          return null;
        }
        return new FileSlice(x.bytes, x.view, x.offset, start, end);
      });
    } else {
      if (!result) {
        return null;
      }
      return new FileSlice(result.bytes, result.view, result.offset, start, end);
    }
  }
  requestSliceRange(start, minLength, maxLength) {
    if (this.source._disposed) {
      throw new InputDisposedError();
    }
    if (start < 0) {
      return null;
    }
    if (this.fileSizeNonStrict !== null) {
      return this.requestSlice(start, clamp(this.fileSizeNonStrict - start, minLength, maxLength));
    } else {
      const promisedAttempt = this.requestSlice(start, maxLength);
      const handleAttempt = (attempt) => {
        if (attempt) {
          return attempt;
        }
        assert(this.fileSizeNonStrict !== null);
        return this.requestSlice(start, clamp(this.fileSizeNonStrict - start, minLength, maxLength));
      };
      if (isThenable(promisedAttempt)) {
        return promisedAttempt.then(handleAttempt);
      } else {
        return handleAttempt(promisedAttempt);
      }
    }
  }
  requestEntireFile() {
    if (this.fileSizeNonStrict !== null) {
      return this.requestSlice(0, this.fileSizeNonStrict);
    }
    const CHUNK_SIZE = 1024;
    return (async () => {
      const chunks = [];
      let currentSize = 0;
      while (true) {
        if (chunks.length === 1 && this.fileSizeNonStrict !== null) {
          return this.requestSlice(0, this.fileSizeNonStrict);
        }
        let slice = this.requestSliceRange(currentSize, 0, CHUNK_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice || slice.length === 0) {
          break;
        }
        const chunk = readBytes(slice, slice.length);
        chunks.push(chunk);
        currentSize += slice.length;
      }
      const joined = new Uint8Array(currentSize);
      let offset = 0;
      for (const chunk of chunks) {
        joined.set(chunk, offset);
        offset += chunk.length;
      }
      return new FileSlice(joined, toDataView(joined), 0, 0, currentSize);
    })();
  }
};
var FileSlice = class _FileSlice {
  constructor(bytes, view, offset, start, end) {
    this.bytes = bytes;
    this.view = view;
    this.offset = offset;
    this.start = start;
    this.end = end;
    this.bufferPos = start - offset;
  }
  static tempFromBytes(bytes) {
    return new _FileSlice(bytes, toDataView(bytes), 0, 0, bytes.length);
  }
  get length() {
    return this.end - this.start;
  }
  get filePos() {
    return this.offset + this.bufferPos;
  }
  set filePos(value) {
    this.bufferPos = value - this.offset;
  }
  /** The number of bytes left from the current pos to the end of the slice. */
  get remainingLength() {
    return Math.max(this.end - this.filePos, 0);
  }
  skip(byteCount) {
    this.bufferPos += byteCount;
  }
  /** Creates a new subslice of this slice whose byte range must be contained within this slice. */
  slice(filePos, length = this.end - filePos) {
    if (filePos < this.start || filePos + length > this.end) {
      throw new RangeError("Slicing outside of original slice.");
    }
    return new _FileSlice(this.bytes, this.view, this.offset, filePos, filePos + length);
  }
};
var checkIsInRange = (slice, bytesToRead) => {
  if (bytesToRead < 0 || slice.filePos < slice.start || slice.filePos + bytesToRead > slice.end) {
    throw new RangeError(`Tried reading [${slice.filePos}, ${slice.filePos + bytesToRead}), but slice is [${slice.start}, ${slice.end}). This is likely an internal error, please report it alongside the file that caused it.`);
  }
};
var readBytes = (slice, length) => {
  checkIsInRange(slice, length);
  const bytes = slice.bytes.subarray(slice.bufferPos, slice.bufferPos + length);
  slice.bufferPos += length;
  return bytes;
};
var readU8 = (slice) => {
  checkIsInRange(slice, 1);
  return slice.view.getUint8(slice.bufferPos++);
};
var readU16 = (slice, littleEndian) => {
  checkIsInRange(slice, 2);
  const value = slice.view.getUint16(slice.bufferPos, littleEndian);
  slice.bufferPos += 2;
  return value;
};
var readU16Be = (slice) => {
  checkIsInRange(slice, 2);
  const value = slice.view.getUint16(slice.bufferPos, false);
  slice.bufferPos += 2;
  return value;
};
var readU24Be = (slice) => {
  checkIsInRange(slice, 3);
  const value = getUint24(slice.view, slice.bufferPos, false);
  slice.bufferPos += 3;
  return value;
};
var readI16Be = (slice) => {
  checkIsInRange(slice, 2);
  const value = slice.view.getInt16(slice.bufferPos, false);
  slice.bufferPos += 2;
  return value;
};
var readU32 = (slice, littleEndian) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getUint32(slice.bufferPos, littleEndian);
  slice.bufferPos += 4;
  return value;
};
var readU32Be = (slice) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getUint32(slice.bufferPos, false);
  slice.bufferPos += 4;
  return value;
};
var readU32Le = (slice) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getUint32(slice.bufferPos, true);
  slice.bufferPos += 4;
  return value;
};
var readI32Be = (slice) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getInt32(slice.bufferPos, false);
  slice.bufferPos += 4;
  return value;
};
var readI32Le = (slice) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getInt32(slice.bufferPos, true);
  slice.bufferPos += 4;
  return value;
};
var readU64 = (slice, littleEndian) => {
  let low;
  let high;
  if (littleEndian) {
    low = readU32(slice, true);
    high = readU32(slice, true);
  } else {
    high = readU32(slice, false);
    low = readU32(slice, false);
  }
  return high * 4294967296 + low;
};
var readU64Be = (slice) => {
  const high = readU32Be(slice);
  const low = readU32Be(slice);
  return high * 4294967296 + low;
};
var readI64Be = (slice) => {
  const high = readI32Be(slice);
  const low = readU32Be(slice);
  return high * 4294967296 + low;
};
var readI64Le = (slice) => {
  const low = readU32Le(slice);
  const high = readI32Le(slice);
  return high * 4294967296 + low;
};
var readF32Be = (slice) => {
  checkIsInRange(slice, 4);
  const value = slice.view.getFloat32(slice.bufferPos, false);
  slice.bufferPos += 4;
  return value;
};
var readF64Be = (slice) => {
  checkIsInRange(slice, 8);
  const value = slice.view.getFloat64(slice.bufferPos, false);
  slice.bufferPos += 8;
  return value;
};
var readAscii = (slice, length) => {
  checkIsInRange(slice, length);
  let str = "";
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(slice.bytes[slice.bufferPos++]);
  }
  return str;
};
var readAllLines = (slice, length, options) => {
  const text = textDecoder.decode(readBytes(slice, length));
  const lines = text.split("\n").map((x) => x.trim()).filter((x) => x.length > 0 && !options?.ignore?.(x));
  return lines;
};

// node_modules/mediabunny/dist/modules/src/isobmff/isobmff-reader.js
var MIN_BOX_HEADER_SIZE = 8;
var MAX_BOX_HEADER_SIZE = 16;
var readBoxHeader = (slice) => {
  let totalSize = readU32Be(slice);
  const name = readAscii(slice, 4);
  let headerSize = 8;
  const hasLargeSize = totalSize === 1;
  if (hasLargeSize) {
    totalSize = readU64Be(slice);
    headerSize = 16;
  }
  const contentSize = totalSize - headerSize;
  if (contentSize < 0) {
    return null;
  }
  return { name, totalSize, headerSize, contentSize };
};
var readFixed_16_16 = (slice) => {
  return readI32Be(slice) / 65536;
};
var readFixed_2_30 = (slice) => {
  return readI32Be(slice) / 1073741824;
};
var readIsomVariableInteger = (slice) => {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    result <<= 7;
    const nextByte = readU8(slice);
    result |= nextByte & 127;
    if ((nextByte & 128) === 0) {
      break;
    }
  }
  return result;
};
var readEsDescriptor = (slice) => {
  const tag = readU8(slice);
  if (tag !== 3) {
    throw new Error("Invalid esds: expected ES_Descriptor.");
  }
  readIsomVariableInteger(slice);
  slice.skip(2);
  const mixed = readU8(slice);
  const streamDependenceFlag = (mixed & 128) !== 0;
  const urlFlag = (mixed & 64) !== 0;
  const ocrStreamFlag = (mixed & 32) !== 0;
  if (streamDependenceFlag) {
    slice.skip(2);
  }
  if (urlFlag) {
    const urlLength = readU8(slice);
    slice.skip(urlLength);
  }
  if (ocrStreamFlag) {
    slice.skip(2);
  }
  const decoderConfigTag = readU8(slice);
  if (decoderConfigTag !== 4) {
    throw new Error("Invalid esds: expected DecoderConfigDescriptor.");
  }
  const decoderConfigDescriptorLength = readIsomVariableInteger(slice);
  const payloadStart = slice.filePos;
  const objectTypeIndication = readU8(slice);
  slice.skip(1 + 3 + 4 + 4);
  let decoderSpecificInfo = null;
  if (decoderConfigDescriptorLength > slice.filePos - payloadStart) {
    const decoderSpecificInfoTag = readU8(slice);
    if (decoderSpecificInfoTag !== 5) {
      throw new Error("Invalid esds: expected DecoderSpecificInfo.");
    }
    const decoderSpecificInfoLength = readIsomVariableInteger(slice);
    decoderSpecificInfo = readBytes(slice, decoderSpecificInfoLength);
  }
  return {
    objectTypeIndication,
    decoderSpecificInfo
  };
};
var readMetadataStringShort = (slice) => {
  let stringLength = readU16Be(slice);
  slice.skip(2);
  stringLength = Math.min(stringLength, slice.remainingLength);
  return textDecoder.decode(readBytes(slice, stringLength));
};
var readDataBox = (slice) => {
  const header = readBoxHeader(slice);
  if (!header || header.name !== "data") {
    return null;
  }
  if (header.contentSize < 8 || slice.remainingLength < 8) {
    return null;
  }
  const typeIndicator = readU32Be(slice);
  slice.skip(4);
  const data = readBytes(slice, header.contentSize - 8);
  switch (typeIndicator) {
    case 1:
      return textDecoder.decode(data);
    // UTF-8
    case 2:
      return new TextDecoder("utf-16be").decode(data);
    // UTF-16-BE
    case 13:
      return new RichImageData(data, "image/jpeg");
    case 14:
      return new RichImageData(data, "image/png");
    case 27:
      return new RichImageData(data, "image/bmp");
    default:
      return data;
  }
};

// node_modules/mediabunny/dist/modules/src/codec.js
var VIDEO_CODECS = [
  "avc",
  "hevc",
  "vp9",
  "av1",
  "vp8",
  "prores"
];
var PCM_AUDIO_CODECS = [
  "pcm-s16",
  // We don't prefix 'le' so we're compatible with the WebCodecs-registered PCM codec strings
  "pcm-s16be",
  "pcm-s24",
  "pcm-s24be",
  "pcm-s32",
  "pcm-s32be",
  "pcm-f32",
  "pcm-f32be",
  "pcm-f64",
  "pcm-f64be",
  "pcm-u8",
  "pcm-s8",
  "ulaw",
  "alaw"
];
var NON_PCM_AUDIO_CODECS = [
  "aac",
  "opus",
  "mp3",
  "vorbis",
  "flac",
  "ac3",
  "eac3",
  "dts",
  "truehd"
];
var AUDIO_CODECS = [
  ...NON_PCM_AUDIO_CODECS,
  ...PCM_AUDIO_CODECS
];
var AUDIO_CODECS_WITH_DELTA_PACKETS = ["truehd"];
var AVC_LEVEL_TABLE = [
  { maxMacroblocks: 99, maxBitrate: 64e3, maxDpbMbs: 396, level: 10 },
  // Level 1
  { maxMacroblocks: 396, maxBitrate: 192e3, maxDpbMbs: 900, level: 11 },
  // Level 1.1
  { maxMacroblocks: 396, maxBitrate: 384e3, maxDpbMbs: 2376, level: 12 },
  // Level 1.2
  { maxMacroblocks: 396, maxBitrate: 768e3, maxDpbMbs: 2376, level: 13 },
  // Level 1.3
  { maxMacroblocks: 396, maxBitrate: 2e6, maxDpbMbs: 2376, level: 20 },
  // Level 2
  { maxMacroblocks: 792, maxBitrate: 4e6, maxDpbMbs: 4752, level: 21 },
  // Level 2.1
  { maxMacroblocks: 1620, maxBitrate: 4e6, maxDpbMbs: 8100, level: 22 },
  // Level 2.2
  { maxMacroblocks: 1620, maxBitrate: 1e7, maxDpbMbs: 8100, level: 30 },
  // Level 3
  { maxMacroblocks: 3600, maxBitrate: 14e6, maxDpbMbs: 18e3, level: 31 },
  // Level 3.1
  { maxMacroblocks: 5120, maxBitrate: 2e7, maxDpbMbs: 20480, level: 32 },
  // Level 3.2
  { maxMacroblocks: 8192, maxBitrate: 2e7, maxDpbMbs: 32768, level: 40 },
  // Level 4
  { maxMacroblocks: 8192, maxBitrate: 5e7, maxDpbMbs: 32768, level: 41 },
  // Level 4.1
  { maxMacroblocks: 8704, maxBitrate: 5e7, maxDpbMbs: 34816, level: 42 },
  // Level 4.2
  { maxMacroblocks: 22080, maxBitrate: 135e6, maxDpbMbs: 110400, level: 50 },
  // Level 5
  { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 51 },
  // Level 5.1
  { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 52 },
  // Level 5.2
  { maxMacroblocks: 139264, maxBitrate: 24e7, maxDpbMbs: 696320, level: 60 },
  // Level 6
  { maxMacroblocks: 139264, maxBitrate: 48e7, maxDpbMbs: 696320, level: 61 },
  // Level 6.1
  { maxMacroblocks: 139264, maxBitrate: 8e8, maxDpbMbs: 696320, level: 62 }
  // Level 6.2
];
var VP9_LEVEL_TABLE = [
  { maxPictureSize: 36864, maxBitrate: 2e5, level: 10 },
  // Level 1
  { maxPictureSize: 73728, maxBitrate: 8e5, level: 11 },
  // Level 1.1
  { maxPictureSize: 122880, maxBitrate: 18e5, level: 20 },
  // Level 2
  { maxPictureSize: 245760, maxBitrate: 36e5, level: 21 },
  // Level 2.1
  { maxPictureSize: 552960, maxBitrate: 72e5, level: 30 },
  // Level 3
  { maxPictureSize: 983040, maxBitrate: 12e6, level: 31 },
  // Level 3.1
  { maxPictureSize: 2228224, maxBitrate: 18e6, level: 40 },
  // Level 4
  { maxPictureSize: 2228224, maxBitrate: 3e7, level: 41 },
  // Level 4.1
  { maxPictureSize: 8912896, maxBitrate: 6e7, level: 50 },
  // Level 5
  { maxPictureSize: 8912896, maxBitrate: 12e7, level: 51 },
  // Level 5.1
  { maxPictureSize: 8912896, maxBitrate: 18e7, level: 52 },
  // Level 5.2
  { maxPictureSize: 35651584, maxBitrate: 18e7, level: 60 },
  // Level 6
  { maxPictureSize: 35651584, maxBitrate: 24e7, level: 61 },
  // Level 6.1
  { maxPictureSize: 35651584, maxBitrate: 48e7, level: 62 }
  // Level 6.2
];
var AV1_LEVEL_TABLE = [
  // Level 2.0 (Main Tier)
  { maxPictureSize: 147456, maxHSize: 2048, maxVSize: 1152, maxBitrate: 15e5, tier: "M", level: 0 },
  // Level 2.1 (Main Tier)
  { maxPictureSize: 278784, maxHSize: 2816, maxVSize: 1584, maxBitrate: 3e6, tier: "M", level: 1 },
  // Level 3.0 (Main Tier)
  { maxPictureSize: 665856, maxHSize: 4352, maxVSize: 2448, maxBitrate: 6e6, tier: "M", level: 4 },
  // Level 3.1 (Main Tier)
  { maxPictureSize: 1065024, maxHSize: 5504, maxVSize: 3096, maxBitrate: 1e7, tier: "M", level: 5 },
  // Level 4.0 (Main Tier)
  { maxPictureSize: 2359296, maxHSize: 6144, maxVSize: 3456, maxBitrate: 12e6, tier: "M", level: 8 },
  // Level 4.0 (High Tier)
  { maxPictureSize: 2359296, maxHSize: 6144, maxVSize: 3456, maxBitrate: 3e7, tier: "H", level: 8 },
  // Level 4.1 (Main Tier)
  { maxPictureSize: 2359296, maxHSize: 6144, maxVSize: 3456, maxBitrate: 2e7, tier: "M", level: 9 },
  // Level 4.1 (High Tier)
  { maxPictureSize: 2359296, maxHSize: 6144, maxVSize: 3456, maxBitrate: 5e7, tier: "H", level: 9 },
  // Level 5.0 (Main Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 3e7, tier: "M", level: 12 },
  // Level 5.0 (High Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 1e8, tier: "H", level: 12 },
  // Level 5.1 (Main Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 4e7, tier: "M", level: 13 },
  // Level 5.1 (High Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 16e7, tier: "H", level: 13 },
  // Level 5.2 (Main Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 6e7, tier: "M", level: 14 },
  // Level 5.2 (High Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 24e7, tier: "H", level: 14 },
  // Level 5.3 (Main Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 6e7, tier: "M", level: 15 },
  // Level 5.3 (High Tier)
  { maxPictureSize: 8912896, maxHSize: 8192, maxVSize: 4352, maxBitrate: 24e7, tier: "H", level: 15 },
  // Level 6.0 (Main Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 6e7, tier: "M", level: 16 },
  // Level 6.0 (High Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 24e7, tier: "H", level: 16 },
  // Level 6.1 (Main Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 1e8, tier: "M", level: 17 },
  // Level 6.1 (High Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 48e7, tier: "H", level: 17 },
  // Level 6.2 (Main Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 16e7, tier: "M", level: 18 },
  // Level 6.2 (High Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 8e8, tier: "H", level: 18 },
  // Level 6.3 (Main Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 16e7, tier: "M", level: 19 },
  // Level 6.3 (High Tier)
  { maxPictureSize: 35651584, maxHSize: 16384, maxVSize: 8704, maxBitrate: 8e8, tier: "H", level: 19 }
];
var VP9_DEFAULT_SUFFIX = ".01.01.01.01.00";
var AV1_DEFAULT_SUFFIX = ".0.110.01.01.01.0";
var PRORES_FOURCCS = [
  "ap4x",
  // ProRes 4444 XQ
  "ap4h",
  // ProRes 4444
  "apch",
  // ProRes 422 High Quality
  "apcn",
  // ProRes 422 Standard Definition
  "apcs",
  // ProRes 422 LT
  "apco"
  // ProRes 422 Proxy
];
var DTS_FOURCCS = [
  "dtsc",
  // DTS core
  "dtsh",
  // DTS-HD, core plus extension substreams
  "dtsl",
  // DTS-HD Lossless, no core
  "dtse"
  // DTS Express
];
var extractVideoCodecString = (trackInfo) => {
  const { codec, codecDescription, colorSpace, avcCodecInfo, hevcCodecInfo, vp9CodecInfo, av1CodecInfo, proresFormat } = trackInfo;
  if (codec === "avc") {
    assert(trackInfo.avcType !== null);
    if (avcCodecInfo) {
      const bytes = new Uint8Array([
        avcCodecInfo.avcProfileIndication,
        avcCodecInfo.profileCompatibility,
        avcCodecInfo.avcLevelIndication
      ]);
      return `avc${trackInfo.avcType}.${bytesToHexString(bytes)}`;
    }
    if (!codecDescription || codecDescription.byteLength < 4) {
      throw new TypeError("AVC decoder description is not provided or is not at least 4 bytes long.");
    }
    return `avc${trackInfo.avcType}.${bytesToHexString(codecDescription.subarray(1, 4))}`;
  } else if (codec === "hevc") {
    assert(trackInfo.hevcType !== null);
    let generalProfileSpace;
    let generalProfileIdc;
    let compatibilityFlags;
    let generalTierFlag;
    let generalLevelIdc;
    let constraintFlags;
    if (hevcCodecInfo) {
      generalProfileSpace = hevcCodecInfo.generalProfileSpace;
      generalProfileIdc = hevcCodecInfo.generalProfileIdc;
      compatibilityFlags = reverseBitsU32(hevcCodecInfo.generalProfileCompatibilityFlags);
      generalTierFlag = hevcCodecInfo.generalTierFlag;
      generalLevelIdc = hevcCodecInfo.generalLevelIdc;
      constraintFlags = [...hevcCodecInfo.generalConstraintIndicatorFlags];
    } else {
      if (!codecDescription || codecDescription.byteLength < 23) {
        throw new TypeError("HEVC decoder description is not provided or is not at least 23 bytes long.");
      }
      const view = toDataView(codecDescription);
      const profileByte = view.getUint8(1);
      generalProfileSpace = profileByte >> 6 & 3;
      generalProfileIdc = profileByte & 31;
      compatibilityFlags = reverseBitsU32(view.getUint32(2));
      generalTierFlag = profileByte >> 5 & 1;
      generalLevelIdc = view.getUint8(12);
      constraintFlags = [];
      for (let i = 0; i < 6; i++) {
        constraintFlags.push(view.getUint8(6 + i));
      }
    }
    let codecString = `${trackInfo.hevcType}.`;
    codecString += ["", "A", "B", "C"][generalProfileSpace] + generalProfileIdc;
    codecString += ".";
    codecString += compatibilityFlags.toString(16).toUpperCase();
    codecString += ".";
    codecString += generalTierFlag === 0 ? "L" : "H";
    codecString += generalLevelIdc;
    while (constraintFlags.length > 0 && constraintFlags[constraintFlags.length - 1] === 0) {
      constraintFlags.pop();
    }
    if (constraintFlags.length > 0) {
      codecString += ".";
      codecString += constraintFlags.map((x) => x.toString(16).toUpperCase()).join(".");
    }
    return codecString;
  } else if (codec === "vp8") {
    return "vp8";
  } else if (codec === "vp9") {
    const pictureSize = trackInfo.width * trackInfo.height;
    let levelFromSize = last(VP9_LEVEL_TABLE).level;
    for (const entry of VP9_LEVEL_TABLE) {
      if (pictureSize <= entry.maxPictureSize) {
        levelFromSize = entry.level;
        break;
      }
    }
    if (!vp9CodecInfo) {
      return `vp09.00.${levelFromSize.toString().padStart(2, "0")}.08`;
    }
    const profile = vp9CodecInfo.profile.toString().padStart(2, "0");
    const level = (vp9CodecInfo.level === 0 ? levelFromSize : vp9CodecInfo.level).toString().padStart(2, "0");
    const bitDepth = vp9CodecInfo.bitDepth.toString().padStart(2, "0");
    const chromaSubsampling = vp9CodecInfo.chromaSubsampling.toString().padStart(2, "0");
    const colourPrimaries = vp9CodecInfo.colourPrimaries.toString().padStart(2, "0");
    const transferCharacteristics = vp9CodecInfo.transferCharacteristics.toString().padStart(2, "0");
    const matrixCoefficients = vp9CodecInfo.matrixCoefficients.toString().padStart(2, "0");
    const videoFullRangeFlag = vp9CodecInfo.videoFullRangeFlag.toString().padStart(2, "0");
    let string = `vp09.${profile}.${level}.${bitDepth}.${chromaSubsampling}`;
    string += `.${colourPrimaries}.${transferCharacteristics}.${matrixCoefficients}.${videoFullRangeFlag}`;
    if (string.endsWith(VP9_DEFAULT_SUFFIX)) {
      string = string.slice(0, -VP9_DEFAULT_SUFFIX.length);
    }
    return string;
  } else if (codec === "av1") {
    if (!av1CodecInfo) {
      const pictureSize = trackInfo.width * trackInfo.height;
      let level2 = last(AV1_LEVEL_TABLE).level;
      for (const entry of AV1_LEVEL_TABLE) {
        if (pictureSize <= entry.maxPictureSize && trackInfo.width <= entry.maxHSize && trackInfo.height <= entry.maxVSize) {
          level2 = entry.level;
          break;
        }
      }
      return `av01.0.${level2.toString().padStart(2, "0")}M.08`;
    }
    const profile = av1CodecInfo.profile;
    const level = av1CodecInfo.level.toString().padStart(2, "0");
    const tier = av1CodecInfo.tier ? "H" : "M";
    const bitDepth = av1CodecInfo.bitDepth.toString().padStart(2, "0");
    const monochrome = av1CodecInfo.monochrome ? "1" : "0";
    const chromaSubsampling = 100 * av1CodecInfo.chromaSubsamplingX + 10 * av1CodecInfo.chromaSubsamplingY + 1 * (av1CodecInfo.chromaSubsamplingX && av1CodecInfo.chromaSubsamplingY ? av1CodecInfo.chromaSamplePosition : 0);
    let colorPrimaries;
    let transferCharacteristics;
    let matrixCoefficients;
    let videoFullRangeFlag;
    if (av1CodecInfoHasColorInfo(av1CodecInfo)) {
      colorPrimaries = av1CodecInfo.colourPrimaries;
      transferCharacteristics = av1CodecInfo.transferCharacteristics;
      matrixCoefficients = av1CodecInfo.matrixCoefficients;
      videoFullRangeFlag = av1CodecInfo.videoFullRangeFlag;
    } else {
      colorPrimaries = colorSpace?.primaries ? COLOR_PRIMARIES_MAP[colorSpace.primaries] : 1;
      transferCharacteristics = colorSpace?.transfer ? TRANSFER_CHARACTERISTICS_MAP[colorSpace.transfer] : 1;
      matrixCoefficients = colorSpace?.matrix ? MATRIX_COEFFICIENTS_MAP[colorSpace.matrix] : 1;
      videoFullRangeFlag = colorSpace?.fullRange ? 1 : 0;
    }
    let string = `av01.${profile}.${level}${tier}.${bitDepth}`;
    string += `.${monochrome}.${chromaSubsampling.toString().padStart(3, "0")}`;
    string += `.${colorPrimaries.toString().padStart(2, "0")}`;
    string += `.${transferCharacteristics.toString().padStart(2, "0")}`;
    string += `.${matrixCoefficients.toString().padStart(2, "0")}`;
    string += `.${videoFullRangeFlag}`;
    if (string.endsWith(AV1_DEFAULT_SUFFIX)) {
      string = string.slice(0, -AV1_DEFAULT_SUFFIX.length);
    }
    return string;
  } else if (codec === "prores") {
    return proresFormat ?? "apch";
  } else if (codec !== null) {
    assertNever(codec);
  }
  throw new TypeError(`Unhandled codec '${codec}'.`);
};
var extractColorSpace = (info) => {
  switch (info.codec) {
    case "avc":
      {
        let spsData = info.avcCodecInfo?.sequenceParameterSets[0];
        if (!spsData && info.codecDescription) {
          spsData = deserializeAvcDecoderConfigurationRecord(info.codecDescription)?.sequenceParameterSets[0];
        }
        if (spsData) {
          const spsInfo = parseAvcSps(spsData);
          if (spsInfo) {
            return {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
              fullRange: !!spsInfo.fullRangeFlag
            };
          }
        }
      }
      ;
      break;
    case "hevc":
      {
        let spsData = info.hevcCodecInfo?.arrays.find((x) => x.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
        if (!spsData && info.codecDescription) {
          spsData = deserializeHevcDecoderConfigurationRecord(info.codecDescription)?.arrays.find((x) => x.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
        }
        if (spsData) {
          const spsInfo = parseHevcSps(spsData);
          if (spsInfo) {
            return {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
              fullRange: !!spsInfo.fullRangeFlag
            };
          }
        }
      }
      ;
      break;
    case "vp8":
      {
      }
      ;
      break;
    case "vp9":
      {
        if (info.vp9CodecInfo) {
          return {
            primaries: COLOR_PRIMARIES_MAP_INVERSE[info.vp9CodecInfo.colourPrimaries],
            transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.vp9CodecInfo.transferCharacteristics],
            matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[info.vp9CodecInfo.matrixCoefficients],
            fullRange: !!info.vp9CodecInfo.videoFullRangeFlag
          };
        }
      }
      ;
      break;
    case "av1":
      {
        if (info.av1CodecInfo) {
          return {
            primaries: COLOR_PRIMARIES_MAP_INVERSE[info.av1CodecInfo.colourPrimaries],
            transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.av1CodecInfo.transferCharacteristics],
            matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[info.av1CodecInfo.matrixCoefficients],
            fullRange: !!info.av1CodecInfo.videoFullRangeFlag
          };
        }
      }
      ;
      break;
    case "prores":
      {
        if (info.proresCodecInfo) {
          return {
            primaries: COLOR_PRIMARIES_MAP_INVERSE[info.proresCodecInfo.colourPrimaries],
            transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.proresCodecInfo.transferCharacteristics],
            matrix: info.proresCodecInfo.matrixCoefficients === 0 ? void 0 : MATRIX_COEFFICIENTS_MAP_INVERSE[info.proresCodecInfo.matrixCoefficients],
            fullRange: info.proresCodecInfo.fullRange
          };
        }
      }
      ;
      break;
  }
  return {
    primaries: void 0,
    transfer: void 0,
    matrix: void 0,
    fullRange: void 0
  };
};
var extractAudioCodecString = (trackInfo) => {
  const { codec, codecDescription, aacCodecInfo, dtsFormat } = trackInfo;
  if (codec === "aac") {
    if (!aacCodecInfo) {
      throw new TypeError("AAC codec info must be provided.");
    }
    if (aacCodecInfo.isMpeg2) {
      return "mp4a.67";
    } else {
      let objectType;
      if (aacCodecInfo.objectType !== null) {
        objectType = aacCodecInfo.objectType;
      } else {
        const audioSpecificConfig = parseAacAudioSpecificConfig(codecDescription);
        objectType = audioSpecificConfig.objectType;
      }
      return `mp4a.40.${objectType}`;
    }
  } else if (codec === "mp3") {
    return "mp3";
  } else if (codec === "opus") {
    return "opus";
  } else if (codec === "vorbis") {
    return "vorbis";
  } else if (codec === "flac") {
    return "flac";
  } else if (codec === "ac3") {
    return "ac-3";
  } else if (codec === "eac3") {
    return "ec-3";
  } else if (codec === "dts") {
    return dtsFormat ?? "dtsc";
  } else if (codec === "truehd") {
    return "mlpa";
  } else if (codec && PCM_AUDIO_CODECS.includes(codec)) {
    return codec;
  }
  throw new TypeError(`Unhandled codec '${codec}'.`);
};
var getAudioPreRollDuration = (codec, decoderConfig) => {
  switch (codec) {
    case "aac": {
      if (!decoderConfig.description) {
        return 1024 / decoderConfig.sampleRate;
      }
      const audioSpecificConfig = parseAacAudioSpecificConfig(toUint8Array(decoderConfig.description));
      if (audioSpecificConfig.coreSampleRate === null) {
        throw new Error("Invalid AAC sampling frequency index.");
      }
      return audioSpecificConfig.frameLength / audioSpecificConfig.coreSampleRate;
    }
    case "opus": {
      return OPUS_PRE_ROLL_DURATION;
    }
    case "mp3": {
      const { sampleRate, numberOfChannels } = decoderConfig;
      const isMpeg1 = sampleRate >= 32e3;
      const frameSamples = isMpeg1 ? 1152 : 576;
      const minBitrate = isMpeg1 ? 32e3 : 8e3;
      const maxMainDataBegin = isMpeg1 ? 511 : 255;
      const sideInfoSize = isMpeg1 ? numberOfChannels === 1 ? 17 : 32 : numberOfChannels === 1 ? 9 : 17;
      const minFrameSize = Math.floor(frameSamples / 8 * minBitrate / sampleRate);
      const minMainDataSize = minFrameSize - MP3_FRAME_HEADER_SIZE - sideInfoSize;
      const frameCount = 1 + Math.ceil(maxMainDataBegin / minMainDataSize);
      return frameCount * frameSamples / sampleRate;
    }
    case "vorbis": {
      assert(decoderConfig.description);
      const bytes = toUint8Array(decoderConfig.description);
      let pos = 1;
      let lacedLengthsLeft = 2;
      while (lacedLengthsLeft > 0) {
        if (bytes[pos++] < 255) {
          lacedLengthsLeft--;
        }
      }
      const blockSizeByte = bytes[pos + 28];
      const longBlockSize = 1 << (blockSizeByte >> 4);
      return longBlockSize / 2 / decoderConfig.sampleRate;
    }
    case "ac3":
    case "eac3": {
      return 256 / decoderConfig.sampleRate;
    }
    case "dts": {
      return 512 / decoderConfig.sampleRate;
    }
    case "flac":
    case "truehd":
    case "pcm-s16":
    case "pcm-s16be":
    case "pcm-s24":
    case "pcm-s24be":
    case "pcm-s32":
    case "pcm-s32be":
    case "pcm-f32":
    case "pcm-f32be":
    case "pcm-f64":
    case "pcm-f64be":
    case "pcm-u8":
    case "pcm-s8":
    case "ulaw":
    case "alaw": {
      return 0;
    }
    default: {
      assertNever(codec);
      assert(false);
    }
  }
};
var OPUS_SAMPLE_RATE = 48e3;
var OPUS_PRE_ROLL_DURATION = 0.4;
var PCM_CODEC_REGEX = /^pcm-([usf])(\d+)(be)?$/;
var parsePcmCodec = (codec) => {
  assert(PCM_AUDIO_CODECS.includes(codec));
  if (codec === "ulaw") {
    return { dataType: "ulaw", sampleSize: 1, littleEndian: true, silentValue: 255 };
  } else if (codec === "alaw") {
    return { dataType: "alaw", sampleSize: 1, littleEndian: true, silentValue: 213 };
  }
  const match = PCM_CODEC_REGEX.exec(codec);
  assert(match);
  let dataType;
  if (match[1] === "u") {
    dataType = "unsigned";
  } else if (match[1] === "s") {
    dataType = "signed";
  } else {
    dataType = "float";
  }
  const sampleSize = Number(match[2]) / 8;
  const littleEndian = match[3] !== "be";
  const silentValue = codec === "pcm-u8" ? 2 ** 7 : 0;
  return { dataType, sampleSize, littleEndian, silentValue };
};
var inferCodecFromCodecString = (codecString) => {
  if (codecString.startsWith("avc1") || codecString.startsWith("avc3")) {
    return "avc";
  } else if (codecString.startsWith("hev1") || codecString.startsWith("hvc1")) {
    return "hevc";
  } else if (codecString === "vp8") {
    return "vp8";
  } else if (codecString.startsWith("vp09")) {
    return "vp9";
  } else if (codecString.startsWith("av01")) {
    return "av1";
  } else if (PRORES_FOURCCS.includes(codecString)) {
    return "prores";
  }
  if (codecString === "mp3" || codecString === "mp4a.69" || codecString === "mp4a.6B" || codecString === "mp4a.6b" || codecString === "mp4a.40.34") {
    return "mp3";
  } else if (codecString.startsWith("mp4a.40.") || codecString === "mp4a.67") {
    return "aac";
  } else if (codecString === "opus" || codecString === "Opus") {
    return "opus";
  } else if (codecString === "vorbis") {
    return "vorbis";
  } else if (codecString === "flac" || codecString === "fLaC") {
    return "flac";
  } else if (codecString === "ac-3" || codecString === "ac3") {
    return "ac3";
  } else if (codecString === "ec-3" || codecString === "eac3") {
    return "eac3";
  } else if (DTS_FOURCCS.includes(codecString)) {
    return "dts";
  } else if (codecString === "mlpa") {
    return "truehd";
  } else if (codecString === "ulaw") {
    return "ulaw";
  } else if (codecString === "alaw") {
    return "alaw";
  } else if (PCM_CODEC_REGEX.test(codecString)) {
    return codecString;
  }
  if (codecString === "webvtt") {
    return "webvtt";
  }
  return null;
};
var VALID_VIDEO_CODEC_STRING_PREFIXES = ["avc1", "avc3", "hev1", "hvc1", "vp8", "vp09", "av01", ...PRORES_FOURCCS];

// node_modules/mediabunny/dist/modules/src/index.js
var MEDIABUNNY_LOADED_SYMBOL = /* @__PURE__ */ Symbol.for("mediabunny loaded");
if (globalThis[MEDIABUNNY_LOADED_SYMBOL]) {
  Logging._error("[WARNING]\nMediabunny was loaded twice. This will likely cause Mediabunny not to work correctly. Check if multiple dependencies are importing different versions of Mediabunny, or if something is being bundled incorrectly.");
}
globalThis[MEDIABUNNY_LOADED_SYMBOL] = true;

// src/tracker.js
function detect(data, w, h, erode = false) {
  let mask = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h), balls = [];
  for (let i = 0; i < mask.length; i++) {
    let r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    mask[i] = Math.min(r, g, b) > 105 && Math.max(r, g, b) < 195 && Math.max(r, g, b) - Math.min(r, g, b) < 30 || r > 120 && g < 150 && b < 150 && r > g * 1.15 ? 1 : 0;
  }
  if (erode) {
    const copy = mask.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      mask[p] = copy[p] && copy[p - 1] && copy[p + 1] && copy[p - w] && copy[p + w] && copy[p - w - 1] && copy[p - w + 1] && copy[p + w - 1] && copy[p + w + 1];
    }
  }
  const scale = Math.min(w, h) / 480;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    let head = 0, tail = 1, sx = 0, sy = 0, red = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    queue[0] = i;
    seen[i] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = p / w | 0;
      sx += x;
      sy += y;
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      miny = Math.min(miny, y);
      maxy = Math.max(maxy, y);
      if (data[p * 4] > 140 && data[p * 4 + 1] < 90) red++;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && mask[q] && !seen[q]) {
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
    if (tail > (erode ? 130 : 180) * scale * scale && tail < 850 * scale * scale && maxx - minx > (erode ? 13 : 16) * scale && maxx - minx < 36 * scale && maxy - miny > (erode ? 13 : 16) * scale && maxy - miny < 36 * scale) balls.push({ x: sx / tail, y: sy / tail, r: (maxx - minx + maxy - miny) / 4 + (erode ? 2 : 1), red: red / tail });
  }
  return balls;
}
function detectCircles(data, w, h, radius = 13 * Math.min(w, h) / 480) {
  const size = w * h, mask = new Uint8Array(size), seen = new Uint8Array(size), queue = new Int32Array(size);
  const arena = Math.min(w, h) * 0.447;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = i * 4;
    if ((x - w / 2) ** 2 + (y - h / 2) ** 2 < arena * arena && Math.max(data[k], data[k + 1], data[k + 2]) < 220) mask[i] = 1;
  }
  for (let i = 0; i < size; i++) if (!mask[i] && !seen[i]) {
    let head = 0, tail = 1, edge = false, minX = w, maxX = 0, minY = h, maxY = 0;
    queue[0] = i;
    seen[i] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = p / w | 0;
      if (!x || !y || x === w - 1 || y === h - 1) edge = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && !mask[q] && !seen[q]) {
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
    if (!edge && tail < radius * radius && maxY - minY < radius && maxX - minX < radius * 1.7) for (let j = 0; j < tail; j++) mask[queue[j]] = 1;
  }
  const distance = new Float32Array(size), diag = Math.SQRT2;
  for (let i = 0; i < size; i++) distance[i] = mask[i] ? w + h : 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (mask[p]) distance[p] = Math.min(distance[p], distance[p - 1] + 1, distance[p - w] + 1, distance[p - w - 1] + diag, distance[p - w + 1] + diag);
  }
  for (let y = h - 2; y > 0; y--) for (let x = w - 2; x > 0; x--) {
    const p = y * w + x;
    if (mask[p]) distance[p] = Math.min(distance[p], distance[p + 1] + 1, distance[p + w] + 1, distance[p + w + 1] + diag, distance[p + w - 1] + diag);
  }
  const candidates = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x, d = distance[p];
    if (d < radius * 0.65 || d > radius * 1.4) continue;
    if (d < distance[p - 1] || d < distance[p + 1] || d < distance[p - w] || d < distance[p + w]) continue;
    candidates.push({ x, y, d });
  }
  candidates.sort((a, b) => b.d - a.d);
  const balls = [];
  for (const c of candidates) {
    if (balls.some((b) => (b.x - c.x) ** 2 + (b.y - c.y) ** 2 < (radius * 1.55) ** 2)) continue;
    let inside = 0, total = 0, red = 0;
    const rr = Math.ceil(radius * 0.8);
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) {
      const x = c.x + dx, y = c.y + dy;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const p = y * w + x, k = p * 4;
      total++;
      inside += mask[p];
      if (data[k] > 140 && data[k + 1] < 90) red++;
    }
    if (inside / total < 0.88) continue;
    balls.push({ x: c.x, y: c.y, r: radius, red: red / total, recovered: true });
  }
  return balls;
}
function detectFrame(data, w, h, previous = []) {
  const normal = detect(data, w, h);
  if (normal.length === 100) return normal;
  const eroded = detect(data, w, h, true);
  if (eroded.length === 100) return eroded;
  const radii = previous.map((b) => b.r).sort((a, b) => a - b);
  const circles = detectCircles(data, w, h, radii.length ? radii[Math.floor(radii.length / 2)] : void 0);
  const combined = [...normal];
  for (const c of circles) if (!combined.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < c.r * 1.55)) combined.push(c);
  if (combined.length === 100) return combined;
  if (circles.length !== 100) return normal;
  return circles.map((c) => {
    const nearby = normal.filter((b) => Math.hypot(b.x - c.x, b.y - c.y) < c.r * 0.35);
    return nearby.length === 1 ? nearby[0] : c;
  });
}
function assign(cost) {
  const n = cost.length, m = cost[0]?.length || 0;
  if (n > m) throw Error("Insufficient detections");
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const min = Array(m + 1).fill(Infinity), used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        let cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < min[j]) {
          min[j] = cur;
          way[j] = j0;
        }
        if (min[j] < delta) {
          delta = min[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) if (used[j]) {
        u[p[j]] += delta;
        v[j] -= delta;
      } else min[j] -= delta;
      j0 = j1;
    } while (p[j0]);
    do {
      let j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result = Array(n);
  for (let j = 1; j <= m; j++) if (p[j]) result[p[j] - 1] = j - 1;
  return result;
}
var Tracker = class {
  constructor(balls) {
    this.balls = balls.map((b) => ({ ...b, vx: 0, vy: 0 }));
    this.target = balls.findIndex((b) => b.red > 0.3);
    if (this.target < 0) throw Error("No red ball found in frame 0. Use the original, untrimmed video.");
    this.warnings = [];
  }
  step(balls, frame) {
    if (balls.length !== this.balls.length) throw Error(`Frame ${frame}: detected ${balls.length} of ${this.balls.length} balls. Tracking stopped to avoid silently switching identity.`);
    const costs = this.balls.map((a) => balls.map((b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2));
    const match = assign(costs), motion = assign(this.balls.map((a) => balls.map((b) => (b.x - a.x - a.vx * 0.65) ** 2 + (b.y - a.y - a.vy * 0.65) ** 2)));
    let uncertain = false;
    this.balls = this.balls.map((a, i) => {
      const b = balls[match[i]], d = Math.hypot(b.x - a.x, b.y - a.y);
      if (i === this.target) {
        uncertain = d > a.r * 2 || motion[i] !== match[i];
        if (uncertain) this.warnings.push(frame);
      }
      return { ...b, vx: b.x - a.x, vy: b.y - a.y };
    });
    return { ...this.balls[this.target], uncertain };
  }
};
var DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
function readNumber(data, w, h, ball) {
  const rad = Math.round(ball.r * 0.8), x0 = Math.max(0, Math.round(ball.x) - rad), y0 = Math.max(0, Math.round(ball.y) - rad), x1 = Math.min(w - 1, Math.round(ball.x) + rad), y1 = Math.min(h - 1, Math.round(ball.y) + rad);
  const white = (x, y) => {
    if ((x - ball.x) ** 2 + (y - ball.y) ** 2 > (ball.r * 0.88) ** 2) return false;
    const k = (y * w + x) * 4;
    return data[k] > 205 && data[k + 1] > 205 && data[k + 2] > 205;
  };
  const columns = [];
  for (let x = x0; x <= x1; x++) {
    let count = 0;
    for (let y = y0; y <= y1; y++) if (white(x, y)) count++;
    columns.push(count > 1);
  }
  const groups = [];
  for (let i = 0; i < columns.length; i++) if (columns[i]) {
    let start = i;
    while (i + 1 < columns.length && columns[i + 1]) i++;
    groups.push([x0 + start, x0 + i]);
  }
  if (!groups.length || groups.length > 3) return { number: null, score: 0 };
  let text = "", error = 0;
  for (const [left, right] of groups) {
    let top = y1, bottom = y0;
    for (let y = y0; y <= y1; y++) for (let x = left; x <= right; x++) if (white(x, y)) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    if (bottom - top < 4) return { number: null, score: 0 };
    let bits = "";
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
      let x = Math.round(left + (right - left) * (col + 0.5) / 3), y = Math.round(top + (bottom - top) * (row + 0.5) / 5);
      bits += white(x, y) ? "1" : "0";
    }
    let scores = DIGITS.map((s) => [...s].reduce((sum, c, i) => sum + (c !== bits[i]), 0));
    let best = Math.min(...scores);
    text += scores.indexOf(best);
    error += best;
  }
  const number = Number(text);
  return { number: number >= 1 && number <= 100 ? number : null, score: 1 - error / (15 * groups.length) };
}

// src/app.js
var $ = (id) => document.getElementById(id);
var ctx = $("view").getContext("2d");
var file = null;
var input = null;
var sink = null;
var history = [];
var requested = [];
var cancelled = false;
var busy = false;
var reviewToken = 0;
function status(text) {
  $("status").textContent = text;
}
function choose(f) {
  if (busy) return;
  if (!f) return;
  if (!/\.webm$/i.test(f.name)) {
    status("Please choose a .webm video.");
    return;
  }
  if (f.size > 100 * 1024 * 1024) {
    status("Please choose a video smaller than 100 MB.");
    return;
  }
  file = f;
  $("filename").textContent = f.name;
  $("track").disabled = false;
  clearResult();
  status("Video ready. Enter three frame numbers and start tracking.");
}
function clearResult() {
  history = [];
  $("result").hidden = true;
  $("resultEmpty").hidden = false;
  $("resultState").textContent = "WAITING FOR A TRACE";
  $("scrub").disabled = true;
  $("prev").disabled = true;
  $("next").disabled = true;
  $("meta").textContent = "READY TO TRACK";
}
$("file").onchange = (e) => choose(e.target.files[0]);
for (const type of ["dragover", "dragleave", "drop"]) $("drop").addEventListener(type, (e) => {
  e.preventDefault();
  $("drop").classList.toggle("drag", type === "dragover");
  if (type === "drop") choose(e.dataTransfer.files[0]);
});
$("cancel").onclick = () => {
  cancelled = true;
  status("Cancelling\u2026");
};
function draw(canvas, point, index) {
  const view = $("view");
  if (view.width !== canvas.width || view.height !== canvas.height) {
    view.width = canvas.width;
    view.height = canvas.height;
  }
  ctx.drawImage(canvas, 0, 0);
  if (point) {
    ctx.strokeStyle = "#d64c3f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#d64c3f";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  view.style.visibility = "visible";
  $("empty").hidden = true;
  $("frameLabel").textContent = `Frame ${index}`;
}
async function review(index) {
  if (!sink || !history[index]) return;
  const token = ++reviewToken;
  try {
    const result = await sink.getCanvas(history[index].time + history[index].duration * 0.1);
    if (token !== reviewToken || !result) return;
    draw(result.canvas, history[index], index);
    $("scrub").value = index;
  } catch (e) {
    status(`Could not review this frame: ${e.message}`);
  }
}
$("scrub").oninput = (e) => review(Number(e.target.value));
$("prev").onclick = () => review(Math.max(0, Number($("scrub").value) - 1));
$("next").onclick = () => review(Math.min(history.length - 1, Number($("scrub").value) + 1));
function updateAnswer() {
  const n = Number($("number").value), valid = Number.isInteger(n) && n >= 1 && n <= 100 && requested.every((i) => history[i]);
  $("answer").textContent = valid ? `${n}; ${requested.map((i) => `${Math.round(history[i].x)},${Math.round(history[i].y)}`).join("; ")}` : "Confirm the final ball number to generate your answer.";
  $("copy").disabled = !valid;
}
$("number").oninput = updateAnswer;
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("answer").textContent);
    $("copy").textContent = "Copied \u2713";
    setTimeout(() => $("copy").textContent = "Copy answer \u2197", 1800);
  } catch {
    status("Clipboard unavailable. Select and copy the answer text manually.");
  }
};
$("track").onclick = async () => {
  if (!file || busy) return;
  requested = [1, 2, 3].map((i) => $(`frame${i}`).value.trim());
  if (requested.some((s) => !/^\d+$/.test(s) || !Number.isSafeInteger(Number(s)))) {
    status("Enter three non-negative whole frame numbers.");
    return;
  }
  requested = requested.map(Number);
  if (!globalThis.VideoDecoder) {
    status("This browser cannot decode video frames. Open this page in desktop Chrome or Edge.");
    return;
  }
  clearResult();
  cancelled = false;
  busy = true;
  reviewToken++;
  $("track").disabled = true;
  $("file").disabled = true;
  $("cancel").hidden = false;
  $("progress").hidden = false;
  $("progress").value = 0;
  for (let i = 1; i <= 3; i++) $(`frame${i}`).disabled = true;
  try {
    input?.dispose();
    input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw Error("This video codec is not supported by your browser. Try desktop Chrome or Edge.");
    const duration = await track.computeDuration();
    sink = new CanvasSink(track, { poolSize: 2, rotation: 0 });
    let tracker, index = 0, lastCanvas;
    const detections = [];
    for await (const frame of sink.canvases()) {
      if (cancelled) throw Error("Tracking cancelled. You can start again.");
      const canvas = frame.canvas, w = canvas.width, h = canvas.height;
      if (w * h > 1920 * 1080) throw Error("Video resolution is too large. Maximum supported resolution is 1920 \xD7 1080.");
      const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
      const balls = detectFrame(data, w, h, tracker?.balls);
      if (!tracker) {
        if (balls.length !== 100) throw Error(`Detected ${balls.length} balls in the first frame; this tracker expects 100 outlined balls on a light background.`);
        tracker = new Tracker(balls);
      }
      const point = index === 0 ? tracker.balls[tracker.target] : tracker.step(balls, index);
      history.push({ ...point, time: frame.timestamp, duration: frame.duration });
      detections.push(balls);
      if (index % 6 === 0) {
        draw(canvas, point, index);
        status(`Tracking frame ${index} \xB7 ${balls.length} balls detected`);
        $("progress").value = duration > 0 ? Math.min(0.98, frame.timestamp / duration) : 0;
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!lastCanvas) {
        lastCanvas = document.createElement("canvas");
        lastCanvas.width = w;
        lastCanvas.height = h;
      }
      lastCanvas.getContext("2d").drawImage(canvas, 0, 0);
      index++;
    }
    if (!history.length) throw Error("No video frames were decoded.");
    if (requested.some((i) => i >= history.length)) throw Error(`This video has ${history.length} frames. Choose frame numbers from 0 to ${history.length - 1}.`);
    status("Checking the path backwards\u2026");
    await new Promise((r) => setTimeout(r, 0));
    const final = history.at(-1), reverse = new Tracker(detections.at(-1).map((b) => ({ ...b, red: Math.hypot(b.x - final.x, b.y - final.y) < 1 ? 1 : 0 })));
    let reverseMismatch = 0;
    for (let i = history.length - 2; i >= 0; i--) {
      if (cancelled) throw Error("Tracking cancelled.");
      const p = reverse.step(detections[i], i);
      if (Math.hypot(p.x - history[i].x, p.y - history[i].y) > 1) reverseMismatch++;
      if (i % 50 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const lastCtx = lastCanvas.getContext("2d"), ocr = readNumber(lastCtx.getImageData(0, 0, lastCanvas.width, lastCanvas.height).data, lastCanvas.width, lastCanvas.height, final);
    $("number").value = ocr.number && ocr.score >= 0.9 ? ocr.number : "";
    $("zoom").getContext("2d").imageSmoothingEnabled = false;
    const size = Math.ceil(final.r * 3);
    $("zoom").getContext("2d").drawImage(lastCanvas, final.x - size / 2, final.y - size / 2, size, size, 0, 0, 144, 144);
    $("coordinates").replaceChildren();
    for (const i of requested) {
      const card = document.createElement("div");
      card.className = "coordinate";
      card.innerHTML = `<small>FRAME ${i}</small><strong>${Math.round(history[i].x)}, ${Math.round(history[i].y)}</strong><button>Inspect frame \u2197</button>`;
      card.querySelector("button").onclick = () => review(i);
      $("coordinates").append(card);
    }
    const needsReview = tracker.warnings.length || reverseMismatch;
    $("confidence").textContent = needsReview ? `Review recommended: ${tracker.warnings.length} motion disagreements${tracker.warnings.length ? ` (frames ${tracker.warnings.slice(0, 6).join(", ")})` : ""}; ${reverseMismatch} reverse-path disagreements. This answer is an estimate. Check the path and enlarged number before using it.` : `Forward and reverse paths agree. Check the enlarged final label${ocr.number && ocr.score >= 0.9 ? " to confirm the automatically read number." : ", then enter its number above."} Coordinates are measured from the top-left of the original video.`;
    $("resultState").textContent = needsReview ? "REVIEW RECOMMENDED" : "TRACE COMPLETE";
    $("result").hidden = false;
    $("resultEmpty").hidden = true;
    $("meta").textContent = `${lastCanvas.width} \xD7 ${lastCanvas.height} \xB7 ${history.length} FRAMES`;
    $("scrub").max = history.length - 1;
    $("scrub").value = history.length - 1;
    $("scrub").disabled = false;
    $("prev").disabled = false;
    $("next").disabled = false;
    draw(lastCanvas, final, history.length - 1);
    updateAnswer();
    $("progress").value = 1;
    status(`Done. Tracked ${history.length} frames. ${needsReview ? "Review the estimated answer below." : "Your answer is ready below."}`);
  } catch (e) {
    status(e.message || "Tracking failed. Please try another video.");
    $("resultState").textContent = "TRACE INCOMPLETE";
    if (history.length) {
      $("scrub").max = history.length - 1;
      $("scrub").disabled = false;
      $("prev").disabled = false;
      $("next").disabled = false;
      await review(history.length - 1);
    }
  } finally {
    busy = false;
    $("track").disabled = !file;
    $("file").disabled = false;
    $("cancel").hidden = true;
    for (let i = 1; i <= 3; i++) $(`frame${i}`).disabled = false;
  }
};
/*! Bundled license information:

mediabunny/dist/modules/src/misc.js:
mediabunny/dist/modules/src/logging.js:
mediabunny/dist/modules/src/metadata.js:
mediabunny/dist/modules/shared/bitstream.js:
mediabunny/dist/modules/shared/aac-misc.js:
mediabunny/dist/modules/shared/mp3-misc.js:
mediabunny/dist/modules/shared/ac3-misc.js:
mediabunny/dist/modules/shared/truehd-misc.js:
mediabunny/dist/modules/src/codec-data.js:
mediabunny/dist/modules/src/sample.js:
mediabunny/dist/modules/src/custom-coder.js:
mediabunny/dist/modules/src/packet.js:
mediabunny/dist/modules/src/demuxer.js:
mediabunny/dist/modules/src/isobmff/isobmff-misc.js:
mediabunny/dist/modules/src/aes.js:
mediabunny/dist/modules/src/isobmff/isobmff-demuxer.js:
mediabunny/dist/modules/src/matroska/ebml.js:
mediabunny/dist/modules/src/matroska/matroska-misc.js:
mediabunny/dist/modules/src/matroska/matroska-demuxer.js:
mediabunny/dist/modules/src/id3.js:
mediabunny/dist/modules/src/mp3/mp3-reader.js:
mediabunny/dist/modules/src/mp3/mp3-demuxer.js:
mediabunny/dist/modules/src/ogg/ogg-misc.js:
mediabunny/dist/modules/src/ogg/ogg-reader.js:
mediabunny/dist/modules/src/ogg/ogg-demuxer.js:
mediabunny/dist/modules/src/wave/wave-demuxer.js:
mediabunny/dist/modules/src/adts/adts-reader.js:
mediabunny/dist/modules/src/adts/adts-demuxer.js:
mediabunny/dist/modules/src/flac/flac-misc.js:
mediabunny/dist/modules/src/flac/flac-demuxer.js:
mediabunny/dist/modules/src/mpeg-ts/mpeg-ts-misc.js:
mediabunny/dist/modules/src/mpeg-ts/mpeg-ts-demuxer.js:
mediabunny/dist/modules/src/hls/hls-misc.js:
mediabunny/dist/modules/src/segmented-input.js:
mediabunny/dist/modules/src/source.js:
mediabunny/dist/modules/src/hls/hls-segmented-input.js:
mediabunny/dist/modules/src/hls/hls-demuxer.js:
mediabunny/dist/modules/src/input-format.js:
mediabunny/dist/modules/src/media-sink.js:
mediabunny/dist/modules/src/input-track.js:
mediabunny/dist/modules/src/input.js:
mediabunny/dist/modules/src/reader.js:
mediabunny/dist/modules/src/isobmff/isobmff-reader.js:
mediabunny/dist/modules/src/codec.js:
mediabunny/dist/modules/src/index.js:
  (*!
   * Copyright (c) 2026-present, Vanilagy and contributors
   *
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at https://mozilla.org/MPL/2.0/.
   *)
*/
