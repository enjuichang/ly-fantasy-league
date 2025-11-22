/**
 * Party utilities for mapping Chinese party names to English abbreviations and emblems
 */

export interface PartyInfo {
    chinese: string
    english: string
    emblemUrl: string
}

export const PARTY_MAPPING: Record<string, PartyInfo> = {
    '中國國民黨': {
        chinese: '中國國民黨',
        english: 'KMT',
        emblemUrl: '/images/parties/kmt.svg'
    },
    '民主進步黨': {
        chinese: '民主進步黨',
        english: 'DPP',
        emblemUrl: '/images/parties/dpp.svg'
    },
    '台灣民眾黨': {
        chinese: '台灣民眾黨',
        english: 'TPP',
        emblemUrl: '/images/parties/tpp.svg'
    },
    '無黨籍': {
        chinese: '無黨籍',
        english: 'Independent',
        emblemUrl: '/images/parties/Independent.svg'
    }
}

/**
 * Get party information by Chinese name
 */
export function getPartyInfo(chineseName: string): PartyInfo {
    return PARTY_MAPPING[chineseName] || {
        chinese: chineseName,
        english: chineseName,
        emblemUrl: ''
    }
}

/**
 * Get English abbreviation for a party
 */
export function getPartyEnglish(chineseName: string): string {
    return getPartyInfo(chineseName).english
}

/**
 * Get emblem URL for a party
 */
export function getPartyEmblem(chineseName: string): string {
    return getPartyInfo(chineseName).emblemUrl
}
