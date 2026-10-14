import {nameAt,NAME_CAPACITY} from '../server/names.mjs';
export function fixtureName(label){let value=0;for(const character of label)value=(Math.imul(value,31)+character.codePointAt(0))>>>0;return nameAt(value%NAME_CAPACITY);}
export function registration(nickname){return {nickname,avatar:0,registrationId:crypto.randomUUID(),recoveryCode:'HL-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase()};}
