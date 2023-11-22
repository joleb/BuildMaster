export interface Skillbar {
  type: number,
  version: number,
  primary: number,
  secondary: number,
  attributes: Partial<Record<number, number>>,
  skills: number[];
  template: string;
}

const DEFAULT_TEMPLATE_TYPE = 14;
const DEFAULT_VERSION = 0;

const _base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const decodeTemplate = (template: string): Skillbar | null => {
  const binary = base64ToBinary(template);
  let offset = 0;
  const read = (bits: number) => {
    const out = binary.substring(offset, offset+bits);
    offset += bits;
    return binaryToValue(out);
  };
  const templateType = read(4);
  if (templateType != DEFAULT_TEMPLATE_TYPE) return null;
  const version = read(4);
  const professionBitLength = read(2) * 2 + 4;
  const primary = read(professionBitLength);
  const secondary = read(professionBitLength);

  const attributeCount = read(4);
  const attributeBitLength = read(4) + 4;

  const attributes: Partial<Record<number, number>> = {};

  for (let i = 0; i < attributeCount; i++) {
    attributes[read(attributeBitLength)] = read(4);
  }

  const skillBitLength = read(4) + 8;

  const skills = new Array(8);
  for (let i = 0; i < 8; i++) {
    skills[i] = read(skillBitLength);
    if(!(skills[i])) {
      return null;
    }
  }

  return {
    type: templateType,
    version,
    primary,
    secondary,
    attributes,
    skills,
    template,
  };
};

export const encodeSkillbar = (skillbar: Exclude<Skillbar, 'template'>): string => {
  const type = valueToBinary(skillbar.type, 4);
  const version = valueToBinary(skillbar.version, 4);

  const professionBitLength = Math.max(4, valueToBinary(skillbar.primary, 0).length, valueToBinary(skillbar.secondary, 0).length);
  const primary = valueToBinary(skillbar.primary, professionBitLength);
  const secondary = valueToBinary(skillbar.secondary, professionBitLength);

  const attributeCount = valueToBinary(Object.keys(skillbar.attributes).length, 4);
  const attributeBitLength = Math.max(4, ...Object.keys(skillbar.attributes).map(a => valueToBinary(a, 0).length));
  const attributes = Object.entries(skillbar.attributes).reduce((out, [attributeId, attributeLevel]) => {
    return [
      ...out,
      valueToBinary(attributeId, attributeBitLength),
      valueToBinary(attributeLevel!, 4),
    ];
  }, [] as string[]);

  const skillBitLength = Math.max(8, ...skillbar.skills.map(skillId => valueToBinary(skillId, 0).length));
  const skills = skillbar.skills.map(skillId => valueToBinary(skillId, skillBitLength));

  const template = [
    type,
    version,
    valueToBinary(Math.max(Math.ceil((professionBitLength - 4) / 2), 0), 2),
    primary,
    secondary,
    attributeCount,
    valueToBinary(Math.max(attributeBitLength - 4, 0), 4),
    ...attributes,
    valueToBinary(Math.max(skillBitLength - 8, 0), 4),
    ...skills,
  ];
  return binaryToBase64(template.join(''));
};

const padBinaryRight = (binary: string, length: number) => binary.padEnd(length, '0');

const valueToBinary = (value: string | number, length: number) => padBinaryRight(reverseString(parseInt(value.toString()).toString(2)), length);

const binaryToValue = (binary: string) => parseInt(reverseString(binary), 2);

const reverseString = (str: string) => (str || '').split('').reverse().join('');

const getCharIndex = (char: string) => {
  for(let i = 0; i < _base64.length; i++) if(_base64[i] == char) return i;
  throw Error;
};

const base64ToBinary = (template: string) => Array.from(template, char => valueToBinary(getCharIndex(char).toString(), 6)).join('');

const binaryToBase64 = (binary: string) => {
  binary = binary.length % 6 ? padBinaryRight(binary, binary.length + 6 - binary.length % 6) : binary;
  return Array.from({length: binary.length / 6}, (_, i) => _base64[binaryToValue(binary.slice(i * 6, i * 6 + 6))]).join('');
};